import React, { useState, useRef, useEffect } from 'react';
import { Printer, X, Share2, CheckCircle2, Receipt, Save } from 'lucide-react';
import { CompanyProfile, Customer, SaleBill } from '../types';
import { api } from '../services/api';

interface SalesBillReceiptModalProps {
  bill: SaleBill | null;
  companyProfile?: CompanyProfile | null;
  onClose: () => void;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const HUNDREDS = ['', 'ONE HUNDRED', 'TWO HUNDRED', 'THREE HUNDRED', 'FOUR HUNDRED', 'FIVE HUNDRED', 'SIX HUNDRED', 'SEVEN HUNDRED', 'EIGHT HUNDRED', 'NINE HUNDRED'];

const belowThousand = (n: number): string => {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(HUNDREDS[Math.floor(n / 100)]);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) parts.push(ONES[n]);
  return parts.join('-');
};

const intToWords = (num: number): string => {
  if (num <= 0) return 'ZERO';
  const chunks: { label: string; value: number }[] = [
    { label: 'TRILLION', value: 1_000_000_000_000 },
    { label: 'BILLION', value: 1_000_000_000 },
    { label: 'MILLION', value: 1_000_000 },
    { label: 'THOUSAND', value: 1_000 },
  ];
  let rest = num;
  const out: string[] = [];
  for (const c of chunks) {
    const q = Math.floor(rest / c.value);
    if (q > 0) {
      out.push(`${belowThousand(q)} ${c.label}`);
      rest -= q * c.value;
    }
  }
  if (rest > 0) out.push(belowThousand(rest));
  return out.join(' ');
};

const MINOR_UNITS: Record<string, string> = {
  AED: 'FILS', PKR: 'PAISA', INR: 'PAISE', USD: 'CENTS', EUR: 'CENTS', GBP: 'PENCE',
  SAR: 'HALALAS', QAR: 'DIRHAMS', KWD: 'FILLS', OMR: 'BAIZAS', BHD: 'FILLS',
};

const amountInWords = (amount: number, currency: string): string => {
  const cur = (currency || '').trim().toUpperCase();
  const abs = Math.abs(Number(amount) || 0);
  const whole = Math.floor(abs);
  const minor = Math.round((abs - whole) * 100);
  let text = `${cur} ${intToWords(whole)}`;
  if (minor > 0) text += ` AND ${intToWords(minor)} ${MINOR_UNITS[cur] || 'CENTS'}`;
  return `${text} ONLY`;
};

const formatInvoiceDate = (d: string): string => {
  if (!d) return '';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (ymd) {
    const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  }
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d);
  if (dmy) {
    const dt = new Date(Number(dmy[2]), Number(dmy[1]) - 1, Number(dmy[3]));
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  }
  return d;
};

const formatTime = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MetaRow: React.FC<{ label: string; ar: string; value: React.ReactNode; divider?: boolean }> = ({
  label,
  ar,
  value,
  divider = true,
}) => (
  <div
    className={`flex items-center gap-2 px-2.5 py-[7px] ${divider ? 'border-b border-slate-400' : ''}`}
  >
    <span className="font-bold text-slate-900 shrink-0 w-[92px]">{label}</span>
    <span className="flex-1 text-right font-black font-mono text-slate-900 pr-2">{value}</span>
    <span dir="rtl" className="shrink-0 w-[88px] text-right text-slate-700 font-semibold">{ar}</span>
  </div>
);

const TotalRow: React.FC<{
  label: string;
  ar: string;
  value: string;
  highlight?: boolean;
}> = ({ label, ar, value, highlight }) => (
  <div
    className={`flex items-center gap-2 px-2.5 py-[7px] border-b border-slate-400 last:border-b-0 ${
      highlight ? 'bg-[#eef4e6]' : ''
    }`}
  >
    <span className={`font-bold text-slate-900 shrink-0 ${highlight ? 'text-[12.5px]' : 'text-[11.5px]'}`}>
      {label}
    </span>
    <span dir="rtl" className="flex-1 text-right text-slate-700 font-semibold text-[11px]">{ar}</span>
    <span
      className={`shrink-0 w-[92px] text-right font-mono ${
        highlight ? 'font-black text-[15px] text-[#0f7b3f]' : 'font-bold text-slate-900 text-[12.5px]'
      }`}
    >
      {value}
    </span>
  </div>
);

