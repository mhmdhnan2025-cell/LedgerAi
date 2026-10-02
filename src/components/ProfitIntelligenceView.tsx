import { currencySymbol } from '../utils/currency';
import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Fuel,
  Info,
  Layers,
  PhoneCall,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { BusinessProfitDiagnosis, Expense, Order, Payment, Restaurant, RestaurantProfitReport } from '../types';
import { api } from '../services/api';

interface ProfitIntelligenceViewProps {
  restaurants: Restaurant[];
  orders: Order[];
  expenses: Expense[];
  payments: Payment[];
  onRefresh: () => Promise<void>;
  onOpenPaymentForRestaurant?: (restaurantId: string) => void;
  onOpenExpenseModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProfitIntelligenceView: React.FC<ProfitIntelligenceViewProps> = ({
  restaurants = [],
  orders = [],
  expenses = [],
  payments = [],
  onRefresh,
  onOpenPaymentForRestaurant,
  onOpenExpenseModal,
  onNavigateTab,
}) => {
  const [diagnosis, setDiagnosis] = useState<BusinessProfitDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'profit' | 'loss' | 'unpaid'>('all');
  const [selectedReport, setSelectedReport] = useState<RestaurantProfitReport | null>(null);

  const fetchDiagnosis = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProfitDiagnosis();
      setDiagnosis(data);
      if (data.restaurantReports && data.restaurantReports.length > 0 && !selectedReport) {
        setSelectedReport(data.restaurantReports[0]);
      }
    } catch (err) {
      console.error('Failed to load profit diagnosis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosis();
  }, [restaurants.length, orders.length, expenses.length, payments.length]);

  const handleManualRefresh = async () => {
    await onRefresh();
    await fetchDiagnosis();
  };

  const reports = diagnosis?.restaurantReports || [];
  const filteredReports = reports.filter((r) => {
    if (filterType === 'profit') return r.isProfit;
    if (filterType === 'loss') return !r.isProfit;
    if (filterType === 'unpaid') return r.balanceDue > 0;
    return true;
  });

