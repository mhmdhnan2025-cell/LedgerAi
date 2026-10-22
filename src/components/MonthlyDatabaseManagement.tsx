import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Lock,
  Trash2,
  Download,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Receipt,
  ShoppingCart,
  Banknote,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Archive,
  KeyRound,
  X,
  Clock,
  Info,
} from 'lucide-react';
import { MonthlyBreakdownResponse, MonthDataSummary, YearMonthlyData, CompanyProfile } from '../types';
import { api } from '../services/api';

interface MonthlyDatabaseManagementProps {
  companyProfile?: CompanyProfile | null;
  onRefreshData?: () => void;
}

export const MonthlyDatabaseManagement: React.FC<MonthlyDatabaseManagementProps> = ({
  companyProfile,
  onRefreshData,
}) => {
  const [data, setData] = useState<MonthlyBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');

  // Purge Modal State
  const [targetMonth, setTargetMonth] = useState<MonthDataSummary | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  // Global action message
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMonthlyDataBreakdown();
      setData(res);
      // Default to the first year with data or current year
      if (res.years && res.years.length > 0 && selectedYear === 'ALL') {
        setSelectedYear(res.years[0].year);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPurgeModal = (month: MonthDataSummary) => {
    if (month.isProtected) {
      alert('Current date se pichlay 2 mahinay (kul 3 active mahinay) ka data delete karna system mein block hai taake active accounts mehfooz rahein.');
      return;
    }
    setTargetMonth(month);
    setAdminPassword('');
    setShowPassword(false);
    setPurgeError(null);
    setPurgeSuccess(null);
  };

  const handleClosePurgeModal = () => {
    if (purging) return;
    setTargetMonth(null);
    setAdminPassword('');
    setPurgeError(null);
    setPurgeSuccess(null);
  };

  const handleConfirmPurge = async () => {
    if (!targetMonth) return;
    if (!adminPassword.trim()) {
      setPurgeError('Company Admin Password likhna laazmi hai.');
      return;
    }

    try {
      setPurging(true);
      setPurgeError(null);
      const res = await api.purgeMonthlyData(targetMonth.yearMonth, adminPassword.trim());
      setPurgeSuccess(res.message);
      setActionToast({
        type: 'success',
        text: `Data for ${targetMonth.monthName} successfully deleted. Storage freed! Master records preserved.`,
      });

      // Reload breakdown after 1.5s
      setTimeout(() => {
        handleClosePurgeModal();
        loadData();
        onRefreshData?.();
      }, 1500);
    } catch (err: any) {
      setPurgeError(err.message || 'Ghalat Admin Password ya deletion failed.');
    } finally {
      setPurging(false);
    }
  };

  const currency = companyProfile?.currency || 'AED';

  // Available Years
  const availableYears = useMemo(() => {
    return data?.years || [];
  }, [data]);

  // Displayed Months based on Year selection
  const displayedMonths = useMemo(() => {
    if (!data) return [];
    if (selectedYear === 'ALL') {
      const all: MonthDataSummary[] = [];
      data.years.forEach((y) => all.push(...y.months));
      return all;
    }
    const yData = data.years.find((y) => y.year === selectedYear);
    return yData ? yData.months : [];
  }, [data, selectedYear]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & EXPLANATION BANNER                             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <HardDrive className="w-3 h-3" />
                  Monthly Database Archive &amp; Storage Control
                </span>
                <span className="text-xs text-slate-400 font-medium">ماہانہ ڈیٹا و سٹوریج کنٹرول</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                Database Records By Month &amp; Safe Storage Purge
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Puraane months ka data delete kar ke storage free karein. Customers, Suppliers, Employees aur pichlay 3 active mahinon ka data 100% mehfooz rahay ga.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                api.downloadLast3MonthsBackup();
                setActionToast({
                  type: 'success',
                  text: 'Complete Backup (Current Day to Prev 2 Months) download shuru ho gaya!',
                });
                setTimeout(() => setActionToast(null), 3500);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              title="Download clean JSON backup of all tables: complete inventory as-is, all 152 customers, 40 suppliers, employees, accounts and active 3-month transactions"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Live Backup (.SQL)</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Safety Guarantees Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Master Records 100% Mehfooz</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Customers, Suppliers, Employees aur Products ke khatey aur unke running balances ko 1 cent ka bhi farq nahi parega.
            </p>
          </div>

          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Pichlay 3 Mahinay Locked (No Delete)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Current day se last 3 months (active business period) ka data delete karna system mein strictly block hai.
            </p>
          </div>

          <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Storage Free &amp; Clean</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Purana month delete karne par memory, JSON files aur PostgreSQL teeno se us month ka data wipe ho kar storage foran free ho jati hai.
            </p>
          </div>
        </div>
      </div>

      {/* Global Toast Alert */}
      {actionToast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            actionToast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionToast.text}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. KPI METRICS CARDS                                           */}
      {/* ------------------------------------------------------------- */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Total Transaction Records</span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
              {data.summary.totalRecords.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Across all months</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-blue-300 block font-medium flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-blue-400" />
              <span>Protected Active Months</span>
            </span>
            <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
              {data.summary.activeProtectedMonthsCount} Months
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {data.protectedMonths.join(', ')}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-amber-300 block font-medium flex items-center gap-1.5">
              <Trash2 className="w-3 h-3 text-amber-400" />
              <span>Eligible for Storage Purge</span>
            </span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {data.summary.deletableMonthsCount} Months
            </span>
            <span className="text-[10px] text-slate-400">Older than 3 months with data</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-purple-300 block font-medium flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-purple-400" />
              <span>Estimated Storage</span>
            </span>
            <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
              {data.summary.databaseSizeEst}
            </span>
            <span className="text-[10px] text-slate-500">JSON + Database memory</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. YEAR TABS SELECTOR                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Select Year:</span>
          </span>

          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              selectedYear === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Years
          </button>

          {availableYears.map((y) => (
            <button
              key={y.year}
              onClick={() => setSelectedYear(y.year)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                selectedYear === y.year
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{y.year}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {y.totalRecords}
              </span>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Showing {displayedMonths.length} Months
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MONTHLY BREAKDOWN CARDS / GRID                              */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-xs font-semibold">Loading monthly database breakdown...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : displayedMonths.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
          Koi records daryaft nahi huway.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMonths.map((m) => {
            const hasData = m.counts.totalRecords > 0;
            return (
              <div
                key={m.yearMonth}
                className={`border rounded-2xl p-4.5 transition-all flex flex-col justify-between ${
                  m.isFuture
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : m.isProtected
                    ? 'bg-slate-900/90 border-blue-500/30 hover:border-blue-500/60'
                    : hasData
                    ? 'bg-slate-900/90 border-slate-700/80 hover:border-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                }`}
              >
                {/* Month Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white tracking-wide">
                          {m.monthName}
                        </span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {m.yearMonth}
                        </code>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        Total: <b className="text-cyan-400">{m.counts.totalRecords}</b> records
                        {m.storageBytesEst > 0 && ` (~${Math.round(m.storageBytesEst / 1024)} KB)`}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {m.isFuture ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 shrink-0"
                        title="Upcoming / Future Month"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Upcoming</span>
                      </span>
                    ) : m.isProtected ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0"
                        title="Protected: Current day se pichlay 2 mahinay ka active data delete nahi ho sakta"
                      >
                        <Lock className="w-3 h-3 text-blue-400" />
                        <span>Protected (3-Mo)</span>
                      </span>
                    ) : hasData ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
                        title="Older than 3 months: Can be safely purged to free storage"
                      >
                        <Trash2 className="w-3 h-3 text-amber-400" />
                        <span>Purgeable</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        Empty
                      </span>
                    )}
                  </div>

                  {/* Table Breakdown Badges */}
                  <div className="py-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sale Bills:</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {m.counts.saleBills}
                        {m.counts.saleBillsTotal > 0 && (
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({currency} {m.counts.saleBillsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                        <span>Purchase Bills:</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {m.counts.purchaseBills}
                        {m.counts.purchaseBillsTotal > 0 && (
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({currency} {m.counts.purchaseBillsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Banknote className="w-3.5 h-3.5 text-purple-400" />
                        <span>Vouchers (Cash/Bank):</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {m.counts.vouchers}
                        {m.counts.vouchersTotal > 0 && (
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({currency} {m.counts.vouchersTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Returns (Sale &amp; Purch):</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {m.counts.saleReturns + m.counts.purchaseReturns}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                        <span>Expenses:</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {m.counts.expenses}
                        {m.counts.expensesTotal > 0 && (
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({currency} {m.counts.expensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Download Month Backup Button */}
                  <button
                    onClick={() => {
                      api.downloadMonthlyBackup(m.yearMonth);
                      setActionToast({
                        type: 'success',
                        text: `Downloading backup file for ${m.monthName}...`,
                      });
                      setTimeout(() => setActionToast(null), 3000);
                    }}
                    disabled={!hasData}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      hasData
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-slate-950 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-50'
                    }`}
                    title={hasData ? `Download JSON backup for ${m.monthName}` : 'No data in this month'}
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Download (.SQL)</span>
                  </button>

                  {/* Delete / Purge Button */}
                  {m.isFuture ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-slate-600 border border-slate-800/60 rounded-lg text-xs font-medium cursor-not-allowed select-none"
                      title="Future month: Cannot be deleted"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Upcoming</span>
                    </button>
                  ) : m.isProtected ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/40 text-blue-400/60 border border-blue-900/40 rounded-lg text-xs font-medium cursor-not-allowed select-none"
                      title="Current day se pichlay 2 mahinon ka active data delete nahi ho sakta"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Locked (Active)</span>
                    </button>
                  ) : !hasData ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-slate-600 border border-slate-800/60 rounded-lg text-xs font-medium cursor-not-allowed select-none"
                    >
                      <span>No Data</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPurgeModal(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title={`Purge data for ${m.monthName} to reclaim storage`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Month</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. ADMIN PASSWORD CONFIRMATION MODAL                           */}
      {/* ------------------------------------------------------------- */}
      {targetMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Confirm Monthly Data Purge
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Target: <b className="text-rose-300">{targetMonth.monthName}</b> ({targetMonth.yearMonth})
                  </p>
                </div>
              </div>

              <button
                onClick={handleClosePurgeModal}
                disabled={purging}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Deletion Summary Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">
                  Records that will be permanently deleted:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>&bull; Sale Bills: <b className="text-white font-mono">{targetMonth.counts.saleBills}</b></div>
                  <div>&bull; Purchase Bills: <b className="text-white font-mono">{targetMonth.counts.purchaseBills}</b></div>
                  <div>&bull; Vouchers: <b className="text-white font-mono">{targetMonth.counts.vouchers}</b></div>
                  <div>&bull; Returns: <b className="text-white font-mono">{targetMonth.counts.saleReturns + targetMonth.counts.purchaseReturns}</b></div>
                  <div>&bull; Expenses: <b className="text-white font-mono">{targetMonth.counts.expenses}</b></div>
                  <div>&bull; Total Records: <b className="text-rose-400 font-mono">{targetMonth.counts.totalRecords}</b></div>
                </div>
              </div>

              {/* Master Preservation Guarantee */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <b className="block text-emerald-300 font-bold">Guarantee: Khatey Mehfooz Rahein Gay</b>
                  Customers, Suppliers, Employees aur Products bilkul delete nahi honge. Unka live running balance exact waisa hi rahay ga.
                </div>
              </div>

              {/* Recommended Backup Step */}
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-[11px] text-blue-200">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Delete karne se pehle backup download karna behtar hai:</span>
                </div>
                <button
                  type="button"
                  onClick={() => api.downloadMonthlyBackup(targetMonth.yearMonth)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] shrink-0 cursor-pointer"
                >
                  Download .JSON
                </button>
              </div>

              {/* Admin Password Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>Company Admin Password Darj Karein:</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmPurge();
                    }}
                    placeholder="Enter Company Admin Password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 font-mono pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Yeh action irreversible hai. Confirm karne par database aur storage se yeh month clean ho jayega.
                </p>
              </div>

              {/* Error Message */}
              {purgeError && (
                <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{purgeError}</span>
                </div>
              )}

              {/* Success Message */}
              {purgeSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{purgeSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClosePurgeModal}
                disabled={purging}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                disabled={purging || !adminPassword.trim()}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {purging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{purging ? 'Purging Storage...' : 'Verify Password &amp; Purge Month'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
