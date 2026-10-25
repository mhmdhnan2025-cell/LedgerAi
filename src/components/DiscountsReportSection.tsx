import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  RefreshCw,
  Percent,
  Receipt,
  Banknote,
  Tag,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { DiscountReportItem, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';
import { exportToCsv } from '../utils/exportCsv';

interface DiscountsReportSectionProps {
  companyProfile?: CompanyProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export const DiscountsReportSection: React.FC<DiscountsReportSectionProps> = ({
  companyProfile,
  onNavigateTab,
}) => {
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'invoice' | 'voucher' | 'sale_return' | 'purchase_return'>('all');
  const [items, setItems] = useState<DiscountReportItem[]>([]);
  const [totalBillDiscount, setTotalBillDiscount] = useState<number>(0);
  const [totalVoucherDiscount, setTotalVoucherDiscount] = useState<number>(0);
  const [totalSaleReturnDiscount, setTotalSaleReturnDiscount] = useState<number>(0);
  const [totalPurchaseReturnDiscount, setTotalPurchaseReturnDiscount] = useState<number>(0);
  const [totalDiscounts, setTotalDiscounts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getDiscountsReport(fromDate, toDate);
      setItems(res.items || []);
      setTotalBillDiscount(res.totalBillDiscount || 0);
      setTotalVoucherDiscount(res.totalVoucherDiscount || 0);
      setTotalSaleReturnDiscount(res.totalSaleReturnDiscount || 0);
      setTotalPurchaseReturnDiscount(res.totalPurchaseReturnDiscount || 0);
      setTotalDiscounts(res.totalDiscounts || 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Discounts Report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [fromDate, toDate]);

  // Quick Preset Filters
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setFromDate(firstDay);
    setToDate(today);
  };

  const handleSetAllTime = () => {
    setFromDate('');
    setToDate('');
  };

  // Filtered Items based on search and source filter
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Source filter
      if (sourceFilter === 'invoice' && !it.source.toLowerCase().includes('bill')) return false;
      if (sourceFilter === 'voucher' && !it.source.toLowerCase().includes('voucher') && !it.source.toLowerCase().includes('receipt') && !it.source.toLowerCase().includes('payment')) return false;
      if (sourceFilter === 'sale_return' && !it.source.toLowerCase().includes('sale return')) return false;
      if (sourceFilter === 'purchase_return' && !it.source.toLowerCase().includes('purchase return')) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        it.partyName.toLowerCase().includes(q) ||
        (it.partyCode && it.partyCode.toLowerCase().includes(q)) ||
        it.refNumber.toLowerCase().includes(q) ||
        it.source.toLowerCase().includes(q) ||
        (it.notes && it.notes.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery, sourceFilter]);

  // Totals for filtered view
  const filteredTotals = useMemo(() => {
    const totalDisc = filteredItems.reduce((sum, it) => sum + it.discountAmount, 0);
    const totalGross = filteredItems.reduce((sum, it) => sum + it.amount, 0);
    return {
      discount: Number(totalDisc.toFixed(2)),
      gross: Number(totalGross.toFixed(2)),
      count: filteredItems.length,
    };
  }, [filteredItems]);

  // CSV Export
  const handleExportCSV = () => {
    const filename = `Discounts_Report_${fromDate || 'All'}_to_${toDate || 'All'}`;
    const headers = [
      'Sr#',
      'Date',
      'Reference / Voucher#',
      'Source Type',
      'Party / Customer Name',
      'Party Code',
      'Gross / Bill Amount',
      'Discount Allowed',
      'Notes / Narration',
    ];
    const rows = filteredItems.map((it, idx) => [
      String(idx + 1),
      it.date,
      it.refNumber,
      it.source,
      it.partyName,
      it.partyCode || '',
      it.amount.toFixed(2),
      it.discountAmount.toFixed(2),
      it.notes || '',
    ]);

    rows.push([
      'TOTAL:',
      '',
      '',
      '',
      '',
      '',
      filteredTotals.gross.toFixed(2),
      filteredTotals.discount.toFixed(2),
      '',
    ]);

    exportToCsv(filename, [headers, ...rows]);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* PRINT STYLES                                                   */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #discounts-print-area, #discounts-print-area * {
            visibility: visible;
          }
          #discounts-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROLS & HEADER                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Party Discounts Report
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {filteredItems.length} entries
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detailed audit register of all discounts given at billing and cash/bank voucher settlement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadReport}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
              title="Refresh Report"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Source Type</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Discount Sources</option>
              <option value="invoice">Sale Bills (Invoices) Only</option>
              <option value="voucher">Cash/Bank Vouchers Only</option>
              <option value="sale_return">Sale Returns Only</option>
              <option value="purchase_return">Purchase Returns Only</option>
            </select>
          </div>

          {/* Search Party */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Party, bill#, voucher#..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Shortcuts */}
        <div className="flex items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500">Quick:</span>
          <button
            onClick={handleSetToday}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
          >
            Today
          </button>
          <button
            onClick={handleSetThisMonth}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
          >
            This Month
          </button>
          <button
            onClick={handleSetAllTime}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
          >
            All Time
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUMMARY KPI CARDS                                              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 no-print">
        {/* Total Discounts */}
        <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-800/40 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-300/90 font-bold mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <Percent className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Total Discounts
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">
              All
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-amber-400">
            {currencySymbol()} {filteredTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            100% minus from profit
          </div>
        </div>

        {/* Sale Bills Discount */}
        <div className="bg-gradient-to-br from-blue-950/30 to-slate-900 border border-blue-800/30 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-blue-300/90 font-bold mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <Receipt className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              Sale Bill Disc
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">
              Invoices
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-blue-400">
            {currencySymbol()} {totalBillDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            At invoice creation
          </div>
        </div>

        {/* Cash & Bank Voucher Discount */}
        <div className="bg-gradient-to-br from-purple-950/30 to-slate-900 border border-purple-800/30 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-purple-300/90 font-bold mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <Banknote className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              Voucher Disc
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded">
              Khata
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-purple-400">
            {currencySymbol()} {totalVoucherDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Khata settlement
          </div>
        </div>

        {/* Sale Return Discount */}
        <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-800/30 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-orange-300/90 font-bold mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <RefreshCw className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              Sale Return Disc
            </span>
            <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1 py-0.5 rounded">
              Returns
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-orange-400">
            {currencySymbol()} {totalSaleReturnDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Customer return credit
          </div>
        </div>

        {/* Purchase Return Discount */}
        <div className="bg-gradient-to-br from-teal-950/30 to-slate-900 border border-teal-800/30 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-teal-300/90 font-bold mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <Tag className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              Purch Return Disc
            </span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1 py-0.5 rounded">
              Vendor
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-teal-400">
            {currencySymbol()} {totalPurchaseReturnDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Vendor return concession
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DATA TABLE (PRINTABLE)                                         */}
      {/* ------------------------------------------------------------- */}
      <div id="discounts-print-area" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b border-slate-700 bg-white text-slate-900">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{companyProfile?.name || 'RESTAURANT ERP'}</h1>
              <h2 className="text-sm font-semibold text-slate-700">PARTY DISCOUNTS AUDIT REPORT</h2>
              <p className="text-xs text-slate-500">
                Period: {fromDate || 'Start'} to {toDate || 'Present'} &bull; Printed: {new Date().toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">TOTAL DISCOUNTS</div>
              <div className="text-lg font-bold font-mono text-amber-700">
                {currencySymbol()} {filteredTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs">Loading discounts report data...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 text-center text-red-400 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-xs">{errorMsg}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Tag className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-semibold">No discounts found for the selected filter criteria.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Sr#</th>
                  <th className="py-2.5 px-3 w-24">Date</th>
                  <th className="py-2.5 px-3 w-32">Ref / Voucher#</th>
                  <th className="py-2.5 px-3 w-36">Source Type</th>
                  <th className="py-2.5 px-3">Party / Customer</th>
                  <th className="py-2.5 px-3 text-right w-28">Bill / Amount</th>
                  <th className="py-2.5 px-3 text-right w-28">Discount Allowed</th>
                  <th className="py-2.5 px-3">Notes / Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredItems.map((it, idx) => {
                  const isInvoice = it.source.toLowerCase().includes('bill');
                  const isSaleReturn = it.source.toLowerCase().includes('sale return');
                  const isPurchaseReturn = it.source.toLowerCase().includes('purchase return');
                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300 font-semibold whitespace-nowrap">
                        {it.date}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                        {it.refNumber}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isInvoice
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : isSaleReturn
                              ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                              : isPurchaseReturn
                              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                              : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          }`}
                        >
                          {it.source}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-white capitalize">{it.partyName}</div>
                        {it.partyCode && (
                          <div className="text-[10px] font-mono text-slate-500">Code: {it.partyCode}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                        {currencySymbol()} {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                        &minus; {currencySymbol()} {it.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs" title={it.notes || ''}>
                        {it.notes || '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950 font-semibold text-xs border-t-2 border-slate-800 text-white">
                <tr>
                  <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider font-bold text-slate-400">
                    Total Discounts ({filteredItems.length} records):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {currencySymbol()} {filteredTotals.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap text-sm">
                    &minus; {currencySymbol()} {filteredTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
