import { currencySymbol, adaptCurrencyText } from '../utils/currency';
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Fuel,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Receipt,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import {
  BusinessSummary,
  CompanyProfile,
  SaleBill,
  PurchaseBill,
  ComprehensiveProfitReport,
  StockMovementReport,
  UserRole,
} from '../types';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { PurchaseBillVoucherModal } from './PurchaseBillVoucherModal';
import { MasterAuditReportModal } from './MasterAuditReportModal';
import { AiSmartPurchaseReportWidget } from './AiSmartPurchaseReportWidget';

interface AiMunshiHubProps {
  currentRole: UserRole;
  companyProfile?: CompanyProfile | null;
  onRefreshData: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  summary?: BusinessSummary | null;
}

interface ExecutedAction {
  id: string;
  type: 'inventory' | 'order' | 'payment' | 'expense' | 'profit' | 'general';
  title: string;
  details: string;
  timestamp: string;
  success: boolean;
  meta?: any;
}

interface ChatReportAttachment {
  type: 'restaurant' | 'business';
  title: string;
  restaurantName?: string;
  downloadUrl: string;
  viewUrl?: string;
  fileName: string;
  summary?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  report?: ChatReportAttachment;
  executedActions?: ExecutedAction[];
  billAttachment?: SaleBill | null;
  purchaseBillAttachment?: PurchaseBill | null;
  purchaseReportData?: {
    summary: any;
    bills: PurchaseBill[];
  } | null;
  saleReportData?: {
    summary: any;
    bills: SaleBill[];
  } | null;
  profitReportData?: {
    summary: any;
    profitData: ComprehensiveProfitReport;
    initialTab?: 'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman';
  } | null;
  stockHistoryData?: {
    summary: any;
    stockData: StockMovementReport;
  } | null;
  reportTab?: string;
}

