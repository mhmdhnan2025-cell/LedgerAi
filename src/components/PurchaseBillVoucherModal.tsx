import React from 'react';
import { Printer, X, Receipt } from 'lucide-react';
import { currencySymbol } from '../utils/currency';
import { CompanyProfile, PurchaseBill } from '../types';

interface PurchaseBillVoucherModalProps {
  bill: PurchaseBill | null;
  companyProfile?: CompanyProfile | null;
  onClose: () => void;
}

export const PurchaseBillVoucherModal: React.FC<PurchaseBillVoucherModalProps> = ({
  bill,
  companyProfile,
  onClose,
}) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Purchase Bill #{bill.billNumber}
              </h3>
              <p className="text-xs text-slate-400">
                Supplier: <strong className="text-slate-200">{bill.supplierAccountTitle || bill.supplierName || 'Supplier'}</strong> &bull; Buyer/Store: <strong className="text-emerald-400">{bill.customerName || companyProfile?.name || 'Self Store'}</strong> &bull; Date: {bill.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-300 max-h-[80vh] overflow-y-auto">
          {/* Top Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Vendor Bill#</span>
              <span className="font-bold text-white text-xs">
                {bill.vendorBillNumber || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Gate Pass#</span>
              <span className="font-bold text-white text-xs">
                {bill.gatePassNumber || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Payment Mode</span>
              <span
                className={`font-bold text-xs ${
                  bill.isCash ? 'text-amber-400' : 'text-indigo-400'
                }`}
              >
                {bill.isCash ? 'Cash Purchase' : 'Credit / Account'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Total Items</span>
              <span className="font-bold text-sky-400 text-xs">
                {bill.items?.length || 0} Products ({bill.totalQty || 0} units)
              </span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">CTN</th>
                  <th className="py-2.5 px-3 text-right text-amber-300">Extra Pcs</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Rate/CTN</th>
                  <th className="py-2.5 px-3 text-right">Qty/CTN</th>
                  <th className="py-2.5 px-3 text-right">Total Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">VAT%</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {bill.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-bold text-white">{it.itemTitle}</td>
                    <td className="py-2 px-3 text-slate-400">{it.category || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{it.ctn}</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-300 font-semibold">{it.extraPiece || 0}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-400">{it.unit || 'CTN'}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {it.ratePerCtn ? `${currencySymbol()} ${it.ratePerCtn}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{it.qtyPerCtn}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-white">{it.qty}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{currencySymbol()} {it.rate}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{it.vatPercent || 0}%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {currencySymbol()} {it.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill Totals Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Notes / Instructions:</span>
              <p className="text-xs text-slate-300 italic">
                {bill.notes || 'No specific notes recorded for this purchase.'}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Gross Amount:</span>
                <span className="font-mono text-white">{currencySymbol()} {bill.grossAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Discount:</span>
                <span className="font-mono text-amber-400">- {currencySymbol()} {bill.totalDiscount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>VAT Amount:</span>
                <span className="font-mono text-sky-400">+ {currencySymbol()} {bill.totalVatAmount?.toLocaleString()}</span>
              </div>
              {bill.loadExp > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Loading Expense:</span>
                  <span className="font-mono text-slate-200">
                    {bill.isLoadExpDeduction ? '- ' : '+ '}
                    {currencySymbol()} {bill.loadExp?.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-sm">
                <span className="text-white">Net Total:</span>
                <span className="text-emerald-400 font-mono">{currencySymbol()} {bill.netTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1">
                <span>Paid Amount:</span>
                <span className="font-mono text-white">{currencySymbol()} {bill.paidAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span className="text-amber-300">Remaining Balance:</span>
                <span className="font-mono text-amber-400">{currencySymbol()} {bill.remainingBalance?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions inside Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
