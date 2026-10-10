import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Building2,
  Filter,
  RefreshCw,
  X,
  FileText,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Customer, CustomerLedgerReport, CustomerLedgerEntry, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface CustomerLedgerReportSectionProps {
  companyProfile?: CompanyProfile | null;
  initialCustomerId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const CustomerLedgerReportSection: React.FC<CustomerLedgerReportSectionProps> = ({
  companyProfile,
  initialCustomerId,
  onNavigateTab,
}) => {
  // Filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isAudit, setIsAudit] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  
  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Report Data & Loading
  const [report, setReport] = useState<CustomerLedgerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Customers list
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const list = await api.getCustomers();
        if (Array.isArray(list)) {
          setCustomers(list);
          if (initialCustomerId) {
            const found = list.find(
              (c) => c.id === initialCustomerId || c.code === initialCustomerId || c.accountCode === initialCustomerId
            );
            if (found) {
              setSelectedCustomer(found);
              setCustomerSearch(`${found.code || found.accountCode || ''} - ${found.accountTitle || found.name}`);
            }
          } else if (list.length > 0 && !selectedCustomer) {
            setSelectedCustomer(list[0]);
            setCustomerSearch(`${list[0].code || list[0].accountCode || ''} - ${list[0].accountTitle || list[0].name}`);
          }
        }
      } catch (err) {
        console.warn('Failed to load customers for ledger report:', err);
      }
    };
    fetchCustomers();
  }, [initialCustomerId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedCustomer) {
      setErrorMsg('Please select a customer account first.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getCustomerLedgerReport({
        customerId: selectedCustomer.id || selectedCustomer.code || '',
        fromDate,
        toDate,
        poNumber: poNumber.trim() || undefined,
      });
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate Customer General Ledger');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate when customer is set first time
  useEffect(() => {
    if (selectedCustomer && !report) {
      handleGenerateReport();
    }
  }, [selectedCustomer]);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.accountCode && c.accountCode.toLowerCase().includes(q)) ||
      (c.accountTitle && c.accountTitle.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q))
    );
  });

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(`${c.code || c.accountCode || ''} - ${c.accountTitle || c.name}`);
    setIsDropdownOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['REF', 'REF#', 'DATE', 'BILL#', 'NARRATION', 'DEBIT', 'CREDIT', 'BALANCE', 'TYPE'];
    const rows: string[][] = [];

    // Opening Balance
    rows.push([
      'OB',
      '-',
      report.fromDate,
      '-',
      'Opening Balance',
      '-',
      '-',
      String(report.openingBalance),
      report.openingBalanceType,
    ]);

    // Entries
    for (const e of report.entries) {
      rows.push([
        e.refType,
        String(e.refNumber || ''),
        e.date,
        e.billNumber || '',
        `"${(e.narration || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        e.debit > 0 ? String(e.debit) : '-',
        e.credit > 0 ? String(e.credit) : '-',
        String(e.balance),
        e.balanceType,
      ]);
    }

    // Totals
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      'Closing Balance',
      String(report.totalDebit),
      String(report.totalCredit),
      String(report.closingBalance),
      report.closingBalanceType,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Customer_Ledger_${selectedCustomer?.code || 'report'}_${report.fromDate}_to_${report.toDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNumber = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateDisplay = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Controls Bar (Replicates user screenshot filter strip) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Audit Checkbox */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setIsAudit(!isAudit)}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
            >
              {isAudit ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span className="font-semibold">Audit (آڈٹ)</span>
            </button>
          </div>

          {/* Account Title Dropdown (Code - Title) */}
          <div className="relative lg:col-span-2" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Account Title (گاہک کا کھاتہ)
            </label>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-slate-600"
            >
              <span className="truncate">
                {selectedCustomer
                  ? `${selectedCustomer.code || selectedCustomer.accountCode || ''} - ${selectedCustomer.accountTitle || selectedCustomer.name}`
                  : 'Select Account...'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-700">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search code or customer name..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 pl-8 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-52 divide-y divide-slate-700/50">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No customer accounts found</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-2.5 text-xs hover:bg-slate-700 cursor-pointer flex items-center justify-between transition ${
                          selectedCustomer?.id === c.id ? 'bg-sky-900/40 text-sky-200' : 'text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {c.code || c.accountCode} - {c.accountTitle || c.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{c.city || c.area || c.mobile || 'No contact'}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono">
                            {currencySymbol()} {formatNumber(c.outstandingBalance)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* P.O # Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              P.O # (آرڈر نمبر)
            </label>
            <input
              type="text"
              placeholder="PO or Bill #"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Action Buttons Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={isLoading || !selectedCustomer}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Generate (رپورٹ تیار کریں)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!report || report.entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print (پرنٹ)</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!report || report.entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-center justify-between print:hidden">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Report Canvas (Exact Match to Image 1: General Ledger Reporting) */}
      <div className="bg-white text-slate-900 rounded-xl shadow-xl p-6 sm:p-8 font-sans border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Header (Branded Company Header) */}
        <div className="text-center pb-4 border-b border-slate-300">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
            {companyProfile?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C'}
          </h1>
          <div className="text-xs text-slate-600 mt-1 space-x-2">
            <span>{companyProfile?.address || 'Industrial Area 10, Sharjah, United Arab Emirates'}</span>
            <span>•</span>
            <span>Tel: {companyProfile?.phone || '+971 6 534 8921'}</span>
            <span>•</span>
            <span>Email: info@zahratfoodstuff.com</span>
          </div>
          <div className="inline-block mt-3 px-4 py-1 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest">
            General Ledger Reporting
          </div>
        </div>

        {/* Customer & Date Metadata Bar (Exact layout from Image 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 my-2 border-b border-slate-300 text-xs">
          <div className="space-y-1">
            <div className="font-extrabold text-sm text-slate-950">
              {report?.accountTitle || selectedCustomer?.accountTitle || 'Customer Name'}
              <span className="text-slate-500 font-normal ml-1">
                ({report?.customerCode || selectedCustomer?.code || selectedCustomer?.accountCode || '0101040198'})
              </span>
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-700">Contact:</span>{' '}
              {report?.phone || selectedCustomer?.mobile || selectedCustomer?.telephones || 'N/A'}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-700">Address:</span>{' '}
              {report?.address || selectedCustomer?.address || 'Sharjah, UAE'}
            </div>
          </div>

          <div className="sm:text-right space-y-1 self-center">
            <div className="font-extrabold text-slate-900">
              <span className="text-slate-600 font-semibold">Ledger From:</span>{' '}
              {formatDateDisplay(report?.fromDate || fromDate)}{' '}
              <span className="text-slate-600 font-semibold">TO</span>{' '}
              {formatDateDisplay(report?.toDate || toDate)}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold">Report Generated Date:</span>{' '}
              {new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
        </div>

        {/* General Ledger Table (Exact Match to Columns from Image 1) */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-100 font-extrabold text-slate-900 uppercase">
                <th className="py-2 px-2 text-center w-12">REF</th>
                <th className="py-2 px-2 text-center w-16">[REF#]</th>
                <th className="py-2 px-2.5 w-24">DATE</th>
                <th className="py-2 px-2 w-20">BILL#</th>
                <th className="py-2 px-3">NARRATION</th>
                <th className="py-2 px-3 text-right w-24">DEBIT</th>
                <th className="py-2 px-3 text-right w-24">CREDIT</th>
                <th className="py-2 px-3 text-right w-28">BALANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {/* Row 1: Opening Balance Row */}
              <tr className="bg-slate-50/70 font-semibold text-slate-900">
                <td className="py-2 px-2 text-center">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">OB</span>
                </td>
                <td className="py-2 px-2 text-center text-slate-400">-</td>
                <td className="py-2 px-2.5 text-slate-700">{formatDateDisplay(report?.fromDate || fromDate)}</td>
                <td className="py-2 px-2 text-slate-400">-</td>
                <td className="py-2 px-3 font-sans font-bold text-slate-950">Opening Balance</td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right font-bold text-slate-950">
                  {formatNumber(report?.openingBalance || 0)} {report?.openingBalanceType || 'DR'}
                </td>
              </tr>

              {/* Transaction Rows */}
              {!report || report.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans text-xs">
                    {isLoading ? 'Generating general ledger report...' : 'No transactions recorded within selected date range.'}
                  </td>
                </tr>
              ) : (
                report.entries.map((entry, idx) => {
                  const isDebit = entry.debit > 0;
                  const isCredit = entry.credit > 0;

                  return (
                    <tr
                      key={entry.id || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                    >
                      {/* REF Badge */}
                      <td className="py-2 px-2 text-center align-top">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                            entry.refType === 'SV#'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : entry.refType === 'CR#'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : entry.refType === 'BR#'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : entry.refType === 'SR#'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : entry.refType === 'JV#'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {entry.refType}
                        </span>
                      </td>

                      {/* [REF#] */}
                      <td className="py-2 px-2 text-center text-slate-700 align-top font-semibold">
                        {entry.refNumber || '-'}
                      </td>

                      {/* DATE */}
                      <td className="py-2 px-2.5 text-slate-700 align-top whitespace-nowrap">
                        {formatDateDisplay(entry.date)}
                      </td>

                      {/* BILL# */}
                      <td className="py-2 px-2 text-slate-700 align-top font-semibold whitespace-nowrap">
                        {entry.billNumber || '-'}
                      </td>

                      {/* NARRATION (Pre-wrap line item breakdown) */}
                      <td className="py-2 px-3 font-sans text-slate-900 align-top whitespace-pre-line leading-relaxed text-[11px]">
                        {entry.narration}
                      </td>

                      {/* DEBIT */}
                      <td
                        className={`py-2 px-3 text-right align-top font-bold ${
                          isDebit ? 'text-slate-950' : 'text-slate-300'
                        }`}
                      >
                        {isDebit ? formatNumber(entry.debit) : '-'}
                      </td>

                      {/* CREDIT */}
                      <td
                        className={`py-2 px-3 text-right align-top font-bold ${
                          isCredit ? 'text-emerald-700' : 'text-slate-300'
                        }`}
                      >
                        {isCredit ? formatNumber(entry.credit) : '-'}
                      </td>

                      {/* BALANCE */}
                      <td className="py-2 px-3 text-right align-top font-extrabold text-slate-950 whitespace-nowrap">
                        {formatNumber(entry.balance)}{' '}
                        <span
                          className={`text-[10px] font-bold ${
                            entry.balanceType === 'DR' ? 'text-blue-700' : 'text-emerald-700'
                          }`}
                        >
                          {entry.balanceType}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary (Exact Match to Image 1) */}
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-extrabold text-slate-950">
                <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider font-sans">
                  Total (میزان):
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                  {formatNumber(report?.totalDebit || 0)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                  {formatNumber(report?.totalCredit || 0)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">
                  {formatNumber(report?.closingBalance || 0)} {report?.closingBalanceType || 'DR'}
                </td>
              </tr>
              <tr className="border-b-2 border-slate-900 bg-slate-200/80 font-black text-slate-950">
                <td colSpan={5} className="py-2 px-3 text-right uppercase tracking-wider font-sans text-xs">
                  Closing Balance (آخری بقایا رقم):
                </td>
                <td colSpan={3} className="py-2 px-3 text-right font-mono text-xs text-slate-950">
                  {currencySymbol()} {formatNumber(report?.closingBalance || 0)}{' '}
                  <span className={report?.closingBalanceType === 'DR' ? 'text-blue-800' : 'text-emerald-800'}>
                    {report?.closingBalanceType === 'DR' ? 'DEBIT (DR - وصول طلب)' : 'CREDIT (CR - واجب الاداء)'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Signatures Footer (For Print) */}
        <div className="hidden print:grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-slate-300 text-center text-xs text-slate-700">
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">Prepared By</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">Checked By / Audit</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">Customer Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};
