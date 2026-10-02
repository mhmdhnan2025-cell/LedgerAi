import React, { useState } from 'react';
import { DatabaseSnapshot, User } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import { api } from '../services/api';
import { HardDrive, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onDataRestored: () => void;
  snapshot: DatabaseSnapshot | null;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataRestored,
  snapshot,
}) => {
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      OfflineStorageService.exportDatabaseJSON();
      setStatusMsg({ type: 'success', text: 'Database backup downloaded successfully to your device!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Export failed: ' + err.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Try server restore first
        try {
          await api.importBackup(parsed, currentUser || undefined);
        } catch (serverErr) {
          // If server fails or offline, restore directly into client-side offline storage!
          OfflineStorageService.importDatabaseJSON(content);
        }

        setStatusMsg({
          type: 'success',
          text: `Database successfully restored! (${parsed.restaurants?.length || 0} restaurants, ${parsed.products?.length || 0} products, ${parsed.orders?.length || 0} orders).`,
        });
        onDataRestored();
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'Failed to restore: ' + (err.message || 'Invalid JSON file') });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const restCount = snapshot?.restaurants?.length || 0;
  const prodCount = snapshot?.products?.length || 0;
  const ordCount = snapshot?.orders?.length || 0;
  const payCount = snapshot?.payments?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Offline Database & Backup</h2>
              <p className="text-xs text-slate-300">Guaranteed data protection & local persistence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Current Local Database Stats */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Current Persistent Records
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{restCount}</div>
                <div className="text-[10px] text-slate-500 uppercase">Restaurants</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{prodCount}</div>
                <div className="text-[10px] text-slate-500 uppercase">Products</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{ordCount}</div>
                <div className="text-[10px] text-slate-500 uppercase">Orders</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="text-base font-extrabold text-slate-800">{payCount}</div>
                <div className="text-[10px] text-slate-500 uppercase">Payments</div>
              </div>
            </div>
          </div>

          {/* Action 2: Export / Download JSON Backup */}
          <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Download Local Backup (JSON)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Save an exact human-readable copy of your database to your device for 100% offline safety.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
          </div>

          {/* Action 3: Restore / Upload Backup */}
          <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Restore from Backup File</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a previously downloaded JSON backup file to restore all accounts and data.
              </p>
            </div>
            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
              <Upload className="w-4 h-4" />
              {importing ? 'Restoring...' : 'Upload File'}
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
