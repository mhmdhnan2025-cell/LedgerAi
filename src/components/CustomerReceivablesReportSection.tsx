import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { Customer, SaleBill, CompanyProfile, Voucher } from '../types';
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
  const [cashRecoveredItems, setCashRecoveredItems] = useState<any[]>([]);
  const [salesmenList, setSalesmenList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  const [showZeroBalance, setShowZeroBalance] = useState<boolean>(true); // Default true so user sees records immediately

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load all required data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [custList, billsList, vouchersList, smList, cashRecReport] = await Promise.all([
        api.getCustomers().catch(() => []),
        api.getSales().catch(() => []),
        api.getVouchers().catch(() => []),
        api.getSalesmen().catch(() => []),
        api.getCashRecoveredReport().catch(() => ({ items: [] })),
      ]);

      if (custList && custList.length > 0) {
        setCustomers(custList);
      }
      setSalesBills(billsList || []);
      setVouchers(vouchersList || []);
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

  // Extract unique areas, sectors, cities, and salesmen for dropdowns
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.area && c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.sector && c.sector.trim()) set.add(c.sector.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueSalesmen = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
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
  }, [customers, salesBills, salesmenList]);

  // Build rows per customer with last bill, last receipt, and ledger balance
  const allRows: PartyReceivableRow[] = useMemo(() => {
    if (!customers || customers.length === 0) return [];

    const normFrom = fromDate ? normalizeToYMD(fromDate) : '';
    const normTo = toDate ? normalizeToYMD(toDate) : '';

    // Group sales bills by customer ID and lower-case title
    const billsByCustId = new Map<string, SaleBill[]>();
    const billsByCustTitle = new Map<string, SaleBill[]>();

    salesBills.forEach((b) => {
      if (b.status === 'Cancelled') return;
      const bDateNorm = normalizeToYMD(b.date);
      if (normFrom && bDateNorm && bDateNorm < normFrom) return;
      if (normTo && bDateNorm && bDateNorm > normTo) return;

      if (b.customerId) {
        if (!billsByCustId.has(b.customerId)) billsByCustId.set(b.customerId, []);
        billsByCustId.get(b.customerId)!.push(b);
      }
      const titleLower = (b.customerAccountTitle || b.customerName || '').toLowerCase().trim();
      if (titleLower) {
        if (!billsByCustTitle.has(titleLower)) billsByCustTitle.set(titleLower, []);
        billsByCustTitle.get(titleLower)!.push(b);
      }
    });

    // Group receipt vouchers by customer ID, code, and lower-case title
    interface ReceiptRecord {
      date: string;
      amount: number;
    }
    const receiptsByCustId = new Map<string, ReceiptRecord[]>();
    const receiptsByCustCode = new Map<string, ReceiptRecord[]>();
    const receiptsByCustTitle = new Map<string, ReceiptRecord[]>();

    // 1. From Vouchers (CR, BR, CB)
    vouchers.forEach((v) => {
      if (v.status !== 'POSTED') return;
      if (v.voucherType !== 'CR' && v.voucherType !== 'BR' && v.voucherType !== 'CB') return;
      const vDateNorm = normalizeToYMD(v.date);
      if (normFrom && vDateNorm && vDateNorm < normFrom) return;
      if (normTo && vDateNorm && vDateNorm > normTo) return;

      (v.entries || []).forEach((e) => {
        const amt = v.voucherType === 'CB' ? (Number(e.receipt) || Number(e.amount) || 0) : (Number(e.amount) || 0);
        if (amt <= 0) return;

        const rec: ReceiptRecord = { date: v.date, amount: amt };
        if (e.accountId) {
          if (!receiptsByCustId.has(e.accountId)) receiptsByCustId.set(e.accountId, []);
          receiptsByCustId.get(e.accountId)!.push(rec);
        }
        const cCode = String(e.accountCode || '').trim();
        if (cCode) {
          if (!receiptsByCustCode.has(cCode)) receiptsByCustCode.set(cCode, []);
          receiptsByCustCode.get(cCode)!.push(rec);
        }
        const titleLower = (e.accountTitle || '').toLowerCase().trim();
        if (titleLower) {
          if (!receiptsByCustTitle.has(titleLower)) receiptsByCustTitle.set(titleLower, []);
          receiptsByCustTitle.get(titleLower)!.push(rec);
        }
      });
    });

    // 2. From Cash Recovered items
    cashRecoveredItems.forEach((ci) => {
      const ciDateNorm = normalizeToYMD(ci.date);
      if (normFrom && ciDateNorm && ciDateNorm < normFrom) return;
      if (normTo && ciDateNorm && ciDateNorm > normTo) return;
      const amt = Number(ci.amount) || 0;
      if (amt <= 0) return;

      const rec: ReceiptRecord = { date: ci.date, amount: amt };
      const cCode = String(ci.accountCode || '').trim();
      if (cCode) {
        if (!receiptsByCustCode.has(cCode)) receiptsByCustCode.set(cCode, []);
        receiptsByCustCode.get(cCode)!.push(rec);
      }
      const titleLower = (ci.accountTitle || '').toLowerCase().trim();
      if (titleLower) {
        if (!receiptsByCustTitle.has(titleLower)) receiptsByCustTitle.set(titleLower, []);
        receiptsByCustTitle.get(titleLower)!.push(rec);
      }
    });

    // Map each customer to a report row
    return customers.map((c) => {
      const custTitle = (c.accountTitle || c.name || 'Unnamed Customer').trim();
      const custTitleLower = custTitle.toLowerCase();
      const custCode = (c.code || c.accountCode || '').trim();

      // Find matched bills
      const matchedBills = billsByCustId.get(c.id) || billsByCustTitle.get(custTitleLower) || [];
      // Sort bills by date descending to find the latest bill
      matchedBills.sort((a, b) => {
        const da = normalizeToYMD(a.date);
        const db = normalizeToYMD(b.date);
        if (da !== db) return db.localeCompare(da);
        return (parseInt(b.billNumber, 10) || 0) - (parseInt(a.billNumber, 10) || 0);
      });

      const latestBill = matchedBills.length > 0 ? matchedBills[0] : null;
      const lastBillNumber = latestBill ? (latestBill.billNumber || latestBill.id) : (c.lastBillNumber || '-');
      const lastBillDate = latestBill ? formatDateDDMMYYYY(latestBill.date) : (c.lastBillDate || '-');
      const lastBillAmount = latestBill ? Number(latestBill.netTotal || latestBill.totalAmount || 0) : Number(c.lastBillAmount || 0);

      // Find matched receipts
      const matchedReceipts = [
        ...(receiptsByCustId.get(c.id) || []),
        ...(receiptsByCustCode.get(custCode) || []),
        ...(receiptsByCustTitle.get(custTitleLower) || []),
      ];
      // Sort receipts by date descending to find latest receipt
      matchedReceipts.sort((a, b) => {
        const da = normalizeToYMD(a.date);
        const db = normalizeToYMD(b.date);
        return db.localeCompare(da);
      });

      const latestReceipt = matchedReceipts.length > 0 ? matchedReceipts[0] : null;
      const lastReceiptDate = latestReceipt ? formatDateDDMMYYYY(latestReceipt.date) : (c.lastReceiptDate || '-');
      const lastReceiptAmount = latestReceipt ? Number(latestReceipt.amount || 0) : Number(c.lastReceiptAmount || 0);

      // Handling Salesman
      let salesman = c.assignedSalesman?.trim() || (c as any).salesman?.trim() || '';
      if (!salesman && latestBill?.salesmanName) {
        salesman = latestBill.salesmanName.trim();
      }

      // Continuous running ledger balance:
      // Base: Customer opening balance from report
      const rawOpen = Number(c.openingBalance) || 0;
      const rawOut = Number(c.outstandingBalance);
      const balType = (c as any).openingBalanceType || (c as any).opening_balance_type || 'DR';
      const initBal = balType === 'CR' ? -Math.abs(rawOpen) : Math.abs(rawOpen);

      let ledgerBalance = !isNaN(rawOut) && rawOut !== 0 ? rawOut : initBal;
      if (matchedBills.length > 0 || matchedReceipts.length > 0) {
        let computed = initBal;
        for (const b of matchedBills) {
          computed += Number(b.balanceReceivable !== undefined ? b.balanceReceivable : (Number(b.netTotal || 0) - Number(b.cashReceived || 0)));
        }
        for (const r of matchedReceipts) {
          computed -= Number(r.amount || 0);
        }
        ledgerBalance = computed;
      }

      return {
        id: c.id,
        sNo: 0, // Assigned later
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
  }, [customers, salesBills, vouchers, cashRecoveredItems, fromDate, toDate]);

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
          r.salesman.toLowerCase().includes(cq)
      );
    }

    // 6. Mobile search query
    if (mobileQuery.trim()) {
      const mq = mobileQuery.trim();
      list = list.filter((r) => r.mobile.includes(mq));
    }

    // 7. Show Zero Balance Filter
    // When unchecked, only show rows with ledger balance != 0 OR rows with bills/receipts
    // When checked, show all rows including zero balance
    if (!showZeroBalance) {
      // If user explicitly chose a salesman or searched customer, keep rows to avoid empty confusion
      if (!selectedGroup && !customerQuery) {
        list = list.filter((r) => Math.abs(r.ledgerBalance) > 0.001 || r.lastBillAmount > 0 || r.lastReceiptAmount > 0);
      } else {
        list = list.filter((r) => Math.abs(r.ledgerBalance) > 0.001);
      }
    }

    // Assign sequential S.NO
    return list.map((r, idx) => ({
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
    setShowZeroBalance(true);
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
      r.mCode,
      r.salesman || '0',
      r.accountTitle,
      r.mobile,
      r.lastBillNumber,
      r.lastBillDate,
      r.lastBillAmount > 0 ? r.lastBillAmount.toFixed(2) : '0.00',
      r.lastReceiptDate,
      r.lastReceiptAmount > 0 ? r.lastReceiptAmount.toFixed(2) : '0.00',
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
        <div className="overflow-x-auto border border-slate-300 dark:border-slate-800 rounded-lg shadow-xs bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs border-collapse">
            {/* Dark Navy Table Header matching Image 2 */}
            <thead>
              <tr className="bg-[#1a2332] text-white font-bold uppercase tracking-wider text-[11px] select-none">
                <th className="py-2.5 px-3 text-center w-14 border-r border-[#2d3a4e]">
                  S.NO
                </th>
                <th className="py-2.5 px-3 text-center w-28 border-r border-[#2d3a4e]">
                  M.CODE
                </th>
                <th className="py-2.5 px-3 text-left min-w-[240px] border-r border-[#2d3a4e]">
                  TITLE
                </th>
                <th className="py-2.5 px-3 text-center w-24 border-r border-[#2d3a4e]">
                  LASTBILL #
                </th>
                <th className="py-2.5 px-3 text-center w-28 border-r border-[#2d3a4e]">
                  BILL DATED
                </th>
                <th className="py-2.5 px-3 text-right w-28 border-r border-[#2d3a4e]">
                  BILL AMOUNT
                </th>
                <th className="py-2.5 px-3 text-center w-36 border-r border-[#2d3a4e]">
                  LAST RECEIPT DATE
                </th>
                <th className="py-2.5 px-3 text-right w-32 border-r border-[#2d3a4e]">
                  RECEIPT AMOUNT
                </th>
                <th className="py-2.5 px-3 text-right w-36">
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
                      className={`transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-[#fffde7] dark:bg-amber-950/40 highlight-row'
                          : 'hover:bg-[#fffde7]/70 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* S.NO */}
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {row.sNo}
                      </td>

                      {/* M.CODE */}
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {row.mCode || '—'}
                      </td>

                      {/* TITLE (3-Line Format: (Salesman) / Customer Title / Mobile) */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                        <div className="leading-tight">
                          {/* Line 1: (Salesman Name) or 0 */}
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {row.salesman ? `(${row.salesman})` : '0'}
                          </div>
                          {/* Line 2: Customer Account Title */}
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {row.accountTitle}
                          </div>
                          {/* Line 3: Mobile Phone Number */}
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {row.mobile || '—'}
                          </div>
                        </div>
                      </td>

                      {/* LASTBILL # */}
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {row.lastBillNumber}
                      </td>

                      {/* BILL DATED */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {row.lastBillDate}
                      </td>

                      {/* BILL AMOUNT */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                        {row.lastBillAmount > 0 ? formatAmount(row.lastBillAmount) : '0.00'}
                      </td>

                      {/* LAST RECEIPT DATE */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {row.lastReceiptDate}
                      </td>

                      {/* RECEIPT AMOUNT */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                        {row.lastReceiptAmount > 0 ? formatAmount(row.lastReceiptAmount) : '0.00'}
                      </td>

                      {/* LEDGER BALANCE (e.g. 1576.61 DR) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatLedgerBalance(row.ledgerBalance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Totals Row matching Image 2 */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                <td
                  colSpan={5}
                  className="py-3 px-3 text-right font-extrabold uppercase tracking-wider border-r border-slate-200 dark:border-slate-800"
                >
                  TOTAL:
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                  {formatAmount(totals.billAmount)}
                </td>
                <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                  —
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                  {formatAmount(totals.receiptAmount)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                  {formatLedgerBalance(totals.ledgerBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
