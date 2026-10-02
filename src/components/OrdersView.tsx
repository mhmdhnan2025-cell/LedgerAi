import { currencySymbol } from '../utils/currency';
import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit2,
  Eye,
  FileText,
  Filter,
  Package,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod, Product, Restaurant, UserRole } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OrdersViewProps {
  orders: Order[];
  restaurants: Restaurant[];
  products: Product[];
  currentRole: UserRole;
  onCreateOrder: (params: any) => Promise<void>;
  onUpdateOrder?: (orderId: string, params: any) => Promise<void>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onOpenInvoice: (order: Order) => void;
  onOpenPaymentForOrder: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  selectedOrderId?: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders = [],
  restaurants = [],
  products = [],
  currentRole,
  onCreateOrder,
  onUpdateOrder,
  onUpdateStatus,
  onOpenInvoice,
  onOpenPaymentForOrder,
  onDeleteOrder,
  selectedOrderId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete Order state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Cancel Order state (dedicated manual cancellation)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsCancellingOrder(true);
    try {
      await onUpdateStatus(orderToCancel.id, 'Cancelled');
      setOrderToCancel(null);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // New Order Form State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<
    { productId: string; quantity: number; unitPrice?: number }[]
  >([{ productId: '', quantity: 1 }]);
  const [deliveryFee, setDeliveryFee] = useState<number>(500);
  const [discount, setDiscount] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<
    { productId: string; quantity: number; unitPrice?: number }[]
  >([]);
  const [editDeliveryFee, setEditDeliveryFee] = useState<number>(500);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<OrderStatus>('Confirmed');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const startEditingOrder = (order: Order) => {
    setEditingOrder(order);
    setEditOrderItems(
      order.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      }))
    );
    setEditDeliveryFee(order.deliveryFee);
    setEditDiscount(order.discount || 0);
    setEditPaidAmount(order.paidAmount);
    setEditStatus(order.status);
    setEditNotes(order.notes || '');
    setEditFormError(null);
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items.some((it) => it.productName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  // Calculate dynamic totals for create modal
  let calculatedSubtotal = 0;
  let calculatedProductCost = 0;
  orderItems.forEach((item) => {
    const p = products.find((prod) => prod.id === item.productId);
    if (p && item.quantity > 0) {
      const price = item.unitPrice !== undefined ? item.unitPrice : p.sellingPrice;
      calculatedSubtotal += price * item.quantity;
      calculatedProductCost += p.purchasePrice * item.quantity;
    }
  });

  const calculatedTotal = calculatedSubtotal + deliveryFee - discount;
  const calculatedGrossProfit = calculatedSubtotal - calculatedProductCost;
  const calculatedGrossMargin = calculatedSubtotal > 0 ? ((calculatedGrossProfit / calculatedSubtotal) * 100).toFixed(1) : '0';

  const handleAddItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const next = [...orderItems];
    if (field === 'productId') {
      next[index].productId = value;
      const prod = products.find((p) => p.id === value);
      if (prod) next[index].unitPrice = prod.sellingPrice;
    } else if (field === 'quantity') {
      next[index].quantity = Math.max(0.1, Number(value));
    } else if (field === 'unitPrice') {
      next[index].unitPrice = Math.max(0, Number(value));
    }
    setOrderItems(next);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedRestaurantId) {
      setFormError('Please select a restaurant.');
      return;
    }

    const validItems = orderItems.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one valid product.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateOrder({
        restaurantId: selectedRestaurantId,
        items: validItems,
        deliveryFee,
        discount,
        initialPayment: advancePayment,
        paymentMethod,
        notes,
      });
      setShowCreateModal(false);
      // Reset form
      setOrderItems([{ productId: '', quantity: 1 }]);
      setAdvancePayment(0);
      setNotes('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Order Management & Fulfillment</h2>
          <p className="text-xs text-slate-400">
            Real wholesale orders with automatic inventory deduction and ledger synchronization.
          </p>
        </div>
        <button
          onClick={() => {
            if (restaurants.length > 0 && !selectedRestaurantId) {
              setSelectedRestaurantId(restaurants[0].id);
            }
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Supply Order</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by order #, restaurant, or item..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'Confirmed', 'Processing', 'Packed', 'Delivered', 'Partially Paid', 'Paid', 'Cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order # / Date</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid / Balance Due</th>
                <th className="py-3 px-4 text-right">Profit & Margin</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No orders found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isHighlighted = selectedOrderId === order.id;
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isHighlighted ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      {/* Order Number & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">{order.orderNumber}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{order.orderDate}</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="capitalize text-slate-500">{order.source}</span>
                        </div>
                      </td>

                      {/* Restaurant */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{order.restaurantName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          By: {order.createdBy}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-medium text-slate-200">
                          {order.items.map((it) => (
                            <span key={it.productId} className="mr-2 inline-block">
                              {it.quantity} {it.unit} {it.productName}{' '}
                              <span className="text-slate-400 font-mono text-[11px] bg-slate-800/80 px-1 py-0.2 rounded border border-slate-700/50">
                                @ {currencySymbol()} {it.unitPrice}/{it.unit}
                              </span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500">
                            {order.items.length} line item{order.items.length > 1 ? 's' : ''}
                          </span>
                          {order.hasShortage && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>Stock Shortage</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-extrabold text-white text-xs">
                          {currencySymbol()} {order.totalAmount.toLocaleString()}
                        </div>
                        {order.deliveryFee > 0 && (
                          <div className="text-[10px] text-slate-400">
                            +{currencySymbol()} {order.deliveryFee} delivery
                          </div>
                        )}
                      </td>

                      {/* Paid / Balance Due (Udhaar) */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-emerald-400">
                          Paid: {currencySymbol()} {order.paidAmount.toLocaleString()}
                        </div>
                        <div
                          className={`text-[11px] font-bold ${
                            order.balanceDue > 0 ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {order.balanceDue > 0 ? `Udhaar: ${currencySymbol()} ${order.balanceDue.toLocaleString()}` : 'Cleared (0 Udhaar)'}
                        </div>
                      </td>

                      {/* Profit & Margin */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-teal-400 text-xs">
                          {currencySymbol()} {order.grossProfit.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Margin: {order.totalAmount > 0 ? Math.round((order.grossProfit / order.totalAmount) * 100) : 0}%
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none ${
                            order.status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : order.status === 'Partially Paid'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : order.status === 'Delivered'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : order.status === 'Cancelled'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          <option value="Confirmed" className="bg-slate-900 text-white">Confirmed</option>
                          <option value="Processing" className="bg-slate-900 text-white">Processing</option>
                          <option value="Packed" className="bg-slate-900 text-white">Packed</option>
                          <option value="Delivered" className="bg-slate-900 text-white">Delivered</option>
                          <option value="Partially Paid" className="bg-slate-900 text-white">Partially Paid</option>
                          <option value="Paid" className="bg-slate-900 text-white">Paid</option>
                          <option value="Cancelled" className="bg-slate-900 text-white">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status !== 'Cancelled' ? (
                            <button
                              onClick={() => setOrderToCancel(order)}
                              className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 rounded text-[11px] font-bold border border-rose-800/60 transition flex items-center gap-1 shadow-sm"
                              title="Cancel Order (Khatam Karein & Restore Stock)"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Cancel</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Cancelled
                            </span>
                          )}
                          <button
                            onClick={() => onOpenInvoice(order)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
                            title="View / Print Wholesale Invoice"
                          >
                            <Printer className="w-4 h-4 text-indigo-400" />
                          </button>
                          {order.balanceDue > 0 && (
                            <button
                              onClick={() => onOpenPaymentForOrder(order)}
                              className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded text-[11px] font-bold border border-emerald-500/30 transition"
                            >
                              Collect
                            </button>
                          )}
                          {onUpdateOrder && (
                            <button
                              onClick={() => startEditingOrder(order)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition"
                              title="Edit Order & Products"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteOrder && (
                            <button
                              onClick={() => setOrderToDelete(order)}
                              className="p-1.5 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
                              title="Delete Order"
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

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Create Wholesale Supply Order</h3>
                <p className="text-xs text-slate-400">Inventory will automatically deduct upon confirmation.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-5 text-xs text-slate-300">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Restaurant Selector & Credit Health Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Select Restaurant *</label>
                  <select
                    value={selectedRestaurantId}
                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Restaurant Account --</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Outstanding: {currencySymbol()} {r.outstandingBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRestaurant && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400">Current Balance:</span>
                      <div className="font-extrabold text-amber-400 text-sm">
                        {currencySymbol()} {selectedRestaurant.outstandingBalance.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Credit Limit:</span>
                      <div className="font-bold text-slate-200 text-sm">
                        {currencySymbol()} {selectedRestaurant.creditLimit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-300">Order Items (Stock & Unit Cost Verified)</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {orderItems.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const isExceedingStock = prod && item.quantity > prod.currentQuantity;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 grid grid-cols-12 gap-2 items-center"
                      >
                        {/* Product Picker */}
                        <div className="col-span-12 sm:col-span-5">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.currentQuantity} {p.unit} in stock)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-center focus:outline-none"
                          />
                        </div>

                        {/* Selling Price */}
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            placeholder="Price"
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-right focus:outline-none"
                          />
                        </div>

                        {/* Line Subtotal */}
                        <div className="col-span-3 sm:col-span-2 text-right">
                          <div className="font-extrabold text-white text-xs">
                            {currencySymbol()} {((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}
                          </div>
                          {prod && (
                            <div className="text-[10px] text-teal-400">
                              Cost: {currencySymbol()} {prod.purchasePrice * item.quantity}
                            </div>
                          )}
                        </div>

                        {/* Remove Action */}
                        <div className="col-span-1 sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={orderItems.length === 1}
                            className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {isExceedingStock && (
                          <div className="col-span-12 text-[11px] text-amber-400 font-medium mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Warning: Order quantity ({item.quantity}) exceeds warehouse stock ({prod?.currentQuantity} {prod?.unit}).</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Fee, Discount, Advance Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Delivery Fee (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Discount (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Advance Paid Now (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    max={calculatedTotal}
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Payment Method & Delivery Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Advance Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (Raast / IBFT)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Delivery Instructions / Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Deliver before 11am lunch prep"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              {/* Real-time Order Summary Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                    <span className="text-base font-black text-white">{currencySymbol()} {calculatedTotal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Advance Paid</span>
                    <span className="text-base font-bold text-emerald-400">{currencySymbol()} {advancePayment.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Balance Due</span>
                    <span className="text-base font-bold text-amber-400">
                      {currencySymbol()} {Math.max(0, calculatedTotal - advancePayment).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Est. Gross Profit</span>
                    <span className="text-base font-bold text-teal-400">
                      {currencySymbol()} {calculatedGrossProfit.toLocaleString()} ({calculatedGrossMargin}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-indigo-600/30 transition"
                  >
                    {isSubmitting ? 'Creating Order...' : 'Confirm & Deduct Stock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  Edit Order #{editingOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Customer: <span className="text-white font-semibold">{editingOrder.restaurantName}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditFormError(null);
                const validItems = editOrderItems.filter((it) => it.productId && it.quantity > 0);
                if (validItems.length === 0) {
                  setEditFormError('Order must have at least one valid product item.');
                  return;
                }
                setIsSubmittingEdit(true);
                try {
                  if (onUpdateOrder) {
                    await onUpdateOrder(editingOrder.id, {
                      items: validItems,
                      deliveryFee: editDeliveryFee,
                      discount: editDiscount,
                      paidAmount: editPaidAmount,
                      status: editStatus,
                      notes: editNotes,
                    });
                  }
                  setEditingOrder(null);
                } catch (err: any) {
                  setEditFormError(err.message || 'Failed to update order');
                } finally {
                  setIsSubmittingEdit(false);
                }
              }}
              className="p-6 space-y-5 text-xs text-slate-300"
            >
              {editFormError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Order Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Packed">Packed</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Internal Notes / Delivery Remarks
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Urgent delivery by evening, van #3"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Ordered Items & Quantities
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditOrderItems([...editOrderItems, { productId: '', quantity: 1 }])}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {editOrderItems.map((item, index) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const lineSubtotal = (item.unitPrice || 0) * item.quantity;
                    return (
                      <div
                        key={index}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800"
                      >
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const next = [...editOrderItems];
                            next[index].productId = e.target.value;
                            const p = products.find((pr) => pr.id === e.target.value);
                            if (p) next[index].unitPrice = p.sellingPrice;
                            setEditOrderItems(next);
                          }}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none text-xs"
                        >
                          <option value="">Select Item...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.currentQuantity} {p.unit} in stock) - {currencySymbol()} {p.sellingPrice}
                            </option>
                          ))}
                        </select>

                        <div className="w-24">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...editOrderItems];
                              next[index].quantity = Math.max(0.1, Number(e.target.value));
                              setEditOrderItems(next);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-right focus:outline-none text-xs"
                            placeholder="Qty"
                          />
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice || 0}
                            onChange={(e) => {
                              const next = [...editOrderItems];
                              next[index].unitPrice = Math.max(0, Number(e.target.value));
                              setEditOrderItems(next);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-right focus:outline-none text-xs"
                            placeholder="Price (PKR)"
                          />
                        </div>

                        <div className="w-28 text-right font-bold text-white text-xs px-2">
                          {currencySymbol()} {lineSubtotal.toLocaleString()}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (editOrderItems.length > 1) {
                              setEditOrderItems(editOrderItems.filter((_, i) => i !== index));
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery, Discount & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Delivery Van Charges (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDeliveryFee}
                    onChange={(e) => setEditDeliveryFee(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-right focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Discount (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-right focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Paid Amount (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-right font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Summary Bar & Submit */}
              {(() => {
                let sub = 0;
                let cost = 0;
                editOrderItems.forEach((it) => {
                  const p = products.find((pr) => pr.id === it.productId);
                  if (p && it.quantity > 0) {
                    const prc = it.unitPrice !== undefined ? it.unitPrice : p.sellingPrice;
                    sub += prc * it.quantity;
                    cost += p.purchasePrice * it.quantity;
                  }
                });
                const total = sub + editDeliveryFee - editDiscount;
                const profit = sub - cost;
                const bal = Math.max(0, total - editPaidAmount);

                return (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Bill</span>
                        <span className="text-base font-black text-white">{currencySymbol()} {total.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Paid</span>
                        <span className="text-base font-bold text-emerald-400">{currencySymbol()} {editPaidAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Remaining Due</span>
                        <span className="text-base font-bold text-amber-400">{currencySymbol()} {bal.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gross Profit</span>
                        <span className="text-base font-bold text-teal-400">{currencySymbol()} {profit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOrder(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingEdit}
                        className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-sky-600/30 transition"
                      >
                        {isSubmittingEdit ? 'Saving Changes...' : 'Save Order Changes'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL ORDER MODAL */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cancel Wholesale Order?</h3>
                  <p className="text-[11px] text-slate-400">{orderToCancel.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setOrderToCancel(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to cancel order <span className="font-bold text-white">{orderToCancel.orderNumber}</span> for <span className="font-bold text-indigo-400">{orderToCancel.restaurantName}</span>?
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold">Ordered Line Items:</div>
                <div className="text-white font-medium">
                  {orderToCancel.items.map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join(', ')}
                </div>
                <div className="text-amber-400 text-[11px] pt-2 border-t border-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Warehouse stock will be automatically returned to inventory, and the restaurant ledger balance will be cleared.</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={isCancellingOrder}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                disabled={isCancellingOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                {isCancellingOrder ? (
                  <span>Cancelling...</span>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Yes, Cancel Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ORDER MODAL */}
      <ConfirmDeleteModal
        isOpen={!!orderToDelete}
        title="Delete Order Record"
        itemName={`Order #${orderToDelete?.orderNumber} - ${orderToDelete?.restaurantName}`}
        itemDetails={`Are you sure you want to delete order #${orderToDelete?.orderNumber} (${currencySymbol()} ${orderToDelete?.totalAmount.toLocaleString()})? Inventory stock will be adjusted and restaurant account balances will be updated.`}
        onCancel={() => setOrderToDelete(null)}
        isDeleting={isDeletingOrder}
        onConfirm={async () => {
          if (!orderToDelete || !onDeleteOrder) return;
          try {
            setIsDeletingOrder(true);
            await onDeleteOrder(orderToDelete.id);
            setOrderToDelete(null);
          } catch (err) {
            console.error('Failed to delete order:', err);
          } finally {
            setIsDeletingOrder(false);
          }
        }}
      />
    </div>
  );
};
