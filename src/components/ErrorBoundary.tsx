import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    if ((this as any).props?.onReset) {
      (this as any).props.onReset();
    }
  };

  render() {
    const { hasError, error } = (this as any).state || {};
    const { fallbackTitle, children } = (this as any).props || {};

    if (hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              {fallbackTitle || 'Something went wrong in this section'}
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 break-all text-left max-h-32 overflow-y-auto">
              {error?.message || 'Unknown runtime error occurred.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Section
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
