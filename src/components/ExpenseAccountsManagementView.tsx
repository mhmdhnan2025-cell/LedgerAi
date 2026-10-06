import React, { useEffect, useState } from 'react';
import { Settings, X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';
import { api } from '../services/api';
import { ExpenseAccount } from '../types';

interface ExpenseAccountsManagementViewProps {
  onBackToSettings: () => void;
  onDataMutated?: () => void;
}

export const ExpenseAccountsManagementView: React.FC<ExpenseAccountsManagementViewProps> = ({
  onBackToSettings,
  onDataMutated,
}) => {
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Administrative Expenses');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const defaultTypes = [
    'Administrative Expenses',
    'Others Expenses',
    'Freight Expenses',
    'Operational Expenses',
    'Marketing Expenses',
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
        code: accountCode.trim() || undefined,
      });
      setExpenseAccounts((prev) => [...prev, newAcc]);
      setAccountName('');
      setAccountCode('');
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

  const currentAccounts = expenseAccounts.filter((a) => a.expenseType === selectedType);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Breadcrumb Navigation Matching Original Software Screenshot 1, 2, 3 */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToSettings}
            className="hover:text-white transition flex items-center gap-1 font-semibold text-slate-400 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Settings</span>
          </button>
          <span className="text-slate-500">/</span>
          {/* Blue Chevron Tab matching original software arrow breadcrumb */}
          <div className="bg-sky-600 text-white font-bold px-3 py-1 rounded text-xs flex items-center gap-1 shadow-xs">
            Expense Accounts Management (اخراجات کے کھاتے)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAccounts}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onBackToSettings}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            All Settings Options
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
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

      {/* Main Form & Table Split Layout Matching Screenshot 1, 2, 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        {/* Left Form: Expense Types & Add Input */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-sky-400" />
              Add Expense Account
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select category, enter title, and click Save to create new ledger code.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Expense Types Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-300">Expense Types</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomType(!isAddingCustomType)}
                  className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                >
                  {isAddingCustomType ? 'Select existing type' : '+ New Expense Type'}
                </button>
              </div>

              {isAddingCustomType ? (
                <input
                  type="text"
                  value={customTypeInput}
                  onChange={(e) => setCustomTypeInput(e.target.value)}
                  placeholder="e.g. Factory Overhead Expenses"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-medium"
                />
              ) : (
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 font-semibold"
                >
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Account Title Input */}
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Account Title (کھاتے کا نام)</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Generator Fuel, Water Bill, Office Stationary..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500 text-xs font-medium"
              />
            </div>

            {/* Optional Custom Account Code */}
            <div>
              <label className="block font-bold text-slate-400 mb-1.5">Account Code (Optional - Auto generated)</label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="Leave blank for automatic sequential code"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 outline-none focus:border-sky-500 text-xs font-mono"
              />
            </div>

            {/* Save Button (Styled exactly like Screenshot: Blue with crisp text) */}
            <div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-28 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Table: List of Accounts Matching Original Screenshot 1, 2, 3 */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {selectedType}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {currentAccounts.length} Accounts
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Synced with Vouchers &amp; Daily Master Audit
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 shadow-inner">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Sr</th>
                    <th className="py-2.5 px-4">Account Name</th>
                    <th className="py-2.5 px-4 text-right">Account Code</th>
                    <th className="py-2.5 px-3 w-14 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {currentAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                        No accounts created under "{selectedType}" yet.
                      </td>
                    </tr>
                  ) : (
                    currentAccounts.map((acc, idx) => (
                      <tr
                        key={acc.id}
                        className="hover:bg-slate-900/60 transition-colors group"
                      >
                        {/* Sr # */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        {/* Name */}
                        <td className="py-2.5 px-4 font-semibold text-slate-200">
                          {acc.name}
                        </td>
                        {/* Code */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-400">
                          {acc.code}
                        </td>
                        {/* Delete Button matching original screenshot: Red/coral rounded button with white cross */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(acc)}
                            className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition shadow-xs cursor-pointer mx-auto"
                            title={`Delete ${acc.name}`}
                          >
                            <X className="w-4 h-4 font-black" strokeWidth={3} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
