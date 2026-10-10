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
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Report Data & Loading
  const [report, setReport] = useState<CustomerLedgerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete transaction modal
  const [confirmEntry, setConfirmEntry] = useState<CustomerLedgerEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEntry = async () => {
    if (!confirmEntry) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await api.deleteCustomerLedgerEntry({
        id: confirmEntry.id,
        entityId: confirmEntry.entityId,
        entityType: confirmEntry.entityType,
        refType: confirmEntry.refType,
        refNumber: confirmEntry.refNumber,
      });
      setSuccessMsg(`Transaction "${confirmEntry.refType} #${confirmEntry.refNumber}" deleted successfully. Ledgers recalculated.`);
      setConfirmEntry(null);
      await handleGenerateReport(selectedCustomer || undefined);
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete ledger transaction');
    } finally {
      setIsDeleting(false);
    }
  };

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
              setCustomerSearch('');
              handleGenerateReport(found);
              return;
            }
          }
          // Default to Nothing selected / All accounts so all transactions show immediately
          setSelectedCustomer(null);
          handleGenerateReport(null);
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

  const handleGenerateReport = async (overrideCustomer?: Customer | null) => {
    const targetCust = overrideCustomer !== undefined ? overrideCustomer : selectedCustomer;
    const customerIdParam =
      !targetCust || targetCust.id === 'ALL' || targetCust.code === 'ALL'
        ? 'ALL'
        : (targetCust.id || targetCust.code || '');

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getCustomerLedgerReport({
        customerId: customerIdParam,
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

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    const code = (c.code || c.accountCode || '').toLowerCase();
    const name = (c.accountTitle || c.name || '').toLowerCase();
    const mobile = (c.mobile || '').toLowerCase();
    const city = (c.city || c.area || '').toLowerCase();
    const full = `${code} - ${name} ${mobile} ${city}`.toLowerCase();

    if (full.includes(q) || code.includes(q) || name.includes(q)) return true;

    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => full.includes(token));
  });

  // Focus and sync highlighted index when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);

      const idx = filteredCustomers.findIndex((c) => c.id === selectedCustomer?.id);
      if (idx >= 0) {
        setHighlightedIndex(idx);
        setTimeout(() => {
          itemRefs.current[idx]?.scrollIntoView({ block: 'nearest' });
        }, 80);
      } else {
        setHighlightedIndex(0);
      }
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [customerSearch]);

  const handleSelectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setIsDropdownOpen(false);
    handleGenerateReport(c);
  };

  const handleToggleDropdown = () => {
    setIsDropdownOpen((prev) => {
      if (!prev) {
        setCustomerSearch('');
      }
      return !prev;
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredCustomers.length - 1 ? prev + 1 : 0;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : Math.max(filteredCustomers.length - 1, 0);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        handleSelectCustomer(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
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
              onClick={handleToggleDropdown}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-slate-600 transition"
            >
              <span className={`truncate ${selectedCustomer ? 'text-white font-semibold' : 'text-sky-300 font-bold'}`}>
                {selectedCustomer
                  ? `${selectedCustomer.code || selectedCustomer.accountCode || ''} - ${selectedCustomer.accountTitle || selectedCustomer.name}`
                  : 'All Accounts / Nothing Selected (تمام کسٹمرز / تمام کھاتے)'}
              </span>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCustomer(null);
                    }}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-slate-700 transition"
                    title="Clear account (Show All Customers)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-72 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-700 bg-slate-850">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search code or customer name... (↓ / ↑ navigate)"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearch('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-56 divide-y divide-slate-700/50">
                  {/* Option 0: Nothing Selected / All Accounts */}
                  <div
                    onClick={() => handleSelectCustomer(null)}
                    className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition border-b border-slate-700/80 ${
                      selectedCustomer === null
                        ? 'bg-sky-500/20 text-sky-200 font-bold border-l-4 border-l-sky-500'
                        : 'text-slate-200 hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold text-sm">★</span>
                      <div>
                        <div className="font-bold text-white">All Accounts / Nothing Selected (تمام کھاتے)</div>
                        <div className="text-[11px] text-slate-400">تمام کسٹمرز کا مشترکہ لیجر اور تمام ٹرانزیکشنز ڈیلیٹ آپشنز کے ساتھ</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                      ALL
                    </span>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      No customer accounts found for "{customerSearch}"
                    </div>
                  ) : (
                    filteredCustomers.map((c, index) => {
                      const isSelected = selectedCustomer?.id === c.id;
                      const isHighlighted = highlightedIndex === index;
                      return (
                        <div
                          key={c.id}
                          ref={(el) => {
                            itemRefs.current[index] = el;
                          }}
                          onClick={() => handleSelectCustomer(c)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition ${
                            isHighlighted
                              ? 'dropdown-active-cursor'
                              : isSelected
                              ? 'dropdown-selected-item'
                              : 'text-slate-200 hover:bg-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isHighlighted && <span className="text-amber-300 font-black text-xs select-none">▶</span>}
                            <div>
                              <div className={`font-semibold ${isHighlighted ? 'font-bold text-white' : 'text-white'}`}>
                                {c.code || c.accountCode} - {c.accountTitle || c.name}
                              </div>
                              <div className={`text-[11px] ${isHighlighted ? 'text-code-highlight' : 'text-slate-400'}`}>
                                {c.city || c.area || c.mobile || 'No contact'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isHighlighted ? 'text-stock-highlight font-bold' : 'bg-slate-900 text-slate-300'
                            }`}>
                              {currencySymbol()} {formatNumber(c.outstandingBalance)}
                            </span>
                          </div>
                        </div>
                      );
                    })
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
              onClick={() => handleGenerateReport(selectedCustomer)}
              disabled={isLoading}
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
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                <th className="py-2 px-2 text-center w-12 print:hidden">ACTION</th>
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
                <td className="py-2 px-2 text-center text-slate-400 print:hidden">-</td>
              </tr>

              {/* Transaction Rows */}
              {!report || report.entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
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

                      {/* ACTION */}
                      <td className="py-2 px-2 text-center align-top print:hidden">
                        <button
                          type="button"
                          onClick={() => setConfirmEntry(entry)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-600 border border-rose-300 hover:border-rose-600 text-rose-600 hover:text-white rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition shadow-xs cursor-pointer group"
                          title={`Delete transaction ${entry.refType} #${entry.refNumber}`}
                        >
                          <Trash2 className="w-3 h-3 text-rose-600 group-hover:text-white" />
                          <span>Del</span>
                        </button>
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
                <td className="print:hidden"></td>
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
                <td className="print:hidden"></td>
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

      {/* Confirmation Modal */}
      {confirmEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Delete Customer Ledger Entry?</h4>
                <p className="text-xs text-slate-400">
                  This transaction will be permanently removed and the customer ledger and balance recalculated.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Ref Type &amp; Number:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {confirmEntry.refType} #{confirmEntry.refNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white font-semibold">{formatDateDisplay(confirmEntry.date)}</span>
              </div>
              {confirmEntry.billNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bill #:</span>
                  <span className="text-slate-300 font-mono">{confirmEntry.billNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Narration:</span>
                <span className="text-slate-300 max-w-[200px] truncate">{confirmEntry.narration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-black text-rose-400 text-sm">
                  {confirmEntry.debit > 0
                    ? `Debit: ${currencySymbol()} ${formatNumber(confirmEntry.debit)}`
                    : `Credit: ${currencySymbol()} ${formatNumber(confirmEntry.credit)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEntry(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
