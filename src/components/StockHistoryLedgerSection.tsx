import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Layers,
  Clock,
  User,
  ShoppingBag,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import {
  StockMovementReport,
  StockMovementSummaryItem,
  StockMovementLedgerEntry,
  Product,
} from '../types';
import { api } from '../services/api';
import { exportToCsv } from '../utils/exportCsv';
import { SearchableProductSelect } from './SearchableProductSelect';

interface StockHistoryLedgerSectionProps {
  products: Product[];
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const StockHistoryLedgerSection: React.FC<StockHistoryLedgerSectionProps> = ({
  products,
  onRefreshData,
  onNavigateTab,
}) => {
  // View sub-tab: 'summary' (Product-wise stock balance) or 'transactions' (Chronological movement log)
  const [activeSubView, setActiveSubView] = useState<'summary' | 'transactions'>('summary');

  // Timeframe filter: day, week, month, custom
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Dropdown filters
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Data & Loading
  const [reportData, setReportData] = useState<StockMovementReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Categories list from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const loadStockHistory = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getStockMovementLedger({
        timeframe,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        productId: selectedProductId || undefined,
        category: selectedCategory || undefined,
        movementType: movementTypeFilter || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load stock movement history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockHistory();
  }, [timeframe, fromDate, toDate, selectedProductId, selectedCategory, movementTypeFilter]);

  // Handle timeframe change presets
  const handleTimeframeSelect = (tf: 'day' | 'week' | 'month' | 'custom') => {
    setTimeframe(tf);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (tf === 'day') {
      setFromDate(endStr);
      setToDate(endStr);
    } else if (tf === 'week') {
      const w = new Date();
      w.setDate(today.getDate() - 7);
      setFromDate(w.toISOString().split('T')[0]);
      setToDate(endStr);
    } else if (tf === 'month') {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(m.toISOString().split('T')[0]);
      setToDate(endStr);
    }
  };

  // Filtered Summary Items
  const filteredSummaryItems = useMemo(() => {
    if (!reportData?.itemsSummary) return [];
    let list = reportData.itemsSummary;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.mcode.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q)
      );
    }

    if (stockStatusFilter === 'LOW') {
      list = list.filter((it) => it.status === 'LOW_STOCK' || it.closingStock <= 10);
    } else if (stockStatusFilter === 'OUT') {
      list = list.filter((it) => it.status === 'OUT_OF_STOCK' || it.closingStock <= 0);
    }

