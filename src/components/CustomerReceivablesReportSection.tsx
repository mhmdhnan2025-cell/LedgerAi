import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DollarSign,
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Phone,
  AlertCircle,
  CheckCircle2,
  Share2,
  TrendingDown,
  ShieldAlert,
  ArrowUpDown,
  Building2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { Customer, SaleBill, CompanyProfile } from '../types';
import { api } from '../services/api';
import { exportToCsv } from '../utils/exportCsv';

interface CustomerReceivablesReportSectionProps {
  companyProfile?: CompanyProfile | null;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface EnrichedCustomerReceivable {
  id: string;
  code: string;
  manualCode?: string;
  accountTitle: string;
  mobile: string;
  trn?: string;
  city?: string;
  customerGroup?: string;
  creditLimit: number;
  outstandingBalance: number;
  handlingSalesman: string;
  totalSalesVolume: number;
  billsCount: number;
  lastSaleDate?: string;
  status: 'CLEAR' | 'NORMAL' | 'OVER_LIMIT';
}

export const CustomerReceivablesReportSection: React.FC<CustomerReceivablesReportSectionProps> = ({
  companyProfile,
  onRefreshData,
  onNavigateTab,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesBills, setSalesBills] = useState<SaleBill[]>([]);
  const [salesmenList, setSalesmenList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'WITH_BALANCE' | 'OVER_LIMIT'>('WITH_BALANCE');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [sortBy, setSortBy] = useState<'balance-desc' | 'balance-asc' | 'title-asc' | 'sales-desc'>('balance-desc');

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [custList, billsList, smList] = await Promise.all([
        api.getCustomers(),
        api.getSales(),
        api.getSalesmen(),
      ]);

      setCustomers(custList || []);
      setSalesBills(billsList || []);
      setSalesmenList(smList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load receivables data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Handling Salesman and Sales history for every Customer
  const enrichedReceivables: EnrichedCustomerReceivable[] = useMemo(() => {
    if (!customers || customers.length === 0) return [];

    // Map sales bills by customer
    const customerBillsMap = new Map<string, SaleBill[]>();
    salesBills.forEach((bill) => {
      const cId = bill.customerId;
      const cTitle = (bill.customerAccountTitle || '').toLowerCase().trim();

      if (cId) {
        if (!customerBillsMap.has(cId)) customerBillsMap.set(cId, []);
        customerBillsMap.get(cId)!.push(bill);
      }
      if (cTitle) {
        if (!customerBillsMap.has(cTitle)) customerBillsMap.set(cTitle, []);
        customerBillsMap.get(cTitle)!.push(bill);
      }
    });

    return customers.map((c) => {
      const matchedBills = customerBillsMap.get(c.id) || customerBillsMap.get((c.accountTitle || c.name || '').toLowerCase().trim()) || [];

      // Determine handling salesman:
      // Priority 1: explicitly assigned salesman on customer record
      // Priority 2: salesman from customer's latest or most frequent sale bills
      // Priority 3: first available salesman from company
      let handlingSm = c.assignedSalesman || '';
      if (!handlingSm && matchedBills.length > 0) {
        const smCounts = new Map<string, number>();
        matchedBills.forEach((b) => {
          const sName = (b.salesmanName || b.user || '').trim();
          if (sName) smCounts.set(sName, (smCounts.get(sName) || 0) + 1);
        });
        let topCount = 0;
        smCounts.forEach((count, name) => {
          if (count > topCount) {
            topCount = count;
            handlingSm = name;
          }
        });
      }
      if (!handlingSm) {
        handlingSm = salesmenList[0] || 'HAFIZ ABDUL QADEER';
      }

      const totalSales = matchedBills.reduce((acc, b) => acc + (b.netTotal || 0), 0);
      const sortedBills = [...matchedBills].sort((a, b) => b.date.localeCompare(a.date));
      const lastDate = sortedBills.length > 0 ? sortedBills[0].date : undefined;

      const balance = Number(c.outstandingBalance || 0);
      const limit = Number(c.creditLimit || 0);

      let status: 'CLEAR' | 'NORMAL' | 'OVER_LIMIT' = 'CLEAR';
      if (balance > 0) {
        status = limit > 0 && balance > limit ? 'OVER_LIMIT' : 'NORMAL';
      }

      return {
        id: c.id,
        code: c.code || '0101040001',
        manualCode: c.manualCode,
        accountTitle: c.accountTitle || c.name || 'Unnamed Customer',
        mobile: c.mobile || '',
        trn: c.trn,
        city: c.city,
        customerGroup: c.customerGroup,
        creditLimit: limit,
        outstandingBalance: balance,
        handlingSalesman: handlingSm,
        totalSalesVolume: Number(totalSales.toFixed(2)),
        billsCount: matchedBills.length,
        lastSaleDate: lastDate,
        status,
      };
    });
  }, [customers, salesBills, salesmenList]);

  // Unique cities for filter
  const cities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered List
  const filteredList = useMemo(() => {
    let list = [...enrichedReceivables];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.accountTitle.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.manualCode && c.manualCode.toLowerCase().includes(q)) ||
          c.mobile.includes(q) ||
          (c.trn && c.trn.toLowerCase().includes(q)) ||
          c.handlingSalesman.toLowerCase().includes(q)
      );
    }

    // Salesman Filter
    if (selectedSalesman) {
      const smLower = selectedSalesman.toLowerCase().trim();
      list = list.filter((c) => c.handlingSalesman.toLowerCase().trim() === smLower);
    }

    // Balance status filter
    if (balanceFilter === 'WITH_BALANCE') {
      list = list.filter((c) => c.outstandingBalance > 0);
    } else if (balanceFilter === 'OVER_LIMIT') {
      list = list.filter((c) => c.status === 'OVER_LIMIT');
    }

    // City Filter
    if (selectedCity) {
      list = list.filter((c) => c.city === selectedCity);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'balance-desc') return b.outstandingBalance - a.outstandingBalance;
      if (sortBy === 'balance-asc') return a.outstandingBalance - b.outstandingBalance;
      if (sortBy === 'title-asc') return a.accountTitle.localeCompare(b.accountTitle);
      if (sortBy === 'sales-desc') return b.totalSalesVolume - a.totalSalesVolume;
      return 0;
    });