export const SalesBillReceiptModal: React.FC<SalesBillReceiptModalProps> = ({
  bill,
  companyProfile,
  onClose,
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [custTrn, setCustTrn] = useState(bill?.customerTrn || '');
  const [custMobile, setCustMobile] = useState(bill?.customerMobile || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSavedMsg, setInfoSavedMsg] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Enrich the invoice with the customer's branch / contact person / email (same as reference sample)
  useEffect(() => {
    let alive = true;
    const id = bill?.customerId;
    const skip = !id || ['cash', 'card', 'walk-in', 'cust-1'].includes(id);
    if (!skip) {
      api
        .getCustomerById(id)
        .then((c) => {
          if (alive && c) setCustomer(c);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [bill?.id, bill?.customerId]);

  if (!bill) return null;

  const items = bill.items || [];

  // ---------------------------------------------------------------
  // Financials — mirrors the reference invoice:
  // Total Before VAT / Discount / VAT Total / Net Total + balance trio
  // ---------------------------------------------------------------
  const itemsGross = items.reduce(
    (sum, it) =>
      sum + Math.max(0, (Number(it.qty) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0)),
    0
  );
  const openingBalance = Number(bill.partyBalanceBefore) || 0;
  const grossAmount = Number(bill.grossAmount) || Number(itemsGross.toFixed(2));
  const billDiscount = Number(bill.billDiscountAmount) || 0;
  const totalBeforeVat = Number(Math.max(0, grossAmount - billDiscount).toFixed(2));
  const vatTotal = Number(bill.totalVatAmount) || 0;
  const netTotal = Number(bill.netTotal) || Number((totalBeforeVat + vatTotal).toFixed(2));
  const currentTotalBalance = Number((openingBalance + netTotal).toFixed(2));
  const cashPaid = Number(bill.cashReceived) || 0;
  const closingBalance = Number((currentTotalBalance - cashPaid).toFixed(2));
  const vatPercent = items.length > 0 ? Number(items[0].vatPercent ?? 5) : 5;

  // ---------------------------------------------------------------
  // Company letterhead (from registered profile only)
  // ---------------------------------------------------------------
  const companyName = companyProfile?.name || 'Wholesale Food Trading Co.';
  const legalLine = companyProfile?.tagline || companyProfile?.businessType || '';
  const companyPhone = companyProfile?.phone || '';
  const companyPhone2 = companyProfile?.phone2 || '';
  const phoneLine = [companyPhone, companyPhone2].filter(Boolean).join(', ');
  const companyAddress = companyProfile?.address || '';
  const companyCity = companyProfile?.city || '';
  const fullAddress = [companyAddress, companyCity].filter(Boolean).join(', ');
  const poBox = companyProfile?.poBox || '';
  const nameAr = companyProfile?.nameAr || companyName;
  const companyTrn = companyProfile?.trn || companyProfile?.ntn || '';
  const companyEmail = companyProfile?.email || '';
  const cur = (companyProfile?.currency || 'PKR').trim().toUpperCase();

  const bankAccountTitle = companyProfile?.bankAccountTitle || '';
  const bankName = companyProfile?.bankName || '';
  const bankAccountNo = companyProfile?.bankAccountNo || '';
  const iban = companyProfile?.iban || '';

  const nameWords = companyName.trim().split(/\s+/).filter(Boolean);
  const companyInitials =
    nameWords.length > 1
      ? `${nameWords[0][0]}${nameWords[nameWords.length - 1][0]}`.toUpperCase()
      : (nameWords[0]?.[0] || '').toUpperCase();

  const rawBillNo = (bill.billNumber || '').trim();
  const invoiceNo = /^[0-9]+$/.test(rawBillNo) && companyInitials
    ? `${companyInitials}-${rawBillNo}`
    : rawBillNo;

  const invoiceDate = formatInvoiceDate(bill.date);
  const invoiceTime = formatTime(bill.createdAt);
  const paymentTerms =
    bill.paymentType === 'Cash' ? 'Cash on Delivery' : bill.paymentType === 'Card' ? 'Card Payment' : 'Credit Account';
  const salesMan = bill.salesmanName || '—';
  const billUser = bill.user || '';

  const customerBranch = [customer?.area, customer?.city].filter(Boolean).join(', ');
  const customerContactPerson = customer?.contactPerson || '';
  const customerEmail = customer?.email || '';
  const customerContactNo = custMobile || customer?.mobile || '';
  const customerTrn = custTrn || customer?.trn || '';

  const totalInWords = amountInWords(netTotal, cur);
  const isThermal = printFormat === 'thermal';
  const twoCol = isThermal ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
  const headerGrid = isThermal ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[1fr_auto_1fr]';

  const handleSaveCustomerInfo = async () => {
    setIsSavingInfo(true);
    try {
      if (bill.customerId && bill.customerId !== 'cash' && bill.customerId !== 'walk-in') {
        await api.updateCustomer(bill.customerId, {
          trn: custTrn.trim(),
          mobile: custMobile.trim(),
        });
      }
      bill.customerTrn = custTrn.trim();
      bill.customerMobile = custMobile.trim();
      setInfoSavedMsg(true);
      setTimeout(() => setInfoSavedMsg(false), 2500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-modal');
    window.focus();
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-modal');
      }, 1000);
    }, 150);
  };

  const handleCopyWhatsApp = () => {
    const text = `*فاتورة ضريبية / TAX INVOICE #${invoiceNo}*
*${companyName}*
${fullAddress ? `${fullAddress}\n` : ''}${poBox ? `P.O. Box: ${poBox}\n` : ''}${phoneLine ? `Tel: ${phoneLine}\n` : ''}${companyTrn ? `TRN: ${companyTrn}\n` : ''}----------------------------------------
*Customer / العميل:* ${bill.customerAccountTitle}
${customerTrn ? `*Customer TRN / الرقم الضريبي:* ${customerTrn}\n` : ''}*Date / التاريخ:* ${invoiceDate} ${invoiceTime}
*L.P.O No / رقم أمر الشراء:* ${bill.lpoNo || '-'}
*Payment Terms / شروط الدفع:* ${paymentTerms}
*Sales Man / مندوب المبيعات:* ${salesMan}
${billUser ? `*User / المستخدم:* ${billUser}\n` : ''}----------------------------------------
*Items / الأصناف:*
${items
  .map(
    (it, idx) =>
      `${idx + 1}. ${it.itemTitle} — ${it.qty} @ ${money(it.rate)} = ${money(it.amount)} ${cur}`
  )
  .join('\n')}
----------------------------------------
*Total Before VAT / المجموع بدون الضريبة:* ${cur} ${money(totalBeforeVat)}
*Discount / الخصم:* ${cur} ${money(billDiscount)}
*VAT Total (${vatPercent}%) / مجموع الضريبة:* ${cur} ${money(vatTotal)}
*NET TOTAL / صافي المجموع:* *${cur} ${money(netTotal)}*
----------------------------------------
*Opening Balance / الرصيد الافتتاحي:* ${money(openingBalance)}
*Current Balance / الرصيد الحالي:* ${money(currentTotalBalance)}
*Closing Balance / الرصيد الإجمالي:* ${money(closingBalance)}
----------------------------------------
شكراً لتعاملكم معنا / Thank you for your business!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const fillerRows = Math.max(0, 8 - items.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Customer Sales Bill &amp; Tax Invoice / فاتورة ضريبية للعميل</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                  printFormat === 'a4' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Standard
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                  printFormat === 'thermal' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
            </div>

            {/* Copy for WhatsApp */}
            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="Copy formatted invoice for WhatsApp"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill (طباعة)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Details Verification Bar before Printing */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">Verify Customer Details for Bill:</span>
            <span className="text-white font-semibold font-mono">{bill.customerAccountTitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">TRN#:</span>
              <input
                type="text"
                placeholder="e.g. 100234567800003"
                value={custTrn}
                onChange={(e) => setCustTrn(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-mono w-40 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Mobile:</span>
              <input
                type="text"
                placeholder="e.g. 0501234567"
                value={custMobile}
                onChange={(e) => setCustMobile(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-mono w-32 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={isSavingInfo}
              onClick={handleSaveCustomerInfo}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingInfo ? 'Saving...' : 'Update & Apply'}</span>
            </button>

            {infoSavedMsg && (
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Updated!
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRINTABLE RECEIPT — layout mirrors the reference          */}
        {/* "Tax Invoice Slip" sample (A4)                            */}
        {/* ========================================================= */}
        <div
          id="printable-sales-receipt"
          ref={printRef}
          className={`p-4 sm:p-7 bg-white text-slate-900 mx-auto transition-all ${
            isThermal
              ? 'max-w-[380px] text-[11px] print:max-w-none print:w-[80mm] print:p-2'
              : 'max-w-3xl text-[11.5px] print:max-w-none print:w-full print:p-6'
          }`}
        >
          {/* ---------------- LETTERHEAD ---------------- */}
          <div className="pb-3 mb-3 border-b-2 border-slate-800">
            <div className={`grid ${headerGrid} gap-4 items-start`}>
              {/* Left — English block */}
              <div className="leading-snug text-slate-800">
                <h1 className="text-[24px] sm:text-[30px] font-black uppercase tracking-tight text-[#0f7b3f] leading-none">
                  {companyName}
                </h1>
                {legalLine && (
                  <div className="font-black text-slate-800 mt-1 text-[13px] uppercase leading-tight">{legalLine}</div>
                )}
                <div className="mt-1.5 space-y-0.5">
                  {phoneLine && (
                    <div>
                      <span className="font-black">Phone:</span> {phoneLine}
                    </div>
                  )}
                  {companyEmail && (
                    <div>
                      <span className="font-black">Email:</span> {companyEmail}
                    </div>
                  )}
                  {fullAddress && (
                    <div>
                      <span className="font-black">Address:</span> {fullAddress}
                    </div>
                  )}
                  {poBox && (
                    <div>
                      <span className="font-black">P.O. Box:</span> {poBox}
                    </div>
                  )}
                </div>
              </div>

              {/* Center — logo, TAX INVOICE badge, TRN */}
              <div className={`flex flex-col items-center gap-1 ${isThermal ? 'w-full mt-2' : ''}`}>
                {companyProfile?.logo ? (
                  <img src={companyProfile.logo} alt="" className="w-14 h-14 object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-[#0f7b3f] flex items-center justify-center">
                    <span className="text-[#0f7b3f] font-black text-lg tracking-tight">{companyInitials}</span>
                  </div>
                )}
                <div className="text-[#0f7b3f] font-black text-[12.5px] uppercase tracking-wide leading-tight text-center">
                  {companyName}
                </div>
                <div className="bg-[#0f7b3f] text-white font-black text-[13px] px-3.5 py-1 tracking-wider uppercase shadow-xs">
                  TAX INVOICE
                </div>
                <div className="font-black text-[17px] text-black font-mono tracking-wider mt-1 text-center">
                  TRN: {companyTrn || companyProfile?.trn || companyProfile?.ntn || companyProfile?.vatNumber || '100234567800003'}
                </div>
              </div>

              {/* Right — Arabic block */}
              {!isThermal && (
                <div className="leading-snug text-slate-800 text-right" dir="rtl">
                  <div className="text-[#0f7b3f] font-black text-[22px] leading-none">{nameAr}</div>
                  {legalLine && <div className="font-black mt-1 text-[12px] leading-tight">{legalLine}</div>}
                  <div className="mt-1.5 space-y-0.5">
                    {phoneLine && (
                      <div>
                        <span className="font-black">هاتف :</span> {phoneLine}
                      </div>
                    )}
                    {fullAddress && (
                      <div>
                        <span className="font-black">العنوان :</span> {fullAddress}
                      </div>
                    )}
                    {poBox && (
                      <div>
                        <span className="font-black">ص.ب :</span> {poBox}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- CUSTOMER + INVOICE META ---------------- */}
          <div className="border border-slate-400 mb-3">
            <div className={`grid ${twoCol}`}>
              {/* Customer pane */}
              <div className={`p-2.5 ${isThermal ? 'border-b border-slate-400' : 'sm:border-r border-slate-400'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-[12.5px]">Customer:</div>
                    <div className="font-black text-[14.5px] mt-0.5 leading-tight">{bill.customerAccountTitle}</div>
                    {customerBranch && <div className="mt-0.5">Branch / Area: {customerBranch}</div>}
                    {customerContactPerson && <div>Contact Person: {customerContactPerson}</div>}
                    {(customerContactNo || customerEmail) && (
                      <div>
                        Contact No: {customerContactNo || '—'}
                        {customerEmail ? ` | Email: ${customerEmail}` : ''}
                      </div>
                    )}
                  </div>
                  <div dir="rtl" className="shrink-0 text-slate-700 font-semibold">العميل</div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2" />

                <div className="flex items-center justify-between gap-3">
                  <div className="font-black">
                    Customer TRN:{' '}
                    <span className="font-mono font-bold">{customerTrn || '—'}</span>
                  </div>
                  <div dir="rtl" className="text-slate-700 font-semibold">الرقم الضريبي:</div>
                </div>
              </div>

              {/* Invoice meta pane */}
              <div>
                <MetaRow
                  label="Invoice Date"
                  ar="تاريخ الفاتورة"
                  value={`${invoiceDate}${invoiceTime ? ` | ${invoiceTime}` : ''}`}
                />
                <MetaRow label="Invoice No." ar="رقم الفاتورة" value={invoiceNo} />
                <MetaRow label="L.P.O No" ar="رقم أمر الشراء" value={bill.lpoNo || '—'} />
                <MetaRow label="Payment Terms" ar="شروط الدفع" value={paymentTerms} />
                <MetaRow label="Sales Man" ar="مندوب المبيعات" value={salesMan} divider={Boolean(billUser)} />
                {billUser && (
                  <MetaRow label="User / Cashier" ar="المستخدم" value={billUser} divider={false} />
                )}
              </div>
            </div>
          </div>

          {/* ---------------- LINE ITEMS ---------------- */}
          <div className="border border-slate-400 mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px] min-w-[560px]">
              <thead>
                <tr className="bg-[#f4efe1] text-slate-900 align-bottom">
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[40px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">الرقم</div>
                    <div className="font-black leading-tight">SL#</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 text-left">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">الوصف</div>
                    <div className="font-black leading-tight">Description</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[54px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">الوحدة</div>
                    <div className="font-black leading-tight">Unit</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[62px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">الكمية</div>
                    <div className="font-black leading-tight">Qty</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[78px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">سعر الوحدة</div>
                    <div className="font-black leading-tight">Unit Price</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[86px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">المجموع بدون ضريبة</div>
                    <div className="font-black leading-tight">Before VAT</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[54px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">الضريبة</div>
                    <div className="font-black leading-tight">VAT %</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[76px]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">قيمة الضريبة</div>
                    <div className="font-black leading-tight">VAT Amount</div>
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1.5 w-[86px] bg-[#f4efe1]">
                    <div dir="rtl" className="text-[10px] font-semibold leading-tight">صافي المجموع</div>
                    <div className="font-black leading-tight">Net Amount</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {items.map((it, idx) => {
                  const beforeVat = Math.max(
                    0,
                    Number(((Number(it.qty) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0)).toFixed(2))
                  );
                  const lineVat = Number(it.vatAmount) || 0;
                  const lineNet = Number((beforeVat + lineVat).toFixed(2));
                  const unit = (it.unit || 'PCS').toUpperCase();
                  return (
                    <tr key={it.id || idx} className="align-top">
                      <td className="border border-slate-400 px-1.5 py-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 font-black">{it.itemTitle}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-center">{unit}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-center font-black">{money(it.qty)}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">{money(it.rate)}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-black font-mono">
                        {money(beforeVat)}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-center font-mono">
                        {Number(it.vatPercent ?? 5)}%
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">{money(lineVat)}</td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-black font-mono bg-[#faf8f1]">
                        {money(lineNet)}
                      </td>
                    </tr>
                  );
                })}
                {Array.from({ length: fillerRows }).map((_, i) => (
                  <tr key={`filler-${i}`}>
                    <td className="border border-slate-400 h-[26px]" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400" />
                    <td className="border border-slate-400 bg-[#faf8f1]" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------------- WORDS + BALANCES + TOTALS ---------------- */}
          <div className={`grid ${twoCol} border border-slate-400 mb-3`}>
            {/* Left: amount in words + balance trio */}
            <div className={`p-2.5 ${isThermal ? 'border-b border-slate-400' : 'sm:border-r border-slate-400'}`}>
              <div className="text-[10.5px] text-slate-600">Total ({cur}) in Words:</div>
              <div className="font-black text-[12.5px] uppercase leading-snug mt-0.5">{totalInWords}</div>

              <div className="grid grid-cols-3 border border-slate-400 mt-2.5">
                <div className="text-center px-1 py-1 border-r border-slate-400">
                  <div className="font-black leading-tight">Opening Balance</div>
                  <div dir="rtl" className="text-[10px] text-slate-700 leading-tight">الرصيد الافتتاحي</div>
                </div>
                <div className="text-center px-1 py-1 border-r border-slate-400">
                  <div className="font-black leading-tight">Current Balance</div>
                  <div dir="rtl" className="text-[10px] text-slate-700 leading-tight">الرصيد الحالي</div>
                </div>
                <div className="text-center px-1 py-1">
                  <div className="font-black leading-tight">Closing Balance</div>
                  <div dir="rtl" className="text-[10px] text-slate-700 leading-tight">الرصيد الإجمالي</div>
                </div>
              </div>

              <div className="grid grid-cols-3 border border-slate-400 border-t-0">
                <div className="text-center px-1 py-1.5 border-r border-slate-400 font-black text-[12.5px] font-mono">
                  {money(openingBalance)}
                </div>
                <div className="text-center px-1 py-1.5 border-r border-slate-400 font-black text-[12.5px] font-mono text-[#0f7b3f]">
                  {money(currentTotalBalance)}
                </div>
                <div className="text-center px-1 py-1.5 font-black text-[12.5px] font-mono text-[#c1121f]">
                  {money(closingBalance)}
                </div>
              </div>
            </div>

            {/* Right: totals box */}
            <div className="bg-[#f7f3e7]">
              <TotalRow label="Total Before VAT" ar="المجموع بدون الضريبة" value={money(totalBeforeVat)} />
              <TotalRow label="Discount" ar="الخصم" value={money(billDiscount)} />
              <TotalRow label={`VAT Total (${vatPercent}%)`} ar="مجموع الضريبة" value={money(vatTotal)} />
              <TotalRow label={`Net Total (${cur})`} ar="صافي المجموع" value={money(netTotal)} highlight />
            </div>
          </div>

          {/* ---------------- BANK DETAILS + TERMS ---------------- */}
          <div className={`grid ${twoCol} border border-slate-400 mb-2`}>
            <div className={`p-2.5 ${isThermal ? 'border-b border-slate-400' : 'sm:border-r border-slate-400'}`}>
              <div className="font-black mb-1">Bank Details for Payment:</div>
              <div>
                <span className="font-black">A/C Name:</span> {bankAccountTitle || '—'}
              </div>
              <div>
                <span className="font-black">Bank Name:</span> {bankName || '—'}
              </div>
              <div>
                <span className="font-black">A/C Number:</span> {bankAccountNo || '—'}
              </div>
              <div>
                <span className="font-black">IBAN Number:</span> {iban || '—'}
              </div>
            </div>

            <div className="p-2.5">
              <div className="font-black mb-1">Terms and Conditions:</div>
              <ol className="list-decimal pl-4 space-y-0.5 leading-snug">
                <li>Once the goods are delivered to the customer (checked &amp; signed), no claim for damage will be entertained.</li>
                <li>Cash payment is valid only against our official computer receipt.</li>
                <li>No correction on invoice to be made. Debit/Credit Note will be issued separately.</li>
                <li>Goods once sold will be taken back or exchanged within 7 days only in good condition.</li>
              </ol>
            </div>
          </div>

          {/* ---------------- SIGNATURES ---------------- */}
          <div className="grid grid-cols-2 gap-6 sm:gap-10 pt-6 text-center">
            <div>
              <div className="border-t border-dotted border-slate-500 mb-1" />
              <span className="font-black text-[11.5px]">
                Customer Sign / Contact No. / <span dir="rtl">ختم المستلم</span>
              </span>
            </div>
            <div>
              <div className="border-t border-dotted border-slate-500 mb-1" />
              <span className="font-black text-[11.5px]">
                Sales Rep. Sign / <span dir="rtl">توقيع المندوب</span>
              </span>
            </div>
          </div>

          {/* ---------------- FOOTER ---------------- */}
          <div className="flex flex-wrap justify-between items-center gap-2 text-[10.5px] text-slate-500 mt-6 pt-2 border-t border-slate-200 print:mt-8">
            <span>
              {companyName}
              {companyTrn ? ` • TRN: ${companyTrn}` : ''}
            </span>
            <span>Computer Generated Tax Invoice Slip</span>
          </div>
        </div>
      </div>
    </div>
  );
};
