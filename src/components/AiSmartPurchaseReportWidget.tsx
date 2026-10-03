import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  Building2,
  DollarSign,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PurchaseBill } from '../types';
import { currencySymbol } from '../utils/currency';

interface AiSmartPurchaseReportWidgetProps {
  data: {
    summary?: any;
    bills: PurchaseBill[];
  };
  onOpenVoucher: (bill: PurchaseBill) => void;
  companyName?: string;
}

export const AiSmartPurchaseReportWidget: React.FC<AiSmartPurchaseReportWidgetProps> = ({
  data,
  onOpenVoucher,
  companyName = 'Store',
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const bills = data.bills || [];

  // Extract unique suppliers with counts
  const supplierList = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bills) {
      const name = b.supplierAccountTitle || b.supplierName || 'Unknown Supplier';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [bills]);

  // Filtered bills based on supplier tab and search query
  const filteredBills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bills.filter((b) => {
      const supName = (b.supplierAccountTitle || b.supplierName || '').toLowerCase();
      if (selectedSupplier !== 'ALL' && supName !== selectedSupplier.toLowerCase()) {
        return false;
      }
      if (!q) return true;

      const billNo = (b.billNumber || '').toLowerCase();
      const vBill = (b.vendorBillNumber || '').toLowerCase();
      const gp = (b.gatePassNumber || '').toLowerCase();
      const date = (b.date || '').toLowerCase();
      const hasItem = (b.items || []).some(
        (it) =>
          it.itemTitle.toLowerCase().includes(q) ||
          (it.category && it.category.toLowerCase().includes(q))
      );

      return (
        billNo.includes(q) ||
        supName.includes(q) ||
        vBill.includes(q) ||
        gp.includes(q) ||
        date.includes(q) ||
        hasItem
      );
    });
  }, [bills, selectedSupplier, searchQuery]);

  // Totals of filtered bills
  const totals = useMemo(() => {
    let ctn = 0;
    let qty = 0;
    let gross = 0;
    let net = 0;
    let paid = 0;
    let balance = 0;

    for (const b of filteredBills) {
      ctn += Number(b.totalCtn) || 0;
      qty += Number(b.totalQty) || 0;
      gross += Number(b.grossAmount) || 0;
      net += Number(b.netTotal) || 0;
      paid += Number(b.paidAmount) || 0;
      balance += Number(b.remainingBalance) || 0;
    }

    return { ctn, qty, gross, net, paid, balance };
  }, [filteredBills]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedBillId((prev) => (prev === id ? null : id));
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="mt-3.5 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* 1. AI HEADER BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-inner">
            <Package className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                <span>Multi-Supplier Procurement &amp; Invoices</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Live Reconciled
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verified Wholesale Purchase Bills &bull; {companyName} &bull; Click any bill to inspect line items or print voucher
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
            title="Print Procurement Summary"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Print Summary</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS (Financial Ribbon) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
        {/* Total Invoices */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Kul Bills</span>
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1 font-mono">
            {filteredBills.length} <span className="text-[11px] font-medium text-slate-400">Bills</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {supplierList.length} Active Suppliers
          </div>
        </div>

        {/* Volume */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Kul Khareed Volume</span>
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1 font-mono">
            {totals.ctn} <span className="text-[11px] font-medium text-slate-400">CTN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totals.qty} Total Units
          </div>
        </div>

        {/* Total Net Purchases */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2.5 sm:p-3 col-span-2 sm:col-span-1 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Net Purchases</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-300 mt-1 font-mono">
            {currencySymbol()} {totals.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400/70 mt-0.5">
            Gross: {currencySymbol()} {totals.gross.toLocaleString()}
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3">
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center justify-between">
            <span>Ada Shuda (Paid)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-sky-300 mt-1 font-mono">
            {currencySymbol()} {totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cash &amp; Bank Transfer
          </div>
        </div>

        {/* Remaining Payables */}
        <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-2.5 sm:p-3 col-span-2 sm:col-span-1 shadow-sm">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>واجب الادا (Payables)</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-300 mt-1 font-mono">
            {currencySymbol()} {totals.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-400/80 font-semibold mt-0.5">
            Supplier Balance (CR)
          </div>
        </div>
      </div>

      {/* 3. SUPPLIER FILTER CHIPS & FAST SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Supplier Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedSupplier('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
              selectedSupplier === 'ALL'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Suppliers ({bills.length})
          </button>
          {supplierList.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedSupplier(s.name)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedSupplier.toLowerCase() === s.name.toLowerCase()
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-750'
              }`}
            >
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>{s.name}</span>
              <span className="px-1.5 py-0.2 bg-slate-900/60 rounded text-[10px] text-amber-300 font-mono">
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Real-time Search Box */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bill#, item, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* 4. MASTER PURCHASING BILLS TABLE (Matching media_1791028330689.png) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <div className="max-h-80 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800 backdrop-blur-xs">
              <tr>
                <th className="py-2.5 px-3">BILL#</th>
                <th className="py-2.5 px-2.5">V.BILL#</th>
                <th className="py-2.5 px-2.5">GP#</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3">SUPPLIER</th>
                <th className="py-2.5 px-3 text-right">CARTONS</th>
                <th className="py-2.5 px-3 text-right">QTY</th>
                <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-2.5 px-3 text-right">PAID</th>
                <th className="py-2.5 px-3 text-right text-amber-300">PAYABLES (واجب الادا)</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                    Koi purchase bills match nahi huay. Filter ya search adjust karein.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, idx) => {
                  const isExpanded = expandedBillId === (b.id || b.billNumber);
                  const isPaid = (b.remainingBalance || 0) <= 0;
                  const isPartial = (b.paidAmount || 0) > 0 && (b.remainingBalance || 0) > 0;
                  return (
                    <React.Fragment key={b.id || idx}>
                      <tr
                        onClick={() => onOpenVoucher(b)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition ${
                          isExpanded ? 'bg-slate-800/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400 flex items-center gap-1.5">
                          <span>{b.billNumber}</span>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[11px]">
                          {b.vendorBillNumber || '—'}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[11px]">
                          {b.gatePassNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px] whitespace-nowrap">
                          {b.date}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white max-w-[160px] truncate">
                          {b.supplierAccountTitle || b.supplierName || 'Supplier'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {Number(b.totalCtn || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {b.totalQty || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {currencySymbol()} {Number(b.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {currencySymbol()} {Number(b.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {currencySymbol()} {Number(b.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isPartial
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenVoucher(b);
                              }}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-bold transition shadow cursor-pointer flex items-center gap-1"
                              title="Open Full Purchase Voucher"
                            >
                              <span>≡ Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(b.id || b.billNumber, e)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
                              title={isExpanded ? 'Collapse Items' : 'Quick Item Breakdown'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 5. INLINE EXPANDED ITEM ACCORDION */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-amber-500/30">
                          <td colSpan={12} className="p-3 sm:p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-amber-400" />
                                <span className="font-bold text-white text-xs">
                                  Items Purchased in Bill #{b.billNumber} ({b.items?.length || 0} Products)
                                </span>
                                {b.notes && (
                                  <span className="text-[11px] text-slate-400 italic">
                                    &bull; Note: {b.notes}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onOpenVoucher(b)}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition shadow cursor-pointer flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Open Full Voucher &amp; Print</span>
                              </button>
                            </div>

                            {/* Itemized Mini Table */}
                            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="py-1.5 px-3">Item Name</th>
                                    <th className="py-1.5 px-2.5">Category</th>
                                    <th className="py-1.5 px-2.5 text-right">CTN</th>
                                    <th className="py-1.5 px-2.5 text-right">Extra Pcs</th>
                                    <th className="py-1.5 px-2.5 text-center">Unit</th>
                                    <th className="py-1.5 px-2.5 text-right">Rate/CTN</th>
                                    <th className="py-1.5 px-2.5 text-right">Total Qty</th>
                                    <th className="py-1.5 px-2.5 text-right">Rate</th>
                                    <th className="py-1.5 px-2.5 text-right">VAT%</th>
                                    <th className="py-1.5 px-3 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {b.items?.map((it, iIdx) => (
                                    <tr key={iIdx} className="hover:bg-slate-900/50">
                                      <td className="py-1.5 px-3 font-semibold text-white">
                                        {it.itemTitle}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-slate-400">
                                        {it.category || '—'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">
                                        {it.ctn}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-amber-300">
                                        {it.extraPiece || 0}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">
                                        {it.unit || 'CTN'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">
                                        {it.ratePerCtn ? `${currencySymbol()} ${it.ratePerCtn}` : '—'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-white">
                                        {it.qty}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">
                                        {currencySymbol()} {it.rate}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">
                                        {it.vatPercent || 0}%
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-400">
                                        {currencySymbol()} {Number(it.amount || 0).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. GRAND TOTAL ROW (Exactly like ERP Screenshot media_1791028330689.png) */}
        <div className="bg-slate-900 px-4 py-3 border-t-2 border-slate-700 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="font-extrabold uppercase tracking-wider text-slate-300 text-xs">
            GRAND TOTAL :
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono font-bold text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase mr-1">Cartons:</span>
              <span className="text-sky-400">{totals.ctn.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase mr-1">Qty:</span>
              <span className="text-white">{totals.qty}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase mr-1">Total:</span>
              <span className="text-emerald-400 font-extrabold text-sm">
                {currencySymbol()} {totals.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase mr-1">Paid:</span>
              <span className="text-sky-400">
                {currencySymbol()} {totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-amber-400 text-[10px] uppercase mr-1">Payables:</span>
              <span className="text-amber-400 font-extrabold text-sm">
                {currencySymbol()} {totals.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
