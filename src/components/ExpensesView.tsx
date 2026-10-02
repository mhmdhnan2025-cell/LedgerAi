import { currencySymbol } from '../utils/currency';
import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Fuel,
  Package,
  Phone,
  Plus,
  Search,
  Sliders,
  Trash2,
  TrendingDown,
  Truck,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Expense, ExpenseAllocationMethod, ExpenseCategory, Restaurant, UserRole } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ExpensesViewProps {
  expenses: Expense[];
  restaurants: Restaurant[];
  currentRole: UserRole;
  onCreateExpense: (expense: any) => Promise<void>;
  onAllocateExpense: (expenseId: string, method: ExpenseAllocationMethod, targetIds?: string[]) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  preselectedExpenseId?: string;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses = [],
  restaurants = [],
  currentRole,
  onCreateExpense,
  onAllocateExpense,
  onDeleteExpense,
  preselectedExpenseId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [allocatingExpense, setAllocatingExpense] = useState<Expense | null>(
    expenses.find((e) => e.id === preselectedExpenseId) || null
  );

  // Delete Expense state
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeletingExp, setIsDeletingExp] = useState(false);

  // New Expense form state
  const [category, setCategory] = useState<ExpenseCategory>('Petrol');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(3500);
  const [scope, setScope] = useState<'business_wide' | 'restaurant_specific' | 'order_specific'>('business_wide');
  const [targetRestaurantId, setTargetRestaurantId] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allocation engine state
  const [allocationMethod, setAllocationMethod] = useState<ExpenseAllocationMethod>('order_value');
  const [selectedTargetRestIds, setSelectedTargetRestIds] = useState<string[]>(
    restaurants.map((r) => r.id)
  );

  const categories = [
    'ALL',
    'Petrol',
    'Delivery',
    'Salaries',
    'Phone/Calling',
    'Packaging',
    'Electricity',
    'Warehouse',
    'Maintenance',
    'Miscellaneous',
  ];

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.targetRestaurantName && e.targetRestaurantName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const unallocatedCount = expenses.filter(
    (e) => !e.allocations || e.allocations.length === 0
  ).length;

  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const rest = restaurants.find((r) => r.id === targetRestaurantId);
      await onCreateExpense({
        category,
        title,
        amount: Number(amount),
        date: new Date().toISOString().split('T')[0],
        scope,
        targetRestaurantId: targetRestaurantId || undefined,
        targetRestaurantName: rest ? rest.name : undefined,
        notes: expenseNotes,
      });
      setShowAddModal(false);
      setTitle('');
      setExpenseNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAllocation = async () => {
    if (!allocatingExpense) return;
    setIsSubmitting(true);
    try {
      await onAllocateExpense(
        allocatingExpense.id,
        allocationMethod,
        selectedTargetRestIds.length > 0 ? selectedTargetRestIds : undefined
      );
      setAllocatingExpense(null);
    } catch (err: any) {
      alert(err.message || 'Allocation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview allocation breakdown
  const previewAllocations = () => {
    if (!allocatingExpense) return [];
    const targets = restaurants.filter((r) => selectedTargetRestIds.includes(r.id));
    if (targets.length === 0) return [];

    if (allocationMethod === 'equal') {
      const perRest = Math.round(allocatingExpense.amount / targets.length);
      return targets.map((r) => ({
        restaurantName: r.name,
        allocatedAmount: perRest,
        pct: Math.round((1 / targets.length) * 100),
      }));
    } else if (allocationMethod === 'order_value') {
      const totalPurchases = targets.reduce((sum, r) => sum + r.totalPurchases, 0) || 1;
      return targets.map((r) => {
        const share = r.totalPurchases / totalPurchases;
        return {
          restaurantName: r.name,
          allocatedAmount: Math.round(allocatingExpense.amount * share),
          pct: Math.round(share * 100),
        };
      });
    } else {
      // Default equal fallback
      const perRest = Math.round(allocatingExpense.amount / targets.length);
      return targets.map((r) => ({
        restaurantName: r.name,
        allocatedAmount: perRest,
        pct: Math.round((1 / targets.length) * 100),
      }));
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Petrol':
        return <Fuel className="w-4 h-4 text-amber-400" />;
      case 'Delivery':
        return <Truck className="w-4 h-4 text-cyan-400" />;
      case 'Salaries':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'Phone/Calling':
        return <Phone className="w-4 h-4 text-purple-400" />;
      case 'Electricity':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-rose-400" />;
      default:
        return <DollarSign className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Operational Expenses & Intelligent Allocation Engine
          </h2>
          <p className="text-xs text-slate-400">
            Track overhead costs and allocate delivery expenses (Petrol, Wages) across restaurants for true net profit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Recorded Expenses</span>
            <div className="text-xl font-extrabold text-rose-400 mt-1">
              {currencySymbol()} {totalExpenseAmount.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Overhead Entries</span>
            <div className="text-xl font-extrabold text-white mt-1">{expenses.length} Records</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Awaiting Shared Allocation</span>
            <div className={`text-xl font-extrabold mt-1 ${unallocatedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {unallocatedCount} Expenses
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses by title, petrol, vehicle #..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar pt-1 border-t border-slate-800/80">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Expense # / Date</th>
                <th className="py-3 px-4">Category & Details</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4 text-right">Amount (PKR)</th>
                <th className="py-3 px-4 text-center">Allocation Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const hasAllocations = exp.allocations && exp.allocations.length > 0;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                      {/* ID & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">{exp.expenseNumber}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{exp.date}</div>
                      </td>

                      {/* Category & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-slate-800">{getCategoryIcon(exp.category)}</div>
                          <div>
                            <span className="font-bold text-white text-xs">{exp.title}</span>
                            <span className="text-slate-400 text-[11px] block">{exp.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Scope */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {exp.scope.replace('_', ' ')}
                        </span>
                        {exp.targetRestaurantName && (
                          <div className="text-[10px] text-indigo-400 mt-1 font-semibold">
                            {exp.targetRestaurantName}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-black text-rose-400 text-xs">
                        {currencySymbol()} {(exp?.amount ?? 0).toLocaleString()}
                      </td>

                      {/* Allocation Status */}
                      <td className="py-3 px-4 text-center">
                        {hasAllocations ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Allocated to {exp.allocations?.length} Restaurants</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Unallocated</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAllocatingExpense(exp);
                              setSelectedTargetRestIds(restaurants.map((r) => r.id));
                            }}
                            className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                              hasAllocations
                                ? 'bg-slate-800 text-slate-300 hover:text-white'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                            }`}
                          >
                            {hasAllocations ? 'Re-allocate' : 'Allocate Expense'}
                          </button>
                          {onDeleteExpense && (
                            <button
                              onClick={() => setExpenseToDelete(exp)}
                              className="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTELLIGENT ALLOCATION ENGINE MODAL */}
      {allocatingExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Intelligent Expense Allocation Engine</h3>
                <p className="text-xs text-slate-400">
                  Fairly distribute shared overhead across restaurant order accounts.
                </p>
              </div>
              <button
                onClick={() => setAllocatingExpense(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-300">
              {/* Target Expense Summary Card */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Selected Expense</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {allocatingExpense.title} ({allocatingExpense.category})
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <div className="font-black text-rose-400 text-base">
                    {currencySymbol()} {(allocatingExpense?.amount ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Method Picker */}
              <div>
                <label className="block font-bold text-slate-200 mb-1.5">Select Distribution Rule</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setAllocationMethod('order_value')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      allocationMethod === 'order_value'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Proportional to Order Revenue</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Bigger wholesale orders absorb a higher proportion of delivery costs.
                    </div>
                  </div>

                  <div
                    onClick={() => setAllocationMethod('equal')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      allocationMethod === 'equal'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Equal Split Across Restaurants</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Divides the cost identically between all selected restaurants.
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Restaurant Checkboxes */}
              <div>
                <label className="block font-bold text-slate-200 mb-1.5">
                  Participating Restaurants ({selectedTargetRestIds.length} selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {restaurants.map((r) => {
                    const isChecked = selectedTargetRestIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargetRestIds([...selectedTargetRestIds, r.id]);
                            } else {
                              setSelectedTargetRestIds(selectedTargetRestIds.filter((id) => id !== r.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-white truncate">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Breakdown */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">Live Net Profit Deduction Preview</h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                  {previewAllocations().map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{p.restaurantName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono text-[11px]">{p.pct}%</span>
                        <span className="font-black text-rose-400">-{currencySymbol()} {(p?.allocatedAmount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAllocatingExpense(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAllocation}
                  disabled={isSubmitting || selectedTargetRestIds.length === 0}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg font-bold shadow-md shadow-cyan-600/30 transition"
                >
                  {isSubmitting ? 'Allocating...' : 'Apply Allocation to Profit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Record Operational Expense</h3>
                <p className="text-xs text-slate-400">Log petrol, delivery wages, packaging, or rent.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="p-6 space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Expense Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-rose-400 font-extrabold text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Van #LEA-4491 Petrol for Northern Delivery Route"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="business_wide">Business Wide (Shared)</option>
                    <option value="restaurant_specific">Specific Restaurant</option>
                  </select>
                </div>
                {scope === 'restaurant_specific' && (
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Target Restaurant</label>
                    <select
                      value={targetRestaurantId}
                      onChange={(e) => setTargetRestaurantId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Notes / Receipt Number</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. PSO Petrol Pump Receipt #99812"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md shadow-indigo-600/30 transition"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EXPENSE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!expenseToDelete}
        title="Delete Expense Record"
        itemName={expenseToDelete ? `${expenseToDelete.title} (${currencySymbol()} ${expenseToDelete.amount.toLocaleString()})` : undefined}
        itemDetails={`Are you sure you want to delete this expense of ${currencySymbol()} ${expenseToDelete?.amount.toLocaleString()}? Profit/loss calculations and restaurant expense allocations will be automatically updated.`}
        onCancel={() => setExpenseToDelete(null)}
        isDeleting={isDeletingExp}
        onConfirm={async () => {
          if (!expenseToDelete || !onDeleteExpense) return;
          try {
            setIsDeletingExp(true);
            await onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          } catch (err) {
            console.error('Failed to delete expense:', err);
          } finally {
            setIsDeletingExp(false);
          }
        }}
      />
    </div>
  );
};
