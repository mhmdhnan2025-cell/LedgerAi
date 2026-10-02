import { currencySymbol } from '../utils/currency';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { BusinessSummary, Order, Product, Restaurant, SmartAlert, UserRole } from '../types';
import { SmartAlertsBanner } from './SmartAlertsBanner';

interface DashboardViewProps {
  summary: BusinessSummary | null;
  orders: Order[];
  restaurants: Restaurant[];
  products: Product[];
  alerts: SmartAlert[];
  currentRole: UserRole;
  onOpenOrderModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenAllocationModal: (expenseId?: string) => void;
  onOpenDocumentOcr: () => void;
  onOpenAiAssistant: (q?: string) => void;
  onNavigateTab: (tab: string) => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onSelectOrder: (orderId: string) => void;
  onDismissAlert: (alertId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  orders = [],
  restaurants = [],
  products = [],
  alerts = [],
  currentRole,
  onOpenOrderModal,
  onOpenPaymentModal,
  onOpenExpenseModal,
  onOpenAllocationModal,
  onOpenDocumentOcr,
  onOpenAiAssistant,
  onNavigateTab,
  onSelectRestaurant,
  onSelectOrder,
  onDismissAlert,
}) => {
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  // Generate AI Executive Briefing
  const handleGenerateBriefing = async () => {
    setIsLoadingBriefing(true);
    try {
      const res = await fetch('/api/ai/daily-summary');
      const data = await res.json();
      setAiBriefing(data.analysisText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // 7-day trend data from real orders
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const trendData = last7Days.map((dateStr) => {
    const dayOrders = orders.filter((o) => o.orderDate === dateStr && o.status !== 'Cancelled');
    const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const grossProfit = dayOrders.reduce((sum, o) => sum + o.grossProfit, 0);
    const netProfit = dayOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const shortLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return {
      date: shortLabel,
      revenue,
      grossProfit,
      netProfit,
    };
  });

  // Top 5 restaurants by Net Profit
  const topProfitableRestaurants = [...restaurants]
    .sort((a, b) => b.profitGenerated - a.profitGenerated)
    .slice(0, 5)
    .map((r) => ({
      name: r.name.length > 18 ? r.name.slice(0, 18) + '...' : r.name,
      fullName: r.name,
      revenue: r.totalPurchases,
      netProfit: r.profitGenerated,
      margin: r.totalPurchases > 0 ? Math.round((r.profitGenerated / r.totalPurchases) * 100) : 0,
      balance: r.outstandingBalance,
      id: r.id,
    }));

  // Category breakdown
  const categoryMap = new Map<string, number>();
  products.forEach((p) => {
    const val = categoryMap.get(p.category) || 0;
    categoryMap.set(p.category, val + p.stockValue);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];

  // Critical receivables (restaurants exceeding credit limit or high balance)
  const highRiskRestaurants = restaurants.filter(
    (r) => r.outstandingBalance > r.creditLimit || r.outstandingBalance > 75000
  );

  const canSeeFullMargins = currentRole === 'Admin' || currentRole === 'Manager' || currentRole === 'Accountant';

  return (
    <div className="space-y-6">
      {/* Smart Business Alerts */}
      <SmartAlertsBanner
        alerts={alerts}
        onActionClick={(alert) => {
          if (alert.type === 'low_stock') onNavigateTab('inventory');
          else if (alert.type === 'credit_limit') onNavigateTab('restaurants');
          else if (alert.type === 'unallocated_expense') onOpenAllocationModal();
          else onNavigateTab('orders');
        }}
        onDismiss={onDismissAlert}
      />

      {/* Quick Action Dock */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>QUICK ACTIONS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenOrderModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Supply Order</span>
          </button>
          <button
            onClick={onOpenPaymentModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={() => onOpenAllocationModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Allocate Expense</span>
          </button>
          <button
            onClick={onOpenDocumentOcr}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
            <span>Scan Paper Slip</span>
          </button>
          <a
            href="/api/reports/download?type=business"
            download="Master_Business_Profit_Audit.doc"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 hover:text-white rounded-lg text-xs font-semibold border border-emerald-600/50 transition"
            title="Download full business audit (.doc)"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-300" />
            <span>Overall Report (.doc)</span>
          </a>
          <button
            onClick={() => onOpenAiAssistant('What is our net profit today and where are our highest expenses?')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800 hover:to-purple-800 text-indigo-200 hover:text-white rounded-lg text-xs font-semibold border border-indigo-700/60 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All Deterministic Calculations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Today's Revenue</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {currencySymbol()} {(summary?.todayRevenue ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{summary?.todayOrdersCount || 0} Orders Today</span>
            <span className="text-emerald-400 font-semibold">{summary?.todayRestaurantsServed || 0} Restaurants</span>
          </div>
        </div>

        {/* Today's Gross Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Gross Profit</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-teal-400 tracking-tight">
            {canSeeFullMargins ? `${currencySymbol()} ${(summary?.todayGrossProfit ?? 0).toLocaleString()}` : '••••••••'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Margin: {canSeeFullMargins ? `${summary?.todayGrossMargin ?? 0}%` : '••••'}</span>
            <span className="text-slate-500">Rev - Product Cost</span>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Today's Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-400 tracking-tight">
            {currencySymbol()} {(summary?.todayExpenses ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate">Top: {summary?.highestExpenseToday?.category || 'None'}</span>
            <span className="text-slate-500">Petrol / Operations</span>
          </div>
        </div>

        {/* True Net Profit */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-emerald-500/40 rounded-xl p-4 shadow-md shadow-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-medium mb-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              True Net Profit
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
              ★
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400 tracking-tight">
            {canSeeFullMargins ? `${currencySymbol()} ${(summary?.todayNetProfit ?? 0).toLocaleString()}` : '••••••••'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200/70">
            <span>Net Margin: {canSeeFullMargins ? `${summary?.todayNetMargin ?? 0}%` : '••••'}</span>
            <span className="text-[10px] text-emerald-400/80 font-bold">PROFIT VERIFIED</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Receivables (Due)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-amber-400 tracking-tight">
            {currencySymbol()} {(summary?.outstandingPaymentsTotal ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{highRiskRestaurants.length} Over-Limit / High</span>
            <button
              onClick={() => onNavigateTab('restaurants')}
              className="text-amber-400 hover:underline font-semibold"
            >
              View Ledgers &rarr;
            </button>
          </div>
        </div>

        {/* Warehouse Inventory Asset */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Inventory Value</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-cyan-400 tracking-tight">
            {currencySymbol()} {(summary?.inventoryTotalValue ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{products.length} Products Catalog</span>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-cyan-400 hover:underline font-semibold"
            >
              Stock &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* AI Daily Executive Briefing Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-900/60 rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">AI Executive Business Briefing & Profit Intelligence</h3>
              <p className="text-xs text-slate-400">
                Synthesizes true database transactions, margin leaks, inventory velocity, and cash flow bottlenecks.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={isLoadingBriefing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            {isLoadingBriefing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Business Data...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{aiBriefing ? 'Regenerate Briefing' : 'Generate Today\'s AI Briefing'}</span>
              </>
            )}
          </button>
        </div>

        {aiBriefing ? (
          <div className="mt-4 p-4 bg-slate-950/70 rounded-lg border border-indigo-900/40 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-mono">
            {aiBriefing}
          </div>
        ) : (
          <div className="mt-3 p-3.5 bg-slate-950/40 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Click "Generate Today's AI Briefing" to run deep Gemini intelligence on today's {currencySymbol()}{' '}
              {(summary?.todayRevenue ?? 0).toLocaleString()} volume, inventory levels, and outstanding receivables.
            </span>
            <span className="text-[11px] text-indigo-400 font-semibold shrink-0 ml-2">Powered by Gemini 3.8</span>
          </div>
        )}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Revenue vs Net Profit Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">7-Day Financial Performance</h3>
              <p className="text-xs text-slate-400">Revenue vs. True Net Profit across last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Revenue
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Net Profit
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${currencySymbol()} ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`${currencySymbol()} ${Number(value).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Restaurant Profitability Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Top Profitable Restaurants</h3>
              <p className="text-xs text-slate-400">Total Net Profit generated per restaurant account</p>
            </div>
            <button
              onClick={() => onNavigateTab('restaurants')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              All Restaurants &rarr;
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProfitableRestaurants} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${currencySymbol()} ${(val / 1000).toFixed(0)}k`}
                />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${currencySymbol()} ${Number(val).toLocaleString()} (Margin: ${item.payload.margin}%)`,
                    'Net Profit',
                  ]}
                />
                <Bar dataKey="netProfit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-Column Operational Tables: Recent Orders & High Credit Delinquency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-white">Recent Orders Today</h3>
              <p className="text-xs text-slate-400">Fulfillment & payment progress</p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View All Orders &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-800 overflow-hidden">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">{order.orderNumber}</span>
                    <span className="text-xs font-semibold text-white">{order.restaurantName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        order.status === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : order.status === 'Partially Paid'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {order.items.length} items &bull; Gross Profit: {currencySymbol()} {(order.grossProfit ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-white">{currencySymbol()} {(order.totalAmount ?? 0).toLocaleString()}</div>
                  <div className="text-[11px] text-amber-400">Due: {currencySymbol()} {(order.balanceDue ?? 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Credit Balance & Receivables Watchlist */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-white">Credit Limit & Receivables Watchlist</h3>
              <p className="text-xs text-slate-400">Restaurants requiring payment collection</p>
            </div>
            <button
              onClick={() => onNavigateTab('restaurants')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              Manage Ledgers &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-800 overflow-hidden">
            {highRiskRestaurants.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                All restaurant accounts are within approved credit limits!
              </div>
            ) : (
              highRiskRestaurants.slice(0, 5).map((r) => {
                const isOverLimit = r.outstandingBalance > r.creditLimit;
                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectRestaurant(r.id)}
                    className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{r.name}</span>
                        {isOverLimit && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Limit Exceeded
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Contact: {r.contactPerson} &bull; {r.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-rose-400">
                        {currencySymbol()} {(r.outstandingBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {currencySymbol()} {(r.creditLimit ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
