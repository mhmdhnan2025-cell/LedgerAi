import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  RotateCcw,
  Package,
  Layers,
  Banknote,
  Receipt,
} from 'lucide-react';
import { Customer, Product, SaleReturn, SaleReturnItem } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface SaleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialReturn?: SaleReturn | null;
  customers: Customer[];
  products: Product[];
}

export const SaleReturnModal: React.FC<SaleReturnModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialReturn,
  customers,
  products,
}) => {
  const [returnNumber, setReturnNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [originalBillNumber, setOriginalBillNumber] = useState('');
  const [isCash, setIsCash] = useState<boolean>(false);
  const [reason, setReason] = useState('Damaged goods / Return from customer');

  const [items, setItems] = useState<SaleReturnItem[]>([
    {
      id: `sri-${Date.now()}-1`,
      productId: '',
      itemTitle: '',
      sku: '',
      unit: 'CTN',
      ctn: 1,
      qty: 0,
      qtyPerCtn: 1,
      ratePerCtn: 0,
      rate: 0,
      total: 0,
      reason: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectableProducts = products.filter((p) => p.status !== false);

  // Initialize form
  useEffect(() => {
    if (initialReturn) {
      setReturnNumber(initialReturn.returnNumberFormatted || initialReturn.returnNumber);
      setDate(initialReturn.date);
      setSelectedCustomerId(initialReturn.customerId);
      setOriginalBillNumber(initialReturn.originalBillNumber || '');
      setReason(initialReturn.reason || '');
      setIsCash(!!initialReturn.isCash);
      setItems(initialReturn.items.map((it) => ({ ...it })));
    } else {
      setReturnNumber('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedCustomerId(customers[0]?.id || '');
      setOriginalBillNumber('');
      setReason('Damaged goods / Return from customer');
      setIsCash(false);
      const defaultProd = selectableProducts[0];
      const qInCtn = defaultProd?.quantityInCarton || (defaultProd as any)?.qtyInCarton || 1;
      const rate = defaultProd?.salePrice || defaultProd?.sellingPrice || 0;
      const ratePerCtn = (defaultProd as any)?.ctnSaleRate || (rate * qInCtn);
      setItems([
        {
          id: `sri-${Date.now()}-1`,
          productId: defaultProd?.id || '',
          itemTitle: defaultProd?.name || defaultProd?.itemTitle || '',
          sku: defaultProd?.sku || '',
          unit: (defaultProd?.packageType as any) || 'CTN',
          ctn: 1,
          qty: 0,
          qtyPerCtn: qInCtn,
          ratePerCtn,
          rate,
          total: ratePerCtn,
          reason: '',
        },
      ]);
    }
  }, [initialReturn, isOpen]);

  // Late-arriving dropdown data: fill ONLY untouched defaults - never wipe
  // the pre-filled edit data or whatever the user already typed.
  useEffect(() => {
    if (!isOpen || initialReturn) return;
    if (!selectedCustomerId && customers[0]) setSelectedCustomerId(customers[0].id);
    setItems((prev) => {
      if (prev.length !== 1 || prev[0].productId || selectableProducts.length === 0) return prev;
      const defaultProd = selectableProducts[0];
      const qInCtn = defaultProd?.quantityInCarton || (defaultProd as any)?.qtyInCarton || 1;
      const rate = defaultProd?.salePrice || defaultProd?.sellingPrice || 0;
      const ratePerCtn = (defaultProd as any)?.ctnSaleRate || (rate * qInCtn);
      return [
        {
          id: `sri-${Date.now()}-1`,
          productId: defaultProd?.id || '',
          itemTitle: defaultProd?.name || defaultProd?.itemTitle || '',
          sku: defaultProd?.sku || '',
          unit: (defaultProd?.packageType as any) || 'CTN',
          ctn: 1,
          qty: 0,
          qtyPerCtn: qInCtn,
          ratePerCtn,
          rate,
          total: ratePerCtn,
          reason: '',
        },
      ];
    });
  }, [isOpen, initialReturn, customers, products]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultProd = selectableProducts[0];
    const qInCtn = defaultProd?.quantityInCarton || (defaultProd as any)?.qtyInCarton || 1;
    const rate = defaultProd?.salePrice || defaultProd?.sellingPrice || 0;
    const ratePerCtn = (defaultProd as any)?.ctnSaleRate || (rate * qInCtn);
    setItems([
      ...items,
      {
        id: `sri-${Date.now()}-${items.length + 1}`,
        productId: defaultProd?.id || '',
        itemTitle: defaultProd?.name || defaultProd?.itemTitle || '',
        sku: defaultProd?.sku || '',
        unit: (defaultProd?.packageType as any) || 'CTN',
        ctn: 1,
        qty: 0,
        qtyPerCtn: qInCtn,
        ratePerCtn,
        rate,
        total: ratePerCtn,
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
    const qInCtn = prod.quantityInCarton || (prod as any).qtyInCarton || 1;
    const rate = prod.salePrice || prod.sellingPrice || 0;
    const ratePerCtn = (prod as any).ctnSaleRate || (rate * qInCtn);
    const newItems = [...items];
    const ctn = newItems[idx].ctn !== undefined ? newItems[idx].ctn : 1;
    const qty = newItems[idx].qty || 0;
    const total = Number(((ctn * ratePerCtn) + (qty * rate)).toFixed(2));
    newItems[idx] = {
      ...newItems[idx],
      productId: prod.id,
      itemTitle: prod.name || prod.itemTitle || '',
      sku: prod.sku || '',
      unit: (prod.packageType as any) || 'CTN',
      qtyPerCtn: qInCtn,
      ratePerCtn,
      rate,
      ctn,
      qty,
      total,
    };
    setItems(newItems);
  };

  const handleCtnChange = (idx: number, ctn: number) => {
    const newItems = [...items];
    const safeCtn = Math.max(0, ctn);
    newItems[idx].ctn = safeCtn;
    const ratePerCtn = newItems[idx].ratePerCtn || ((newItems[idx].rate || 0) * (newItems[idx].qtyPerCtn || 1));
    const rate = newItems[idx].rate || 0;
    const qty = newItems[idx].qty || 0;
    newItems[idx].total = Number(((safeCtn * ratePerCtn) + (qty * rate)).toFixed(2));
    setItems(newItems);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const newItems = [...items];
    const safeQty = Math.max(0, qty);
    newItems[idx].qty = safeQty;
    const ratePerCtn = newItems[idx].ratePerCtn || ((newItems[idx].rate || 0) * (newItems[idx].qtyPerCtn || 1));
    const rate = newItems[idx].rate || 0;
    const ctn = newItems[idx].ctn || 0;
    newItems[idx].total = Number(((ctn * ratePerCtn) + (safeQty * rate)).toFixed(2));
    setItems(newItems);
  };

  const handleRatePerCtnChange = (idx: number, ratePerCtn: number) => {
    const newItems = [...items];
    const safe = Math.max(0, ratePerCtn);
    newItems[idx].ratePerCtn = safe;
    const qInCtn = newItems[idx].qtyPerCtn || 1;
    if (qInCtn > 0) {
      newItems[idx].rate = Number((safe / qInCtn).toFixed(2));
    }
    const ctn = newItems[idx].ctn || 0;
    const qty = newItems[idx].qty || 0;
    newItems[idx].total = Number(((ctn * safe) + (qty * (newItems[idx].rate || 0))).toFixed(2));
    setItems(newItems);
  };

  const handleRateChange = (idx: number, rate: number) => {
    const newItems = [...items];
    const safeRate = Math.max(0, rate);
    newItems[idx].rate = safeRate;
    const qInCtn = newItems[idx].qtyPerCtn || 1;
    newItems[idx].ratePerCtn = Number((safeRate * qInCtn).toFixed(2));
    const ctn = newItems[idx].ctn || 0;
    const qty = newItems[idx].qty || 0;
    newItems[idx].total = Number(((ctn * newItems[idx].ratePerCtn) + (qty * safeRate)).toFixed(2));
    setItems(newItems);
  };

  const handleTotalChange = (idx: number, total: number) => {
    const newItems = [...items];
    newItems[idx].total = Math.max(0, total);
    setItems(newItems);
  };

  const handleItemReasonChange = (idx: number, itemReason: string) => {
    const newItems = [...items];
    newItems[idx].reason = itemReason;
    setItems(newItems);
  };

  const netTotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const totalCtn = items.reduce((sum, it) => sum + (it.ctn || 0), 0);
  const totalQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer account.');
      return;
    }
    if (items.length === 0 || (totalCtn <= 0 && totalQty <= 0)) {
      setErrorMsg('Please enter at least 1 carton or loose quantity for return.');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: Partial<SaleReturn> = {
        returnNumber: returnNumber.trim() || undefined,
        date,
        customerId: selectedCustomerId,
        customerName: customer?.accountTitle || customer?.name || 'Customer',
        customerAccountTitle: customer?.accountTitle || customer?.name || 'Customer',
        customerCode: customer?.code || customer?.accountCode || '',
        originalBillNumber: originalBillNumber.trim() || undefined,
        isCash,
        reason: reason.trim() || undefined,
        items,
        totalAmount: Number(netTotal.toFixed(2)),
        netTotal: Number(netTotal.toFixed(2)),
      };

      if (initialReturn) {
        await api.updateSaleReturn(initialReturn.id, payload);
      } else {
        await api.createSaleReturn(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save sales return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {initialReturn ? 'Edit Sales Return' : 'Record Sales Return'}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  Stock Auto +Increases
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Restores items to inventory stock with dual packaging preview and updates customer ledger or cash drawer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Customer Account */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Customer Account *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {[...customers]
                  .sort((a, b) => {
                    const srA = a.srNo !== undefined && a.srNo !== null ? Number(a.srNo) : 9999;
                    const srB = b.srNo !== undefined && b.srNo !== null ? Number(b.srNo) : 9999;
                    if (srA !== srB) return srA - srB;
                    return (a.code || '').localeCompare(b.code || '');
                  })
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.srNo ? `[Sr# ${c.srNo}] ` : ''}{c.code || c.accountCode} - {c.accountTitle || c.name} (Bal: {currencySymbol()} {Number(c.outstandingBalance || 0).toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Return Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Original Bill # */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Original Bill # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 7188 or SB-1002"
                value={originalBillNumber}
                onChange={(e) => setOriginalBillNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Refund Settlement Mode Toggle */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-400" />
                <span>Return Settlement Mode:</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isCash
                  ? 'Cash Refund: Cash Drawer gives refund immediately (Cash in Hand decreases).'
                  : 'Credit Note: Deducts amount from customer ledger balance (receivable reduced).'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCash(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !isCash
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Credit Ledger (-Udhaar)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCash(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isCash
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash Refund (-Drawer)</span>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              General Return Narration / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Customer returned damaged carton / damaged packaging before sale"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Returned Products &amp; Dual Packaging (Cotton &amp; Qty)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const qInCtn = prod?.quantityInCarton || (prod as any)?.qtyInCarton || 1;
                const currentUnits = Number(prod?.currentQuantity ?? ((prod?.carton ? prod.carton * qInCtn : 0) + (prod?.pcs || 0))) || 0;
                const returnedUnits = (Number(item.ctn || 0) * qInCtn) + Number(item.qty || 0);
                const afterUnits = currentUnits + returnedUnits;

                const curCtn = Math.floor(currentUnits / qInCtn);
                const curPcs = currentUnits % qInCtn;
                const afterCtn = Math.floor(afterUnits / qInCtn);
                const afterPcs = afterUnits % qInCtn;

                return (
                  <div
                    key={item.id || idx}
                    className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 space-y-2.5"
                  >
                    {/* Top Row: Item Selection & Live Stock Preview */}
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-12 lg:col-span-6">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">
                          Select Product / Item
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">Select product...</option>
                          {selectableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name || p.itemTitle} (1 CTN = {p.quantityInCarton || (p as any).qtyInCarton || 1})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Live Stock Preview Badge */}
                      <div className="col-span-11 lg:col-span-5">
                        <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">
                          Live Stock Projection (+Restores to Warehouse)
                        </label>
                        <div className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 flex items-center justify-between flex-wrap gap-1">
                          <span>
                            Current: <strong>{curCtn}</strong> CTN, <strong>{curPcs}</strong> PCS ({currentUnits} units)
                          </span>
                          <span className="text-emerald-400 font-bold">
                            ➔ After: <strong className="text-white underline">{afterCtn} CTN, {afterPcs} PCS</strong> ({afterUnits} units)
                          </span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1 text-right flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Cartons, Loose Qty, Rates and Line Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end pt-1 border-t border-slate-700/60">
                      {/* Cartons (Cotton) */}
                      <div>
                        <label className="block text-[10px] text-amber-300 font-bold mb-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Return Cartons</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.ctn ?? 0}
                          onChange={(e) => handleCtnChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                          placeholder="0"
                        />
                      </div>

                      {/* Loose Quantity */}
                      <div>
                        <label className="block text-[10px] text-amber-300 font-bold mb-0.5">
                          Return Qty (Loose)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.qty ?? 0}
                          onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                          placeholder="0"
                        />
                      </div>

                      {/* Rate per Carton */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">
                          Rate/CTN ({currencySymbol()})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.ratePerCtn ?? 0}
                          onChange={(e) => handleRatePerCtnChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>

                      {/* Rate per Unit */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">
                          Rate/Unit ({currencySymbol()})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.rate ?? 0}
                          onChange={(e) => handleRateChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>

                      {/* Line Total */}
                      <div>
                        <label className="block text-[10px] text-amber-300 font-bold mb-0.5">
                          Line Total ({currencySymbol()})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.total ?? 0}
                          onChange={(e) => handleTotalChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-amber-600/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-black focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Defect Note */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Item defect reason (e.g. Expired batch, torn bori, wrong flavor)"
                        value={item.reason || ''}
                        onChange={(e) => handleItemReasonChange(idx, e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Banner */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-300 space-y-1">
              <div>Total Products: <strong className="text-white">{items.length}</strong></div>
              <div>
                Total Return Units: <strong className="text-white font-mono">{totalCtn} CTN + {totalQty} Loose</strong>
              </div>
              <div className="text-[11px] text-amber-300 font-medium">
                {isCash ? '💵 Cash Drawer Refund' : '📋 Customer Credit Note'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Return Amount</div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {currencySymbol()} {Number(netTotal.toFixed(2)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-900/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : initialReturn ? 'Update Return' : 'Confirm Sales Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
