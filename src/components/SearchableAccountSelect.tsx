import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Building2, Users, Landmark, Wallet, Receipt } from 'lucide-react';
import { GlAccountOption } from '../types';

interface SearchableAccountSelectProps {
  accounts: GlAccountOption[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const SearchableAccountSelect: React.FC<SearchableAccountSelectProps> = ({
  accounts = [],
  selectedAccountId,
  onSelectAccount,
  placeholder = 'Type account name or code (e.g. Al Najm, Petrol, 0101...)...',
  label,
  required = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = useMemo(() => {
    return accounts.find(
      (a) => a.id === selectedAccountId || a.code === selectedAccountId
    );
  }, [accounts, selectedAccountId]);

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

  // Filter accounts in real-time
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [accounts, searchTerm]);

  // Group accounts
  const grouped = useMemo(() => {
    const exp = filteredAccounts.filter((a) => a.type === 'Expense');
    const cust = filteredAccounts.filter((a) => a.type === 'Customer');
    const supp = filteredAccounts.filter((a) => a.type === 'Supplier');
    const bank = filteredAccounts.filter((a) => a.type === 'Bank');
    const cash = filteredAccounts.filter((a) => a.type === 'Cash');
    return { exp, cust, supp, bank, cash };
  }, [filteredAccounts]);

  const handleSelect = (account: GlAccountOption) => {
    onSelectAccount(account.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectAccount('');
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Expense':
        return <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'Customer':
        return <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'Supplier':
        return <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'Bank':
        return <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'Cash':
        return <Wallet className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
      default:
        return null;
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
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center justify-between w-full bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-sky-500 rounded-lg px-3 py-2 text-xs cursor-pointer shadow-xs transition-all group"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {getTypeIcon(selectedAccount.type)}
            <span className="font-mono font-bold text-sky-400 shrink-0">
              {selectedAccount.code}
            </span>
            <span className="font-semibold text-white truncate">
              {selectedAccount.title}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 font-medium">
              {selectedAccount.type}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] font-bold text-amber-400 font-mono">
              {selectedAccount.balanceFormatted}
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
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            required={required && !selectedAccountId}
            className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-400 outline-none shadow-xs font-medium transition-all"
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

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 text-xs animate-in fade-in duration-100">
          {filteredAccounts.length === 0 ? (
            <div className="py-4 px-3 text-center text-slate-400">
              No account found matching "{searchTerm}".
            </div>
          ) : (
            <>
              {/* Group 1: Expense Accounts */}
              {grouped.exp.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/70 text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    <span>Expense Accounts (اخراجات کے کھاتے)</span>
                    <span className="ml-auto text-slate-500 font-mono">({grouped.exp.length})</span>
                  </div>
                  {grouped.exp.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelect(acc)}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition-colors ${
                        acc.id === selectedAccountId ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-sky-400 shrink-0 text-[11px]">
                          {acc.code}
                        </span>
                        <span className="font-medium text-white truncate">
                          {acc.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-400 font-bold shrink-0 ml-2">
                        {acc.balanceFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Group 2: Customers */}
              {grouped.cust.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/70 text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0">
                    <Users className="w-3 h-3 text-sky-400" />
                    <span>Customers / Clients (گاہک / کسٹمرز)</span>
                    <span className="ml-auto text-slate-500 font-mono">({grouped.cust.length})</span>
                  </div>
                  {grouped.cust.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelect(acc)}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition-colors ${
                        acc.id === selectedAccountId ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-sky-400 shrink-0 text-[11px]">
                          {acc.code}
                        </span>
                        <span className="font-medium text-white truncate">
                          {acc.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-400 font-bold shrink-0 ml-2">
                        {acc.balanceFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Group 3: Suppliers */}
              {grouped.supp.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/70 text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0">
                    <Building2 className="w-3 h-3 text-blue-400" />
                    <span>Suppliers / Vendors (سپلائرز / ملیں)</span>
                    <span className="ml-auto text-slate-500 font-mono">({grouped.supp.length})</span>
                  </div>
                  {grouped.supp.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelect(acc)}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition-colors ${
                        acc.id === selectedAccountId ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-sky-400 shrink-0 text-[11px]">
                          {acc.code}
                        </span>
                        <span className="font-medium text-white truncate">
                          {acc.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-400 font-bold shrink-0 ml-2">
                        {acc.balanceFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Group 4: Banks & Cash */}
              {(grouped.bank.length > 0 || grouped.cash.length > 0) && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/70 text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 sticky top-0">
                    <Landmark className="w-3 h-3 text-emerald-400" />
                    <span>Banks &amp; Cash in Hand (بینک اور کیش)</span>
                  </div>
                  {[...grouped.bank, ...grouped.cash].map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelect(acc)}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition-colors ${
                        acc.id === selectedAccountId ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-emerald-400 shrink-0 text-[11px]">
                          {acc.code}
                        </span>
                        <span className="font-medium text-white truncate">
                          {acc.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-400 font-bold shrink-0 ml-2">
                        {acc.balanceFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
