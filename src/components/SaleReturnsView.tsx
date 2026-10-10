import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ChevronDown,
  ArrowRight,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { Customer, Product, SaleReturn, SaleReturnItem, UserRole, User, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface SaleReturnsViewProps {
  products: Product[];
  currentRole: UserRole;
  currentUser?: User | null;
  companyProfile?: CompanyProfile | null;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SaleReturnsView: React.FC<SaleReturnsViewProps> = ({
  products = [],
  currentRole,
  currentUser,
  companyProfile,
  onRefreshData,
  onNavigateTab,
}) => {
  // View mode: 'form' (Image 3) or 'list' (Image 4)
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);

  // Return list data
  const [returnList, setReturnList] = useState<SaleReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State (Image 3)
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('208');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; code: string; title: string; type: string } | null>(null);
  const [isCashTransaction, setIsCashTransaction] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [highlightedAccountIdx, setHighlightedAccountIdx] = useState(0);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const accountInputRef = useRef<HTMLInputElement>(null);

  // Line item entry row (Image 3)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [highlightedItemIdx, setHighlightedItemIdx] = useState(0);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  const [rowCtn, setRowCtn] = useState('');
  const [rowRatePerCtn, setRowRatePerCtn] = useState('');
  const [rowQtyPerCtn, setRowQtyPerCtn] = useState('');
  const [rowQty, setRowQty] = useState('');
  const [rowRate, setRowRate] = useState('');
  const [rowDiscRs, setRowDiscRs] = useState('');
  const [rowVatPct, setRowVatPct] = useState('0');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // Added items grid
  const [items, setItems] = useState<SaleReturnItem[]>([]);

  // Summary fields (bottom right in Image 3)
  const [overallDiscount, setOverallDiscount] = useState('0');

  // List view filters (Image 4)
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [listPage, setListPage] = useState(1);
  const pageSize = 10;

  // View / Print modal
  const [viewingReturn, setViewingReturn] = useState<SaleReturn | null>(null);

  // Combined accounts list: Customers + Cash in Hand
  const combinedAccounts = useMemo(() => {
    const list: { id: string; code: string; title: string; type: string }[] = [];
    list.push({ id: 'cash-010101001', code: '010101001', title: 'Cash In Hand A/c Main Treasury', type: 'Cash' });
    list.push({ id: 'cash-010101002', code: '010101002', title: 'Cash In Hand A/c Counter Register', type: 'Cash' });
    for (const c of customers) {
      if (c) {
        list.push({
          id: c.id,
          code: c.code || '0101040100',
          title: c.accountTitle || c.name || 'Customer',
          type: 'Customer',
        });
      }
    }
    return list;
  }, [customers]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) return combinedAccounts;
    const q = accountSearchQuery.toLowerCase().trim();
    return combinedAccounts.filter((a) => a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [combinedAccounts, accountSearchQuery]);

  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery.trim()) return products;
    const q = itemSearchQuery.toLowerCase().trim();
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
  }, [products, itemSearchQuery]);

  // Load returns and customers
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [rets, custs] = await Promise.all([
        api.getSaleReturns().catch(() => []),
        api.getCustomers().catch(() => []),
      ]);
      const list = Array.isArray(rets) ? rets : [];
      setReturnList(list);
      setCustomers(Array.isArray(custs) ? custs : []);
      // Auto compute next bill number
      if (list.length > 0) {
        const numbers = list.map((r) => parseInt(r.returnNumber.replace(/\D/g, '') || '0', 10)).filter((n) => !isNaN(n));
        const max = numbers.length > 0 ? Math.max(...numbers) : 200;
        setBillNumber(String(max + 1));
      } else {
        setBillNumber('201');
      }
    } catch (err: any) {
      console.error('Failed to load sale returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Select account
  const handleSelectAccount = (acc: { id: string; code: string; title: string; type: string }) => {
    setSelectedAccount(acc);
    setAccountSearchQuery(`${acc.title} (${acc.code})`);
    setIsAccountDropdownOpen(false);
    if (acc.type === 'Cash') {
      setIsCashTransaction(true);
    }
    setTimeout(() => itemInputRef.current?.focus(), 50);
  };

  // Select product
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setItemSearchQuery(prod.name);
    setIsItemDropdownOpen(false);
    const saleRate = Number(prod.sellingPrice) || Number(prod.purchasePrice) || 0;
    const ctnUnits = Number(prod.qtyInCarton) || 1;
    setRowQtyPerCtn(String(ctnUnits));
    setRowRate(String(saleRate));
    setRowRatePerCtn(String(Number((saleRate * ctnUnits).toFixed(2))));
    setRowQty('1');
    setRowCtn(ctnUnits > 1 ? '1' : '0');
    setRowDiscRs('0');
    setRowVatPct('0');
  };

  // Recalculate QTY when CTN changes
  const handleCtnChange = (val: string) => {
    setRowCtn(val);
    const c = parseFloat(val) || 0;
    const qPerCtn = parseFloat(rowQtyPerCtn) || 1;
    if (c > 0 && qPerCtn > 0) {
      setRowQty(String(Number((c * qPerCtn).toFixed(2))));
    }
  };

  // Recalculate Rate per CTN when Rate changes
  const handleRateChange = (val: string) => {
    setRowRate(val);
    const r = parseFloat(val) || 0;
    const qPerCtn = parseFloat(rowQtyPerCtn) || 1;
    if (qPerCtn > 0) {
      setRowRatePerCtn(String(Number((r * qPerCtn).toFixed(2))));
    }
  };

  // Line item computed values
  const qVal = parseFloat(rowQty) || 0;
  const rVal = parseFloat(rowRate) || 0;
  const dVal = parseFloat(rowDiscRs) || 0;
  const vatPctVal = parseFloat(rowVatPct) || 0;
  const lineBase = Math.max(0, qVal * rVal - dVal);
  const lineVat = Number(((lineBase * vatPctVal) / 100).toFixed(2));
  const lineTotal = Number((lineBase + lineVat).toFixed(2));

  // Add line item to grid
  const handleAddLineItem = () => {
    if (!selectedProduct) {
      alert('Please select an item first.');
      return;
    }
    if (qVal <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    const newItem: SaleReturnItem = {
      id: editingItemIdx !== null ? items[editingItemIdx].id : `sri-${Date.now()}`,
      productId: selectedProduct.id,
      itemTitle: selectedProduct.name,
      sku: selectedProduct.sku || selectedProduct.code || '',
      category: selectedProduct.category || 'General',
      unit: selectedProduct.unit || 'CTN',
      ctn: parseFloat(rowCtn) || 0,
      ratePerCtn: parseFloat(rowRatePerCtn) || 0,
      qtyPerCtn: parseFloat(rowQtyPerCtn) || 1,
      qty: qVal,
      rate: rVal,
      disc: dVal,
      vatPct: vatPctVal,
      vatAmt: lineVat,
      total: lineTotal,
      stock: selectedProduct.currentQuantity || 0,
    };

    if (editingItemIdx !== null) {
      const updated = [...items];
      updated[editingItemIdx] = newItem;
      setItems(updated);
      setEditingItemIdx(null);
    } else {
      setItems([...items, newItem]);
    }

    // Reset line row
    setSelectedProduct(null);
    setItemSearchQuery('');
    setRowCtn('');
    setRowRatePerCtn('');
    setRowQtyPerCtn('');
    setRowQty('');
    setRowRate('');
    setRowDiscRs('');
    setRowVatPct('0');
    setTimeout(() => itemInputRef.current?.focus(), 50);
  };

  const handleEditRow = (idx: number) => {
    const it = items[idx];
    const prod = products.find((p) => p.id === it.productId || p.name === it.itemTitle);
    if (prod) setSelectedProduct(prod);
    setItemSearchQuery(it.itemTitle);
    setRowCtn(String(it.ctn || '0'));
    setRowRatePerCtn(String(it.ratePerCtn || '0'));
    setRowQtyPerCtn(String(it.qtyPerCtn || '1'));
    setRowQty(String(it.qty));
    setRowRate(String(it.rate));
    setRowDiscRs(String(it.disc || '0'));
    setRowVatPct(String(it.vatPct || '0'));
    setEditingItemIdx(idx);
  };

  const handleDeleteRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Grand totals
  const totalGross = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const totalCtn = items.reduce((s, it) => s + (Number(it.ctn) || 0), 0);
  const totalVat = items.reduce((s, it) => s + (Number(it.vatAmt) || 0), 0);
  const discVal = parseFloat(overallDiscount) || 0;
  const finalAmount = Math.max(0, Number((totalGross - discVal).toFixed(2)));

  // Save return to database
  const handleSaveReturn = async () => {
    if (!selectedAccount) {
      alert('Please select an Account (Customer / Cash).');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item.');
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const payload: Partial<SaleReturn> = {
        returnNumber: billNumber.trim(),
        returnNumberFormatted: `SR-${billNumber.trim()}`,
        date: returnDate,
        customerId: selectedAccount.id,
        customerName: selectedAccount.title,
        customerAccountTitle: selectedAccount.title,
        customerCode: selectedAccount.code,
        salesmanName: currentUser?.name || 'Sales Staff',
        isCash: isCashTransaction,
        items,
        totalAmount: totalGross,
        discount: discVal,
        netTotal: finalAmount,
        reason: 'Customer return',
        status: 'COMPLETED',
      };

      let saved: SaleReturn;
      if (editingReturnId) {
        saved = await api.updateSaleReturn(editingReturnId, payload);
        setFeedback({ type: 'success', text: `Sale Return #${saved.returnNumberFormatted} updated successfully.` });
      } else {
        saved = await api.createSaleReturn(payload);
        setFeedback({ type: 'success', text: `Sale Return #${saved.returnNumberFormatted} saved and stock restored.` });
      }

      await fetchAll();
      if (onRefreshData) onRefreshData();
      handleResetForm();
      setViewMode('list');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save sale return.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setEditingReturnId(null);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setSelectedAccount(null);
    setAccountSearchQuery('');
    setIsCashTransaction(false);
    setSelectedProduct(null);
    setItemSearchQuery('');
    setItems([]);
    setOverallDiscount('0');
  };

  const handleEditReturn = (ret: SaleReturn) => {
    setEditingReturnId(ret.id);
    setBillNumber(ret.returnNumber);
    setReturnDate(ret.date);
    const acc = combinedAccounts.find((a) => a.id === ret.customerId || a.code === ret.customerCode);
    if (acc) {
      setSelectedAccount(acc);
      setAccountSearchQuery(`${acc.title} (${acc.code})`);
    } else {
      setSelectedAccount({ id: ret.customerId, code: ret.customerCode || '', title: ret.customerAccountTitle, type: 'Customer' });
      setAccountSearchQuery(ret.customerAccountTitle);
    }
    setIsCashTransaction(Boolean(ret.isCash));
    setItems(ret.items || []);
    setOverallDiscount(String(ret.discount || '0'));
    setViewMode('form');
  };

  const handleDeleteReturn = async (ret: SaleReturn) => {
    if (!window.confirm(`Are you sure you want to delete Sale Return #${ret.returnNumberFormatted}? Stock and customer debt will be restored.`)) {
      return;
    }
    setIsLoading(true);
    try {
      await api.deleteSaleReturn(ret.id);
      setFeedback({ type: 'success', text: `Sale Return #${ret.returnNumberFormatted} deleted successfully.` });
      await fetchAll();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete sale return.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered list for Image 4
  const filteredList = useMemo(() => {
    return returnList.filter((r) => {
      if (filterCustomer && r.customerId !== filterCustomer && r.customerCode !== filterCustomer && !r.customerAccountTitle?.toLowerCase().includes(filterCustomer.toLowerCase())) {
        return false;
      }
      if (filterDateFrom && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date > filterDateTo) return false;
      return true;
    });
  }, [returnList, filterCustomer, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice((listPage - 1) * pageSize, listPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Top Header Card matching Image 3 & 4 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide">
              {viewMode === 'form' ? 'Sale Returns Management' : `Sale Return List - ${filteredList.length} Records`}
            </h1>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'form' ? 'Record items returned by customers, auto-restore inventory stock, and credit customer ledger' : 'Browse, filter, edit, and print customer sales return vouchers'}
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons matching Image 3 & 4: List | Search | Details / New */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewMode === 'list' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'form') setViewMode('list');
              setIsSearchFilterOpen((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
              isSearchFilterOpen ? 'bg-slate-800 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setViewMode('form');
            }}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewMode === 'form' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {editingReturnId ? 'Edit Return' : 'Details'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE 1: ENTRY FORM (Exact Match Image 3)                           */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'form' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          {/* Header row: Date | Bill# | Account | Cash/Bank Trans checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Date */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {/* Bill# */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Bill#</label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Bill#"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono font-bold"
              />
            </div>

            {/* Account dropdown (Searchable with ArrowDown/Up and Auto-Scroll) */}
            <div className="sm:col-span-6 relative" ref={accountDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Account</label>
              <div className="relative">
                <input
                  ref={accountInputRef}
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => {
                    setAccountSearchQuery(e.target.value);
                    setIsAccountDropdownOpen(true);
                    setHighlightedAccountIdx(0);
                  }}
                  onFocus={() => setIsAccountDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setIsAccountDropdownOpen(true);
                      setHighlightedAccountIdx((prev) => {
                        const next = Math.min(prev + 1, Math.max(0, filteredAccounts.length - 1));
                        const target = filteredAccounts[next];
                        if (target) {
                          setTimeout(() => {
                            accountDropdownRef.current?.querySelector(`[data-acc-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
                          }, 10);
                        }
                        return next;
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setIsAccountDropdownOpen(true);
                      setHighlightedAccountIdx((prev) => {
                        const next = Math.max(prev - 1, 0);
                        const target = filteredAccounts[next];
                        if (target) {
                          setTimeout(() => {
                            accountDropdownRef.current?.querySelector(`[data-acc-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
                          }, 10);
                        }
                        return next;
                      });
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredAccounts.length > 0 && highlightedAccountIdx >= 0 && highlightedAccountIdx < filteredAccounts.length) {
                        handleSelectAccount(filteredAccounts[highlightedAccountIdx]);
                      }
                    } else if (e.key === 'Escape') {
                      setIsAccountDropdownOpen(false);
                    }
                  }}
                  placeholder="Nothing selected"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-medium"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Floating accounts dropdown */}
              {isAccountDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 text-xs">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">No customer found.</div>
                  ) : (
                    filteredAccounts.map((acc, idx) => {
                      const isHighlighted = idx === highlightedAccountIdx;
                      const isSelected = selectedAccount?.id === acc.id;
                      return (
                        <div
                          key={acc.id}
                          data-acc-id={acc.id}
                          onClick={() => handleSelectAccount(acc)}
                          onMouseEnter={() => setHighlightedAccountIdx(idx)}
                          className={`px-3 py-2 cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-sky-950 text-sky-200 font-bold border-l-4 border-sky-400'
                              : isHighlighted
                              ? 'bg-slate-800 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-mono text-sky-400 text-[11px]">{acc.code}</span>
                            <span className="truncate">{acc.title}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                            {acc.type}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Cash/Bank Trans Checkbox */}
            <div className="sm:col-span-2 flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={isCashTransaction}
                  onChange={(e) => setIsCashTransaction(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 accent-sky-500"
                />
                <span>Cash/Bank Trans</span>
              </label>
            </div>
          </div>

          {/* Line Item Entry Row matching Image 3: ITEM | CTN | RATE/CTN | QTY/CTN | QTY | RATE | DISC RS. | VAT% | VAT/AMT | AMOUNT | ACTION Enter */}
          <div className="border border-slate-800 bg-slate-950/70 p-3 rounded-xl space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 text-xs items-end">
              {/* ITEM */}
              <div className="col-span-2 sm:col-span-3 relative" ref={itemDropdownRef}>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ITEM</label>
                <input
                  ref={itemInputRef}
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                    setHighlightedItemIdx(0);
                  }}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setIsItemDropdownOpen(true);
                      setHighlightedItemIdx((prev) => {
                        const next = Math.min(prev + 1, Math.max(0, filteredProducts.length - 1));
                        const target = filteredProducts[next];
                        if (target) {
                          setTimeout(() => {
                            itemDropdownRef.current?.querySelector(`[data-prod-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
                          }, 10);
                        }
                        return next;
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setIsItemDropdownOpen(true);
                      setHighlightedItemIdx((prev) => {
                        const next = Math.max(prev - 1, 0);
                        const target = filteredProducts[next];
                        if (target) {
                          setTimeout(() => {
                            itemDropdownRef.current?.querySelector(`[data-prod-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
                          }, 10);
                        }
                        return next;
                      });
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredProducts.length > 0 && highlightedItemIdx >= 0 && highlightedItemIdx < filteredProducts.length) {
                        handleSelectProduct(filteredProducts[highlightedItemIdx]);
                      }
                    } else if (e.key === 'Escape') {
                      setIsItemDropdownOpen(false);
                    }
                  }}
                  placeholder="Select Product..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-medium"
                />

                {/* Floating item dropdown */}
                {isItemDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 text-xs">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">No item found.</div>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const isHighlighted = idx === highlightedItemIdx;
                        const isSelected = selectedProduct?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            data-prod-id={p.id}
                            onClick={() => handleSelectProduct(p)}
                            onMouseEnter={() => setHighlightedItemIdx(idx)}
                            className={`px-3 py-2 cursor-pointer flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-sky-950 text-sky-200 font-bold border-l-4 border-sky-400'
                                : isHighlighted
                                ? 'bg-slate-800 text-white font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-semibold text-white">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Code: {p.code || p.sku || 'N/A'}</span>
                            </div>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold ml-2 shrink-0">
                              Stock: {p.currentQuantity || 0} {p.unit || ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* CTN */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">CTN</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rowCtn}
                  onChange={(e) => handleCtnChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-center outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* RATE/CTN */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">RATE/CTN</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rowRatePerCtn}
                  onChange={(e) => setRowRatePerCtn(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-right outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* QTY/CTN */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">QTY/CTN</label>
                <input
                  type="number"
                  min="1"
                  value={rowQtyPerCtn}
                  onChange={(e) => setRowQtyPerCtn(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-center outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* QTY */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">QTY</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rowQty}
                  onChange={(e) => setRowQty(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-center font-bold outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* RATE */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">RATE</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rowRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-right font-bold outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* DISC RS. */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">DISC RS.</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rowDiscRs}
                  onChange={(e) => setRowDiscRs(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-right outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* VAT% */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">VAT%</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rowVatPct}
                  onChange={(e) => setRowVatPct(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-center outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* VAT/AMT */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">VAT/AMT</label>
                <div className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 text-right font-mono">
                  {lineVat.toFixed(2)}
                </div>
              </div>

              {/* AMOUNT */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">AMOUNT</label>
                <div className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-emerald-400 text-right font-mono font-bold">
                  {lineTotal.toFixed(2)}
                </div>
              </div>

              {/* ACTION Enter Button */}
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-1.5 px-3 rounded text-xs transition cursor-pointer shadow flex items-center justify-center"
                >
                  {editingItemIdx !== null ? 'Update' : 'Enter'}
                </button>
              </div>
            </div>
          </div>

          {/* Added items table matching Image 3 */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left text-slate-200">
              <thead className="bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">ITEM</th>
                  <th className="py-2.5 px-3 text-center">CTN</th>
                  <th className="py-2.5 px-3 text-right">RATE/CTN</th>
                  <th className="py-2.5 px-3 text-center">QTY/CTN</th>
                  <th className="py-2.5 px-3 text-center">QTY</th>
                  <th className="py-2.5 px-3 text-right">RATE</th>
                  <th className="py-2.5 px-3 text-right">DISC RS.</th>
                  <th className="py-2.5 px-3 text-center">VAT%</th>
                  <th className="py-2.5 px-3 text-right">VAT/AMT</th>
                  <th className="py-2.5 px-3 text-right">AMOUNT</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500">
                      No items added yet. Fill row above and press Enter.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-900/60 transition">
                      <td className="py-2 px-3 font-semibold text-white">{it.itemTitle}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.ctn || 0}</td>
                      <td className="py-2 px-3 text-right font-mono">{Number(it.ratePerCtn || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.qtyPerCtn || 1}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-sky-400">{it.qty}</td>
                      <td className="py-2 px-3 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono">{Number(it.disc || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.vatPct || 0}%</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{Number(it.vatAmt || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{Number(it.total).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditRow(idx)}
                            className="p-1 rounded text-sky-400 hover:bg-sky-500/10 transition"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 uppercase text-slate-400">Total</td>
                    <td className="py-2.5 px-3 text-center font-mono">{totalCtn}</td>
                    <td colSpan={2} />
                    <td className="py-2.5 px-3 text-center font-mono text-sky-400">{totalQty.toFixed(2)}</td>
                    <td colSpan={3} />
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">{totalVat.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-black">{totalGross.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Right Summary Form matching Image 3 */}
          <div className="flex flex-col sm:flex-row items-end justify-end gap-6 pt-3">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-400">Discount:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-36 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-right text-white font-mono font-bold outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-400">Final Amount:</span>
                <div className="w-36 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-right text-emerald-400 font-mono font-black text-sm">
                  {currencySymbol()} {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveReturn}
                  disabled={isLoading}
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-lg transition cursor-pointer shadow text-xs"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE 2: LIST VIEW (Exact Match Image 4)                            */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'list' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          {/* Optional search filters bar toggled by "Search" */}
          {isSearchFilterOpen && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Filter Customer</label>
                <input
                  type="text"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  placeholder="Customer name or code..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCustomer('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Table matching Image 4: SR# | BILL# | USER | DATE | ACCOUNT | ITEMS | QUANTITY | AMOUNT | ACTION */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left text-slate-200">
              <thead className="bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">SR#</th>
                  <th className="py-2.5 px-3 font-mono">BILL#</th>
                  <th className="py-2.5 px-3">USER</th>
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3">ACCOUNT</th>
                  <th className="py-2.5 px-3">ITEMS</th>
                  <th className="py-2.5 px-3 text-center">QUANTITY</th>
                  <th className="py-2.5 px-3 text-right">AMOUNT</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950 font-medium">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No sale returns recorded yet. Click "Details" above to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((ret, idx) => {
                    const srNum = (listPage - 1) * pageSize + idx + 1;
                    const itemsDesc = (ret.items || []).map((it) => it.itemTitle).join(', ');
                    const totalQuantity = (ret.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);

                    return (
                      <tr key={ret.id} className="hover:bg-slate-900/60 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{srNum}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-400">{ret.returnNumber}</td>
                        <td className="py-2.5 px-3 text-slate-300">{ret.createdBy || ret.salesmanName || 'Staff'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{ret.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div>{ret.customerAccountTitle || ret.customerName}</div>
                          {ret.isCash && <span className="text-[10px] text-amber-400 font-bold">(Cash)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={itemsDesc}>
                          {itemsDesc || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-300">
                          {totalQuantity.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {currencySymbol()} {Number(ret.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingReturn(ret)}
                              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="View and Print"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditReturn(ret)}
                              className="p-1 rounded text-slate-300 hover:text-sky-400 hover:bg-sky-500/10 transition cursor-pointer"
                              title="Edit Return"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReturn(ret)}
                              className="p-1 rounded text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete Return"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination matching Image 4: 1 2 3 ... Next Last */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 text-xs font-bold text-slate-400">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setListPage(pageNum)}
                    className={`px-2.5 py-1 rounded transition ${
                      listPage === pageNum ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {listPage < totalPages && (
                <button
                  type="button"
                  onClick={() => setListPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Next
                </button>
              )}
              <button
                type="button"
                onClick={() => setListPage(totalPages)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Last
              </button>
            </div>
          )}
        </div>
      )}

      {/* View & Print Modal */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Sale Return Receipt #{viewingReturn.returnNumberFormatted}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReturn(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-bold text-white text-sm">{viewingReturn.customerAccountTitle}</span>
                  <span className="text-slate-400 block font-mono text-[11px]">{viewingReturn.customerCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                  <span className="font-mono text-white font-bold">{viewingReturn.date}</span>
                  <span className="text-emerald-400 block font-bold text-sm mt-1">
                    {currencySymbol()} {Number(viewingReturn.netTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left text-slate-200">
                  <thead className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">CTN</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950 font-medium">
                    {(viewingReturn.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-semibold text-white">{it.itemTitle}</td>
                        <td className="p-2 text-center font-mono">{it.ctn || 0}</td>
                        <td className="p-2 text-center font-mono text-sky-400 font-bold">{it.qty}</td>
                        <td className="p-2 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-emerald-400 font-bold">{Number(it.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
