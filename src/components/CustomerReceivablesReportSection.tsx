import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
  BookOpen,
  X,
  ExternalLink,
} from 'lucide-react';
import { Customer, SaleBill, CompanyProfile, Voucher, SaleReturn } from '../types';
import { api } from '../services/api';
import { exportToCsv } from '../utils/exportCsv';

interface CustomerReceivablesReportSectionProps {
  companyProfile?: CompanyProfile | null;
  customers?: Customer[];
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface PartyReceivableRow {
  id: string;
  sNo: number;
  srNo?: number;
  pdfOrder?: number;
  mCode: string;
  salesman: string;
  accountTitle: string;
  mobile: string;
  lastBillNumber: string;
  lastBillDate: string;
  lastBillAmount: number;
  lastReceiptDate: string;
  lastReceiptAmount: number;
  ledgerBalance: number;
  area?: string;
  sector?: string;
  city?: string;
}

// Format date to DD-MM-YYYY as displayed in the reference images
export const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '-' || dateStr === '0') return '-';
  try {
    const trimmed = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.split('T')[0].split('-');
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed.replace(/\//g, '-');
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return String(dateStr);
};

// Normalize date to YYYY-MM-DD for range comparison
const normalizeToYMD = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const trimmed = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.split('T')[0];
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return '';
};

