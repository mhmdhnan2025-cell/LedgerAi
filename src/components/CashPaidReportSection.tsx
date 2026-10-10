import React, { useState, useEffect, useMemo } from 'react';
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
  Building2,
  Wallet,
  Layers,
  ArrowDownRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { CashPaidReportItem, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';

interface CashPaidReportSectionProps {
  companyProfile?: CompanyProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export const CashPaidReportSection: React.FC<CashPaidReportSectionProps> = ({
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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Supplier' | 'Expense'>('ALL');
  
  const [rawItems, setRawItems] = useState<CashPaidReportItem[]>([]);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [supplierTotal, setSupplierTotal] = useState<number>(0);
  const [expenseTotal, setExpenseTotal] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmItem, setConfirmItem] = useState<CashPaidReportItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEntry = async () => {
    if (!confirmItem) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await api.deleteCashPaidItem(confirmItem.voucherId);
      setSuccessMsg(`Payment entry "${confirmItem.voucherNumberFormatted}" (Amount: ${currencySymbol()} ${confirmItem.amount.toLocaleString()}) deleted successfully.`);
      setConfirmItem(null);
      await loadReport();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete payment entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getCashPaidReport(fromDate, toDate);
      const items = res.items || [];
      setRawItems(items);
      setGrandTotal(res.totalAmount ?? items.reduce((sum, it) => sum + it.amount, 0));
      setSupplierTotal(
        res.supplierAmount ??
          items.filter((it) => it.category === 'Supplier').reduce((sum, it) => sum + it.amount, 0)
      );
      setExpenseTotal(
        res.expenseAmount ??
          items.filter((it) => it.category === 'Expense').reduce((sum, it) => sum + it.amount, 0)
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Cash Paid Report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Filtered Items based on search and category tab
  const filteredItems = useMemo(() => {
    let items = rawItems;

    if (categoryFilter !== 'ALL') {
      items = items.filter((it) => it.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (it) =>
          it.accountTitle.toLowerCase().includes(q) ||
          it.accountCode.toLowerCase().includes(q) ||
          it.narration.toLowerCase().includes(q) ||
          it.voucherNumberFormatted.toLowerCase().includes(q) ||
          String(it.jvNumber).includes(q) ||
          (it.category && it.category.toLowerCase().includes(q))
      );
    }

    return items;
  }, [rawItems, categoryFilter, searchQuery]);

  // Current view total
  const filteredTotal = useMemo(() => {
    return filteredItems.reduce((sum, it) => sum + it.amount, 0);
  }, [filteredItems]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = [
      'Sr No',
      'Date',
      'Voucher No',
      'JV No',
      'Category',
      'Account Code',
      'Account Title',
      'Payment Mode',
      'Narration',
      'Amount',
    ];
    const rows = filteredItems.map((r, idx) => [
      idx + 1,
      r.date,
      r.voucherNumberFormatted,
      r.jvNumber,
      `"${r.category || 'Other'}"`,
      `"${r.accountCode}"`,
      `"${r.accountTitle.replace(/"/g, '""')}"`,
      `"${r.paymentMode}"`,
      `"${r.narration.replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cash_Paid_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supplierItemsCount = useMemo(
    () => rawItems.filter((it) => it.category === 'Supplier').length,
    [rawItems]
  );
  const expenseItemsCount = useMemo(
    () => rawItems.filter((it) => it.category === 'Expense').length,
    [rawItems]
  );

  return (
    <div className="space-y-4">
      {/* KPI Breakdown Cards: Total vs Supplier vs Expense */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Cash/Bank Paid */}
        <div
          onClick={() => setCategoryFilter('ALL')}
          className={`bg-slate-900 border rounded-xl p-4 shadow-sm cursor-pointer transition ${
            categoryFilter === 'ALL'
              ? 'border-rose-500 bg-slate-900/90 ring-1 ring-rose-500/50'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-rose-400" />
              TOTAL PAID (کل ادائیگی)
            </span>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
              {rawItems.length} entries
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {currencySymbol()} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">All supplier &amp; daily expense outflows</div>
        </div>

        {/* Supplier Payments */}
        <div
          onClick={() => setCategoryFilter('Supplier')}
          className={`bg-slate-900 border rounded-xl p-4 shadow-sm cursor-pointer transition ${
            categoryFilter === 'Supplier'
              ? 'border-indigo-500 bg-slate-900/90 ring-1 ring-indigo-500/50'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" />
              SUPPLIER PAID (سپلائر ادائیگیاں)
            </span>
            <span className="text-[11px] bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded font-mono">
              {supplierItemsCount} entries
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300">
            {currencySymbol()}{' '}
            {supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Mills, Vendors &amp; Wholesale Suppliers
          </div>
        </div>

        {/* Expense Payments */}
        <div
          onClick={() => setCategoryFilter('Expense')}
          className={`bg-slate-900 border rounded-xl p-4 shadow-sm cursor-pointer transition ${
            categoryFilter === 'Expense'
              ? 'border-amber-500 bg-slate-900/90 ring-1 ring-amber-500/50'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-400" />
              EXPENSE PAID (اخراجات ادائیگیاں)
            </span>
            <span className="text-[11px] bg-amber-950/70 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded font-mono">
              {expenseItemsCount} entries
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
            {currencySymbol()} {expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Salaries, Rent, Petrol, Utilities, Misc</div>
        </div>
      </div>

      {/* Filters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white">
              Cash &amp; Bank Paid Report (ادائیگی رپورٹ)
            </h3>
          </div>

          {/* Category Toggle Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({rawItems.length})
            </button>
            <button
              onClick={() => setCategoryFilter('Supplier')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'Supplier'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Supplier Paid ({supplierItemsCount})
            </button>
            <button
              onClick={() => setCategoryFilter('Expense')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'Expense'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3 h-3" />
              Expense Paid ({expenseItemsCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-rose-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">To Date (آخری تاریخ)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-rose-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">
              Search Account / Supplier / Expense
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Narration, Voucher #..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-rose-500"
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
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Filtering...' : 'Apply Filter'}</span>
            </button>
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSearchQuery('');
                setCategoryFilter('ALL');
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
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950 border border-rose-700 rounded-lg text-rose-200 text-xs flex justify-between items-center print:hidden">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-200">
            <thead className="bg-slate-800 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-3 py-3 w-14 text-center">SR NO.</th>
                <th className="px-3 py-3">DATE</th>
                <th className="px-3 py-3">VOUCHER #</th>
                <th className="px-3 py-3">JV #</th>
                <th className="px-3 py-3">CATEGORY</th>
                <th className="px-4 py-3">ACCOUNT NAME</th>
                <th className="px-3 py-3">PAYMENT MODE</th>
                <th className="px-4 py-3">NARRATION</th>
                <th className="px-4 py-3 text-right">PAID AMOUNT</th>
                <th className="px-3 py-3 text-center w-16 print:hidden">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 italic">
                    {isLoading
                      ? 'Loading payment transactions...'
                      : 'No payment entries found matching the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, idx) => (
                  <tr
                    key={`${row.voucherId}-${idx}`}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-rose-400 font-bold whitespace-nowrap">
                      {row.voucherNumberFormatted}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400 font-semibold">
                      {row.jvNumber}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.category === 'Supplier' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Building2 className="w-3 h-3" /> Supplier
                        </span>
                      ) : row.category === 'Expense' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Receipt className="w-3 h-3" /> Expense
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                          Other
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-white">{row.accountTitle}</div>
                      <div className="font-mono text-[10px] text-slate-500">{row.accountCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.paymentMode.startsWith('Bank')
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {row.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-xs truncate">
                      {row.narration || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400 whitespace-nowrap text-sm">
                      {currencySymbol()}{' '}
                      {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center print:hidden">
                      <button
                        onClick={() => setConfirmItem(row)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Payment Voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Filtered Entries:</span>{' '}
              <strong className="text-white">{filteredItems.length}</strong>
            </div>
            <div>
              <span className="text-indigo-400">Supplier Total:</span>{' '}
              <strong className="text-indigo-300 font-mono">
                {currencySymbol()}{' '}
                {supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-amber-400">Expense Total:</span>{' '}
              <strong className="text-amber-300 font-mono">
                {currencySymbol()}{' '}
                {expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-xs">
              {categoryFilter === 'Supplier'
                ? 'Total Supplier Paid:'
                : categoryFilter === 'Expense'
                ? 'Total Expense Paid:'
                : 'Grand Total Paid:'}
            </span>
            <span className="font-mono font-black text-rose-400 text-base sm:text-lg">
              {currencySymbol()}{' '}
              {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <h4 className="font-bold text-white text-sm">Delete Cash Paid Entry?</h4>
                <p className="text-xs text-slate-400">This action will reverse the payment from supplier/expense ledger and restore cash in hand.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Voucher / Ref:</span>
                <span className="font-mono font-bold text-rose-400">{confirmItem.voucherNumberFormatted} (JV #{confirmItem.jvNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white font-semibold">{confirmItem.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-white font-semibold">{confirmItem.category}</span>
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
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
