import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Undo2,
  Search,
} from 'lucide-react';
import { Supplier, Product, PurchaseReturn, PurchaseReturnItem } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialReturn?: PurchaseReturn | null;
  suppliers: Supplier[];
  products: Product[];
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialReturn,
  suppliers,
  products,
}) => {
  const [returnNumber, setReturnNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [originalBillNumber, setOriginalBillNumber] = useState('');
  const [reason, setReason] = useState('Damaged goods / Return to supplier');

  const [items, setItems] = useState<PurchaseReturnItem[]>([
    {
      id: `pri-${Date.now()}-1`,
      productId: '',
      itemTitle: '',
      sku: '',
      unit: 'CTN',
      qty: 1,
      rate: 0,
      total: 0,
      reason: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialReturn) {
      setReturnNumber(initialReturn.returnNumberFormatted || initialReturn.returnNumber);
      setDate(initialReturn.date);
      setSelectedSupplierId(initialReturn.supplierId);
      setOriginalBillNumber(initialReturn.originalBillNumber || '');
      setReason(initialReturn.reason || '');
      setItems(initialReturn.items.map((it) => ({ ...it })));
    } else {
      setReturnNumber('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedSupplierId(suppliers[0]?.id || '');
      setOriginalBillNumber('');
      setReason('Damaged goods / Return to supplier');
      setItems([
        {
          id: `pri-${Date.now()}-1`,
          productId: products[0]?.id || '',
          itemTitle: products[0]?.name || products[0]?.itemTitle || '',
          sku: products[0]?.sku || '',
          unit: (products[0]?.packageType as any) || 'CTN',
          qty: 1,
          rate: products[0]?.purchasePrice || 0,
          total: products[0]?.purchasePrice || 0,
          reason: '',
        },
      ]);
    }
  }, [initialReturn, isOpen, suppliers, products]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        id: `pri-${Date.now()}-${items.length + 1}`,
        productId: defaultProd?.id || '',
        itemTitle: defaultProd?.name || defaultProd?.itemTitle || '',
        sku: defaultProd?.sku || '',
        unit: (defaultProd?.packageType as any) || 'CTN',
        qty: 1,
        rate: defaultProd?.purchasePrice || 0,
        total: defaultProd?.purchasePrice || 0,
        reason: '',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const rate = prod.purchasePrice || 0;
    const newItems = [...items];
    const qty = newItems[idx].qty || 1;
    newItems[idx] = {
      ...newItems[idx],
      productId: prod.id,
      itemTitle: prod.name || prod.itemTitle || '',
      sku: prod.sku || '',
      unit: (prod.packageType as any) || 'CTN',
      rate,
      total: Number((qty * rate).toFixed(2)),
    };
    setItems(newItems);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const newItems = [...items];
    const safeQty = Math.max(0, qty);
    newItems[idx].qty = safeQty;
    newItems[idx].total = Number((safeQty * (newItems[idx].rate || 0)).toFixed(2));
    setItems(newItems);
  };

  const handleRateChange = (idx: number, rate: number) => {
    const newItems = [...items];
    const safeRate = Math.max(0, rate);
    newItems[idx].rate = safeRate;
    newItems[idx].total = Number(((newItems[idx].qty || 0) * safeRate).toFixed(2));
    setItems(newItems);
  };

  const handleItemReasonChange = (idx: number, itemReason: string) => {
    const newItems = [...items];
    newItems[idx].reason = itemReason;
    setItems(newItems);
  };

  const netTotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const totalQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier account.');
      return;
    }
    if (items.length === 0 || totalQty <= 0) {
      setErrorMsg('Please add at least one returned item with quantity > 0.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: Partial<PurchaseReturn> = {
        returnNumber: returnNumber.trim() || undefined,
        date,
        supplierId: selectedSupplierId,
        supplierName: supplier?.accountTitle || supplier?.title || supplier?.name || 'Supplier',
        supplierAccountTitle: supplier?.accountTitle || supplier?.title || supplier?.name || 'Supplier',
        supplierCode: supplier?.code || '',
        originalBillNumber: originalBillNumber.trim() || undefined,
        reason: reason.trim() || undefined,
        items,
        totalAmount: netTotal,
        netTotal,
      };

      if (initialReturn) {
        await api.updatePurchaseReturn(initialReturn.id, payload);
      } else {
        await api.createPurchaseReturn(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save purchase return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialReturn ? 'Edit Purchase Return (خریداری واپسی ترمیم کریں)' : 'Record Purchase Return (خریداری واپسی اندراج)'}
              </h2>
              <p className="text-xs text-slate-400">
                Deducts returned items from warehouse stock (-qty) and debits supplier payable (-payable)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Supplier Account */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Supplier Account (سپلائر کا کھاتہ) *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `[${s.code}] ` : ''}{s.accountTitle || s.title || s.name} ({currencySymbol()} {Number(s.payableToSupplier || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Return Date (تاریخ) *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Original Purchase Bill # */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Original Purchase Bill # (اصل بل نمبر)
              </label>
              <input
                type="text"
                placeholder="e.g. PB-1001 or Bill#992"
                value={originalBillNumber}
                onChange={(e) => setOriginalBillNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              General Return Reason (واپسی کی وجہ)
            </label>
            <input
              type="text"
              placeholder="e.g. Returned expired stock to vendor / damaged during shipment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Returned Products To Supplier (واپس کی جانے والی اشیاء)
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-600/30 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 grid grid-cols-12 gap-2.5 items-center"
                >
                  {/* Product Dropdown */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Item / Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku ? `[${p.sku}] ` : ''}{p.name || p.itemTitle} ({currencySymbol()} {p.purchasePrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Return Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={item.qty}
                      onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  {/* Unit Rate */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Cost Rate ({currencySymbol()})</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleRateChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Total</label>
                    <div className="py-1.5 text-xs font-mono font-bold text-purple-300">
                      {currencySymbol()} {Number(item.total || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded-lg hover:bg-slate-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Item Specific Reason */}
                  <div className="col-span-12 pt-1 border-t border-slate-700/50">
                    <input
                      type="text"
                      placeholder="Item reason (e.g. Expired batch, torn bori, quality defect)"
                      value={item.reason || ''}
                      onChange={(e) => handleItemReasonChange(idx, e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Summary Banner */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-300 space-y-1">
              <div>Total Items: <span className="font-bold text-white">{items.length}</span></div>
              <div>Total Returned Quantity: <span className="font-bold text-white">{totalQty}</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Return Amount (ڈیبٹ نوٹ رقم)</div>
              <div className="text-xl font-black text-purple-400 font-mono">
                {currencySymbol()} {Number(netTotal.toFixed(2)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : initialReturn ? 'Update Return' : 'Confirm Purchase Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