    return list;
  }, [enrichedReceivables, searchQuery, selectedSalesman, balanceFilter, selectedCity, sortBy]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalReceivables = enrichedReceivables.reduce((acc, c) => acc + c.outstandingBalance, 0);
    const withBalanceCount = enrichedReceivables.filter((c) => c.outstandingBalance > 0).length;
    const overLimitCount = enrichedReceivables.filter((c) => c.status === 'OVER_LIMIT').length;
    const totalCreditLimit = enrichedReceivables.reduce((acc, c) => acc + c.creditLimit, 0);

    // Salesman receivables map
    const smReceivablesMap = new Map<string, number>();
    enrichedReceivables.forEach((c) => {
      const sm = c.handlingSalesman || 'Unassigned';
      smReceivablesMap.set(sm, (smReceivablesMap.get(sm) || 0) + c.outstandingBalance);
    });

    let topSmName = 'N/A';
    let topSmBal = 0;
    smReceivablesMap.forEach((bal, name) => {
      if (bal > topSmBal) {
        topSmBal = bal;
        topSmName = name;
      }
    });

    return {
      totalCustomers: enrichedReceivables.length,
      withBalanceCount,
      overLimitCount,
      totalReceivables: Number(totalReceivables.toFixed(2)),
      totalCreditLimit: Number(totalCreditLimit.toFixed(2)),
      topSalesman: topSmName,
      topSalesmanReceivables: Number(topSmBal.toFixed(2)),
    };
  }, [enrichedReceivables]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      setErrorMsg('No customer receivable records found to export.');
      return;
    }

    const success = exportToCsv(
      `Customer_Receivables_Ledger_${new Date().toISOString().split('T')[0]}`,
      filteredList,
      [
        { header: 'A/C Code', accessor: (c) => c.code },
        { header: 'Manual Code', accessor: (c) => c.manualCode || '' },
        { header: 'Customer Account Title', accessor: (c) => c.accountTitle },
        { header: 'Customer TRN', accessor: (c) => c.trn || '' },
        { header: 'Mobile Phone', accessor: (c) => c.mobile },
        { header: 'City / Area', accessor: (c) => c.city || '' },
        { header: 'Group', accessor: (c) => c.customerGroup || 'General' },
        { header: 'Handling Salesman', accessor: (c) => c.handlingSalesman },
        { header: 'Total Sales Volume', accessor: (c) => c.totalSalesVolume },
        { header: 'Bills Count', accessor: (c) => c.billsCount },
        { header: 'Last Sale Date', accessor: (c) => c.lastSaleDate || 'N/A' },
        { header: 'Credit Limit', accessor: (c) => c.creditLimit },
        { header: 'Current Outstanding Receivable', accessor: (c) => c.outstandingBalance },
        { header: 'Status', accessor: (c) => c.status },
      ]
    );

    if (success) {
      setSuccessMsg('Customer receivables report exported to Excel / CSV successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Immediate Clean Print
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Reminder Generator
  const handleSendWhatsAppReminder = (c: EnrichedCustomerReceivable) => {
    const text = encodeURIComponent(
      `محترم *${c.accountTitle}* صاحب،\n` +
      `السلام علیکم ورحمۃ اللہ،\n\n` +
      `آپ کے کھاتہ کا واجب الادا بقایا جات (Outstanding Balance) مبلغ *${currencySymbol()} ${c.outstandingBalance.toLocaleString()}* ہے۔\n` +
      `برائے مہربانی اپنا کھاتہ جلد از جلد کلیئر فرمائیں۔\n` +
      `مندوب برائے رابطہ: *${c.handlingSalesman}*\n` +
      `شکریہ،\n*${companyProfile?.name || 'AL-HANAN WHOLESALE TRADERS'}*`
    );
    window.open(`https://wa.me/${c.mobile.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROLS & FILTER BAR                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Customer Receivables &amp; Outstanding Ledger (گاہکوں کی ادھار و وصولیاں)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Accurate tracking of customer balances, credit limits, and assigned handling sales staff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV (ایکسل)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print Ledger (طباعة)</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          {/* Live Search */}
          <div className="relative">
            <label className="block text-slate-400 font-semibold mb-1">Search Customer / Code</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, A/C Code, Mobile, TRN..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Salesman Filter (Dynamic 100% matched with DB) */}
          <div>
            <label className="block text-amber-300 font-semibold mb-1">
              Handling Salesman (المندوب)
            </label>
            <select
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-400 font-bold"
            >
              <option value="">All Salesmen (تمام سیلز مین)</option>
              {salesmenList.map((sm) => (
                <option key={sm} value={sm}>
                  {sm}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Balance Status</label>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="WITH_BALANCE">Only with Outstanding Balance (&gt; 0)</option>
              <option value="ALL">All Customers (With &amp; Without Balance)</option>
              <option value="OVER_LIMIT">Over Credit Limit Only (خطرناک)</option>
            </select>
          </div>

          {/* City / Area Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">City / Location</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="balance-desc">Receivable (Highest First)</option>
              <option value="balance-asc">Receivable (Lowest First)</option>
              <option value="sales-desc">Sales Volume (Highest)</option>
              <option value="title-asc">Account Title (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KPI METRIC CARDS                                              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Receivables Due</span>
          <span className="text-lg sm:text-xl font-black text-rose-400 font-mono">
            {currencySymbol()} {kpis.totalReceivables.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Across {kpis.withBalanceCount} active accounts
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Accounts with Balance</span>
          <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
            {kpis.withBalanceCount} <span className="text-xs text-slate-500 font-normal">/ {kpis.totalCustomers}</span>
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {kpis.overLimitCount > 0 ? `${kpis.overLimitCount} over credit limit` : 'All within limits'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Credit Limits</span>
          <span className="text-lg sm:text-xl font-black text-sky-400 font-mono">
            {currencySymbol()} {kpis.totalCreditLimit.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Authorized business limit</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Top Salesman by Receivables</span>
          <span className="text-sm sm:text-base font-bold text-white truncate block">
            {kpis.topSalesman}
          </span>
          <span className="text-[11px] text-rose-400 font-mono font-bold block mt-0.5">
            {currencySymbol()} {kpis.topSalesmanReceivables.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECEIVABLES TABLE                                             */}
      {/* ------------------------------------------------------------- */}
      <div ref={printAreaRef} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Printable Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Customer Accounts List ({filteredList.length} matching)
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Filtered Total: <strong className="text-rose-400">{currencySymbol()} {filteredList.reduce((s, c) => s + c.outstandingBalance, 0).toLocaleString()}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">A/C Code</th>
                <th className="py-2.5 px-3">Customer Account Title (العميل)</th>
                <th className="py-2.5 px-3">Customer TRN</th>
                <th className="py-2.5 px-3">Handling Salesman (المندوب)</th>
                <th className="py-2.5 px-3">Contact &amp; City</th>
                <th className="py-2.5 px-3 text-right">Credit Limit</th>
                <th className="py-2.5 px-3 text-right">Total Sales</th>
                <th className="py-2.5 px-3 text-center">Last Bill</th>
                <th className="py-2.5 px-3 text-right">Outstanding Receivable (الرصيد)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-500 font-sans">
                    No customer receivables matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition font-sans">
                    {/* Code */}
                    <td className="py-2.5 px-3 font-mono text-orange-400 font-semibold">
                      {c.code}
                      {c.manualCode && <div className="text-[10px] text-slate-500 font-normal">M: {c.manualCode}</div>}
                    </td>

                    {/* Customer Account Title */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div>{c.accountTitle}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.customerGroup || 'General Customer'}</div>
                    </td>

                    {/* TRN */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {c.trn ? (
                        <span className="text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                          {c.trn}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Handling Salesman (Prominently Highlighted) */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold">
                        <UserCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{c.handlingSalesman}</span>
                      </div>
                    </td>

                    {/* Contact & City */}
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                      <div>{c.mobile || 'No Mobile'}</div>
                      {c.city && <div className="text-[10px] text-slate-500">{c.city}</div>}
                    </td>

                    {/* Credit Limit */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {c.creditLimit > 0 ? `${currencySymbol()} ${c.creditLimit.toLocaleString()}` : '—'}
                    </td>

                    {/* Total Sales */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {currencySymbol()} {c.totalSalesVolume.toLocaleString()}
                      <div className="text-[10px] text-slate-500">{c.billsCount} bill(s)</div>
                    </td>

                    {/* Last Bill Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                      {c.lastSaleDate || 'No bills'}
                    </td>

                    {/* Outstanding Receivable */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sm">
                      <span className={c.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {currencySymbol()} {c.outstandingBalance.toLocaleString()}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {c.status === 'CLEAR' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Clear (0)
                        </span>
                      ) : c.status === 'OVER_LIMIT' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>Over Limit</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          Active Khata
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        {c.mobile && c.outstandingBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReminder(c)}
                            className="p-1 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer transition"
                            title="Send WhatsApp Balance Reminder"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('customers')}
                            className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Open Customer Profile"
                          >
                            Profile
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
