import { currencySymbol, adaptCurrencyText } from '../utils/currency';
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Layers,
  Loader2,
  Mic,
  MicOff,
  Package,
  Printer,
  Receipt,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { CompanyProfile, SaleBill, PurchaseBill, UserRole } from '../types';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { PurchaseBillVoucherModal } from './PurchaseBillVoucherModal';
import { MasterAuditReportModal } from './MasterAuditReportModal';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  companyProfile?: CompanyProfile | null;
  onDataMutated: () => void;
  initialQuery?: string;
}

// -------------------------------------------------------------
// SUB-COMPONENT: 3D Horizontal Bill Cards Carousel
// -------------------------------------------------------------
const BillCardsCarousel: React.FC<{
  bills: any[];
  isPurchase?: boolean;
  onOpenSaleBill: (bill: SaleBill) => void;
  onOpenPurchaseBill: (bill: PurchaseBill) => void;
}> = ({ bills, isPurchase = false, onOpenSaleBill, onOpenPurchaseBill }) => {
  if (!bills || bills.length === 0) return null;

  return (
    <div className="space-y-2 pt-1 w-full overflow-hidden">
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span className="font-semibold flex items-center gap-1.5 text-slate-300">
          <span>📜</span>
          <span>{isPurchase ? 'Supplier Purchase Vouchers' : 'Customer Tax Invoices'} ({bills.length} Bills)</span>
        </span>
        <span className="text-[10px] text-indigo-400 font-medium">Scroll horizontally &bull; Click to open</span>
      </div>

      <div className="flex gap-3.5 overflow-x-auto py-2.5 px-1 snap-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40">
        {bills.map((bill: any, idx: number) => {
          const isPurchaseBill = isPurchase || Boolean(bill.supplierAccountTitle || bill.supplierName || bill.vendorBillNumber);
          const billNo = bill.billNumber || bill.invoiceNumber || idx + 1;
          const partyTitle = isPurchaseBill
            ? (bill.supplierAccountTitle || bill.supplierName || 'Supplier')
            : (bill.customerAccountTitle || bill.customerName || 'Customer');
          const netTotal = bill.netTotal ?? bill.totalAmount ?? 0;
          const balance = isPurchaseBill ? (bill.remainingBalance ?? 0) : (bill.balanceReceivable ?? 0);
          const isPaid = balance <= 0;
          const itemCount = bill.items?.length || 0;
          const totalPkgs = bill.totalCartons || bill.totalCtn || bill.items?.reduce((s: number, i: any) => s + (Number(i.ctn) || 0), 0) || 0;

          return (
            <div
              key={bill.id || billNo || idx}
              onClick={() => {
                if (isPurchaseBill) {
                  onOpenPurchaseBill(bill);
                } else {
                  onOpenSaleBill(bill);
                }
              }}
              className="group relative shrink-0 w-[260px] sm:w-[280px] snap-center rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-4 border border-slate-700/80 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.03] hover:border-indigo-500/80 cursor-pointer flex flex-col justify-between select-none"
            >
              <div className="space-y-2">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded border ${
                    isPurchaseBill
                      ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  }`}>
                    {isPurchaseBill ? `Purchase Bill #${billNo}` : `Tax Invoice #${billNo}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{bill.date || 'Today'}</span>
                </div>

                {/* Party Title */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {isPurchaseBill ? 'Supplier / Vendor' : 'Customer / Restaurant'}
                  </div>
                  <div className="font-extrabold text-sm text-white truncate mt-0.5 group-hover:text-indigo-300 transition-colors">
                    {partyTitle}
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Total Billed:</span>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {currencySymbol()} {Number(netTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{isPurchaseBill ? 'Payable Due:' : 'Udhaar Due:'}</span>
                    <span className={`font-mono font-bold ${balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {currencySymbol()} {Number(balance).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{itemCount} Items {totalPkgs > 0 ? `(${totalPkgs} Pkgs)` : ''}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                    isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {isPaid ? 'PAID' : 'CREDIT / UDHAAR'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 mt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm ${
                    isPurchaseBill
                      ? 'bg-sky-600 hover:bg-sky-500 group-hover:bg-sky-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 group-hover:bg-emerald-500'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>👁️ Open {isPurchaseBill ? 'Voucher' : 'Invoice'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// SUB-COMPONENT: Stock Report Dual Widget (Image 5 Replica)
// -------------------------------------------------------------
const StockReportDualWidget: React.FC<{
  stockData?: any;
  products?: any[];
}> = ({ stockData, products = [] }) => {
  const [activeTab, setActiveTab] = useState<'balances' | 'trail'>('balances');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsSummary: any[] = stockData?.itemsSummary || products || [];
  const transactions: any[] = stockData?.ledgerTransactions || [];

  const filteredItems = itemsSummary.filter((item: any) => {
    const title = (item.productName || item.name || item.itemTitle || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return title.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());
  });

  const filteredTransactions = transactions.filter((tx: any) => {
    const name = (tx.productName || '').toLowerCase();
    const ref = (tx.referenceLabel || tx.partyName || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-2xl space-y-3 text-xs w-full">
      {/* Exact Tabs matching Image 5 */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-slate-950 text-indigo-400 border-indigo-500 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-950/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Product Stock Balances (اسٹاک کا موجودہ کھاتہ)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
            {itemsSummary.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trail')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
            activeTab === 'trail'
              ? 'bg-slate-950 text-indigo-400 border-indigo-500 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-950/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Detailed Movement Audit Trail (ایک ایک مال کی حرکت)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
            {transactions.length}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or category..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tab 1: Product Stock Balances */}
      {activeTab === 'balances' && (
        <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-[11px] min-w-[550px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Product Name</th>
                <th className="py-2 px-2 text-center">Packaging</th>
                <th className="py-2 px-2 text-right">In Stock (Pkgs)</th>
                <th className="py-2 px-2 text-right">Loose Qty</th>
                <th className="py-2 px-2 text-right">Cost Rate</th>
                <th className="py-2 px-2.5 text-right">Stock Valuation</th>
                <th className="py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredItems.map((item: any, iIdx: number) => {
                const name = item.productName || item.name || item.itemTitle || 'Item';
                const pkg = item.packageType ||
                  (name.toLowerCase().includes('bag') || name.toLowerCase().includes('bori') || name.toLowerCase().includes('sugar') || name.toLowerCase().includes('suger') || name.toLowerCase().includes('atta') || name.toLowerCase().includes('rice') || name.toLowerCase().includes('daal') ? 'Bag' :
                   name.toLowerCase().includes('box') || name.toLowerCase().includes('dabba') ? 'Box' :
                   name.toLowerCase().includes('tin') || name.toLowerCase().includes('drum') ? 'Tin' :
                   name.toLowerCase().includes('pack') ? 'Pack' : 'Carton');
                const pkgs = item.currentCtn ?? Math.floor((item.currentQuantity || 0) / (item.qtyInCarton || 1));
                const loose = item.currentBalance ?? item.currentQuantity ?? 0;
                const unit = item.unit || (pkg === 'Bag' ? 'KG' : 'Units');
                const rate = item.unitCost ?? item.purchasePrice ?? 0;
                const value = item.stockValue ?? (loose * rate);
                const isLow = loose <= (item.minStockLevel || 10);
                const isOut = loose <= 0;

                return (
                  <tr key={item.productId || item.id || iIdx} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-2.5 font-bold text-white">
                      {name}
                      <span className="block text-[9px] text-slate-500 font-normal">{item.category || 'General'}</span>
                    </td>
                    <td className="py-1.5 px-2 text-center text-sky-400 font-medium">
                      {pkg}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-200">
                      {pkgs} {pkg}s
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">
                      {loose} {unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-300">
                      {currencySymbol()} {Number(rate).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-black text-white">
                      {currencySymbol()} {Number(value).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        isOut ? 'bg-rose-500/20 text-rose-400' : isLow ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isOut ? 'OUT' : isLow ? 'LOW' : 'IN STOCK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Detailed Movement Audit Trail */}
      {activeTab === 'trail' && (
        <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-[11px] min-w-[620px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Date</th>
                <th className="py-2 px-2 text-center">Movement</th>
                <th className="py-2 px-2">Item</th>
                <th className="py-2 px-2">Ref / Party</th>
                <th className="py-2 px-2 text-right">Pkgs &bull; Loose</th>
                <th className="py-2 px-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredTransactions.map((tx: any, tIdx: number) => {
                const isPurchaseTx = tx.movementType === 'PURCHASE';
                const sign = isPurchaseTx ? '+' : '-';
                const ctnChg = Math.abs(tx.cartonsChange || 0);
                const qtyChg = Math.abs(tx.quantityChange || 0);

                return (
                  <tr key={tx.id || tIdx} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {tx.date || 'Today'}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        isPurchaseTx ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {isPurchaseTx ? '📥 INWARD' : '📤 OUTWARD'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-bold text-white truncate max-w-[150px]">
                      {tx.productName}
                    </td>
                    <td className="py-1.5 px-2 text-slate-300 truncate max-w-[160px]">
                      <span className="block font-medium text-slate-200">{tx.referenceLabel || '-'}</span>
                      <span className="text-[9px] text-slate-500">{tx.partyName || '-'}</span>
                    </td>
                    <td className={`py-1.5 px-2 text-right font-mono font-bold ${isPurchaseTx ? 'text-sky-400' : 'text-amber-400'}`}>
                      {sign}{ctnChg} Pkg &bull; {sign}{qtyChg} {tx.unit || 'Units'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-white">
                      {tx.resultingBalance} {tx.unit || 'Units'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// SUB-COMPONENT: Profit Intelligence Widget (Image 4 Replica)
// -------------------------------------------------------------
const ProfitIntelligenceWidget: React.FC<{
  summary: any;
  profitData?: any;
  initialTab?: 'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman';
  onOpenSaleBill: (bill: SaleBill) => void;
}> = ({ summary, profitData, initialTab = 'perItem', onOpenSaleBill }) => {
  const [activeTab, setActiveTab] = useState<'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman'>(initialTab);

  const perItem = profitData?.perItem || [];
  const perBill = profitData?.perBill || [];
  const perRestaurant = profitData?.perRestaurant || [];
  const perSalesman = profitData?.perSalesman || [];

  return (
    <div className="p-3.5 bg-slate-900 border border-slate-700/80 rounded-2xl space-y-3 text-xs w-full">
      {/* Header with Title and Margin Badge (Image 4) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h4 className="font-extrabold text-sm text-white">Profit Intelligence (نفع کی رپورٹ)</h4>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
          {summary.overallMarginPct || 0}% Margin
        </span>
      </div>

      {/* 4 Tabs Container (Image 4) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('perItem')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'perItem'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>📦</span>
          <span>Per Item</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perBill')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'perBill'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>📄</span>
          <span>Per Bill</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perRestaurant')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'perRestaurant'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🏢</span>
          <span>Restaurant</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perSalesman')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'perSalesman'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>👤</span>
          <span>Salesman</span>
        </button>
      </div>

      {/* 4 Metric Cards in Grid (Image 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px]">Sales Volume</span>
          <span className="font-mono font-bold text-white text-xs mt-0.5 block">
            {currencySymbol()} {Number(summary.totalSalesVolume || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px]">Cost of Goods</span>
          <span className="font-mono font-bold text-amber-400 text-xs mt-0.5 block">
            {currencySymbol()} {Number(summary.totalCostOfGoods || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px]">Gross Profit</span>
          <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
            {currencySymbol()} {Number(summary.totalGrossProfit || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px]">Net Realized Profit</span>
          <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
            {currencySymbol()} {Number(summary.totalNetProfit || summary.totalGrossProfit || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Active Tab Data Table */}
      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
        {activeTab === 'perItem' && (
          <table className="w-full text-left text-[11px] min-w-[500px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Item Title</th>
                <th className="py-2 px-2 text-center">Sold Units</th>
                <th className="py-2 px-2 text-right">Revenue</th>
                <th className="py-2 px-2 text-right">Cost</th>
                <th className="py-2 px-2 text-right">Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {perItem.map((it: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 font-bold text-white">{it.itemTitle}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300">{it.qtySold}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-white">{currencySymbol()} {Number(it.totalRevenue).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">{currencySymbol()} {Number(it.totalCostOfGoods).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">+{currencySymbol()} {Number(it.grossProfit).toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-cyan-300">{it.profitMarginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'perBill' && (
          <table className="w-full text-left text-[11px] min-w-[500px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Bill #</th>
                <th className="py-2 px-2">Customer</th>
                <th className="py-2 px-2 text-right">Turnover</th>
                <th className="py-2 px-2 text-right">Gross Profit</th>
                <th className="py-2 px-2 text-right">Margin</th>
                <th className="py-2 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {perBill.map((b: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 font-mono text-cyan-300 font-bold">#{b.billNumber}</td>
                  <td className="py-1.5 px-2 font-bold text-white">{b.customerAccountTitle}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-white">{currencySymbol()} {Number(b.totalAmount).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">+{currencySymbol()} {Number(b.grossProfit).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-cyan-300">{b.profitMarginPct}%</td>
                  <td className="py-1.5 px-2.5 text-center">
                    {b.rawBill && (
                      <button
                        type="button"
                        onClick={() => onOpenSaleBill(b.rawBill)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        👁️ View Bill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'perRestaurant' && (
          <table className="w-full text-left text-[11px] min-w-[500px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Customer / Restaurant</th>
                <th className="py-2 px-2 text-center">Bills</th>
                <th className="py-2 px-2 text-right">Turnover</th>
                <th className="py-2 px-2 text-right">Net Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {perRestaurant.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 font-bold text-white">{r.accountTitle}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300">{r.billsCount}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-white">{currencySymbol()} {Number(r.totalSalesVolume).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">+{currencySymbol()} {Number(r.grossProfit).toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-cyan-300">{r.profitMarginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Exact columns matching Image 4: SALESMAN / AGENT, BILLS, SALES TURNOVER, NET PROFIT, MARGIN */}
        {activeTab === 'perSalesman' && (
          <table className="w-full text-left text-[11px] min-w-[500px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">SALESMAN / AGENT</th>
                <th className="py-2 px-2 text-center">BILLS</th>
                <th className="py-2 px-2 text-right">SALES TURNOVER</th>
                <th className="py-2 px-2 text-right">NET PROFIT</th>
                <th className="py-2 px-2.5 text-right">MARGIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {perSalesman.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 font-bold text-white">{s.salesmanName}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300">{s.billsCount}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-white">{currencySymbol()} {Number(s.totalSalesVolume).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">+{currencySymbol()} {Number(s.totalProfit).toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-cyan-300">{Number(s.profitMarginPct).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const DEFAULT_MODAL_MESSAGE = {
  role: 'assistant' as const,
  content: `Hello! I am your AI Business Copilot. You can tell me what happened in plain English, Roman Urdu, or Hindi, or speak directly through the microphone.\n\nExamples you can try:\n• "Al Madina restaurant ne 40 kg rice aur 20 kg daal order kiye hain"\n• "Ali restaurant paid 35,000 cash today"\n• "Record ${currencySymbol()} 4,500 petrol expense for delivery van"\n• "Which restaurant is our most profitable customer?"`,
};

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  companyProfile,
  onDataMutated,
  initialQuery,
}) => {
  const [input, setInput] = useState('');
  const [selectedBillForReceiptModal, setSelectedBillForReceiptModal] = useState<SaleBill | null>(null);
  const [selectedPurchaseBillForModal, setSelectedPurchaseBillForModal] = useState<PurchaseBill | null>(null);
  const [isMasterAuditModalOpen, setIsMasterAuditModalOpen] = useState(false);
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant';
      content: string;
      executedTools?: { name: string; args: any; result: any }[];
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem('ai_assistant_modal_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_MODAL_MESSAGE];
  });

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai_assistant_modal_messages', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleClearModalChat = () => {
    setMessages([DEFAULT_MODAL_MESSAGE]);
    try {
      localStorage.removeItem('ai_assistant_modal_messages');
    } catch (e) {}
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const baseInputRef = useRef<string>('');
  const currentInputRef = useRef<string>('');

  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        const prefix = baseInputRef.current ? baseInputRef.current.trim() + ' ' : '';
        const combined = (prefix + transcript).trim();
        setInput(combined);
        currentInputRef.current = combined;
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech error:', e);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            baseInputRef.current = currentInputRef.current;
            recognition.start();
          } catch (err) {
            setTimeout(() => {
              if (isListeningRef.current) {
                try { recognition.start(); } catch (e) {}
              }
            }, 200);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setInput(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const toggleVoiceListening = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported on this browser. Please type your message.');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      isListeningRef.current = true;
      baseInputRef.current = input;
      currentInputRef.current = input;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        try {
          recognitionRef.current?.stop();
          setTimeout(() => {
            if (isListeningRef.current) recognitionRef.current?.start();
          }, 150);
        } catch (e) {}
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      try { recognitionRef.current?.stop(); } catch (e) {}
    }

    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    const newMsgs = [...messages, { role: 'user' as const, content: query }];
    setMessages(newMsgs);
    setInput('');
    baseInputRef.current = '';
    currentInputRef.current = '';
    setIsProcessing(true);

    try {
      const res = await api.sendAiChat(
        newMsgs.map((m) => ({ role: m.role, content: m.content })),
        {
          userRole: currentRole,
          userName: `Staff (${currentRole})`,
          source: isListening ? 'voice' : 'ai_chat',
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          executedTools: res.executedTools,
        },
      ]);

      // If tools were executed that mutated business data, notify parent to refetch
      if (res.executedTools && res.executedTools.length > 0) {
        onDataMutated();
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Please try again.';
      let displayMsg = `Unable to process AI request: ${rawMsg}`;
      if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        displayMsg = 'The AI model is currently experiencing high global demand. I am operating in resilient local mode with automatic fallback. Please resend or try again in a few moments.';
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: displayMsg,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const promptPresets = [
    'Purchase report aur khareed details do',
    'Sale report aur farokht details do',
    'Profit intelligence aur munafa report do',
    'Stock movement history aur ledger report do',
    'Master business audit report do',
    'Al Madina ka sale bill dikhao',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[90vh] max-h-[720px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">AI Financial Reports &amp; Munshi</h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Verified Reporting
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verified financial reports, profit intelligence, and printable document downloads.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearModalChat}
              className="flex items-center gap-1.5 text-rose-300 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 transition cursor-pointer font-bold shadow-xs"
              title="Clear chat history (چیٹ صاف کریں)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Chat (صاف کریں)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-500 font-semibold uppercase text-[10px] shrink-0">Reports:</span>
          {promptPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(preset)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full whitespace-nowrap border border-slate-700/60 transition cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed space-y-2.5 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{adaptCurrencyText(m.content)}</p>

                  {/* Render executed tool cards if present */}
                  {m.executedTools && m.executedTools.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/80 space-y-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Database Actions &amp; Reports:</span>
                      </div>
                      {m.executedTools.map((tool, tIdx) => (
                        <div
                          key={tIdx}
                          className="bg-slate-950/80 rounded-xl p-3 border border-slate-700/90 space-y-2.5 text-[11px]"
                        >
                          <div className="text-indigo-300 font-mono font-bold text-xs">{tool.name}()</div>
                          
                          {/* 1. MULTI-BILL HORIZONTAL 3D CAROUSEL (SALE BILLS OR PURCHASE BILLS) */}
                          {tool.result?.bills && tool.result.bills.length > 0 && (
                            <BillCardsCarousel
                              bills={tool.result.bills}
                              isPurchase={tool.result.reportType === 'purchases' || tool.name.includes('purchase')}
                              onOpenSaleBill={setSelectedBillForReceiptModal}
                              onOpenPurchaseBill={setSelectedPurchaseBillForModal}
                            />
                          )}

                          {/* 2. SINGLE CUSTOMER SALE BILL (if no multi-bill carousel shown) */}
                          {tool.result?.bill && (!tool.result?.bills || tool.result.bills.length === 0) && (
                            <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                                  Tax Invoice #{tool.result.bill.billNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">{tool.result.bill.date}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>{tool.result.bill.customerAccountTitle || tool.result.customerName}</span>
                                <span className="text-emerald-400 font-mono text-sm font-black">
                                  {currencySymbol()} {(tool.result.bill.netTotal || 0).toLocaleString()}
                                </span>
                              </div>
                              {tool.result.bill.items && tool.result.bill.items.length > 0 && (
                                <div className="text-[11px] text-slate-300 divide-y divide-slate-800 bg-slate-950/80 p-2 rounded-lg max-h-36 overflow-y-auto">
                                  {tool.result.bill.items.map((it: any, iIdx: number) => (
                                    <div key={iIdx} className="py-1 flex justify-between items-center text-[10px]">
                                      <span>{it.itemTitle} ({it.ctn ? `${it.ctn} PKG / ` : ''}{it.qty} {it.unit || 'Units'})</span>
                                      <span className="font-mono font-bold text-slate-200">{currencySymbol()} {it.amount?.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-[11px]">
                                <span className="text-slate-400">
                                  Balance Due: <strong className="text-amber-400 font-mono">{currencySymbol()} {(tool.result.bill.balanceReceivable || 0).toLocaleString()}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBillForReceiptModal(tool.result.bill)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>👁️ View &amp; Print Bill (بل دیکھیں / پرنٹ کریں)</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. SINGLE PURCHASE BILL VOUCHER (if no multi-bill carousel shown) */}
                          {tool.result?.purchaseBill && (!tool.result?.bills || tool.result.bills.length === 0) && (
                            <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-black text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                                  Purchase Bill #{tool.result.purchaseBill.billNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">{tool.result.purchaseBill.date}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>{tool.result.purchaseBill.supplierAccountTitle || tool.result.supplierName}</span>
                                <span className="text-emerald-400 font-mono text-sm font-black">
                                  {currencySymbol()} {(tool.result.purchaseBill.netTotal || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-[11px]">
                                <span className="text-slate-400">
                                  Payable Due: <strong className="text-amber-400 font-mono">{currencySymbol()} {(tool.result.purchaseBill.remainingBalance || 0).toLocaleString()}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPurchaseBillForModal(tool.result.purchaseBill)}
                                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>👁️ View &amp; Print Voucher (واؤچر دیکھیں / پرنٹ کریں)</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 4. PROFIT INTELLIGENCE (Exact Image 4 Replica) */}
                          {(tool.result?.reportType === 'profit' || tool.name === 'get_profit_report' || tool.name === 'get_profit_by_salesman' || tool.name === 'get_profit_by_restaurant') && (
                            <ProfitIntelligenceWidget
                              summary={tool.result.summary || {}}
                              profitData={tool.result.profitData}
                              initialTab={tool.result.initialTab}
                              onOpenSaleBill={setSelectedBillForReceiptModal}
                            />
                          )}

                          {/* 5. STOCK REPORT & MOVEMENT AUDIT TRAIL (Exact Image 5 Replica) */}
                          {(tool.result?.reportType === 'stockHistory' || tool.name === 'get_stock_history_report' || tool.name === 'get_stock_report') && (
                            <StockReportDualWidget
                              stockData={tool.result.stockData}
                              products={Array.isArray(tool.result) ? tool.result : undefined}
                            />
                          )}

                          {/* 6. MASTER BUSINESS AUDIT REPORT */}
                          {(tool.name === 'generate_business_report' || tool.result?.reportType === 'aiLedgerAudit') && (
                            <div className="p-3 bg-slate-900 border border-indigo-500/40 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">🛡️</span>
                                  <span className="text-xs font-black text-indigo-300">Master Business Audit Report</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                                  Verified Audit
                                </span>
                              </div>
                              {tool.result.summary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Total Turnover</span>
                                    <span className="font-mono font-bold text-white text-xs">{currencySymbol()} {(tool.result.summary.totalRevenue || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Gross Margin</span>
                                    <span className="font-mono font-bold text-emerald-400 text-xs">{currencySymbol()} {(tool.result.summary.grossProfit || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Net Outcome</span>
                                    <span className={`font-mono font-bold text-xs ${tool.result.summary.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {(tool.result.summary.isProfit ? '+' : '')}{currencySymbol()} {(tool.result.summary.netProfitOrLoss || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setIsMasterAuditModalOpen(true)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>👁️ View &amp; Print Master Audit (ماسٹر آڈٹ کھولیں)</span>
                                </button>
                                {tool.result.downloadUrl && (
                                  <a
                                    href={tool.result.downloadUrl}
                                    download={tool.result.fileName || 'Master_Audit.doc'}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Word (.doc)</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Fallback for raw / unformatted responses */}
                          {!tool.result?.bills &&
                            !tool.result?.bill &&
                            !tool.result?.purchaseBill &&
                            tool.name !== 'generate_business_report' &&
                            tool.result?.reportType !== 'aiLedgerAudit' &&
                            tool.result?.reportType !== 'profit' &&
                            tool.name !== 'get_profit_report' &&
                            tool.result?.reportType !== 'stockHistory' &&
                            tool.name !== 'get_stock_history_report' &&
                            tool.name !== 'get_stock_report' && (
                            tool.result && (
                              <div className="text-slate-300 whitespace-pre-line font-mono text-[11px]">
                                {tool.result.message || JSON.stringify(tool.result)}
                              </div>
                            )
                          )}

                          {tool.result?.downloadUrl && tool.name !== 'generate_business_report' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                              <a
                                href={tool.result.downloadUrl}
                                download={tool.result.fileName || 'Report.html'}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] inline-flex items-center gap-1 transition"
                              >
                                📥 Download Report File
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Executing tools & calculating real financials...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          {/* Active Listening Indicator */}
          {isListening && (
            <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-between text-xs text-purple-200 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <span className="font-bold">Listening to voice command... Speak now!</span>
              </div>
              <button
                onClick={() => recognitionRef.current?.stop()}
                className="text-purple-300 hover:text-white font-semibold underline"
              >
                Stop
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceListening}
              className={`p-2.5 rounded-xl border transition ${
                isListening
                  ? 'bg-purple-600 text-white border-purple-500 animate-bounce'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Speak voice command (English or Roman Urdu)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-purple-400" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Al Madina ne 50kg rice order kiya, or type in Roman Urdu..."
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />

            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* SALE BILL / TAX INVOICE MODAL */}
      {selectedBillForReceiptModal && (
        <SalesBillReceiptModal
          bill={selectedBillForReceiptModal}
          isOpen={true}
          onClose={() => setSelectedBillForReceiptModal(null)}
          companyProfile={companyProfile}
        />
      )}

      {/* PURCHASE BILL VOUCHER MODAL */}
      {selectedPurchaseBillForModal && (
        <PurchaseBillVoucherModal
          bill={selectedPurchaseBillForModal}
          onClose={() => setSelectedPurchaseBillForModal(null)}
          companyProfile={companyProfile}
        />
      )}

      {/* MASTER BUSINESS AUDIT REPORT MODAL */}
      <MasterAuditReportModal
        isOpen={isMasterAuditModalOpen}
        onClose={() => setIsMasterAuditModalOpen(false)}
        companyProfile={companyProfile}
      />
    </div>
  );
};