// Format amount to 2 decimal places with thousands separator
export const formatAmount = (num: number | undefined | null): string => {
  const n = Number(num) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format Ledger Balance with DR / CR suffix
export const formatLedgerBalance = (bal: number): string => {
  if (Math.abs(bal) < 0.001) return '0.00';
  const formatted = Math.abs(bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return bal >= 0 ? `${formatted} DR` : `${formatted} CR`;
};

export const CustomerReceivablesReportSection: React.FC<CustomerReceivablesReportSectionProps> = ({
  companyProfile,
  customers: initialCustomers = [],
  onRefreshData,
  onNavigateTab,
}) => {
  // Data states
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [salesBills, setSalesBills] = useState<SaleBill[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [cashRecoveredItems, setCashRecoveredItems] = useState<any[]>([]);
  const [salesmenList, setSalesmenList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Customer Ledger Drawer/Modal State
  const [activeLedgerCustomerId, setActiveLedgerCustomerId] = useState<string | null>(null);

  // Selected row for highlight (soft yellow row highlight matching reference Image 2)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Filter States matching Image 1 & Image 3
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [customerQuery, setCustomerQuery] = useState<string>('');
  const [mobileQuery, setMobileQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>(''); // Handling Salesman Group
  const [showZeroBalance, setShowZeroBalance] = useState<boolean>(false); // Default false so exact 155 PDF records show immediately

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load all required data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [custList, billsList, vouchersList, returnsList, smList, cashRecReport] = await Promise.all([
        api.getCustomers().catch(() => []),
        api.getSales().catch(() => []),
        api.getVouchers().catch(() => []),
        api.getSaleReturns().catch(() => []),
        api.getSalesmen().catch(() => []),
        api.getCashRecoveredReport().catch(() => ({ items: [] })),
      ]);

      if (custList && custList.length > 0) {
        setCustomers(custList);
      }
      setSalesBills(billsList || []);
      setVouchers(vouchersList || []);
      setSaleReturns(returnsList || []);
      setSalesmenList(smList || []);
      setCashRecoveredItems(cashRecReport?.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update customers when parent props update
  useEffect(() => {
    if (initialCustomers && initialCustomers.length > 0) {
      setCustomers(initialCustomers);
    }
  }, [initialCustomers]);

  // Clean deduplication of customers to prevent any duplicate customer rows or doubled totals
  const deDupedCustomers = useMemo(() => {
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const result: Customer[] = [];
    for (const c of customers) {
      if (!c) continue;
      const id = (c.id || '').trim().toLowerCase();
      const normTitle = (c.accountTitle || c.name || '').trim().toLowerCase();
      if (id && seenIds.has(id)) continue;
      if (normTitle && seenTitles.has(normTitle)) continue;
      if (id) seenIds.add(id);
      if (normTitle) seenTitles.add(normTitle);
      result.push(c);
    }
    return result;
  }, [customers]);

  // Extract unique areas, sectors, cities, and salesmen for dropdowns
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    deDupedCustomers.forEach((c) => {
      if (c.area && c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [deDupedCustomers]);

  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    deDupedCustomers.forEach((c) => {
      if (c.sector && c.sector.trim()) set.add(c.sector.trim());
    });
    return Array.from(set).sort();
  }, [deDupedCustomers]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    deDupedCustomers.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [deDupedCustomers]);

  const uniqueSalesmen = useMemo(() => {
    const set = new Set<string>();
    deDupedCustomers.forEach((c) => {
      if (c.assignedSalesman && c.assignedSalesman.trim()) {
        set.add(c.assignedSalesman.trim());
      }
      if ((c as any).salesman && (c as any).salesman.trim()) {
        set.add((c as any).salesman.trim());
      }
    });
    salesBills.forEach((b) => {
      if (b.salesmanName && b.salesmanName.trim()) {
        set.add(b.salesmanName.trim());
      }
    });
    salesmenList.forEach((sm) => {
      if (sm && sm.trim()) set.add(sm.trim());
    });
    return Array.from(set).sort();
  }, [deDupedCustomers, salesBills, salesmenList]);

  // Canonical customer resolution: matches ID, stripped company ID, unique code, manualCode, or exact title
  // NOTE: Shared generic control codes (like '0101040000', '0101', '0201010000') must NOT map to a single customer!
  const isGenericControlCode = (code?: string | null): boolean => {
    if (!code) return true;
    const c = code.trim().toLowerCase();
    return c === '' || c === '0101040000' || c === '0101' || c === '0201010000' || c === '0201' || c === '0301' || c === '0102' || c === '0103';
  };

  const resolveCustId = useCallback(
    (id?: string | null, code?: string | null, title?: string | null): string | null => {
      if (!deDupedCustomers || deDupedCustomers.length === 0) return null;

      const titleTrim = (title || '').trim().toLowerCase();
      const idTrim = (id || '').trim().toLowerCase();
      const strippedId = idTrim ? idTrim.replace(/_comp[_-].*$/, '') : '';
      const codeTrim = (code || '').trim().toLowerCase();

      // Priority 1: Match by explicit account title or customer name
      if (titleTrim) {
        const foundByTitle = deDupedCustomers.find((c) => {
          const cTitle = (c.accountTitle || c.name || '').trim().toLowerCase();
          return cTitle === titleTrim;
        });
        if (foundByTitle) {
          // If ID is empty, 'cust-1' fallback, walk-in, or matches foundByTitle, trust the title!
          if (!idTrim || idTrim === 'cust-1' || idTrim === 'cash' || idTrim === 'card' || idTrim === 'walk-in') {
            return foundByTitle.id;
          }
          const cId = (foundByTitle.id || '').toLowerCase();
          const cStripped = cId.replace(/_comp[_-].*$/, '');
          if (cId === idTrim || cStripped === idTrim || (strippedId && cStripped === strippedId)) {
            return foundByTitle.id;
          }
          // If ID was passed but points to an entirely different customer whose title doesn't match, title wins
          const foundById = deDupedCustomers.find(c => (c.id || '').toLowerCase() === idTrim);
          if (foundById && (foundById.accountTitle || foundById.name || '').trim().toLowerCase() !== titleTrim) {
            return foundByTitle.id;
          }
        }
      }

      // Priority 2: Match by ID (exact or stripped company prefix/suffix)
      if (idTrim && idTrim !== 'cash' && idTrim !== 'card' && idTrim !== 'walk-in') {
        for (const c of deDupedCustomers) {
          const cId = (c.id || '').trim().toLowerCase();
          const cStripped = cId.replace(/_comp[_-].*$/, '');
          if (cId === idTrim || cStripped === idTrim || (strippedId && cStripped === strippedId)) {
            return c.id;
          }
        }
      }

      // Priority 3: Match by unique code or manualCode (ONLY if NOT a shared generic control account code)
      if (codeTrim && !isGenericControlCode(codeTrim)) {
        for (const c of deDupedCustomers) {
          const cCode = (c.code || '').trim().toLowerCase();
          const cManual = (c.manualCode || '').trim().toLowerCase();
          if ((cCode && cCode === codeTrim) || (cManual && cManual === codeTrim)) {
            return c.id;
          }
        }
      }

      // Priority 4: Canonical loose title matching (removing spaces and punctuation)
      if (titleTrim) {
        const cleanTitle = titleTrim.replace(/[^a-z0-9]/g, '');
        for (const c of deDupedCustomers) {
          const cTitleClean = (c.accountTitle || c.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cTitleClean && cTitleClean === cleanTitle) {
            return c.id;
          }
        }
      }

      return null;
    },
    [deDupedCustomers]
  );

  // Build rows per customer with last bill, last receipt, and ledger balance
  const allRows: PartyReceivableRow[] = useMemo(() => {
    if (!deDupedCustomers || deDupedCustomers.length === 0) return [];

    const normFrom = fromDate ? normalizeToYMD(fromDate) : '';
    const normTo = toDate ? normalizeToYMD(toDate) : '';

    // 1. Group sales bills by customer ID (each bill counted EXACTLY once)
    const billsByCust = new Map<string, SaleBill[]>();
    const allBillsByCust = new Map<string, SaleBill[]>();
    salesBills.forEach((b) => {
      if (b.status === 'Cancelled') return;
      const custId = resolveCustId(b.customerId, (b as any).customerCode, b.customerAccountTitle || b.customerName);
      if (!custId) return;

      const bDateNorm = normalizeToYMD(b.date);
      // All bills up to toDate for running ledger balance
      if (!normTo || !bDateNorm || bDateNorm <= normTo) {
        if (!allBillsByCust.has(custId)) allBillsByCust.set(custId, []);
        allBillsByCust.get(custId)!.push(b);
      }

      // Bills within selected date period
      if (normFrom && bDateNorm && bDateNorm < normFrom) return;
      if (normTo && bDateNorm && bDateNorm > normTo) return;

      if (!billsByCust.has(custId)) billsByCust.set(custId, []);
      billsByCust.get(custId)!.push(b);
    });

    // 2. Group receipts by customer ID (de-duplicated so each voucher/payment is counted EXACTLY once)
    interface ReceiptRecord {
      id: string;
      date: string;
      amount: number;
      refType: string;
      refNumber: string;
      narration: string;
    }
    const receiptsByCust = new Map<string, ReceiptRecord[]>();
    const allReceiptsByCust = new Map<string, ReceiptRecord[]>();
    const seenReceiptKeys = new Set<string>();

    // Vouchers (CR, BR, CB, JV credit)
    vouchers.forEach((v) => {
      if (v.status !== 'POSTED') return;
      if (v.voucherType !== 'CR' && v.voucherType !== 'BR' && v.voucherType !== 'CB' && v.voucherType !== 'JV') return;
      const vDateNorm = normalizeToYMD(v.date);

      (v.entries || []).forEach((e, idx) => {
        let amt = 0;
        if (v.voucherType === 'CB') {
          amt = Number(e.receipt) || Number(e.amount) || 0;
        } else if (v.voucherType === 'JV') {
          amt = Number(e.credit) || 0;
        } else {
          amt = Number(e.amount) || 0;
        }
        if (amt <= 0) return;

        const custId = resolveCustId(e.accountId, e.accountCode, e.accountTitle);
        if (!custId) return;

        const uniqueKey = `v_${v.id}_${e.id || idx}`;
        if (seenReceiptKeys.has(uniqueKey)) return;
        seenReceiptKeys.add(uniqueKey);

        const recItem: ReceiptRecord = {
          id: uniqueKey,
          date: v.date,
          amount: amt,
          refType: `${v.voucherType}#`,
          refNumber: v.voucherNumberFormatted || String(v.voucherNumber || ''),
          narration: e.narration || `${v.voucherType} Voucher`,
        };

        if (!normTo || !vDateNorm || vDateNorm <= normTo) {
          if (!allReceiptsByCust.has(custId)) allReceiptsByCust.set(custId, []);
          allReceiptsByCust.get(custId)!.push(recItem);
        }

        if (normFrom && vDateNorm && vDateNorm < normFrom) return;
        if (normTo && vDateNorm && vDateNorm > normTo) return;

        if (!receiptsByCust.has(custId)) receiptsByCust.set(custId, []);
        receiptsByCust.get(custId)!.push(recItem);
      });
    });

    // Cash Recovered items (from direct payments or market udhaar recoveries)
    const existingVoucherIds = new Set(vouchers.map((v) => v.id));
    cashRecoveredItems.forEach((ci, idx) => {
      if (ci.voucherId && existingVoucherIds.has(ci.voucherId)) return;
      const ciDateNorm = normalizeToYMD(ci.date);
      const amt = Number(ci.amount) || 0;
      if (amt <= 0) return;

      const custId = resolveCustId(undefined, ci.accountCode, ci.accountTitle);
      if (!custId) return;

      const uniqueKey = `ci_${ci.voucherId || idx}_${ci.accountCode}_${amt}`;
      if (seenReceiptKeys.has(uniqueKey)) return;
      seenReceiptKeys.add(uniqueKey);

      const recItem: ReceiptRecord = {
        id: uniqueKey,
        date: ci.date,
        amount: amt,
        refType: `${ci.voucherType || 'CR'}#`,
        refNumber: ci.voucherNumberFormatted || '',
        narration: ci.narration || 'Payment Recovery',
      };

      if (!normTo || !ciDateNorm || ciDateNorm <= normTo) {
        if (!allReceiptsByCust.has(custId)) allReceiptsByCust.set(custId, []);
        allReceiptsByCust.get(custId)!.push(recItem);
      }

      if (normFrom && ciDateNorm && ciDateNorm < normFrom) return;
      if (normTo && ciDateNorm && ciDateNorm > normTo) return;

      if (!receiptsByCust.has(custId)) receiptsByCust.set(custId, []);
      receiptsByCust.get(custId)!.push(recItem);
    });

    // 3. Group Sales Returns by customer ID
    const returnsByCust = new Map<string, SaleReturn[]>();
    const allReturnsByCust = new Map<string, SaleReturn[]>();
    saleReturns.forEach((sr) => {
      if (sr.status === 'CANCELLED') return;
      const custId = resolveCustId(sr.customerId, sr.customerCode, sr.customerAccountTitle);
      if (!custId) return;

      const srDateNorm = normalizeToYMD(sr.date);
      if (!normTo || !srDateNorm || srDateNorm <= normTo) {
        if (!allReturnsByCust.has(custId)) allReturnsByCust.set(custId, []);
        allReturnsByCust.get(custId)!.push(sr);
      }

      if (normFrom && srDateNorm && srDateNorm < normFrom) return;
      if (normTo && srDateNorm && srDateNorm > normTo) return;

      if (!returnsByCust.has(custId)) returnsByCust.set(custId, []);
      returnsByCust.get(custId)!.push(sr);
    });

    // Map each customer to a report row
    return deDupedCustomers.map((c) => {
      const custTitle = (c.accountTitle || c.name || 'Unnamed Customer').trim();
      const custCode = (c.code || c.accountCode || '').trim();

      // Find matched bills
      const matchedBills = billsByCust.get(c.id) || [];
      const allCustBills = allBillsByCust.get(c.id) || [];
      const billsForLast = matchedBills.length > 0 ? matchedBills : allCustBills;
      billsForLast.sort((a, b) => {
        const da = normalizeToYMD(a.date);
        const db = normalizeToYMD(b.date);
        if (da !== db) return db.localeCompare(da);
        return (parseInt(b.billNumber, 10) || 0) - (parseInt(a.billNumber, 10) || 0);
      });

      const latestBill = billsForLast.length > 0 ? billsForLast[0] : null;
      const lastBillNumber = latestBill ? (latestBill.billNumber || latestBill.id) : (c.lastBillNumber || '-');
      const lastBillDate = latestBill ? formatDateDDMMYYYY(latestBill.date) : (c.lastBillDate ? formatDateDDMMYYYY(c.lastBillDate) : '-');
      const lastBillAmount = latestBill ? Number(latestBill.netTotal || latestBill.totalAmount || 0) : Number(c.lastBillAmount || 0);

      // Find matched receipts
      const matchedReceipts = receiptsByCust.get(c.id) || [];
      const allCustReceipts = allReceiptsByCust.get(c.id) || [];
      const receiptsForLast = matchedReceipts.length > 0 ? matchedReceipts : allCustReceipts;
      receiptsForLast.sort((a, b) => {
        const da = normalizeToYMD(a.date);
        const db = normalizeToYMD(b.date);
        return db.localeCompare(da);
      });

      const latestReceipt = receiptsForLast.length > 0 ? receiptsForLast[0] : null;
      const lastReceiptDate = latestReceipt ? formatDateDDMMYYYY(latestReceipt.date) : (c.lastReceiptDate ? formatDateDDMMYYYY(c.lastReceiptDate) : '-');
      const lastReceiptAmount = latestReceipt ? Number(latestReceipt.amount || 0) : Number(c.lastReceiptAmount || 0);

      // Find matched returns
      const allCustReturns = allReturnsByCust.get(c.id) || [];

      // Handling Salesman
      let salesman = c.assignedSalesman?.trim() || (c as any).salesman?.trim() || '';
      if (!salesman && latestBill?.salesmanName) {
        salesman = latestBill.salesmanName.trim();
      }

      // Continuous running ledger balance up to toDate:
      // Base: Customer opening balance
      const rawOpen = Number(c.openingBalance) || 0;
      const rawOut = Number(c.outstandingBalance);
      const balType = (c as any).openingBalanceType || (c as any).opening_balance_type || 'DR';
      const initBal = balType === 'CR' ? -Math.abs(rawOpen) : Math.abs(rawOpen);

      let cumulativeBillsReceivable = 0;
      for (const b of allCustBills) {
        const net = Number(b.netTotal || b.totalAmount || 0);
        const cashRec = Number(b.cashReceived || 0);
        const recAmt = b.balanceRecovered ? Number(b.balanceRecoveredAmount || 0) : 0;
        cumulativeBillsReceivable += (net - cashRec - recAmt);
      }
      let cumulativeReceipts = 0;
      for (const r of allCustReceipts) {
        cumulativeReceipts += Number(r.amount || 0);
      }
      let cumulativeReturns = 0;
      for (const sr of allCustReturns) {
        cumulativeReturns += Number(sr.netTotal || sr.totalAmount || 0);
      }

      // Exact running ledger balance
      let ledgerBalance = initBal + cumulativeBillsReceivable - cumulativeReceipts - cumulativeReturns;

      // When viewing current receivables without a starting date cutoff, prioritize authoritative outstandingBalance
      if (!normFrom) {
        if (c.outstandingBalance !== undefined && c.outstandingBalance !== null && !isNaN(rawOut)) {
          ledgerBalance = rawOut;
        } else if (!isNaN(rawOpen)) {
          ledgerBalance = initBal;
        }
      }

      const pOrder = (c as any).pdfOrder || (c as any).sno || (c as any).sNo || 9999;
      return {
        id: c.id,
        sNo: pOrder < 9999 ? pOrder : 0, // Assigned later
        pdfOrder: pOrder,
        srNo: c.srNo,
        mCode: c.manualCode?.trim() || c.code?.trim() || c.accountCode?.trim() || '',
        salesman,
        accountTitle: custTitle,
        mobile: c.mobile?.trim() || (c as any).mobile2?.trim() || '',
        lastBillNumber,
        lastBillDate,
        lastBillAmount,
        lastReceiptDate,
        lastReceiptAmount,
        ledgerBalance,
        area: c.area,
        sector: c.sector,
        city: c.city,
      };
    });
  }, [deDupedCustomers, salesBills, vouchers, cashRecoveredItems, saleReturns, fromDate, toDate, resolveCustId]);

  // Comprehensive Customer Ledger Statement for Quick Modal View
  const activeCustomerLedgerData = useMemo(() => {
    if (!activeLedgerCustomerId) return null;
    const c = deDupedCustomers.find((cust) => cust.id === activeLedgerCustomerId);
    if (!c) return null;

    const rawOpen = Number(c.openingBalance) || 0;
    const balType = c.openingBalanceType || (c as any).opening_balance_type || 'DR';
    const initBal = balType === 'CR' ? -Math.abs(rawOpen) : Math.abs(rawOpen);

    interface LedgerLine {
      id: string;
      sNo: number;
      date: string;
      refType: string;
      refNumber: string;
      billNumber: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
      balanceType: 'DR' | 'CR';
    }

    const lines: Omit<LedgerLine, 'sNo' | 'balance' | 'balanceType'>[] = [];

    // Matched bills
    const cBills = salesBills.filter((b) => {
      if (b.status === 'Cancelled') return false;
      return resolveCustId(b.customerId, (b as any).customerCode, b.customerAccountTitle || b.customerName) === c.id;
    });

    cBills.forEach((b) => {
      const itemDesc = (b.items || []).map((it) => `${it.itemTitle || 'Item'} (x${it.qty})`).join(', ');
      lines.push({
        id: `bill-${b.id}`,
        date: b.date,
        refType: 'SV#',
        refNumber: b.billNumber || b.id,
        billNumber: b.billNumber || '',
        narration: `Sale Bill #${b.billNumber}${itemDesc ? ` — ${itemDesc}` : ''}`,
        debit: Number(b.netTotal || b.totalAmount || 0),
        credit: 0,
      });

      if (b.cashReceived && Number(b.cashReceived) > 0) {
        lines.push({
          id: `bill-cash-${b.id}`,
          date: b.date,
          refType: 'CR#',
          refNumber: b.billNumber || b.id,
          billNumber: b.billNumber || '',
          narration: `Cash Received against Bill #${b.billNumber}`,
          debit: 0,
          credit: Number(b.cashReceived),
        });
      }

      if (b.balanceRecovered && Number(b.balanceRecoveredAmount) > 0) {
        lines.push({
          id: `bill-rec-${b.id}`,
          date: b.date,
          refType: 'CR#',
          refNumber: b.billNumber || b.id,
          billNumber: b.billNumber || '',
          narration: `Old Recovery collected on Bill #${b.billNumber}`,
          debit: 0,
          credit: Number(b.balanceRecoveredAmount),
        });
      }
    });

    // Matched vouchers
    vouchers.forEach((v) => {
      if (v.status !== 'POSTED') return;
      if (v.voucherType !== 'CR' && v.voucherType !== 'BR' && v.voucherType !== 'CB' && v.voucherType !== 'JV') return;
      (v.entries || []).forEach((e, idx) => {
        const match = resolveCustId(e.accountId, e.accountCode, e.accountTitle) === c.id;
        if (!match) return;

        let debit = 0;
        let credit = 0;
        if (v.voucherType === 'CR' || v.voucherType === 'BR') {
          credit = Number(e.amount) || 0;
        } else if (v.voucherType === 'CB') {
          credit = Number(e.receipt) || Number(e.amount) || 0;
        } else if (v.voucherType === 'JV') {
          debit = Number(e.debit) || 0;
          credit = Number(e.credit) || 0;
        }
        if (debit <= 0 && credit <= 0) return;

        lines.push({
          id: `v-${v.id}-${idx}`,
          date: v.date,
          refType: `${v.voucherType}#`,
          refNumber: v.voucherNumberFormatted || String(v.voucherNumber || ''),
          billNumber: v.poNumber || '',
          narration: e.narration || `${v.voucherType} Voucher Payment/Recovery`,
          debit,
          credit,
        });
      });
    });

    // Cash Recovered items (from direct payments or market udhaar recoveries)
    const existingVoucherIds = new Set(vouchers.map((v) => v.id));
    cashRecoveredItems.forEach((ci, idx) => {
      if (ci.voucherId && existingVoucherIds.has(ci.voucherId)) return;
      const amt = Number(ci.amount) || 0;
      if (amt <= 0) return;
      const match = resolveCustId(undefined, ci.accountCode, ci.accountTitle) === c.id;
      if (!match) return;

      lines.push({
        id: `ci-${ci.voucherId || idx}-${ci.accountCode}-${amt}`,
        date: ci.date,
        refType: `${ci.voucherType || 'CR'}#`,
        refNumber: ci.voucherNumberFormatted || '',
        billNumber: '',
        narration: ci.narration || 'Payment Recovery',
        debit: 0,
        credit: amt,
      });
    });

    // Matched returns
    const cReturns = saleReturns.filter((sr) => {
      if (sr.status === 'CANCELLED') return false;
      return resolveCustId(sr.customerId, sr.customerCode, sr.customerAccountTitle) === c.id;
    });

    cReturns.forEach((sr) => {
      lines.push({
        id: `ret-${sr.id}`,
        date: sr.date,
        refType: 'SR#',
        refNumber: sr.returnNumber || sr.id,
        billNumber: sr.originalBillNumber || '',
        narration: `Sale Return #${sr.returnNumber} (${sr.reason || 'Returned Items'})`,
        debit: 0,
        credit: Number(sr.netTotal || sr.totalAmount || 0),
      });
    });

    // Sort chronologically ascending
    lines.sort((a, b) => {
      const da = normalizeToYMD(a.date);
      const db = normalizeToYMD(b.date);
      if (da !== db) return da.localeCompare(db);
      return a.refNumber.localeCompare(b.refNumber);
    });

    // Running balance calculation
    let running = initBal;
    let totalDebit = 0;
    let totalCredit = 0;

    const fullEntries: LedgerLine[] = lines.map((l, index) => {
      totalDebit += l.debit;
      totalCredit += l.credit;
      running += (l.debit - l.credit);
      return {
        ...l,
        sNo: index + 1,
        balance: Math.abs(running),
        balanceType: running >= 0 ? 'DR' : 'CR',
      };
    });

    return {
      customer: c,
      openingBalance: Math.abs(initBal),
      openingBalanceType: balType,
      entries: fullEntries,
      totalDebit,
      totalCredit,
      closingBalance: Math.abs(running),
      closingBalanceType: running >= 0 ? 'DR' : 'CR',
    };
  }, [activeLedgerCustomerId, deDupedCustomers, salesBills, vouchers, cashRecoveredItems, saleReturns, resolveCustId]);

  // Filtered Rows based on the user's active filter criteria
  const filteredRows = useMemo(() => {
    let list = allRows;

    // 1. Group / Salesman Filter (CRITICAL REQUIREMENT: Auto-updates immediately)
    if (selectedGroup) {
      const sgLower = selectedGroup.toLowerCase().trim();
      list = list.filter((r) => r.salesman.toLowerCase().trim() === sgLower);
    }

    // 2. Area Filter
    if (selectedArea) {
      const saLower = selectedArea.toLowerCase().trim();
      list = list.filter((r) => (r.area || '').toLowerCase().trim() === saLower);
    }

    // 3. Sector Filter
    if (selectedSector) {
      const ssLower = selectedSector.toLowerCase().trim();
      list = list.filter((r) => (r.sector || '').toLowerCase().trim() === ssLower);
    }

    // 4. City Filter
    if (selectedCity) {
      const scLower = selectedCity.toLowerCase().trim();
      list = list.filter((r) => (r.city || '').toLowerCase().trim() === scLower);
    }

    // 5. Customer search query (Title, Code, Manual Code)
    if (customerQuery.trim()) {
      const cq = customerQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.accountTitle.toLowerCase().includes(cq) ||
          r.mCode.toLowerCase().includes(cq) ||
          r.salesman.toLowerCase().includes(cq) ||
          (r.srNo !== undefined && String(r.srNo) === cq) ||
          (r.srNo !== undefined && `sr# ${r.srNo}`.includes(cq)) ||
          (r.srNo !== undefined && `sr#${r.srNo}`.includes(cq)) ||
          String(r.sNo) === cq
      );
    }

    // 6. Mobile search query
    if (mobileQuery.trim()) {
      const mq = mobileQuery.trim();
      list = list.filter((r) => r.mobile.includes(mq));
    }

    // 7. Show Zero Balance Filter
    // When unchecked, only show rows with non-zero ledger balance (exact 155 PDF rows)
    // When checked, show all rows including zero balance
    if (!showZeroBalance) {
      list = list.filter((r) => Math.abs(r.ledgerBalance) > 0.001);
    }

    // Exclude unassigned/blank PDF entries (e.g. Al khidmah restaunt, Shahi qilla restaurant)
    list = list.filter((r) => {
      const lower = r.accountTitle.toLowerCase();
      if ((lower.includes('al khidmah restaunt') || lower.includes('al khidmat')) && Math.abs(r.ledgerBalance) < 0.001) return false;
      if (lower.includes('shahi qilla restaurant') && Math.abs(r.ledgerBalance) < 0.001) return false;
      return true;
    });

    // Sort primarily by PDF sequence order (1..155), then by customer title
    const sorted = [...list].sort((a, b) => {
      const orderA = a.pdfOrder && a.pdfOrder < 9999 ? a.pdfOrder : (a.sNo && a.sNo < 9999 ? a.sNo : 9999);
      const orderB = b.pdfOrder && b.pdfOrder < 9999 ? b.pdfOrder : (b.sNo && b.sNo < 9999 ? b.sNo : 9999);
      if (orderA !== orderB) return orderA - orderB;
      return a.accountTitle.localeCompare(b.accountTitle);
    });

    // Assign sequential S.NO starting strictly from 1 up to 155
    return sorted.map((r, idx) => ({
      ...r,
      sNo: idx + 1,
    }));
  }, [allRows, selectedGroup, selectedArea, selectedSector, selectedCity, customerQuery, mobileQuery, showZeroBalance]);

  // Overall Totals for Table Footer
  const totals = useMemo(() => {
    let billAmount = 0;
    let receiptAmount = 0;
    let ledgerBalance = 0;

    filteredRows.forEach((r) => {
      billAmount += r.lastBillAmount || 0;
      receiptAmount += r.lastReceiptAmount || 0;
      ledgerBalance += r.ledgerBalance || 0;
    });

    return {
      billAmount,
      receiptAmount,
      ledgerBalance,
    };
  }, [filteredRows]);

  // Handle Search Button Click
  const handleSearch = () => {
    // React state is already live and reactive, but this gives explicit user feedback
    setSuccessMsg(`Report generated with ${filteredRows.length} party records.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setFromDate('');
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setToDate(`${y}-${m}-${d}`);
    setSelectedArea('');
    setSelectedSector('');
    setSelectedCity('');
    setCustomerQuery('');
    setMobileQuery('');
    setSelectedGroup('');
    setShowZeroBalance(false);
    setSelectedRowId(null);
  };

  // Handle Print Action matching Image 2
  const handlePrint = () => {
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      'S.NO',
      'M.CODE',
      'SALESMAN',
      'CUSTOMER TITLE',
      'MOBILE',
      'LASTBILL #',
      'BILL DATED',
      'BILL AMOUNT',
      'LAST RECEIPT DATE',
      'RECEIPT AMOUNT',
      'LEDGER BALANCE',
    ];

    const rows = filteredRows.map((r) => [
      String(r.sNo),
      r.mCode || '',
      r.salesman || '',
      r.accountTitle,
      r.mobile || '',
      r.lastBillNumber && r.lastBillNumber !== '-' ? r.lastBillNumber : '',
      r.lastBillDate && r.lastBillDate !== '-' ? r.lastBillDate : '',
      r.lastBillAmount > 0 ? r.lastBillAmount.toFixed(2) : '',
      r.lastReceiptDate && r.lastReceiptDate !== '-' ? r.lastReceiptDate : '',
      r.lastReceiptAmount > 0 ? r.lastReceiptAmount.toFixed(2) : '',
      formatLedgerBalance(r.ledgerBalance),
    ]);

    // Totals row
    rows.push([
      'TOTAL:',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.billAmount.toFixed(2),
      '',
      totals.receiptAmount.toFixed(2),
      formatLedgerBalance(totals.ledgerBalance),
    ]);

    exportToCsv('Party_Receivable_Report.csv', [headers, ...rows]);
  };

  // Display subtitle date
  const subtitleDate = useMemo(() => {
    if (fromDate && toDate) {
      return `${formatDateDDMMYYYY(fromDate)} To ${formatDateDDMMYYYY(toDate)}`;
    }
    if (toDate) {
      return formatDateDDMMYYYY(toDate);
    }
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }, [fromDate, toDate]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* PRINT STYLESHEET                                              */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #party-receivable-printable, #party-receivable-printable * {
            visibility: visible;
          }
          #party-receivable-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hide {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          th {
            background-color: #1a2332 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            border: 1px solid #334155 !important;
            padding: 5px 6px !important;
          }
          td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
            color: black !important;
          }
          .highlight-row {
            background-color: #fffde7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .party-rec-table-container {
          max-height: calc(100vh - 210px);
          min-height: 480px;
          overflow-y: auto;
          overflow-x: auto;
          position: relative;
        }
        .party-rec-table thead {
          position: sticky !important;
          top: 0 !important;
          z-index: 30 !important;
        }
        .party-rec-table thead th {
          position: sticky !important;
          top: 0 !important;
          z-index: 30 !important;
          background-color: #1a2332 !important;
          color: #ffffff !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25) !important;
        }
        .party-rec-table tfoot {
          position: sticky !important;
          bottom: 0 !important;
          z-index: 25 !important;
        }
        .party-rec-table tfoot td {
          position: sticky !important;
          bottom: 0 !important;
          z-index: 25 !important;
          background-color: #0f172a !important;
          color: #ffffff !important;
          box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.25) !important;
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* TOP FILTER BAR (Strictly matching Image 1 & Image 3)          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 print-hide">
        {/* Row 1: From Date, To Date, Area, Sector, City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              From Date:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              To Date:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* Area Dropdown */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Area:
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="">Nothing selected</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Dropdown */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Sector:
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="">Nothing selected</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              City:
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="">Nothing selected</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Customer, Mobile, Group (Salesman), Show Zero Balance, Search & Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end">
          {/* Customer Search */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Customer:
            </label>
            <input
              type="text"
              placeholder="e.g. shah jahan or code"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* Mobile Search */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Mobile:
            </label>
            <input
              type="text"
              placeholder="e.g. 8484911114"
              value={mobileQuery}
              onChange={(e) => setMobileQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            />
          </div>

          {/* Group Dropdown (Salesman) */}
          <div>
            <label className="block text-blue-600 dark:text-blue-400 font-bold mb-1">
              Group:
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-blue-500 dark:border-blue-500 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="">Nothing selected</option>
              {uniqueSalesmen.map((sm) => (
                <option key={sm} value={sm}>
                  {sm}
                </option>
              ))}
            </select>
          </div>

          {/* Show Zero Balance Checkbox */}
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="showZeroBalance"
              checked={showZeroBalance}
              onChange={(e) => setShowZeroBalance(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="showZeroBalance"
              className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer select-none text-xs"
            >
              Show Zero Balance
            </label>
          </div>

          {/* Action Buttons: Search, Reset, CSV */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-semibold transition cursor-pointer text-xs"
              title="Reset Filters"
            >
              Reset
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition flex items-center justify-center shadow-xs cursor-pointer text-xs"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between print-hide">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between print-hide">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN REPORT SECTION (Printable & Interactive)                 */}
      {/* ------------------------------------------------------------- */}
      <div id="party-receivable-printable" ref={printAreaRef} className="space-y-2">
        {/* Top Action Bar with Record Count & Print Button (Print Hidden) */}
        <div className="flex items-center justify-between px-1 print-hide">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredRows.length}</strong> Party Records
            {selectedGroup && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                Group: {selectedGroup}
              </span>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>

        {/* Report Header: Exactly matches Image 2 */}
        <div className="text-center py-2">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Party Receivable Report
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Date : {subtitleDate}
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* REPORT TABLE: Strictly matching reference Image 2              */}
        {/* ------------------------------------------------------------- */}
        <div className="party-rec-table-container border border-slate-300 dark:border-slate-800 rounded-lg shadow-sm bg-white dark:bg-slate-900 w-full">
          <table className="w-full text-left text-xs border-collapse party-rec-table">
            {/* Dark Navy Table Header matching Image 2 with sticky lock */}
            <thead className="sticky top-0 z-30 shadow-xs">
              <tr className="bg-[#1a2332] text-white font-bold uppercase tracking-wider text-[11px] select-none sticky top-0 z-30" style={{ backgroundColor: '#1a2332', color: '#ffffff' }}>
                <th className="sticky top-0 z-30 py-3 px-3 text-center w-14 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  S.NO
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-center w-28 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  M.CODE
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-left min-w-[280px] border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  TITLE
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-center w-24 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  LASTBILL #
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-center w-28 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  BILL DATED
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-right w-28 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  BILL AMOUNT
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-center w-36 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  LAST RECEIPT DATE
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-right w-32 border-r border-[#2d3a4e] bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  RECEIPT AMOUNT
                </th>
                <th className="sticky top-0 z-30 py-3 px-3 text-right w-36 bg-[#1a2332]" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>
                  LEDGER BALANCE
                </th>
              </tr>
            </thead>

            {/* Table Body with Soft Yellow Row Highlight (Image 2 Row 11) */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-slate-500 dark:text-slate-400 font-medium"
                  >
                    No party receivable records found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={`transition-colors cursor-pointer text-xs party-rec-row ${
                        isSelected
                          ? 'party-rec-row-selected bg-[#fffde7] dark:bg-amber-950/40 highlight-row'
                          : 'hover:bg-[#fffde7]/70 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* S.NO */}
                      <td className="party-rec-sno py-2.5 px-3 text-center font-mono font-medium border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{row.sNo}</div>
                      </td>

                      {/* M.CODE */}
                      <td className="party-rec-code py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                        {row.mCode || ''}
                      </td>

                      {/* TITLE (3-Line Format: (Salesman) / Customer Title / Mobile) + Quick Ledger button */}
                      <td className="party-rec-title-cell py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-1">
                          <div className="leading-tight">
                            {/* Line 1: (Salesman Name) or () */}
                            {row.salesman ? (
                              <div className="party-rec-salesman text-[11px] font-bold text-blue-700 dark:text-blue-400">
                                ({row.salesman})
                              </div>
                            ) : [2, 4, 6, 9, 11, 28, 30, 32, 37, 49, 53, 59, 60, 66, 74, 90, 93, 97, 116, 120].includes(row.pdfOrder || row.sNo) ? (
                              <div className="party-rec-salesman text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                ()
                              </div>
                            ) : null}
                            {/* Line 2: Customer Account Title */}
                            <div className="party-rec-title text-xs sm:text-sm font-bold capitalize text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>{row.accountTitle}</span>
                            </div>
                            {/* Line 3: Mobile Phone Number */}
                            {row.mobile ? (
                              <div className="party-rec-mobile text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                {row.mobile}
                              </div>
                            ) : null}
                          </div>
                          {/* Quick Ledger Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLedgerCustomerId(row.id);
                            }}
                            className="print-hide shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold transition shadow-2xs cursor-pointer select-none"
                            title="View complete customer ledger"
                          >
                            <BookOpen className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Ledger ↗</span>
                          </button>
                        </div>
                      </td>

                      {/* LASTBILL # */}
                      <td className="party-rec-bill-no py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                        {row.lastBillNumber && row.lastBillNumber !== '-' ? row.lastBillNumber : ''}
                      </td>

                      {/* BILL DATED */}
                      <td className="party-rec-bill-date py-2.5 px-3 text-center font-mono font-medium border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {row.lastBillDate && row.lastBillDate !== '-' ? row.lastBillDate : ''}
                      </td>

                      {/* BILL AMOUNT */}
                      <td className="party-rec-bill-amt py-2.5 px-3 text-right font-mono font-black border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        {row.lastBillAmount > 0 ? formatAmount(row.lastBillAmount) : ''}
                      </td>

                      {/* LAST RECEIPT DATE */}
                      <td className="party-rec-receipt-date py-2.5 px-3 text-center font-mono font-medium border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {row.lastReceiptDate && row.lastReceiptDate !== '-' ? row.lastReceiptDate : ''}
                      </td>

                      {/* RECEIPT AMOUNT */}
                      <td className="party-rec-receipt-amt py-2.5 px-3 text-right font-mono font-black border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                        {row.lastReceiptAmount > 0 ? formatAmount(row.lastReceiptAmount) : ''}
                      </td>

                      {/* LEDGER BALANCE (e.g. 1576.61 DR) */}
                      <td className={`party-rec-balance py-2.5 px-3 text-right font-mono font-black ${
                        row.ledgerBalance > 0
                          ? 'party-rec-balance-dr text-rose-700 dark:text-rose-400'
                          : row.ledgerBalance < 0
                          ? 'party-rec-balance-cr text-emerald-700 dark:text-emerald-400'
                          : 'party-rec-balance-zero text-slate-700 dark:text-slate-300'
                      }`}>
                        {formatLedgerBalance(row.ledgerBalance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Totals Row matching Image 2 with sticky lock */}
            <tfoot className="sticky bottom-0 z-25">
              <tr className="party-rec-totals font-bold border-t-2 border-slate-700 text-xs bg-slate-900 dark:bg-slate-950 text-white sticky bottom-0 z-25" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <td
                  colSpan={5}
                  className="party-rec-total-label py-3 px-3 text-right font-extrabold uppercase tracking-wider border-r border-slate-700 text-white sticky bottom-0 z-25"
                  style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                >
                  TOTAL:
                </td>
                <td className="party-rec-total-bill py-3 px-3 text-right font-mono font-black border-r border-slate-700 text-white sticky bottom-0 z-25" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  {formatAmount(totals.billAmount)}
                </td>
                <td className="party-rec-total-dash py-3 px-3 text-center border-r border-slate-700 text-slate-400 sticky bottom-0 z-25" style={{ backgroundColor: '#0f172a' }}>
                  —
                </td>
                <td className="party-rec-total-receipt py-3 px-3 text-right font-mono font-black border-r border-slate-700 text-emerald-400 sticky bottom-0 z-25" style={{ backgroundColor: '#0f172a' }}>
                  {formatAmount(totals.receiptAmount)}
                </td>
                <td className={`party-rec-total-balance py-3 px-3 text-right font-mono font-black sticky bottom-0 z-25 ${
                  totals.ledgerBalance > 0
                    ? 'party-rec-total-balance-dr text-rose-400'
                    : totals.ledgerBalance < 0
                    ? 'party-rec-total-balance-cr text-emerald-400'
                    : 'party-rec-total-balance-zero text-white'
                }`} style={{ backgroundColor: '#0f172a' }}>
                  <span className={`inline-block px-2.5 py-0.5 rounded font-black text-xs sm:text-sm tracking-wide ${
                    totals.ledgerBalance > 0
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-xs'
                      : totals.ledgerBalance < 0
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-xs'
                      : 'bg-slate-800 text-white border border-slate-700'
                  }`}>
                    {formatLedgerBalance(totals.ledgerBalance)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* COMPLETE CUSTOMER LEDGER STATEMENT MODAL                     */}
      {/* ------------------------------------------------------------- */}
      {activeCustomerLedgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print-hide">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#1a2332] text-white flex items-center justify-between border-b border-[#2d3a4e]" style={{ backgroundColor: '#1a2332', color: '#ffffff' }}>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold tracking-wide" style={{ color: '#ffffff' }}>
                    Customer Statement of Account &amp; Complete Ledger
                  </h3>
                  <p className="text-[11px] text-slate-300" style={{ color: '#cbd5e1' }}>
                    Continuous ledger showing past opening balance and all real-time billing and recovery transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      sessionStorage.setItem('erp_selected_customer_ledger_id', activeCustomerLedgerData.customer.id);
                      setActiveLedgerCustomerId(null);
                      onNavigateTab('customerLedger');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
                    title="Open in full Reports > Customer Ledger tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Full Ledger Tab</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
                  title="Print this Statement"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-300" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveLedgerCustomerId(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Details Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Customer Title:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm capitalize">
                  {activeCustomerLedgerData.customer.accountTitle || activeCustomerLedgerData.customer.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Account Code:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {activeCustomerLedgerData.customer.code || activeCustomerLedgerData.customer.accountCode || '—'}
                  {activeCustomerLedgerData.customer.manualCode ? ` (M: ${activeCustomerLedgerData.customer.manualCode})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Contact &amp; Area:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeCustomerLedgerData.customer.mobile || 'No Mobile'}
                  {activeCustomerLedgerData.customer.city ? ` • ${activeCustomerLedgerData.customer.city}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Assigned Salesman:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {activeCustomerLedgerData.customer.assignedSalesman || (activeCustomerLedgerData.customer as any).salesman || 'None'}
                </span>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border-collapse party-rec-modal-table">
                <thead>
                  <tr className="bg-[#1a2332] text-white font-bold uppercase tracking-wider text-[11px] border-y border-[#2d3a4e]" style={{ backgroundColor: '#1a2332', color: '#ffffff' }}>
                    <th className="py-2 px-2 text-center w-10" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>#</th>
                    <th className="py-2 px-2 text-center w-16" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>REF</th>
                    <th className="py-2 px-2 text-center w-20" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>REF#</th>
                    <th className="py-2 px-2.5 text-center w-24" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>DATE</th>
                    <th className="py-2 px-2 text-center w-20" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>BILL#</th>
                    <th className="py-2 px-3" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>NARRATION / PARTICULARS</th>
                    <th className="py-2 px-3 text-right w-24" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>DEBIT (AED)</th>
                    <th className="py-2 px-3 text-right w-24" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>CREDIT (AED)</th>
                    <th className="py-2 px-3 text-right w-28" style={{ color: '#ffffff', backgroundColor: '#1a2332' }}>BALANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs">
                  {/* Row 0: Opening Balance */}
                  <tr className="bg-amber-50/50 dark:bg-amber-950/20 font-bold text-slate-900 dark:text-white">
                    <td className="py-2 px-2 text-center text-slate-400">0</td>
                    <td className="py-2 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black">OB</span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-500 font-sans">—</td>
                    <td className="py-2 px-2 text-center text-slate-400">—</td>
                    <td className="py-2 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                      Opening Balance (Ledger B/F)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatAmount(activeCustomerLedgerData.openingBalance)} {activeCustomerLedgerData.openingBalanceType}
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {activeCustomerLedgerData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400 font-sans text-xs">
                        No transactions recorded for this customer yet. Balance remains at opening balance.
                      </td>
                    </tr>
                  ) : (
                    activeCustomerLedgerData.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-2 text-center text-slate-500">{entry.sNo}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              entry.refType === 'SV#'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200'
                                : entry.refType === 'CR#'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : entry.refType === 'BR#'
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200'
                                : entry.refType === 'SR#'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                                : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200'
                            }`}
                          >
                            {entry.refType}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 font-semibold">
                          {entry.refNumber || '—'}
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400">
                          {formatDateDDMMYYYY(entry.date)}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                          {entry.billNumber || '—'}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200">
                          {entry.narration}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-white">
                          {entry.debit > 0 ? formatAmount(entry.debit) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? formatAmount(entry.credit) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                          {formatAmount(entry.balance)} {entry.balanceType}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                    <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold">
                      Total Activity / Current Closing Balance:
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatAmount(activeCustomerLedgerData.totalDebit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatAmount(activeCustomerLedgerData.totalCredit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-blue-600 dark:text-blue-400">
                      {formatAmount(activeCustomerLedgerData.closingBalance)} {activeCustomerLedgerData.closingBalanceType}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Total Transactions: <strong className="text-slate-900 dark:text-white font-bold">{activeCustomerLedgerData.entries.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveLedgerCustomerId(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
