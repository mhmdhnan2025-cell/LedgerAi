import React, { useEffect, useState } from 'react';
import { Settings, X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';
import { api } from '../services/api';
import { ExpenseAccount } from '../types';

interface ExpenseAccountsManagementViewProps {
  onBackToSettings?: () => void;
  onDataMutated?: () => void;
  isStandalone?: boolean;
}

export const ExpenseAccountsManagementView: React.FC<ExpenseAccountsManagementViewProps> = ({
  onBackToSettings,
  onDataMutated,
  isStandalone = false,
}) => {
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Administrative Expenses');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const defaultTypes = [
    'Administrative Expenses',
    'Others Expenses',
    'Freight Expenses',
  ];

  // Distinct types from loaded accounts plus default types
  const allTypes = Array.from(
    new Set([...defaultTypes, ...expenseAccounts.map((a) => a.expenseType).filter(Boolean)])
  );

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExpenseAccounts();
      setExpenseAccounts(data || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load expense accounts' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = accountName.trim();
    if (!cleanName) {
      setFeedback({ type: 'error', text: 'Please enter account title/name' });
      return;
    }

    const targetType = isAddingCustomType ? customTypeInput.trim() : selectedType;
    if (!targetType) {
      setFeedback({ type: 'error', text: 'Please select or enter an Expense Type' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const newAcc = await api.createExpenseAccount({
        expenseType: targetType,
        name: cleanName,
      });
      setExpenseAccounts((prev) => [...prev, newAcc]);
      setAccountName('');
      if (isAddingCustomType) {
        setSelectedType(targetType);
        setIsAddingCustomType(false);
        setCustomTypeInput('');
      }
      setFeedback({ type: 'success', text: `Expense account "${cleanName}" (${newAcc.code}) added successfully!` });
      onDataMutated?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create expense account' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (account: ExpenseAccount) => {
    if (!window.confirm(`Are you sure you want to delete expense account "${account.name}" (${account.code})?`)) {
      return;
    }
    setFeedback(null);
    try {
      await api.deleteExpenseAccount(account.id);
      setExpenseAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setFeedback({ type: 'success', text: `Account "${account.name}" removed.` });
      onDataMutated?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete account' });
    }
  };

  // Filter accounts by chosen Expense Type and sort alphabetically as in original screenshots
  const currentAccounts = expenseAccounts
    .filter((a) => (a.expenseType || '').trim().toLowerCase() === (selectedType || '').trim().toLowerCase())
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Breadcrumb Navigation Matching Original Software Screenshot 1, 2, 3 */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          {onBackToSettings ? (
            <button
              onClick={onBackToSettings}
              className="hover:text-blue-600 dark:hover:text-white transition flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-500" />
              <span>Settings</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
              <span className="text-blue-500 font-bold">💳 Expense Management</span>
            </div>
          )}
          <span className="text-slate-400">/</span>
          {/* Blue Ribbon Tab matching original software arrow breadcrumb */}
          <div className="relative bg-[#1976d2] text-white font-bold px-4 py-1 rounded text-xs flex items-center gap-1 shadow-xs">
            <span>Expense Accounts Management</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAccounts}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span>Refresh</span>
          </button>
          {onBackToSettings && (
            <button
              onClick={onBackToSettings}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              All Settings Options
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Form & Table Split Layout Matching Screenshot 1, 2, 3 */}
      <div className="expense-mgmt-card grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-2xl p-6 shadow-sm border">
        {/* Left Form: Expense Types & Add Input */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Expense Types Selector */}
            <div className="flex items-center gap-3">
              <label className="expense-mgmt-label font-bold text-xs whitespace-nowrap min-w-[95px]">
                Expense Types
              </label>

              {isAddingCustomType ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    placeholder="Enter new expense type..."
                    className="expense-mgmt-input flex-1 rounded px-2.5 py-1.5 text-xs font-semibold outline-none border focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomType(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="expense-mgmt-select flex-1 rounded px-3 py-1.5 text-xs font-semibold outline-none border focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    {allTypes.map((t) => (
                      <option key={t} value={t} className="expense-mgmt-option font-semibold">
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomType(true)}
                    className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer whitespace-nowrap font-semibold"
                    title="Add custom expense type"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>

            {/* Account Title Input below (no amount field!) */}
            <div className="pl-[107px]">
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account title..."
                required
                className="expense-mgmt-input w-full rounded px-3 py-1.5 text-xs font-semibold outline-none border focus:ring-1 focus:ring-blue-500 shadow-inner"
              />
            </div>

            {/* Save Button below */}
            <div className="pl-[107px]">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-1.5 bg-[#007bff] hover:bg-blue-600 active:scale-95 text-white font-bold rounded shadow transition cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Save</span>
              </button>
            </div>
          </form>

          <div className="expense-mgmt-guidance pt-4 border-t text-[11px] space-y-1">
            <p className="font-semibold">
              💡 Account Creation Guidance:
            </p>
            <p>
              &bull; Yahan sirf naye Expense Accounts heads add hotay hain.
            </p>
            <p>
              &bull; <strong>Amount yahan add nahi hoti</strong>, kyun k asal adaigi Vouchers (CP, BP, Cash / Bank) ya OCR Slip k zariye darj hoti hai.
            </p>
          </div>
        </div>

        {/* Right Table: List of Accounts Matching Original Screenshot 1, 2, 3 */}
        <div className="lg:col-span-7 space-y-3">
          <div className="expense-mgmt-table-header flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="expense-mgmt-type-title text-xs font-bold uppercase tracking-wider">
                {selectedType}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {currentAccounts.length} Accounts
              </span>
            </div>
            <span className="expense-mgmt-subtitle text-[11px] text-slate-400">
              Available in Vouchers (CP/BP/JV) &amp; Daily Master Audit
            </span>
          </div>

          <div className="expense-mgmt-table-box border rounded-xl overflow-hidden p-2 shadow-inner">
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {currentAccounts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-medium text-xs">
                  No accounts created under "{selectedType}" yet.
                </div>
              ) : (
                currentAccounts.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className="expense-mgmt-row flex items-center justify-between px-4 py-2.5 rounded-lg border shadow-xs text-xs transition hover:shadow-sm"
                  >
                    <div className="flex items-center gap-8 min-w-0">
                      <span className="expense-mgmt-row-index font-bold w-6 text-center">
                        {idx + 1}
                      </span>
                      <span className="expense-mgmt-row-name font-bold truncate text-xs">
                        {acc.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <span className="expense-mgmt-row-code font-mono font-bold tracking-wider text-xs">
                        {acc.code}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(acc)}
                        className="w-7 h-7 rounded-md bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
                        title={`Delete ${acc.name}`}
                      >
                        <X className="w-4 h-4 font-black" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
