import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Eye,
  AlertCircle,
  Undo2,
  X,
} from 'lucide-react';
import { Supplier, Product, PurchaseReturn, CompanyProfile } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';
import { PurchaseReturnModal } from './PurchaseReturnModal';

interface PurchaseReturnReportSectionProps {
  companyProfile?: CompanyProfile | null;
  products?: Product[];
  suppliers?: Supplier[];
  onNavigateTab?: (tab: string) => void;
}

export const PurchaseReturnReportSection: React.FC<PurchaseReturnReportSectionProps> = ({
  companyProfile,
  products = [],
  suppliers = [],
  onNavigateTab,
}) => {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(suppliers);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [returnsData, suppliersData] = await Promise.all([
        api.getPurchaseReturns(),
        api.getSuppliers(),
      ]);
      setReturns(returnsData || []);
      if (Array.isArray(suppliersData)) setAllSuppliers(suppliersData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load purchase returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, returnNum: string) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Return #${returnNum}? This will restore the deducted inventory stock and reinstate supplier payable.`)) {
      return;
    }
    try {
      await api.deletePurchaseReturn(id);
      loadData();
    } catch (err: any) {
      alert(`Error deleting return: ${err.message}`);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.returnNumber.toLowerCase().includes(q) ||
      r.returnNumberFormatted.toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q) ||
      (r.supplierCode && r.supplierCode.toLowerCase().includes(q)) ||
      (r.originalBillNumber && r.originalBillNumber.toLowerCase().includes(q));

    const matchesDate = (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate);
    return matchesSearch && matchesDate;
  });

  const totalReturnValue = filteredReturns.reduce((sum, r) => sum + (r.netTotal || r.totalAmount || 0), 0);
  const totalReturnedQty = filteredReturns.reduce(
    (sum, r) => sum + (r.items || []).reduce((s, it) => s + (it.qty || 0), 0),
    0
  );

  const handleExportCSV = () => {
    const headers = ['Return #', 'Date', 'Supplier', 'Original Bill #', 'Items Count', 'Total Amount', 'Reason'];
    const rows = filteredReturns.map((r) => [
      r.returnNumberFormatted || r.returnNumber,
      r.date,
      `"${r.supplierName}"`,
      r.originalBillNumber || '',
      String(r.items?.length || 0),
      String(r.netTotal || r.totalAmount || 0),
      `"${(r.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Returns_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-purple-400" />
            <span>Purchase Returns Report (خریداری واپسی رپورٹ)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View, edit, or delete goods returned to suppliers and debit notes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingReturn(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Purchase Return</span>
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Returns Count</div>
          <div className="text-xl font-black text-white mt-1 font-mono">{filteredReturns.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Returned Units</div>
          <div className="text-xl font-black text-white mt-1 font-mono">{totalReturnedQty.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Return Value</div>
          <div className="text-xl font-black text-purple-400 mt-1 font-mono">
            {currencySymbol()} {totalReturnValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Live Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search return #, supplier, bill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Return #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier Account</th>
                <th className="py-2.5 px-3">Original Bill</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-right">Amount ({currencySymbol()})</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No purchase returns found. Click "+ Record Purchase Return" to record one.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-purple-400">
                      {r.returnNumberFormatted || r.returnNumber}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{r.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div>{r.supplierName}</div>
                      {r.supplierCode && <div className="text-[10px] text-slate-500">{r.supplierCode}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{r.originalBillNumber || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {r.items?.length || 0} items
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {Number(r.netTotal || r.totalAmount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{r.reason || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingReturn(r)}
                          className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition"
                          title="View Items"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingReturn(r);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition"
                          title="Edit Return"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.returnNumberFormatted || r.returnNumber)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title="Delete Return"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Return Add/Edit Modal */}
      <PurchaseReturnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
        initialReturn={editingReturn}
        suppliers={allSuppliers}
        products={products}
      />

      {/* View Items Detail Modal */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Purchase Return Details: {viewingReturn.returnNumberFormatted || viewingReturn.returnNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Supplier: {viewingReturn.supplierName} • Date: {viewingReturn.date}
                </p>
              </div>
              <button
                onClick={() => setViewingReturn(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-300 font-bold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Unit</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Cost Rate</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {viewingReturn.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-white">
                          <div>{it.itemTitle}</div>
                          {it.reason && <div className="text-[10px] text-purple-400/80">{it.reason}</div>}
                        </td>
                        <td className="py-2 px-3 text-center">{it.unit || 'CTN'}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.qty}</td>
                        <td className="py-2 px-3 text-right font-mono">{currencySymbol()} {it.rate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-400">
                          {currencySymbol()} {Number(it.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl font-bold text-xs">
                <span>Total Return Amount:</span>
                <span className="text-purple-400 text-sm font-mono">
                  {currencySymbol()} {Number(viewingReturn.netTotal || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingReturn(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
