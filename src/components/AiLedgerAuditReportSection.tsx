import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { AiLedgerAuditReport, CashRegister, CompanyProfile, UserRole } from '../types';
import { api } from '../services/api';

interface AiLedgerAuditReportSectionProps {
  companyProfile?: CompanyProfile | null;
  currentRole: UserRole;
  onRefreshData?: () => void;
}

const fmt = (value: number): string => {
  const v = Math.round((Number(value) || 0) * 100) / 100;
  return v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};

export const AiLedgerAuditReportSection: React.FC<AiLedgerAuditReportSectionProps> = ({
  companyProfile,
  currentRole,
}) => {
  const [auditDate, setAuditDate] = useState<string>('');
  const [report, setReport] = useState<AiLedgerAuditReport | null>(null);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [showCashSettings, setShowCashSettings] = useState(false);
  const [openingCash, setOpeningCash] = useState<string>('0');
  const [closingTime, setClosingTime] = useState<string>('10:00 PM');
  const [isSavingCash, setIsSavingCash] = useState(false);

  const loadReport = useCallback(async (date?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [data, html] = await Promise.all([
        api.getAiLedgerAuditReport(date || undefined),
        api.getAiLedgerAuditReportHtml(date || undefined),
      ]);
      setReport(data);
      setReportHtml(html);
      setAuditDate((prev) => prev || data.reportDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Ledger Master Audit Report load nahi ho saka.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCashRegister = useCallback(async () => {
    try {
      const res = await api.getCashRegister();
      setCashRegister(res.cashRegister);
      setOpeningCash(String(res.cashRegister.openingCashBalance ?? 0));
      setClosingTime(res.cashRegister.closingTime || '10:00 PM');
    } catch {
      /* cash register is optional */
    }
  }, []);

  useEffect(() => {
    loadReport();
    loadCashRegister();
  }, [loadReport, loadCashRegister]);

  const saveCashRegister = async () => {
    if (currentRole !== 'Admin' && currentRole !== 'Manager') {
      setErrorMsg('Cash register (Tijori) sirf Admin / Manager update kar sakta hai.');
      return;
    }
    setIsSavingCash(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.updateCashRegister({
        openingCashBalance: Number(openingCash) || 0,
        closingTime: closingTime.trim() || '10:00 PM',
      });
      setCashRegister(res.cashRegister);
      setSuccessMsg(res.message || 'Cash Register update ho gaya. Audit report refresh ki jaa rahi hai...');
      await loadReport(auditDate || undefined);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cash register update fail ho gaya.');
    } finally {
      setIsSavingCash(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-audit');
    const cleanup = () => {
      document.body.classList.remove('printing-audit');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  // Extract <style> blocks + body markup so the server-rendered A4 page
  // can be injected straight into the print container.
  const parsed = useMemo(() => {
    if (!reportHtml) return null;
    try {
      const doc = new DOMParser().parseFromString(reportHtml, 'text/html');
      const styles = Array.from(doc.head.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
      const body = doc.body.innerHTML;
      return { styles, body };
    } catch {
      return null;
    }
  }, [reportHtml]);

  const downloadUrl = (format: 'html' | 'doc') =>
    `/api/reports/download?type=ledger-audit&format=${format}${auditDate ? `&date=${encodeURIComponent(auditDate)}` : ''}`;

  const s = report?.strip;
  const hasSalesmen = (report?.salesmanKhata?.length || 0) > 0;

  return (
    <div className="space-y-4">
      {/* ---------------- CONTROL BAR ---------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Audit Date
              </label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => loadReport(auditDate || undefined)}
              disabled={isLoading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
            </button>

            <button
              onClick={() => setShowCashSettings((prev) => !prev)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Tijori / Cash Register Settings"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Tijori (Cash Register)</span>
            </button>

            <a
              href={downloadUrl('html')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Download standalone HTML (print-ready A4)"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download HTML</span>
            </a>
            <a
              href={downloadUrl('doc')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Download Word / MS Office document"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download DOC</span>
            </a>

            <button
              onClick={handlePrint}
              disabled={isLoading || !reportHtml}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
              title="Print / Save as PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              All figures auto-computed from the live ledger &bull;{' '}
              <span className="text-emerald-400 font-bold">AI LEDGER AUDIT</span>
            </span>
          </div>
        </div>

        {/* Cash register (Tijori) settings */}
        {showCashSettings && (
          <div className="mt-4 p-3.5 bg-slate-950/70 border border-amber-500/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Landmark className="w-4 h-4" />
                TIJORI / CASH REGISTER SETTINGS
                <span className="font-normal text-slate-400">
                  (Cash In Hand = Opening Balance + Today Net Movement)
                </span>
              </div>
              <button onClick={() => setShowCashSettings(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Opening Cash Balance (Previous Day B/F)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Daily Closing Time</label>
                <input
                  type="text"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  placeholder="e.g. 10:00 PM"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveCashRegister}
                  disabled={isSavingCash}
                  className="w-full px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {isSavingCash ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save & Re-Audit</span>
                </button>
              </div>
            </div>

            {cashRegister && (
              <div className="text-[11px] text-slate-500">
                Current Tijori: Opening {companyProfile?.currency || 'PKR'} {fmt(cashRegister.openingCashBalance)} &bull;
                Closing {cashRegister.closingTime || '10:00 PM'}
                {cashRegister.updatedAt ? ` &bull; Updated ${new Date(cashRegister.updatedAt).toLocaleString('en-GB')}` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------------- QUICK KPI STRIP ---------------- */}
      {report && (
        <div className="space-y-2.5 print:hidden">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Today Revenue</span>
              <span className="text-base font-black font-mono text-emerald-400">
                {report.currencySymbol} {fmt(s?.todayRevenue || 0)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Profit</span>
              <span
                className={`text-base font-black font-mono ${(s?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {report.currencySymbol} {fmt(s?.netProfit || 0)} ({(s?.netMarginPct || 0).toFixed(1)}%)
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Udhaar (Receivable)</span>
              <span className="text-base font-black font-mono text-amber-400">
                {report.currencySymbol} {fmt(report.khataCard.receivable)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier Payable</span>
              <span className="text-base font-black font-mono text-rose-400">
                {report.currencySymbol} {fmt(report.khataCard.payable)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1.5">
                <Wallet className="w-3 h-3 text-emerald-400" /> Cash In Hand
              </span>
              <span className="text-base font-black font-mono text-emerald-400">
                {report.currencySymbol} {fmt(report.cash.cashInHand)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    Sales Returns (سیل واپسی)
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      {report.returnsSummary?.saleReturnsTotalCount ?? report.salesCard.saleReturnsCount ?? 0} bills
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Today: {report.currencySymbol} {fmt(report.returnsSummary?.saleReturnsToday ?? report.salesCard.saleReturnsToday ?? 0)} &bull; Month: {report.currencySymbol} {fmt(report.returnsSummary?.saleReturnsMonth ?? report.salesCard.saleReturnsMonth ?? 0)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Deducted</span>
                <span className="text-sm font-black font-mono text-rose-400">
                  &minus; {report.currencySymbol} {fmt(report.returnsSummary?.saleReturnsTotal ?? report.salesCard.saleReturnsTotal ?? 0)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    Purchase Returns (خریداری واپسی)
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {report.returnsSummary?.purchaseReturnsTotalCount ?? report.purchaseCard.purchaseReturnsCount ?? 0} bills
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Today: {report.currencySymbol} {fmt(report.returnsSummary?.purchaseReturnsToday ?? report.purchaseCard.purchaseReturnsToday ?? 0)} &bull; Month: {report.currencySymbol} {fmt(report.returnsSummary?.purchaseReturnsMonth ?? report.purchaseCard.purchaseReturnsMonth ?? 0)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Deducted</span>
                <span className="text-sm font-black font-mono text-amber-400">
                  &minus; {report.currencySymbol} {fmt(report.returnsSummary?.purchaseReturnsTotal ?? report.purchaseCard.purchaseReturnsTotal ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PRINTABLE A4 REPORT ---------------- */}
      <div
        id="printable-audit-report"
        className="bg-white rounded-xl overflow-hidden border border-slate-800 shadow-lg"
      >
        {isLoading || !parsed ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="text-sm font-semibold">
              {isLoading ? 'Building AI Ledger Master Business Audit Report from live ledger...' : 'No report data.'}
            </span>
          </div>
        ) : (
          <>
            <style>{parsed.styles}</style>
            <div dangerouslySetInnerHTML={{ __html: parsed.body }} />
          </>
        )}
      </div>

      {/* Audit notes */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-500 space-y-1 print:hidden">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          AUDIT NOTES
        </div>
        <p>
          Company details are read from <strong className="text-slate-300">Company Registration (Settings)</strong> &bull;
          Currency: <strong className="text-slate-300">{report?.currency || companyProfile?.currency || 'PKR'}</strong>
          &bull; Closing time from Tijori settings.
        </p>
        <p>
          Sales Returns (سیل واپسی) &amp; Purchase Returns (خریداری واپسی) are audit-linked: automatically deducted
          from Gross Sales &amp; Purchases, restored/deducted in inventory stock, and tied into Cash &amp; Khata.
        </p>
        <p>
          Salesman rows only include salesmen that actually have sale records on or before the audit date
          {hasSalesmen ? ` (${report?.salesmanKhata.length} salesman found).` : ' (none for this date).'}
        </p>
        <p>
          Cash In Hand = Opening B/F + Cash In (sale receipts) − Cash Out (cash purchases + expenses). Bank receipts /
          payments are listed separately and are not mixed into the vault balance. Discounts are shown as memo only so
          the reconciliation always ties.
        </p>
      </div>
    </div>
  );
};
