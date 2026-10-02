import React, { useState } from 'react';
import {
  Activity,
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  Filter,
  Mic,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { AuditLog } from '../types';
import { adaptCurrencyText } from '../utils/currency';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      adaptCurrencyText(l.description).toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'ALL' || l.source === sourceFilter;
    const matchesEntity = entityFilter === 'ALL' || l.entityType === entityFilter;

    return matchesSearch && matchesSource && matchesEntity;
  });

  const getSourceBadge = (source: AuditLog['source']) => {
    switch (source) {
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Mic className="w-3 h-3" />
            <span>Voice Command</span>
          </span>
        );
      case 'ai_chat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Bot className="w-3 h-3" />
            <span>AI Copilot</span>
          </span>
        );
      case 'image':
      case 'image_ocr':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Camera className="w-3 h-3" />
            <span>Document OCR</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            <span>Manual</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Compliance & Enterprise Audit Trail</h2>
        <p className="text-xs text-slate-400">
          Immutable event log of every financial, inventory, and AI-triggered mutation.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, user, or description..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
          >
            <option value="ALL">All Sources</option>
            <option value="manual">Manual Entry</option>
            <option value="ai_chat">AI Copilot Chat</option>
            <option value="voice">Voice Command</option>
            <option value="image_ocr">Document OCR</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
          >
            <option value="ALL">All Entities</option>
            <option value="Order">Orders</option>
            <option value="Payment">Payments</option>
            <option value="Inventory">Inventory</option>
            <option value="Expense">Expenses</option>
            <option value="Restaurant">Restaurants</option>
          </select>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No audit logs found.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="font-semibold text-slate-300">&bull; {log.entityType}</span>
                  {getSourceBadge(log.source)}
                </div>
                <p className="text-slate-200 font-medium">{adaptCurrencyText(log.description)}</p>
                {(log.previousValue || log.newValue) && (
                  <div className="mt-1 font-mono text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/80 max-w-2xl break-all">
                    {log.previousValue && <div className="text-rose-400/90">&larr; Prev: {log.previousValue}</div>}
                    {log.newValue && <div className="text-emerald-400/90">&rarr; New: {log.newValue}</div>}
                  </div>
                )}
              </div>

              <div className="self-start sm:self-center shrink-0 text-right text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 justify-end">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-white">{log.userName}</span>
                  <span className="text-slate-500">({log.userRole})</span>
                </div>
                <div className="flex items-center gap-1 justify-end text-slate-500 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
