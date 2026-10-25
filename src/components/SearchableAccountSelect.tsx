import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Building2, Users, Landmark, Wallet, Receipt, UserCheck } from 'lucide-react';
import { GlAccountOption } from '../types';

interface SearchableAccountSelectProps {
  accounts?: GlAccountOption[];
  selectedAccountId?: string;
  onSelectAccount: (accountId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnterNext?: () => void;
  currentTab?: string;
}

export const SearchableAccountSelect: React.FC<SearchableAccountSelectProps> = ({
  accounts = [],
  selectedAccountId = '',
  onSelectAccount,
  placeholder,
  label,
  required = false,
  className = '',
  inputRef: externalInputRef,
  onEnterNext,
  currentTab = 'cashReceipt',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = externalInputRef || internalInputRef;

  // Guarantee valid, de-duplicated accounts array
  const safeAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];
    const seen = new Set<string>();
    const out: GlAccountOption[] = [];
    for (const a of accounts) {
      if (!a || !a.id) continue;
      const key = `${a.type || ''}_${(a.code || a.id).trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(a);
      }
    }
    return out;
  }, [accounts]);

  // Tab categorization flags
  const isReceiptTab = currentTab === 'cashReceipt' || currentTab === 'bankReceipt';
  const isPaymentTab = currentTab === 'cashPayment' || currentTab === 'bankPayment';

  // Tab-scoped account universe: Receipt panels show only Customers,
  // Payment panels show Suppliers, Employees, and Expense accounts. Other tabs show everything.
  const tabScopedAccounts = useMemo(() => {
    if (isReceiptTab) return safeAccounts.filter((a) => a && a.type === 'Customer');
    if (isPaymentTab) return safeAccounts.filter((a) => a && (a.type === 'Supplier' || a.type === 'Employee' || a.type === 'Expense'));
    return safeAccounts;
  }, [safeAccounts, isReceiptTab, isPaymentTab]);

  // Safely find selected account
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return undefined;
    return safeAccounts.find(
      (a) => a && (a.id === selectedAccountId || a.code === selectedAccountId)
    );
  }, [safeAccounts, selectedAccountId]);

  // Tab-sensitive placeholder default
  const resolvedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (currentTab === 'cashReceipt' || currentTab === 'bankReceipt') {
      return 'Select or search Customer by name, Sr#, or code...';
    }
    if (currentTab === 'cashPayment' || currentTab === 'bankPayment') {
      return 'Select or search Supplier, Employee, or Expense by name or code...';
    }
    return 'Search account name or code (↑ ↓ to navigate, Enter to select)...';
  }, [placeholder, currentTab]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter accounts in real-time with multi-token smart search (including Sr#)
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return tabScopedAccounts;
    const q = searchTerm.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return tabScopedAccounts.filter((a) => {
      if (!a) return false;
      const title = String(a.title || '').toLowerCase();
      const code = String(a.code || '').toLowerCase();
      const type = String(a.type || '').toLowerCase();
      const city = String((a as any).city || '').toLowerCase();
      const sm = String((a as any).assignedSalesman || (a as any).salesman || '').toLowerCase();
      const phone = String((a as any).phone || '').toLowerCase();
      const srStr = a.srNo !== undefined ? String(a.srNo) : '';
      const srTag = a.srNo !== undefined ? `sr# ${a.srNo} sr#${a.srNo}` : '';
      const combined = `${code} ${title} ${type} ${city} ${sm} ${phone} ${srStr} ${srTag}`;

      if (srStr === q) return true;
      return tokens.every((token) => combined.includes(token));
    });
  }, [tabScopedAccounts, searchTerm]);

  // Group accounts safely with Customers sorted by Master Serial Number (Sr# 1..339)
  const grouped = useMemo(() => {
    const exp = filteredAccounts.filter((a) => a && a.type === 'Expense');
    const cust = filteredAccounts
      .filter((a) => a && a.type === 'Customer')
      .sort((a, b) => {
        const srA = a.srNo !== undefined && a.srNo !== null ? Number(a.srNo) : 9999;
        const srB = b.srNo !== undefined && b.srNo !== null ? Number(b.srNo) : 9999;
        if (srA !== srB) return srA - srB;
        return (a.code || '').localeCompare(b.code || '');
      });
    const supp = filteredAccounts.filter((a) => a && a.type === 'Supplier');
    const emp = filteredAccounts.filter((a) => a && a.type === 'Employee');
    const bank = filteredAccounts.filter((a) => a && a.type === 'Bank');
    const cash = filteredAccounts.filter((a) => a && a.type === 'Cash');
    return { exp, cust, supp, emp, bank, cash };
  }, [filteredAccounts]);

  // Tab categorization flags (defined above, near safeAccounts)

  const handleSelect = (account: GlAccountOption) => {
    if (account && account.id) {
      onSelectAccount(account.id);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectAccount('');
    setSearchTerm('');
    if (activeInputRef.current) activeInputRef.current.focus();
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'Expense':
        return <Receipt className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Customer':
        return <Users className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'Supplier':
        return <Building2 className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'Bank':
        return <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'Cash':
        return <Wallet className="w-4 h-4 text-teal-400 shrink-0" />;
      default:
        return <Receipt className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  // Reusable render block for Customer rows
  const renderCustomerGroup = () => {
    if (grouped.cust.length === 0) return null;
    return (
      <div key="group-customers">
        <div className="px-3.5 py-1.5 bg-slate-950 text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80 z-10 shadow-xs">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>Customers &amp; Receivables (Parties)</span>
          <span className="ml-auto text-sky-400/80 font-mono text-[10px] font-bold">({grouped.cust.length} customers)</span>
        </div>
        {grouped.cust.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
          const cityStr = (acc as any).city || '';
          const phoneStr = (acc as any).phone || '';
          const salesmanStr = (acc.assignedSalesman || (acc as any).salesman || '').trim();
          return (
            <div
              key={acc.id}
              data-acc-id={acc.id}
              onClick={() => handleSelect(acc)}
              onMouseEnter={() => {
                const idx = filteredAccounts.findIndex((a) => a.id === acc.id);
                if (idx !== -1) setHighlightedIndex(idx);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-800/40 last:border-b-0 ${
                isSelected
                  ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                  : isHighlighted
                  ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                  : 'hover:bg-slate-800/90 text-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  {acc.srNo ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 font-mono text-[10px] border border-orange-500/30 shrink-0 font-bold">
                      Sr#{acc.srNo}
                    </span>
                  ) : null}
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                    {acc.title || ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                  <span className="text-sky-400 font-bold">{acc.code || ''}</span>
                  {cityStr ? <span className="text-slate-400 truncate">• {cityStr}</span> : null}
                  {phoneStr ? <span className="text-slate-400 font-sans truncate">• Ph: {phoneStr}</span> : null}
                  {salesmanStr ? (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 text-[10px] font-sans font-bold">
                      👤 {salesmanStr}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Exact Ledger Balance with clear DR / CR Badge */}
              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border shadow-xs ${
                    acc.balanceType === 'DR'
                      ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                      : 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                  }`}
                >
                  {acc.balanceFormatted || `${(acc.balance || 0).toFixed(2)} DR`}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">Receivable Balance</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable render block for Supplier rows
  const renderSupplierGroup = () => {
    if (grouped.supp.length === 0) return null;
    return (
      <div key="group-suppliers">
        <div className="px-3.5 py-1.5 bg-slate-950 text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80 z-10 shadow-xs">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Suppliers &amp; Vendors (Payables)</span>
          <span className="ml-auto text-blue-400/80 font-mono text-[10px] font-bold">({grouped.supp.length} suppliers)</span>
        </div>
        {grouped.supp.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
          const cityStr = (acc as any).city || '';
          const phoneStr = (acc as any).phone || '';
          return (
            <div
              key={acc.id}
              data-acc-id={acc.id}
              onClick={() => handleSelect(acc)}
              onMouseEnter={() => {
                const idx = filteredAccounts.findIndex((a) => a.id === acc.id);
                if (idx !== -1) setHighlightedIndex(idx);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-800/40 last:border-b-0 ${
                isSelected
                  ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                  : isHighlighted
                  ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                  : 'hover:bg-slate-800/90 text-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                  {acc.title || ''}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                  <span className="text-blue-400 font-bold">{acc.code || ''}</span>
                  {cityStr ? <span className="text-slate-400 truncate">• {cityStr}</span> : null}
                  {phoneStr ? <span className="text-slate-400 font-sans truncate">• Ph: {phoneStr}</span> : null}
                </div>
              </div>

              {/* Exact Supplier Payable Balance */}
              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border shadow-xs ${
                    acc.balanceType === 'CR'
                      ? 'bg-purple-950/60 border-purple-600/70 text-purple-300'
                      : 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                  }`}
                >
                  {acc.balanceFormatted || `${(acc.balance || 0).toFixed(2)} CR`}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">Payable Balance</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable render block for Employee rows
  const renderEmployeeGroup = () => {
    if (!grouped.emp || grouped.emp.length === 0) return null;
    return (
      <div key="group-employees">
        <div className="px-3.5 py-1.5 bg-slate-950 text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80 z-10 shadow-xs">
          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Employees &amp; Staff (Salaries / Advances)</span>
          <span className="ml-auto text-purple-400/80 font-mono text-[10px] font-bold">({grouped.emp.length} staff)</span>
        </div>
        {grouped.emp.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
          const phoneStr = (acc as any).phone || '';
          const cityStr = (acc as any).city || '';
          return (
            <div
              key={acc.id}
              data-acc-id={acc.id}
              onClick={() => handleSelect(acc)}
              onMouseEnter={() => {
                const idx = filteredAccounts.findIndex((a) => a.id === acc.id);
                if (idx !== -1) setHighlightedIndex(idx);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-800/40 last:border-b-0 ${
                isSelected
                  ? 'bg-purple-950/95 border-l-4 border-l-purple-400 text-purple-200'
                  : isHighlighted
                  ? 'bg-purple-900/50 border-l-4 border-l-purple-500 text-white'
                  : 'hover:bg-slate-800/90 text-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                  {acc.title || ''}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                  <span className="text-purple-400 font-bold">{acc.code || ''}</span>
                  <span className="text-slate-400 truncate">• Staff / Salesman</span>
                  {cityStr ? <span className="text-slate-400 truncate">• {cityStr}</span> : null}
                  {phoneStr ? <span className="text-slate-400 font-sans truncate">• Ph: {phoneStr}</span> : null}
                </div>
              </div>

              {/* Employee Remaining / Salary Balance */}
              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border shadow-xs ${
                    acc.balanceType === 'CR'
                      ? 'bg-purple-950/60 border-purple-600/70 text-purple-300'
                      : 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                  }`}
                >
                  {acc.balanceFormatted || `${(acc.balance || 0).toFixed(2)} CR`}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">Salary / Balance</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable render block for Expense rows
  const renderExpenseGroup = () => {
    if (grouped.exp.length === 0) return null;
    return (
      <div key="group-expenses">
        <div className="px-3.5 py-1.5 bg-slate-950 text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80 z-10 shadow-xs">
          <Receipt className="w-3.5 h-3.5 text-amber-400" />
          <span>Expense Accounts</span>
          <span className="ml-auto text-amber-400/80 font-mono text-[10px] font-bold">({grouped.exp.length} accounts)</span>
        </div>
        {grouped.exp.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
          return (
            <div
              key={acc.id}
              data-acc-id={acc.id}
              onClick={() => handleSelect(acc)}
              onMouseEnter={() => {
                const idx = filteredAccounts.findIndex((a) => a.id === acc.id);
                if (idx !== -1) setHighlightedIndex(idx);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-800/40 last:border-b-0 ${
                isSelected
                  ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                  : isHighlighted
                  ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                  : 'hover:bg-slate-800/90 text-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                  {acc.title || ''}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-400">
                  <span className="text-amber-400 font-bold">{acc.code || ''}</span>
                  <span className="text-slate-500">• Expense Account</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-amber-950/40 border-amber-800/60 text-amber-400">
                  {acc.balanceFormatted || '0.00 DR'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable render block for Banks and Cash
  const renderBanksAndCashGroup = () => {
    const list = [...(grouped.bank || []), ...(grouped.cash || [])];
    if (list.length === 0) return null;
    return (
      <div key="group-banks-cash">
        <div className="px-3.5 py-1.5 bg-slate-950 text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80 z-10 shadow-xs">
          <Landmark className="w-3.5 h-3.5 text-emerald-400" />
          <span>Banks &amp; Cash Accounts</span>
        </div>
        {list.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
          return (
            <div
              key={acc.id}
              data-acc-id={acc.id}
              onClick={() => handleSelect(acc)}
              onMouseEnter={() => {
                const idx = filteredAccounts.findIndex((a) => a.id === acc.id);
                if (idx !== -1) setHighlightedIndex(idx);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-800/40 last:border-b-0 ${
                isSelected
                  ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                  : isHighlighted
                  ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                  : 'hover:bg-slate-800/90 text-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-[13px] sm:text-sm font-bold text-white tracking-wide truncate">
                  {acc.title || ''}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">{acc.code || ''}</span>
                  <span className="text-slate-500">• {acc.type || 'Bank'}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-800/60 text-emerald-300">
                  {acc.balanceFormatted || '0.00 DR'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Selected Account Display / Search Box Input */}
      {selectedAccount && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => activeInputRef.current?.focus(), 50);
          }}
          className="flex items-center justify-between w-full bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-sky-500 rounded-lg px-3 py-2 text-xs cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            {getTypeIcon(selectedAccount.type)}
            {selectedAccount.srNo ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 font-mono text-[10px] border border-orange-500/30 shrink-0 font-bold">
                Sr#{selectedAccount.srNo}
              </span>
            ) : null}
            <span className="font-mono font-bold text-sky-400 text-xs shrink-0">
              {selectedAccount.code || ''}
            </span>
            <span className="font-bold text-white text-sm truncate">
              {selectedAccount.title || 'Selected Account'}
            </span>
            {selectedAccount.type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 font-medium hidden sm:inline-block">
                {selectedAccount.type}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-black font-mono px-2.5 py-1 rounded-md border shadow-xs ${
                selectedAccount.balanceType === 'DR'
                  ? 'bg-amber-950/70 border-amber-600/80 text-amber-300'
                  : 'bg-purple-950/70 border-purple-600/80 text-purple-300'
              }`}
              title="Authoritative live ledger balance"
            >
              Ledger: {selectedAccount.balanceFormatted || '0.00'}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-sky-400" />
          </div>
          <input
            ref={activeInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                  return;
                }
                setHighlightedIndex((prev) => {
                  const nextIdx = Math.min(prev + 1, Math.max(0, filteredAccounts.length - 1));
                  const targetAcc = filteredAccounts[nextIdx];
                  if (targetAcc) {
                    setTimeout(() => {
                      const el = containerRef.current?.querySelector(`[data-acc-id="${targetAcc.id}"]`);
                      el?.scrollIntoView({ block: 'nearest' });
                    }, 10);
                  }
                  return nextIdx;
                });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                  return;
                }
                setHighlightedIndex((prev) => {
                  const nextIdx = Math.max(prev - 1, 0);
                  const targetAcc = filteredAccounts[nextIdx];
                  if (targetAcc) {
                    setTimeout(() => {
                      const el = containerRef.current?.querySelector(`[data-acc-id="${targetAcc.id}"]`);
                      el?.scrollIntoView({ block: 'nearest' });
                    }, 10);
                  }
                  return nextIdx;
                });
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (isOpen && filteredAccounts.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredAccounts.length) {
                  handleSelect(filteredAccounts[highlightedIndex]);
                  if (onEnterNext) onEnterNext();
                } else if (onEnterNext) {
                  onEnterNext();
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={resolvedPlaceholder}
            required={required && !selectedAccountId}
            className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-400 outline-none font-medium transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Dropdown List: Ordered by tab purpose */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 text-xs w-full min-w-[340px] sm:min-w-[480px] md:min-w-[560px] animate-in fade-in duration-100">
          {filteredAccounts.length === 0 ? (
            <div className="py-5 px-4 text-center text-slate-400 text-xs">
              No account found matching "{searchTerm}".
            </div>
          ) : (
            <>
              {/* Receipt Tabs (Cash Receipt / Bank Receipt): Customers ONLY */}
              {isReceiptTab && renderCustomerGroup()}

              {/* Payment Tabs (Cash Payment / Bank Payment): Suppliers, Staff, and Expenses */}
              {isPaymentTab && (
                <>
                  {renderSupplierGroup()}
                  {renderEmployeeGroup()}
                  {renderExpenseGroup()}
                </>
              )}

              {/* Other tabs (Cash Book / Journal Voucher): Standard order */}
              {!isReceiptTab && !isPaymentTab && (
                <>
                  {renderCustomerGroup()}
                  {renderSupplierGroup()}
                  {renderEmployeeGroup()}
                  {renderExpenseGroup()}
                  {renderBanksAndCashGroup()}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
