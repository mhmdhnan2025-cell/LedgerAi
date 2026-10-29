import React, { useState, useMemo, useCallback } from 'react';
import { Search, Printer, FileSpreadsheet, RefreshCw, Building2, BookOpen, Filter } from 'lucide-react';
import { Supplier, CompanyProfile } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface SupplierPayablesReportSectionProps {
  companyProfile?: CompanyProfile | null;
  suppliers?: Supplier[];
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface PartyPayableRow {
  id: string;
  sNo: number;
  srNo?: number;
  accountTitle: string;
  pdfTitle: string;
  code: string;
  lastBillNumber: string;
  lastBillDate: string;
  lastBillAmount: number;
  lastPaymentDate: string;
  paymentAmount: number;
  ledgerBalance: number;
  ledgerBalanceType: string;
  postDatedPayments: number;
  postDatedReceipts: number;
  adjustedLedgerBalance: number;
  adjustedLedgerBalanceType: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '-' || dateStr === '0') return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split('T')[0].split('-');
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed.replace(/\//g, '-');
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
  return trimmed;
};

const money = (n?: number) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayDDMMYYYY = () => {
  const d = new Date();
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

export const SupplierPayablesReportSection: React.FC<SupplierPayablesReportSectionProps> = ({
  companyProfile,
  suppliers,
  onRefreshData,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allRows: PartyPayableRow[] = useMemo(() => {
    const list = (suppliers || [])
      .map((s) => {
        const balance = Number(s.payableToSupplier) || 0;
        const order = Number(s.srNo ?? s.sNo ?? s.pdfOrder) || 0;
        return {
          id: s.id,
          sNo: order,
          srNo: s.srNo,
          accountTitle: (s.accountTitle || s.title || s.name || '').trim(),
          pdfTitle: s.pdfTitle || '',
          code: s.code || '',
          lastBillNumber: s.lastBillNumber || '',
          lastBillDate: formatDateDDMMYYYY(s.lastBillDate),
          lastBillAmount: Number(s.lastBillAmount) || 0,
          lastPaymentDate: formatDateDDMMYYYY(s.lastPaymentDate),
          paymentAmount: Number(s.lastPaymentAmount) || 0,
          ledgerBalance: balance,
          ledgerBalanceType: s.payableType || 'CR',
          postDatedPayments: Number(s.postDatedPayments) || 0,
          postDatedReceipts: Number(s.postDatedReceipts) || 0,
          adjustedLedgerBalance:
            s.adjustedLedgerBalance !== undefined && s.adjustedLedgerBalance !== null
              ? Number(s.adjustedLedgerBalance)
              : balance,
          adjustedLedgerBalanceType: s.adjustedLedgerBalanceType || s.payableType || 'CR',
        } as PartyPayableRow;
      })
      .filter((r) => showZeroBalance || Math.abs(r.ledgerBalance) > 0.001);
    list.sort((a, b) => {
      if (a.sNo && b.sNo) return a.sNo - b.sNo;
      return a.accountTitle.localeCompare(b.accountTitle);
    });
    return list;
  }, [suppliers, showZeroBalance]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.accountTitle.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        String(r.sNo) === q ||
        r.lastBillNumber.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const totals = useMemo(() => {
    let balance = 0;
    let payment = 0;
    let postDated = 0;
    let adjusted = 0;
    for (const r of rows) {
      balance += r.ledgerBalanceType === 'DR' ? -r.ledgerBalance : r.ledgerBalance;
      payment += r.paymentAmount;
      postDated += r.postDatedPayments;
      adjusted += r.adjustedLedgerBalanceType === 'DR' ? -r.adjustedLedgerBalance : r.adjustedLedgerBalance;
    }
    return {
      balance: Math.round(balance * 100) / 100,
      payment: Math.round(payment * 100) / 100,
      postDated: Math.round(postDated * 100) / 100,
      adjusted: Math.round(adjusted * 100) / 100,
    };
  }, [rows]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (onRefreshData) onRefreshData();
    window.setTimeout(() => setRefreshing(false), 600);
  }, [onRefreshData]);

  const handleExport = useCallback(() => {
    exportToCsv(`party-payables-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      { header: 'S.NO', accessor: (r: PartyPayableRow) => r.sNo },
      { header: 'ACCOUNT', accessor: (r: PartyPayableRow) => r.accountTitle },
      { header: 'LAST BILL#', accessor: (r: PartyPayableRow) => r.lastBillNumber },
      { header: 'LAST BILL DATE', accessor: (r: PartyPayableRow) => r.lastBillDate },
      { header: 'LAST BILL AMOUNT', accessor: (r: PartyPayableRow) => r.lastBillAmount },
      { header: 'LAST PAYMENT DATE', accessor: (r: PartyPayableRow) => r.lastPaymentDate },
      { header: 'PAYMENT AMOUNT', accessor: (r: PartyPayableRow) => r.paymentAmount },
      {
        header: 'LEDGER BALANCE',
        accessor: (r: PartyPayableRow) => `${money(r.ledgerBalance)} ${r.ledgerBalanceType}`,
      },
      { header: 'POST DATED PAYMENTS', accessor: (r: PartyPayableRow) => r.postDatedPayments },
      { header: 'POST DATED RECEIPTS', accessor: (r: PartyPayableRow) => r.postDatedReceipts },
      {
        header: 'ADJUSTED LEDGER BAL.',
        accessor: (r: PartyPayableRow) => `${money(r.adjustedLedgerBalance)} ${r.adjustedLedgerBalanceType}`,
      },
    ]);
  }, [rows]);

  const handlePrint = useCallback(() => {
    printCleanDocument('party-payables-printable', `Party_Payables_Report_${todayDDMMYYYY()}`);
  }, []);

  const handleSavePdf = useCallback(() => {
    printCleanDocument('party-payables-printable', `Party_Payables_Report_${todayDDMMYYYY()}`);
  }, []);

  const columns = [
    { label: 'S.No', width: 'w-12' },
    { label: 'Account', width: 'min-w-[190px]' },
    { label: 'Last Bill #', width: 'w-24' },
    { label: 'Last Bill Dated', width: 'w-28' },
    { label: 'Last Bill Amount', width: 'w-28' },
    { label: 'Last Payment Date', width: 'w-28' },
    { label: 'Payment Amount', width: 'w-28' },
    { label: 'Ledger Balance', width: 'w-32' },
    { label: 'PostDated Payments', width: 'w-28' },
    { label: 'PostDated Receipts', width: 'w-28' },
    { label: 'Adjusted Ledger Bal.', width: 'w-32' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier, code or bill #..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowZeroBalance((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                showZeroBalance
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Show suppliers with zero balance as well"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showZeroBalance ? 'Showing all' : 'Balance only'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleSavePdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer"
              title="Save Party Payables as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('supplierLedger')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                <span>Supplier Ledger</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report */}
      <div id="party-payables-printable" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 w-full">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Party Payables Report</h2>
              <p className="text-xs text-slate-500">
                {companyProfile?.name || 'Company'} &middot; Date: {todayDDMMYYYY()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Suppliers</div>
            <div className="text-xl font-extrabold text-slate-900">{rows.length}</div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto scroll-smooth">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
              <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                {columns.map((c) => (
                  <th
                    key={c.label}
                    className={`px-2.5 py-2.5 font-bold border-b border-slate-200 ${c.width} ${
                      c.label === 'S.No' ? 'text-left' : ['Account', 'Last Bill #'].includes(c.label) ? 'text-left' : 'text-right'
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2.5 py-2 text-slate-700 font-semibold">{r.sNo}</td>
                  <td className="px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 capitalize">{r.accountTitle}</div>
                        <div className="text-[11px] text-slate-400">{r.code}</div>
                      </div>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('erp_selected_supplier_ledger_id', r.id);
                            onNavigateTab('supplierLedger');
                          }}
                          className="print:hidden shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold transition cursor-pointer"
                          title="View complete supplier ledger"
                        >
                          <BookOpen className="w-3 h-3 text-purple-600" />
                          <span>Ledger ↗</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 text-left">{r.lastBillNumber || '-'}</td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">{r.lastBillDate || '-'}</td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">
                    {r.lastBillAmount ? money(r.lastBillAmount) : '-'}
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">{r.lastPaymentDate || '-'}</td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">{money(r.paymentAmount)}</td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-900">
                    {money(r.ledgerBalance)} <span className="text-[11px] text-slate-500">{r.ledgerBalanceType}</span>
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">{money(r.postDatedPayments)}</td>
                  <td className="px-2.5 py-2 text-slate-700 text-right">{money(r.postDatedReceipts)}</td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-900">
                    {money(r.adjustedLedgerBalance)}{' '}
                    <span className="text-[11px] text-slate-500">{r.adjustedLedgerBalanceType}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-400">
                    No payable suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white text-xs font-bold">
                <td className="px-2.5 py-2.5" colSpan={4}>
                  TOTAL ({rows.length} suppliers)
                </td>
                <td className="px-2.5 py-2.5 text-right">-</td>
                <td className="px-2.5 py-2.5 text-right">-</td>
                <td className="px-2.5 py-2.5 text-right">{money(totals.payment)}</td>
                <td className="px-2.5 py-2.5 text-right">{money(totals.balance)} CR</td>
                <td className="px-2.5 py-2.5 text-right">{money(totals.postDated)}</td>
                <td className="px-2.5 py-2.5 text-right">0.00</td>
                <td className="px-2.5 py-2.5 text-right">{money(totals.adjusted)} CR</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            Showing <b className="text-slate-700">{rows.length}</b> of{' '}
            <b className="text-slate-700">{allRows.length}</b> payable suppliers
          </span>
          <span>
            Ledger Balance Total: <b className="text-slate-900">{money(totals.balance)} CR</b>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupplierPayablesReportSection;