const InlineChatProfitReport: React.FC<{
  profitData: ComprehensiveProfitReport;
  initialTab?: 'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman';
  onSelectBill: (bill: SaleBill) => void;
}> = ({ profitData, initialTab = 'perItem', onSelectBill }) => {
  const [tab, setTab] = useState<'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman'>(initialTab);
  const sum = profitData.summary;

  return (
    <div className="mt-3.5 bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg text-xs">
      {/* Top Header & Tabs */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-xs">Profit Intelligence (نفع کی رپورٹ)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
            {sum.overallMarginPct}% Margin
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            type="button"
            onClick={() => setTab('perItem')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              tab === 'perItem' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            📦 Per Item
          </button>
          <button
            type="button"
            onClick={() => setTab('perBill')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              tab === 'perBill' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            📄 Per Bill
          </button>
          <button
            type="button"
            onClick={() => setTab('perRestaurant')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              tab === 'perRestaurant' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Restaurant
          </button>
          <button
            type="button"
            onClick={() => setTab('perSalesman')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              tab === 'perSalesman' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            👤 Salesman
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px]">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Sales Volume</span>
          <span className="font-mono font-bold text-white">{currencySymbol()} {(sum.totalSalesVolume || 0).toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Cost of Goods</span>
          <span className="font-mono font-bold text-amber-300">{currencySymbol()} {(sum.totalCostOfGoods || 0).toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Gross Profit</span>
          <span className="font-mono font-bold text-sky-400">{currencySymbol()} {(sum.totalGrossProfit || 0).toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Net Realized Profit</span>
          <span className={`font-mono font-black ${(sum.totalNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currencySymbol()} {(sum.totalNetProfit || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tab Tables */}
      <div className="max-h-72 overflow-y-auto overflow-x-auto">
        {tab === 'perBill' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-2.5">Bill #</th>
                <th className="py-2 px-2.5">Date</th>
                <th className="py-2 px-2.5">Customer / Restaurant</th>
                <th className="py-2 px-2.5 text-right">Billed</th>
                <th className="py-2 px-2.5 text-right">Cost</th>
                <th className="py-2 px-2.5 text-right">Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
                <th className="py-2 px-2.5 text-center">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(profitData.billWise || []).map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-2.5 font-mono font-bold text-sky-400">{b.billNumber}</td>
                  <td className="py-1.5 px-2.5 text-slate-400 text-[11px] whitespace-nowrap">{b.date}</td>
                  <td className="py-1.5 px-2.5 font-semibold text-white truncate max-w-[130px]">{b.customerName}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-200">{currencySymbol()} {b.netSaleAmount.toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">{currencySymbol()} {b.costOfGoods.toLocaleString()}</td>
                  <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${b.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencySymbol()} {b.netProfit.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">{b.marginPct}%</td>
                  <td className="py-1.5 px-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectBill(b.saleBill)}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                    >
                      👁️ View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'perItem' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-2.5">Item Description</th>
                <th className="py-2 px-2.5 text-right">Cartons</th>
                <th className="py-2 px-2.5 text-right">Units</th>
                <th className="py-2 px-2.5 text-right">Sale Vol</th>
                <th className="py-2 px-2.5 text-right">Cost</th>
                <th className="py-2 px-2.5 text-right">Gross Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(profitData.itemWise || []).map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-2.5 font-bold text-white">{it.itemTitle}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">{it.totalCtn}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">{it.totalQty}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-200">{currencySymbol()} {it.totalSaleAmount.toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">{currencySymbol()} {it.totalCostOfGoods.toLocaleString()}</td>
                  <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${it.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencySymbol()} {it.grossProfit.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">{it.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'perRestaurant' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-2.5">Customer / Restaurant</th>
                <th className="py-2 px-2.5 text-center">Bills</th>
                <th className="py-2 px-2.5 text-right">Total Billed</th>
                <th className="py-2 px-2.5 text-right">Cost</th>
                <th className="py-2 px-2.5 text-right">Net Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(profitData.restaurantWise || []).map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-2.5 font-bold text-white">{r.customerName}</td>
                  <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{r.billsCount}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-200">{currencySymbol()} {r.totalSalesVolume.toLocaleString()}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">{currencySymbol()} {r.totalCostOfGoods.toLocaleString()}</td>
                  <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${r.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencySymbol()} {r.netProfit.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">{r.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'perSalesman' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-2.5">Salesman / Agent</th>
                <th className="py-2 px-2.5 text-center">Bills</th>
                <th className="py-2 px-2.5 text-right">Sales Turnover</th>
                <th className="py-2 px-2.5 text-right">Net Profit</th>
                <th className="py-2 px-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(profitData.salesmanWise || []).map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-2.5 font-bold text-white">{s.salesmanName}</td>
                  <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{s.billsCount}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-200">{currencySymbol()} {s.totalSalesVolume.toLocaleString()}</td>
                  <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${s.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencySymbol()} {s.netProfit.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-300">{s.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  text: `Assalam-o-Alaikum! Main aapka AI Financial & Reports Munshi hoon.
Aap mujh se tamam official ERP reports aur customer bills foran nikalwa sakty hain:

1. 📦 Purchase Report (خریداری رپورٹ)
2. 💰 Sale Report (سیل رپورٹ)
3. 📈 Profit Intelligence (نفع کی رپورٹ)
4. ☸ Stock Movement History (اسٹاک کھاتہ)
5. 🛡️ Master Business Audit Report (ماسٹر آڈٹ رپورٹ)
6. 📄 Customer Sale Bill (کسی بھی گاہک کا نام لے کر بل دیکھیں)

Aap kisi bhi customer ka naam bol kar unka bill mangen (e.g. "Al Madina ka bill dikhao" ya "Hannan ka bill"), ya koi bhi report mangen, main foran verified data aur printable bill provide karunga!`,
};

export const AiMunshiHub: React.FC<AiMunshiHubProps> = ({
  currentRole,
  companyProfile,
  onRefreshData,
  onNavigateTab,
  summary,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedBillForReceiptModal, setSelectedBillForReceiptModal] = useState<SaleBill | null>(null);
  const [selectedPurchaseBillModal, setSelectedPurchaseBillModal] = useState<PurchaseBill | null>(null);
  const [isMasterAuditModalOpen, setIsMasterAuditModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ai_munshi_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved chat history:', e);
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  // Save chat to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai_munshi_chat_history', JSON.stringify(chatLog));
    } catch (e) {
      console.warn('Failed to persist chat history:', e);
    }
  }, [chatLog]);

  const handleClearChat = () => {
    setChatLog([DEFAULT_WELCOME_MESSAGE]);
    try {
      localStorage.removeItem('ai_munshi_chat_history');
    } catch (e) {}
  };

  // Voice recording state (Continuous, Never-Stops until user clicks stop)
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'ur-PK' | 'en-US'>('ur-PK'); // Urdu default, or English/Roman Urdu
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');
  const inputTextRef = useRef<string>('');

  // Keep inputTextRef synced
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isProcessing]);

  // Initialize Continuous Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = voiceLang;

    recognition.onresult = (event: any) => {
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript + ' ';
      }
      const prefix = baseTextRef.current ? baseTextRef.current.trim() + ' ' : '';
      const combined = (prefix + sessionTranscript).trim();
      setInputText(combined);
      inputTextRef.current = combined;
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      // If user hasn't explicitly stopped, keep listening continuously
      if (isRecordingRef.current) {
        try {
          baseTextRef.current = inputTextRef.current;
          recognition.start();
        } catch (e) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (err) {}
            }
          }, 200);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [voiceLang]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      // User manually stopped
      isRecordingRef.current = false;
      setIsRecording(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      // User started speaking: PRESERVE previous text, NEVER clear!
      isRecordingRef.current = true;
      baseTextRef.current = inputText;
      inputTextRef.current = inputText;
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (isRecordingRef.current) recognitionRef.current.start();
          }, 150);
        } catch (err) {}
      }
    }
  };

  // Process User Command
  const handleSendMessage = async (customText?: string) => {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    }

    const query = (customText || inputText).trim();
    if (!query && !selectedImage) return;

    const userMessageText = query || (selectedImage ? '[Receipt Image Uploaded]' : '');
    setInputText('');
    baseTextRef.current = '';
    inputTextRef.current = '';

    // Add user message to chat
    setChatLog((prev) => [...prev, { role: 'user', text: userMessageText }]);
    setIsProcessing(true);

    try {
      if (selectedImage) {
        // If image attached, run OCR first
        setIsOcrProcessing(true);
        const ocrResult = await api.parseDocumentImage(selectedImage, 'image/jpeg', 'general');
        setIsOcrProcessing(false);
        setSelectedImage(null);

        // Feed OCR result directly to AI
        const prompt = `User uploaded a receipt document. Extracted data:
Entity/Restaurant: ${ocrResult.supplierName || ocrResult.restaurantName || 'Wholesale Supplier'}
Category: ${ocrResult.documentType}
Items: ${JSON.stringify(ocrResult.items)}
Total Amount: ${currencySymbol()} ${ocrResult.totalAmount || 0}
User Note: ${query}

Please process this into the database (create inventory, record order, or expense as appropriate) and report the exact financial impact.`;

        const aiResponse = await api.sendAiChat(
          [{ role: 'user', content: prompt }],
          {
            userRole: currentRole,
            userName: `Staff (${currentRole})`,
            userId: 'user-1',
            source: 'ai_chat',
          }
        );

        await onRefreshData();

        const reportTool = aiResponse.executedTools?.find(
          (t) => t.name === 'generate_restaurant_report' || t.name === 'generate_business_report'
        );
        let reportAttachment: ChatReportAttachment | undefined = undefined;

        if (reportTool && reportTool.result) {
          const isBusiness = reportTool.name === 'generate_business_report';
          reportAttachment = {
            type: isBusiness ? 'business' : 'restaurant',
            title: isBusiness
              ? 'Master Business Profit & Loss Audit Report'
              : `Statement of Account: ${reportTool.result.restaurantName || 'Restaurant'}`,
            restaurantName: reportTool.result.restaurantName,
            downloadUrl: reportTool.result.downloadUrl || (isBusiness ? '/api/reports/download?type=business' : `/api/reports/download?type=restaurant&id=${reportTool.args?.restaurantNameOrId}`),
            viewUrl: reportTool.result.viewUrl,
            fileName: reportTool.result.fileName || (isBusiness ? 'Master_Business_Profit_Audit.html' : 'Statement_Of_Account.html'),
            summary: reportTool.result.summary,
          };
        }

        setChatLog((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: aiResponse.reply,
            report: reportAttachment,
          },
        ]);
      } else {
        // Standard text/voice query
        const messagesPayload = chatLog.map((m) => ({
          role: m.role,
          content: m.text,
        }));
        messagesPayload.push({ role: 'user', content: query });

        const aiResponse = await api.sendAiChat(messagesPayload, {
          userRole: currentRole,
          userName: `Staff (${currentRole})`,
          userId: 'user-1',
          source: isRecording ? 'voice' : 'ai_chat',
        });

        await onRefreshData();

        const reportTool = aiResponse.executedTools?.find(
          (t) => t.result && (t.result.downloadUrl || t.result.reportType || t.name.includes('report') || t.name === 'generate_restaurant_report' || t.name === 'generate_business_report')
        );
        let reportAttachment: ChatReportAttachment | undefined = undefined;

        if (reportTool && reportTool.result && reportTool.result.downloadUrl) {
          reportAttachment = {
            type: reportTool.result.reportType || 'business',
            title: reportTool.result.title || (reportTool.name === 'generate_business_report' ? 'Master Business Profit & Loss Audit Report' : 'Verified Financial Report'),
            restaurantName: reportTool.result.restaurantName,
            downloadUrl: reportTool.result.downloadUrl,
            viewUrl: reportTool.result.viewUrl || reportTool.result.downloadUrl,
            fileName: reportTool.result.fileName || 'Report_Document.html',
            summary: reportTool.result.summary,
          };
        } else if (aiResponse.reply.includes('/api/reports/download') || aiResponse.reply.toLowerCase().includes('download k liye tayar')) {
          const isBusiness = aiResponse.reply.includes('type=business') || aiResponse.reply.toLowerCase().includes('master');
          reportAttachment = {
            type: isBusiness ? 'business' : 'restaurant',
            title: isBusiness ? 'Master Business Profit & Loss Audit Report' : 'Restaurant Statement of Account',
            downloadUrl: isBusiness ? '/api/reports/download?type=business&format=html' : '/api/reports/download?format=html',
            viewUrl: isBusiness ? '/api/reports/business' : undefined,
            fileName: isBusiness ? 'Master_Business_Profit_Audit.html' : 'Statement_Of_Account.html',
          };
        }

        // 1. Purchase Bill (Supplier Voucher) - opens when user specifically asks for a bill
        const purchaseBillTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_supplier_purchase_bill' || (t.result?.reportType === 'purchaseBill' && t.result?.purchaseBill)
        );
        const purchaseBillAttachment: PurchaseBill | null = purchaseBillTool?.result?.purchaseBill || null;
        if (purchaseBillAttachment) {
          setSelectedPurchaseBillModal(purchaseBillAttachment);
        }

        // 2. Customer Sale Bill
        const billTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_customer_sale_bill' && t.result?.bill
        );
        const billAttachment: SaleBill | null = billTool?.result?.bill || null;
        if (billAttachment) {
          setSelectedBillForReceiptModal(billAttachment);
        }

        // 3. Purchase Report Data (Interactive Multi-Supplier Hub)
        const purchaseReportTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_purchase_report' || t.result?.reportType === 'purchases'
        );
        let purchaseReportData: { summary: any; bills: PurchaseBill[] } | null = null;
        if (purchaseReportTool?.result?.bills && Array.isArray(purchaseReportTool.result.bills)) {
          purchaseReportData = {
            summary: purchaseReportTool.result.summary,
            bills: purchaseReportTool.result.bills,
          };
        }

        // 4. Sale Report Data
        const saleReportTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_sale_report' || t.result?.reportType === 'sales'
        );
        let saleReportData: { summary: any; bills: SaleBill[] } | null = null;
        if (saleReportTool?.result?.bills && Array.isArray(saleReportTool.result.bills)) {
          saleReportData = {
            summary: saleReportTool.result.summary,
            bills: saleReportTool.result.bills,
          };
        }

        // 5. Profit Intelligence Report Data
        const profitReportTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_profit_report' || t.result?.reportType === 'profit'
        );
        let profitReportData: { summary: any; profitData: ComprehensiveProfitReport; initialTab?: 'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman' } | null = null;
        if (profitReportTool?.result?.profitData) {
          profitReportData = {
            summary: profitReportTool.result.summary,
            profitData: profitReportTool.result.profitData,
            initialTab: profitReportTool.result.initialTab || 'perItem',
          };
        }

        // 6. Stock History Report Data
        const stockHistoryTool = aiResponse.executedTools?.find(
          (t) => t.name === 'get_stock_history_report' || t.result?.reportType === 'stockHistory'
        );
        let stockHistoryData: { summary: any; stockData: StockMovementReport } | null = null;
        if (stockHistoryTool?.result?.stockData) {
          stockHistoryData = {
            summary: stockHistoryTool.result.summary,
            stockData: stockHistoryTool.result.stockData,
          };
        }

        const reportTab = (!purchaseReportData && !saleReportData && !profitReportData && !stockHistoryData) ? reportTool?.result?.tab : undefined;

        setChatLog((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: aiResponse.reply,
            report: reportAttachment,
            billAttachment,
            purchaseBillAttachment,
            purchaseReportData,
            saleReportData,
            profitReportData,
            stockHistoryData,
            reportTab,
          },
        ]);
      }
    } catch (err: any) {
      console.error('AI Munshi error:', err);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error processing request: ${err.message || 'Please check backend connection.'}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
      setSelectedImage(null);
    }
  };

  // Handle Image Selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Quick Action Buttons - Matching Image 5 Reports & Customer Bill
  const quickActions = [
    {
      label: '📦 Purchase Report',
      prompt: 'Purchase report aur khareed details do',
    },
    {
      label: '💰 Sale Report',
      prompt: 'Sale report aur farokht details do',
    },
    {
      label: '📈 Profit Intelligence',
      prompt: 'Profit intelligence aur munafa report do',
    },
    {
      label: '☸ Stock Movement History',
      prompt: 'Stock movement history aur ledger report do',
    },
    {
      label: '🛡️ Master Audit Report',
      prompt: 'Master business audit report do',
    },
    {
      label: '📄 Customer Sale Bill',
      prompt: 'Al Madina ka sale bill dikhao',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                AI Munshi & Intelligent Accountant
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                ACTIVE AI ENGINE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Automates real inventory intake, stock verification, restaurant khata & udhaar, per-restaurant P&L, and downloadable financial reports.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <a
            href="/api/reports/download?type=business&format=html"
            download="Master_Business_Profit_Audit.html"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Master Audit (.html)
          </a>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('profit')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 transition"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Profit Intelligence
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(action.prompt)}
            disabled={isProcessing}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main Conversation & Execution Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex flex-col h-[560px] overflow-hidden">
        {/* Chat Control Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Chat Session (Saved automatically across tabs)</span>
          </div>
          <button
            onClick={handleClearChat}
            className="text-xs text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer font-bold shadow-xs"
            title="Clear entire chat history (چیٹ صاف کریں)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Chat (چیٹ صاف کریں)</span>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatLog.map((msg, index) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={index}
                className={`flex gap-3.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant && (
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                <div
                  className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    isAssistant
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                      : 'bg-indigo-600 text-white font-medium'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{adaptCurrencyText(msg.text)}</div>

                  {/* Render Downloadable Report Card if report was generated */}
                  {msg.report && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-emerald-500/30 shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {msg.report.type === 'business' ? (
                              <FileSpreadsheet className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">
                              {msg.report.title}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              {msg.report.fileName} &bull; Formatted for Word (.doc) & Print
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Document Ready
                        </span>
                      </div>

                      {msg.report.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                          <div className="p-2 rounded-lg bg-slate-950/60">
                            <span className="text-[10px] text-slate-400 block">
                              {msg.report.type === 'business' ? 'Total Turnover' : 'Total Billed'}
                            </span>
                            <span className="font-bold text-white">
                              {currencySymbol()} {(msg.report.summary.totalRevenue ?? msg.report.summary.totalBilled ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/60">
                            <span className="text-[10px] text-slate-400 block">
                              {msg.report.type === 'business' ? 'Total Expenses' : 'Total Paid'}
                            </span>
                            <span className="font-bold text-emerald-400">
                              {currencySymbol()} {(msg.report.summary.totalExpenses ?? msg.report.summary.totalPaid ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/60">
                            <span className="text-[10px] text-slate-400 block">
                              {msg.report.type === 'business' ? 'Market Udhaar' : 'Baaqi Udhaar'}
                            </span>
                            <span className="font-bold text-amber-400">
                              {currencySymbol()} {(msg.report.summary.totalOutstandingReceivables ?? msg.report.summary.balanceDue ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950/60">
                            <span className="text-[10px] text-slate-400 block">Net Profit / Loss</span>
                            <span className={`font-black ${(msg.report.summary.netProfitOrLoss ?? msg.report.summary.netProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {currencySymbol()} {Math.abs(msg.report.summary.netProfitOrLoss ?? msg.report.summary.netProfit ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setIsMasterAuditModalOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>👁️ View &amp; Print Master Audit (ماسٹر آڈٹ کھولیں)</span>
                        </button>
                        <a
                          href={msg.report.downloadUrl.replace('format=doc', 'format=html')}
                          download={msg.report.fileName.replace(/\.doc$/, '.html')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Report (.html)
                        </a>
                      </div>
                    </div>
                  )}

                  {/* 1. Supplier Purchase Bill Attachment Card */}
                  {msg.purchaseBillAttachment && (
                    <div className="mt-3.5 p-4 rounded-xl bg-slate-900 border border-amber-500/40 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-700/60">
                          Purchase Bill Voucher #{msg.purchaseBillAttachment.billNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{msg.purchaseBillAttachment.date}</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Supplier:</span>
                          <span className="text-sm text-amber-200">{msg.purchaseBillAttachment.supplierAccountTitle}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">Total Amount:</span>
                          <span className="text-emerald-400 font-mono text-base font-extrabold">
                            {currencySymbol()} {(msg.purchaseBillAttachment.netTotal || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {msg.purchaseBillAttachment.items && msg.purchaseBillAttachment.items.length > 0 && (
                        <div className="text-xs text-slate-300 divide-y divide-slate-800 bg-slate-950/70 p-2.5 rounded-lg max-h-36 overflow-y-auto">
                          {msg.purchaseBillAttachment.items.map((it: any, idx: number) => (
                            <div key={idx} className="py-1 flex justify-between items-center text-[11px]">
                              <span>{it.itemTitle} ({it.ctn ? `${it.ctn} CTN / ` : ''}{it.qty} {it.unit || 'Units'})</span>
                              <span className="font-mono font-semibold">{currencySymbol()} {it.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-3 text-slate-400">
                          <span>Paid: <strong className="text-emerald-400 font-mono">{currencySymbol()} {(msg.purchaseBillAttachment.paidAmount || 0).toLocaleString()}</strong></span>
                          <span>Remaining: <strong className="text-amber-400 font-mono">{currencySymbol()} {(msg.purchaseBillAttachment.remainingBalance || 0).toLocaleString()}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseBillModal(msg.purchaseBillAttachment || null)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>👁️ View &amp; Print Purchase Voucher (واؤچر دیکھیں / پرنٹ کریں)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Customer Sale Bill Attachment Card */}
                  {msg.billAttachment && (
                    <div className="mt-3.5 p-4 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800">
                          Sale Bill / Tax Invoice #{msg.billAttachment.billNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{msg.billAttachment.date}</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Customer:</span>
                          <span className="text-sm text-cyan-200">{msg.billAttachment.customerAccountTitle || msg.billAttachment.customerName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">Total Amount:</span>
                          <span className="text-emerald-400 font-mono text-base font-extrabold">
                            {currencySymbol()} {(msg.billAttachment.netTotal || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {msg.billAttachment.items && msg.billAttachment.items.length > 0 && (
                        <div className="text-xs text-slate-300 divide-y divide-slate-800 bg-slate-950/70 p-2.5 rounded-lg max-h-36 overflow-y-auto">
                          {msg.billAttachment.items.map((it: any, idx: number) => (
                            <div key={idx} className="py-1 flex justify-between items-center text-[11px]">
                              <span>{it.itemTitle} ({it.ctn ? `${it.ctn} CTN / ` : ''}{it.qty} {it.unit || 'Units'})</span>
                              <span className="font-mono font-semibold">{currencySymbol()} {it.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-400">
                          Balance Due: <strong className="text-amber-400 font-mono">{currencySymbol()} {(msg.billAttachment.balanceReceivable || msg.billAttachment.balanceDue || 0).toLocaleString()}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedBillForReceiptModal(msg.billAttachment || null)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>👁️ View &amp; Print Tax Invoice (بل دیکھیں / پرنٹ کریں)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. AI Smart Multi-Supplier Purchase & Invoice Hub */}
                  {msg.purchaseReportData && msg.purchaseReportData.bills && (
                    <AiSmartPurchaseReportWidget
                      data={msg.purchaseReportData}
                      companyName={companyProfile?.name}
                      onOpenVoucher={(b) => setSelectedPurchaseBillModal(b)}
                    />
                  )}

                  {/* 4. Sale Report Table */}
                  {msg.saleReportData && msg.saleReportData.bills && (
                    <div className="mt-3.5 bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg text-xs">
                      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-white text-xs">Sale Report (فروخت رپورٹ)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-semibold">
                            {msg.saleReportData.bills.length} Bills
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Total Net: <strong className="text-emerald-400 font-mono">{currencySymbol()} {(msg.saleReportData.summary?.totalNetSales || 0).toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-2.5">Bill #</th>
                              <th className="py-2 px-2.5">Date</th>
                              <th className="py-2 px-2.5">Customer</th>
                              <th className="py-2 px-2.5">Salesman</th>
                              <th className="py-2 px-2.5 text-right">Cartons</th>
                              <th className="py-2 px-2.5 text-right">Qty</th>
                              <th className="py-2 px-2.5 text-right">Net Total</th>
                              <th className="py-2 px-2.5 text-right">Cash Received</th>
                              <th className="py-2 px-2.5 text-right">Balance Due</th>
                              <th className="py-2 px-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {msg.saleReportData.bills.map((b: SaleBill, idx: number) => (
                              <tr
                                key={idx}
                                onClick={() => setSelectedBillForReceiptModal(b)}
                                className="hover:bg-slate-800/50 cursor-pointer transition"
                              >
                                <td className="py-2 px-2.5 font-mono font-bold text-cyan-400">{b.billNumber}</td>
                                <td className="py-2 px-2.5 text-slate-300 text-[11px] whitespace-nowrap">{b.date}</td>
                                <td className="py-2 px-2.5 font-semibold text-white truncate max-w-[130px]">{b.customerAccountTitle}</td>
                                <td className="py-2 px-2.5 text-slate-300 text-[11px]">{b.salesmanName || b.user || 'Admin'}</td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-300">{b.totalCtn || 0}</td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-400">{b.totalQty || 0}</td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">
                                  {currencySymbol()} {(b.netTotal || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                                  {currencySymbol()} {(b.cashReceived || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-semibold text-amber-400">
                                  {currencySymbol()} {(b.balanceReceivable || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBillForReceiptModal(b);
                                    }}
                                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold transition shadow-xs cursor-pointer"
                                  >
                                    View Invoice
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 5. Profit Intelligence Report with 4 Tabs & Invoices */}
                  {msg.profitReportData && msg.profitReportData.profitData && (
                    <InlineChatProfitReport
                      profitData={msg.profitReportData.profitData}
                      initialTab={msg.profitReportData.initialTab}
                      onSelectBill={(b) => setSelectedBillForReceiptModal(b)}
                    />
                  )}

                  {/* 6. Stock Movement History Table */}
                  {msg.stockHistoryData && msg.stockHistoryData.stockData && (
                    <div className="mt-3.5 bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg text-xs">
                      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold text-white text-xs">Stock Movement History (اسٹاک کھاتہ)</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Warehouse Stock Value: <strong className="text-emerald-400 font-mono">{currencySymbol()} {(msg.stockHistoryData.stockData.totalStockValue || 0).toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-2.5">Date / Time</th>
                              <th className="py-2 px-2.5">Product Item</th>
                              <th className="py-2 px-2.5 text-center">Movement</th>
                              <th className="py-2 px-2.5 text-right">Cartons</th>
                              <th className="py-2 px-2.5 text-right">Units</th>
                              <th className="py-2 px-2.5 text-right">Rate</th>
                              <th className="py-2 px-2.5">Ref / Bill #</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(msg.stockHistoryData.stockData.ledgerTransactions || []).map((t: any, idx: number) => {
                              const isPurchase = t.movementType === 'PURCHASE';
                              const isSale = t.movementType === 'SALE';
                              return (
                                <tr key={idx} className="hover:bg-slate-800/40">
                                  <td className="py-2 px-2.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">{t.timestamp || t.date}</td>
                                  <td className="py-2 px-2.5 font-bold text-white">{t.productName || t.itemTitle}</td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isPurchase ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : isSale ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {t.movementType}
                                    </span>
                                  </td>
                                  <td className={`py-2 px-2.5 text-right font-mono font-bold ${isPurchase ? 'text-emerald-400' : isSale ? 'text-rose-400' : 'text-slate-300'}`}>
                                    {isPurchase ? `+${t.cartonsChange}` : `${t.cartonsChange}`}
                                  </td>
                                  <td className={`py-2 px-2.5 text-right font-mono font-bold ${isPurchase ? 'text-emerald-400' : isSale ? 'text-rose-400' : 'text-slate-300'}`}>
                                    {isPurchase ? `+${t.quantityChange}` : `${t.quantityChange}`}
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                                    {t.rate ? `${currencySymbol()} ${t.rate.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono text-slate-400 text-[11px]">
                                    {t.referenceBillNumber || t.notes || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {msg.reportTab && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {msg.reportTab === 'aiLedgerAudit' && (
                        <button
                          type="button"
                          onClick={() => setIsMasterAuditModalOpen(true)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>🛡️ View &amp; Print Master Audit (ماسٹر آڈٹ کھولیں)</span>
                        </button>
                      )}
                      <button
                        onClick={() => onNavigateTab?.('reports')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>📑 Open in Reports Tab (مکمل رپورٹ کھولیں)</span>
                      </button>
                    </div>
                  )}
                </div>
                {!isAssistant && (
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-3 text-slate-400 text-sm italic">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>AI Munshi is processing data and updating financial ledgers...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Attached image preview bar */}
        {selectedImage && (
          <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <ImageIcon className="w-4 h-4" />
              <span>Receipt image attached and ready for AI OCR processing</span>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Continuous Voice Recording Banner */}
        {isRecording && (
          <div className="px-4 py-2 bg-red-950/90 border-t border-red-800/80 flex items-center justify-between text-xs text-red-200 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="font-bold text-red-100">
                🎙️ Mic Continuous Active: Aap baghair ruke poora order ya kharcha bolein, ye band nahi hoga!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-red-300">Zaban: {voiceLang === 'ur-PK' ? 'اردو' : 'Roman/English'}</span>
              <button
                type="button"
                onClick={toggleRecording}
                className="px-2.5 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer"
              >
                Stop Mic
              </button>
            </div>
          </div>
        )}

        {/* Input Bar with Voice, Image, and Text */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Receipt Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Receipt or Bill Image"
              className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition"
            >
              <Camera className="w-5 h-5 text-indigo-400" />
            </button>

            {/* Voice Microphone Button */}
            {speechRecognitionSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                title={isRecording ? 'Stop Recording' : 'Continuous Voice Order (Click to speak)'}
                className={`p-3 rounded-xl border transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse border-red-500 shadow-lg ring-2 ring-red-400/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border-emerald-900/60'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
                <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Voice'}</span>
              </button>
            )}

            {/* Language Switcher for Voice */}
            {speechRecognitionSupported && (
              <button
                type="button"
                onClick={() => setVoiceLang((prev) => (prev === 'ur-PK' ? 'en-US' : 'ur-PK'))}
                title="Switch voice recognition between Urdu script and Roman Urdu / English"
                className="px-2.5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-[11px] font-semibold transition shrink-0 cursor-pointer"
              >
                {voiceLang === 'ur-PK' ? 'اردو' : 'Roman'}
              </button>
            )}

            {/* Main Text Input with Clear Button */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  inputTextRef.current = e.target.value;
                }}
                placeholder={
                  isRecording
                    ? '🎙️ Sun raha hoon... Aap bolte rahein (yeh band nahi hoga)...'
                    : `Bolein ya likhein: "Spice Grill ko 20kg chicken...", "${currencySymbol()} 600 petrol kharcha..."`
                }
                disabled={isProcessing}
                className={`w-full bg-slate-900 border rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-400 focus:outline-none transition ${
                  isRecording
                    ? 'border-red-500 ring-2 ring-red-500/20 bg-slate-900/90'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    baseTextRef.current = '';
                    inputTextRef.current = '';
                  }}
                  title="Clear text"
                  className="absolute right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isProcessing || (!inputText.trim() && !selectedImage)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {selectedBillForReceiptModal && (
        <SalesBillReceiptModal
          bill={selectedBillForReceiptModal}
          companyProfile={companyProfile}
          onClose={() => setSelectedBillForReceiptModal(null)}
        />
      )}

      {selectedPurchaseBillModal && (
        <PurchaseBillVoucherModal
          bill={selectedPurchaseBillModal}
          companyProfile={companyProfile}
          onClose={() => setSelectedPurchaseBillModal(null)}
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
