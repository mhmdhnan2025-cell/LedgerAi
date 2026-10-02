import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Building2,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
  ChevronDown,
  X,
  Receipt,
  FileText,
  DollarSign,
  Layers,
  TrendingUp,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { CompanyProfile, Product, PurchaseBill, Supplier, UserRole } from '../types';
import { api } from '../services/api';
import { SalesReportSection } from './SalesReportSection';
import { ComprehensiveProfitReportSection } from './ComprehensiveProfitReportSection';
import { StockHistoryLedgerSection } from './StockHistoryLedgerSection';
import { CustomerReceivablesReportSection } from './CustomerReceivablesReportSection';
import { AiLedgerAuditReportSection } from './AiLedgerAuditReportSection';
import { PurchaseBillVoucherModal } from './PurchaseBillVoucherModal';

interface ReportsViewProps {
  suppliers: Supplier[];
  products?: Product[];
  companyProfile?: CompanyProfile | null;
  currentRole: UserRole;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  suppliers,
  products = [],
  companyProfile,
  currentRole,
  onRefreshData,
  onNavigateTab,
}) => {
  // Breadcrumb / Report sub-tabs
  const [activeReportTab, setActiveReportTab] = useState<
    'purchases' | 'sales' | 'profit' | 'stockHistory' | 'aiLedgerAudit'
  >('purchases');

  // Filter States (matching Image 3 & 4)
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [billNumberFilter, setBillNumberFilter] = useState<string>('');
  const [vendorBillFilter, setVendorBillFilter] = useState<string>('');
  const [gatePassFilter, setGatePassFilter] = useState<string>('');
  const [reportType, setReportType] = useState<string>('Purchases');
  const [whTaxFilter, setWhTaxFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unregistered' | 'registered'>('all');

  // Account Dropdown live search state (Image 4)
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Data & Loading
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Bill for Details Modal
  const [activeBillDetail, setActiveBillDetail] = useState<PurchaseBill | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch bills on mount and when filters change
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getPurchases({
        supplierId: selectedAccountId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: billNumberFilter || vendorBillFilter || gatePassFilter || undefined,
      });

      let filtered = data || [];

      // Filter by specific bill# if provided
      if (billNumberFilter.trim()) {
        const q = billNumberFilter.trim().toLowerCase();
        filtered = filtered.filter((b) => b.billNumber.toLowerCase().includes(q));
      }

      // Filter by V.Bill# if provided
      if (vendorBillFilter.trim()) {
        const q = vendorBillFilter.trim().toLowerCase();
        filtered = filtered.filter((b) => (b.vendorBillNumber || '').toLowerCase().includes(q));
      }

      // Filter by GP# if provided
      if (gatePassFilter.trim()) {
        const q = gatePassFilter.trim().toLowerCase();
        filtered = filtered.filter((b) => (b.gatePassNumber || '').toLowerCase().includes(q));
      }

      // Filter by specific supplier / account if selected
      if (selectedAccountId) {
        filtered = filtered.filter((b) => b.supplierId === selectedAccountId);
      }

      setBills(filtered);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load purchase report data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (bills.length === 0) {
      alert('No purchase bills to export.');
      return;
    }

    const headers = [
      'BILL#',
      'V.BILL#',
      'GP#',
      'DATE',
      'SUPPLIER/ACCOUNT',
      'CARTONS',
      'QTY',
      'GROSS AMOUNT',
      'DISCOUNT',
      'VAT AMOUNT',
      'NET AMOUNT',
      'PAID AMOUNT',
      'BALANCE',
    ];

    const rows = bills.map((b) => [
      `"${b.billNumber}"`,
      `"${b.vendorBillNumber || ''}"`,
      `"${b.gatePassNumber || ''}"`,
      `"${b.date}"`,
      `"${(b.supplierAccountTitle || '').replace(/"/g, '""')}"`,
      b.totalCtn ?? 0,
      b.totalQty ?? 0,
      b.grossAmount ?? 0,
      b.totalDiscount ?? 0,
      b.totalVatAmount ?? 0,
      b.netTotal ?? 0,
      b.paidAmount ?? 0,
      b.remainingBalance ?? 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Filtered suppliers for searchable dropdown (Image 4)
  const filteredSuppliers = suppliers.filter((s) => {
    if (!accountSearchQuery.trim()) return true;
    const q = accountSearchQuery.toLowerCase();
    const title = (s.accountTitle || s.title || '').toLowerCase();
    const code = (s.accountNumber || s.id || '').toLowerCase();
    return title.includes(q) || code.includes(q);
  });

  const selectedSupplierObj = suppliers.find((s) => s.id === selectedAccountId);

  // Totals for the current filtered list
  const totalCartons = bills.reduce((sum, b) => sum + (Number(b.totalCtn) || 0), 0);
  const totalQuantity = bills.reduce((sum, b) => sum + (Number(b.totalQty) || 0), 0);
  const totalAmountSum = bills.reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);
  const totalPaidSum = bills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
  const totalPayablesSum = bills.reduce(
    (sum, b) =>
      sum +
      (Number(
        b.remainingBalance !== undefined
          ? b.remainingBalance
          : Math.max(0, (b.netTotal || 0) - (b.paidAmount || 0))
      ) || 0),
    0
  );

  const companyDisplayName =
    companyProfile?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';

  return (
    <div className="space-y-5">
      {/* Top Header Breadcrumb & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <FileText className="w-4 h-4 text-indigo-400" />
              Reports
            </span>
            <span className="mx-2 text-slate-600">/</span>
          </div>

          {/* Sub-tabs: Purchase, Sale, Profit Reports, Stock History */}
          <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveReportTab('purchases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'purchases'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Purchase Report</span>
              <span className="ml-1 px-1.5 py-0.2 bg-black/40 rounded text-[10px]">{bills.length}</span>
            </button>
            <button
              onClick={() => setActiveReportTab('sales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'sales'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Sale Report</span>
            </button>
            <button
              onClick={() => setActiveReportTab('profit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'profit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
              <span>Profit Intelligence (نفع کی رپورٹ)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('stockHistory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'stockHistory'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-indigo-300" />
              <span>Stock Movement History (اسٹاک کھاتہ)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('aiLedgerAudit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'aiLedgerAudit'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="AI Ledger Master Business Audit Report (One Page A4)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Master Audit Report (ماسٹر آڈٹ)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateTab && activeReportTab !== 'aiLedgerAudit' && (
            <button
              onClick={() => onNavigateTab(activeReportTab === 'purchases' ? 'purchasing' : 'sales')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeReportTab === 'purchases' ? '+ New Purchase Bill' : '+ New Sale Bill'}</span>
            </button>
          )}
          {activeReportTab === 'purchases' && (
            <button
              onClick={loadReportData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex items-center justify-between">
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
        <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeReportTab === 'sales' ? (
        <SalesReportSection
          companyProfile={companyProfile}
          currentRole={currentRole}
          onRefreshData={onRefreshData}
          onNavigateTab={onNavigateTab}
        />
      ) : activeReportTab === 'profit' ? (
        <ComprehensiveProfitReportSection
          onRefreshData={onRefreshData}
          onNavigateTab={onNavigateTab}
        />
      ) : activeReportTab === 'stockHistory' ? (
        <StockHistoryLedgerSection
          products={products}
          onRefreshData={onRefreshData}
          onNavigateTab={onNavigateTab}
        />
      ) : activeReportTab === 'aiLedgerAudit' ? (
        <AiLedgerAuditReportSection
          companyProfile={companyProfile}
          currentRole={currentRole}
          onRefreshData={onRefreshData}
        />
      ) : (
        <>
          {/* Filter Bar (Exact Match with Image 3 & Image 4) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Account Dropdown with Live Search (Image 4) */}
          <div className="relative" ref={accountDropdownRef}>
            <label className="block text-slate-300 font-semibold mb-1">Account</label>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-left text-xs text-white flex items-center justify-between hover:border-slate-600 focus:outline-none focus:border-sky-500"
            >
              <span className="truncate">
                {selectedSupplierObj
                  ? `${selectedSupplierObj.accountTitle || selectedSupplierObj.title}`
                  : 'Nothing selected'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
            </button>

            {/* Dropdown Menu (Image 4) */}
            {isAccountDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-2 border-b border-slate-800 bg-slate-950">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search account title or code..."
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-2 py-1 text-white text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  <div
                    onClick={() => {
                      setSelectedAccountId('');
                      setIsAccountDropdownOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-sky-900/30 transition text-slate-300 ${
                      selectedAccountId === '' ? 'bg-sky-950/60 text-sky-300 font-bold' : ''
                    }`}
                  >
                    Nothing selected (All Accounts)
                  </div>
                  {filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedAccountId(s.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-sky-900/30 transition flex justify-between items-center ${
                        selectedAccountId === s.id ? 'bg-sky-950/60 text-sky-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate">
                        {s.accountTitle || s.title} {s.accountNumber ? `(${s.accountNumber})` : ''}
                      </span>
                      {s.payableToSupplier !== undefined && (
                        <span className="text-[10px] text-emerald-400 ml-2 font-mono shrink-0">
                          Bal: {s.payableToSupplier}
                        </span>
                      )}
                    </div>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <div className="px-3 py-4 text-center text-slate-500 text-xs">
                      No accounts found matching search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">User</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="">Nothing selected</option>
              <option value="Admin">Admin</option>
              <option value="Aman Deep">Aman Deep</option>
              <option value="User .">User .</option>
            </select>
          </div>

          {/* Bill# Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Bill#</label>
            <input
              type="text"
              placeholder="e.g. 1435"
              value={billNumberFilter}
              onChange={(e) => setBillNumberFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* V.Bill# Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">V.Bill#</label>
            <input
              type="text"
              placeholder="Vendor Bill#"
              value={vendorBillFilter}
              onChange={(e) => setVendorBillFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs items-center pt-1 border-t border-slate-800/80">
          {/* GatePass# Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">GatePass#</label>
            <input
              type="text"
              placeholder="Gate Pass#"
              value={gatePassFilter}
              onChange={(e) => setGatePassFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="Purchases">Purchases</option>
              <option value="Returns">Returns</option>
              <option value="Detailed Item-wise">Detailed Item-wise</option>
            </select>
          </div>

          {/* WH.Tax & Status Radio Options */}
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">WH.Tax:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="whtax"
                  checked={whTaxFilter === 'all'}
                  onChange={() => setWhTaxFilter('all')}
                  className="accent-sky-500"
                />
                <span>All</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="whtax"
                  checked={whTaxFilter === 'yes'}
                  onChange={() => setWhTaxFilter('yes')}
                  className="accent-sky-500"
                />
                <span>YES</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Status:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={statusFilter === 'all'}
                  onChange={() => setStatusFilter('all')}
                  className="accent-sky-500"
                />
                <span>All</span>
              </label>
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={loadReportData}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs shadow-md shadow-sky-600/30 transition flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report View Header Actions (Excel Download & Print buttons matching Image 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div>
            <span className="text-xs font-bold text-slate-300">
              Total Records Found: <strong className="text-sky-400">{bills.length}</strong> Bills
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
              title="Download Purchase Report in Excel / CSV format"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
              title="Print formatted Purchase Report"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Printable Report Header (Image 3) */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-900/80">
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide uppercase">
            {companyDisplayName}
          </h2>
          <div className="text-sm font-bold text-sky-400 mt-1">Purchase Details &amp; Supplier Payables Report</div>
          <div className="text-xs text-slate-400 mt-0.5">
            From {fromDate} To {toDate}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Report Generated On: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Purchase Report KPI Summary Cards (User mandate: "purchase report main total amount ajati payables nai ati. is ki b report detailes honi chhye") */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 border-b border-slate-800">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Purchases</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
              ${currencySymbol()} {totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{bills.length} Bills Total</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid to Suppliers</span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-400">
              ${currencySymbol()} {totalPaidSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Cash / Bank Disbursements</span>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-xl p-3">
            <span className="text-[10px] text-amber-300 font-bold uppercase block flex items-center justify-between">
              <span>Total Payables Remaining</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">واجب الادا</span>
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-400">
              ${currencySymbol()} {totalPayablesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-amber-400/80 block mt-0.5 font-semibold">Balance owed to vendors</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Stock Volume</span>
            <span className="text-base sm:text-lg font-black font-mono text-indigo-300">
              {totalCartons.toFixed(1)} <span className="text-xs font-normal text-slate-400">CTN</span> &bull; {totalQuantity} <span className="text-xs font-normal text-slate-400">Qty</span>
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Physical inventory volume</span>
          </div>
        </div>

        {/* Report Table (Exact Columns as Image 3 with Paid & Payables Breakdown) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">BILL#</th>
                <th className="py-3 px-3">V.BILL#</th>
                <th className="py-3 px-3">GP#</th>
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-3">SUPPLIER</th>
                <th className="py-3 px-3 text-right">CARTONS</th>
                <th className="py-3 px-3 text-right">QTY</th>
                <th className="py-3 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-3 px-3 text-right text-sky-400">PAID</th>
                <th className="py-3 px-3 text-right text-amber-400">PAYABLES (واجب الادا)</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    No purchase records found matching selected criteria.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const billPaid = Number(bill.paidAmount) || 0;
                  const billTotal = Number(bill.netTotal) || 0;
                  const billPayable = bill.remainingBalance !== undefined
                    ? Number(bill.remainingBalance)
                    : Math.max(0, billTotal - billPaid);
                  const isPaid = billPayable === 0;
                  const isPartial = billPaid > 0 && billPayable > 0;

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                      onClick={() => setActiveBillDetail(bill)}
                    >
                      <td className="py-2.5 px-3 font-bold text-white group-hover:text-sky-400 font-mono">
                        {bill.billNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {bill.vendorBillNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {bill.gatePassNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">
                        {bill.date}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">
                        {bill.supplierAccountTitle || 'Local Supplier'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                        {(Number(bill.totalCtn) || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                        {bill.totalQty ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {currencySymbol()} {billTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-sky-400">
                        {currencySymbol()} {billPaid.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={billPayable > 0 ? 'text-amber-400' : 'text-slate-500'}>
                          {currencySymbol()} {billPayable.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            isPaid
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isPartial
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveBillDetail(bill)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-bold shadow transition inline-flex items-center gap-1 cursor-pointer"
                          title="View Bill Voucher & Items Breakdown"
                        >
                          <span>≡</span>
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Summary Footer */}
            {bills.length > 0 && (
              <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-white text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider text-slate-400">
                    Grand Total:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sky-300">
                    {totalCartons.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sky-300">
                    {totalQuantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                    ${currencySymbol()} {totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sky-400 text-sm">
                    ${currencySymbol()} {totalPaidSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-amber-400 text-sm">
                    ${currencySymbol()} {totalPayablesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* DETAILED BILL MODAL */}
      <PurchaseBillVoucherModal
        bill={activeBillDetail}
        companyProfile={companyProfile}
        onClose={() => setActiveBillDetail(null)}
      />
        </>
      )}
    </div>
  );
};
