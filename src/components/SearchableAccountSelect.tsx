import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Building2, Users, Landmark, Wallet, Receipt } from 'lucide-react';
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
}

export const SearchableAccountSelect: React.FC<SearchableAccountSelectProps> = ({
  accounts = [],
  selectedAccountId = '',
  onSelectAccount,
  placeholder = 'Search account name or code (↑ ↓ to navigate, Enter to select)...',
  label,
  required = false,
  className = '',
  inputRef: externalInputRef,
  onEnterNext,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = externalInputRef || internalInputRef;

  // Guarantee valid array
  const safeAccounts = useMemo(() => {
    return Array.isArray(accounts) ? accounts.filter((a): a is GlAccountOption => Boolean(a && a.id)) : [];
  }, [accounts]);

  // Safely find selected account
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return undefined;
    return safeAccounts.find(
      (a) => a && (a.id === selectedAccountId || a.code === selectedAccountId)
    );
  }, [safeAccounts, selectedAccountId]);

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

  // Filter accounts in real-time with multi-token smart search
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return safeAccounts;
    const q = searchTerm.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return safeAccounts.filter((a) => {
      if (!a) return false;
      const title = String(a.title || '').toLowerCase();
      const code = String(a.code || '').toLowerCase();
      const type = String(a.type || '').toLowerCase();
      const city = String((a as any).city || '').toLowerCase();
      const combined = `${code} ${title} ${type} ${city}`;

      return tokens.every((token) => combined.includes(token));
    });
  }, [safeAccounts, searchTerm]);

  // Group accounts safely
  const grouped = useMemo(() => {
    const exp = filteredAccounts.filter((a) => a && a.type === 'Expense');
    const cust = filteredAccounts.filter((a) => a && a.type === 'Customer');
    const supp = filteredAccounts.filter((a) => a && a.type === 'Supplier');
    const bank = filteredAccounts.filter((a) => a && a.type === 'Bank');
    const cash = filteredAccounts.filter((a) => a && a.type === 'Cash');
    return { exp, cust, supp, bank, cash };
  }, [filteredAccounts]);

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
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
              selectedAccount.balanceType === 'DR'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-400'
                : 'bg-purple-950/40 border-purple-800/60 text-purple-300'
            }`}>
              {selectedAccount.balanceFormatted || '0.00'}
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
            placeholder={placeholder}
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

      {/* Floating Dropdown List: Generous width (min-w-[440px] to 520px) so customer and supplier names are NEVER squished */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 max-h-84 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 text-xs w-full min-w-[340px] sm:min-w-[460px] md:min-w-[520px] animate-in fade-in duration-100">
          {filteredAccounts.length === 0 ? (
            <div className="py-5 px-4 text-center text-slate-400 text-xs">
              No account found matching "{searchTerm}".
            </div>
          ) : (
            <>
              {/* Group 1: Expense Accounts */}
              {/* Group 1: Expense Accounts */}
              {grouped.exp.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 bg-slate-950/90 text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80">
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expense Accounts</span>
                    <span className="ml-auto text-slate-500 font-mono text-[10px]">({grouped.exp.length})</span>
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
                            <span className="text-slate-500">• Expense</span>
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
              )}

              {/* Group 2: Customers (Bara sa Name, Bold, Clear) */}
              {grouped.cust.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 bg-slate-950/90 text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Customers &amp; Clients</span>
                    <span className="ml-auto text-slate-500 font-mono text-[10px]">({grouped.cust.length})</span>
                  </div>
                  {grouped.cust.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
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
                            ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                            : isHighlighted
                            ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                            : 'hover:bg-slate-800/90 text-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          {/* Prominent, large customer name */}
                          <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                            {acc.title || ''}
                          </div>
                          {/* Code & Area */}
                          <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-400">
                            <span className="text-sky-400 font-bold">{acc.code || ''}</span>
                            {cityStr ? <span className="text-slate-400 truncate">• {cityStr}</span> : null}
                          </div>
                        </div>

                        {/* Clean standard balance without verbose clutter */}
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            acc.balanceType === 'DR'
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                          }`}>
                            {acc.balanceFormatted || '0.00 DR'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 3: Suppliers (Bara sa Name, Bold, Clear) */}
              {grouped.supp.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 bg-slate-950/90 text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Suppliers &amp; Vendors</span>
                    <span className="ml-auto text-slate-500 font-mono text-[10px]">({grouped.supp.length})</span>
                  </div>
                  {grouped.supp.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    const isHighlighted = acc.id === filteredAccounts[highlightedIndex]?.id;
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
                            ? 'bg-sky-950/95 border-l-4 border-l-sky-400 text-sky-200'
                            : isHighlighted
                            ? 'bg-sky-900/50 border-l-4 border-l-sky-500 text-white'
                            : 'hover:bg-slate-800/90 text-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          {/* Prominent, large supplier name */}
                          <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                            {acc.title || ''}
                          </div>
                          {/* Code & Area */}
                          <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-400">
                            <span className="text-blue-400 font-bold">{acc.code || ''}</span>
                            {cityStr ? <span className="text-slate-400 truncate">• {cityStr}</span> : null}
                          </div>
                        </div>

                        {/* Clean standard balance */}
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            acc.balanceType === 'CR'
                              ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                          }`}>
                            {acc.balanceFormatted || '0.00 CR'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 4: Banks & Cash */}
              {((grouped.bank && grouped.bank.length > 0) || (grouped.cash && grouped.cash.length > 0)) && (
                <div>
                  <div className="px-3.5 py-1.5 bg-slate-950/90 text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 border-b border-slate-800/80">
                    <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Banks &amp; Cash Accounts</span>
                  </div>
                  {[...(grouped.bank || []), ...(grouped.cash || [])].map((acc) => {
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
