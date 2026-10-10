import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  DollarSign,
  Package,
  Users,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ComprehensiveProfitReport,
  ItemProfitReportItem,
  BillProfitReportItem,
  RestaurantCustomerProfitReportItem,
  SalesmanProfitReportItem,
  SaleBill,
} from '../types';
import { api } from '../services/api';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { exportToCsv } from '../utils/exportCsv';

interface ComprehensiveProfitReportSectionProps {
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ComprehensiveProfitReportSection: React.FC<ComprehensiveProfitReportSectionProps> = ({
  onRefreshData,
  onNavigateTab,
}) => {
  // Sub-tab selection: perItem, perBill, perRestaurant, perSalesman
  const [activeTab, setActiveTab] = useState<'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman'>('perItem');

  // Filter States
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFITABLE' | 'LOSS' | 'LOW_MARGIN'>('ALL');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  // Dedicated Live Search & Filters per Tab
  const [itemSearch, setItemSearch] = useState('');
  const [itemSelectFilter, setItemSelectFilter] = useState('ALL');
  const [billSearch, setBillSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');

  // Salesman Customers Hover & Modal Popover (Fixed on top of all UI)
  const [popoverSalesman, setPopoverSalesman] = useState<{
    sm: SalesmanProfitReportItem;
    x: number;
    y: number;
  } | null>(null);

  // Data & Loading
  const [reportData, setReportData] = useState<ComprehensiveProfitReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal for viewing a bill directly
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<SaleBill | null>(null);

  const loadProfitData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getComprehensiveProfitReport({
        fromDate: fromDate?.trim() || undefined,
        toDate: toDate?.trim() || undefined,
        search: searchQuery.trim() || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load profit reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfitData();
  }, []);

  // Quick preset filters (Exact same as sample)
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
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
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

  // Filtered Per-Item
  const filteredItems = useMemo(() => {
    if (!reportData?.perItem) return [];
    let list = reportData.perItem;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (it) =>
          (it?.itemTitle || '').toLowerCase().includes(q) ||
          (it?.mcode || '').toLowerCase().includes(q) ||
          (it?.category || '').toLowerCase().includes(q)
      );
    }
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      list = list.filter(
        (it) =>
          (it?.itemTitle || '').toLowerCase().includes(q) ||
          (it?.mcode || '').toLowerCase().includes(q) ||
          (it?.category || '').toLowerCase().includes(q)
      );
    }
    if (itemSelectFilter !== 'ALL') {
      list = list.filter(
        (it) => (it?.mcode || '') === itemSelectFilter || (it?.itemTitle || '') === itemSelectFilter
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((it) => it?.status === statusFilter);
    }
    return list;
  }, [reportData, searchQuery, itemSearch, itemSelectFilter, statusFilter]);

  // Unique item options for item select filter
  const itemOptions = useMemo(() => {
    if (!reportData?.perItem) return [];
    const map = new Map<string, string>();
    for (const it of reportData.perItem) {
      if (it?.mcode && !map.has(it.mcode)) {
        map.set(it.mcode, it.itemTitle || it.mcode);
      }
    }
    return Array.from(map.entries()).map(([mcode, title]) => ({ mcode, title }));
  }, [reportData]);

