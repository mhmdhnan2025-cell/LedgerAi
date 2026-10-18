import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
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

// Convert YYYY-MM-DD to DD-MM-YYYY for display
const formatToDMY = (ymd: string): string => {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ymd;
};

// Convert DD-MM-YYYY back to YYYY-MM-DD for storage
const formatToYMD = (dmy: string): string => {
  if (!dmy) return new Date().toISOString().split('T')[0];
  const parts = dmy.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dmy;
};

export const SaleReturnsView: React.FC<SaleReturnsViewProps> = ({
  products = [],
  currentRole,
  currentUser,
  companyProfile,
  onRefreshData,
  onNavigateTab,
}) => {
  // View mode: 'form' (matching Image 3) or 'list'
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);

  // Return list data
  const [returnList, setReturnList] = useState<SaleReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State (Exact Match Image 3)
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [returnDateYMD, setReturnDateYMD] = useState(() => new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('216');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; code: string; title: string; type: string } | null>(null);
  const [isCashTransaction, setIsCashTransaction] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [highlightedAccountIdx, setHighlightedAccountIdx] = useState(0);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const accountInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [accountDropdownStyle, setAccountDropdownStyle] = useState<React.CSSProperties>({});

  // Line item entry row (Image 3)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [highlightedItemIdx, setHighlightedItemIdx] = useState(0);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const itemMenuRef = useRef<HTMLDivElement>(null);
  const [itemDropdownStyle, setItemDropdownStyle] = useState<React.CSSProperties>({});

  const [rowCtn, setRowCtn] = useState('');
  const [rowRatePerCtn, setRowRatePerCtn] = useState('');
  const [rowQtyPerCtn, setRowQtyPerCtn] = useState('');
  const [rowQty, setRowQty] = useState('');
  const [rowRate, setRowRate] = useState('');
  const [rowDiscRs, setRowDiscRs] = useState('');
  const [rowVatPct, setRowVatPct] = useState('5'); // Default 5 matching Image 3
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // Added items grid
  const [items, setItems] = useState<SaleReturnItem[]>([]);

  // Summary fields (bottom right in Image 3)
  const [overallDiscount, setOverallDiscount] = useState('0');

  // List view filters
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
    const active = products.filter((p) => p.status !== false);
    if (!itemSearchQuery.trim()) return active;
    const q = itemSearchQuery.toLowerCase().trim();
    return active.filter((p) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
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
        const max = numbers.length > 0 ? Math.max(...numbers) : 215;
        setBillNumber(String(max + 1));
      } else {
        setBillNumber('216');
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

  // Dynamic position updater for fixed dropdowns (escapes table overflow-x-auto clipping)
  useLayoutEffect(() => {
    const updatePositions = () => {
      if (isItemDropdownOpen && itemInputRef.current) {
        const rect = itemInputRef.current.getBoundingClientRect();
        setItemDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 2,
          left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
          width: Math.max(340, rect.width * 1.5),
          zIndex: 99999,
        });
      }
      if (isAccountDropdownOpen && accountInputRef.current) {
        const rect = accountInputRef.current.getBoundingClientRect();
        setAccountDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 2,
          left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
          width: Math.max(340, rect.width),
          zIndex: 99999,
        });
      }
    };

    updatePositions();
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [isItemDropdownOpen, isAccountDropdownOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(target) &&
        !accountMenuRef.current?.contains(target)
      ) {
        setIsAccountDropdownOpen(false);
      }
      if (
        itemDropdownRef.current &&
        !itemDropdownRef.current.contains(target) &&
        !itemMenuRef.current?.contains(target)
      ) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Handle select account
  const handleSelectAccount = (acc: { id: string; code: string; title: string; type: string }) => {
    setSelectedAccount(acc);
    setAccountSearchQuery(`${acc.title}`);
    setIsAccountDropdownOpen(false);
    if (acc.type === 'Cash') {
      setIsCashTransaction(true);
    }
    setTimeout(() => itemInputRef.current?.focus(), 50);
  };

  // Handle select product
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setItemSearchQuery(prod.name);
    setIsItemDropdownOpen(false);
    const salePrice = Number((prod as any).price) || Number((prod as any).salePrice) || Number(prod.purchasePrice) || 0;
    const ctnUnits = Number(prod.qtyInCarton) || Number((prod as any).quantityInCarton) || 1;
    setRowQtyPerCtn(String(ctnUnits));
    setRowRate(String(salePrice));
    setRowRatePerCtn(String(Number((salePrice * ctnUnits).toFixed(2))));
    setRowQty('1');
    setRowCtn(ctnUnits > 1 ? '1' : '0');
    setRowDiscRs('0');
    setRowVatPct('5');
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

  // Live stock preview: Current Stock PLUS returned quantity (items returned back into stock)
  const liveStockPreview = useMemo(() => {
    if (!selectedProduct) return '---';
    const curr = Number(selectedProduct.currentQuantity) || 0;
    const rem = curr + qVal;
    return rem.toFixed(0);
  }, [selectedProduct, qVal]);

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
    setRowVatPct('5');
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
    setRowVatPct(String(it.vatPct ?? '5'));
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
        date: returnDateYMD,
        customerId: selectedAccount.id,
        customerName: selectedAccount.title,
        customerAccountTitle: selectedAccount.title,
        customerCode: selectedAccount.code,
        isCash: isCashTransaction,
        items,
        totalAmount: totalGross,
        discount: discVal,
        taxAmount: totalVat,
        netTotal: finalAmount,
        reason: 'Customer return',
        status: 'COMPLETED',
        createdBy: currentUser?.name || 'Staff',
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
    setReturnDateYMD(new Date().toISOString().split('T')[0]);
    setSelectedAccount(null);
    setAccountSearchQuery('');
    setIsCashTransaction(false);
    setSelectedProduct(null);
    setItemSearchQuery('');
    setItems([]);
    setOverallDiscount('0');
    setRowCtn('');
    setRowRatePerCtn('');
    setRowQtyPerCtn('');
    setRowQty('');
    setRowRate('');
    setRowDiscRs('');
    setRowVatPct('5');
    setEditingItemIdx(null);
  };

  const handleEditReturn = (ret: SaleReturn) => {
    setEditingReturnId(ret.id);
    setBillNumber(ret.returnNumber);
    setReturnDateYMD(ret.date);
    const acc = combinedAccounts.find((a) => a.id === ret.customerId || a.code === ret.customerCode);
    if (acc) {
      setSelectedAccount(acc);
      setAccountSearchQuery(acc.title);
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
    if (!window.confirm(`Are you sure you want to delete Sale Return #${ret.returnNumberFormatted}? Stock and customer balance will be adjusted.`)) {
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

  // Filtered list for list mode
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
    <div className="bg-white border border-slate-300 rounded-sm shadow-sm text-slate-800 font-sans text-xs">
      {/* ------------------------------------------------------------------ */}
      {/* TOP BAR matching Image 3: "Sale Returns Management" on left,       */}
      {/* [List] [Search] [Details] buttons on right                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-[#f8f9fa] border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-slate-800 tracking-tight">
          Sale Returns Management
        </h1>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-0.5 rounded-sm transition cursor-pointer border text-xs ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 border-slate-400 font-bold shadow-2xs'
                : 'bg-[#eaeaea] text-slate-700 border-slate-300 hover:bg-[#dfdfdf]'
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
            className={`px-4 py-0.5 rounded-sm transition cursor-pointer border text-xs ${
              isSearchFilterOpen
                ? 'bg-white text-slate-900 border-slate-400 font-bold shadow-2xs'
                : 'bg-[#eaeaea] text-slate-700 border-slate-300 hover:bg-[#dfdfdf]'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setViewMode('form');
            }}
            className={`px-4 py-0.5 rounded-sm transition cursor-pointer border text-xs ${
              viewMode === 'form'
                ? 'bg-white text-slate-900 border-slate-400 font-bold shadow-2xs'
                : 'bg-[#eaeaea] text-slate-700 border-slate-300 hover:bg-[#dfdfdf]'
            }`}
          >
            {editingReturnId ? 'Edit Return' : 'Details'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-2.5 mx-4 mt-3 rounded text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE 1: ENTRY FORM (Exact Match Image 3)                           */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'form' && (
        <div className="p-4 space-y-3">
          {/* Top Form Fields: Date | Bill# & Account | Cash/Bank Trans */}
          <div className="space-y-2">
            {/* Row 1: Date & Bill# */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-700 font-normal w-12 text-right">Date</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={returnDateYMD}
                    onChange={(e) => setReturnDateYMD(e.target.value)}
                    className="bg-white border border-slate-300 rounded-sm px-2 py-0.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-700 font-normal">Bill#</label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="bg-[#f1f3f5] border border-slate-300 rounded-sm px-2 py-0.5 text-xs font-bold text-slate-800 w-24 text-center outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Account & Cash/Bank Trans */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 relative" ref={accountDropdownRef}>
                <label className="text-xs text-slate-700 font-normal w-12 text-right">Account</label>
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
                    onFocus={() => {
                      setIsAccountDropdownOpen(true);
                      const foundIdx = filteredAccounts.findIndex((a) => a.id === selectedAccount?.id);
                      setHighlightedAccountIdx(foundIdx >= 0 ? foundIdx : 0);
                      if (accountInputRef.current) {
                        const rect = accountInputRef.current.getBoundingClientRect();
                        setAccountDropdownStyle({
                          position: 'fixed',
                          top: rect.bottom + 2,
                          left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
                          width: Math.max(340, rect.width),
                          zIndex: 99999,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIsAccountDropdownOpen(true);
                        setHighlightedAccountIdx((prev) => {
                          const next = Math.min(prev + 1, Math.max(0, filteredAccounts.length - 1));
                          const target = filteredAccounts[next];
                          if (target) {
                            setTimeout(() => {
                              accountMenuRef.current?.querySelector(`[data-acc-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
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
                              accountMenuRef.current?.querySelector(`[data-acc-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
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
                    className="w-72 sm:w-80 bg-white border border-slate-300 rounded-sm px-2 py-0.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1.5 pointer-events-none" />

                  {/* Dropdown menu (Fixed positioning floating over everything) */}
                  {isAccountDropdownOpen && (
                    <div
                      ref={accountMenuRef}
                      style={accountDropdownStyle}
                      className="bg-white border border-slate-300 rounded-sm shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs"
                    >
                      {filteredAccounts.length === 0 ? (
                        <div className="p-2.5 text-slate-500 text-center font-medium">No account found.</div>
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
                              className={`px-3 py-1.5 cursor-pointer flex items-center justify-between ${
                                isHighlighted
                                  ? 'bg-blue-50 text-blue-900 font-semibold'
                                  : isSelected
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-[11px] text-slate-500 font-semibold">{acc.code}</span>
                                <span className="truncate">{acc.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100">
                                {acc.type}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="cash-trans-sr"
                  checked={isCashTransaction}
                  onChange={(e) => setIsCashTransaction(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 accent-blue-600"
                />
                <label htmlFor="cash-trans-sr" className="text-xs text-slate-700 font-normal cursor-pointer select-none">
                  Cash/Bank Trans
                </label>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* THE GRID TABLE (Exact Match Image 3)                               */}
          {/* Headers: ITEM | CTN | RATE/CTN | QTY/CTN | QTY | RATE | DISC RS. | */}
          {/*          VAT@ | VAT/AMT | AMOUNT | STOCK | ACTION (Enter)          */}
          {/* ------------------------------------------------------------------ */}
          <div className="overflow-x-auto border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-slate-300 text-slate-800 font-bold uppercase text-[11px] text-center">
                  <th className="py-1 px-2 border-r border-slate-300 w-48 text-center">ITEM</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-16 text-center">CTN</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-20 text-center">RATE/CTN</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-16 text-center">QTY/CTN</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-16 text-center">QTY</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-20 text-center">RATE</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-16 text-center">DISC RS.</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-14 text-center">VAT@</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-20 text-center">VAT/AMT</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-24 text-center">AMOUNT</th>
                  <th className="py-1 px-1 border-r border-slate-300 w-16 text-center">STOCK</th>
                  <th className="py-1 px-2 text-center w-20">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: INPUT ROW matching Image 3 */}
                <tr className="bg-white border-b border-slate-300">
                  {/* ITEM */}
                  <td className="p-0 border-r border-slate-300 relative" ref={itemDropdownRef}>
                    <div className="relative">
                      <input
                        ref={itemInputRef}
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => {
                          setItemSearchQuery(e.target.value);
                          setIsItemDropdownOpen(true);
                          setHighlightedItemIdx(0);
                        }}
                        onFocus={() => {
                          setIsItemDropdownOpen(true);
                          const foundIdx = filteredProducts.findIndex((p) => p.id === selectedProduct?.id);
                          setHighlightedItemIdx(foundIdx >= 0 ? foundIdx : 0);
                          if (itemInputRef.current) {
                            const rect = itemInputRef.current.getBoundingClientRect();
                            setItemDropdownStyle({
                              position: 'fixed',
                              top: rect.bottom + 2,
                              left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
                              width: Math.max(340, rect.width * 1.5),
                              zIndex: 99999,
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setIsItemDropdownOpen(true);
                            setHighlightedItemIdx((prev) => {
                              const next = Math.min(prev + 1, Math.max(0, filteredProducts.length - 1));
                              const target = filteredProducts[next];
                              if (target) {
                                setTimeout(() => {
                                  itemMenuRef.current?.querySelector(`[data-prod-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
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
                                  itemMenuRef.current?.querySelector(`[data-prod-id="${target.id}"]`)?.scrollIntoView({ block: 'nearest' });
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
                        placeholder="Nothing selected"
                        className="w-full bg-transparent px-2 py-1 text-xs text-slate-800 outline-none pr-5 truncate cursor-pointer font-sans"
                      />
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />

                      {/* Floating Item Dropdown (Fixed above table boundaries, no clipping!) */}
                      {isItemDropdownOpen && (
                        <div
                          ref={itemMenuRef}
                          style={itemDropdownStyle}
                          className="bg-white border border-slate-300 rounded shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs"
                        >
                          {filteredProducts.length === 0 ? (
                            <div className="p-2.5 text-slate-500 text-center font-medium">No item found.</div>
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
                                    isHighlighted
                                      ? 'bg-blue-50 text-blue-900 font-semibold'
                                      : isSelected
                                      ? 'bg-slate-100 text-slate-900'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex flex-col truncate pr-2">
                                    <span className="truncate text-xs font-semibold text-slate-900">{p.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Code: {p.code || p.sku || 'N/A'}</span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-emerald-700 shrink-0 ml-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Stock: {p.currentQuantity || 0}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* CTN */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={rowCtn}
                      onChange={(e) => handleCtnChange(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-center font-mono text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* RATE/CTN */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rowRatePerCtn}
                      onChange={(e) => setRowRatePerCtn(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-right font-mono text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* QTY/CTN (Readonly Gray) */}
                  <td className="p-0 border-r border-slate-300 bg-[#e9ecef]">
                    <input
                      type="text"
                      readOnly
                      value={rowQtyPerCtn}
                      className="w-full bg-transparent px-1 py-1 text-center font-mono text-xs text-slate-600 select-none cursor-default"
                    />
                  </td>

                  {/* QTY */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rowQty}
                      onChange={(e) => setRowQty(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-center font-mono font-bold text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* RATE */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rowRate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-right font-mono font-bold text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* DISC RS. */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rowDiscRs}
                      onChange={(e) => setRowDiscRs(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-right font-mono text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* VAT@ (Default 5) */}
                  <td className="p-0 border-r border-slate-300">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={rowVatPct}
                      onChange={(e) => setRowVatPct(e.target.value)}
                      className="w-full bg-white px-1 py-1 text-center font-mono text-xs outline-none focus:bg-blue-50/40"
                    />
                  </td>

                  {/* VAT/AMT (Readonly Gray) */}
                  <td className="p-0 border-r border-slate-300 bg-[#e9ecef]">
                    <div className="w-full px-1 py-1 text-right font-mono text-xs text-slate-600">
                      {lineVat > 0 ? lineVat.toFixed(2) : '0'}
                    </div>
                  </td>

                  {/* AMOUNT (Readonly Gray) */}
                  <td className="p-0 border-r border-slate-300 bg-[#e9ecef]">
                    <div className="w-full px-1 py-1 text-right font-mono font-bold text-xs text-slate-800">
                      {lineTotal > 0 ? lineTotal.toFixed(2) : '0'}
                    </div>
                  </td>

                  {/* STOCK (Readonly Gray - Live Preview: Current + Return Qty) */}
                  <td className="p-0 border-r border-slate-300 bg-[#e9ecef]">
                    <div
                      className="w-full px-1 py-1 text-center font-mono font-bold text-xs text-slate-700"
                      title={selectedProduct ? `Current Stock: ${selectedProduct.currentQuantity || 0} + Return Qty: ${qVal}` : 'Select item to preview live stock'}
                    >
                      {liveStockPreview}
                    </div>
                  </td>

                  {/* ACTION: Enter button */}
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="w-full bg-[#007bff] hover:bg-[#0069d9] active:bg-[#005cbf] text-white font-medium py-0.5 px-2 rounded-xs text-xs transition cursor-pointer shadow-2xs"
                    >
                      {editingItemIdx !== null ? 'Update' : 'Enter'}
                    </button>
                  </td>
                </tr>

                {/* Added Items Rows */}
                {items.map((it, idx) => (
                  <tr key={it.id} className="bg-white hover:bg-slate-50 border-b border-slate-200 text-slate-700">
                    <td className="py-1 px-2 border-r border-slate-300 truncate font-medium text-slate-900">
                      {it.itemTitle}
                    </td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">{it.ctn || 0}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-right font-mono">{Number(it.ratePerCtn || 0).toFixed(2)}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono bg-[#f8f9fa] text-slate-500">{it.qtyPerCtn || 1}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono font-bold text-blue-700">{it.qty}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-right font-mono">{Number(it.disc || 0).toFixed(2)}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">{it.vatPct ?? 5}%</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-right font-mono bg-[#f8f9fa]">{Number(it.vatAmt || 0).toFixed(2)}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-right font-mono font-bold text-slate-900 bg-[#f8f9fa]">{Number(it.total).toFixed(2)}</td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono bg-[#f8f9fa] text-slate-600">
                      {((Number(it.stock) || 0) + (Number(it.qty) || 0)).toFixed(0)}
                    </td>
                    <td className="py-0.5 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditRow(idx)}
                          className="p-0.5 text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-0.5 text-rose-600 hover:text-rose-800 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Total Row (Exact Match Image 3: Total | --- | --- | --- | 0.00 | --- | --- | 0.00 | 0.00 | --- | ---) */}
                <tr className="bg-[#f8f9fa] font-bold text-slate-800 text-center border-t border-slate-300">
                  <td className="py-1 px-2 border-r border-slate-300 text-center">Total</td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 border-r border-slate-300 font-mono text-slate-800">
                    {totalQty > 0 ? totalQty.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 border-r border-slate-300 font-mono">{discVal > 0 ? discVal.toFixed(2) : ''}</td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 border-r border-slate-300 text-right font-mono">
                    {totalVat > 0 ? totalVat.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-1 px-1 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                    {totalGross > 0 ? totalGross.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-1 px-1 border-r border-slate-300 text-slate-400">---</td>
                  <td className="py-1 px-1 text-slate-400">---</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* BOTTOM RIGHT SUMMARY (Exact Match Image 3)                         */}
          {/* Discount: | Final Amount: [ 0 ]                                    */}
          {/* [Save]                                                             */}
          {/* ------------------------------------------------------------------ */}
          <div className="flex flex-col items-end gap-1.5 pt-2">
            {/* Discount: */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-700 font-normal w-28 text-right">Discount:</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-32 bg-white border border-slate-300 rounded-sm px-2 py-0.5 text-right font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            {/* Final Amount: (Readonly Gray matching Image 3 showing 0) */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-700 font-normal w-28 text-right">Final Amount:</label>
              <div className="w-32 bg-[#e9ecef] border border-slate-300 rounded-sm px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-800">
                {finalAmount > 0 ? finalAmount.toFixed(2) : '0'}
              </div>
            </div>

            {/* Action Buttons: Save & New Form (Exact Match Image 3) */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveReturn}
                disabled={isLoading}
                className="bg-[#007bff] hover:bg-[#0069d9] active:bg-[#005cbf] disabled:opacity-50 text-white font-medium text-xs px-5 py-1 rounded-sm shadow-2xs cursor-pointer transition"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="bg-[#6c757d] hover:bg-[#5a6268] active:bg-[#545b62] text-white font-medium text-xs px-3.5 py-1 rounded-sm shadow-2xs cursor-pointer transition"
              >
                New Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE 2: LIST VIEW                                                  */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'list' && (
        <div className="p-4 space-y-3">
          {/* Optional search filters bar toggled by "Search" */}
          {isSearchFilterOpen && (
            <div className="p-3 bg-[#f8f9fa] border border-slate-300 rounded-sm grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Filter Customer</label>
                <input
                  type="text"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  placeholder="Customer name or code..."
                  className="w-full bg-white border border-slate-300 rounded-sm px-2 py-1 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-sm px-2 py-1 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-sm px-2 py-1 text-slate-800 outline-none focus:border-blue-500"
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
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-sm font-semibold transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Table: SR# | BILL# | USER | DATE | ACCOUNT | ITEMS | QUANTITY | AMOUNT | ACTION */}
          <div className="overflow-x-auto border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-slate-300 text-slate-800 font-bold uppercase text-[11px] text-center">
                  <th className="py-1 px-2 border-r border-slate-300 w-12 text-center">SR#</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-20 text-center font-mono">BILL#</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24 text-center">USER</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24 text-center">DATE</th>
                  <th className="py-1 px-2 border-r border-slate-300 text-left">ACCOUNT</th>
                  <th className="py-1 px-2 border-r border-slate-300 text-left">ITEMS</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-20 text-center">QUANTITY</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-28 text-right">AMOUNT</th>
                  <th className="py-1 px-2 text-center w-24">ACTION</th>
                </tr>
              </thead>
              <tbody>
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
                      <tr key={ret.id} className="bg-white hover:bg-slate-50 border-b border-slate-200 text-slate-700">
                        <td className="py-1 px-2 border-r border-slate-300 text-center font-mono">{srNum}</td>
                        <td className="py-1 px-2 border-r border-slate-300 text-center font-mono font-bold text-blue-700">{ret.returnNumber}</td>
                        <td className="py-1 px-2 border-r border-slate-300 text-center text-slate-600">{ret.createdBy || 'Staff'}</td>
                        <td className="py-1 px-2 border-r border-slate-300 text-center font-mono">{formatToDMY(ret.date)}</td>
                        <td className="py-1 px-2 border-r border-slate-300 font-semibold text-slate-900">
                          <div>{ret.customerAccountTitle || ret.customerName}</div>
                          {ret.isCash && <span className="text-[10px] text-amber-600 font-bold">(Cash)</span>}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-300 max-w-xs truncate text-slate-600" title={itemsDesc}>
                          {itemsDesc || '-'}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-300 text-center font-mono font-bold text-slate-800">
                          {totalQuantity.toFixed(2)}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                          {currencySymbol()} {Number(ret.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingReturn(ret)}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition cursor-pointer"
                              title="View and Print"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditReturn(ret)}
                              className="p-1 text-slate-600 hover:text-blue-700 cursor-pointer"
                              title="Edit Return"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReturn(ret)}
                              className="p-1 text-slate-600 hover:text-rose-700 cursor-pointer"
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

          {/* Pagination: 1 2 Next Last */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2 text-xs font-semibold text-slate-600">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setListPage(pageNum)}
                    className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                      listPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
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
                  className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
                >
                  Next
                </button>
              )}
              <button
                type="button"
                onClick={() => setListPage(totalPages)}
                className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Last
              </button>
            </div>
          )}
        </div>
      )}

      {/* View & Print Modal */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Sale Return Receipt #{viewingReturn.returnNumberFormatted}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReturn(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-bold text-slate-800 text-sm">{viewingReturn.customerAccountTitle}</span>
                  <span className="text-slate-500 block font-mono text-[11px]">{viewingReturn.customerCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Date</span>
                  <span className="font-mono text-slate-800 font-bold">{formatToDMY(viewingReturn.date)}</span>
                  <span className="text-emerald-700 block font-bold text-sm mt-1">
                    {currencySymbol()} {Number(viewingReturn.netTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8f9fa] text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-1.5">Item</th>
                      <th className="p-1.5 text-center">CTN</th>
                      <th className="p-1.5 text-center">Qty</th>
                      <th className="p-1.5 text-right">Rate</th>
                      <th className="p-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(viewingReturn.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-semibold text-slate-800">{it.itemTitle}</td>
                        <td className="p-1.5 text-center font-mono">{it.ctn || 0}</td>
                        <td className="p-1.5 text-center font-mono text-blue-700 font-bold">{it.qty}</td>
                        <td className="p-1.5 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
                        <td className="p-1.5 text-right font-mono text-slate-900 font-bold">{Number(it.total).toFixed(2)}</td>
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
