import { currencySymbol, adaptCurrencyText } from '../utils/currency';
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Package,
  Printer,
  Receipt,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { CompanyProfile, SaleBill, UserRole } from '../types';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { MasterAuditReportModal } from './MasterAuditReportModal';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  companyProfile?: CompanyProfile | null;
  onDataMutated: () => void;
  initialQuery?: string;
}

const DEFAULT_MODAL_MESSAGE = {
  role: 'assistant' as const,
  content: `Hello! I am your AI Business Copilot. You can tell me what happened in plain English, Roman Urdu, or Hindi, or speak directly through the microphone.\n\nExamples you can try:\n• "Al Madina restaurant ne 40 kg rice aur 20 kg daal order kiye hain"\n• "Ali restaurant paid 35,000 cash today"\n• "Record ${currencySymbol()} 4,500 petrol expense for delivery van"\n• "Which restaurant is our most profitable customer?"`,
};

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  companyProfile,
  onDataMutated,
  initialQuery,
}) => {
  const [input, setInput] = useState('');
  const [selectedBillForReceiptModal, setSelectedBillForReceiptModal] = useState<SaleBill | null>(null);
  const [isMasterAuditModalOpen, setIsMasterAuditModalOpen] = useState(false);
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant';
      content: string;
      executedTools?: { name: string; args: any; result: any }[];
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem('ai_assistant_modal_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_MODAL_MESSAGE];
  });

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai_assistant_modal_messages', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleClearModalChat = () => {
    setMessages([DEFAULT_MODAL_MESSAGE]);
    try {
      localStorage.removeItem('ai_assistant_modal_messages');
    } catch (e) {}
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const baseInputRef = useRef<string>('');
  const currentInputRef = useRef<string>('');

  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        const prefix = baseInputRef.current ? baseInputRef.current.trim() + ' ' : '';
        const combined = (prefix + transcript).trim();
        setInput(combined);
        currentInputRef.current = combined;
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech error:', e);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            baseInputRef.current = currentInputRef.current;
            recognition.start();
          } catch (err) {
            setTimeout(() => {
              if (isListeningRef.current) {
                try { recognition.start(); } catch (e) {}
              }
            }, 200);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setInput(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const toggleVoiceListening = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported on this browser. Please type your message.');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      isListeningRef.current = true;
      baseInputRef.current = input;
      currentInputRef.current = input;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        try {
          recognitionRef.current?.stop();
          setTimeout(() => {
            if (isListeningRef.current) recognitionRef.current?.start();
          }, 150);
        } catch (e) {}
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      try { recognitionRef.current?.stop(); } catch (e) {}
    }

    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    const newMsgs = [...messages, { role: 'user' as const, content: query }];
    setMessages(newMsgs);
    setInput('');
    baseInputRef.current = '';
    currentInputRef.current = '';
    setIsProcessing(true);

    try {
      const res = await api.sendAiChat(
        newMsgs.map((m) => ({ role: m.role, content: m.content })),
        {
          userRole: currentRole,
          userName: `Staff (${currentRole})`,
          source: isListening ? 'voice' : 'ai_chat',
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          executedTools: res.executedTools,
        },
      ]);

      // If tools were executed that mutated business data, notify parent to refetch
      if (res.executedTools && res.executedTools.length > 0) {
        onDataMutated();
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Please try again.';
      let displayMsg = `Unable to process AI request: ${rawMsg}`;
      if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        displayMsg = 'The AI model is currently experiencing high global demand. I am operating in resilient local mode with automatic fallback. Please resend or try again in a few moments.';
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: displayMsg,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const promptPresets = [
    'Purchase report aur khareed details do',
    'Sale report aur farokht details do',
    'Profit intelligence aur munafa report do',
    'Stock movement history aur ledger report do',
    'Master business audit report do',
    'Al Madina ka sale bill dikhao',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[90vh] max-h-[720px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">AI Financial Reports &amp; Munshi</h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Verified Reporting
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verified financial reports, profit intelligence, and printable document downloads.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearModalChat}
              className="flex items-center gap-1.5 text-rose-300 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 transition cursor-pointer font-bold shadow-xs"
              title="Clear chat history (چیٹ صاف کریں)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Chat (صاف کریں)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-500 font-semibold uppercase text-[10px] shrink-0">Reports:</span>
          {promptPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(preset)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full whitespace-nowrap border border-slate-700/60 transition cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed space-y-2.5 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{adaptCurrencyText(m.content)}</p>

                  {/* Render executed tool cards if present */}
                  {m.executedTools && m.executedTools.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/80 space-y-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Database Actions &amp; Reports:</span>
                      </div>
                      {m.executedTools.map((tool, tIdx) => (
                        <div
                          key={tIdx}
                          className="bg-slate-950/80 rounded-xl p-3 border border-slate-700/90 space-y-2.5 text-[11px]"
                        >
                          <div className="text-indigo-300 font-mono font-bold text-xs">{tool.name}()</div>
                          
                          {/* 1. CUSTOMER SALE BILL / TAX INVOICE */}
                          {tool.result?.bill && (
                            <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                                  Tax Invoice #{tool.result.bill.billNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">{tool.result.bill.date}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>{tool.result.bill.customerAccountTitle || tool.result.customerName}</span>
                                <span className="text-emerald-400 font-mono text-sm font-black">
                                  {currencySymbol()} {(tool.result.bill.netTotal || 0).toLocaleString()}
                                </span>
                              </div>
                              {tool.result.bill.items && tool.result.bill.items.length > 0 && (
                                <div className="text-[11px] text-slate-300 divide-y divide-slate-800 bg-slate-950/80 p-2 rounded-lg max-h-36 overflow-y-auto">
                                  {tool.result.bill.items.map((it: any, iIdx: number) => (
                                    <div key={iIdx} className="py-1 flex justify-between items-center text-[10px]">
                                      <span>{it.itemTitle} ({it.ctn ? `${it.ctn} CTN / ` : ''}{it.qty} {it.unit || 'Units'})</span>
                                      <span className="font-mono font-bold text-slate-200">{currencySymbol()} {it.amount?.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-[11px]">
                                <span className="text-slate-400">
                                  Balance Due: <strong className="text-amber-400 font-mono">{currencySymbol()} {(tool.result.bill.balanceReceivable || 0).toLocaleString()}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBillForReceiptModal(tool.result.bill)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>👁️ View &amp; Print Bill (بل دیکھیں / پرنٹ کریں)</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 2. MASTER BUSINESS AUDIT REPORT */}
                          {(tool.name === 'generate_business_report' || tool.result?.reportType === 'aiLedgerAudit') && (
                            <div className="p-3 bg-slate-900 border border-indigo-500/40 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">🛡️</span>
                                  <span className="text-xs font-black text-indigo-300">Master Business Audit Report</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                                  Verified Audit
                                </span>
                              </div>
                              {tool.result.summary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Total Turnover</span>
                                    <span className="font-mono font-bold text-white text-xs">{currencySymbol()} {(tool.result.summary.totalRevenue || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Gross Margin</span>
                                    <span className="font-mono font-bold text-emerald-400 text-xs">{currencySymbol()} {(tool.result.summary.grossProfit || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-950/80">
                                    <span className="text-slate-400 block">Net Outcome</span>
                                    <span className={`font-mono font-bold text-xs ${tool.result.summary.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {(tool.result.summary.isProfit ? '+' : '')}{currencySymbol()} {(tool.result.summary.netProfitOrLoss || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setIsMasterAuditModalOpen(true)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>👁️ View &amp; Print Master Audit (ماسٹر آڈٹ کھولیں)</span>
                                </button>
                                {tool.result.downloadUrl && (
                                  <a
                                    href={tool.result.downloadUrl}
                                    download={tool.result.fileName || 'Master_Audit.doc'}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Word (.doc)</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. PURCHASE REPORT SUMMARY */}
                          {tool.result?.reportType === 'purchases' && tool.result?.summary && (
                            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>📦 Purchase Report Summary</span>
                                <span className="text-emerald-400 font-mono">{currencySymbol()} {(tool.result.summary.totalNetPurchases || 0).toLocaleString()}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Total Bills</span>
                                  <span className="font-bold text-white">{tool.result.summary.totalBillsCount || 0} Bills</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Supplier Payable</span>
                                  <span className="font-bold text-rose-400 font-mono">{currencySymbol()} {(tool.result.summary.totalRemainingBalance || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. SALE REPORT SUMMARY */}
                          {tool.result?.reportType === 'sales' && tool.result?.summary && (
                            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>💰 Sale Report Summary</span>
                                <span className="text-emerald-400 font-mono">{currencySymbol()} {(tool.result.summary.totalNetSales || 0).toLocaleString()}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Total Bills</span>
                                  <span className="font-bold text-white">{tool.result.summary.totalBillsCount || 0} Bills</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Market Udhaar</span>
                                  <span className="font-bold text-amber-400 font-mono">{currencySymbol()} {(tool.result.summary.totalBalanceReceivable || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. PROFIT INTELLIGENCE SUMMARY */}
                          {tool.result?.reportType === 'profit' && tool.result?.summary && (
                            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>📈 Profit Intelligence Summary</span>
                                <span className={`font-mono ${(tool.result.summary.totalNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {currencySymbol()} {(tool.result.summary.totalNetProfit || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Gross Profit</span>
                                  <span className="font-bold text-emerald-400 font-mono">{currencySymbol()} {(tool.result.summary.totalGrossProfit || 0).toLocaleString()}</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950/80">
                                  <span className="text-slate-400 block">Net Margin</span>
                                  <span className="font-bold text-cyan-300 font-mono">{tool.result.summary.overallMarginPct || 0}%</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Default message / download link if not specialized card */}
                          {!tool.result?.bill && tool.name !== 'generate_business_report' && tool.result?.reportType !== 'aiLedgerAudit' && !['purchases', 'sales', 'profit'].includes(tool.result?.reportType) && (
                            tool.result && (
                              <div className="text-slate-300 whitespace-pre-line font-mono text-[11px]">
                                {tool.result.message || JSON.stringify(tool.result)}
                              </div>
                            )
                          )}

                          {tool.result?.downloadUrl && tool.name !== 'generate_business_report' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                              <a
                                href={tool.result.downloadUrl}
                                download={tool.result.fileName || 'Report.html'}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] inline-flex items-center gap-1 transition"
                              >
                                📥 Download Report File
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Executing tools & calculating real financials...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          {/* Active Listening Indicator */}
          {isListening && (
            <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-between text-xs text-purple-200 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <span className="font-bold">Listening to voice command... Speak now!</span>
              </div>
              <button
                onClick={() => recognitionRef.current?.stop()}
                className="text-purple-300 hover:text-white font-semibold underline"
              >
                Stop
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceListening}
              className={`p-2.5 rounded-xl border transition ${
                isListening
                  ? 'bg-purple-600 text-white border-purple-500 animate-bounce'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Speak voice command (English or Roman Urdu)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-purple-400" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Al Madina ne 50kg rice order kiya, or type in Roman Urdu..."
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />

            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* SALE BILL / TAX INVOICE MODAL */}
      {selectedBillForReceiptModal && (
        <SalesBillReceiptModal
          bill={selectedBillForReceiptModal}
          isOpen={true}
          onClose={() => setSelectedBillForReceiptModal(null)}
          companyProfile={companyProfile}
        />
      )}

      {/* MASTER BUSINESS AUDIT REPORT MODAL */}
      <MasterAuditReportModal
        isOpen={isMasterAuditModalOpen}
        onClose={() => setIsMasterAuditModalOpen(false)}
        companyProfile={companyProfile}
      />
    </div>
  );
};
