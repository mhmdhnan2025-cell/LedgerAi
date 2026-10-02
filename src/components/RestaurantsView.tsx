import { currencySymbol } from '../utils/currency';
import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  User,
  Wallet,
  X,
  Edit2,
} from 'lucide-react';
import { Order, Payment, PaymentMethod, Restaurant, UserRole } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface RestaurantsViewProps {
  restaurants: Restaurant[];
  orders: Order[];
  payments: Payment[];
  currentRole: UserRole;
  onCreateRestaurant: (data: any) => Promise<void>;
  onUpdateRestaurant?: (id: string, updates: Partial<Restaurant>) => Promise<void>;
  onRecordPayment: (params: any) => Promise<void>;
  onOpenOrderForRestaurant: (restaurantId: string) => void;
  onDeleteRestaurant?: (restaurantId: string) => Promise<void>;
  selectedRestaurantId?: string;
}

export const RestaurantsView: React.FC<RestaurantsViewProps> = ({
  restaurants = [],
  orders = [],
  payments = [],
  currentRole,
  onCreateRestaurant,
  onUpdateRestaurant,
  onRecordPayment,
  onOpenOrderForRestaurant,
  onDeleteRestaurant,
  selectedRestaurantId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLedgerRestaurant, setActiveLedgerRestaurant] = useState<Restaurant | null>(
    restaurants.find((r) => r.id === selectedRestaurantId) || null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Restaurant | null>(null);

  // New Restaurant Form State
  const [newRestName, setNewRestName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [payOrderId, setPayOrderId] = useState<string>('');

  // Edit Restaurant Form State
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editRestName, setEditRestName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState(100000);
  const [editStatus, setEditStatus] = useState<'Active' | 'On Hold' | 'Blacklisted'>('Active');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Delete Restaurant state
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [isDeletingRest, setIsDeletingRest] = useState(false);

  const startEditRestaurant = (rest: Restaurant) => {
    setEditingRestaurant(rest);
    setEditRestName(rest.name);
    setEditContactPerson(rest.contactPerson);
    setEditPhone(rest.phone);
    setEditAddress(rest.address || '');
    setEditCreditLimit(rest.creditLimit || 100000);
    setEditStatus(rest.status || 'Active');
    setEditErrorMsg(null);
  };

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm)
  );

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onCreateRestaurant({
        name: newRestName,
        contactPerson: newContactPerson,
        phone: newPhone,
        address: newAddress,
        creditLimit: newCreditLimit,
      });
      setShowAddModal(false);
      setNewRestName('');
      setNewContactPerson('');
      setNewPhone('');
      setNewAddress('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create restaurant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    setIsSubmitting(true);
    try {
      await onRecordPayment({
        restaurantId: showPaymentModal.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        orderId: payOrderId || undefined,
        notes: payNotes,
      });
      setShowPaymentModal(null);
      setPayAmount(0);
      setPayNotes('');
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Restaurant Accounts & Profitability</h2>
          <p className="text-xs text-slate-400">
            Real customer ledgers, credit limit tracking, and true net profit contributions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="/api/reports/download?type=business"
            download="Master_Business_Profit_Audit.doc"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Master Audit (.doc)</span>
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Restaurant Account</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search restaurant by name, owner, or phone..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-bold">{filteredRestaurants.length}</span> restaurant accounts
        </div>
      </div>

      {/* Restaurant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredRestaurants.map((rest) => {
          const isOverLimit = rest.outstandingBalance > rest.creditLimit;
          const creditUsagePct = Math.min(100, Math.round((rest.outstandingBalance / (rest.creditLimit || 1)) * 100));
          const netMargin = rest.totalPurchases > 0 ? Math.round((rest.profitGenerated / rest.totalPurchases) * 100) : 0;
          const cleanPhone = rest.phone.replace(/[^0-9]/g, '');

          return (
            <div
              key={rest.id}
              className={`bg-slate-900 border rounded-xl p-5 shadow-sm hover:border-slate-700 transition flex flex-col justify-between ${
                isOverLimit ? 'border-rose-800/80 bg-rose-950/10' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{rest.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{rest.contactPerson}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      rest.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {rest.status}
                  </span>
                </div>

                {/* Contact & Address */}
                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{rest.phone}</span>
                    </span>
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  {rest.address && (
                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{rest.address}</span>
                    </div>
                  )}
                </div>

                {/* Credit Limit & Balance Progress */}
                <div className="mt-4 p-3 bg-slate-950/70 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Outstanding Balance:</span>
                    <span className={`font-black ${isOverLimit ? 'text-rose-400' : 'text-amber-400'}`}>
                      {currencySymbol()} {(rest?.outstandingBalance ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isOverLimit ? 'bg-rose-500' : creditUsagePct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${creditUsagePct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>Credit Limit: {currencySymbol()} {(rest?.creditLimit ?? 0).toLocaleString()}</span>
                    <span>{creditUsagePct}% utilized</span>
                  </div>
                </div>

                {/* Financial Summary & Profit Intelligence */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Revenue</span>
                    <span className="font-bold text-white">{currencySymbol()} {((rest?.totalPurchases ?? 0) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Allocated Exp</span>
                    <span className="font-bold text-rose-400">{currencySymbol()} {(rest?.allocatedExpenses ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
                    <span className="text-[10px] text-emerald-300 block">Net Profit</span>
                    <span className="font-black text-emerald-400">
                      {currencySymbol()} {(rest.profitGenerated / 1000).toFixed(0)}k ({netMargin}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => setActiveLedgerRestaurant(rest)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition"
                >
                  Statement
                </button>
                <a
                  href={`/api/reports/download?type=restaurant&id=${rest.id}`}
                  download={`Statement_${rest.name.replace(/\s+/g, '_')}.doc`}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg transition"
                  title="Download Restaurant Report (.doc)"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    setShowPaymentModal(rest);
                    setPayAmount(rest.outstandingBalance);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => onOpenOrderForRestaurant(rest.id)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
                  title="New Order for this restaurant"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {onUpdateRestaurant && (
                  <button
                    onClick={() => startEditRestaurant(rest)}
                    className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                    title="Edit Restaurant Information"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onDeleteRestaurant && (
                  <button
                    onClick={() => setRestaurantToDelete(rest)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete Restaurant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* STATEMENT OF ACCOUNT MODAL / DRAWER */}
      {activeLedgerRestaurant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-extrabold text-lg text-white">{activeLedgerRestaurant.name}</h3>
                  <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">
                    Statement of Account
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contact: {activeLedgerRestaurant.contactPerson} &bull; {activeLedgerRestaurant.phone} &bull;{' '}
                  {activeLedgerRestaurant.address}
                </p>
              </div>
              <button
                onClick={() => setActiveLedgerRestaurant(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-300">
              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Billed</span>
                  <span className="text-base font-black text-white">
                    {currencySymbol()} {(activeLedgerRestaurant?.totalPurchases ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-base font-bold text-emerald-400">
                    {currencySymbol()} {(activeLedgerRestaurant?.totalPaid ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Outstanding Due</span>
                  <span className="text-base font-black text-amber-400">
                    {currencySymbol()} {(activeLedgerRestaurant?.outstandingBalance ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Profit Earned</span>
                  <span className="text-base font-black text-teal-400">
                    {currencySymbol()} {(activeLedgerRestaurant?.profitGenerated ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div>
                <h4 className="font-bold text-white mb-2">Order & Payment Transaction History</h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Reference / Description</th>
                        <th className="p-3 text-right">Debit (Order)</th>
                        <th className="p-3 text-right">Credit (Payment)</th>
                        <th className="p-3 text-center">Status / Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* Combine orders and payments chronologically */}
                      {orders
                        .filter((o) => o.restaurantId === activeLedgerRestaurant.id)
                        .map((o) => (
                          <tr key={o.id} className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-400">{o.orderDate}</td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-indigo-400">{o.orderNumber}</span>
                              <span className="text-slate-400 ml-2">
                                ({o.items.map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join(', ')})
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-white">
                              {currencySymbol()} {(o?.totalAmount ?? 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-slate-600">-</td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-300">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                      {payments
                        .filter((p) => p.restaurantId === activeLedgerRestaurant.id)
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/30 bg-emerald-950/10">
                            <td className="p-3 text-slate-400">{p.paymentDate}</td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-400">{p.paymentNumber}</span>
                              <span className="text-slate-400 ml-2">{p.notes || 'Payment received'}</span>
                            </td>
                            <td className="p-3 text-right text-slate-600">-</td>
                            <td className="p-3 text-right font-black text-emerald-400">
                              {currencySymbol()} {(p?.amount ?? 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300">
                                {p.paymentMethod}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`/api/reports/download?type=restaurant&id=${activeLedgerRestaurant.id}`}
                  download={`Statement_${activeLedgerRestaurant.name.replace(/\s+/g, '_')}.doc`}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (.doc)</span>
                </a>
                <a
                  href={`/api/reports/restaurant/${activeLedgerRestaurant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </a>
              </div>
              <button
                onClick={() => setActiveLedgerRestaurant(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Record Restaurant Payment</h3>
                <p className="text-xs text-slate-400">{showPaymentModal.name}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Current Outstanding Balance:</span>
                <span className="font-extrabold text-amber-400 text-sm">
                  {currencySymbol()} {(showPaymentModal?.outstandingBalance ?? 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-emerald-400 font-extrabold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="Cash">Cash (Driver / Counter)</option>
                  <option value="Bank Transfer">Bank Transfer (Raast / IBFT)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Bank Ref #Raast-1234 or Cheque #9872"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md shadow-emerald-600/30 transition"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD RESTAURANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Register New Restaurant</h3>
                <p className="text-xs text-slate-400">Add to wholesale customer directory and ledger.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="p-6 space-y-4 text-xs text-slate-300">
              {errorMsg && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">Restaurant Business Name *</label>
                <input
                  type="text"
                  required
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="e.g. Al Madina Biryani & Karahi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    placeholder="e.g. Haji Tariq"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Gulberg III, Main Market, Lahore"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Approved Credit Limit (PKR)</label>
                <input
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold"
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
                  {isSubmitting ? 'Registering...' : 'Register Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESTAURANT MODAL */}
      {editingRestaurant && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-white">Edit Restaurant Profile</h3>
                <p className="text-xs text-slate-400">Update business details, credit limit, or account status</p>
              </div>
              <button
                onClick={() => setEditingRestaurant(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditErrorMsg(null);
                setIsSubmittingEdit(true);
                try {
                  if (onUpdateRestaurant) {
                    await onUpdateRestaurant(editingRestaurant.id, {
                      name: editRestName,
                      contactPerson: editContactPerson,
                      phone: editPhone,
                      address: editAddress,
                      creditLimit: editCreditLimit,
                      status: editStatus,
                    });
                  }
                  setEditingRestaurant(null);
                } catch (err: any) {
                  setEditErrorMsg(err.message || 'Failed to update restaurant');
                } finally {
                  setIsSubmittingEdit(false);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              {editErrorMsg && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-200">
                  {editErrorMsg}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Restaurant / Hotel Name *</label>
                <input
                  type="text"
                  required
                  value={editRestName}
                  onChange={(e) => setEditRestName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Credit Limit (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Khata Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold (Hold Orders)</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRestaurant(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-sky-600/30 transition"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Restaurant Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE RESTAURANT MODAL */}
      <ConfirmDeleteModal
        isOpen={!!restaurantToDelete}
        title="Delete Restaurant Account"
        itemName={restaurantToDelete?.name}
        itemDetails={`Are you sure you want to delete ${restaurantToDelete?.name}? This will permanently remove their records, account ledger, and recalculate outstanding balances.`}
        onCancel={() => setRestaurantToDelete(null)}
        isDeleting={isDeletingRest}
        onConfirm={async () => {
          if (!restaurantToDelete || !onDeleteRestaurant) return;
          try {
            setIsDeletingRest(true);
            await onDeleteRestaurant(restaurantToDelete.id);
            setRestaurantToDelete(null);
          } catch (err) {
            console.error('Failed to delete restaurant:', err);
          } finally {
            setIsDeletingRest(false);
          }
        }}
      />
    </div>
  );
};
