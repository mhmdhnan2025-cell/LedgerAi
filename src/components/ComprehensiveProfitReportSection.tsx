import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  DollarSign,
  Package,
  Users,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  ComprehensiveProfitReport,
  ItemProfitReportItem,
  BillProfitReportItem,
  RestaurantCustomerProfitReportItem,
  SalesmanProfitReportItem,
  SaleBill,
} from '../types';
import { api } from '../services/api';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { exportToCsv } from '../utils/exportCsv';

interface ComprehensiveProfitReportSectionProps {
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ComprehensiveProfitReportSection: React.FC<ComprehensiveProfitReportSectionProps> = ({
  onRefreshData,
  onNavigateTab,
}) => {
  // Sub-tab selection: perItem, perBill, perRestaurant, perSalesman
  const [activeTab, setActiveTab] = useState<'perItem' | 'perBill' | 'perRestaurant' | 'perSalesman'>('perItem');

  // Filter States
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFITABLE' | 'LOSS' | 'LOW_MARGIN'>('ALL');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  // Dedicated Master Live Search & Filters (Cross-tab Filtering)
  const [liveSearch, setLiveSearch] = useState('');
  const [itemSelectFilter, setItemSelectFilter] = useState('ALL');
  const [salesmanSelectFilter, setSalesmanSelectFilter] = useState('ALL');
  const [customerSelectFilter, setCustomerSelectFilter] = useState('ALL');
  const [billSelectFilter, setBillSelectFilter] = useState('ALL');
  const [itemSearch, setItemSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');

  // Salesman Customers Hover & Modal Popover (Fixed on top of all UI)
  const [popoverSalesman, setPopoverSalesman] = useState<{
    sm: SalesmanProfitReportItem;
    x: number;
    y: number;
  } | null>(null);

  // Data & Loading
  const [reportData, setReportData] = useState<ComprehensiveProfitReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal for viewing a bill directly
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<SaleBill | null>(null);

  const loadProfitData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getComprehensiveProfitReport({
        fromDate: fromDate?.trim() || undefined,
        toDate: toDate?.trim() || undefined,
        search: searchQuery.trim() || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load profit reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfitData();
  }, []);

  // Quick preset filters (Exact same as sample)
  const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | '7days' | 'month' | 'last_month' | 'year') => {
    setActiveDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setFromDate(past7.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startMonth.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'last_month') {
      const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(startLastMonth.toISOString().split('T')[0]);
      setToDate(endLastMonth.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const startYear = new Date(today.getFullYear(), 0, 1);
      setFromDate(startYear.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  // Unique item options for item select filter
  const itemOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (reportData?.perItem) {
      for (const it of reportData.perItem) {
        if (it?.mcode && !map.has(it.mcode)) {
          map.set(it.mcode, it.itemTitle || it.mcode);
        }
      }
    }
    if (reportData?.perBill) {
      for (const b of reportData.perBill) {
        if (Array.isArray(b?.items)) {
          for (const it of b.items) {
            const key = it?.mcode || it?.itemTitle;
            if (key && !map.has(key)) {
              map.set(key, it?.itemTitle || key);
            }
          }
        }
      }
    }
    return Array.from(map.entries())
      .map(([mcode, title]) => ({ mcode, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [reportData]);

  // Unique salesman options
  const salesmanOptions = useMemo(() => {
    const set = new Set<string>();
    if (reportData?.perSalesman) {
      for (const sm of reportData.perSalesman) {
        if (sm?.salesmanName?.trim()) set.add(sm.salesmanName.trim());
      }
    }
    if (reportData?.perBill) {
      for (const b of reportData.perBill) {
        if (b?.salesmanName?.trim()) set.add(b.salesmanName.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reportData]);

  // Unique customer options
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    if (reportData?.perRestaurant) {
      for (const r of reportData.perRestaurant) {
        if (r?.accountTitle?.trim()) set.add(r.accountTitle.trim());
      }
    }
    if (reportData?.perBill) {
      for (const b of reportData.perBill) {
        if (b?.customerAccountTitle?.trim()) set.add(b.customerAccountTitle.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reportData]);

  // Unique bill options
  const billOptions = useMemo(() => {
    if (!reportData?.perBill) return [];
    const set = new Set<string>();
    for (const b of reportData.perBill) {
      if (b?.billNumber?.trim()) set.add(b.billNumber.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [reportData]);

  // Filter Active Check & Reset
  const hasActiveFilters = useMemo(() => {
    return (
      itemSelectFilter !== 'ALL' ||
      salesmanSelectFilter !== 'ALL' ||
      customerSelectFilter !== 'ALL' ||
      billSelectFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      liveSearch.trim() !== '' ||
      itemSearch.trim() !== '' ||
      billSearch.trim() !== '' ||
      restaurantSearch.trim() !== '' ||
      salesmanSearch.trim() !== ''
    );
  }, [
    itemSelectFilter,
    salesmanSelectFilter,
    customerSelectFilter,
    billSelectFilter,
    statusFilter,
    liveSearch,
    itemSearch,
    billSearch,
    restaurantSearch,
    salesmanSearch,
  ]);

  const resetAllFilters = () => {
    setItemSelectFilter('ALL');
    setSalesmanSelectFilter('ALL');
    setCustomerSelectFilter('ALL');
    setBillSelectFilter('ALL');
    setStatusFilter('ALL');
    setLiveSearch('');
    setItemSearch('');
    setBillSearch('');
    setRestaurantSearch('');
    setSalesmanSearch('');
  };

  // Filtered Per-Item (Cross-filtering with Item, Salesman, Customer, Bill, Status, Search)
  const filteredItems = useMemo(() => {
    if (!reportData?.perItem) return [];
    let list = reportData.perItem;

    const q = (liveSearch || itemSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (it) =>
          (it?.itemTitle || '').toLowerCase().includes(q) ||
          (it?.mcode || '').toLowerCase().includes(q) ||
          (it?.category || '').toLowerCase().includes(q)
      );
    }

    if (itemSelectFilter !== 'ALL') {
      list = list.filter(
        (it) => (it?.mcode || '') === itemSelectFilter || (it?.itemTitle || '') === itemSelectFilter
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((it) => it?.status === statusFilter);
    }

    const hasBillFilter = billSelectFilter !== 'ALL';
    const hasSalesmanFilter = salesmanSelectFilter !== 'ALL';
    const hasCustomerFilter = customerSelectFilter !== 'ALL';

    if ((hasBillFilter || hasSalesmanFilter || hasCustomerFilter) && reportData?.perBill) {
      const validItemKeys = new Set<string>();
      for (const b of reportData.perBill) {
        if (hasBillFilter && (b?.billNumber || '') !== billSelectFilter) continue;
        if (hasSalesmanFilter && (b?.salesmanName || '') !== salesmanSelectFilter) continue;
        if (hasCustomerFilter && (b?.customerAccountTitle || '') !== customerSelectFilter) continue;

        if (Array.isArray(b.items)) {
          for (const it of b.items) {
            if (it?.mcode) validItemKeys.add(it.mcode);
            if (it?.itemTitle) validItemKeys.add(it.itemTitle);
          }
        }
      }
      list = list.filter((it) => validItemKeys.has(it.mcode || '') || validItemKeys.has(it.itemTitle || ''));
    }

    return list;
  }, [
    reportData,
    liveSearch,
    itemSearch,
    searchQuery,
    itemSelectFilter,
    statusFilter,
    billSelectFilter,
    salesmanSelectFilter,
    customerSelectFilter,
  ]);

  // Filtered Per-Bill (Cross-filtering with Bill, Salesman, Customer, Item, Status, Search)
  const filteredBills = useMemo(() => {
    if (!reportData?.perBill) return [];
    let list = reportData.perBill;

    const q = (liveSearch || billSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          (b?.billNumber || '').toLowerCase().includes(q) ||
          (b?.customerAccountTitle || '').toLowerCase().includes(q) ||
          (b?.salesmanName || '').toLowerCase().includes(q) ||
          (Array.isArray(b?.items) &&
            b.items.some(
              (it) =>
                (it?.itemTitle || '').toLowerCase().includes(q) ||
                (it?.mcode || '').toLowerCase().includes(q)
            ))
      );
    }

    if (billSelectFilter !== 'ALL') {
      list = list.filter((b) => (b?.billNumber || '') === billSelectFilter);
    }

    if (salesmanSelectFilter !== 'ALL') {
      list = list.filter((b) => (b?.salesmanName || '') === salesmanSelectFilter);
    }

    if (customerSelectFilter !== 'ALL') {
      list = list.filter((b) => (b?.customerAccountTitle || '') === customerSelectFilter);
    }

    if (itemSelectFilter !== 'ALL') {
      list = list.filter(
        (b) =>
          Array.isArray(b?.items) &&
          b.items.some(
            (it) => (it?.mcode || '') === itemSelectFilter || (it?.itemTitle || '') === itemSelectFilter
          )
      );
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROFITABLE') {
        list = list.filter((b) => (b?.netProfit || 0) > 0);
      } else if (statusFilter === 'LOSS') {
        list = list.filter((b) => (b?.netProfit || 0) < 0);
      } else if (statusFilter === 'LOW_MARGIN') {
        list = list.filter((b) => (b?.profitMarginPct || 0) >= 0 && (b?.profitMarginPct || 0) < 10);
      }
    }

    return list;
  }, [
    reportData,
    liveSearch,
    billSearch,
    searchQuery,
    billSelectFilter,
    salesmanSelectFilter,
    customerSelectFilter,
    itemSelectFilter,
    statusFilter,
  ]);

  // Filtered Per-Restaurant (Cross-filtering with Customer, Salesman, Bill, Item, Status, Search)
  const filteredRestaurants = useMemo(() => {
    if (!reportData?.perRestaurant) return [];
    let list = reportData.perRestaurant;

    const q = (liveSearch || restaurantSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r?.accountTitle || '').toLowerCase().includes(q) ||
          (r?.city || '').toLowerCase().includes(q) ||
          (r?.customerGroup || '').toLowerCase().includes(q) ||
          (r?.code ? String(r.code) : '').toLowerCase().includes(q)
      );
    }

    if (customerSelectFilter !== 'ALL') {
      list = list.filter((r) => (r?.accountTitle || '') === customerSelectFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROFITABLE') {
        list = list.filter((r) => (r?.grossProfit || 0) > 0);
      } else if (statusFilter === 'LOSS') {
        list = list.filter((r) => (r?.grossProfit || 0) < 0 || r?.status === 'LOSS');
      } else if (statusFilter === 'LOW_MARGIN') {
        list = list.filter((r) => (r?.profitMarginPct || 0) < 10);
      }
    }

    const hasBillFilter = billSelectFilter !== 'ALL';
    const hasSalesmanFilter = salesmanSelectFilter !== 'ALL';
    const hasItemFilter = itemSelectFilter !== 'ALL';

    if ((hasBillFilter || hasSalesmanFilter || hasItemFilter) && reportData?.perBill) {
      const validCustomers = new Set<string>();
      for (const b of reportData.perBill) {
        if (hasBillFilter && (b?.billNumber || '') !== billSelectFilter) continue;
        if (hasSalesmanFilter && (b?.salesmanName || '') !== salesmanSelectFilter) continue;
        if (hasItemFilter) {
          const hasItem =
            Array.isArray(b?.items) &&
            b.items.some(
              (it) => (it?.mcode || '') === itemSelectFilter || (it?.itemTitle || '') === itemSelectFilter
            );
          if (!hasItem) continue;
        }
        if (b?.customerAccountTitle) validCustomers.add(b.customerAccountTitle);
      }
      list = list.filter((r) => validCustomers.has(r.accountTitle || ''));
    }

    return list;
  }, [
    reportData,
    liveSearch,
    restaurantSearch,
    searchQuery,
    customerSelectFilter,
    statusFilter,
    billSelectFilter,
    salesmanSelectFilter,
    itemSelectFilter,
  ]);

  // Filtered Per-Salesman (Cross-filtering with Salesman, Customer, Bill, Item, Status, Search)
  const filteredSalesmen = useMemo(() => {
    if (!reportData?.perSalesman) return [];
    let list = reportData.perSalesman;

    const q = (liveSearch || salesmanSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (sm) =>
          (sm?.salesmanName || '').toLowerCase().includes(q) ||
          (sm?.designation ? String(sm.designation) : '').toLowerCase().includes(q)
      );
    }

    if (salesmanSelectFilter !== 'ALL') {
      list = list.filter((sm) => (sm?.salesmanName || '') === salesmanSelectFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROFITABLE') {
        list = list.filter((sm) => (sm?.totalProfit || 0) > 0);
      } else if (statusFilter === 'LOSS') {
        list = list.filter((sm) => (sm?.totalProfit || 0) < 0);
      } else if (statusFilter === 'LOW_MARGIN') {
        list = list.filter((sm) => (sm?.profitMarginPct || 0) < 10);
      }
    }

    const hasBillFilter = billSelectFilter !== 'ALL';
    const hasCustomerFilter = customerSelectFilter !== 'ALL';
    const hasItemFilter = itemSelectFilter !== 'ALL';

    if ((hasBillFilter || hasCustomerFilter || hasItemFilter) && reportData?.perBill) {
      const validSalesmen = new Set<string>();
      for (const b of reportData.perBill) {
        if (hasBillFilter && (b?.billNumber || '') !== billSelectFilter) continue;
        if (hasCustomerFilter && (b?.customerAccountTitle || '') !== customerSelectFilter) continue;
        if (hasItemFilter) {
          const hasItem =
            Array.isArray(b?.items) &&
            b.items.some(
              (it) => (it?.mcode || '') === itemSelectFilter || (it?.itemTitle || '') === itemSelectFilter
            );
          if (!hasItem) continue;
        }
        if (b?.salesmanName) validSalesmen.add(b.salesmanName);
      }
      list = list.filter((sm) => validSalesmen.has(sm.salesmanName || ''));
    }

    return list;
  }, [
    reportData,
    liveSearch,
    salesmanSearch,
    searchQuery,
    salesmanSelectFilter,
    statusFilter,
    billSelectFilter,
    customerSelectFilter,
    itemSelectFilter,
  ]);

  // Export to CSV
  const handleExportCSV = () => {
    let success = false;
    if (activeTab === 'perItem') {
      if (filteredItems.length === 0) {
        setErrorMsg('No item profit records to export.');
        return;
      }
      const exportRows: any[] = [];
      filteredItems.forEach((it) => {
        if (it.rateTiers && it.rateTiers.length > 1) {
          it.rateTiers.forEach((t) => {
            exportRows.push({
              mcode: it.mcode,
              itemTitle: `${it.itemTitle} (Rate: ${t.rate}/${t.unitLabel}, VAT: ${t.vatPercent}%)`,
              category: it.category,
              qtySold: t.qtySold,
              ctnSold: t.ctnSold,
              avgPurchaseRate: t.avgPurchaseRate,
              avgSaleRate: t.rate,
              totalRevenue: t.totalRevenue,
              totalVatAmount: t.totalVatAmount,
              totalDiscountAmount: t.totalDiscountAmount,
              totalCostOfGoods: t.totalCostOfGoods,
              netProfit: t.netProfit,
              profitMarginPct: t.profitMarginPct,
              currentRemainingStock: '—',
              status: 'Rate Tier Breakdown',
            });
          });
          exportRows.push({
            mcode: it.mcode,
            itemTitle: `TOTAL: ${it.itemTitle} (Combined)`,
            category: it.category,
            qtySold: it.qtySold,
            ctnSold: it.ctnSold,
            avgPurchaseRate: it.avgPurchaseRate,
            avgSaleRate: it.avgSaleRate,
            totalRevenue: it.totalRevenue,
            totalVatAmount: it.totalVatAmount || 0,
            totalDiscountAmount: it.totalDiscountAmount || 0,
            totalCostOfGoods: it.totalCostOfGoods,
            netProfit: it.netProfit !== undefined ? it.netProfit : it.grossProfit,
            profitMarginPct: it.profitMarginPct,
            currentRemainingStock: it.currentRemainingStock,
            status: it.status,
          });
        } else {
          exportRows.push({
            mcode: it.mcode,
            itemTitle: it.rateTiers && it.rateTiers[0]
              ? `${it.itemTitle} (Rate: ${it.rateTiers[0].rate}/${it.rateTiers[0].unitLabel}, VAT: ${it.rateTiers[0].vatPercent}%)`
              : it.itemTitle,
            category: it.category,
            qtySold: it.qtySold,
            ctnSold: it.ctnSold,
            avgPurchaseRate: it.avgPurchaseRate,
            avgSaleRate: it.avgSaleRate,
            totalRevenue: it.totalRevenue,
            totalVatAmount: it.totalVatAmount || 0,
            totalDiscountAmount: it.totalDiscountAmount || 0,
            totalCostOfGoods: it.totalCostOfGoods,
            netProfit: it.netProfit !== undefined ? it.netProfit : it.grossProfit,
            profitMarginPct: it.profitMarginPct,
            currentRemainingStock: it.currentRemainingStock,
            status: it.status,
          });
        }
      });
      success = exportToCsv(`Profit_Report_PerItem_${fromDate}_${toDate}`, exportRows, [
        { header: 'M.Code', accessor: (it) => it.mcode },
        { header: 'Item Title', accessor: (it) => it.itemTitle },
        { header: 'Category', accessor: (it) => it.category },
        { header: 'Qty Sold', accessor: (it) => it.qtySold },
        { header: 'Ctn Sold', accessor: (it) => it.ctnSold },
        { header: 'Avg Cost (Incl. VAT)', accessor: (it) => it.avgPurchaseRate },
        { header: 'Avg Sale / Rate', accessor: (it) => it.avgSaleRate },
        { header: 'Sale Revenue (Incl. VAT)', accessor: (it) => it.totalRevenueWithVat || (it.totalRevenue + (it.totalVatAmount || 0)) },
        { header: 'Sale Revenue (Ex-VAT)', accessor: (it) => it.totalRevenue },
        { header: 'Sales VAT', accessor: (it) => it.totalVatAmount || 0 },
        { header: 'Discount Deducted', accessor: (it) => it.totalDiscountAmount || 0 },
        { header: 'COGS (Incl. VAT)', accessor: (it) => it.totalCostOfGoods },
        { header: 'COGS (Ex-VAT)', accessor: (it) => Number((it.totalCostOfGoods / 1.05).toFixed(2)) },
        { header: 'Net Profit', accessor: (it) => it.netProfit },
        { header: 'Margin %', accessor: (it) => it.profitMarginPct },
        { header: 'In Stock / Warehouse', accessor: (it) => it.currentRemainingStock },
        { header: 'Status', accessor: (it) => it.status },
      ]);
    } else if (activeTab === 'perBill') {
      if (filteredBills.length === 0) {
        setErrorMsg('No bill profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerBill_${fromDate}_${toDate}`, filteredBills, [
        { header: 'Bill#', accessor: (b) => b.billNumber },
        { header: 'Date', accessor: (b) => b.date },
        { header: 'Customer', accessor: (b) => b.customerAccountTitle },
        { header: 'Salesman', accessor: (b) => b.salesmanName },
        { header: 'Cartons', accessor: (b) => b.totalCtn },
        { header: 'Quantity', accessor: (b) => b.totalQty },
        { header: 'Gross Sale (Incl. VAT)', accessor: (b) => b.grossAmountWithVat || (b.netTotal + b.billDiscount) },
        { header: 'Gross Sale (Ex-VAT)', accessor: (b) => b.grossAmount },
        { header: 'Discount', accessor: (b) => b.billDiscount },
        { header: 'Net Total (Incl. VAT)', accessor: (b) => b.netTotal },
        { header: 'COGS (Incl. VAT)', accessor: (b) => b.costOfGoods },
        { header: 'Net Profit', accessor: (b) => b.netProfit },
        { header: 'Margin %', accessor: (b) => b.profitMarginPct },
      ]);
    } else if (activeTab === 'perRestaurant') {
      if (filteredRestaurants.length === 0) {
        setErrorMsg('No restaurant profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerRestaurant_${fromDate}_${toDate}`, filteredRestaurants, [
        { header: 'Restaurant / Customer', accessor: (r) => r.accountTitle },
        { header: 'Group', accessor: (r) => r.customerGroup },
        { header: 'City', accessor: (r) => r.city },
        { header: 'Bills Count', accessor: (r) => r.billsCount },
        { header: 'Cartons', accessor: (r) => r.totalCtn },
        { header: 'Quantity', accessor: (r) => r.totalQty },
        { header: 'Total Sales Volume', accessor: (r) => r.totalSalesVolume },
        { header: 'Cost of Goods', accessor: (r) => r.totalCostOfGoods },
        { header: 'Gross Profit', accessor: (r) => r.grossProfit },
        { header: 'Margin %', accessor: (r) => r.profitMarginPct },
        { header: 'Outstanding Udhaar', accessor: (r) => r.outstandingBalance },
      ]);
    } else if (activeTab === 'perSalesman') {
      if (filteredSalesmen.length === 0) {
        setErrorMsg('No salesman profit records to export.');
        return;
      }
      success = exportToCsv(`Profit_Report_PerSalesman_${fromDate}_${toDate}`, filteredSalesmen, [
        { header: 'Salesman Name', accessor: (sm) => sm.salesmanName },
        { header: 'Designation', accessor: (sm) => sm.designation || 'Sales' },
        { header: 'Bills Made', accessor: (sm) => sm.billsCount },
        { header: 'Cartons Sold', accessor: (sm) => sm.totalCtnSold },
        { header: 'Quantity Sold', accessor: (sm) => sm.totalQtySold },
        { header: 'Total Sales Volume', accessor: (sm) => sm.totalSalesVolume },
        { header: 'Cost of Goods', accessor: (sm) => sm.totalCostOfGoods },
        { header: 'Profit Generated', accessor: (sm) => sm.totalProfit },
        { header: 'Margin %', accessor: (sm) => sm.profitMarginPct },
        { header: 'Customers Handled', accessor: (sm) => sm.customersHandledCount || sm.customersList?.length || 1 },
      ]);
    }

    if (success) {
      setSuccessMsg('Profit report exported to Excel / CSV successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const summary = reportData?.summary || {
    totalSalesVolume: 0,
    totalSalesBeforeTax: 0,
    totalSalesTaxCollected: 0,
    totalCostOfGoods: 0,
    totalInputTaxPaid: 0,
    totalCostWithTax: 0,
    totalGrossProfit: 0,
    profitWithoutTax: 0,
    profitWithTax: 0,
    netVatPayable: 0,
    totalDiscountsGiven: 0,
    totalNetProfit: 0,
    overallMarginPct: 0,
    totalBillsCount: 0,
    totalQtySold: 0,
    totalCtnSold: 0,
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & TIME FILTER BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Profit Intelligence Reports Hub
                  <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Comprehensive Margin Analysis
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated cost-to-sale margin analysis per item, per sale bill, per restaurant client, and per salesman.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'year', label: 'This Year' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  applyDatePreset(preset.id as any);
                  setTimeout(loadProfitData, 50);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer ml-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Date Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-800/80 items-center">
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400">From Date</label>
              {fromDate && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setActiveDatePreset('custom');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400">To Date</label>
              {toDate && (
                <button
                  type="button"
                  onClick={() => {
                    setToDate('');
                    setActiveDatePreset('custom');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, bill#, customer, salesman..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 self-end">
            <button
              onClick={loadProfitData}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Calculating...' : 'Apply Filters'}</span>
            </button>
          </div>
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

      {/* ------------------------------------------------------------- */}
      {/* SUMMARY KPI CARDS & TAX INTELLIGENCE PANEL                    */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Primary Financial Margins & Dual Profit Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Realized Business Profit */}
        <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-2 border-emerald-500/70 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
              Net Realized Profit
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              Business Profit
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <span>{currencySymbol()} {(summary.totalNetProfit ?? summary.totalGrossProfit).toLocaleString()}</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Sale incl. VAT ({currencySymbol()} {summary.totalSalesVolume.toLocaleString()}) - Purchase Cost incl. VAT ({currencySymbol()} {(summary.totalCostWithTax || summary.totalCostOfGoods || 0).toLocaleString()}){(summary.totalDiscountsGiven || 0) > 0 ? ` - Discounts (${currencySymbol()} ${(summary.totalDiscountsGiven || 0).toLocaleString()})` : ''}
          </div>
          <div className="text-[10px] text-emerald-400/90 mt-0.5 font-semibold">
            Margin: {summary.overallMarginPct}% • Sold: {summary.totalCtnSold || 0} CTN + {summary.totalQtySold || 0} QTY
          </div>
        </div>

        {/* Customer VAT Collected (Separated from Profit) */}
        <div className="bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-500/50 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide">
              Sales Output VAT
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
              Included in Profit
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-cyan-300 mt-1">
            {currencySymbol()} {(summary.totalSalesTaxCollected ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            5% Output Tax collected on customer bills (Added into profit)
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5">
            Net VAT Payable to FTA: {currencySymbol()} {(summary.netVatPayable ?? 0).toLocaleString()}
          </div>
        </div>

        {/* Product Sales + Tax Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Sales Revenue + Tax</span>
            <span className="text-indigo-400 text-[10px] font-bold">Gross Sales</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
            {currencySymbol()} {summary.totalSalesVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Sale without tax:</span>
              <span className="font-semibold text-white">{currencySymbol()} {(summary.totalSalesBeforeTax ?? summary.totalSalesVolume).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-teal-400">
              <span>+ Output VAT (5%):</span>
              <span className="font-bold">{currencySymbol()} {(summary.totalSalesTaxCollected ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Cost of Goods + Tax Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Cost of Goods + Tax</span>
            <span className="text-amber-400 text-[10px] font-bold">Total COGS</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-200 mt-1">
            {currencySymbol()} {(summary.totalCostWithTax ?? summary.totalCostOfGoods).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Cost without tax:</span>
              <span className="font-semibold text-white">{currencySymbol()} {summary.totalCostOfGoods.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>+ Input Tax Paid:</span>
              <span className="font-bold">{currencySymbol()} {(summary.totalInputTaxPaid ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tax Authority Position Card (Net VAT Payable/Receivable) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-200">
            Tax Authority Position:
          </span>
          <span className="text-slate-400">
            Collected Output Tax ({currencySymbol()} {(summary.totalSalesTaxCollected ?? 0).toLocaleString()}) - Paid Input Tax ({currencySymbol()} {(summary.totalInputTaxPaid ?? 0).toLocaleString()})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Net VAT Payable to Govt</span>
            <span className={`font-mono font-bold text-sm ${
              (summary.netVatPayable ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {currencySymbol()} {Math.abs(summary.netVatPayable ?? 0).toLocaleString()} {(summary.netVatPayable ?? 0) >= 0 ? '(Payable)' : '(Refundable)'}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Discounts Given</span>
            <span className="font-mono font-bold text-sm text-rose-400">
              -{currencySymbol()} {summary.totalDiscountsGiven.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4 CORE SUB-TABS (Per Item, Per Bill, Per Restaurant, Salesman) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Navigation Tabs */}
        <div className="px-4 pt-3 bg-slate-950 border-b border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('perItem')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perItem'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. Profit Per Item</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perBill')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perBill'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Profit Per Bill</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredBills.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perRestaurant')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perRestaurant'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>3. Profit Per Customer</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredRestaurants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('perSalesman')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'perSalesman'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>4. Profit Per Salesman</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredSalesmen.length}
            </span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MASTER CROSS-FILTER TOOLBAR                                   */}
        {/* (Item, Salesman, Customer, Bill, Margin Status, Live Search)  */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 items-end">
            {/* 1. Item Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Item Filter</span>
              </label>
              <select
                value={itemSelectFilter}
                onChange={(e) => setItemSelectFilter(e.target.value)}
                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer ${
                  itemSelectFilter !== 'ALL'
                    ? 'border-emerald-500 bg-emerald-950/40 font-bold text-emerald-300 shadow-xs'
                    : 'border-slate-700'
                }`}
              >
                <option value="ALL">All Items ({itemOptions.length})</option>
                {itemOptions.map((opt) => (
                  <option key={opt.mcode} value={opt.mcode}>
                    {opt.title} ({opt.mcode})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Salesman Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>2. Salesman</span>
              </label>
              <select
                value={salesmanSelectFilter}
                onChange={(e) => setSalesmanSelectFilter(e.target.value)}
                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer ${
                  salesmanSelectFilter !== 'ALL'
                    ? 'border-teal-500 bg-teal-950/40 font-bold text-teal-300 shadow-xs'
                    : 'border-slate-700'
                }`}
              >
                <option value="ALL">All Salesmen ({salesmanOptions.length})</option>
                {salesmanOptions.map((sm) => (
                  <option key={sm} value={sm}>
                    {sm}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Customer Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                <span>3. Customer</span>
              </label>
              <select
                value={customerSelectFilter}
                onChange={(e) => setCustomerSelectFilter(e.target.value)}
                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer ${
                  customerSelectFilter !== 'ALL'
                    ? 'border-indigo-500 bg-indigo-950/40 font-bold text-indigo-300 shadow-xs'
                    : 'border-slate-700'
                }`}
              >
                <option value="ALL">All Customers ({customerOptions.length})</option>
                {customerOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Bill Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Bill #</span>
              </label>
              <select
                value={billSelectFilter}
                onChange={(e) => setBillSelectFilter(e.target.value)}
                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer ${
                  billSelectFilter !== 'ALL'
                    ? 'border-amber-500 bg-amber-950/40 font-bold text-amber-300 shadow-xs'
                    : 'border-slate-700'
                }`}
              >
                <option value="ALL">All Bills ({billOptions.length})</option>
                {billOptions.map((b) => (
                  <option key={b} value={b}>
                    Bill #{b}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Margin Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <span>5. Margin Status</span>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer ${
                  statusFilter !== 'ALL'
                    ? 'border-sky-500 bg-sky-950/40 font-bold text-sky-300 shadow-xs'
                    : 'border-slate-700'
                }`}
              >
                <option value="ALL">All Margins</option>
                <option value="PROFITABLE">Profitable Only</option>
                <option value="LOW_MARGIN">Low Margin &lt;10%</option>
                <option value="LOSS">Loss Making</option>
              </select>
            </div>

            {/* 6. Live Search Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Live Search</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={liveSearch}
                  onChange={(e) => setLiveSearch(e.target.value)}
                  placeholder={
                    activeTab === 'perItem'
                      ? 'Search item title, SKU...'
                      : activeTab === 'perBill'
                      ? 'Search bill#, customer...'
                      : activeTab === 'perRestaurant'
                      ? 'Search customer, city...'
                      : 'Search salesman...'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                {liveSearch && (
                  <button
                    onClick={() => setLiveSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Badges & Reset Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Active Filter:</span>
              {!hasActiveFilters ? (
                <span className="text-[11px] text-slate-500 italic">None (All records active)</span>
              ) : (
                <>
                  {itemSelectFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[11px] font-medium">
                      <span>Item: {itemOptions.find((o) => o.mcode === itemSelectFilter)?.title || itemSelectFilter}</span>
                      <button onClick={() => setItemSelectFilter('ALL')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {salesmanSelectFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-700/60 text-[11px] font-medium">
                      <span>Salesman: {salesmanSelectFilter}</span>
                      <button onClick={() => setSalesmanSelectFilter('ALL')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {customerSelectFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 text-[11px] font-medium">
                      <span>Customer: {customerSelectFilter}</span>
                      <button onClick={() => setCustomerSelectFilter('ALL')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {billSelectFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[11px] font-medium">
                      <span>Bill: #{billSelectFilter}</span>
                      <button onClick={() => setBillSelectFilter('ALL')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {statusFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-700/60 text-[11px] font-medium">
                      <span>Status: {statusFilter}</span>
                      <button onClick={() => setStatusFilter('ALL')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {liveSearch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                      <span>Search: "{liveSearch}"</span>
                      <button onClick={() => setLiveSearch('')} className="hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={resetAllFilters}
                    className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 text-[11px] font-bold cursor-pointer transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                </>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {activeTab === 'perItem' && (
                <span>
                  Showing <strong className="text-emerald-400 font-bold">{filteredItems.length}</strong> items (of{' '}
                  {reportData?.perItem?.length || 0})
                </span>
              )}
              {activeTab === 'perBill' && (
                <span>
                  Showing <strong className="text-emerald-400 font-bold">{filteredBills.length}</strong> bills (of{' '}
                  {reportData?.perBill?.length || 0})
                </span>
              )}
              {activeTab === 'perRestaurant' && (
                <span>
                  Showing <strong className="text-emerald-400 font-bold">{filteredRestaurants.length}</strong> customers (of{' '}
                  {reportData?.perRestaurant?.length || 0})
                </span>
              )}
              {activeTab === 'perSalesman' && (
                <span>
                  Showing <strong className="text-emerald-400 font-bold">{filteredSalesmen.length}</strong> salesmen (of{' '}
                  {reportData?.perSalesman?.length || 0})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* TAB 1: PROFIT PER ITEM                                      */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perItem' && (
          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">M.Code</th>
                    <th className="py-2.5 px-3">Item Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">Avg Sale Rate</th>
                    <th className="py-2.5 px-3 text-right">Sale Rev (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">Sales VAT</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">COGS (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">In Stock / Warehouse</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-slate-500 font-sans">
                        No sales or profit records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it, idx) => {
                      const netP = it.netProfit !== undefined ? it.netProfit : it.grossProfit;
                      const hasMultipleTiers = it.rateTiers && it.rateTiers.length > 1;

                      if (hasMultipleTiers && it.rateTiers) {
                        return (
                          <React.Fragment key={idx}>
                            {/* Individual Distinct Rate & VAT Tier Rows */}
                            {it.rateTiers.map((tier, tIdx) => (
                              <tr key={`tier-${idx}-${tIdx}`} className="hover:bg-slate-800/40 transition bg-slate-900/30">
                                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{it.mcode}</td>
                                <td className="py-2 px-3 font-sans">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 text-xs">↳</span>
                                      <span className="font-semibold text-slate-200">{it.itemTitle}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                                        Rate: {currencySymbol()} {tier.rate} / {tier.unitLabel}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 font-mono">
                                        VAT: {tier.vatPercent}%
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-sans">
                                        ({tier.billsCount} {tier.billsCount === 1 ? 'sale' : 'sales'})
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-400">{it.category}</td>
                                <td className="py-2 px-3 text-center text-slate-300 font-mono">{tier.ctnSold > 0 ? tier.ctnSold : '—'}</td>
                                <td className="py-2 px-3 text-center text-white font-bold font-mono">{tier.qtySold > 0 ? tier.qtySold : '—'}</td>
                                <td className="py-2 px-3 text-right text-slate-400 font-mono">{currencySymbol()} {tier.avgPurchaseRate.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right text-indigo-300 font-bold font-mono">{currencySymbol()} {tier.rate.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-bold text-white font-mono">
                                  <div>{currencySymbol()} {(tier.totalRevenueWithVat ?? (tier.totalRevenue + tier.totalVatAmount)).toLocaleString()}</div>
                                  <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {tier.totalRevenue.toLocaleString()}</div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    +{currencySymbol()} {tier.totalVatAmount.toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-amber-400 font-semibold font-mono">
                                  {tier.totalDiscountAmount > 0 ? `-${currencySymbol()} ${tier.totalDiscountAmount.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-300 font-mono">
                                  <div className="font-bold text-slate-200">{currencySymbol()} {tier.totalCostOfGoods.toLocaleString()}</div>
                                  <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {Number((tier.totalCostOfGoods / 1.05).toFixed(2)).toLocaleString()}</div>
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-xs font-mono">
                                  <span className={`px-2 py-0.5 rounded border inline-block ${
                                    tier.netProfit >= 0
                                      ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                                      : 'bg-rose-950/80 border-rose-700/60 text-rose-400'
                                  }`}>
                                    {tier.netProfit >= 0 ? '+' : ''}{currencySymbol()} {tier.netProfit.toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-bold font-mono">
                                  <span className={tier.profitMarginPct >= 15 ? 'text-emerald-400' : tier.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                                    {tier.profitMarginPct}%
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center text-slate-500 font-mono text-[10px]">
                                  Rate Tier
                                </td>
                                <td className="py-2 px-3 text-center font-sans">
                                  <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[9.5px] font-bold">
                                    Tier
                                  </span>
                                </td>
                              </tr>
                            ))}

                            {/* ITEM COMBINED TOTAL ROW */}
                            <tr key={`total-${idx}`} className="bg-emerald-950/35 border-y-2 border-emerald-500/60 hover:bg-emerald-950/50 transition">
                              <td className="py-2.5 px-3 text-slate-300 font-mono font-bold">{it.mcode}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white tracking-wider uppercase shadow-xs">
                                    ITEM TOTAL
                                  </span>
                                  <span className="font-extrabold text-white text-xs">{it.itemTitle}</span>
                                  <span className="text-[10px] text-emerald-400 font-sans font-semibold">
                                    ({it.rateTiers.length} Rates &amp; VAT Combined)
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-300 font-bold">{it.category}</td>
                              <td className="py-2.5 px-3 text-center text-emerald-300 font-extrabold font-mono">{it.ctnSold}</td>
                              <td className="py-2.5 px-3 text-center text-white font-extrabold font-mono">{it.qtySold}</td>
                              <td className="py-2.5 px-3 text-right text-slate-300 font-mono font-bold">{currencySymbol()} {it.avgPurchaseRate.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right text-slate-200 font-mono font-bold">
                                {currencySymbol()} {it.avgSaleRate.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">(Avg)</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-white font-mono">
                                <div>{currencySymbol()} {(it.totalRevenueWithVat ?? (it.totalRevenue + (it.totalVatAmount || 0))).toLocaleString()}</div>
                                <div className="text-[10px] text-emerald-400/80 font-normal font-sans">Ex-VAT: {currencySymbol()} {it.totalRevenue.toLocaleString()}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                <span className="text-[11px] text-emerald-300 font-black">
                                  +{currencySymbol()} {(it.totalVatAmount || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-400 font-bold font-mono">
                                {(it.totalDiscountAmount || 0) > 0 ? `-${currencySymbol()} ${(it.totalDiscountAmount || 0).toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-300 font-mono font-bold">
                                <div className="font-bold text-white">{currencySymbol()} {it.totalCostOfGoods.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {Number((it.totalCostOfGoods / 1.05).toFixed(2)).toLocaleString()}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-300 text-sm font-mono">
                                <span className={`px-2.5 py-1 rounded border inline-block shadow-sm font-black ${
                                  netP >= 0
                                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                                    : 'bg-rose-950 border-rose-600 text-rose-300'
                                }`}>
                                  {netP >= 0 ? '+' : ''}{currencySymbol()} {netP.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black font-mono">
                                <span className={it.profitMarginPct >= 15 ? 'text-emerald-400' : it.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                                  {it.profitMarginPct}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  it.currentRemainingStock <= 10 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-200'
                                }`}>
                                  {it.currentRemainingStock} ({it.currentStockCartons} Ctn)
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-sans">
                                {it.status === 'PROFITABLE' && (
                                  <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                                    Profitable
                                  </span>
                                )}
                                {it.status === 'LOW_MARGIN' && (
                                  <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                                    Low Margin
                                  </span>
                                )}
                                {it.status === 'LOSS' && (
                                  <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                                    Loss
                                  </span>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      }

                      // Single rate tier or standard row
                      const singleTier = it.rateTiers && it.rateTiers.length === 1 ? it.rateTiers[0] : null;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 text-slate-400">{it.mcode}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">{it.itemTitle}</span>
                              {singleTier && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 font-mono">
                                  Rate: {currencySymbol()} {singleTier.rate} / {singleTier.unitLabel} &bull; VAT: {singleTier.vatPercent}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">{it.category}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{it.ctnSold}</td>
                          <td className="py-2.5 px-3 text-center text-white font-bold">{it.qtySold}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">{currencySymbol()} {it.avgPurchaseRate.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-slate-200">{currencySymbol()} {it.avgSaleRate.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                              <div>{currencySymbol()} {(it.totalRevenueWithVat ?? (it.totalRevenue + (it.totalVatAmount || 0))).toLocaleString()}</div>
                              <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {it.totalRevenue.toLocaleString()}</div>
                            </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            <span className="text-[11px] text-slate-400 font-medium">
                              +{currencySymbol()} {(it.totalVatAmount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                            {(it.totalDiscountAmount || 0) > 0 ? `-${currencySymbol()} ${(it.totalDiscountAmount || 0).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                              <div className="font-bold text-slate-200">{currencySymbol()} {it.totalCostOfGoods.toLocaleString()}</div>
                              <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {Number((it.totalCostOfGoods / 1.05).toFixed(2)).toLocaleString()}</div>
                            </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-400 text-sm">
                            <span className={`px-2 py-0.5 rounded border inline-block shadow-sm ${
                              netP >= 0
                                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                                : 'bg-rose-950/80 border-rose-700/60 text-rose-400'
                            }`}>
                              {netP >= 0 ? '+' : ''}{currencySymbol()} {netP.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            <span className={it.profitMarginPct >= 15 ? 'text-emerald-400' : it.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                              {it.profitMarginPct}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              it.currentRemainingStock <= 10 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-200'
                            }`}>
                              {it.currentRemainingStock} ({it.currentStockCartons} Ctn)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {it.status === 'PROFITABLE' && (
                              <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                                Profitable
                              </span>
                            )}
                            {it.status === 'LOW_MARGIN' && (
                              <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                                Low Margin
                              </span>
                            )}
                            {it.status === 'LOSS' && (
                              <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                                Loss
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 2: PROFIT PER BILL                                      */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perBill' && (
          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Bill#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer / Restaurant</th>
                    <th className="py-2.5 px-3">Salesman</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-right">Gross Total (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Net Total (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">COGS (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">Bill Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-slate-500 font-sans">
                        No sales bills found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.billId} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-bold text-white">#{b.billNumber}</td>
                        <td className="py-2.5 px-3 text-slate-400">{b.date}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-200">
                          {b.customerAccountTitle}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{b.salesmanName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{b.itemsCount}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{b.totalCtn}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          <div className="font-bold text-white">{currencySymbol()} {(b.grossAmountWithVat ?? (b.netTotal + b.billDiscount)).toLocaleString()}</div>
                          <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {b.grossAmount.toLocaleString()}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-400">
                          {b.billDiscount > 0 ? `-${currencySymbol()} ${b.billDiscount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{currencySymbol()} {b.netTotal.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                          <div className="font-bold text-slate-200">{currencySymbol()} {b.costOfGoods.toLocaleString()}</div>
                          <div className="text-[9.5px] text-slate-400 font-normal font-sans">Ex-VAT: {currencySymbol()} {Number((b.costOfGoods / 1.05).toFixed(2)).toLocaleString()}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {currencySymbol()} {b.netProfit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={b.profitMarginPct >= 15 ? 'text-emerald-400' : b.profitMarginPct > 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {b.profitMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <button
                            onClick={() => {
                              // Reconstruct SaleBill for modal
                              const fullBill: SaleBill = {
                                id: b.billId,
                                billNumber: b.billNumber,
                                date: b.date,
                                customerId: b.customerId,
                                customerAccountTitle: b.customerAccountTitle,
                                salesmanName: b.salesmanName,
                                paymentType: 'Account',
                                discountType: 'Amount',
                                items: b.items,
                                totalCtn: b.totalCtn,
                                totalQty: b.totalQty,
                                billDiscountPercent: 0,
                                billDiscountAmount: b.billDiscount,
                                totalDiscount: b.billDiscount,
                                totalVatAmount: b.vatAmount,
                                grossAmount: b.grossAmount,
                                netTotal: b.netTotal,
                                cashReceived: 0,
                                balanceReceivable: b.netTotal,
                                changeGiven: 0,
                                balanceRecovered: false,
                                balanceRecoveredAmount: 0,
                                amountReceivable: b.netTotal,
                                status: 'Completed',
                                createdAt: new Date().toISOString(),
                              };
                              setSelectedBillForReceipt(fullBill);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>View / Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 3: PROFIT PER RESTAURANT / CUSTOMER                     */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perRestaurant' && (
          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Customer / Restaurant</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3 text-center">Bills Count</th>
                    <th className="py-2.5 px-3 text-center">Cartons</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Total Sale (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">COGS (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">Customer Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-right">Ledger Udhaar (Bal)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                        No customer sales data available.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          <div>{r.accountTitle}</div>
                          {r.mobile && <span className="text-[10px] text-slate-500 font-mono font-normal">Mob: {r.mobile}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{r.customerGroup}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{r.city}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{r.billsCount}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{r.totalCtn}</td>
                        <td className="py-2.5 px-3 text-center text-white font-bold">{r.totalQty}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {currencySymbol()} {r.totalSalesVolume.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {currencySymbol()} {r.totalCostOfGoods.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {currencySymbol()} {r.grossProfit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={r.profitMarginPct >= 15 ? 'text-emerald-400' : 'text-amber-400'}>
                            {r.profitMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={r.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {currencySymbol()} {r.outstandingBalance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {r.status === 'HEALTHY' && (
                            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                              Profitable
                            </span>
                          )}
                          {r.status === 'PENDING_COLLECTION' && (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                              Collect Udhaar
                            </span>
                          )}
                          {r.status === 'LOSS' && (
                            <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                              Loss Making
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 4: PROFIT PER SALESMAN                                  */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'perSalesman' && (
          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Salesman Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3 text-center">Bills Made</th>
                    <th className="py-2.5 px-3 text-center">Cartons Sold</th>
                    <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Sale (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right">COGS (Incl. VAT)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">Salesman Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Customers Handled (Hover)</th>
                    <th className="py-2.5 px-3 text-center">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredSalesmen.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                        No salesman activity logged.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesmen.map((sm, idx) => {
                      const contributionPct = Number(summary.totalGrossProfit) > 0 && !isNaN(Number(sm.totalProfit))
                        ? Number(((Number(sm.totalProfit) / Number(summary.totalGrossProfit)) * 100).toFixed(1)) || 0
                        : 0;

                      const count = sm.customersHandledCount || sm.customersList?.length || 1;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{sm.salesmanName}</span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">{sm.designation || 'Sales Representative'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{sm.contactNo || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{sm.billsCount}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{sm.totalCtnSold}</td>
                          <td className="py-2.5 px-3 text-center text-white font-bold">{sm.totalQtySold}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {currencySymbol()} {sm.totalSalesVolume.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {currencySymbol()} {sm.totalCostOfGoods.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {currencySymbol()} {sm.totalProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            {sm.profitMarginPct}%
                          </td>
                          {/* Customers Handled Button (Clear & Floating Above All UI) */}
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              type="button"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopoverSalesman({
                                  sm,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (popoverSalesman?.sm.salesmanName === sm.salesmanName) {
                                  setPopoverSalesman(null);
                                } else {
                                  setPopoverSalesman({
                                    sm,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 hover:text-white hover:bg-emerald-800 text-[11px] font-bold cursor-pointer transition shadow-xs"
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{count} Customers</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                              {contributionPct}% of profit
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Popover on Top of All UI (Never Hidden Behind Tables) */}
      {popoverSalesman && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 350, Math.max(16, popoverSalesman.x - 170))}px`,
            top: popoverSalesman.y < 360 ? `${popoverSalesman.y + 36}px` : `${popoverSalesman.y - 10}px`,
            transform: popoverSalesman.y < 360 ? 'none' : 'translateY(-100%)',
          }}
          className="w-84 max-w-[95vw] bg-slate-900/98 backdrop-blur-md border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 z-[99999] text-left animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-black">{popoverSalesman.sm.salesmanName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-700">
                {popoverSalesman.sm.customersHandledCount || popoverSalesman.sm.customersList?.length || 1} Handled
              </span>
              <button
                type="button"
                onClick={() => setPopoverSalesman(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="py-2.5 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Total Sales Volume:</span>
              <span className="font-bold text-white font-mono">{currencySymbol()} {popoverSalesman.sm.totalSalesVolume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Total Net Profit Contribution:</span>
              <span className="font-mono text-sm">+{currencySymbol()} {popoverSalesman.sm.totalProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Average Profit Margin:</span>
              <span className="text-amber-300 font-bold font-mono">{popoverSalesman.sm.profitMarginPct}%</span>
            </div>
          </div>

          {popoverSalesman.sm.customersList && popoverSalesman.sm.customersList.length > 0 && (
            <div className="pt-2.5 border-t border-slate-800 text-xs">
              <span className="text-slate-300 font-bold block mb-1.5 text-[11px]">
                Customers Handled &amp; Profit Breakdown:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {popoverSalesman.sm.customersList.map((c, cIdx) => (
                  <div key={cIdx} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate text-xs">{c.customerTitle}</div>
                      <div className="text-slate-400 text-[10px]">{c.billsCount} bill(s) &bull; Sales: {currencySymbol()} {c.totalSales.toLocaleString()}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="text-emerald-400 font-bold block text-xs">+{currencySymbol()} {c.profit.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 font-sans">Profit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bill Receipt Modal */}
      {selectedBillForReceipt && (
        <SalesBillReceiptModal
          bill={selectedBillForReceipt}
          onClose={() => setSelectedBillForReceipt(null)}
        />
      )}
    </div>
  );
};
