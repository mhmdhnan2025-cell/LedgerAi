import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import { SmartAlert } from '../types';

interface SmartAlertsBannerProps {
  alerts?: SmartAlert[];
  onActionClick?: (alert: SmartAlert) => void;
  onDismiss?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
}

export const SmartAlertsBanner: React.FC<SmartAlertsBannerProps> = ({
  alerts = [],
  onActionClick,
  onDismiss,
  onDismissAlert,
}) => {
  const safeAlerts = (alerts || []).filter(Boolean);
  if (safeAlerts.length === 0) return null;

  const handleDismiss = (id: string) => {
    if (onDismissAlert) onDismissAlert(id);
    else if (onDismiss) onDismiss(id);
  };

  return (
    <div className="mb-6 space-y-2.5">
      {safeAlerts.slice(0, 3).map((alert) => {
        const isCritical = alert.severity === 'critical';
        const isWarning = alert.severity === 'warning';
        const msg = alert.message || (alert as any).description || '';
        const actionText = alert.actionableText || (alert as any).actionLabel || 'Review';

        return (
          <div
            key={alert.id}
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
              isCritical
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
                : isWarning
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-100'
                : 'bg-indigo-950/40 border-indigo-800/80 text-indigo-100'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isCritical
                    ? 'bg-rose-900/60 text-rose-400'
                    : isWarning
                    ? 'bg-amber-900/60 text-amber-400'
                    : 'bg-indigo-900/60 text-indigo-400'
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white">{alert.title}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {(alert.type || 'alert').replace('_', ' ')}
                  </span>
                </div>
                {msg && <p className="text-slate-300 text-[11px] mt-0.5">{msg}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {onActionClick && (
                <button
                  onClick={() => onActionClick(alert)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
                    isCritical
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-900/50'
                      : isWarning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-900/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/50'
                  }`}
                >
                  <span>{actionText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => handleDismiss(alert.id)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/50 transition"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