  // Filtered Per-Bill
  const filteredBills = useMemo(() => {
    if (!reportData?.perBill) return [];
    let list = reportData.perBill;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          (b?.billNumber || '').toLowerCase().includes(q) ||
          (b?.customerAccountTitle || '').toLowerCase().includes(q) ||
          (b?.salesmanName || '').toLowerCase().includes(q)
      );
    }
    if (billSearch.trim()) {
      const q = billSearch.toLowerCase();
      list = list.filter(
        (b) =>
          (b?.billNumber || '').toLowerCase().includes(q) ||
          (b?.customerAccountTitle || '').toLowerCase().includes(q) ||
          (b?.salesmanName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [reportData, searchQuery, billSearch]);

  // Filtered Per-Restaurant
  const filteredRestaurants = useMemo(() => {
    if (!reportData?.perRestaurant) return [];
    let list = reportData.perRestaurant;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r?.accountTitle || '').toLowerCase().includes(q) ||
          (r?.city || '').toLowerCase().includes(q) ||
          (r?.customerGroup || '').toLowerCase().includes(q) ||
          (r?.code ? String(r.code) : '').toLowerCase().includes(q)
      );
    }
    if (restaurantSearch.trim()) {
      const q = restaurantSearch.toLowerCase();
      list = list.filter(
        (r) =>
          (r?.accountTitle || '').toLowerCase().includes(q) ||
          (r?.city || '').toLowerCase().includes(q) ||
          (r?.customerGroup || '').toLowerCase().includes(q) ||
          (r?.code ? String(r.code) : '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [reportData, searchQuery, restaurantSearch]);

  // Filtered Per-Salesman
  const filteredSalesmen = useMemo(() => {
    if (!reportData?.perSalesman) return [];
    let list = reportData.perSalesman;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (sm) =>
          (sm?.salesmanName || '').toLowerCase().includes(q) ||
          (sm?.designation ? String(sm.designation) : '').toLowerCase().includes(q)
      );
    }
    if (salesmanSearch.trim()) {
      const q = salesmanSearch.toLowerCase();
      list = list.filter(
        (sm) =>
          (sm?.salesmanName || '').toLowerCase().includes(q) ||
          (sm?.designation ? String(sm.designation) : '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [reportData, searchQuery, salesmanSearch]);

  // Export to CSV
  const handleExportCSV = () => {
    let success = false;
    if (activeTab === 'perItem') {
      if (filteredItems.length === 0) {
        setErrorMsg('No item profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerItem_${fromDate}_${toDate}`, filteredItems, [
        { header: 'M.Code', accessor: (it) => it.mcode },
        { header: 'Item Title', accessor: (it) => it.itemTitle },
        { header: 'Category', accessor: (it) => it.category },
        { header: 'Qty Sold', accessor: (it) => it.qtySold },
        { header: 'Ctn Sold', accessor: (it) => it.ctnSold },
        { header: 'Avg Cost', accessor: (it) => it.avgPurchaseRate },
        { header: 'Avg Sale', accessor: (it) => it.avgSaleRate },
        { header: 'Revenue', accessor: (it) => it.totalRevenue },
        { header: 'COGS', accessor: (it) => it.totalCostOfGoods },
        { header: 'Gross Profit', accessor: (it) => it.grossProfit },
        { header: 'Margin %', accessor: (it) => it.profitMarginPct },
        { header: 'Remaining Stock', accessor: (it) => it.currentRemainingStock },
        { header: 'Status', accessor: (it) => it.status },
      ]);
    } else if (activeTab === 'perBill') {
      if (filteredBills.length === 0) {
        setErrorMsg('No bill profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerBill_${fromDate}_${toDate}`, filteredBills, [
        { header: 'Bill#', accessor: (b) => b.billNumber },
        { header: 'Date', accessor: (b) => b.date },
        { header: 'Customer', accessor: (b) => b.customerAccountTitle },
        { header: 'Salesman', accessor: (b) => b.salesmanName },
        { header: 'Cartons', accessor: (b) => b.totalCtn },
        { header: 'Quantity', accessor: (b) => b.totalQty },
        { header: 'Gross Sale', accessor: (b) => b.grossAmount },
        { header: 'Discount', accessor: (b) => b.billDiscount },
        { header: 'Net Total', accessor: (b) => b.netTotal },
        { header: 'Cost of Goods', accessor: (b) => b.costOfGoods },
        { header: 'Net Profit', accessor: (b) => b.netProfit },
        { header: 'Margin %', accessor: (b) => b.profitMarginPct },
      ]);
    } else if (activeTab === 'perRestaurant') {
      if (filteredRestaurants.length === 0) {
        setErrorMsg('No restaurant profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerRestaurant_${fromDate}_${toDate}`, filteredRestaurants, [
        { header: 'Restaurant / Customer', accessor: (r) => r.accountTitle },
        { header: 'Group', accessor: (r) => r.customerGroup },
        { header: 'City', accessor: (r) => r.city },
        { header: 'Bills Count', accessor: (r) => r.billsCount },
        { header: 'Cartons', accessor: (r) => r.totalCtn },
        { header: 'Quantity', accessor: (r) => r.totalQty },
        { header: 'Total Sales Volume', accessor: (r) => r.totalSalesVolume },
        { header: 'Cost of Goods', accessor: (r) => r.totalCostOfGoods },
        { header: 'Gross Profit', accessor: (r) => r.grossProfit },
        { header: 'Margin %', accessor: (r) => r.profitMarginPct },
        { header: 'Outstanding Udhaar', accessor: (r) => r.outstandingBalance },
      ]);
    } else if (activeTab === 'perSalesman') {
      if (filteredSalesmen.length === 0) {
        setErrorMsg('No salesman profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerSalesman_${fromDate}_${toDate}`, filteredSalesmen, [
        { header: 'Salesman Name', accessor: (sm) => sm.salesmanName },
        { header: 'Designation', accessor: (sm) => sm.designation || 'Sales' },
        { header: 'Bills Made', accessor: (sm) => sm.billsCount },
        { header: 'Cartons Sold', accessor: (sm) => sm.totalCtnSold },
        { header: 'Quantity Sold', accessor: (sm) => sm.totalQtySold },
        { header: 'Total Sales Volume', accessor: (sm) => sm.totalSalesVolume },
        { header: 'Cost of Goods', accessor: (sm) => sm.totalCostOfGoods },
        { header: 'Profit Generated', accessor: (sm) => sm.totalProfit },
        { header: 'Margin %', accessor: (sm) => sm.profitMarginPct },
        { header: 'Customers Handled', accessor: (sm) => sm.customersHandledCount || sm.customersList?.length || 1 },
      ]);
    }

    if (success) {
      setSuccessMsg('Profit report exported to Excel / CSV successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const summary = reportData?.summary || {
    totalSalesVolume: 0,
    totalSalesBeforeTax: 0,
    totalSalesTaxCollected: 0,
    totalCostOfGoods: 0,
    totalInputTaxPaid: 0,
    totalCostWithTax: 0,
    totalGrossProfit: 0,
    profitWithoutTax: 0,
    profitWithTax: 0,
    netVatPayable: 0,
    totalDiscountsGiven: 0,
    totalNetProfit: 0,
    overallMarginPct: 0,
    totalBillsCount: 0,
    totalQtySold: 0,
    totalCtnSold: 0,
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & TIME FILTER BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Profit Intelligence Reports Hub
                  <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    منافع کی تفصیلی رپورٹ
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated cost-to-sale margin analysis per item, per sale bill, per restaurant client, and per salesman.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                  setTimeout(loadProfitData, 50);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer ml-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Date Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-800/80 items-center">
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400">From Date (شروع کی تاریخ)</label>
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400">To Date (اختتام کی تاریخ)</label>
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Search Keywords (نام / کوڈ تلاش کریں)</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, bill#, customer, salesman..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 self-end">
            <button
              onClick={loadProfitData}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Calculating...' : 'Apply Filters'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
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
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between">
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
      {/* SUMMARY KPI CARDS & TAX INTELLIGENCE PANEL                    */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Primary Financial Margins & Dual Profit Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Profit Without Tax */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
              Profit Without Taxes
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              بغیر ٹیکس نفع
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <span>{currencySymbol()} {(summary.profitWithoutTax ?? summary.totalGrossProfit).toLocaleString()}</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Sales excl. tax ({currencySymbol()} {(summary.totalSalesBeforeTax ?? summary.totalSalesVolume).toLocaleString()}) - Cost ({currencySymbol()} {summary.totalCostOfGoods.toLocaleString()})
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5 font-semibold">
            Margin: {summary.overallMarginPct}% on base revenue
          </div>
        </div>

        {/* Profit With Tax Effect */}
        <div className="bg-gradient-to-br from-teal-950/50 via-slate-900 to-slate-900 border border-teal-500/50 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wide">
              Profit With Added Taxes
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono font-bold">
              مع ٹیکس اثر
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-teal-300 mt-1">
            {currencySymbol()} {(summary.profitWithTax ?? summary.totalGrossProfit).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Total Invoiced ({currencySymbol()} {summary.totalSalesVolume.toLocaleString()}) - Total Cost with VAT ({currencySymbol()} {(summary.totalCostWithTax ?? summary.totalCostOfGoods).toLocaleString()})
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            After factoring input purchase VAT & output bill VAT
          </div>
        </div>

        {/* Product Sales + Tax Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Sales Revenue + Tax</span>
            <span className="text-indigo-400 font-urdu text-[10px]">فروخت مع ٹیکس</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
            {currencySymbol()} {summary.totalSalesVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Sale without tax:</span>
              <span className="font-semibold text-white">{currencySymbol()} {(summary.totalSalesBeforeTax ?? summary.totalSalesVolume).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-teal-400">
              <span>+ Output VAT (5%):</span>
              <span className="font-bold">{currencySymbol()} {(summary.totalSalesTaxCollected ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Cost of Goods + Tax Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Cost of Goods + Tax</span>
            <span className="text-amber-400 font-urdu text-[10px]">لاگت خریداری مع ٹیکس</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-200 mt-1">
            {currencySymbol()} {(summary.totalCostWithTax ?? summary.totalCostOfGoods).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Cost without tax:</span>
              <span className="font-semibold text-white">{currencySymbol()} {summary.totalCostOfGoods.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>+ Input Tax Paid:</span>
              <span className="font-bold">{currencySymbol()} {(summary.totalInputTaxPaid ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tax Authority Position Card (Net VAT Payable/Receivable) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-200">
            Tax Authority Position (نیٹ ٹیکس کھاتہ):
          </span>
          <span className="text-slate-400">
            Collected Output Tax ({currencySymbol()} {(summary.totalSalesTaxCollected ?? 0).toLocaleString()}) - Paid Input Tax ({currencySymbol()} {(summary.totalInputTaxPaid ?? 0).toLocaleString()})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Net VAT Payable to Govt</span>
            <span className={`font-mono font-bold text-sm ${
              (summary.netVatPayable ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {currencySymbol()} {Math.abs(summary.netVatPayable ?? 0).toLocaleString()} {(summary.netVatPayable ?? 0) >= 0 ? '(Payable)' : '(Refundable)'}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Discounts Given</span>
            <span className="font-mono font-bold text-sm text-rose-400">
              -{currencySymbol()} {summary.totalDiscountsGiven.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4 CORE SUB-TABS (Per Item, Per Bill, Per Restaurant, Salesman) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Navigation Tabs */}
        <div className="px-4 pt-3 bg-slate-950 border-b border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('perItem')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perItem'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. Profit Per Item (ہر آئٹم کا نفع)</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perBill')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perBill'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Profit Per Bill (ہر سیل بل کا نفع)</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredBills.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perRestaurant')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perRestaurant'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>3. Profit Per Restaurant / Customer (گاہک کا نفع)</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredRestaurants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perSalesman')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perSalesman'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>4. Profit Per Salesman (سیلز مین کا نفع)</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredSalesmen.length}
            </span>
          </button>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* TAB 1: PROFIT PER ITEM                                      */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perItem' && (
          <div className="p-4 sm:p-5">
            {/* Live Search & Filter Bar for Per-Item */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Live Search Input */}
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Live Search Item Title, SKU, M.Code..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  {itemSearch && (
                    <button
                      onClick={() => setItemSearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Item Select Dropdown Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                    Select Item:
                  </span>
                  <select
                    value={itemSelectFilter}
                    onChange={(e) => setItemSelectFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 max-w-[200px]"
                  >
                    <option value="ALL">All Items ({itemOptions.length})</option>
                    {itemOptions.map((opt) => (
                      <option key={opt.mcode} value={opt.mcode}>
                        {opt.title} ({opt.mcode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Margin Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                    Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="ALL">All Margins</option>
                    <option value="PROFITABLE">Profitable Only</option>
                    <option value="LOW_MARGIN">Low Margin (&lt;10%)</option>
                    <option value="LOSS">Loss Making</option>
                  </select>
                </div>
              </div>

              <div className="text-slate-400 text-[11px] font-mono">
                Showing <strong className="text-emerald-400">{filteredItems.length}</strong> items
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">M.Code</th>
                    <th className="py-2.5 px-3">Item Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost</th>
                    <th className="py-2.5 px-3 text-right">Avg Sale</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">COGS</th>
                    <th className="py-2.5 px-3 text-right">Gross Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">In Warehouse</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-slate-500 font-sans">
                        No sales or profit records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-slate-400">{it.mcode}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {it.itemTitle}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{it.category}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{it.ctnSold}</td>
                        <td className="py-2.5 px-3 text-center text-white font-bold">{it.qtySold}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{currencySymbol()} {it.avgPurchaseRate.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-200">{currencySymbol()} {it.avgSaleRate.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{currencySymbol()} {it.totalRevenue.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{currencySymbol()} {it.totalCostOfGoods.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {currencySymbol()} {it.grossProfit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={it.profitMarginPct >= 15 ? 'text-emerald-400' : it.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {it.profitMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            it.currentRemainingStock <= 10 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-200'
                          }`}>
                            {it.currentRemainingStock} ({it.currentStockCartons} Ctn)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {it.status === 'PROFITABLE' && (
                            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                              Profitable
                            </span>
                          )}
                          {it.status === 'LOW_MARGIN' && (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                              Low Margin
                            </span>
                          )}
                          {it.status === 'LOSS' && (
                            <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                              Loss
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 2: PROFIT PER BILL                                      */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perBill' && (
          <div className="p-4 sm:p-5">
            {/* Live Search Bar for Per-Bill */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  placeholder="Live Search Bill# (e.g. 1025), Customer, Salesman..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                {billSearch && (
                  <button
                    onClick={() => setBillSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-slate-400 text-[11px] font-mono">
                Showing <strong className="text-emerald-400">{filteredBills.length}</strong> sales bills
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Bill#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer / Restaurant</th>
                    <th className="py-2.5 px-3">Salesman</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-right">Gross Total</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Net Total</th>
                    <th className="py-2.5 px-3 text-right">COGS (Cost)</th>
                    <th className="py-2.5 px-3 text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-slate-500 font-sans">
                        No sales bills found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.billId} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-bold text-white">#{b.billNumber}</td>
                        <td className="py-2.5 px-3 text-slate-400">{b.date}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-200">
                          {b.customerAccountTitle}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{b.salesmanName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{b.itemsCount}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{b.totalCtn}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{currencySymbol()} {b.grossAmount.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-rose-400">
                          {b.billDiscount > 0 ? `-${currencySymbol()} ${b.billDiscount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{currencySymbol()} {b.netTotal.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{currencySymbol()} {b.costOfGoods.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {currencySymbol()} {b.netProfit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={b.profitMarginPct >= 15 ? 'text-emerald-400' : b.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {b.profitMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <button
                            onClick={() => {
                              // Reconstruct SaleBill for modal
                              const fullBill: SaleBill = {
                                id: b.billId,
                                billNumber: b.billNumber,
                                date: b.date,
                                customerId: b.customerId,
                                customerAccountTitle: b.customerAccountTitle,
                                salesmanName: b.salesmanName,
                                paymentType: 'Account',
                                discountType: 'Amount',
                                items: b.items,
                                totalCtn: b.totalCtn,
                                totalQty: b.totalQty,
                                billDiscountPercent: 0,
                                billDiscountAmount: b.billDiscount,
                                totalDiscount: b.billDiscount,
                                totalVatAmount: b.vatAmount,
                                grossAmount: b.grossAmount,
                                netTotal: b.netTotal,
                                cashReceived: 0,
                                balanceReceivable: b.netTotal,
                                changeGiven: 0,
                                balanceRecovered: false,
                                balanceRecoveredAmount: 0,
                                amountReceivable: b.netTotal,
                                status: 'Completed',
                                createdAt: new Date().toISOString(),
                              };
                              setSelectedBillForReceipt(fullBill);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>View / Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 3: PROFIT PER RESTAURANT / CUSTOMER                     */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perRestaurant' && (
          <div className="p-4 sm:p-5">
            {/* Live Search Bar for Per-Restaurant / Customer */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  placeholder="Live Search Customer Name, Restaurant, City, Code..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                {restaurantSearch && (
                  <button
                    onClick={() => setRestaurantSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-slate-400 text-[11px] font-mono">
                Showing <strong className="text-emerald-400">{filteredRestaurants.length}</strong> customers / restaurants
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Customer / Restaurant</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3 text-center">Bills Count</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    <th className="py-2.5 px-3 text-right">Cost of Goods</th>
                    <th className="py-2.5 px-3 text-right">Gross Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-right">Ledger Udhaar (Bal)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                        No customer sales data available.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          <div>{r.accountTitle}</div>
                          {r.mobile && <span className="text-[10px] text-slate-500 font-mono font-normal">Mob: {r.mobile}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{r.customerGroup}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{r.city}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{r.billsCount}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{r.totalCtn}</td>
                        <td className="py-2.5 px-3 text-center text-white font-bold">{r.totalQty}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {currencySymbol()} {r.totalSalesVolume.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {currencySymbol()} {r.totalCostOfGoods.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {currencySymbol()} {r.grossProfit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={r.profitMarginPct >= 15 ? 'text-emerald-400' : 'text-amber-400'}>
                            {r.profitMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={r.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {currencySymbol()} {r.outstandingBalance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {r.status === 'HEALTHY' && (
                            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                              Profitable
                            </span>
                          )}
                          {r.status === 'PENDING_COLLECTION' && (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                              Collect Udhaar
                            </span>
                          )}
                          {r.status === 'LOSS' && (
                            <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                              Loss Making
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 4: PROFIT PER SALESMAN                                  */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perSalesman' && (
          <div className="p-4 sm:p-5">
            {/* Live Search Bar for Per-Salesman */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={salesmanSearch}
                  onChange={(e) => setSalesmanSearch(e.target.value)}
                  placeholder="Live Search Salesman Name, Designation, Contact..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                {salesmanSearch && (
                  <button
                    onClick={() => setSalesmanSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-slate-400 text-[11px] font-mono">
                Showing <strong className="text-emerald-400">{filteredSalesmen.length}</strong> salesmen
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Salesman Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3 text-center">Bills Made</th>
                    <th className="py-2.5 px-3 text-center">Cartons Sold</th>
                    <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Sales Volume</th>
                    <th className="py-2.5 px-3 text-right">Cost of Goods</th>
                    <th className="py-2.5 px-3 text-right">Profit Generated</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Customers Handled (Hover)</th>
                    <th className="py-2.5 px-3 text-center">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredSalesmen.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                        No salesman activity logged.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesmen.map((sm, idx) => {
                      const contributionPct = Number(summary.totalGrossProfit) > 0 && !isNaN(Number(sm.totalProfit))
                        ? Number(((Number(sm.totalProfit) / Number(summary.totalGrossProfit)) * 100).toFixed(1)) || 0
                        : 0;

                      const count = sm.customersHandledCount || sm.customersList?.length || 1;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{sm.salesmanName}</span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">{sm.designation || 'Sales Representative'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{sm.contactNo || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{sm.billsCount}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{sm.totalCtnSold}</td>
                          <td className="py-2.5 px-3 text-center text-white font-bold">{sm.totalQtySold}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {currencySymbol()} {sm.totalSalesVolume.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {currencySymbol()} {sm.totalCostOfGoods.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {currencySymbol()} {sm.totalProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            {sm.profitMarginPct}%
                          </td>
                          {/* Customers Handled Button (Clear & Floating Above All UI) */}
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              type="button"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopoverSalesman({
                                  sm,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (popoverSalesman?.sm.salesmanName === sm.salesmanName) {
                                  setPopoverSalesman(null);
                                } else {
                                  setPopoverSalesman({
                                    sm,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 hover:text-white hover:bg-emerald-800 text-[11px] font-bold cursor-pointer transition shadow-xs"
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{count} Customers</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                              {contributionPct}% of profit
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Popover on Top of All UI (Never Hidden Behind Tables) */}
      {popoverSalesman && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 350, Math.max(16, popoverSalesman.x - 170))}px`,
            top: popoverSalesman.y < 360 ? `${popoverSalesman.y + 36}px` : `${popoverSalesman.y - 10}px`,
            transform: popoverSalesman.y < 360 ? 'none' : 'translateY(-100%)',
          }}
          className="w-84 max-w-[95vw] bg-slate-900/98 backdrop-blur-md border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 z-[99999] text-left animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-black">{popoverSalesman.sm.salesmanName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-700">
                {popoverSalesman.sm.customersHandledCount || popoverSalesman.sm.customersList?.length || 1} Handled
              </span>
              <button
                type="button"
                onClick={() => setPopoverSalesman(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="py-2.5 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Total Sales Volume:</span>
              <span className="font-bold text-white font-mono">{currencySymbol()} {popoverSalesman.sm.totalSalesVolume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Total Net Profit Contribution:</span>
              <span className="font-mono text-sm">+{currencySymbol()} {popoverSalesman.sm.totalProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Average Profit Margin:</span>
              <span className="text-amber-300 font-bold font-mono">{popoverSalesman.sm.profitMarginPct}%</span>
            </div>
          </div>

          {popoverSalesman.sm.customersList && popoverSalesman.sm.customersList.length > 0 && (
            <div className="pt-2.5 border-t border-slate-800 text-xs">
              <span className="text-slate-300 font-bold block mb-1.5 text-[11px]">
                Customers Handled &amp; Profit Breakdown (گاہک اور منافع):
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {popoverSalesman.sm.customersList.map((c, cIdx) => (
                  <div key={cIdx} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate text-xs">{c.customerTitle}</div>
                      <div className="text-slate-400 text-[10px]">{c.billsCount} bill(s) &bull; Sales: {currencySymbol()} {c.totalSales.toLocaleString()}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="text-emerald-400 font-bold block text-xs">+{currencySymbol()} {c.profit.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 font-sans">Profit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bill Receipt Modal */}
      {selectedBillForReceipt && (
        <SalesBillReceiptModal
          bill={selectedBillForReceipt}
          onClose={() => setSelectedBillForReceipt(null)}
        />
      )}
    </div>
  );
};
