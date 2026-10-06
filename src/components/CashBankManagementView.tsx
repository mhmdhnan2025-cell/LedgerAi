import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Banknote,
  Receipt,
  CreditCard,
  BookOpen,
  Scale,
  Search,
  Plus,
  RefreshCw,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Printer,
  ChevronDown,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BankAccount,
  CashAccount,
  GlAccountOption,
  Voucher,
  VoucherEntry,
  VoucherType,
  NextVoucherNumbers,
  User,
  CompanyProfile,
} from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';
import { CalendarModalPicker } from './CalendarModalPicker';
import { SearchableAccountSelect } from './SearchableAccountSelect';

export interface CashBankManagementViewProps {
  companyProfile?: CompanyProfile | null;
  currentUser?: User | null;
  initialTab?: 'bankReceipt' | 'bankPayment' | 'cashReceipt' | 'cashPayment' | 'cashBook' | 'journalVoucher' | 'searchVoucher' | 'banks';
  onBackToSettings?: () => void;
  onNavigateTab?: (tab: string) => void;
  onDataMutated?: () => void;
}

export const CashBankManagementView: React.FC<CashBankManagementViewProps> = ({
  companyProfile,
  currentUser,
  initialTab = 'cashReceipt',
  onBackToSettings,
  onNavigateTab,
  onDataMutated,
}) => {
  const [activeTab, setActiveTab] = useState<
    'bankReceipt' | 'bankPayment' | 'cashReceipt' | 'cashPayment' | 'cashBook' | 'journalVoucher' | 'searchVoucher' | 'banks'
  >(initialTab);

  // Core Data
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccountOption[]>([]);
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [nextNumbers, setNextNumbers] = useState<NextVoucherNumbers>({
    jvNumber: 19694,
    voucherNumbers: { BR: 1, BP: 1, CR: 5514, CP: 1025, CB: 101, JV: 19694 },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Format today as DD-MM-YYYY
  const getTodayFormatted = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Form State for Vouchers
  const [voucherDate, setVoucherDate] = useState<string>(getTodayFormatted());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState('');

  // Line Item Entry State
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(getTodayFormatted());
  const [isChequeCalendarOpen, setIsChequeCalendarOpen] = useState(false);
  const [chequeBank, setChequeBank] = useState('');
  const [narration, setNarration] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDebit, setEntryDebit] = useState('');
  const [entryCredit, setEntryCredit] = useState('');
  const [entryReceipt, setEntryReceipt] = useState('');
  const [entryPayment, setEntryPayment] = useState('');

  // Grid Entries
  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);

  // Voucher Being Edited in Search View
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  // Search Voucher Filters
  const [searchFilterType, setSearchFilterType] = useState<string>('all');
  const [searchFromDate, setSearchFromDate] = useState<string>('');
  const [searchToDate, setSearchToDate] = useState<string>('');
  const [searchFromJv, setSearchFromJv] = useState<string>('');
  const [searchToJv, setSearchToJv] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Voucher[]>([]);
  const [isSearchingVouchers, setIsSearchingVouchers] = useState(false);
  const [viewingVoucherSlip, setViewingVoucherSlip] = useState<Voucher | null>(null);

  // Banks Management State
  const [bankSubTab, setBankSubTab] = useState<'list' | 'new'>('list');
  const [viewingBank, setViewingBank] = useState<BankAccount | null>(null);
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankTitle, setNewBankTitle] = useState('');
  const [newBankType, setNewBankType] = useState('Non Merchant');
  const [newBankDesc, setNewBankDesc] = useState('COMPANY ACCOUNT');
  const [newBankBalance, setNewBankBalance] = useState('0');
  const [newBankBalType, setNewBankBalType] = useState<'DR' | 'CR'>('DR');
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Quick Add Account Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddMobile, setQuickAddMobile] = useState('');
  const [quickAddBalance, setQuickAddBalance] = useState('0');
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);

  // Load All Primary Data
  const loadPrimaryData = async () => {
    setIsLoading(true);
    try {
      const [banksData, cashData, glData, numsData, salesData] = await Promise.all([
        api.getBanks().catch(() => []),
        api.getCashAccounts().catch(() => []),
        api.getGlAccounts().catch(() => []),
        api.getNextVoucherNumbers().catch(() => ({
          jvNumber: 19694,
          voucherNumbers: { BR: 1, BP: 1, CR: 5514, CP: 1025, CB: 101, JV: 19694 },
        })),
        api.getSalesmen().catch(() => []),
      ]);

      setBanks(banksData || []);
      setCashAccounts(cashData || []);
      setGlAccounts(glData || []);
      setNextNumbers(numsData);
      setSalesmen(salesData || []);

      // Default selected bank & cash account
      if (banksData && banksData.length > 0 && !selectedBankId) {
        setSelectedBankId(banksData[0].id);
      }
      if (cashData && cashData.length > 0 && !selectedCashAccountId) {
        setSelectedCashAccountId(cashData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load primary Cash/Bank data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrimaryData();
  }, []);

  // Update default narration based on tab
  useEffect(() => {
    if (activeTab === 'cashReceipt') setNarration('Amount received in cash');
    else if (activeTab === 'cashPayment') setNarration('Amount paid in cash');
    else if (activeTab === 'bankReceipt') setNarration('Cheque received from client');
    else if (activeTab === 'bankPayment') setNarration('Bank payment issued');
    else if (activeTab === 'cashBook') setNarration('Cash transaction');
    else if (activeTab === 'journalVoucher') setNarration('Adjustment journal entry');
  }, [activeTab]);

  // Load vouchers when switching to search tab
  useEffect(() => {
    if (activeTab === 'searchVoucher') {
      handleSearchVouchers();
    }
  }, [activeTab]);

  // Current Selected Bank & Cash Account Objects
  const currentBank = banks.find((b) => b.id === selectedBankId || b.accountCode === selectedBankId);
  const currentCashAccount = cashAccounts.find((c) => c.id === selectedCashAccountId || c.accountCode === selectedCashAccountId);

  // Current Selected Entry Account
  const currentEntryAccount = glAccounts.find((a) => a.id === selectedAccountId || a.code === selectedAccountId);

  // Grouped and Search-Filtered GL Accounts
  const filteredGlAccounts = glAccounts.filter((a) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.trim().toLowerCase();
    return a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
  });
  const filteredExpAccounts = filteredGlAccounts.filter((a) => a.type === 'Expense');
  const filteredCustAccounts = filteredGlAccounts.filter((a) => a.type === 'Customer');
  const filteredSuppAccounts = filteredGlAccounts.filter((a) => a.type === 'Supplier');
  const filteredBankCashAccounts = filteredGlAccounts.filter((a) => a.type === 'Bank' || a.type === 'Cash');

  // Reset entry line
  const resetEntryLine = () => {
    setSelectedAccountId('');
    setChequeNo('');
    setChequeBank('');
    setEntryAmount('');
    setEntryDebit('');
    setEntryCredit('');
    setEntryReceipt('');
    setEntryPayment('');
    setEditingEntryIndex(null);
  };

  // Reset entire voucher form
  const resetVoucherForm = () => {
    setEditingVoucherId(null);
    setEntries([]);
    setPoNumber('');
    setSelectedSalesman('');
    setVoucherDate(getTodayFormatted());
    resetEntryLine();
    loadPrimaryData();
  };

  // Add or Update Entry in Voucher Grid
  const handleAddOrUpdateEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentEntryAccount) {
      setFeedback({ type: 'error', text: 'Please select an Account (G/L Account) first.' });
      return;
    }

    let amt = parseFloat(entryAmount) || 0;
    let dr = parseFloat(entryDebit) || 0;
    let cr = parseFloat(entryCredit) || 0;
    let rcpt = parseFloat(entryReceipt) || 0;
    let pymt = parseFloat(entryPayment) || 0;

    if (activeTab === 'journalVoucher') {
      if (dr <= 0 && cr <= 0) {
        setFeedback({ type: 'error', text: 'Please enter Debit or Credit amount.' });
        return;
      }
      amt = dr > 0 ? dr : cr;
    } else if (activeTab === 'cashBook') {
      if (rcpt <= 0 && pymt <= 0) {
        setFeedback({ type: 'error', text: 'Please enter Receipt or Payment amount.' });
        return;
      }
      amt = rcpt > 0 ? rcpt : pymt;
    } else {
      if (amt <= 0) {
        setFeedback({ type: 'error', text: 'Please enter a valid Amount.' });
        return;
      }
    }

    const newEntry: VoucherEntry = {
      id: editingEntryIndex !== null ? entries[editingEntryIndex].id : `ent-${Date.now()}`,
      accountId: currentEntryAccount.id,
      accountCode: currentEntryAccount.code,
      accountTitle: currentEntryAccount.title,
      accountType: currentEntryAccount.type,
      chequeNo: chequeNo.trim() || undefined,
      chequeDate: chequeDate || undefined,
      chequeBank: chequeBank.trim() || undefined,
      narration: narration.trim() || (activeTab.includes('Payment') ? 'Paid' : 'Received'),
      amount: amt,
      debit: dr > 0 ? dr : undefined,
      credit: cr > 0 ? cr : undefined,
      receipt: rcpt > 0 ? rcpt : undefined,
      payment: pymt > 0 ? pymt : undefined,
    };

    if (editingEntryIndex !== null) {
      const updated = [...entries];
      updated[editingEntryIndex] = newEntry;
      setEntries(updated);
      setEditingEntryIndex(null);
    } else {
      setEntries([...entries, newEntry]);
    }

    // Reset line items
    setSelectedAccountId('');
    setChequeNo('');
    setChequeBank('');
    setEntryAmount('');
    setEntryDebit('');
    setEntryCredit('');
    setEntryReceipt('');
    setEntryPayment('');
    setFeedback(null);
  };

  const handleEditEntry = (idx: number) => {
    const item = entries[idx];
    setSelectedAccountId(item.accountId || item.accountCode);
    setNarration(item.narration);
    setChequeNo(item.chequeNo || '');
    setChequeDate(item.chequeDate || getTodayFormatted());
    setChequeBank(item.chequeBank || '');
    setEntryAmount(String(item.amount || ''));
    setEntryDebit(String(item.debit || ''));
    setEntryCredit(String(item.credit || ''));
    setEntryReceipt(String(item.receipt || ''));
    setEntryPayment(String(item.payment || ''));
    setEditingEntryIndex(idx);
  };

  const handleDeleteEntry = (idx: number) => {
    setEntries(entries.filter((_, i) => i !== idx));
    if (editingEntryIndex === idx) setEditingEntryIndex(null);
  };

  // Voucher Total Amount
  const gridTotal = entries.reduce((sum, e) => {
    if (activeTab === 'cashBook') return sum + (e.receipt || e.payment || e.amount || 0);
    if (activeTab === 'journalVoucher') return sum + (e.debit || e.amount || 0);
    return sum + (e.amount || 0);
  }, 0);

  const jvTotalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const jvTotalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const jvDifference = Math.abs(jvTotalDebit - jvTotalCredit);

  // Post Voucher
  const handlePostVoucher = async (openNew: boolean = false) => {
    if (entries.length === 0) {
      setFeedback({ type: 'error', text: 'Please add at least one entry line before posting.' });
      return;
    }

    if (activeTab === 'journalVoucher' && jvDifference > 0.01) {
      if (!window.confirm(`Warning: Journal Voucher is not balanced (Debit: ${jvTotalDebit}, Credit: ${jvTotalCredit}, Diff: ${jvDifference}). Do you want to proceed?`)) {
        return;
      }
    }

    setIsLoading(true);
    setFeedback(null);

    let voucherType: VoucherType = 'CR';
    let vNumber = nextNumbers.voucherNumbers.CR;
    if (activeTab === 'bankReceipt') { voucherType = 'BR'; vNumber = nextNumbers.voucherNumbers.BR; }
    else if (activeTab === 'bankPayment') { voucherType = 'BP'; vNumber = nextNumbers.voucherNumbers.BP; }
    else if (activeTab === 'cashReceipt') { voucherType = 'CR'; vNumber = nextNumbers.voucherNumbers.CR; }
    else if (activeTab === 'cashPayment') { voucherType = 'CP'; vNumber = nextNumbers.voucherNumbers.CP; }
    else if (activeTab === 'cashBook') { voucherType = 'CB'; vNumber = nextNumbers.voucherNumbers.CB; }
    else if (activeTab === 'journalVoucher') { voucherType = 'JV'; vNumber = nextNumbers.voucherNumbers.JV; }

    const payload: Partial<Voucher> = {
      voucherType,
      jvNumber: editingVoucherId ? undefined : nextNumbers.jvNumber,
      voucherNumber: editingVoucherId ? undefined : vNumber,
      date: voucherDate,
      poNumber: poNumber.trim() || undefined,
      bankAccountId: activeTab.startsWith('bank') ? selectedBankId : undefined,
      bankAccountTitle: activeTab.startsWith('bank') ? currentBank?.bankTitle : undefined,
      cashAccountId: activeTab.startsWith('cash') ? selectedCashAccountId : undefined,
      cashAccountTitle: activeTab.startsWith('cash') ? currentCashAccount?.title : undefined,
      salesmanId: selectedSalesman || undefined,
      salesmanTitle: selectedSalesman || undefined,
      totalAmount: gridTotal,
      entries,
    };

    try {
      if (editingVoucherId) {
        await api.updateVoucher(editingVoucherId, payload);
        setFeedback({ type: 'success', text: `Voucher updated and all ledger balances synced successfully!` });
      } else {
        await api.createVoucher(payload);
        setFeedback({ type: 'success', text: `Voucher posted successfully! Ledger accounts and Tijori updated.` });
      }

      await loadPrimaryData();
      if (onDataMutated) onDataMutated();

      if (openNew || editingVoucherId) {
        resetVoucherForm();
      } else {
        setEntries([]);
        resetEntryLine();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to post voucher' });
    } finally {
      setIsLoading(false);
    }
  };

  // Search Vouchers
  const handleSearchVouchers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingVouchers(true);
    setFeedback(null);
    try {
      const data = await api.getVouchers({
        voucherType: searchFilterType !== 'all' ? searchFilterType : undefined,
        fromDate: searchFromDate || undefined,
        toDate: searchToDate || undefined,
        fromJv: searchFromJv || undefined,
        toJv: searchToJv || undefined,
        search: searchQuery || undefined,
      });
      setSearchResults(data || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to search vouchers' });
    } finally {
      setIsSearchingVouchers(false);
    }
  };

  // Edit Voucher from Search View
  const handleEditVoucherFromSearch = (v: Voucher) => {
    setEditingVoucherId(v.id);
    setVoucherDate(v.date);
    setPoNumber(v.poNumber || '');
    if (v.bankAccountId) setSelectedBankId(v.bankAccountId);
    if (v.cashAccountId) setSelectedCashAccountId(v.cashAccountId);
    if (v.salesmanTitle) setSelectedSalesman(v.salesmanTitle);
    setEntries(v.entries || []);

    if (v.voucherType === 'BR') setActiveTab('bankReceipt');
    else if (v.voucherType === 'BP') setActiveTab('bankPayment');
    else if (v.voucherType === 'CR') setActiveTab('cashReceipt');
    else if (v.voucherType === 'CP') setActiveTab('cashPayment');
    else if (v.voucherType === 'CB') setActiveTab('cashBook');
    else if (v.voucherType === 'JV') setActiveTab('journalVoucher');
  };

  // Delete Voucher
  const handleDeleteVoucher = async (v: Voucher) => {
    if (!window.confirm(`Are you sure you want to delete Voucher #${v.voucherNumberFormatted} (JV# ${v.jvNumber})? This will reverse all ledger account balance updates!`)) {
      return;
    }
    setIsLoading(true);
    try {
      await api.deleteVoucher(v.id);
      setFeedback({ type: 'success', text: `Voucher #${v.voucherNumberFormatted} deleted and balances reverted.` });
      setSearchResults((prev) => prev.filter((item) => item.id !== v.id));
      await loadPrimaryData();
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete voucher' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save New Bank (Banks Management)
  const handleSaveNewBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankTitle.trim()) {
      setFeedback({ type: 'error', text: 'Bank Title is required' });
      return;
    }
    setIsSavingBank(true);
    setFeedback(null);
    try {
      const added = await api.createBank({
        accountCode: newBankCode.trim() || undefined,
        bankTitle: newBankTitle.trim(),
        bankType: newBankType.trim() || 'Non Merchant',
        description: newBankDesc.trim(),
        balance: parseFloat(newBankBalance) || 0,
        balanceType: newBankBalType,
      });
      setBanks((prev) => [...prev, added]);
      setBankSubTab('list');
      setNewBankCode('');
      setNewBankTitle('');
      setNewBankDesc('COMPANY ACCOUNT');
      setNewBankBalance('0');
      setFeedback({ type: 'success', text: `Bank "${added.bankTitle}" added successfully!` });
      await loadPrimaryData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add bank' });
    } finally {
      setIsSavingBank(false);
    }
  };

  // Delete Bank
  const handleDeleteBank = async (bank: BankAccount) => {
    if (!window.confirm(`Are you sure you want to delete Bank "${bank.bankTitle}" (${bank.accountCode})?`)) {
      return;
    }
    try {
      await api.deleteBank(bank.id);
      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
      setFeedback({ type: 'success', text: `Bank "${bank.bankTitle}" deleted.` });
      await loadPrimaryData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete bank' });
    }
  };

  // Quick Add Customer / Account
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;
    setIsSavingQuickAdd(true);
    try {
      const newCust = await api.createCustomer({
        accountTitle: quickAddName.trim(),
        name: quickAddName.trim(),
        mobile: quickAddMobile.trim() || '0500000000',
        outstandingBalance: parseFloat(quickAddBalance) || 0,
        customerGroup: 'General',
      });
      setIsQuickAddOpen(false);
      setQuickAddName('');
      setQuickAddMobile('');
      setQuickAddBalance('0');
      setFeedback({ type: 'success', text: `Account "${newCust.accountTitle}" created successfully!` });
      await loadPrimaryData();
      setSelectedAccountId(newCust.id);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to quick add account' });
    } finally {
      setIsSavingQuickAdd(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {onBackToSettings && (
            <button
              onClick={onBackToSettings}
              className="hover:text-white transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>Settings Hub</span>
              <span>/</span>
            </button>
          )}
          <span className="text-sky-400 font-bold flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-sky-400" />
            <span>Cash / Bank &amp; Vouchers Hub (کیش اور بینک واؤچرز)</span>
          </span>
          {editingVoucherId && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
              Editing Voucher
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPrimaryData}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Refresh accounts & balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {onBackToSettings && (
            <button
              onClick={onBackToSettings}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              All Settings Options
            </button>
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 flex flex-wrap gap-1 text-xs font-semibold overflow-x-auto no-scrollbar shadow-sm">
        <button
          onClick={() => { setActiveTab('bankReceipt'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'bankReceipt'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Bank Receipt Panel</span>
        </button>

        <button
          onClick={() => { setActiveTab('bankPayment'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'bankPayment'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Bank Payment Panel</span>
        </button>

        <button
          onClick={() => { setActiveTab('cashReceipt'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'cashReceipt'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Cash Receipt Panel</span>
        </button>

        <button
          onClick={() => { setActiveTab('cashPayment'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'cashPayment'
              ? 'bg-rose-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Cash Payment Panel</span>
        </button>

        <button
          onClick={() => { setActiveTab('cashBook'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'cashBook'
              ? 'bg-amber-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Cash Book Voucher</span>
        </button>

        <button
          onClick={() => { setActiveTab('journalVoucher'); setEditingVoucherId(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'journalVoucher'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Journal Voucher (JV)</span>
        </button>

        <button
          onClick={() => setActiveTab('searchVoucher')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'searchVoucher'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Voucher</span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'banks'
              ? 'bg-teal-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Banks Management</span>
        </button>
      </div>

      {/* Notifications Bar */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-100 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1, 2, 3, 4, 5, 6: VOUCHER PANELS (BANK RECEIPT / PAYMENT, CASH RECEIPT / PAYMENT, CASH BOOK, JV) */}
      {/* ========================================================================= */}
      {activeTab !== 'searchVoucher' && activeTab !== 'banks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Panel Header Title (Matching Screenshot Blue Top Header) */}
          <div className="bg-sky-600/90 text-white px-5 py-2.5 font-bold text-sm tracking-wide flex items-center justify-between">
            <span>
              {activeTab === 'bankReceipt' && 'Bank Receipt Panel'}
              {activeTab === 'bankPayment' && 'Bank Payment Panel'}
              {activeTab === 'cashReceipt' && 'Cash Receipt Panel'}
              {activeTab === 'cashPayment' && 'Cash Payment Panel'}
              {activeTab === 'cashBook' && 'Cash Book Voucher Panel'}
              {activeTab === 'journalVoucher' && 'Journal Voucher (JV) Panel'}
            </span>
            {editingVoucherId && (
              <button
                type="button"
                onClick={resetVoucherForm}
                className="text-xs bg-slate-900/60 hover:bg-slate-900 text-white px-2.5 py-1 rounded transition"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Top Control Bar Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* JV # */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">JV #</span>
                <input
                  type="text"
                  readOnly
                  value={editingVoucherId ? 'EDIT' : nextNumbers.jvNumber}
                  className="w-20 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                />
              </div>

              {/* Voucher # (BR#, BP#, CR#, CP#, CB#) */}
              {activeTab === 'bankReceipt' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">BR #</span>
                  <input
                    type="text"
                    readOnly
                    value={nextNumbers.voucherNumbers.BR}
                    className="w-16 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                  />
                </div>
              )}

              {activeTab === 'bankPayment' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">BP #</span>
                  <input
                    type="text"
                    readOnly
                    value={nextNumbers.voucherNumbers.BP}
                    className="w-16 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                  />
                </div>
              )}

              {activeTab === 'cashReceipt' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">CR #</span>
                  <input
                    type="text"
                    readOnly
                    value={nextNumbers.voucherNumbers.CR}
                    className="w-20 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                  />
                </div>
              )}

              {activeTab === 'cashPayment' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">CP #</span>
                  <input
                    type="text"
                    readOnly
                    value={nextNumbers.voucherNumbers.CP}
                    className="w-20 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                  />
                </div>
              )}

              {activeTab === 'cashBook' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">CB #</span>
                  <input
                    type="text"
                    readOnly
                    value={nextNumbers.voucherNumbers.CB}
                    className="w-16 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-center font-bold text-slate-200 outline-none"
                  />
                </div>
              )}

              {/* Date Input with Calendar Icon (Image 1, 3, 5) */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Date</span>
                <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded px-2 py-1 gap-1">
                  <input
                    type="text"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-24 bg-transparent text-white font-semibold outline-none text-xs"
                    placeholder="DD-MM-YYYY"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="text-slate-400 hover:text-sky-400 transition cursor-pointer"
                    title="Open Full Calendar (کیلنڈر کھولیں)"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                </div>
              </div>

              {/* PO # (for Bank Receipt & Payment) */}
              {activeTab.startsWith('bank') && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">PO #:</span>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Reference..."
                    className="w-24 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Bank Account Selection (for Bank Receipt & Payment) */}
              {activeTab.startsWith('bank') && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">Bank</span>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-white text-xs outline-none focus:border-sky-500 max-w-[200px]"
                  >
                    <option value="">Nothing selected</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankTitle} ({b.accountCode})
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-amber-400 ml-1">
                    Balance : {currentBank ? `${currentBank.balance.toFixed(2)} ${currentBank.balanceType}` : '0.00 DR'}
                  </span>
                </div>
              )}

              {/* Cash Balance Display Box & Cash Account Dropdown (Image 3, 4, 5) */}
              {(activeTab === 'cashReceipt' || activeTab === 'cashPayment' || activeTab === 'cashBook') && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-400">Cash</span>
                    <div className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded font-bold text-slate-200">
                      {currentCashAccount
                        ? `${currentCashAccount.balance.toFixed(2)} ${currentCashAccount.balanceType}`
                        : '0.00 DR'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-400">Cash.A/c</span>
                    <select
                      value={selectedCashAccountId}
                      onChange={(e) => setSelectedCashAccountId(e.target.value)}
                      className="bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-white text-xs outline-none focus:border-sky-500"
                    >
                      {cashAccounts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Salesman A/c Dropdown */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="font-bold text-slate-400">Salesman A/c</span>
                <select
                  value={selectedSalesman}
                  onChange={(e) => setSelectedSalesman(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-sky-500 max-w-[150px]"
                >
                  <option value="">Nothing selected</option>
                  {salesmen.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Entry Input Row (Matching Screenshots Table Header & Input Row) */}
            <form onSubmit={handleAddOrUpdateEntry} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs items-end">
                {/* ACCOUNT / G/L ACCOUNT */}
                <div className={activeTab.startsWith('bank') ? 'md:col-span-3' : activeTab === 'journalVoucher' || activeTab === 'cashBook' ? 'md:col-span-4' : 'md:col-span-4'}>
                  <div className="flex items-center justify-between pb-1 gap-1">
                    <span className="font-bold text-slate-300 uppercase tracking-wider shrink-0">
                      {activeTab.startsWith('bank') ? 'G/L ACCOUNT' : 'ACCOUNT'}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(true)}
                        className="text-sky-400 hover:text-sky-300 p-0.5 rounded hover:bg-slate-800 transition"
                        title="Quick Add Account (+ نیا کھاتہ)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={loadPrimaryData}
                        className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800 transition"
                        title="Refresh accounts"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <SearchableAccountSelect
                    accounts={glAccounts}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={(id) => setSelectedAccountId(id)}
                    placeholder="Search account name or code (e.g. Al Najm, Petrol, 0101...)..."
                    required
                  />

                  {/* Account Live Balance Display (Under Account Dropdown as shown in Image 1, 3, 5) */}
                  <div className="pt-1 text-[11px] font-bold text-amber-400">
                    Balance : {currentEntryAccount ? currentEntryAccount.balanceFormatted : '0.00 DR'}
                  </div>
                </div>

                {/* CHEQUE FIELDS (Bank Receipt & Payment only) */}
                {activeTab.startsWith('bank') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        CHEQUENO
                      </label>
                      <input
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        placeholder="Chq #"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        CHEQUEDATE
                      </label>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-2 py-1 gap-1">
                        <input
                          type="text"
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                          className="w-full bg-transparent text-white outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIsChequeCalendarOpen(true)}
                          className="text-slate-400 hover:text-sky-400"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        CHQ.BANK
                      </label>
                      <input
                        type="text"
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        placeholder="Bank name"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-sky-500"
                      />
                    </div>
                  </>
                )}

                {/* NARRATION */}
                <div className={activeTab.startsWith('bank') ? 'md:col-span-2' : activeTab === 'journalVoucher' || activeTab === 'cashBook' ? 'md:col-span-3' : 'md:col-span-5'}>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    NARRATION
                  </label>
                  <input
                    type="text"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Enter narration..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                  />
                </div>

                {/* JOURNAL VOUCHER (DEBIT & CREDIT) */}
                {activeTab === 'journalVoucher' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-emerald-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        DEBIT
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entryDebit}
                        onChange={(e) => setEntryDebit(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-emerald-300 font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-rose-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        CREDIT
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entryCredit}
                        onChange={(e) => setEntryCredit(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-rose-300 font-bold outline-none focus:border-rose-500"
                      />
                    </div>
                  </>
                )}

                {/* CASH BOOK (RECEIPT & PAYMENT) */}
                {activeTab === 'cashBook' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-emerald-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        RECEIPT
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entryReceipt}
                        onChange={(e) => setEntryReceipt(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-emerald-300 font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-rose-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        PAYMENT
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entryPayment}
                        onChange={(e) => setEntryPayment(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-rose-300 font-bold outline-none focus:border-rose-500"
                      />
                    </div>
                  </>
                )}

                {/* STANDARD AMOUNT (Receipts & Payments) */}
                {activeTab !== 'journalVoucher' && activeTab !== 'cashBook' && (
                  <div className={activeTab.startsWith('bank') ? 'md:col-span-2' : 'md:col-span-2'}>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      AMOUNT
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-bold outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {/* ACTION BUTTON (ENTER) */}
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-2 px-3 rounded-lg transition cursor-pointer text-xs shadow-md border border-emerald-400/40 uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    {editingEntryIndex !== null ? 'Save' : 'Enter'}
                  </button>
                </div>
              </div>
            </form>

            {/* Grid Table of Entries */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-200">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">A/C CODE</th>
                      <th className="px-3 py-2.5">A/C TITLE</th>
                      {activeTab.startsWith('bank') && (
                        <>
                          <th className="px-3 py-2.5">CHEQUENO</th>
                          <th className="px-3 py-2.5">CHEQUEDATE</th>
                          <th className="px-3 py-2.5">CHEQUEBANK</th>
                        </>
                      )}
                      <th className="px-3 py-2.5">NARRTION</th>
                      {activeTab === 'journalVoucher' ? (
                        <>
                          <th className="px-3 py-2.5 text-right">DEBIT</th>
                          <th className="px-3 py-2.5 text-right">CREDIT</th>
                        </>
                      ) : activeTab === 'cashBook' ? (
                        <>
                          <th className="px-3 py-2.5 text-right">RECEIPT</th>
                          <th className="px-3 py-2.5 text-right">PAYMENT</th>
                        </>
                      ) : (
                        <th className="px-3 py-2.5 text-right">AMOUNT</th>
                      )}
                      <th className="px-3 py-2.5 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab.startsWith('bank') ? 8 : activeTab === 'journalVoucher' || activeTab === 'cashBook' ? 6 : 5}
                          className="px-3 py-8 text-center text-slate-500 italic"
                        >
                          No entries added yet. Select an account, fill details, and click "Enter".
                        </td>
                      </tr>
                    ) : (
                      entries.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-3 py-2 font-mono text-sky-400">{item.accountCode}</td>
                          <td className="px-3 py-2 font-semibold text-white">{item.accountTitle}</td>
                          {activeTab.startsWith('bank') && (
                            <>
                              <td className="px-3 py-2 font-mono text-slate-300">{item.chequeNo || '-'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.chequeDate || '-'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.chequeBank || '-'}</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-slate-300">{item.narration}</td>
                          {activeTab === 'journalVoucher' ? (
                            <>
                              <td className="px-3 py-2 text-right font-bold text-emerald-400">
                                {item.debit ? item.debit.toFixed(2) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                {item.credit ? item.credit.toFixed(2) : '-'}
                              </td>
                            </>
                          ) : activeTab === 'cashBook' ? (
                            <>
                              <td className="px-3 py-2 text-right font-bold text-emerald-400">
                                {item.receipt ? item.receipt.toFixed(2) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                {item.payment ? item.payment.toFixed(2) : '-'}
                              </td>
                            </>
                          ) : (
                            <td className="px-3 py-2 text-right font-bold text-emerald-400">
                              {item.amount.toFixed(2)}
                            </td>
                          )}
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditEntry(idx)}
                                className="p-1.5 bg-sky-500/15 hover:bg-sky-600 text-sky-600 dark:text-sky-400 hover:text-white rounded-lg border border-sky-500/30 transition cursor-pointer shadow-2xs"
                                title="Edit Line"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(idx)}
                                className="p-1.5 bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-lg border border-rose-500/30 transition cursor-pointer shadow-2xs"
                                title="Remove Line"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grid Footer (Totals & Bottom Actions) */}
              <div className="bg-slate-800/80 px-4 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Total Display */}
                <div className="flex items-center gap-4 font-bold">
                  {activeTab === 'journalVoucher' ? (
                    <>
                      <span className="text-slate-300">Total Debit: <span className="text-emerald-400 font-mono">{jvTotalDebit.toFixed(2)}</span></span>
                      <span className="text-slate-300">Total Credit: <span className="text-rose-400 font-mono">{jvTotalCredit.toFixed(2)}</span></span>
                      {jvDifference > 0.01 && (
                        <span className="text-amber-400">Diff: {jvDifference.toFixed(2)}</span>
                      )}
                    </>
                  ) : activeTab === 'cashBook' ? (
                    <>
                      <span className="text-slate-300">Total Receipts: <span className="text-emerald-400 font-mono">{entries.reduce((sum, e) => sum + (e.receipt || 0), 0).toFixed(2)}</span></span>
                      <span className="text-slate-300">Total Payments: <span className="text-rose-400 font-mono">{entries.reduce((sum, e) => sum + (e.payment || 0), 0).toFixed(2)}</span></span>
                    </>
                  ) : (
                    <span className="text-slate-300">
                      Total: <span className="text-white font-mono text-sm ml-1">{gridTotal.toFixed(2)}</span>
                    </span>
                  )}
                </div>

                {/* Action Buttons (New Voucher, Post & New, Post) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetVoucherForm}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    New Voucher
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostVoucher(true)}
                    disabled={isLoading || entries.length === 0}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    Post &amp; New
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostVoucher(false)}
                    disabled={isLoading || entries.length === 0}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {editingVoucherId ? 'Save & Update' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SEARCH VOUCHER PANEL */}
      {/* ========================================================================= */}
      {activeTab === 'searchVoucher' && (
        <div className="space-y-4">
          {/* Filters Form */}
          <form onSubmit={handleSearchVouchers} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Search className="w-4 h-4 text-sky-400" />
                <span>Search &amp; Manage Vouchers (واؤچرز تلاش اور ترمیم کریں)</span>
              </div>
              <span className="text-slate-400">Total Found: {searchResults.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
              {/* Voucher Type */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Voucher Type</label>
                <select
                  value={searchFilterType}
                  onChange={(e) => setSearchFilterType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="all">All Voucher Types</option>
                  <option value="BR">Bank Receipt (BR)</option>
                  <option value="BP">Bank Payment (BP)</option>
                  <option value="CR">Cash Receipt (CR)</option>
                  <option value="CP">Cash Payment (CP)</option>
                  <option value="CB">Cash Book (CB)</option>
                  <option value="JV">General Journal (JV)</option>
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">From Date</label>
                <input
                  type="date"
                  value={searchFromDate}
                  onChange={(e) => setSearchFromDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">To Date</label>
                <input
                  type="date"
                  value={searchToDate}
                  onChange={(e) => setSearchToDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>

              {/* From JV# */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">From JV #</label>
                <input
                  type="number"
                  value={searchFromJv}
                  onChange={(e) => setSearchFromJv(e.target.value)}
                  placeholder="e.g. 19694"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>

              {/* To JV# */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">To JV #</label>
                <input
                  type="number"
                  value={searchToJv}
                  onChange={(e) => setSearchToJv(e.target.value)}
                  placeholder="e.g. 19700"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>

              {/* Keyword Search */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Keyword / Account</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Customer, Narration..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchFilterType('all');
                  setSearchFromDate('');
                  setSearchToDate('');
                  setSearchFromJv('');
                  setSearchToJv('');
                  setSearchQuery('');
                  handleSearchVouchers();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer text-xs font-semibold"
              >
                Reset Filters
              </button>
              <button
                type="submit"
                disabled={isSearchingVouchers}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition font-bold cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearchingVouchers ? 'Searching...' : 'Search Vouchers'}</span>
              </button>
            </div>
          </form>

          {/* Results List (Each voucher shown separately with full details & edit/delete) */}
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="font-semibold text-sm">No vouchers match the selected filters.</p>
                <p className="text-xs text-slate-600 mt-1">Try resetting the filters or posting a new voucher.</p>
              </div>
            ) : (
              searchResults.map((v) => (
                <div
                  key={v.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md transition"
                >
                  {/* Voucher Header Bar */}
                  <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                        v.voucherType === 'CR' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        v.voucherType === 'CP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        v.voucherType === 'BR' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                        v.voucherType === 'BP' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                        v.voucherType === 'CB' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}>
                        {v.voucherNumberFormatted}
                      </span>
                      <span className="font-bold text-slate-300 font-mono">JV #{v.jvNumber}</span>
                      <span className="text-slate-400">Date: <strong className="text-white">{v.date}</strong></span>
                      {v.bankAccountTitle && (
                        <span className="text-slate-400">Bank: <strong className="text-sky-300">{v.bankAccountTitle}</strong></span>
                      )}
                      {v.cashAccountTitle && (
                        <span className="text-slate-400">Cash: <strong className="text-emerald-300">{v.cashAccountTitle}</strong></span>
                      )}
                      {v.salesmanTitle && !['admin', 'hanan', 'hannan', 'user'].includes(v.salesmanTitle.toLowerCase()) && (
                        <span className="text-slate-400">Salesman: <strong className="text-indigo-300">{v.salesmanTitle}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold mr-1">
                        Total: <strong className="text-white font-mono text-sm">{currencySymbol()} {v.totalAmount.toLocaleString()}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => setViewingVoucherSlip(v)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-blue-400/40"
                        title="Print / View Voucher Slip"
                      >
                        <Printer className="w-3.5 h-3.5 text-white" />
                        <span>Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditVoucherFromSearch(v)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-300/40"
                        title="Edit voucher details & repost"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-white" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteVoucher(v)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-rose-400/40"
                        title="Delete voucher and revert account balances"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Voucher Line Items Table */}
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase font-bold">
                          <th className="py-1 px-2">Account Code</th>
                          <th className="py-1 px-2">Account Title</th>
                          {v.voucherType.startsWith('B') && (
                            <>
                              <th className="py-1 px-2">Chq #</th>
                              <th className="py-1 px-2">Chq Date</th>
                              <th className="py-1 px-2">Chq Bank</th>
                            </>
                          )}
                          <th className="py-1 px-2">Narration</th>
                          {v.voucherType === 'JV' ? (
                            <>
                              <th className="py-1 px-2 text-right">Debit</th>
                              <th className="py-1 px-2 text-right">Credit</th>
                            </>
                          ) : v.voucherType === 'CB' ? (
                            <>
                              <th className="py-1 px-2 text-right">Receipt</th>
                              <th className="py-1 px-2 text-right">Payment</th>
                            </>
                          ) : (
                            <th className="py-1 px-2 text-right">Amount</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {v.entries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-800/20">
                            <td className="py-1.5 px-2 font-mono text-sky-400">{e.accountCode}</td>
                            <td className="py-1.5 px-2 font-medium text-white">{e.accountTitle}</td>
                            {v.voucherType.startsWith('B') && (
                              <>
                                <td className="py-1.5 px-2 text-slate-400">{e.chequeNo || '-'}</td>
                                <td className="py-1.5 px-2 text-slate-400">{e.chequeDate || '-'}</td>
                                <td className="py-1.5 px-2 text-slate-400">{e.chequeBank || '-'}</td>
                              </>
                            )}
                            <td className="py-1.5 px-2 text-slate-400">{e.narration}</td>
                            {v.voucherType === 'JV' ? (
                              <>
                                <td className="py-1.5 px-2 text-right text-emerald-400 font-mono font-bold">
                                  {e.debit ? `${currencySymbol()} ${e.debit.toFixed(2)}` : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right text-rose-400 font-mono font-bold">
                                  {e.credit ? `${currencySymbol()} ${e.credit.toFixed(2)}` : '-'}
                                </td>
                              </>
                            ) : v.voucherType === 'CB' ? (
                              <>
                                <td className="py-1.5 px-2 text-right text-emerald-400 font-mono font-bold">
                                  {e.receipt ? `${currencySymbol()} ${e.receipt.toFixed(2)}` : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right text-rose-400 font-mono font-bold">
                                  {e.payment ? `${currencySymbol()} ${e.payment.toFixed(2)}` : '-'}
                                </td>
                              </>
                            ) : (
                              <td className="py-1.5 px-2 text-right text-emerald-400 font-mono font-bold">
                                {currencySymbol()} {e.amount.toFixed(2)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. BANKS MANAGEMENT (Exact match of Image 2: Settings > Banks Management) */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Bar: Settings > Banks Management with List / New tabs (Image 2) */}
          <div className="bg-slate-800/90 px-5 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Settings</span>
              <span className="text-slate-600">&gt;</span>
              <span className="bg-sky-600 text-white px-2.5 py-1 rounded font-bold">Banks Management</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setBankSubTab('list')}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  bankSubTab === 'list'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setBankSubTab('new')}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  bankSubTab === 'new'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New
              </button>
            </div>
          </div>

          {/* SubTab 1: List (Matching Screenshot 2 Table) */}
          {bankSubTab === 'list' && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-200">
                <thead className="bg-slate-800 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-3 w-16">SR NO.</th>
                    <th className="px-4 py-3">ACCOUNT CODE</th>
                    <th className="px-4 py-3">BANK TITLE</th>
                    <th className="px-4 py-3">BANK TYPE</th>
                    <th className="px-4 py-3">DESCRIPTION</th>
                    <th className="px-4 py-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {banks.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-3 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-sky-400 font-bold">{b.accountCode}</td>
                      <td className="px-4 py-3 font-bold text-white uppercase">{b.bankTitle}</td>
                      <td className="px-4 py-3 text-slate-300">{b.bankType}</td>
                      <td className="px-4 py-3 text-slate-400 uppercase">{b.description || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Button (Blue button matching Image 2) */}
                          <button
                            type="button"
                            onClick={() => setViewingBank(b)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          {/* Delete Button (Red x button matching Image 2) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(b)}
                            className="p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded transition cursor-pointer"
                            title="Delete Bank"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SubTab 2: New Bank Form */}
          {bankSubTab === 'new' && (
            <form onSubmit={handleSaveNewBank} className="p-5 max-w-xl space-y-4 text-xs">
              <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
                Add New Bank Account (نیا بینک اکاؤنٹ درج کریں)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Account Code</label>
                  <input
                    type="text"
                    value={newBankCode}
                    onChange={(e) => setNewBankCode(e.target.value)}
                    placeholder="Auto generated e.g. 0101020006"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Bank Title *</label>
                  <input
                    type="text"
                    required
                    value={newBankTitle}
                    onChange={(e) => setNewBankTitle(e.target.value)}
                    placeholder="e.g. ABU DHABI COMMERCIAL BANK"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Bank Type</label>
                  <select
                    value={newBankType}
                    onChange={(e) => setNewBankType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500"
                  >
                    <option value="Non Merchant">Non Merchant</option>
                    <option value="Merchant">Merchant</option>
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Opening Balance</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newBankBalance}
                      onChange={(e) => setNewBankBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-bold"
                    />
                    <select
                      value={newBankBalType}
                      onChange={(e) => setNewBankBalType(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 text-white font-bold"
                    >
                      <option value="DR">DR</option>
                      <option value="CR">CR</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Description</label>
                  <input
                    type="text"
                    value={newBankDesc}
                    onChange={(e) => setNewBankDesc(e.target.value)}
                    placeholder="e.g. COMPANY ACCOUNT"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition cursor-pointer"
                >
                  {isSavingBank ? 'Saving...' : 'Save Bank Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setBankSubTab('list')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW BANK DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden text-slate-200 shadow-2xl">
            <div className="bg-sky-600 px-4 py-3 flex items-center justify-between text-white font-bold text-sm">
              <span>Bank Account Profile</span>
              <button onClick={() => setViewingBank(null)} className="hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Bank Title:</span>
                <span className="font-bold text-white text-sm">{viewingBank.bankTitle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Account Code:</span>
                <span className="font-mono text-sky-400 font-bold">{viewingBank.accountCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Bank Type:</span>
                <span>{viewingBank.bankType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Current Running Balance:</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {currencySymbol()} {viewingBank.balance.toFixed(2)} {viewingBank.balanceType}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Description:</span>
                <span>{viewingBank.description || 'None'}</span>
              </div>
            </div>
            <div className="bg-slate-950 px-4 py-3 flex justify-end">
              <button
                onClick={() => setViewingBank(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE VOUCHER SLIP MODAL */}
      {/* ========================================================================= */}
      {viewingVoucherSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Slip Top Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between print:hidden">
              <span className="font-bold text-sm text-slate-800">Official Accounting Voucher Slip</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVoucherSlip(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Body Content */}
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-black tracking-wide uppercase">
                  {companyProfile?.name || 'KITCHENPRO GENERAL TRADING LLC'}
                </h2>
                <p className="text-slate-500 text-[11px]">
                  {companyProfile?.address || 'Industrial Area 10, Sharjah, United Arab Emirates'}
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-xs uppercase">
                  {viewingVoucherSlip.voucherType === 'BR' && 'Bank Receipt Voucher'}
                  {viewingVoucherSlip.voucherType === 'BP' && 'Bank Payment Voucher'}
                  {viewingVoucherSlip.voucherType === 'CR' && 'Cash Receipt Voucher'}
                  {viewingVoucherSlip.voucherType === 'CP' && 'Cash Payment Voucher'}
                  {viewingVoucherSlip.voucherType === 'CB' && 'Cash Book Voucher'}
                  {viewingVoucherSlip.voucherType === 'JV' && 'General Journal Voucher'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-b text-[11px]">
                <div>
                  <p><strong>Voucher No:</strong> {viewingVoucherSlip.voucherNumberFormatted}</p>
                  <p><strong>JV Reference #:</strong> {viewingVoucherSlip.jvNumber}</p>
                  {viewingVoucherSlip.poNumber && <p><strong>PO / Ref #:</strong> {viewingVoucherSlip.poNumber}</p>}
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {viewingVoucherSlip.date}</p>
                  {viewingVoucherSlip.bankAccountTitle && <p><strong>Bank Account:</strong> {viewingVoucherSlip.bankAccountTitle}</p>}
                  {viewingVoucherSlip.cashAccountTitle && <p><strong>Cash Till:</strong> {viewingVoucherSlip.cashAccountTitle}</p>}
                  {viewingVoucherSlip.salesmanTitle && !['admin', 'hanan', 'hannan', 'user'].includes(viewingVoucherSlip.salesmanTitle.toLowerCase()) && (
                    <p><strong>Salesman:</strong> {viewingVoucherSlip.salesmanTitle}</p>
                  )}
                </div>
              </div>

              {/* Entries Table */}
              <table className="w-full text-[11px] border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="py-1.5 px-2 text-left">Code</th>
                    <th className="py-1.5 px-2 text-left">Account Description</th>
                    <th className="py-1.5 px-2 text-left">Narration</th>
                    <th className="py-1.5 px-2 text-right">Amount ({currencySymbol()})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewingVoucherSlip.entries.map((e, idx) => (
                    <tr key={idx}>
                      <td className="py-1 px-2 font-mono">{e.accountCode}</td>
                      <td className="py-1 px-2 font-semibold">{e.accountTitle}</td>
                      <td className="py-1 px-2 text-slate-600">{e.narration}</td>
                      <td className="py-1 px-2 text-right font-bold font-mono">{e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={3} className="py-1.5 px-2 text-right">Total Amount:</td>
                    <td className="py-1.5 px-2 text-right font-mono text-sm">{currencySymbol()} {viewingVoucherSlip.totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="pt-10 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-600">
                <div className="border-t pt-1">Prepared By: {viewingVoucherSlip.createdBy || 'Accountant'}</div>
                <div className="border-t pt-1">Verified By (Auditor)</div>
                <div className="border-t pt-1">Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ADD CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleQuickAddCustomer}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 text-xs text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sm flex items-center gap-1.5 text-sky-400">
                <Plus className="w-4 h-4" />
                <span>Quick Add Customer / G/L Account</span>
              </span>
              <button type="button" onClick={() => setIsQuickAddOpen(false)} className="hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Account Title / Customer Name *</label>
              <input
                type="text"
                required
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                placeholder="e.g. AL MADINA CAFETERIA"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={quickAddMobile}
                onChange={(e) => setQuickAddMobile(e.target.value)}
                placeholder="e.g. 0528000000"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Initial Opening Balance (DR)</label>
              <input
                type="number"
                step="0.01"
                value={quickAddBalance}
                onChange={(e) => setQuickAddBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingQuickAdd}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold"
              >
                {isSavingQuickAdd ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CALENDAR PICKER MODALS */}
      {/* ========================================================================= */}
      {isCalendarOpen && (
        <CalendarModalPicker
          value={voucherDate}
          onChange={(newDate) => setVoucherDate(newDate)}
          onClose={() => setIsCalendarOpen(false)}
          title="Select Voucher Date (واؤچر تاریخ)"
        />
      )}

      {isChequeCalendarOpen && (
        <CalendarModalPicker
          value={chequeDate}
          onChange={(newDate) => setChequeDate(newDate)}
          onClose={() => setIsChequeCalendarOpen(false)}
          title="Select Cheque Date (چیک تاریخ)"
        />
      )}
    </div>
  );
};
