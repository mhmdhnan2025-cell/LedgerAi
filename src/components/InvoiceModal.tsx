import { currencySymbol } from '../utils/currency';
import React from 'react';
import { Download, FileText, Printer, X } from 'lucide-react';
import { Order, Restaurant } from '../types';

interface InvoiceModalProps {
  order: Order | null;
  restaurant?: Restaurant;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  restaurant,
  onClose,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 print:m-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Wholesale Supply Invoice & Delivery Challan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 text-slate-200 bg-slate-900 print:bg-white print:text-black print:p-6">
          {/* Company & Invoice Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-6 print:border-black">
            <div>
              <div className="text-xl font-black tracking-tight text-white print:text-black">
                APEX FOOD SUPPLIES LTD.
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Wholesale Bulk Grains, Oil, Spices & Kitchen Provisions
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Warehouse 14, Akbari Mandi Logistics Hub, Lahore
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Helpline: +92 (42) 3588-4491 &bull; GST/NTN: 8847291-3
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm font-extrabold uppercase tracking-widest text-indigo-400 print:text-gray-900">
                DELIVERY MEMO / INVOICE
              </div>
              <div className="font-mono font-bold text-base text-white print:text-black mt-1">
                {order.orderNumber}
              </div>
              <div className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Date: <span className="font-semibold text-slate-200 print:text-black">{order.orderDate}</span>
              </div>
              <div className="text-xs text-slate-400 print:text-gray-600">
                Status:{' '}
                <span className="font-bold text-emerald-400 print:text-black uppercase">
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer / Billed To Section */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-500 tracking-wider">
                Billed To & Delivery Recipient
              </span>
              <div className="font-black text-sm text-white print:text-black mt-1">
                {order.restaurantName}
              </div>
              <div className="text-slate-300 print:text-gray-700 mt-0.5">
                Attn: {restaurant?.contactPerson || 'Kitchen Manager'}
              </div>
              <div className="text-slate-300 print:text-gray-700">
                Phone: {restaurant?.phone || 'N/A'}
              </div>
              <div className="text-slate-400 print:text-gray-600 mt-0.5">
                Address: {restaurant?.address || 'Restaurant Premises'}
              </div>
            </div>

            <div className="text-right bg-slate-950/60 print:bg-gray-50 p-3 rounded-lg border border-slate-800 print:border-gray-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-500 tracking-wider block">
                Account Outstanding Status
              </span>
              <div className="text-slate-300 print:text-gray-700 mt-1">
                Total Credit Limit: {currencySymbol()} {(restaurant?.creditLimit || 0).toLocaleString()}
              </div>
              <div className="font-bold text-amber-400 print:text-black mt-0.5">
                Current Ledger Balance: {currencySymbol()} {(restaurant?.outstandingBalance || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-800 print:border-black rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 print:bg-gray-100 print:text-black border-b border-slate-800 print:border-black uppercase text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Description / Item</th>
                  <th className="p-3 text-center">Qty & Unit</th>
                  <th className="p-3 text-right">Unit Rate (PKR)</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-200 print:text-black">
                {order.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-mono text-slate-500 print:text-gray-600">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-white print:text-black">{it.productName}</div>
                      <div className="text-[10px] text-slate-400 print:text-gray-500 font-mono">
                        SKU: {it.sku}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {currencySymbol()} {(it.unitPrice ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold font-mono">
                      {currencySymbol()} {(it.totalPrice ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end text-xs">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-slate-400 print:text-gray-600">
                <span>Subtotal Items:</span>
                <span className="font-mono text-slate-200 print:text-black">
                  {currencySymbol()} {(order.subtotal ?? 0).toLocaleString()}
                </span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Delivery Logistics:</span>
                  <span className="font-mono text-slate-200 print:text-black">
                    +{currencySymbol()} {(order.deliveryFee ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-400 print:text-gray-700">
                  <span>Special Wholesale Discount:</span>
                  <span className="font-mono">-{currencySymbol()} {(order.discount ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 print:border-black pt-2 font-black text-sm text-white print:text-black">
                <span>Invoice Total:</span>
                <span className="font-mono">{currencySymbol()} {(order.totalAmount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400 print:text-gray-700 font-bold">
                <span>Amount Paid:</span>
                <span className="font-mono">{currencySymbol()} {(order.paidAmount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-400 print:text-black font-extrabold text-sm border-t border-dashed border-slate-800 print:border-gray-400 pt-1">
                <span>Balance Payable:</span>
                <span className="font-mono">{currencySymbol()} {(order.balanceDue ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery Signatures Section */}
          <div className="grid grid-cols-2 gap-12 pt-10 border-t border-slate-800 print:border-black text-center text-xs">
            <div>
              <div className="border-b border-slate-700 print:border-black pb-8"></div>
              <span className="text-slate-400 print:text-gray-600 mt-2 block">
                Warehouse Dispatcher / Driver Signature
              </span>
            </div>
            <div>
              <div className="border-b border-slate-700 print:border-black pb-8"></div>
              <span className="text-slate-400 print:text-gray-600 mt-2 block">
                Restaurant Kitchen Receiver Stamp & Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
