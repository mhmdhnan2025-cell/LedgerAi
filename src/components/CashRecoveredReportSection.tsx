import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  RefreshCw,
  X,
  Banknote,
  Landmark,
  CreditCard,
  Receipt,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { CashRecoveredReportItem, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface CashRecoveredReportSectionProps {
  companyProfile?: CompanyProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export const CashRecoveredReportSection: React.FC<CashRecoveredReportSectionProps> = ({
  companyProfile,
  onNavigateTab,
}) => {
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [reportItems, setReportItems] = useState<CashRecoveredReportItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmItem, setConfirmItem] = useState<CashRecoveredReportItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEntry = async () => {
    if (!confirmItem) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await api.deleteCashRecoveredItem(confirmItem.voucherId);
      setSuccessMsg(`Recovery entry "${confirmItem.voucherNumberFormatted}" (Amount: ${currencySymbol()} ${confirmItem.amount.toLocaleString()}) deleted successfully.`);
      setConfirmItem(null);
      await loadReport();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete recovery entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getCashRecoveredReport(fromDate, toDate);
      let items = res.items || [];
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        items = items.filter(
          (it) =>
            it.accountTitle.toLowerCase().includes(q) ||
            it.accountCode.toLowerCase().includes(q) ||
            it.narration.toLowerCase().includes(q) ||
            it.voucherNumberFormatted.toLowerCase().includes(q) ||
            String(it.jvNumber).includes(q)
        );
      }
      setReportItems(items);
      const total = items.reduce((sum, it) => sum + it.amount, 0);
      setTotalAmount(total);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Cash Recovered Report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // CSV Export
  const handleExportCSV = () => {
    if (reportItems.length === 0) return;
    const headers = ['Sr No', 'Date', 'Voucher No', 'JV No', 'Account Code', 'Account Title', 'Payment Mode', 'Narration', 'Amount'];
    const rows = reportItems.map((r, idx) => [
      idx + 1,
      r.date,
      r.voucherNumberFormatted,
      r.jvNumber,
      `"${r.accountCode}"`,
      `"${r.accountTitle.replace(/"/g, '""')}"`,
      `"${r.paymentMode}"`,
      `"${r.narration.replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cash_Recovered_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Cash &amp; Bank Recovered Report (وصولی رپورٹ)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={reportItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">From Date (شروع تاریخ)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">To Date (آخری تاریخ)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Search Account / Party</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Narration, Voucher #..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={loadReport}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Filtering...' : 'Apply Filter'}</span>
            </button>
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSearchQuery('');
                setTimeout(loadReport, 50);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
            >
              All Records
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950 border border-rose-700 rounded-lg text-rose-200 text-xs flex justify-between items-center print:hidden">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-200">
            <thead className="bg-slate-800 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3 w-16 text-center">SR NO.</th>
                <th className="px-3 py-3">DATE</th>
                <th className="px-3 py-3">VOUCHER #</th>
                <th className="px-3 py-3">JV #</th>
                <th className="px-4 py-3">ACCOUNT NAME</th>
                <th className="px-3 py-3">PAYMENT MODE</th>
                <th className="px-4 py-3">NARRATION</th>
                <th className="px-4 py-3 text-right">RECOVERED AMOUNT</th>
                <th className="px-3 py-3 text-center w-16 print:hidden">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {reportItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 italic">
                    {isLoading ? 'Loading recovery transactions...' : 'No recovered cash or bank entries found in this date range.'}
                  </td>
                </tr>
              ) : (
                reportItems.map((row, idx) => (
                  <tr key={`${row.voucherId}-${idx}`} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {row.voucherNumberFormatted}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400 font-semibold">{row.jvNumber}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-white">{row.accountTitle}</div>
                      <div className="font-mono text-[10px] text-slate-500">{row.accountCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.paymentMode.startsWith('Bank')
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {row.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-xs truncate">{row.narration || '-'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap text-sm">
                      {currencySymbol()} {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center print:hidden">
                      <button
                        onClick={() => setConfirmItem(row)}
                        className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 text-rose-300 hover:text-white rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition shadow-sm cursor-pointer group"
                        title="Delete Recovery Voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
                        <span>Del</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Total Bar */}
        <div className="bg-slate-800 px-5 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Total Entries:</span>
            <strong className="text-white text-sm">{reportItems.length}</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-xs">
              Total Cash / Bank Recovered:
            </span>
            <span className="font-mono font-black text-emerald-400 text-base sm:text-lg">
              {currencySymbol()} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Delete Cash Recovery Entry?</h4>
                <p className="text-xs text-slate-400">This action will reverse the recovery from the ledger and cash register.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Voucher / Ref:</span>
                <span className="font-mono font-bold text-emerald-400">{confirmItem.voucherNumberFormatted} (JV #{confirmItem.jvNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white font-semibold">{confirmItem.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="text-white font-bold">{confirmItem.accountTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-black text-rose-400 text-sm">
                  {currencySymbol()} {confirmItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