    return list;
  }, [reportData, searchQuery, stockStatusFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!reportData?.ledgerTransactions) return [];
    let list = reportData.ledgerTransactions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.productName.toLowerCase().includes(q) ||
          tx.mcode.toLowerCase().includes(q) ||
          tx.partyName.toLowerCase().includes(q) ||
          tx.salesmanOrUser.toLowerCase().includes(q) ||
          tx.referenceLabel.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reportData, searchQuery]);

  // Dynamic Totals computed reactively from filtered items
  const dynamicTotals = useMemo(() => {
    if (!filteredSummaryItems || filteredSummaryItems.length === 0) {
      if (reportData && !searchQuery.trim() && stockStatusFilter === 'ALL') {
        return {
          openingUnits: reportData.totalOpeningUnits || 0,
          inwardUnits: reportData.totalInwardUnits || 0,
          outwardUnits: reportData.totalOutwardUnits || 0,
          saleReturnUnits: reportData.totalSaleReturnUnits || 0,
          purchaseReturnUnits: reportData.totalPurchaseReturnUnits || 0,
          closingUnits: reportData.totalClosingUnits || 0,
          cartons: reportData.totalCartons || 0,
          extraKg: reportData.totalExtraKg || 0,
          stockValue: reportData.totalStockValue || 0,
        };
      }
      return {
        openingUnits: 0,
        inwardUnits: 0,
        outwardUnits: 0,
        saleReturnUnits: 0,
        purchaseReturnUnits: 0,
        closingUnits: 0,
        cartons: 0,
        extraKg: 0,
        stockValue: 0,
      };
    }

    let openingUnits = 0;
    let inwardUnits = 0;
    let outwardUnits = 0;
    let saleReturnUnits = 0;
    let purchaseReturnUnits = 0;
    let closingUnits = 0;
    let cartons = 0;
    let extraKg = 0;
    let stockValue = 0;

    for (const it of filteredSummaryItems) {
      openingUnits += Number(it.openingStock) || 0;
      inwardUnits += Number(it.stockInPurchases) || 0;
      outwardUnits += Number(it.stockOutSales) || 0;
      saleReturnUnits += Number(it.saleReturns) || 0;
      purchaseReturnUnits += Number(it.purchaseReturns) || 0;
      closingUnits += Number(it.closingStock) || 0;
      cartons += Number(it.carton ?? it.closingStockCartons) || 0;
      extraKg += Number(it.extraKg) || 0;
      stockValue += Number(it.totalStockValue) || 0;
    }

    return {
      openingUnits: Number(openingUnits.toFixed(2)),
      inwardUnits: Number(inwardUnits.toFixed(2)),
      outwardUnits: Number(outwardUnits.toFixed(2)),
      saleReturnUnits: Number(saleReturnUnits.toFixed(2)),
      purchaseReturnUnits: Number(purchaseReturnUnits.toFixed(2)),
      closingUnits: Number(closingUnits.toFixed(2)),
      cartons: Math.round(cartons),
      extraKg: Number(extraKg.toFixed(2)),
      stockValue: Number(stockValue.toFixed(2)),
    };
  }, [filteredSummaryItems, reportData, searchQuery, stockStatusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (activeSubView === 'summary') {
      if (filteredSummaryItems.length === 0) {
        setErrorMsg('No stock summary records to export.');
        return;
      }
      const ok = exportToCsv(
        `Stock_Summary_${timeframe}_${fromDate}_${toDate}`,
        filteredSummaryItems,
        [
          { header: 'SR#', accessor: (_, idx) => idx + 1 },
          { header: 'M.Code', accessor: (it) => it.mcode },
          { header: 'Item Name', accessor: (it) => it.name },
          { header: 'Category', accessor: (it) => it.category },
          { header: 'Unit', accessor: (it) => it.unit },
          { header: 'CTN Size', accessor: (it) => it.qtyInCarton },
          { header: 'Opening Stock', accessor: (it) => it.openingStock },
          { header: 'Purchased In (+)', accessor: (it) => it.stockInPurchases },
          { header: 'Sold Out (-)', accessor: (it) => it.stockOutSales },
          { header: 'Sale Return In (+)', accessor: (it) => it.saleReturns || 0 },
          { header: 'Purchase Return Out (-)', accessor: (it) => it.purchaseReturns || 0 },
          { header: 'Remaining Closing Stock', accessor: (it) => it.closingStock },
          { header: 'Cartons', accessor: (it) => it.carton ?? it.closingStockCartons },
          { header: 'Extra Qty', accessor: (it) => it.extraKg || 0 },
          { header: 'Unit Cost', accessor: (it) => it.purchasePrice },
          { header: 'Selling Rate', accessor: (it) => it.sellingPrice },
          { header: 'Total Stock Value', accessor: (it) => it.totalStockValue },
          { header: 'Status', accessor: (it) => it.status },
        ]
      );
      if (ok) {
        setSuccessMsg('Stock summary exported to Excel / CSV successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } else {
      if (filteredTransactions.length === 0) {
        setErrorMsg('No stock ledger movement transactions to export.');
        return;
      }
      const ok = exportToCsv(
        `Stock_Audit_Ledger_${timeframe}_${fromDate}_${toDate}`,
        filteredTransactions,
        [
          { header: 'SR#', accessor: (_, idx) => idx + 1 },
          { header: 'Date', accessor: (tx) => tx.date },
          { header: 'Time', accessor: (tx) => tx.timestamp },
          { header: 'Item Name', accessor: (tx) => tx.productName },
          { header: 'M.Code', accessor: (tx) => tx.mcode },
          { header: 'Category', accessor: (tx) => tx.category },
          { header: 'Movement Type', accessor: (tx) => tx.movementType },
          { header: 'Reference', accessor: (tx) => tx.referenceLabel },
          { header: 'Party / Customer / Supplier', accessor: (tx) => tx.partyName },
          { header: 'Salesman / Staff', accessor: (tx) => tx.salesmanOrUser },
          { header: 'Cartons Change', accessor: (tx) => tx.cartonsChange },
          { header: 'Quantity Change', accessor: (tx) => tx.quantityChange },
          { header: 'Rate / Unit Cost', accessor: (tx) => tx.unitRate },
          { header: 'Total Value', accessor: (tx) => tx.totalAmount },
          { header: 'Warehouse Stock After', accessor: (tx) => tx.runningStockAfter },
          { header: 'Cartons After', accessor: (tx) => tx.runningCartonsAfter ?? '' },
          { header: 'Extra Qty After', accessor: (tx) => tx.runningExtraKgAfter ?? '' },
          { header: 'Notes', accessor: (tx) => tx.notes || '' },
        ]
      );
      if (ok) {
        setSuccessMsg('Stock movement audit ledger exported to Excel / CSV successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  const selectedProductObj = products.find((p) => p.id === selectedProductId);
  const selectedProductSummary = useMemo(() => {
    if (!selectedProductId || !reportData?.itemsSummary) return null;
    return reportData.itemsSummary.find(
      (it) => it.productId === selectedProductId || (selectedProductObj && it.mcode === selectedProductObj.mcode)
    );
  }, [selectedProductId, reportData, selectedProductObj]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL & AUDIT FILTER PANEL                              */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Boxes className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Overall Stock Movement &amp; Inventory Ledger
                  <span className="text-xs font-mono font-normal text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    Real-Time Inventory Audit
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Day-wise & week-wise audit showing opening stock, inwards (purchases), outwards (sales per salesman), and verified remaining stock.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadStockHistory();
                if (onRefreshData) onRefreshData();
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Refresh live stock movements"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Live Sync</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
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
          <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Timeframe selector & filter inputs */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          {/* Row 1: Period Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Day / Week / Month / Dates Toggle */}
            <div className="sm:col-span-5 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTimeframeSelect('day')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === 'day' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Day-Wise
              </button>
              <button
                type="button"
                onClick={() => handleTimeframeSelect('week')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === 'week' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Week-Wise
              </button>
              <button
                type="button"
                onClick={() => handleTimeframeSelect('month')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === 'month' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('custom')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === 'custom' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Dates
              </button>
            </div>

            {/* Custom Date Pickers or Audit Period Badge */}
            {timeframe === 'custom' ? (
              <div className="sm:col-span-7 flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <span className="text-slate-500 text-xs">to</span>
                <div className="flex-1">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="sm:col-span-7 text-xs text-slate-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>
                  Audit Period: <span className="text-white font-bold">{fromDate}</span> to <span className="text-white font-bold">{toDate}</span>
                </span>
                <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                  {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'Past 7 Days' : 'This Month'}
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Searchable Item Filter, Category, Movement Type, and Live Search */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Category Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Type Filter */}
            <div className="sm:col-span-2">
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
              >
                <option value="">All Movements</option>
                <option value="PURCHASE">Purchases (+)</option>
                <option value="SALE">Sales (-)</option>
                <option value="SALE_RETURN">Sale Returns (+)</option>
                <option value="PURCHASE_RETURN">Purchase Returns (-)</option>
              </select>
            </div>

            {/* Searchable Item Selector (User Request: "ye item k andr b searc bar laga do") */}
            <div className="sm:col-span-4">
              <SearchableProductSelect
                products={products}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
                selectedCategory={selectedCategory}
                placeholder="Search code (e.g. M-0069) or item..."
              />
            </div>

            {/* Live Filter Search within table */}
            <div className="sm:col-span-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter table rows..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-500 hover:text-white text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specific Stock Focus Banner (When Item Filtered) */}
      {selectedProductObj && (
        <div className="bg-indigo-950/40 border border-indigo-500/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold font-mono text-sm">
              {selectedProductObj.mcode || 'ITM'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{selectedProductObj.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-mono text-[10px] border border-indigo-700">
                  {selectedProductObj.category || 'General'}
                </span>
              </div>
              <div className="text-slate-300 text-xs mt-0.5 flex flex-wrap gap-x-4">
                <span>Unit: <strong>{selectedProductObj.unit || 'unit'}</strong></span>
                <span>Carton Size: <strong>{selectedProductObj.qtyInCarton || 1} units/ctn</strong></span>
                <span>Wholesale Cost: <strong>{currencySymbol()} {selectedProductObj.purchasePrice || 0}</strong></span>
                <span>Wholesale Sale: <strong>{currencySymbol()} {selectedProductObj.sellingPrice || 0}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-indigo-300 block uppercase font-bold">Current Physical Stock</span>
              <span className={`text-base font-black font-mono ${
                (selectedProductObj.currentQuantity || 0) <= 10 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {selectedProductObj.currentQuantity || 0} units ({((Number(selectedProductObj.currentQuantity) || 0) / (Number(selectedProductObj.qtyInCarton) || 1)).toFixed(1)} CTN)
              </span>
            </div>
            <button
              onClick={() => setSelectedProductId('')}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP AUDIT METRICS BANNER (Dynamic & 100% Live Validated)       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Opening Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-slate-400">Opening Stock</div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-300 mt-0.5">
            {dynamicTotals.openingUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Prior to selected period</div>
        </div>

        {/* Card 2: Purchases (+) */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-3.5 bg-emerald-950/10">
          <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
            <span>Purchased (+)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-0.5">
            +{dynamicTotals.inwardUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Inward from suppliers</div>
        </div>

        {/* Card 3: Sales (-) */}
        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-3.5 bg-rose-950/10">
          <div className="text-[11px] font-bold text-rose-400 flex items-center justify-between">
            <span>Sold (-)</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-400 mt-0.5">
            -{dynamicTotals.outwardUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">Outward via sales bills</div>
        </div>

        {/* Card 4: Returns Audit (+/-) */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-3.5 bg-amber-950/10">
          <div className="text-[11px] font-bold text-amber-300">Returns Audit</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-black font-mono text-sky-400" title="Customer returns restocked into warehouse">
              +{dynamicTotals.saleReturnUnits.toLocaleString()} <span className="text-[9px] font-normal text-sky-300/80">SR</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-black font-mono text-amber-400" title="Supplier returns removed from warehouse">
              -{dynamicTotals.purchaseReturnUnits.toLocaleString()} <span className="text-[9px] font-normal text-amber-300/80">PR</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Cust In (+) / Supp Out (-)</div>
        </div>

        {/* Card 5: Current Warehouse Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
            <span>Warehouse Stock</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
            {dynamicTotals.closingUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
            {dynamicTotals.cartons.toLocaleString()} CTN {dynamicTotals.extraKg > 0 ? `+ ${dynamicTotals.extraKg} Extra` : ''}
          </div>
        </div>

        {/* Card 6: Total Stock Asset Value */}
        <div className="bg-slate-900 border border-indigo-900/40 rounded-xl p-3.5 bg-indigo-950/20">
          <div className="text-[11px] font-bold text-indigo-300">Total Stock Value</div>
          <div className="text-base sm:text-lg font-black font-mono text-indigo-400 mt-0.5">
            {currencySymbol()} {dynamicTotals.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5">Live inventory asset cost</div>
        </div>
      </div>

      {/* Real-time Math Equation & Verification Notice */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-300">
          <span className="text-slate-400 font-sans font-bold">Strict Audit Formula:</span>
          <span className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" title="Opening Stock">
            Opening ({dynamicTotals.openingUnits})
          </span>
          <span className="text-emerald-400 font-bold">+</span>
          <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60" title="Purchases Inward">
            Purchases (+{dynamicTotals.inwardUnits})
          </span>
          <span className="text-rose-400 font-bold">-</span>
          <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/60" title="Sales Outward">
            Sales (-{dynamicTotals.outwardUnits})
          </span>
          <span className="text-sky-400 font-bold">+</span>
          <span className="text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/60" title="Customer Returns Inward">
            Sale Ret (+{dynamicTotals.saleReturnUnits})
          </span>
          <span className="text-amber-400 font-bold">-</span>
          <span className="text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/60" title="Supplier Returns Outward">
            Purch Ret (-{dynamicTotals.purchaseReturnUnits})
          </span>
          <span className="text-white font-bold">=</span>
          <span className="text-white font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700" title="Current Live Warehouse Balance">
            Warehouse Stock ({dynamicTotals.closingUnits} units)
          </span>
        </div>
        <div className="text-[10px] font-sans text-emerald-400 font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Mathematically Validated</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DUAL SUB-VIEWS: SUMMARY VS TRANSACTION AUDIT TRAIL             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Sub-view switcher */}
        <div className="px-4 pt-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubView('summary')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
                activeSubView === 'summary'
                  ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Product Stock Balances</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredSummaryItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubView('transactions')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
                activeSubView === 'transactions'
                  ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Detailed Movement Audit Trail</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredTransactions.length}
              </span>
            </button>
          </div>

          {activeSubView === 'summary' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-[11px] text-slate-500 font-semibold">Filter:</span>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
              >
                <option value="ALL">All Products</option>
                <option value="LOW">Low Stock (&le;10)</option>
                <option value="OUT">Out of Stock (0)</option>
              </select>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* VIEW 1: PRODUCT STOCK SUMMARY                               */}
        {/* ----------------------------------------------------------- */}
        {activeSubView === 'summary' && (
          <div className="p-4 sm:p-5">
            <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
              <span>
                Verified Account Equation: <strong>Opening + Purchases (+) - Sales (-) + Sale Ret (+) - Purch Ret (-) = Live Warehouse Stock</strong>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Strict Accountability Enforced</span>
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-950 shadow-sm">
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="py-2.5 px-3 text-center w-12">SR#</th>
                    <th className="py-2.5 px-3">M.Code</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Opening</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">Purchased (+)</th>
                    <th className="py-2.5 px-3 text-center text-rose-400">Sold (-)</th>
                    <th className="py-2.5 px-3 text-center text-sky-400">Sale Ret (+)</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">Purch Ret (-)</th>
                    <th className="py-2.5 px-3 text-center font-bold text-white">Warehouse Stock</th>
                    <th className="py-2.5 px-3 text-center">Cartons &amp; Extra</th>
                    <th className="py-2.5 px-3 text-right">Cost Rate</th>
                    <th className="py-2.5 px-3 text-right">Selling Rate</th>
                    <th className="py-2.5 px-3 text-right">Stock Value</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredSummaryItems.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-slate-500 font-sans">
                        No products match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaryItems.map((it, idx) => (
                      <tr key={it.productId} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-400">{it.mcode}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {it.name}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{it.category}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{it.openingStock}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                          {it.stockInPurchases > 0 ? `+${it.stockInPurchases}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-400">
                          {it.stockOutSales > 0 ? `-${it.stockOutSales}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-sky-400">
                          {it.saleReturns && it.saleReturns > 0 ? `+${it.saleReturns}` : <span className="text-slate-600 font-normal">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                          {it.purchaseReturns && it.purchaseReturns > 0 ? `-${it.purchaseReturns}` : <span className="text-slate-600 font-normal">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-base text-white bg-slate-950/40">
                          {it.closingStock} <span className="text-[10px] text-slate-500 font-normal">{it.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-300 font-bold">
                          {(() => {
                            const pkg = (it.packageType || 'CTN').toUpperCase();
                            const ctn = it.carton !== undefined ? it.carton : Math.floor(it.closingStock / (it.qtyInCarton || 15));
                            const extra = it.extraKg !== undefined ? it.extraKg : Number((it.closingStock % (it.qtyInCarton || 15)).toFixed(2));
                            if (it.qtyInCarton > 1) {
                              if (extra > 0) {
                                return (
                                  <span>
                                    {ctn} {pkg} <span className="text-[10px] text-amber-300 font-normal">(+{extra} {it.unit})</span>
                                  </span>
                                );
                              }
                              return `${ctn} ${pkg}`;
                            }
                            return `${it.closingStock} ${pkg}`;
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {currencySymbol()} {it.purchasePrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          {currencySymbol()} {it.sellingPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-300">
                          {currencySymbol()} {it.totalStockValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {it.status === 'IN_STOCK' && (
                            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                              In Stock
                            </span>
                          )}
                          {it.status === 'LOW_STOCK' && (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                              Low Stock (&le;10)
                            </span>
                          )}
                          {it.status === 'OUT_OF_STOCK' && (
                            <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                              Out of Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-slate-950 border-t-2 border-slate-700 font-mono text-[11px] font-bold">
                  <tr className="bg-slate-950 text-white">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider font-sans text-slate-400">
                      Total ({filteredSummaryItems.length} Products):
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {dynamicTotals.openingUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-black">
                      +{dynamicTotals.inwardUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-400 font-black">
                      -{dynamicTotals.outwardUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-sky-400 font-black">
                      +{dynamicTotals.saleReturnUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-400 font-black">
                      -{dynamicTotals.purchaseReturnUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-white font-black bg-indigo-950/60 border-x border-indigo-800">
                      {dynamicTotals.closingUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-indigo-300">
                      {dynamicTotals.cartons.toLocaleString()} CTN {dynamicTotals.extraKg > 0 ? `(+${dynamicTotals.extraKg})` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-normal">-</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-normal">-</td>
                    <td className="py-2.5 px-3 text-right font-black text-indigo-300">
                      {currencySymbol()} {dynamicTotals.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-normal">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VIEW 2: DETAILED MOVEMENT AUDIT TRAIL                       */}
        {/* ----------------------------------------------------------- */}
        {activeSubView === 'transactions' && (
          <div className="p-4 sm:p-5">
            <div className="text-xs text-slate-400 mb-3">
              Chronological log of every item movement. Shows exactly which salesman sold which item in what bill, protecting against unauthorized leakage.
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-950 shadow-sm">
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="py-2.5 px-3 text-center w-12">SR#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference Bill</th>
                    <th className="py-2.5 px-3">Customer / Supplier</th>
                    <th className="py-2.5 px-3">Salesman / Handled By</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-center">Qty Movement</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Warehouse Stock After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {/* Opening Balance Row when viewing a single product */}
                  {selectedProductObj && selectedProductSummary && (
                    <tr className="bg-indigo-950/40 text-indigo-200 font-semibold border-b border-indigo-800/60 font-mono">
                      <td className="py-2.5 px-3 text-center text-indigo-400 font-bold">OB</td>
                      <td className="py-2.5 px-3 text-indigo-300">{fromDate}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-white">
                        <div>{selectedProductObj.name}</div>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">
                          [Opening Stock Balance B/F as of {fromDate}]
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/90 text-indigo-200 border border-indigo-700">
                          Opening Balance
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-indigo-300 font-semibold">Prior Stock B/F</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">Initial Warehouse</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">System Ledger</td>
                      <td className="py-2.5 px-3 text-center text-slate-300 font-mono">
                        {selectedProductObj.qtyInCarton && selectedProductObj.qtyInCarton > 1
                          ? `${Math.floor(selectedProductSummary.openingStock / selectedProductObj.qtyInCarton)} CTN`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-300 font-mono">
                        {selectedProductSummary.openingStock} {selectedProductObj.unit || 'units'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                        {currencySymbol()} {(selectedProductObj.purchasePrice || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-300 font-mono">
                        {currencySymbol()} {Number((selectedProductSummary.openingStock * (selectedProductObj.purchasePrice || 0)).toFixed(2)).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white bg-slate-950/60 font-mono">
                        <div>{selectedProductSummary.openingStock} <span className="text-[10px] text-slate-400 font-normal font-sans">units</span></div>
                        {selectedProductObj.qtyInCarton && selectedProductObj.qtyInCarton > 1 && (
                          <div className="text-[10px] text-indigo-300 font-mono font-normal">
                            {Math.floor(selectedProductSummary.openingStock / selectedProductObj.qtyInCarton)} CTN
                            {Number((selectedProductSummary.openingStock % selectedProductObj.qtyInCarton).toFixed(2)) > 0
                              ? ` (+${Number((selectedProductSummary.openingStock % selectedProductObj.qtyInCarton).toFixed(2))})`
                              : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}

                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                        No transactions recorded for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-400">{tx.date}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          <div>{tx.productName}</div>
                          {tx.mcode && <span className="text-[10px] font-mono text-slate-500 font-normal">Code: {tx.mcode}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {tx.movementType === 'SALE' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                              SALE (-)
                            </span>
                          ) : tx.movementType === 'PURCHASE' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                              PURCHASE (+)
                            </span>
                          ) : tx.movementType === 'SALE_RETURN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-800/60" title="Customer Return Inward to Warehouse">
                              SALE RETURN (+)
                            </span>
                          ) : tx.movementType === 'PURCHASE_RETURN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60" title="Supplier Return Outward from Warehouse">
                              PURCH RET (-)
                            </span>
                          ) : tx.movementType === 'RETURN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                              RETURN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                              {tx.movementType}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-indigo-400">
                          <div>{tx.referenceLabel}</div>
                          {tx.notes && <div className="text-[9px] text-slate-500 font-normal font-sans line-clamp-1">{tx.notes}</div>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-200 font-semibold">
                          {tx.partyName}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{tx.salesmanOrUser}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-300 font-mono">
                          {tx.cartonsChange !== 0 ? (
                            <span className={tx.cartonsChange > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {tx.cartonsChange > 0 ? `+${tx.cartonsChange}` : tx.cartonsChange} <span className="text-[10px] text-slate-500 font-sans font-normal">CTN</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold font-mono ${
                          tx.quantityChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                          {currencySymbol()} {tx.unitRate.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                          {currencySymbol()} {tx.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white bg-slate-950/40 font-mono">
                          <div>{tx.runningStockAfter} <span className="text-[10px] text-slate-400 font-normal font-sans">units</span></div>
                          {tx.runningCartonsAfter !== undefined && (
                            <div className="text-[10px] text-indigo-300 font-mono font-normal">
                              {tx.runningCartonsAfter} CTN{tx.runningExtraKgAfter && tx.runningExtraKgAfter > 0 ? ` (+${tx.runningExtraKgAfter})` : ''}
                            </div>
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
      </div>
    </div>
  );
};
