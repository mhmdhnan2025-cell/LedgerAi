import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
  ChevronDown,
  X,
  Receipt,
  Trash2,
  Edit2,
  Users,
  DollarSign,
  Building2,
  Phone,
} from 'lucide-react';
import { CompanyProfile, Customer, Product, SaleBill, UserRole } from '../types';
import { api } from '../services/api';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { exportToCsv } from '../utils/exportCsv';

interface SalesReportSectionProps {
  companyProfile?: CompanyProfile | null;
  currentRole: UserRole;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SalesReportSection: React.FC<SalesReportSectionProps> = ({
  companyProfile,
  currentRole,
  onRefreshData,
  onNavigateTab,
}) => {
  // Search & Filter State - default to empty to show all records or user selects preset
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [mobileFilter, setMobileFilter] = useState<string>('');
  const [billNumberFilter, setBillNumberFilter] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('');
  const [salesmenList, setSalesmenList] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<string>('date-desc');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');
  const [onlyReceivables, setOnlyReceivables] = useState<boolean>(false);

  // Customer dropdown
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Item / Product Filter dropdown (User mandate: "sale report mainb check kr lena hide na ho item selction")
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedItemTitle, setSelectedItemTitle] = useState<string>('');
  const [isItemFilterOpen, setIsItemFilterOpen] = useState(false);
  const [itemFilterSearch, setItemFilterSearch] = useState('');
  const itemFilterDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Date Range Presets (As requested in sample picture)
  const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | '7days' | 'month' | 'last_month' | 'year') => {
    setActiveDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setFromDate(past7.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startMonth.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'last_month') {
      const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(startLastMonth.toISOString().split('T')[0]);
      setToDate(endLastMonth.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const startYear = new Date(today.getFullYear(), 0, 1);
      setFromDate(startYear.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  // Sales Bills Data
  const [saleBills, setSaleBills] = useState<SaleBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Details Modal
  const [activeBillDetail, setActiveBillDetail] = useState<SaleBill | null>(null);
  const [receiptModalBill, setReceiptModalBill] = useState<SaleBill | null>(null);

  const loadCustomers = async () => {
    try {
      const list = await api.getCustomers();
      setCustomers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    try {
      const list = await api.getProducts();
      setAvailableProducts(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSalesmen = async () => {
    try {
      const list = await api.getSalesmen();
      setSalesmenList(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSaleBills = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getSales({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        mobileNo: mobileFilter.trim() || undefined,
        billNo: billNumberFilter.trim() || undefined,
        customerId: selectedCustomerId || undefined,
        salesmanId: selectedSalesman || undefined,
        orderBy,
      });
      setSaleBills(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch sales reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadSalesmen();
    loadSaleBills();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (itemFilterDropdownRef.current && !itemFilterDropdownRef.current.contains(e.target as Node)) {
        setIsItemFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered displayed bills based on onlyReceivables check and item filter
  const displayedBills = useMemo(() => {
    let result = saleBills;
    if (onlyReceivables) {
      result = result.filter((b) => (b.balanceReceivable || 0) > 0);
    }
    if (selectedItemTitle) {
      const q = selectedItemTitle.toLowerCase();
      result = result.filter((b) =>
        b.items && b.items.some((it) => it.itemTitle.toLowerCase().includes(q))
      );
    }
    return result;
  }, [saleBills, onlyReceivables, selectedItemTitle]);

  // Summary Metrics
  const summary = useMemo(() => {
    return displayedBills.reduce(
      (acc, bill) => {
        acc.totalBills += 1;
        acc.totalCtn += Number(bill.totalCtn) || 0;
        acc.totalQty += Number(bill.totalQty) || 0;
        acc.grossAmount += Number(bill.grossAmount) || 0;
        acc.totalDiscount += Number(bill.totalDiscount) || 0;
        acc.totalVat += Number(bill.totalVatAmount) || 0;
        acc.netTotal += Number(bill.netTotal) || 0;
        acc.cashReceived += Number(bill.cashReceived) || 0;
        acc.balanceReceivable += Number(bill.balanceReceivable) || 0;
        return acc;
      },
      {
        totalBills: 0,
        totalCtn: 0,
        totalQty: 0,
        grossAmount: 0,
        totalDiscount: 0,
        totalVat: 0,
        netTotal: 0,
        cashReceived: 0,
        balanceReceivable: 0,
      }
    );
  }, [displayedBills]);

  // Selected Customer Display
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.accountTitle?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.code?.includes(customerSearchQuery)
  );

  const [editingSaleBill, setEditingSaleBill] = useState<SaleBill | null>(null);

  const handleDeleteBill = async (id: string, billNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Sale Bill #${billNo}? Stock inventory and customer balance will be safely restored.`)) {
      return;
    }
    try {
      await api.deleteSale(id, { id: 'admin', name: 'User', role: currentRole });
      setSaleBills((prev) => prev.filter((b) => b.id !== id));
      setSuccessMsg(`Sale bill #${billNo} removed from reports and ledger/stock reversed.`);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete sale bill.');
    }
  };

  const handleSaveEditSaleBill = async (updated: Partial<SaleBill>) => {
    if (!editingSaleBill) return;
    try {
      const res = await api.updateSale(editingSaleBill.id, updated, { id: 'admin', name: 'User', role: currentRole });
      setSaleBills((prev) => prev.map((b) => (b.id === res.id ? res : b)));
      setSuccessMsg(`Sale bill #${editingSaleBill.billNumber} updated successfully.`);
      setEditingSaleBill(null);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update sale bill.');
    }
  };

  const handleExportCSV = () => {
    if (displayedBills.length === 0) {
      setErrorMsg('No sales bills found to export for the selected filter criteria.');
      return;
    }
    const prefix = onlyReceivables ? 'Customer_Receivables_Report' : 'Sales_Report';
    const success = exportToCsv(
      `${prefix}_${fromDate || 'All'}_to_${toDate || 'All'}`,
      displayedBills,
      [
        { header: 'Bill#', accessor: (b) => b.billNumber },
        { header: 'Date', accessor: (b) => b.date },
        { header: 'Customer', accessor: (b) => b.customerAccountTitle },
        { header: 'Customer TRN', accessor: (b) => b.customerTrn || '' },
        { header: 'Mobile', accessor: (b) => b.customerMobile || '' },
        { header: 'Salesman', accessor: (b) => b.salesmanName || '' },
        { header: 'Payment Type', accessor: (b) => b.paymentType || 'Account' },
        { header: 'Cartons', accessor: (b) => b.totalCtn },
        { header: 'Quantity', accessor: (b) => b.totalQty },
        { header: 'Gross Amount', accessor: (b) => b.grossAmount },
        { header: 'Discount', accessor: (b) => b.totalDiscount || 0 },
        { header: 'VAT 5%', accessor: (b) => b.totalVatAmount || 0 },
        { header: 'Net Total', accessor: (b) => b.netTotal },
        { header: 'Cash Received', accessor: (b) => b.cashReceived || 0 },
        { header: 'Balance Due / Receivable', accessor: (b) => b.balanceReceivable || 0 },
      ]
    );
    if (success) {
      setSuccessMsg(`${onlyReceivables ? 'Receivables List' : 'Sales Report'} exported to CSV / Excel successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const companyDisplayName = companyProfile?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';

  return (
    <div className="space-y-4">
      {/* Search & Filter Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Sales Report Filters &amp; Search (فلٹرز اور تلاش)</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-amber-950/40 border border-amber-500/50 hover:border-amber-400 rounded-lg text-xs font-bold text-amber-300 transition select-none">
              <input
                type="checkbox"
                checked={onlyReceivables}
                onChange={(e) => setOnlyReceivables(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span>Only Pending Receivables (صرف بقایا جات)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900 text-amber-200 font-mono">
                  {saleBills.filter((b) => (b.balanceReceivable || 0) > 0).length} Bills
                </span>
              </span>
            </label>

            <button
              onClick={() => {
                applyDatePreset('all');
                setMobileFilter('');
                setBillNumberFilter('');
                setSelectedCustomerId('');
                setSelectedSalesman('');
                setOrderBy('date-desc');
                setOnlyReceivables(false);
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={loadSaleBills}
              disabled={isLoading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Searching...' : 'Show Report (رپورٹ دیکھیں)'}</span>
            </button>
          </div>
        </div>

        {/* Quick Date Presets Bar (Same as Sample) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Date Range:</span>
          </span>
          {[
            { id: 'all', label: 'All Records (تمام)' },
            { id: 'today', label: 'Today (آج)' },
            { id: 'yesterday', label: 'Yesterday (گزشتہ کل)' },
            { id: 'week', label: 'This Week (یہ ہفتہ)' },
            { id: '7days', label: 'Last 7 Days (گزشتہ 7 دن)' },
            { id: 'month', label: 'This Month (یہ ماہ)' },
            { id: 'last_month', label: 'Last Month (گزشتہ ماہ)' },
            { id: 'year', label: 'This Year (یہ سال)' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                applyDatePreset(preset.id as any);
                setTimeout(loadSaleBills, 50);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                activeDatePreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {/* From Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">From Date (شروع)</label>
              {fromDate && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setActiveDatePreset('custom');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* To Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">To Date (اختتام)</label>
              {toDate && (
                <button
                  type="button"
                  onClick={() => {
                    setToDate('');
                    setActiveDatePreset('custom');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Bill No */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Bill No</label>
            <input
              type="text"
              placeholder="e.g. 6762"
              value={billNumberFilter}
              onChange={(e) => setBillNumberFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Mobile No */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Mobile No</label>
            <input
              type="text"
              placeholder="Phone or mobile"
              value={mobileFilter}
              onChange={(e) => setMobileFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Customer Dropdown */}
          <div className="relative" ref={customerDropdownRef}>
            <label className="block text-slate-400 font-semibold mb-1">Customer</label>
            <div
              onClick={() => {
                setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                setCustomerSearchQuery('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer flex items-center justify-between hover:border-emerald-500 truncate"
            >
              <span className="truncate">
                {selectedCustomerObj ? selectedCustomerObj.accountTitle || selectedCustomerObj.name : 'All Customers'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
            </div>

            {isCustomerDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-56 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white mb-2"
                  autoFocus
                />
                <div
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerSearchQuery('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded cursor-pointer"
                >
                  All Customers
                </div>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearchQuery('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="px-2 py-1 text-white hover:bg-slate-800 rounded cursor-pointer flex justify-between"
                  >
                    <span className="truncate">{c.accountTitle || c.name}</span>
                    <span className="text-[10px] text-orange-400 font-mono">{c.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item / Product Dropdown (User mandate: "sale report mainb check kr lena hide na ho item selction") */}
          <div className="relative" ref={itemFilterDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Filter by Item (صنف)</label>
              {selectedItemTitle && (
                <button
                  type="button"
                  onClick={() => setSelectedItemTitle('')}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div
              onClick={() => setIsItemFilterOpen(!isItemFilterOpen)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer flex items-center justify-between hover:border-emerald-500 truncate"
            >
              <span className={`truncate ${selectedItemTitle ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                {selectedItemTitle || 'All Items (تمام اشیاء)'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
            </div>

            {isItemFilterOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto text-xs">
                <input
                  type="text"
                  placeholder="Search item / M.Code..."
                  value={itemFilterSearch}
                  onChange={(e) => setItemFilterSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white mb-2 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <div
                  onClick={() => {
                    setSelectedItemTitle('');
                    setIsItemFilterOpen(false);
                  }}
                  className="px-2 py-1.5 text-slate-300 hover:bg-slate-800 rounded cursor-pointer font-bold border-b border-slate-800"
                >
                  All Items (Clear Filter)
                </div>
                {availableProducts
                  .filter((p) => {
                    if (!itemFilterSearch.trim()) return true;
                    const q = itemFilterSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.mcode && p.mcode.toLowerCase().includes(q));
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedItemTitle(p.name);
                        setIsItemFilterOpen(false);
                      }}
                      className={`px-2 py-1.5 text-white hover:bg-slate-800 rounded cursor-pointer flex justify-between items-center transition ${
                        selectedItemTitle === p.name ? 'bg-emerald-950/80 text-emerald-300 font-bold' : ''
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Code: {p.mcode || p.sku || '-'} &bull; {p.category}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-sky-400 shrink-0">
                        ~ {p.currentQuantity}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Salesman */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Salesman (المندوب)</label>
            <select
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">All Salesmen (تمام مندوب)</option>
              {salesmenList.map((sm) => (
                <option key={sm} value={sm}>
                  {sm}
                </option>
              ))}
            </select>
          </div>

          {/* Order By */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Order By</label>
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="billNo-desc">Bill No (High to Low)</option>
              <option value="billNo-asc">Bill No (Low to High)</option>
              <option value="netTotal-desc">Amount (Highest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Bills</span>
          <span className="text-base font-bold text-white font-mono">{summary.totalBills}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total CTN</span>
          <span className="text-base font-bold text-sky-400 font-mono">{summary.totalCtn}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Quantity</span>
          <span className="text-base font-bold text-indigo-400 font-mono">{summary.totalQty}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Sales</span>
          <span className="text-base font-bold text-white font-mono">{currencySymbol()} {summary.grossAmount.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Discounts</span>
          <span className="text-base font-bold text-rose-400 font-mono">-{currencySymbol()} {summary.totalDiscount.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">VAT Total</span>
          <span className="text-base font-bold text-teal-400 font-mono">+{currencySymbol()} {summary.totalVat.toLocaleString()}</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase block">Net Sales</span>
          <span className="text-base font-bold text-emerald-300 font-mono">{currencySymbol()} {summary.netTotal.toLocaleString()}</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3">
          <span className="text-[10px] text-amber-400 font-bold uppercase block">Receivables</span>
          <span className="text-base font-bold text-amber-300 font-mono">{currencySymbol()} {summary.balanceReceivable.toLocaleString()}</span>
        </div>
      </div>

      {/* Report Table Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-300 font-bold">
            Sales Records Found: <strong className="text-emerald-400">{saleBills.length}</strong> Bills
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel / CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Printable Report Header */}
        <div className="p-5 text-center border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-base font-black text-white uppercase tracking-wider">{companyDisplayName}</h2>
          <div className="text-xs font-bold text-emerald-400 mt-1">Comprehensive Sales Report</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Period: {fromDate || 'Start'} to {toDate || 'Present'}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Bill #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer Account</th>
                <th className="py-2.5 px-3">Salesman</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">CTN</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">Disc</th>
                <th className="py-2.5 px-3 text-right">VAT</th>
                <th className="py-2.5 px-3 text-right">Net Total</th>
                <th className="py-2.5 px-3 text-right">Cash Paid</th>
                <th className="py-2.5 px-3 text-right">Bal Due</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {displayedBills.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-slate-500">
                    {onlyReceivables
                      ? 'No pending receivable customers found for the selected criteria.'
                      : 'No sales reports found for the selected criteria.'}
                  </td>
                </tr>
              ) : (
                displayedBills.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setActiveBillDetail(b)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 group-hover:underline">
                      {b.billNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{b.date}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">{b.customerAccountTitle}</div>
                      {b.customerMobile && (
                        <div className="text-[10px] text-slate-400 font-mono">{b.customerMobile}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div>{b.salesmanName || b.salesmanId || '—'}</div>
                      {b.user && (
                        <div className="text-[10px] text-indigo-400 font-mono font-medium">User: {b.user}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          b.paymentType === 'Cash'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        }`}
                      >
                        {b.paymentType || 'Account'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{b.totalCtn}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{b.totalQty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{currencySymbol()} {b.grossAmount?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                      {b.totalDiscount ? `-${currencySymbol()} ${b.totalDiscount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-teal-400">
                      {currencySymbol()} {b.totalVatAmount?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {currencySymbol()} {b.netTotal?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {currencySymbol()} {(b.cashReceived || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={b.balanceReceivable > 0 ? 'text-amber-400' : 'text-slate-500'}>
                        {currencySymbol()} {(b.balanceReceivable || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setReceiptModalBill(b)}
                          className="p-1 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer transition"
                          title="Print Customer Receipt / طباعة الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveBillDetail(b)}
                          className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSaleBill(b)}
                          className="p-1 hover:bg-amber-900/40 text-slate-400 hover:text-amber-400 rounded cursor-pointer transition"
                          title="Edit Sale Bill"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteBill(b.id, b.billNumber, e)}
                          className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Bill Details Modal */}
      {activeBillDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <span>Sale Bill Details - #{activeBillDetail.billNumber}</span>
                </h3>
                <span className="text-xs text-slate-400">Date: {activeBillDetail.date}</span>
              </div>
              <button
                onClick={() => setActiveBillDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Customer Name:</span>
                <span className="font-bold text-white">{activeBillDetail.customerAccountTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Salesman:</span>
                <span className="font-bold text-slate-200">{activeBillDetail.salesmanName || '---'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Type:</span>
                <span className="font-bold text-indigo-400">{activeBillDetail.paymentType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Sold Quantity:</span>
                <span className="font-bold text-emerald-400">{activeBillDetail.totalQty} units</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item Title</th>
                    <th className="py-2 px-3">M.Code</th>
                    <th className="py-2 px-3 text-right">CTN</th>
                    <th className="py-2 px-3 text-right">Rate/CTN</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Disc</th>
                    <th className="py-2 px-3 text-right">VAT</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {activeBillDetail.items?.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2 px-3 font-semibold text-white">{it.itemTitle}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{it.mcode || '---'}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.ctn}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.ratePerCtn}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white">{it.qty}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.rate}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.discount || 0}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.vatPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                        {currencySymbol()} {it.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-semibold mb-1">Notes / Terms:</span>
                <p className="text-slate-300 italic">{activeBillDetail.notes || 'None'}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Total:</span>
                  <span className="font-mono text-white">{currencySymbol()} {activeBillDetail.grossAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discounts:</span>
                  <span className="font-mono text-rose-400">-{currencySymbol()} {activeBillDetail.totalDiscount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>VAT Amount:</span>
                  <span className="font-mono text-teal-400">+{currencySymbol()} {activeBillDetail.totalVatAmount?.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-sm text-emerald-400">
                  <span>Net Total:</span>
                  <span>{currencySymbol()} {activeBillDetail.netTotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Cash Paid:</span>
                  <span className="font-mono text-white">{currencySymbol()} {(activeBillDetail.cashReceived || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-400">
                  <span>Balance Receivable:</span>
                  <span>{currencySymbol()} {(activeBillDetail.balanceReceivable || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReceiptModalBill(activeBillDetail)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Bilingual Customer Receipt / فاتورة ضريبية</span>
                </button>
                <button
                  onClick={() => setReceiptModalBill(activeBillDetail)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt (معاينة وطباعة)</span>
                </button>
              </div>
              <button
                onClick={() => setActiveBillDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modern Bilingual Receipt Modal */}
      {receiptModalBill && (
        <SalesBillReceiptModal
          bill={receiptModalBill}
          companyProfile={companyProfile}
          onClose={() => setReceiptModalBill(null)}
        />
      )}

      {/* Edit Sale Bill Modal */}
      {editingSaleBill && (
        <SaleBillEditModal
          bill={editingSaleBill}
          onClose={() => setEditingSaleBill(null)}
          onSave={handleSaveEditSaleBill}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// INLINE EDIT SALE BILL MODAL
// -------------------------------------------------------------
interface SaleBillEditModalProps {
  bill: SaleBill;
  onClose: () => void;
  onSave: (updated: Partial<SaleBill>) => void;
}

const SaleBillEditModal: React.FC<SaleBillEditModalProps> = ({
  bill,
  onClose,
  onSave,
}) => {
  const [billDate, setBillDate] = useState(bill.date || '');
  const [paymentType, setPaymentType] = useState(bill.paymentType || 'Account');
  const [billDiscount, setBillDiscount] = useState<number>(bill.billDiscount || 0);
  const [cashRcvd, setCashRcvd] = useState<number>(bill.cashReceived || 0);
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
    const vat = parseFloat((sub * ((it.vatPercent || 0) / 100)).toFixed(2));
    it.vatAmount = vat;
    it.amount = parseFloat((sub + vat).toFixed(2));

    updated[index] = it;
    setItems(updated);
  };

  const totalCtn = items.reduce((s, it) => s + (Number(it.ctn) || 0), 0);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const grossTotal = items.reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0);
  const totalItemDisc = items.reduce((s, it) => s + (Number(it.discount) || 0), 0);
  const totalVat = items.reduce((s, it) => s + (Number(it.vatAmount) || 0), 0);
  const netTotal = Math.max(0, parseFloat((grossTotal - totalItemDisc - (Number(billDiscount) || 0) + totalVat).toFixed(2)));
  const balanceReceivable = paymentType === 'Cash' ? 0 : Math.max(0, parseFloat((netTotal - (Number(cashRcvd) || 0)).toFixed(2)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: billDate,
      paymentType: paymentType as any,
      billDiscount: Number(billDiscount) || 0,
      cashReceived: paymentType === 'Cash' ? netTotal : (Number(cashRcvd) || 0),
      balanceReceivable,
      notes: billNotes,
      items,
      totalCtn,
      totalQty,
      grossAmount: grossTotal,
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
              Edit Sale Bill #{bill.billNumber}
            </h3>
            <span className="text-xs text-slate-400 font-mono">({bill.customerAccountTitle})</span>
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
              <label className="block text-slate-400 font-bold mb-1">Payment Mode</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-amber-500 outline-none font-bold"
              >
                <option value="Account">Customer Khata (Credit)</option>
                <option value="Cash">Cash Sale (Instant Paid)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Bill Discount (رعایت)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Cash Received (وصولی)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashRcvd}
                onChange={(e) => setCashRcvd(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold font-mono focus:border-emerald-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1.5 text-xs">Items Sold Breakdown</label>
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
                <span className="text-slate-400 block text-[10px]">Balance Due (بقایا)</span>
                <span className="font-mono font-black text-amber-400 text-sm">{currencySymbol()} {balanceReceivable.toFixed(2)}</span>
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
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
