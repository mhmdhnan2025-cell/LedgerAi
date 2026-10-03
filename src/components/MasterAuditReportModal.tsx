import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { CompanyProfile } from '../types';

interface MasterAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditDate?: string;
  companyProfile?: CompanyProfile | null;
}

export const MasterAuditReportModal: React.FC<MasterAuditReportModalProps> = ({
  isOpen,
  onClose,
  auditDate,
  companyProfile,
}) => {
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const html = await api.getAiLedgerAuditReportHtml(auditDate || undefined);
      setReportHtml(html);
    } catch (err: any) {
      setErrorMsg(err.message || 'Master Business Audit Report load nahi ho saka.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, auditDate]);

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

  if (!isOpen) return null;

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

  const downloadUrl = (format: 'html' | 'doc') =>
    `/api/reports/download?type=ledger-audit&format=${format}${auditDate ? `&date=${encodeURIComponent(auditDate)}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">
                  Master Business Audit Report (ماسٹر آڈٹ رپورٹ)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Official Audit
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {companyProfile?.name || 'Restaurant ERP'} &bull; Single-Page Business &amp; Cash Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadReport}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh Audit Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <a
              href={downloadUrl('html')}
              download="Master_Business_Audit_Report.html"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              title="Download standalone styled HTML audit report (opens identically offline/in browser)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report (.html)</span>
            </a>

            <button
              onClick={handlePrint}
              disabled={isLoading || !parsed}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Content View */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/60">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span>Loading official Master Business Audit from live ledgers...</span>
            </div>
          )}

          {errorMsg && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs text-center">
              {errorMsg}
            </div>
          )}

          {!isLoading && parsed && (
            <div id="printable-audit-report" className="bg-white rounded-xl overflow-hidden shadow-xl border border-slate-300">
              <style>{parsed.styles}</style>
              <div dangerouslySetInnerHTML={{ __html: parsed.body }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
