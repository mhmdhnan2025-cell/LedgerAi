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
  Edit2,
  Trash2,
  RotateCcw,
  Undo2,
  BookOpen,
} from 'lucide-react';
import { CompanyProfile, Product, PurchaseBill, Supplier, UserRole } from '../types';
import { api } from '../services/api';
import { SalesReportSection } from './SalesReportSection';
import { ComprehensiveProfitReportSection } from './ComprehensiveProfitReportSection';
import { StockHistoryLedgerSection } from './StockHistoryLedgerSection';
import { CustomerReceivablesReportSection } from './CustomerReceivablesReportSection';
import { AiLedgerAuditReportSection } from './AiLedgerAuditReportSection';
import { PurchaseBillVoucherModal } from './PurchaseBillVoucherModal';
import { CashRecoveredReportSection } from './CashRecoveredReportSection';
import { CashPaidReportSection } from './CashPaidReportSection';
import { CustomerLedgerReportSection } from './CustomerLedgerReportSection';
import { SaleReturnReportSection } from './SaleReturnReportSection';
import { PurchaseReturnReportSection } from './PurchaseReturnReportSection';
import { ErrorBoundary } from './ErrorBoundary';

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
    'purchases' | 'sales' | 'profit' | 'stockHistory' | 'aiLedgerAudit' | 'cashRecovered' | 'cashPaid' | 'customerLedger' | 'saleReturns' | 'purchaseReturns'
  >(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('erp_active_report_tab');
        if (saved && ['purchases', 'sales', 'profit', 'stockHistory', 'aiLedgerAudit', 'cashRecovered', 'cashPaid', 'customerLedger', 'saleReturns', 'purchaseReturns'].includes(saved)) {
          return saved as any;
        }
      }
    } catch {}
    return 'purchases';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('erp_active_report_tab', activeReportTab);
      }
    } catch {}
  }, [activeReportTab]);

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
  const [payableFilter, setPayableFilter] = useState<'all' | 'hasPayable' | 'cleared'>('all');

  // Account Dropdown live search state (Image 4)
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Data & Loading
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Bill for Details Modal & Edit Modal
  const [activeBillDetail, setActiveBillDetail] = useState<PurchaseBill | null>(null);
  const [editingBill, setEditingBill] = useState<PurchaseBill | null>(null);

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
  }, [payableFilter]);

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

      // Filter by Total Payable / Baqaya
      if (payableFilter === 'hasPayable') {
        filtered = filtered.filter((b) => {
          const pay = b.remainingBalance !== undefined ? Number(b.remainingBalance) : Math.max(0, (Number(b.netTotal) || 0) - (Number(b.paidAmount) || 0));
          return pay > 0;
        });
      } else if (payableFilter === 'cleared') {
        filtered = filtered.filter((b) => {
          const pay = b.remainingBalance !== undefined ? Number(b.remainingBalance) : Math.max(0, (Number(b.netTotal) || 0) - (Number(b.paidAmount) || 0));
          return pay <= 0;
        });
      }

      setBills(filtered);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load purchase report data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Purchase Bill with automatic stock & ledger reversal
  const handleDeletePurchaseBill = async (billId: string, billNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Purchase Bill #${billNo}? Reversing supplier balance and stock inventory will occur automatically.`)) {
      return;
    }
    setIsLoading(true);
    try {
      await api.deletePurchase(billId, { id: 'admin', name: currentRole || 'Admin', role: currentRole || 'Admin' });
      setSuccessMsg(`Purchase Bill #${billNo} deleted and stock/ledger reversed successfully.`);
      await loadReportData();
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete purchase bill');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Edited Purchase Bill
  const handleSaveEditPurchaseBill = async (updated: Partial<PurchaseBill>) => {
    if (!editingBill) return;
    setIsLoading(true);
    try {
      await api.updatePurchase(editingBill.id, updated, { id: 'admin', name: currentRole || 'Admin', role: currentRole || 'Admin' });
      setSuccessMsg(`Purchase Bill #${editingBill.billNumber} updated successfully.`);
      setEditingBill(null);
      await loadReportData();
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update purchase bill');
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
              onClick={() => setActiveReportTab('cashRecovered')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'cashRecovered'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-300" />
              <span>Cash Recovered Report (وصولی رپورٹ)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('cashPaid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'cashPaid'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-rose-300" />
              <span>Cash Paid Report (ادائیگی رپورٹ)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('customerLedger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'customerLedger'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-300" />
              <span>Customer Ledger (جنرل لیجر)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('saleReturns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'saleReturns'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Sales Returns (سیل واپسی)</span>
            </button>
            <button
              onClick={() => setActiveReportTab('purchaseReturns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeReportTab === 'purchaseReturns'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Purchase Returns (خریداری واپسی)</span>
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
          {onNavigateTab && activeReportTab !== 'aiLedgerAudit' && activeReportTab !== 'cashRecovered' && activeReportTab !== 'cashPaid' && (
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
        <ErrorBoundary fallbackTitle="Sales Report">
          <SalesReportSection
            companyProfile={companyProfile}
            currentRole={currentRole}
            onRefreshData={onRefreshData}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'profit' ? (
        <ErrorBoundary fallbackTitle="Comprehensive Profit Report">
          <ComprehensiveProfitReportSection
            onRefreshData={onRefreshData}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'stockHistory' ? (
        <ErrorBoundary fallbackTitle="Stock History Ledger">
          <StockHistoryLedgerSection
            products={products}
            onRefreshData={onRefreshData}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'aiLedgerAudit' ? (
        <ErrorBoundary fallbackTitle="AI Master Ledger Audit Report">
          <AiLedgerAuditReportSection
            companyProfile={companyProfile}
            currentRole={currentRole}
            onRefreshData={onRefreshData}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'cashRecovered' ? (
        <ErrorBoundary fallbackTitle="Cash Recovered Report">
          <CashRecoveredReportSection
            companyProfile={companyProfile}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'cashPaid' ? (
        <ErrorBoundary fallbackTitle="Cash Paid Report">
          <CashPaidReportSection
            companyProfile={companyProfile}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'customerLedger' ? (
        <ErrorBoundary fallbackTitle="Customer Ledger Report">
          <CustomerLedgerReportSection
            companyProfile={companyProfile}
            onNavigateTab={onNavigateTab}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'saleReturns' ? (
        <ErrorBoundary fallbackTitle="Sale Returns Report">
          <SaleReturnReportSection
            companyProfile={companyProfile}
            products={products}
            onNavigateTab={onNavigateTab}
            onRefreshData={onRefreshData}
          />
        </ErrorBoundary>
      ) : activeReportTab === 'purchaseReturns' ? (
        <ErrorBoundary fallbackTitle="Purchase Returns Report">
          <PurchaseReturnReportSection
            companyProfile={companyProfile}
            products={products}
            suppliers={suppliers}
            onNavigateTab={onNavigateTab}
            onRefreshData={onRefreshData}
          />
        </ErrorBoundary>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs items-center pt-1 border-t border-slate-800/80">
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

          {/* Payables Filter */}
          <div>
            <label className="block text-amber-400 font-semibold mb-1">Payables Filter (واجب الادا)</label>
            <select
              value={payableFilter}
              onChange={(e) => setPayableFilter(e.target.value as any)}
              className="w-full bg-slate-800 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold text-xs focus:border-amber-400 focus:outline-none"
            >
              <option value="all">All Bills (تمام بلز)</option>
              <option value="hasPayable">Pending Payables (صرف بقایا &gt; 0)</option>
              <option value="cleared">Fully Paid / Cleared (مکمل ادا شدہ)</option>
            </select>
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
              {totalCartons.toFixed(1)} <span className="text-xs font-normal text-slate-400">Pkgs/CTN</span> &bull; {totalQuantity} <span className="text-xs font-normal text-slate-400">Base Qty</span>
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
                <th className="py-3 px-3 text-right">PACKAGES / CTN</th>
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
                        <div>{bill.supplierAccountTitle || 'Local Supplier'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {bill.isCash ? 'Cash Payment' : 'Supplier Credit Ledger'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                        {(() => {
                          const billPkgs = bill.items?.map(it => it.packageType).filter(Boolean);
                          const pkg = billPkgs && billPkgs[0] ? billPkgs[0] : (bill.items?.some(it => (it.itemTitle || '').toLowerCase().includes('bag') || (it.itemTitle || '').toLowerCase().includes('sugar') || (it.itemTitle || '').toLowerCase().includes('suger')) ? 'Bag' : 'CTN');
                          return (
                            <span>
                              {(Number(bill.totalCtn) || 0).toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-sky-400">{pkg}s</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                        {bill.totalQty ?? 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          {bill.items?.find(it => it.unit && !['ctn', 'carton'].includes(it.unit.toLowerCase()))?.unit || (bill.items?.some(it => (it.packageType || '').toLowerCase() === 'bag') ? 'KG' : 'Units')}
                        </span>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveBillDetail(bill)}
                            className="p-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white rounded-lg border border-sky-500/30 text-[11px] font-bold shadow transition cursor-pointer"
                            title="View Bill Voucher & Items Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingBill(bill)}
                            className="p-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg border border-amber-500/30 text-[11px] font-bold shadow transition cursor-pointer"
                            title="Edit Purchase Bill"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePurchaseBill(bill.id, bill.billNumber, e)}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/30 text-[11px] font-bold shadow transition cursor-pointer"
                            title="Delete Purchase Bill (Reverses Stock & Ledger)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* EDIT PURCHASE BILL MODAL */}
      {editingBill && (
        <PurchaseBillEditModal
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onSave={handleSaveEditPurchaseBill}
          isLoading={isLoading}
        />
      )}
        </>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// INLINE EDIT PURCHASE BILL MODAL
// -------------------------------------------------------------
interface PurchaseBillEditModalProps {
  bill: PurchaseBill;
  onClose: () => void;
  onSave: (updated: Partial<PurchaseBill>) => void;
  isLoading?: boolean;
}

const PurchaseBillEditModal: React.FC<PurchaseBillEditModalProps> = ({
  bill,
  onClose,
  onSave,
  isLoading,
}) => {
  const [billDate, setBillDate] = useState(bill.date || '');
  const [vendorBillNo, setVendorBillNo] = useState(bill.vendorBillNumber || '');
  const [gatePassNo, setGatePassNo] = useState(bill.gatePassNumber || '');
  const [paidAmt, setPaidAmt] = useState<number>(bill.paidAmount || 0);
  const [billNotes, setBillNotes] = useState(bill.notes || '');
  const [items, setItems] = useState<any[]>(bill.items ? JSON.parse(JSON.stringify(bill.items)) : []);

  const handleItemChange = (index: number, field: string, val: number) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: val };

    if (field === 'ctn') {
      const qpc = it.qtyPerCtn > 0 ? it.qtyPerCtn : 1;
      it.qty = val * qpc;
      if (it.ratePerCtn > 0) it.rate = parseFloat((it.ratePerCtn / qpc).toFixed(3));
    } else if (field === 'qty') {
      const qpc = it.qtyPerCtn > 0 ? it.qtyPerCtn : 1;
      it.ctn = parseFloat((val / qpc).toFixed(2));
    } else if (field === 'ratePerCtn') {
      const qpc = it.qtyPerCtn > 0 ? it.qtyPerCtn : 1;
      it.rate = parseFloat((val / qpc).toFixed(3));
    }

    const gross = (it.qty || 0) * (it.rate || 0);
    const disc = it.discount || 0;
    const sub = Math.max(0, gross - disc);
    const vat = parseFloat((sub * ((it.vatPercent || 5) / 100)).toFixed(2));
    it.vatAmount = vat;
    it.amount = parseFloat((sub + vat).toFixed(2));

    updated[index] = it;
    setItems(updated);
  };

  const totalCtn = items.reduce((s, it) => s + (Number(it.ctn) || 0), 0);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const grossTotal = items.reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0);
  const totalVat = items.reduce((s, it) => s + (Number(it.vatAmount) || 0), 0);
  const netTotal = parseFloat((grossTotal + totalVat).toFixed(2));
  const remainingBalance = Math.max(0, parseFloat((netTotal - (Number(paidAmt) || 0)).toFixed(2)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: billDate,
      vendorBillNumber: vendorBillNo,
      gatePassNumber: gatePassNo,
      notes: billNotes,
      paidAmount: Number(paidAmt) || 0,
      remainingBalance,
      items,
      totalCtn,
      totalQty,
      grossAmount: grossTotal,
      totalVatAmount: totalVat,
      netTotal,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              Edit Purchase Bill #{bill.billNumber}
            </h3>
            <span className="text-xs text-slate-400 font-mono">({bill.supplierAccountTitle})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Bill Date</label>
              <input
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Vendor Bill#</label>
              <input
                type="text"
                value={vendorBillNo}
                onChange={(e) => setVendorBillNo(e.target.value)}
                placeholder="Vendor Bill#"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Gate Pass#</label>
              <input
                type="text"
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                placeholder="Gate Pass#"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Paid Amount (ادائیگی)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmt}
                onChange={(e) => setPaidAmt(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold font-mono focus:border-emerald-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1.5 text-xs">Line Items Breakdown</label>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item Title</th>
                    <th className="py-2 px-2 text-center w-20">CTN</th>
                    <th className="py-2 px-2 text-right w-24">Rate/CTN</th>
                    <th className="py-2 px-2 text-right w-20">Qty</th>
                    <th className="py-2 px-2 text-right w-24">Rate</th>
                    <th className="py-2 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-white">{it.itemTitle}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={it.ctn ?? ''}
                          onChange={(e) => handleItemChange(idx, 'ctn', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={it.ratePerCtn ?? ''}
                          onChange={(e) => handleItemChange(idx, 'ratePerCtn', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={it.qty ?? ''}
                          onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={it.rate ?? ''}
                          onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                        {currencySymbol()} {Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 block text-[10px]">Total CTN</span>
                <span className="font-mono font-bold text-sky-400 text-sm">{totalCtn.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total QTY</span>
                <span className="font-mono font-bold text-sky-400 text-sm">{totalQty}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Total</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{currencySymbol()} {netTotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Remaining Balance (بقایا)</span>
                <span className="font-mono font-black text-amber-400 text-sm">{currencySymbol()} {remainingBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
