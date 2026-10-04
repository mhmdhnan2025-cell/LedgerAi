import { currencySymbol } from '../utils/currency';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Building2,
  Trash2,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
  ChevronDown,
  X,
  CreditCard,
  Truck,
  ShieldCheck,
  Percent,
  Save,
  ArrowRight,
  Users,
  DollarSign,
  Layers,
  TrendingUp,
  AlertTriangle,
  Info,
  Settings,
} from 'lucide-react';
import {
  Customer,
  Product,
  SaleBill,
  SaleBillItem,
  UserRole,
  CompanyProfile,
  User,
} from '../types';
import { api } from '../services/api';
import { SalesBillReceiptModal } from './SalesBillReceiptModal';
import { AddItemHeadModal } from './AddItemHeadModal';

interface SalesViewProps {
  products: Product[];
  currentRole: UserRole;
  companyProfile?: CompanyProfile | null;
  currentUser?: User | null;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products,
  currentRole,
  companyProfile,
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  // Master states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [newSalesmanInput, setNewSalesmanInput] = useState('');
  const [showAddSalesman, setShowAddSalesman] = useState(false);

  // Status and messages
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printedBill, setPrintedBill] = useState<SaleBill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Header State
  const [discountType, setDiscountType] = useState<'Percentage' | 'Amount'>('Percentage');
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState<string>('1001');
  const [lpoNo, setLpoNo] = useState<string>('');

  // Customer / Account
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerAccountTitle, setCustomerAccountTitle] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerTrn, setCustomerTrn] = useState<string>('');
  const [partyBalanceBefore, setPartyBalanceBefore] = useState<number>(0);
  const [isCashCustomer, setIsCashCustomer] = useState<boolean>(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Salesman & User
  const [selectedSalesman, setSelectedSalesman] = useState<string>('');
  const [userName, setUserName] = useState<string>(() => currentUser?.name || 'Admin');
  const [paymentType, setPaymentType] = useState<'Account' | 'Cash' | 'Card'>('Account');

  // Keep userName synced with active logged-in user
  useEffect(() => {
    if (currentUser?.name) {
      setUserName(currentUser.name);
    }
  }, [currentUser?.name]);

  // Line Item Entry State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemTitle, setItemTitle] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>('General');
  const [itemMCode, setItemMCode] = useState<string>('');
  const [itemPackageType, setItemPackageType] = useState<string>('Carton');
  const [ctn, setCtn] = useState<number | ''>(1);
  const [ratePerCtn, setRatePerCtn] = useState<number | ''>('');
  const [qtyPerCtn, setQtyPerCtn] = useState<number | ''>(1);
  const [qty, setQty] = useState<number | ''>(1);
  const [rate, setRate] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [vatPercent, setVatPercent] = useState<number | ''>(5);
  const [itemStock, setItemStock] = useState<number>(0);

  // Quick add item modal & masters
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);

  // Live item search dropdown
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const [itemDropdownStyle, setItemDropdownStyle] = useState<React.CSSProperties>({});

  // Floating dropdown positioning effect
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (isItemDropdownOpen && itemInputRef.current) {
        const rect = itemInputRef.current.getBoundingClientRect();
        setItemDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
          width: Math.max(340, rect.width * 1.3),
          zIndex: 99999,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isItemDropdownOpen]);

  // Focus references
  const itemInputRef = useRef<HTMLInputElement>(null);
  const ctnInputRef = useRef<HTMLInputElement>(null);
  const ratePerCtnInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Added Bill Items Table
  const [billItems, setBillItems] = useState<SaleBillItem[]>([]);

  // Bottom section
  const [billDiscountPercent, setBillDiscountPercent] = useState<number | ''>(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState<number | ''>(0);
  const [cashReceived, setCashReceived] = useState<number | ''>(0);
  const [balanceRecovered, setBalanceRecovered] = useState<boolean>(false);
  const [balanceRecoveredAmount, setBalanceRecoveredAmount] = useState<number | ''>(0);
  const [notes, setNotes] = useState<string>('Terms and Condition..');

  // Load customers
  const loadCustomersData = async () => {
    try {
      const list = await api.getCustomers();
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        // Select first customer by default
        setSelectedCustomerId(list[0].id);
        setCustomerAccountTitle(list[0].accountTitle || list[0].name);
        setCustomerMobile(list[0].mobile || '');
        setCustomerTrn(list[0].trn || '');
        setPartyBalanceBefore(list[0].outstandingBalance || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load real salesmen from database
  const loadSalesmenData = async () => {
    try {
      const list = await api.getSalesmen();
      if (list && list.length > 0) {
        setSalesmen(list);
        if (!selectedSalesman || !list.includes(selectedSalesman)) {
          setSelectedSalesman(list[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Determine next sequential bill number
  const loadNextBillNumber = async () => {
    try {
      const sales = await api.getSales();
      if (sales && sales.length > 0) {
        const nums = sales.map((s) => parseInt(s.billNumber, 10)).filter((n) => !isNaN(n));
        const maxN = nums.length > 0 ? Math.max(...nums) : 1000;
        setBillNumber(String(maxN + 1));
      } else {
        setBillNumber('1001');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMasters = async () => {
    try {
      const [cats, brs, msrs] = await Promise.all([
        api.getItemCategories().catch(() => []),
        api.getItemBrands().catch(() => []),
        api.getItemMeasures().catch(() => []),
      ]);
      setCategories(cats);
      setBrands(brs);
      setMeasures(msrs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCustomersData();
    loadSalesmenData();
    loadNextBillNumber();
    fetchMasters();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Customer selection helper
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerAccountTitle(cust.accountTitle || cust.name);
    setCustomerMobile(cust.mobile || '');
    setCustomerTrn(cust.trn || '');
    setPartyBalanceBefore(cust.outstandingBalance || 0);
    setIsCashCustomer(false);
    setIsCustomerDropdownOpen(false);
  };

  // Handle cash customer toggle
  const handleToggleCash = (checked: boolean) => {
    setIsCashCustomer(checked);
    if (checked) {
      setSelectedCustomerId('cash');
      setCustomerAccountTitle('Cash Customer');
      setCustomerMobile('');
      setCustomerTrn('');
      setPartyBalanceBefore(0);
      setPaymentType('Cash');
    } else {
      if (customers.length > 0) {
        handleSelectCustomer(customers[0]);
      }
      setPaymentType('Account');
    }
  };

  // Select Item helper
  const handleSelectItem = (prod: Product) => {
    setSelectedProductId(prod.id);
    setItemTitle(prod.name);
    setItemCategory(prod.category || 'General');
    setItemMCode(prod.mcode || prod.sku || '');
    const rawStock = prod.totalStock !== undefined ? prod.totalStock : (prod.currentQuantity || 0);
    setItemStock(Number(rawStock) || 0);

    const detectedPkg = prod.packageType || (
      `${prod.category || ''} ${prod.measure || ''}`.toLowerCase().includes('bag') ? 'Bag' :
      `${prod.category || ''} ${prod.measure || ''}`.toLowerCase().includes('box') ? 'Box' :
      `${prod.category || ''} ${prod.measure || ''}`.toLowerCase().includes('tin') ? 'Tin' :
      `${prod.category || ''} ${prod.measure || ''}`.toLowerCase().includes('pack') ? 'Pack' :
      'Carton'
    );
    setItemPackageType(detectedPkg);

    const sellPrice = prod.sellingPrice || prod.salePrice || 0;
    setRate(sellPrice);

    const qPerCtn = prod.qtyInCarton || 1;
    setQtyPerCtn(qPerCtn);
    const rateCtn = prod.ctnSaleRate || Number((sellPrice * qPerCtn).toFixed(2));
    setRatePerCtn(rateCtn);

    const c = typeof ctn === 'number' && ctn > 0 ? ctn : 1;
    setQty(Number((c * qPerCtn).toFixed(2)));

    setIsItemDropdownOpen(false);
    if (ctnInputRef.current) {
      ctnInputRef.current.focus();
    }
  };

  // Sync CTN and Qty
  const handleCtnChange = (val: number | '') => {
    setCtn(val);
    if (typeof val === 'number') {
      const qpc = typeof qtyPerCtn === 'number' && qtyPerCtn > 0 ? qtyPerCtn : 1;
      setQty(Number((val * qpc).toFixed(2)));
      if (typeof rate === 'number' && rate > 0) {
        setRatePerCtn(Number((rate * qpc).toFixed(2)));
      }
    } else {
      setQty('');
    }
  };

  const handleRatePerCtnChange = (val: number | '') => {
    setRatePerCtn(val);
    if (typeof val === 'number') {
      const qpc = typeof qtyPerCtn === 'number' && qtyPerCtn > 0 ? qtyPerCtn : 1;
      const unitRate = Number((val / qpc).toFixed(2));
      setRate(unitRate);
    }
  };

  const handleQtyChange = (val: number | '') => {
    setQty(val);
    if (typeof val === 'number') {
      const qpc = typeof qtyPerCtn === 'number' && qtyPerCtn > 0 ? qtyPerCtn : 1;
      setCtn(Number((val / qpc).toFixed(2)));
    } else {
      setCtn('');
    }
  };

  const handleRateChange = (val: number | '') => {
    setRate(val);
    if (typeof val === 'number') {
      const qpc = typeof qtyPerCtn === 'number' && qtyPerCtn > 0 ? qtyPerCtn : 1;
      setRatePerCtn(Number((val * qpc).toFixed(2)));
    }
  };

  // Current row calculations
  const numericQty = typeof qty === 'number' ? qty : 0;
  const numericRate = typeof rate === 'number' ? rate : 0;
  const numericDiscount = typeof discount === 'number' ? discount : 0;
  const numericVatPercent = typeof vatPercent === 'number' ? vatPercent : 0;

  const currentItemGross = Math.max(0, numericQty * numericRate - numericDiscount);
  const currentItemVatAmount = Number(((currentItemGross * numericVatPercent) / 100).toFixed(2));
  const currentItemTotalAmount = Number((currentItemGross + currentItemVatAmount).toFixed(2));

  // Active product lookup for instant cost popup & margin intelligence
  const activeProduct = React.useMemo(() => {
    if (selectedProductId) {
      return products.find((p) => p.id === selectedProductId);
    }
    if (itemTitle.trim()) {
      return products.find(
        (p) =>
          p.name.toLowerCase() === itemTitle.toLowerCase().trim() ||
          (p.itemTitle && p.itemTitle.toLowerCase() === itemTitle.toLowerCase().trim())
      );
    }
    return null;
  }, [selectedProductId, itemTitle, products]);

  const unitPurchaseCost = activeProduct?.purchasePrice || activeProduct?.averagePurchaseCost || activeProduct?.lastPurchasePrice || 0;
  const ctnPurchaseCost = activeProduct?.ctnPurchaseRate || (unitPurchaseCost * (activeProduct?.qtyInCarton || 1));
  const expectedProfitPerUnit = numericRate > 0 && unitPurchaseCost > 0 ? Number((numericRate - unitPurchaseCost).toFixed(2)) : 0;
  const expectedTotalLineProfit = numericQty > 0 ? Number((expectedProfitPerUnit * numericQty).toFixed(2)) : 0;
  const expectedMarginPct = numericRate > 0 && unitPurchaseCost > 0 ? Number(((expectedProfitPerUnit / numericRate) * 100).toFixed(1)) : 0;
  const isSellingAtLoss = numericRate > 0 && unitPurchaseCost > 0 && numericRate < unitPurchaseCost;

  // Add Item to Bill
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemTitle.trim()) {
      setErrorMsg('Please select or type an item title.');
      return;
    }
    if (numericQty <= 0) {
      setErrorMsg('Item quantity must be greater than 0.');
      return;
    }
    if (numericRate <= 0) {
      setErrorMsg('Item rate must be greater than 0.');
      return;
    }

    // Calculate current item stock shortage
    const itemShortage = itemStock >= 0 && numericQty > itemStock ? Number((numericQty - itemStock).toFixed(1)) : 0;

    const newItem: SaleBillItem = {
      id: `sbi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: selectedProductId || undefined,
      itemTitle: itemTitle.trim(),
      category: itemCategory,
      mcode: itemMCode,
      packageType: itemPackageType,
      ctn: typeof ctn === 'number' ? ctn : 0,
      ratePerCtn: typeof ratePerCtn === 'number' ? ratePerCtn : 0,
      qtyPerCtn: typeof qtyPerCtn === 'number' ? qtyPerCtn : 1,
      qty: numericQty,
      rate: numericRate,
      discount: numericDiscount,
      vatPercent: numericVatPercent,
      vatAmount: currentItemVatAmount,
      amount: currentItemTotalAmount,
      stock: itemStock,
      remainingStock: Math.max(0, Number((itemStock - numericQty).toFixed(2))),
      unit: (activeProduct?.measure || activeProduct?.unit || '').toString().trim() || 'PCS',
    };

    setBillItems([...billItems, newItem]);

    // Reset line input
    setSelectedProductId('');
    setItemTitle('');
    setItemMCode('');
    setItemPackageType('Carton');
    setCtn(1);
    setRatePerCtn('');
    setQtyPerCtn(1);
    setQty(1);
    setRate('');
    setDiscount(0);
    setItemStock(0);
    setErrorMsg(null);

    // Re-focus on item search
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, idx) => idx !== index));
  };

  // Grand Totals Computation
  const computedTotalCtn = billItems.reduce((acc, it) => acc + (it.ctn || 0), 0);
  const computedTotalQty = billItems.reduce((acc, it) => acc + (it.qty || 0), 0);
  const computedGrossAmount = Number(
    billItems.reduce((acc, it) => acc + Math.max(0, it.qty * it.rate - (it.discount || 0)), 0).toFixed(2)
  );
  const computedTotalVat = Number(billItems.reduce((acc, it) => acc + (it.vatAmount || 0), 0).toFixed(2));
  const computedItemDiscounts = billItems.reduce((acc, it) => acc + (it.discount || 0), 0);

  // Bill-level discount
  let computedBillDiscountAmt = 0;
  if (discountType === 'Percentage') {
    const pct = typeof billDiscountPercent === 'number' ? billDiscountPercent : 0;
    computedBillDiscountAmt = Number(((computedGrossAmount * pct) / 100).toFixed(2));
  } else {
    computedBillDiscountAmt = typeof billDiscountAmount === 'number' ? billDiscountAmount : 0;
  }

  const computedTotalDiscount = Number((computedItemDiscounts + computedBillDiscountAmt).toFixed(2));
  const computedNetTotal = Math.max(
    0,
    Number((computedGrossAmount + computedTotalVat - computedBillDiscountAmt).toFixed(2))
  );

  const numericCashReceived = typeof cashReceived === 'number' ? cashReceived : 0;
  const computedBalanceReceivable = Math.max(0, Number((computedNetTotal - numericCashReceived).toFixed(2)));
  const computedChangeGiven = numericCashReceived > computedNetTotal ? Number((numericCashReceived - computedNetTotal).toFixed(2)) : 0;

  // Add new salesman helper
  const handleAddSalesman = () => {
    const val = newSalesmanInput.trim();
    if (val && !salesmen.includes(val)) {
      setSalesmen([...salesmen, val]);
      setSelectedSalesman(val);
      setNewSalesmanInput('');
      setShowAddSalesman(false);
    }
  };

  // -------------------------------------------------------------
  // SAVE SALES REPORT & DEDUCT INVENTORY
  // "jita stock yaha sale ho ga utni amout ka stock minus hojy ga invenrtu sy.
  // aur report save krny k baad sales ki. aur rport save hogi ja kr tab reports main
  // aik section hoga purchase report jis main purchase wali report aye aye gi aur aik
  // sale reporty hogi jaisi pic main hai."
  // -------------------------------------------------------------
  const handleSaveSaleReport = async () => {
    if (billItems.length === 0) {
      setErrorMsg('Please add at least one line item to the sale bill.');
      return;
    }
    if (!customerAccountTitle.trim()) {
      setErrorMsg('Please select a customer account or enter customer name.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: Partial<SaleBill> = {
        billNumber: billNumber.trim(),
        lpoNo: lpoNo.trim(),
        date: billDate,
        customerId: selectedCustomerId || 'cust-1',
        customerAccountTitle: customerAccountTitle.trim(),
        customerMobile: customerMobile.trim(),
        customerTrn: customerTrn.trim(),
        salesmanId: selectedSalesman,
        salesmanName: selectedSalesman,
        user: userName.trim() || currentUser?.name || 'Admin',
        partyBalanceBefore,
        paymentType,
        discountType,
        items: billItems,
        totalCtn: computedTotalCtn,
        totalQty: computedTotalQty,
        billDiscountPercent: typeof billDiscountPercent === 'number' ? billDiscountPercent : 0,
        billDiscountAmount: computedBillDiscountAmt,
        totalDiscount: computedTotalDiscount,
        totalVatAmount: computedTotalVat,
        grossAmount: computedGrossAmount,
        netTotal: computedNetTotal,
        cashReceived: numericCashReceived,
        balanceReceivable: computedBalanceReceivable,
        changeGiven: computedChangeGiven,
        balanceRecovered,
        balanceRecoveredAmount: typeof balanceRecoveredAmount === 'number' ? balanceRecoveredAmount : 0,
        amountReceivable: computedBalanceReceivable,
        notes,
      };

      const savedBill = await api.createSale(payload, {
        id: currentUser?.id || 'admin',
        name: userName.trim() || currentUser?.name || 'Admin',
        role: currentUser?.role || currentRole,
      });
      setPrintedBill(savedBill);
      setIsReceiptModalOpen(true);

      setSuccessMsg(
        `Sale Bill #${savedBill.billNumber} saved successfully! Real-time stock deducted from inventory. Customer invoice opened.`
      );

      // Trigger app-wide data reload
      if (onRefreshData) {
        onRefreshData();
      }

      // Reset form and increment bill number
      setBillItems([]);
      setCashReceived(0);
      setBillDiscountPercent(0);
      setBillDiscountAmount(0);
      const nextNum = (parseInt(billNumber, 10) || 6762) + 1;
      setBillNumber(String(nextNum));
      setLpoNo('');

      // Reload updated customer balance
      loadCustomersData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save sales report.');
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate Print / Preview Bill Modal
  const handlePreviewPrintBill = () => {
    if (billItems.length === 0) {
      setErrorMsg('Please add at least one line item to view / print receipt.');
      return;
    }
    const draftBill: SaleBill = {
      id: `draft-${billNumber}`,
      billNumber: billNumber.trim(),
      lpoNo: lpoNo.trim(),
      date: billDate,
      customerId: selectedCustomerId || 'cust-1',
      customerAccountTitle: customerAccountTitle.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(),
      customerTrn: customerTrn.trim(),
      salesmanId: selectedSalesman,
      salesmanName: selectedSalesman,
      user: userName.trim() || currentUser?.name || 'Admin',
      partyBalanceBefore,
      paymentType,
      discountType,
      items: billItems,
      totalCtn: computedTotalCtn,
      totalQty: computedTotalQty,
      billDiscountPercent: typeof billDiscountPercent === 'number' ? billDiscountPercent : 0,
      billDiscountAmount: computedBillDiscountAmt,
      totalDiscount: computedTotalDiscount,
      totalVatAmount: computedTotalVat,
      grossAmount: computedGrossAmount,
      netTotal: computedNetTotal,
      cashReceived: numericCashReceived,
      balanceReceivable: computedBalanceReceivable,
      changeGiven: computedChangeGiven,
      balanceRecovered,
      balanceRecoveredAmount: typeof balanceRecoveredAmount === 'number' ? balanceRecoveredAmount : 0,
      amountReceivable: computedBalanceReceivable,
      notes,
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };
    setPrintedBill(draftBill);
    setIsReceiptModalOpen(true);
  };

  // Filtered customers for live dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.accountTitle?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.code?.includes(customerSearchQuery) ||
      c.mobile?.includes(customerSearchQuery)
  );

  // Filtered products for line item dropdown
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(itemSearchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white">Sales &amp; POS Billing</h1>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
                  Stock Auto-Deduction Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Issue sales bills to restaurant customers, deduct warehouse inventory in real-time, and log reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewPrintBill}
              disabled={billItems.length === 0}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Preview and print customer receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill (طباعة)</span>
            </button>
            <button
              onClick={() => onNavigateTab && onNavigateTab('reports')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>View Sales Reports</span>
            </button>
            <button
              onClick={handleSaveSaleReport}
              disabled={isSaving || billItems.length === 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving & Deducting...' : 'Save Report (F10)'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            {printedBill && (
              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Print Bill / فاتورة</span>
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Invoice Metadata Row (Matching the Exact Visual Style in Image 1 & 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-4 text-xs">
          {/* Discount Type Radio / Toggle */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <label className="text-[11px] text-slate-400 font-semibold mb-1">Discount Type</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  checked={discountType === 'Percentage'}
                  onChange={() => setDiscountType('Percentage')}
                  className="accent-emerald-500"
                />
                <span>Percentage</span>
              </label>
              <label className="flex items-center gap-1 text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  checked={discountType === 'Amount'}
                  onChange={() => setDiscountType('Amount')}
                  className="accent-emerald-500"
                />
                <span>Amount</span>
              </label>
            </div>
          </div>

          {/* Bill Date */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Date (تاریخ الفاتورة)</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            />
          </div>

          {/* Bill Number */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Bill No</label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono font-bold text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* L.P.O Number (Customer Purchase Order) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">L.P.O No (رقم أمر الشراء)</label>
            <input
              type="text"
              value={lpoNo}
              onChange={(e) => setLpoNo(e.target.value)}
              placeholder="e.g. PO-99420"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Salesman Selection */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-semibold">Salesman</label>
              <button
                type="button"
                onClick={() => setShowAddSalesman(!showAddSalesman)}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                + Add
              </button>
            </div>
            <select
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-hidden focus:border-emerald-500"
            >
              {salesmen.map((sm) => (
                <option key={sm} value={sm}>
                  {sm}
                </option>
              ))}
            </select>
            {showAddSalesman && (
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  placeholder="Salesman name"
                  value={newSalesmanInput}
                  onChange={(e) => setNewSalesmanInput(e.target.value)}
                  className="w-full bg-slate-900 border border-emerald-500 rounded px-1.5 py-0.5 text-[10px] text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSalesman}
                  className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          {/* User Display */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">User (Active Account)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Active User"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-semibold text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Payment Type */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Payment</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-hidden focus:border-emerald-500 font-bold"
            >
              <option value="Account">On Account (Credit Khata)</option>
              <option value="Cash">Cash Sale</option>
              <option value="Card">Bank Card / Transfer</option>
            </select>
          </div>
        </div>

        {/* Customer Account Selection Row (Image 1 style) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mt-3 text-xs items-center">
          {/* Customer Dropdown */}
          <div className="sm:col-span-6 relative" ref={customerDropdownRef}>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block flex items-center justify-between">
              <span>Customer Account (Party)</span>
              <label className="flex items-center gap-1 text-[11px] text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCashCustomer}
                  onChange={(e) => handleToggleCash(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Walk-in / Cash</span>
              </label>
            </label>

            <div
              onClick={() => !isCashCustomer && setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
              className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                isCashCustomer ? 'opacity-80' : 'hover:border-emerald-500'
              }`}
            >
              <span className="font-bold text-white truncate">
                {customerAccountTitle || 'Select Customer Account...'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Dropdown Menu */}
            {isCustomerDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-72 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Title, Code, Mobile..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 pl-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-white">{c.accountTitle || c.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span className="font-mono text-orange-400">{c.code}</span>
                          <span>{c.customerGroup || 'General'}</span>
                          {c.mobile && <span>Ph: {c.mobile}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400 text-xs">
                          {currencySymbol()} {(c.outstandingBalance || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Balance Due</div>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-xs">No matching customers found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Customer Mobile */}
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Customer Mobile</label>
            <input
              type="text"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="050-1234567"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Customer TRN Number */}
          <div className="sm:col-span-2">
            <label className="text-[11px] text-emerald-400 font-semibold mb-1 block flex items-center justify-between">
              <span>Customer TRN (الرقم الضريبي)</span>
            </label>
            <input
              type="text"
              value={customerTrn}
              onChange={(e) => setCustomerTrn(e.target.value)}
              placeholder="e.g. 100234567800003"
              className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-2 text-white font-mono font-bold text-xs focus:outline-hidden focus:border-emerald-400"
            />
          </div>

          {/* Current Outstanding Balance Display */}
          <div className="sm:col-span-2 bg-amber-950/30 border border-amber-800/60 rounded-xl p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-300 font-semibold block uppercase">Party Balance</span>
              <span className="text-[11px] text-slate-400">Current Khata</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-amber-400">
                {currencySymbol()} {partyBalanceBefore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LINE ITEM ENTRY SECTION (Exact Replica of Item Entry Layout) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-400" />
            Line Item Entry (Select from Warehouse Inventory)
          </span>
          <span className="text-slate-400 text-[11px]">
            Stock will be automatically deducted when report is saved
          </span>
        </div>

        <form onSubmit={handleAddItem} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Item Title Dropdown Search */}
            <div className="sm:col-span-4 relative" ref={itemDropdownRef}>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>Item Title <span className="text-emerald-400">*</span></span>
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800"
                  title="Add New Item Head (+ نیا آئٹم شامل کریں)"
                >
                  <Plus className="w-3 h-3" />
                  <span>نیا آئٹم (+)</span>
                </button>
              </label>
              <div className="relative">
                <input
                  ref={itemInputRef}
                  type="text"
                  placeholder="Type to search product or select..."
                  value={itemTitle}
                  onChange={(e) => {
                    setItemTitle(e.target.value);
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                  }}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Items live search dropdown */}
              {isItemDropdownOpen && (
                <div
                  style={itemDropdownStyle}
                  className="absolute top-full left-0 mt-1 min-w-[340px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto z-50"
                >
                  <div className="space-y-1">
                    {filteredProducts.map((p) => {
                      const qCtn = Number(p.qtyInCarton) > 1 ? Number(p.qtyInCarton) : 1;
                      const stock = Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0;
                      const unitName = (p.unit || p.measure || 'Unit').toUpperCase();
                      const isKgOrLtr = unitName.includes('KG') || unitName.includes('LIT') || unitName.includes('LTR');
                      const ctnPart = qCtn > 1 ? Math.floor(stock / qCtn) : 0;
                      const pcsPart = qCtn > 1 ? Number((stock % qCtn).toFixed(2)) : 0;
                      const pkgName = (p.packageType || 'CTN').toUpperCase();

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectItem(p)}
                          className="px-2.5 py-2 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition border border-transparent hover:border-slate-700"
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{p.name}</span>
                              {stock <= 0 ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-normal">
                                  Out of Stock
                                </span>
                              ) : stock <= (p.minStockLevel || 10) ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-normal">
                                  Low Stock
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{p.category}</span>
                              <span className="text-emerald-400 font-mono">Unit: {p.unit || p.measure || 'CTN'}</span>
                              {qCtn > 1 && <span className="text-slate-500 font-mono">({qCtn} {p.measure || p.unit || 'units'}/{pkgName})</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">{currencySymbol()} {p.sellingPrice || p.price}</div>
                            <div className={`text-[11px] font-mono font-semibold ${stock <= 0 ? 'text-rose-400' : stock <= (p.minStockLevel || 10) ? 'text-amber-400' : 'text-slate-300'}`}>
                              {isKgOrLtr ? (
                                <span>{stock} {unitName} {qCtn > 1 && `(${ctnPart} ${pkgName} + ${pcsPart} ${unitName})`}</span>
                              ) : qCtn > 1 ? (
                                <span>{ctnPart}.{pcsPart} {pkgName} ({stock} pcs)</span>
                              ) : (
                                <span>{stock} {unitName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-3 text-slate-500 text-xs">No matching products found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* M.Code */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1">M.Code</label>
              <input
                type="text"
                value={itemMCode}
                onChange={(e) => setItemMCode(e.target.value)}
                placeholder="SKU"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* CTN / Bag / Packaging */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1 truncate" title={itemPackageType.toUpperCase()}>
                {itemPackageType.toUpperCase()}
              </label>
              <input
                ref={ctnInputRef}
                type="number"
                step="any"
                value={ctn}
                onChange={(e) => handleCtnChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            {/* Rate / Packaging */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1 truncate" title={`Rate / ${itemPackageType.toUpperCase()}`}>
                Rate/{itemPackageType.toUpperCase()}
              </label>
              <input
                ref={ratePerCtnInputRef}
                type="number"
                step="any"
                value={ratePerCtn}
                onChange={(e) => handleRatePerCtnChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            {/* Qty / Packaging */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1 truncate" title={`Qty / ${itemPackageType.toUpperCase()}`}>
                Qty/{itemPackageType.toUpperCase()}
              </label>
              <input
                type="number"
                step="any"
                value={qtyPerCtn}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setQtyPerCtn(val);
                  if (typeof val === 'number' && typeof ctn === 'number') {
                    setQty(Number((ctn * val).toFixed(2)));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            {/* Total Qty (Sold) */}
            <div className="sm:col-span-1">
              <label className={`block font-semibold mb-1 text-[11px] ${
                itemTitle.trim() && numericQty > itemStock ? 'text-rose-400 font-bold' : 'text-emerald-400'
              }`}>
                {itemTitle.trim() && numericQty > itemStock ? 'Qty (SHORT!)' : 'Total Qty'}
              </label>
              <input
                ref={qtyInputRef}
                type="number"
                step="any"
                required
                value={qty}
                onChange={(e) => handleQtyChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className={`w-full rounded-lg px-2 py-1.5 font-mono font-bold text-xs text-right transition ${
                  itemTitle.trim() && numericQty > itemStock
                    ? 'bg-rose-950/70 border-2 border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
                    : 'bg-slate-950 border border-emerald-500/80 text-white focus:outline-hidden focus:border-emerald-400'
                }`}
              />
            </div>

            {/* Rate (Unit Price) */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1">Rate</label>
              <input
                ref={rateInputRef}
                type="number"
                step="any"
                required
                value={rate}
                onChange={(e) => handleRateChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            {/* Discount */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1">Disc.</label>
              <input
                type="number"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            {/* VAT % */}
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-semibold mb-1">VAT %</label>
              <input
                type="number"
                step="any"
                value={vatPercent}
                onChange={(e) => setVatPercent(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>
          </div>

          {/* Real-Time Stock Shortage Red Alert Box */}
          {itemTitle.trim() && numericQty > itemStock && (() => {
            const shortUnits = Number((numericQty - itemStock).toFixed(1));
            const qpc = typeof qtyPerCtn === 'number' && qtyPerCtn > 1 ? qtyPerCtn : 1;
            const shortCtnInt = Math.floor(shortUnits / qpc);
            const shortPcs = Number((shortUnits % qpc).toFixed(1));
            const unitLabel = (activeProduct?.unit || activeProduct?.measure || 'Unit').toUpperCase();
            const isCartonItem = qpc > 1;
            const shortageCtnText = isCartonItem ? `${shortCtnInt}.${shortPcs} Ctns` : `${shortUnits} ${unitLabel}`;

            return (
              <div className="p-3 rounded-xl bg-rose-950 border-2 border-rose-500 text-rose-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg shadow-rose-950/50 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                  <span>
                    ⚠️ Stock Shortage Alert: Selected sale quantity is <strong className="text-white underline">{numericQty}</strong>, but godown only has <strong className="text-amber-300 underline">{itemStock}</strong> {unitLabel} available. You are SHORT by <strong className="text-white bg-rose-600 px-2 py-0.5 rounded text-sm font-black">{shortageCtnText} ({shortUnits} {unitLabel}) kam hain</strong>!
                  </span>
                </div>
                <span className="text-xs font-urdu text-rose-200 font-black bg-rose-900/80 px-2.5 py-1 rounded border border-rose-700 whitespace-nowrap">
                  اسٹاک میں {isCartonItem ? `${shortCtnInt}.${shortPcs} کاٹن` : `${shortUnits} ${unitLabel}`} ({shortUnits} یونٹ) کم ہے
                </span>
              </div>
            );
          })()}

          {/* ----------------------------------------------------------- */}
          {/* PREVIOUS PURCHASING COST & LIVE PROFIT INTELLIGENCE POPUP   */}
          {/* Exact requirement: "main jab koi cheez sell krrha hota hu  */}
          {/* to mjy us stock ki previous purchasing costs pop ki trah   */}
          {/* show hojati hai.same sales k liye b hai... hisaab sakht ho" */}
          {/* ----------------------------------------------------------- */}
          {(activeProduct || selectedProductId || itemTitle.trim()) && (
            <div className={`p-3 rounded-xl border transition-all text-xs erp-intel-box ${
              isSellingAtLoss
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-100 shadow-lg shadow-rose-950/40'
                : expectedMarginPct < 10 && expectedMarginPct > 0
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-100'
                : 'bg-slate-950/80 border-emerald-500/50 text-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-md ${isSellingAtLoss ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {isSellingAtLoss ? <AlertTriangle className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <span className="font-bold text-white text-xs">
                      Price & Cost Intelligence (قیمت اور سابقہ خریداری کی لاگت)
                    </span>
                    {activeProduct && (
                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                        {activeProduct.name} &bull; M.Code: {activeProduct.mcode || activeProduct.sku}
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Profit Margin Badge */}
                {numericRate > 0 && unitPurchaseCost > 0 && (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                    isSellingAtLoss
                      ? 'bg-rose-600 text-white animate-pulse'
                      : expectedMarginPct >= 15
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}>
                    {isSellingAtLoss ? (
                      <span>⚠️ LOSS: -{currencySymbol()} {Math.abs(expectedProfitPerUnit)}/unit (-{Math.abs(expectedMarginPct)}%)</span>
                    ) : (
                      <span>Expected Margin: +{currencySymbol()} {expectedProfitPerUnit}/unit (+{expectedMarginPct}%)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Data Grid: Previous Purchase Cost, CTN Cost, Warehouse Stock, Expected Net Profit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Previous Purchase Cost (سابقہ لاگت)
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                    {currencySymbol()} {unitPurchaseCost.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ unit</span>
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    CTN Cost: {currencySymbol()} {ctnPurchaseCost.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Standard Wholesale Rate (مقررہ ریٹ)
                  </span>
                  <span className="font-mono font-bold text-white text-xs sm:text-sm">
                    {currencySymbol()} {(activeProduct?.sellingPrice || activeProduct?.salePrice || 0).toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Min Sale: {currencySymbol()} {activeProduct?.saleMinPrice || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Warehouse Stock Remaining (موجودہ اسٹاک)
                  </span>
                  <span className={`font-mono font-bold text-xs sm:text-sm ${
                    (activeProduct?.currentQuantity || itemStock) <= 10 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {activeProduct ? (activeProduct.currentQuantity ?? 0) : itemStock} units
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {activeProduct ? ((Number(activeProduct.currentQuantity) || 0) / (Number(activeProduct.qtyInCarton) || 1)).toFixed(1) : 0} CTN Available
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Total Line Profit (کل متوقع نفع)
                  </span>
                  <span className={`font-mono font-black text-xs sm:text-sm ${
                    expectedTotalLineProfit > 0 ? 'text-emerald-400' : expectedTotalLineProfit < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {expectedTotalLineProfit >= 0 ? `+${currencySymbol()} ${expectedTotalLineProfit.toLocaleString()}` : `-${currencySymbol()} ${Math.abs(expectedTotalLineProfit).toLocaleString()}`}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {numericQty} units &times; {expectedProfitPerUnit >= 0 ? `+${expectedProfitPerUnit}` : expectedProfitPerUnit} profit
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Info & Add Button Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="text-slate-400">
                Current Stock:{' '}
                <strong className={`font-mono ${itemStock <= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {itemStock} {activeProduct?.measure || activeProduct?.unit || 'units'}
                </strong>
              </div>
              <div className="text-slate-400">
                After Sale:{' '}
                <strong className={`font-mono ${itemStock - numericQty < 0 ? 'text-rose-400' : 'text-sky-300'}`}>
                  {itemStock - numericQty >= 0
                    ? `${Number((itemStock - numericQty).toFixed(2))} ${activeProduct?.measure || activeProduct?.unit || 'units'}`
                    : `SHORT by ${Number((numericQty - itemStock).toFixed(2))}`}
                </strong>
                {activeProduct && Number(activeProduct.qtyInCarton) > 1 && itemStock - numericQty >= 0 && (
                  <span className="text-[11px] text-slate-500 ml-1">
                    (= {Math.floor((itemStock - numericQty) / Number(activeProduct.qtyInCarton))} {itemPackageType}s + {Number(((itemStock - numericQty) % Number(activeProduct.qtyInCarton)).toFixed(2))} loose)
                  </span>
                )}
              </div>
              <div className="text-slate-400">
                VAT Amount: <strong className="text-white font-mono">{currencySymbol()} {currentItemVatAmount}</strong>
              </div>
              <div className="text-slate-400">
                Row Total: <strong className="text-emerald-400 font-mono text-sm">{currencySymbol()} {currentItemTotalAmount}</strong>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADDED LINE ITEMS TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            Bill Line Items ({billItems.length})
          </span>
          <span className="text-slate-400">
            Total Items Quantity: <strong className="text-white">{computedTotalQty}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-center">#</th>
                <th className="py-2.5 px-3">Item Title</th>
                <th className="py-2.5 px-3">M.Code</th>
                <th className="py-2.5 px-3 text-right">CTN</th>
                <th className="py-2.5 px-3 text-right">Rate/CTN</th>
                <th className="py-2.5 px-3 text-right">Qty/CTN</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Disc.</th>
                <th className="py-2.5 px-3 text-right">VAT%</th>
                <th className="py-2.5 px-3 text-right">VAT Amt</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {billItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    No items added yet. Select a product and click &quot;Add Line Item&quot; above.
                  </td>
                </tr>
              ) : (
                billItems.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{it.itemTitle}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{it.mcode || '---'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.ctn}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.ratePerCtn}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.qtyPerCtn}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={it.stock !== undefined && it.qty > it.stock ? 'text-rose-400 font-black' : 'text-white'}>
                        {it.qty}
                      </span>
                      {it.stock !== undefined && it.qty > it.stock && (
                        <div className="text-[10px] text-rose-300 font-bold bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-800 whitespace-nowrap mt-0.5">
                          Short by {(Number(it.qty || 0) - Number(it.stock || 0)).toFixed(1)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.rate}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.discount || 0}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.vatPercent}%</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.vatAmount}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {currencySymbol()} {it.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM SUMMARY & TOTALS PANEL (Exact Replica of Totals in Pic) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
          {/* Notes & Terms */}
          <div className="md:col-span-6 space-y-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Notes / Terms and Conditions</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Terms and Condition.."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-300 block">Inventory Stock Guarantee</span>
                <span className="text-slate-500 text-[11px]">
                  Saving this report directly reduces warehouse quantity for each item.
                </span>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            </div>
          </div>

          {/* Totals Computation Panel */}
          <div className="md:col-span-6 space-y-2 bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 erp-totals-box">
            {/* Total CTN & Total Qty */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Total CTN:</span>
                <span className="font-mono font-bold text-white">{computedTotalCtn}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Total QTY:</span>
                <span className="font-mono font-bold text-white">{computedTotalQty}</span>
              </div>
            </div>

            {/* Gross Amount */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Gross Amount:</span>
              <span className="font-mono font-semibold text-white">{currencySymbol()} {computedGrossAmount.toLocaleString()}</span>
            </div>

            {/* Bill Discount */}
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Bill Discount:</span>
                {discountType === 'Percentage' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={billDiscountPercent}
                      onChange={(e) => setBillDiscountPercent(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                      placeholder="0"
                    />
                    <span>%</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={billDiscountAmount}
                    onChange={(e) => setBillDiscountAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                    placeholder="0"
                  />
                )}
              </div>
              <span className="font-mono text-rose-400">- {currencySymbol()} {computedBillDiscountAmt.toLocaleString()}</span>
            </div>

            {/* Total VAT */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total VAT Amount:</span>
              <span className="font-mono font-semibold text-white">{currencySymbol()} {computedTotalVat.toLocaleString()}</span>
            </div>

            {/* Net Total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
              <span className="font-black text-white uppercase tracking-wider">Net Total:</span>
              <span className="font-black font-mono text-emerald-400 text-base">
                {currencySymbol()} {computedNetTotal.toLocaleString()}
              </span>
            </div>

            {/* Cash Received */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400 font-semibold">Cash Received:</span>
              <input
                type="number"
                step="any"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-28 bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-right font-mono font-bold text-white text-xs focus:outline-hidden"
              />
            </div>

            {/* Balance Receivable / Change Given */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Balance Receivable:</span>
              <span className={`font-mono font-bold ${computedBalanceReceivable > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {currencySymbol()} {computedBalanceReceivable.toLocaleString()}
              </span>
            </div>

            {computedChangeGiven > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 font-semibold">Change to Return:</span>
                <span className="font-mono font-bold text-emerald-300">{currencySymbol()} {computedChangeGiven.toLocaleString()}</span>
              </div>
            )}

            {/* Balance Recovered checkbox and field */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={balanceRecovered}
                  onChange={(e) => setBalanceRecovered(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span>Balance Recovered</span>
              </label>
              {balanceRecovered && (
                <input
                  type="number"
                  value={balanceRecoveredAmount}
                  onChange={(e) => setBalanceRecoveredAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="Recovered amount"
                  className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs"
                />
              )}
            </div>

            {/* Final Action Buttons */}
            <div className="flex items-center gap-2 pt-3 mt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all line items and form fields?')) {
                    setBillItems([]);
                    setCashReceived(0);
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Reset Bill
              </button>

              <button
                type="button"
                onClick={handlePreviewPrintBill}
                disabled={billItems.length === 0}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 font-bold rounded-lg text-xs border border-emerald-500/40 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Preview & Print customer bill"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill (طباعة)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSaleReport}
                disabled={isSaving || billItems.length === 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving & Deducting Stock...' : 'Save Report (F10)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modern Bilingual Receipt Modal */}
      {isReceiptModalOpen && printedBill && (
        <SalesBillReceiptModal
          bill={printedBill}
          companyProfile={companyProfile}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

      {/* Quick Add Item Head Modal (+ Button) */}
      <AddItemHeadModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={(newProd) => {
          handleSelectItem(newProd);
          if (onRefreshData) onRefreshData();
          fetchMasters();
        }}
        categories={categories}
        brands={brands}
        measures={measures}
        onRefreshMasters={fetchMasters}
      />
    </div>
  );
};