  // Calculate expense breakdown
  const petrolExpenses = expenses.filter((e) => e.category === 'Petrol').reduce((sum, e) => sum + e.amount, 0);
  const callingExpenses = expenses.filter((e) => e.category === 'Calling & Internet').reduce((sum, e) => sum + e.amount, 0);
  const deliveryVehicleExpenses = expenses.filter((e) => e.category === 'Delivery & Vehicle').reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses = expenses.filter(
    (e) => !['Petrol', 'Calling & Internet', 'Delivery & Vehicle'].includes(e.category)
  ).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Real-Time Profit & Loss Intelligence
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Exact mathematical calculation of revenue, item purchase costs, petrol/calling expenses, and per-restaurant profit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/reports/download?type=business"
            download="Master_Business_Profit_Audit.doc"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow transition"
            title="Download Master P&L Audit Report as Document"
          >
            <Download className="w-4 h-4" />
            <span>Download Master Audit (.doc)</span>
          </a>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recalculate P&L
          </button>
          {onOpenExpenseModal && (
            <button
              onClick={onOpenExpenseModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow transition"
            >
              <Fuel className="w-4 h-4" />
              Add Petrol / Expense
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Banner */}
      {diagnosis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Revenue (Billed)</span>
              <CircleDollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {currencySymbol()} {(diagnosis?.totalRevenue ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Cost of Goods: {currencySymbol()} {(diagnosis?.totalCostOfGoods ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Gross Margin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Gross Wholesale Profit</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2">
              {currencySymbol()} {(diagnosis?.grossProfit ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Margin:{' '}
              <strong className="text-slate-200">
                {(diagnosis?.totalRevenue ?? 0) > 0
                  ? (((diagnosis?.grossProfit ?? 0) / (diagnosis?.totalRevenue ?? 1)) * 100).toFixed(1)
                  : '0'}
                %
              </strong>{' '}
              on inventory sold
            </div>
          </div>

          {/* Direct & Operational Expenses */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Direct Expenses (Petrol/Calling)</span>
              <Fuel className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2">
              {currencySymbol()} {(diagnosis?.totalExpenses ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Petrol: {currencySymbol()} {(petrolExpenses ?? 0).toLocaleString()}</span>
              <span>&bull;</span>
              <span>Calling: {currencySymbol()} {(callingExpenses ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Net Profit or Net Loss */}
          <div
            className={`border rounded-2xl p-5 shadow-sm ${
              diagnosis.isProfit
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-rose-950/30 border-rose-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className={diagnosis.isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                {diagnosis.isProfit ? 'OVERALL NET PROFIT' : 'CURRENTLY IN NET LOSS'}
              </span>
              {diagnosis.isProfit ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div
              className={`text-3xl font-black mt-2 ${
                diagnosis.isProfit ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {diagnosis.netProfitOrLoss < 0 ? '-' : '+'}{currencySymbol()}{' '}
              {Math.abs(diagnosis?.netProfitOrLoss ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1 font-medium">
              Net Margin: {diagnosis.netMarginPct}% after all petrol & operational costs
            </div>
          </div>
        </div>
      )}

      {/* AI Business Health Diagnosis & Action Plan */}
      {diagnosis && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4" />
            <span>AI Munshi Profit Diagnostics & Business Situation</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Situation / Critical Issues */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Current Situation & Findings
              </h3>
              {diagnosis.criticalIssues.length === 0 ? (
                <p className="text-sm text-emerald-400">
                  All accounts and operations are running profitably. Gross margins exceed operational delivery expenses.
                </p>
              ) : (
                <ul className="space-y-2">
                  {diagnosis.criticalIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-amber-400 font-bold">&bull;</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}

              {diagnosis.totalOutstandingReceivables > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Market Receivables (Pending Udhaar):</span>
                  <span className="font-bold text-amber-300 text-sm">
                    {currencySymbol()} {(diagnosis?.totalOutstandingReceivables ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action Plan */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Action Plan to Maximize Real Profit
              </h3>
              <ul className="space-y-2">
                {diagnosis.actionPlan.map((action, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Per-Restaurant Profit Table & Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Per-Restaurant Profit & Loss Ledger</h2>
            <p className="text-xs text-slate-400">
              Each restaurant's revenue minus cost of goods sold minus allocated petrol/calling expense.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilterType('profit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'profit'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In Profit ({reports.filter((r) => r.isProfit).length})
            </button>
            <button
              onClick={() => setFilterType('loss')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'loss'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In Loss ({reports.filter((r) => !r.isProfit).length})
            </button>
            <button
              onClick={() => setFilterType('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'unpaid'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Balance Due ({reports.filter((r) => r.balanceDue > 0).length})
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="py-3.5 px-4">Restaurant</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Revenue (Sale)</th>
                <th className="py-3.5 px-4 text-right">Product Cost</th>
                <th className="py-3.5 px-4 text-right">Petrol & Calling</th>
                <th className="py-3.5 px-4 text-right">NET PROFIT / LOSS</th>
                <th className="py-3.5 px-4 text-right">Paid / Balance Due</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto">
                      <p className="text-base font-medium text-slate-400">No restaurant profit records yet.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use the AI Munshi or manual orders tab to add real restaurant sales and expenses.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedReport?.restaurantId === report.restaurantId;
                  return (
                    <tr
                      key={report.restaurantId}
                      onClick={() => setSelectedReport(report)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition ${
                        isSelected ? 'bg-indigo-950/30 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      {/* Restaurant */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{report.restaurantName}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                          {report.actionRecommendation}
                        </div>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-xs">
                          {report.totalOrders}
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {currencySymbol()} {(report?.totalRevenue ?? 0).toLocaleString()}
                      </td>

                      {/* Product Cost */}
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {currencySymbol()} {(report?.totalCostOfGoods ?? 0).toLocaleString()}
                      </td>

                      {/* Direct Expenses */}
                      <td className="py-3.5 px-4 text-right text-amber-400">
                        {currencySymbol()} {(report?.directExpenses ?? 0).toLocaleString()}
                      </td>

                      {/* Net Profit / Loss */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`font-black text-sm inline-flex items-center gap-1 ${
                            report.isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {report.isProfit ? '+' : '-'}{currencySymbol()} {Math.abs(report?.netProfit ?? 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {report.grossMarginPct}% gross margin
                        </div>
                      </td>

                      {/* Paid vs Balance Due */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="text-xs text-emerald-400 font-semibold">
                          Paid: {currencySymbol()} {(report?.totalPaid ?? 0).toLocaleString()}
                        </div>
                        {report.balanceDue > 0 ? (
                          <div className="text-xs text-amber-300 font-bold">
                            Due: {currencySymbol()} {(report?.balanceDue ?? 0).toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">Cleared</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`/api/reports/download?type=restaurant&id=${report.restaurantId}`}
                            download={`Statement_${report.restaurantName.replace(/\s+/g, '_')}.doc`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
                            title="Download Statement (.doc)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {report.balanceDue > 0 && onOpenPaymentForRestaurant && (
                            <button
                              onClick={() => onOpenPaymentForRestaurant(report.restaurantId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                            >
                              Collect
                            </button>
                          )}
                          {onNavigateTab && (
                            <button
                              onClick={() => onNavigateTab('restaurants')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                            >
                              Khata
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

        {/* Selected Restaurant Insight Card */}
        {selectedReport && (
          <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Detailed Analysis for {selectedReport.restaurantName}
              </span>
              <p className="text-sm text-slate-200 mt-1">
                {selectedReport.actionRecommendation}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-400">Net Return:</span>
                <div
                  className={`text-lg font-black ${
                    selectedReport.isProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedReport.isProfit ? 'PROFITABLE' : 'OPERATING AT LOSS'}
                </div>
              </div>
              {selectedReport.balanceDue > 0 && onOpenPaymentForRestaurant && (
                <button
                  onClick={() => onOpenPaymentForRestaurant(selectedReport.restaurantId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
                >
                  <Banknote className="w-4 h-4" />
                  Collect Pending {currencySymbol()} {(selectedReport?.balanceDue ?? 0).toLocaleString()}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
