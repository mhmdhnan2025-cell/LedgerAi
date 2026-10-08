import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (key: string) => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [aiStudioUrl, setAiStudioUrl] = useState('https://aistudio.google.com/app/apikey');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentKeyStatus();
    }
  }, [isOpen]);

  const loadCurrentKeyStatus = async () => {
    try {
      const vaultKey = (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key_vault') || '').trim() : '');
      const res = await api.getGeminiApiKeyStatus();
      if (res.hasKey) {
        setHasExistingKey(true);
        setMaskedKey(res.maskedKey || '');
      } else if (vaultKey && vaultKey.length > 10) {
        // Auto-heal right away
        setHasExistingKey(true);
        setMaskedKey(vaultKey.slice(0, 6) + '...' + vaultKey.slice(-4));
        api.saveGeminiApiKey(vaultKey).catch(() => {});
      } else {
        setHasExistingKey(false);
        setMaskedKey('');
      }
      if (res.aiStudioUrl) setAiStudioUrl(res.aiStudioUrl);
    } catch (e) {
      console.warn('Failed to load Gemini key status:', e);
    }
  };

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = apiKey.trim();
    if (!clean) {
      setErrorMsg('Baraye meherbani valid Gemini API Key darj karein.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key_vault', clean);
        localStorage.setItem('gemini_api_key_configured', 'true');
      }
      const res = await api.saveGeminiApiKey(clean);
      setSuccessMsg(res.message || 'Gemini API Key kamyabi se permanent save aur activate ho gai hai!');
      setHasExistingKey(true);
      if (res.maskedKey) setMaskedKey(res.maskedKey);
      else setMaskedKey(clean.slice(0, 6) + '...' + clean.slice(-4));
      if (onKeyUpdated) onKeyUpdated(clean);
      setApiKey('');
    } catch (err: any) {
      setErrorMsg(err.message || 'API Key verification failed. Baraye meherbani AI Studio me key verify karein.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Google Gemini API Key
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Studio
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Heavy OCR, Handwritten Slip Detection & AI Munshi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Current Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            hasExistingKey
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              {hasExistingKey ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">
                  {hasExistingKey ? 'Gemini AI Active & Connected' : 'No Gemini API Key Configured'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {hasExistingKey && maskedKey ? `Active Key: ${maskedKey}` : 'Key configure karna zaroori hai ta k OCR kaam kare.'}
                </span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              hasExistingKey
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {hasExistingKey ? 'Connected' : 'Missing'}
            </span>
          </div>

          {/* AI Studio Link Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Google AI Studio se Free Key Hasil Karein
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Google AI Studio par ja kr 1-click me apni personal API Key banayein.
              </p>
            </div>
            <a
              href={aiStudioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition shrink-0"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Gemini API Key Darj Karein:</span>
                <span className="text-[10px] text-slate-500">Auto-saved permanently</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? 'Nayi key paste karein ya wahi use karein...' : 'AIzaSy... paste your key here'}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Verification Error:</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with Google...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Test & Save Key</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* User note */}
          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 leading-relaxed">
            <p>
              💡 <strong>Note:</strong> Jab aap key lagayenge to server aur client dono me save ho jaye gi aur permanent active rahegi. OCR me handwritten mandi parchas, kacha receipts, aur supplier bills detect karne k liye yahi key use hogi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
