import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MessageCircle,
  Printer,
  Receipt,
  Search,
  Share2,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { currencySymbol } from '../utils/currency';
import { CustomerLedgerReport, SupplierLedgerReport, SaleBill } from '../types';

// =========================================================================
// 1. CUSTOMER LEDGER WIDGET (Shareable on WhatsApp & Printable)
// =========================================================================
export const CustomerLedgerWidget: React.FC<{
  ledger: CustomerLedgerReport;
  whatsappText?: string;
  onOpenSaleBill?: (bill: SaleBill) => void;
}> = ({ ledger, whatsappText, onOpenSaleBill }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const transactions = ledger.transactions || [];
  const filteredTx = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const q = searchTerm.toLowerCase();
    return transactions.filter(
      (t) =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.voucherNumber || '').toLowerCase().includes(q) ||
        (t.voucherType || '').toLowerCase().includes(q) ||
        (t.date || '').includes(q)
    );
  }, [transactions, searchTerm]);

  const closingBal = Number(ledger.closingBalance || 0);
  const isDebit = closingBal >= 0;

  const handleShareWhatsApp = () => {
    const phone = (ledger.phone || '').replace(/[^0-9]/g, '');
    let text = whatsappText;
    if (!text) {
      text =
        `*STATEMENT OF ACCOUNT / کھاتہ اسٹیٹمنٹ*\n` +
        `👤 *Customer:* ${ledger.customerName || ledger.accountTitle}\n` +
        `🏷️ *Code:* ${ledger.accountCode || '-'}\n` +
        `📞 *Mobile:* ${ledger.phone || '-'}\n` +
        `📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n` +
        `----------------------------------------\n` +
        `• Opening Balance: ${currencySymbol()} ${Number(ledger.openingBalance || 0).toLocaleString()}\n` +
        `• Total Debits (Sales): ${currencySymbol()} ${Number(ledger.totalDebit || 0).toLocaleString()}\n` +
        `• Total Credits (Receipts): ${currencySymbol()} ${Number(ledger.totalCredit || 0).toLocaleString()}\n` +
        `• *NET OUTSTANDING BALANCE: ${currencySymbol()} ${Math.abs(closingBal).toLocaleString()} ${isDebit ? 'DR (واجب الادا)' : 'CR (ایڈوانس)'}*\n` +
        `----------------------------------------\n` +
        `Baraye meherbani apna khata check farmayein. Shukriya!`;
    }

    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const printContent = document.getElementById(`customer-ledger-${ledger.customerId}`);
    if (!printContent) {
      window.print();
      return;
    }
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Customer Ledger - ${ledger.customerName || ledger.accountTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
              th { background: #f0f0f0; font-weight: bold; }
              .text-right { text-align: right; }
              .header { border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 15px; }
              .balance-box { background: #f9f9f9; padding: 10px; border: 1px solid #ddd; margin-top: 10px; font-size: 13px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Customer Khata Ledger Statement</h2>
              <div><strong>Customer:</strong> ${ledger.customerName || ledger.accountTitle} (${ledger.accountCode || '-'})</div>
              <div><strong>Mobile:</strong> ${ledger.phone || '-'} | <strong>Address:</strong> ${ledger.address || '-'}</div>
              <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div class="balance-box">
              Net Outstanding Balance: ${currencySymbol()} ${Math.abs(closingBal).toLocaleString()} ${isDebit ? 'DR (Receivable)' : 'CR (Advance)'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description / Voucher</th>
                  <th class="text-right">Debit (+)</th>
                  <th class="text-right">Credit (-)</th>
                  <th class="text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>-</td>
                  <td>OPENING</td>
                  <td>Opening Balance Prior to Statement</td>
                  <td class="text-right">-</td>
                  <td class="text-right">-</td>
                  <td class="text-right"><strong>${currencySymbol()} ${Number(ledger.openingBalance || 0).toLocaleString()}</strong></td>
                </tr>
                ${transactions
                  .map(
                    (t) => `
                  <tr>
                    <td>${t.date || '-'}</td>
                    <td>${t.voucherType || '-'}</td>
                    <td>${t.description || t.voucherNumber || '-'}</td>
                    <td class="text-right">${Number(t.debit) ? `${currencySymbol()} ${Number(t.debit).toLocaleString()}` : '-'}</td>
                    <td class="text-right">${Number(t.credit) ? `${currencySymbol()} ${Number(t.credit).toLocaleString()}` : '-'}</td>
                    <td class="text-right"><strong>${currencySymbol()} ${Number(t.balance || 0).toLocaleString()}</strong></td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 300);
    }
  };

  return (
    <div
      id={`customer-ledger-${ledger.customerId}`}
      className="p-3.5 bg-slate-900 border border-emerald-500/50 rounded-2xl space-y-3 text-xs w-full shadow-lg"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h4 className="font-extrabold text-sm text-white">
              {ledger.customerName || ledger.accountTitle}
            </h4>
            <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              #{ledger.accountCode || 'CUST'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            📞 {ledger.phone || 'No phone'} &bull; 📍 {ledger.address || ledger.city || 'UAE'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            title="Share Ledger Statement directly to Customer on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Send WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            title="Print Customer Ledger Statement"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Primary Outstanding Balance Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Opening Balance</span>
          <span className="font-mono font-bold text-slate-200 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.openingBalance || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Total Billed (Debits)</span>
          <span className="font-mono font-bold text-amber-300 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.totalDebit || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Total Recovered (Credits)</span>
          <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.totalCredit || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/60">
          <span className="text-emerald-300 block text-[10px] font-bold">صاف بقایا (NET BALANCE)</span>
          <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
            {currencySymbol()} {Math.abs(closingBal).toLocaleString()}{' '}
            <span className="text-[10px] font-bold">{isDebit ? 'DR' : 'CR'}</span>
          </span>
        </div>
      </div>

      {/* Transactions Search Bar */}
      {transactions.length > 5 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries by description, voucher number, or date..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Ledger Transactions Table */}
      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-left text-[11px] min-w-[550px]">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2 px-2.5">Date</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2">Description / Voucher</th>
              <th className="py-2 px-2 text-right">Debit (+)</th>
              <th className="py-2 px-2 text-right">Credit (-)</th>
              <th className="py-2 px-2.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                  No ledger entries recorded yet.
                </td>
              </tr>
            ) : (
              filteredTx.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 text-slate-300 font-sans whitespace-nowrap">{tx.date || '-'}</td>
                  <td className="py-1.5 px-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                      {tx.voucherType || '-'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-sans font-medium text-white max-w-[200px] truncate">
                    {tx.description || tx.voucherNumber || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-amber-300 font-bold">
                    {Number(tx.debit) ? `${currencySymbol()} ${Number(tx.debit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">
                    {Number(tx.credit) ? `${currencySymbol()} ${Number(tx.credit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-black text-cyan-300">
                    {currencySymbol()} {Number(tx.balance || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 2. SUPPLIER LEDGER WIDGET
// =========================================================================
export const SupplierLedgerWidget: React.FC<{
  ledger: SupplierLedgerReport;
}> = ({ ledger }) => {
  const transactions = ledger.transactions || [];
  const closingBal = Number(ledger.closingBalance || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3.5 bg-slate-900 border border-sky-500/50 rounded-2xl space-y-3 text-xs w-full shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <h4 className="font-extrabold text-sm text-white">
              {ledger.supplierName || ledger.accountTitle}
            </h4>
            <span className="font-mono text-[10px] text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
              #{ledger.accountCode || 'SUPP'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            📞 {ledger.phone || 'No phone'} &bull; Supplier Khata Statement
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-sky-400" />
          <span>Print</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Opening Balance</span>
          <span className="font-mono font-bold text-slate-200 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.openingBalance || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Total Purchases</span>
          <span className="font-mono font-bold text-amber-300 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.totalDebit || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Total Payments</span>
          <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
            {currencySymbol()} {Number(ledger.totalCredit || 0).toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-600/60">
          <span className="text-sky-300 block text-[10px] font-bold">سپلائر بقایا (PAYABLE DUE)</span>
          <span className="font-mono font-black text-sky-400 text-sm mt-0.5 block">
            {currencySymbol()} {Math.abs(closingBal).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-left text-[11px] min-w-[550px]">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2 px-2.5">Date</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2">Description / Bill #</th>
              <th className="py-2 px-2 text-right">Debit (+)</th>
              <th className="py-2 px-2 text-right">Credit (-)</th>
              <th className="py-2 px-2.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                  No supplier ledger entries recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 text-slate-300 font-sans whitespace-nowrap">{tx.date || '-'}</td>
                  <td className="py-1.5 px-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                      {tx.voucherType || '-'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-sans font-medium text-white max-w-[200px] truncate">
                    {tx.description || tx.voucherNumber || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-amber-300 font-bold">
                    {Number(tx.debit) ? `${currencySymbol()} ${Number(tx.debit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">
                    {Number(tx.credit) ? `${currencySymbol()} ${Number(tx.credit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-black text-sky-300">
                    {currencySymbol()} {Number(tx.balance || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 3. RECEIVABLES LIST WIDGET (Customer Udhaar List)
// =========================================================================
export const ReceivablesTableWidget: React.FC<{
  customers: any[];
  totalReceivables?: number;
  onSelectCustomer?: (customer: any) => void;
}> = ({ customers = [], totalReceivables, onSelectCustomer }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        (c.name || c.accountTitle || '').toLowerCase().includes(q) ||
        (c.code || c.accountCode || '').toLowerCase().includes(q) ||
        (c.phone || c.mobile || '').includes(q)
    );
  }, [customers, search]);

  const total =
    totalReceivables !== undefined
      ? totalReceivables
      : customers.reduce((sum, c) => sum + Number(c.outstandingBalance || c.currentBalance || c.balance || 0), 0);

  return (
    <div className="p-3.5 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-3 text-xs w-full shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h4 className="font-extrabold text-sm text-white">
            Customer Receivables List (مارکیٹ ادھار کھاتہ)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300">
            Total Udhaar: <strong className="text-emerald-400 font-mono text-sm">{currencySymbol()} {total.toLocaleString()}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {customers.length} Customers
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter receivables by customer name, code or phone..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full text-left text-[11px] min-w-[500px]">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2 px-2.5">Customer Name</th>
              <th className="py-2 px-2">Code</th>
              <th className="py-2 px-2">Phone</th>
              <th className="py-2 px-2 text-right">Credit Limit</th>
              <th className="py-2 px-2.5 text-right">Outstanding Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 font-sans">
                  No customers found matching search.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const bal = Number(c.outstandingBalance || c.currentBalance || c.balance || 0);
                return (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-2.5 font-bold text-white font-sans truncate max-w-[180px]">
                      {c.name || c.accountTitle}
                    </td>
                    <td className="py-1.5 px-2 text-cyan-300 font-bold">{c.code || c.accountCode || '-'}</td>
                    <td className="py-1.5 px-2 text-slate-400 font-sans">{c.phone || c.mobile || '-'}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">
                      {currencySymbol()} {Number(c.creditLimit || 0).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-black text-emerald-400 font-mono text-xs">
                      {currencySymbol()} {bal.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 4. PAYABLES LIST WIDGET (Supplier Payables)
// =========================================================================
export const PayablesTableWidget: React.FC<{
  suppliers: any[];
  totalPayables?: number;
}> = ({ suppliers = [], totalPayables }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name || s.accountTitle || '').toLowerCase().includes(q) ||
        (s.code || s.accountCode || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
    );
  }, [suppliers, search]);

  const total =
    totalPayables !== undefined
      ? totalPayables
      : suppliers.reduce((sum, s) => sum + Number(s.payableBalance || s.remainingBalance || s.balance || 0), 0);

  return (
    <div className="p-3.5 bg-slate-900 border border-sky-500/40 rounded-2xl space-y-3 text-xs w-full shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-sky-400" />
          <h4 className="font-extrabold text-sm text-white">
            Supplier Payables List (سپلائرز کے واجبات)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300">
            Total Payable: <strong className="text-sky-400 font-mono text-sm">{currencySymbol()} {total.toLocaleString()}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
            {suppliers.length} Suppliers
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter payables by supplier name, code or phone..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full text-left text-[11px] min-w-[500px]">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2 px-2.5">Supplier Name</th>
              <th className="py-2 px-2">Code</th>
              <th className="py-2 px-2">Phone</th>
              <th className="py-2 px-2.5 text-right">Payable Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-500 font-sans">
                  No suppliers found matching search.
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const bal = Number(s.payableBalance || s.remainingBalance || s.balance || 0);
                return (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-2.5 font-bold text-white font-sans truncate max-w-[200px]">
                      {s.name || s.accountTitle}
                    </td>
                    <td className="py-1.5 px-2 text-cyan-300 font-bold">{s.code || s.accountCode || '-'}</td>
                    <td className="py-1.5 px-2 text-slate-400 font-sans">{s.phone || '-'}</td>
                    <td className="py-1.5 px-2.5 text-right font-black text-sky-400 font-mono text-xs">
                      {currencySymbol()} {bal.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 5. RETURNS REPORT WIDGET (Sales / Purchase Returns)
// =========================================================================
export const ReturnsTableWidget: React.FC<{
  type: 'sale' | 'purchase';
  returns: any[];
  totalAmount?: number;
}> = ({ type, returns = [], totalAmount }) => {
  const isSale = type === 'sale';
  const total =
    totalAmount !== undefined
      ? totalAmount
      : returns.reduce((sum, r) => sum + Number(r.netAmount || r.totalAmount || 0), 0);

  return (
    <div className={`p-3.5 bg-slate-900 border rounded-2xl space-y-3 text-xs w-full shadow-lg ${
      isSale ? 'border-amber-500/40' : 'border-rose-500/40'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className={`w-4 h-4 ${isSale ? 'text-amber-400' : 'text-rose-400'}`} />
          <h4 className="font-extrabold text-sm text-white">
            {isSale ? 'Sales Return Report (گاہک مال واپسی)' : 'Purchase Return Report (سپلائر خریداری واپسی)'}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300">
            Total Return Value: <strong className={`font-mono text-sm ${isSale ? 'text-amber-400' : 'text-rose-400'}`}>{currencySymbol()} {total.toLocaleString()}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isSale ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            {returns.length} Invoices
          </span>
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full text-left text-[11px] min-w-[500px]">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2 px-2.5">Return #</th>
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">{isSale ? 'Customer' : 'Supplier'}</th>
              <th className="py-2 px-2">Items Returned</th>
              <th className="py-2 px-2.5 text-right">Refund / Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 font-sans">
                  No return vouchers recorded yet.
                </td>
              </tr>
            ) : (
              returns.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 text-cyan-300 font-bold">#{r.returnNumber || r.id}</td>
                  <td className="py-1.5 px-2 text-slate-300 font-sans">{r.date || '-'}</td>
                  <td className="py-1.5 px-2 font-sans font-bold text-white truncate max-w-[150px]">
                    {r.customerAccountTitle || r.supplierAccountTitle || r.partyName || '-'}
                  </td>
                  <td className="py-1.5 px-2 font-sans text-slate-300 truncate max-w-[180px]">
                    {Array.isArray(r.items)
                      ? r.items.map((it: any) => `${it.productName || it.itemTitle} (${it.qty || it.quantity})`).join(', ')
                      : '-'}
                  </td>
                  <td className={`py-1.5 px-2.5 text-right font-black font-mono text-xs ${
                    isSale ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {currencySymbol()} {Number(r.netAmount || r.totalAmount || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 6. SALESMAN VS CUSTOMER PROFIT ANALYSIS WIDGET
// =========================================================================
export const SalesmanCustomerProfitWidget: React.FC<{
  salesmanName: string;
  customerName: string;
  summary: {
    billsCount: number;
    totalSalesVolume: number;
    totalCostOfGoods: number;
    totalProfit: number;
    profitMarginPct: number;
  };
  bills: SaleBill[];
  onOpenSaleBill?: (bill: SaleBill) => void;
}> = ({ salesmanName, customerName, summary, bills = [], onOpenSaleBill }) => {
  return (
    <div className="p-3.5 bg-slate-900 border border-purple-500/50 rounded-2xl space-y-3 text-xs w-full shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
            Filtered Profit Intelligence
          </span>
          <h4 className="font-extrabold text-sm text-white">
            Salesman <strong className="text-purple-300">{salesmanName}</strong> &bull; Customer <strong className="text-cyan-300">{customerName}</strong>
          </h4>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
          {summary.profitMarginPct.toFixed(1)}% Margin
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Total Bills</span>
          <span className="font-mono font-bold text-white text-xs mt-0.5 block">{summary.billsCount} Bills</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Sales Volume</span>
          <span className="font-mono font-bold text-white text-xs mt-0.5 block">
            {currencySymbol()} {summary.totalSalesVolume.toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Khareed Laagat (COGS)</span>
          <span className="font-mono font-bold text-amber-300 text-xs mt-0.5 block">
            {currencySymbol()} {summary.totalCostOfGoods.toLocaleString()}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/50">
          <span className="text-purple-300 block text-[10px] font-bold">Gross Profit (منافع)</span>
          <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
            +{currencySymbol()} {summary.totalProfit.toLocaleString()}
          </span>
        </div>
      </div>

      {bills.length > 0 && (
        <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-52 overflow-y-auto">
          <table className="w-full text-left text-[11px] min-w-[450px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">Bill #</th>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2 text-right">Turnover</th>
                <th className="py-2 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[10px]">
              {bills.map((b, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-1.5 px-2.5 text-cyan-300 font-bold">#{b.billNumber}</td>
                  <td className="py-1.5 px-2 text-slate-300 font-sans">{b.date}</td>
                  <td className="py-1.5 px-2 text-right text-white font-bold">
                    {currencySymbol()} {Number(b.netTotal || b.grossAmount || 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2.5 text-center">
                    {onOpenSaleBill && (
                      <button
                        type="button"
                        onClick={() => onOpenSaleBill(b)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        👁️ View Bill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
