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
  RotateCcw,
  Camera,
  Edit2,
} from 'lucide-react';
import {
  Product,
  PurchaseBill,
  PurchaseBillItem,
  Supplier,
  UserRole,
} from '../types';
import { api } from '../services/api';
import { AddItemHeadModal } from './AddItemHeadModal';
import { PurchaseReturnModal } from './PurchaseReturnModal';
import { PurchaseBillVoucherModal } from './PurchaseBillVoucherModal';

interface PurchasingViewProps {
  products: Product[];
  suppliers: Supplier[];
  currentRole: UserRole;
  companyProfile?: any;
  currentUser?: any;
  editingBill?: PurchaseBill | null;
  onCancelEdit?: () => void;
  onRefreshData?: () => Promise<void> | void;
  onNavigateTab?: (tab: string) => void;
  onOpenOcr?: () => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  products,
  suppliers,
  currentRole,
  companyProfile,
  currentUser,
  editingBill,
  onCancelEdit,
  onRefreshData,
  onNavigateTab,
  onOpenOcr,
}) => {
  // Master categories, brands, measures for quick item creation - loaded from API
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);

  // Fetch categories, brands, measures on mount
  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [cats, brs, msrs] = await Promise.all([
          api.getItemCategories().catch(() => []),
          api.getItemBrands().catch(() => []),
          api.getItemMeasures().catch(() => []),
        ]);
        if (isMounted) {
          if (cats && cats.length > 0) setCategories(cats);
          if (brs && brs.length > 0) setBrands(brs);
          if (msrs && msrs.length > 0) setMeasures(msrs);
        }
      } catch (err) {
        console.error('Failed to load item masters:', err);
      }
    };
    loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Messages & Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToStockOnly, setIsAddingToStockOnly] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invoice voucher modal state after saving
  const [lastSavedBill, setLastSavedBill] = useState<PurchaseBill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPurchaseReturnModalOpen, setIsPurchaseReturnModalOpen] = useState(false);

  // -------------------------------------------------------------
  // MASTER INVOICE HEADER STATE (Matching Image 1 & 2)
  // -------------------------------------------------------------
  const [discountType, setDiscountType] = useState<'Percentage' | 'Amount'>('Amount');
  const [vatType, setVatType] = useState<'Percentage' | 'Amount'>('Percentage');
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState<string>('1714');
  const [vendorBillNumber, setVendorBillNumber] = useState<string>('');
  const [gatePassNumber, setGatePassNumber] = useState<string>('');

  // -------------------------------------------------------------
  // EDIT BILL STATE & HELPERS
  // -------------------------------------------------------------
  const [editingBillId, setEditingBillId] = useState<string | null>(editingBill?.id || null);
  const [isLoadBillModalOpen, setIsLoadBillModalOpen] = useState(false);
  const [recentBills, setRecentBills] = useState<PurchaseBill[]>([]);
  const [isLoadingRecentBills, setIsLoadingRecentBills] = useState(false);
  const [billSearchQuery, setBillSearchQuery] = useState('');

  const loadBillIntoForm = (bill: PurchaseBill) => {
    setEditingBillId(bill.id);
    setBillNumber(bill.billNumber || '');
    setVendorBillNumber(bill.vendorBillNumber || '');
    setGatePassNumber(bill.gatePassNumber || '');
    setBillDate(bill.date || new Date().toISOString().split('T')[0]);
    setSelectedSupplierId(bill.supplierId || '');
    setIsCash(Boolean(bill.isCash));
    setCashSupplierName(bill.isCash ? (bill.supplierAccountTitle || '') : '');
    setDiscountType(bill.discountType || 'Amount');
    setVatType(bill.vatType || 'Percentage');
    setNotes(bill.notes || '');
    setLoadExp(bill.loadExp || 0);
    setIsLoadExpDeduction(Boolean(bill.isLoadExpDeduction));
    setPaidAmount(bill.paidAmount || 0);
    if (Array.isArray(bill.items)) {
      setBillItems(JSON.parse(JSON.stringify(bill.items)));
    }
    setSelectedProductId('');
    setItemTitle('');
    setCtn('');
    setRatePerCtn('');
    setQty('');
    setRate('');
    setDiscount(0);
    setVatPercent(5);
  };

  useEffect(() => {
    if (editingBill) {
      loadBillIntoForm(editingBill);
    }
  }, [editingBill]);

  const handleCancelEdit = () => {
    setEditingBillId(null);
    setBillItems([]);
    setNotes('');
    setLoadExp(0);
    setPaidAmount(0);
    setVendorBillNumber('');
    setGatePassNumber('');
    const nextNum = (parseInt(billNumber.replace(/\D/g, ''), 10) || 1714) + 1;
    setBillNumber(String(nextNum));
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleEditRowItem = (itemId: string) => {
    const target = billItems.find((it) => it.id === itemId);
    if (!target) return;
    setSelectedProductId(target.productId || '');
    setItemTitle(target.itemTitle);
    setItemCategory(target.category || 'General');
    setItemMCode(target.mcode || '');
    setItemPackageType(target.packageType || 'Carton');
    setCtn(target.ctn || '');
    setRatePerCtn(target.ratePerCtn || '');
    setQtyPerCtn(target.qtyPerCtn || 1);
    setQty(target.qty || '');
    setRate(target.rate || '');
    setDiscount(target.discount || 0);
    setVatPercent(target.vatPercent || 5);
    setVatType(target.vatType || 'Percentage');
    setItemStock(target.stock || 0);
    setBillItems((prev) => prev.filter((it) => it.id !== itemId));
    setTimeout(() => {
      if (itemInputRef.current) itemInputRef.current.focus();
    }, 40);
  };

  const handleOpenLoadBillModal = async () => {
    setIsLoadBillModalOpen(true);
    setIsLoadingRecentBills(true);
    try {
      const list = await api.getPurchases();
      setRecentBills(list || []);
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setIsLoadingRecentBills(false);
    }
  };

  // Account / Supplier selection
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [accountDropdownStyle, setAccountDropdownStyle] = useState<React.CSSProperties>({});

  // Cash logic: "cash waly check pr click krny pr. acount nothing select hojata aur cash k sath placholder ajata suplier name."
  const [isCash, setIsCash] = useState<boolean>(false);
  const [cashSupplierName, setCashSupplierName] = useState<string>('');

  // -------------------------------------------------------------
  // LINE ITEM ENTRY STATE (Matching Image 1 & 2)
  // -------------------------------------------------------------
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemTitle, setItemTitle] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>('General');
  const [itemMCode, setItemMCode] = useState<string>('');
  const [itemPackageType, setItemPackageType] = useState<string>('Carton');
  const [ctn, setCtn] = useState<number | ''>('');
  const [extraPiece, setExtraPiece] = useState<number | ''>('');
  const [ratePerCtn, setRatePerCtn] = useState<number | ''>('');
  const [qtyPerCtn, setQtyPerCtn] = useState<number | ''>(1);
  // Flexible quantity: "ye items selection main quantity b add krwa sku k itna kg"
  const [qty, setQty] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [vatPercent, setVatPercent] = useState<number | ''>(5);
  const [itemStock, setItemStock] = useState<number>(0);

  // Item dropdown live search (Image 2)
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(0);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const [itemDropdownStyle, setItemDropdownStyle] = useState<React.CSSProperties>({});

  // Focus references for rapid keyboard entry
  const itemInputRef = useRef<HTMLInputElement>(null);
  const ctnInputRef = useRef<HTMLInputElement>(null);
  const extraPieceInputRef = useRef<HTMLInputElement>(null);
  const ratePerCtnInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const vatPercentInputRef = useRef<HTMLInputElement>(null);

  // Added bill items table
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>([]);

  // Bottom section fields
  const [notes, setNotes] = useState<string>('');
  const [loadExp, setLoadExp] = useState<number | ''>(0);
  const [isLoadExpDeduction, setIsLoadExpDeduction] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);

  // Quick modals for adding product / supplier
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState(false);
  const [isQuickAddSupplierOpen, setIsQuickAddSupplierOpen] = useState(false);

  // Quick add product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdMeasure, setNewProdMeasure] = useState('');
  const [newProdQtyInCtn, setNewProdQtyInCtn] = useState(1);
  const [newProdCtnPurRate, setNewProdCtnPurRate] = useState<number | ''>('');
  const [newProdCtnSaleRate, setNewProdCtnSaleRate] = useState<number | ''>('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Inline Quick-Add states for Category, Brand & Measure in Modal (+ button)
  const [showAddCategoryInline, setShowAddCategoryInline] = useState<boolean>(false);
  const [newCategoryInline, setNewCategoryInline] = useState<string>('');
  const [isSavingCategory, setIsSavingCategory] = useState<boolean>(false);

  const [showAddBrandInline, setShowAddBrandInline] = useState<boolean>(false);
  const [newBrandInline, setNewBrandInline] = useState<string>('');
  const [isSavingBrand, setIsSavingBrand] = useState<boolean>(false);

  const [showAddMeasureInline, setShowAddMeasureInline] = useState<boolean>(false);
  const [newMeasureInline, setNewMeasureInline] = useState<string>('');
  const [isSavingMeasure, setIsSavingMeasure] = useState<boolean>(false);

  // Quick add supplier form state
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupCity, setNewSupCity] = useState('');
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Quick-Add Handlers with instant persistence & selection
  const handleQuickAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryInline.trim();
    if (!clean) return;
    setIsSavingCategory(true);
    try {
      const updated = await api.createItemCategory(clean);
      setCategories(updated);
      setNewProdCategory(clean);
      setNewCategoryInline('');
      setShowAddCategoryInline(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleQuickAddBrand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newBrandInline.trim();
    if (!clean) return;
    setIsSavingBrand(true);
    try {
      const updated = await api.createItemBrand(clean);
      setBrands(updated);
      setNewBrandInline('');
      setShowAddBrandInline(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add brand');
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleQuickAddMeasure = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newMeasureInline.trim();
    if (!clean) return;
    setIsSavingMeasure(true);
    try {
      const updated = await api.createItemMeasure(clean);
      setMeasures(updated);
      setNewProdMeasure(clean);
      setNewMeasureInline('');
      setShowAddMeasureInline(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add measure');
    } finally {
      setIsSavingMeasure(false);
    }
  };

  // Fetch highest bill number to auto-increment
  useEffect(() => {
    api.getPurchases().then((list) => {
      if (list && list.length > 0) {
        const nums = list
          .map((b) => parseInt(b.billNumber.replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));
        if (nums.length > 0) {
          const maxNum = Math.max(...nums);
          setBillNumber(String(maxNum + 1));
        }
      }
    }).catch(() => {});
  }, []);

  // Handle Cash Checkbox Change
  const handleCashToggle = (checked: boolean) => {
    setIsCash(checked);
    if (checked && selectedSupplierId && !cashSupplierName) {
      const sup = suppliers.find((s) => s.id === selectedSupplierId);
      if (sup) {
        setCashSupplierName(sup.accountTitle || sup.title);
      }
    }
  };

  // Keep item dropdown open preference
  const [keepDropdownOpenOnSelect, setKeepDropdownOpenOnSelect] = useState<boolean>(false);

  // Floating dropdown position updater
  useLayoutEffect(() => {
    const updatePositions = () => {
      if (isItemDropdownOpen && itemInputRef.current) {
        const rect = itemInputRef.current.getBoundingClientRect();
        setItemDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
          width: Math.max(340, rect.width * 1.4),
          zIndex: 99999,
        });
      }
      if (isAccountDropdownOpen && accountDropdownRef.current) {
        const rect = accountDropdownRef.current.getBoundingClientRect();
        setAccountDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: Math.max(10, Math.min(window.innerWidth - 340, rect.left)),
          width: Math.max(320, rect.width),
          zIndex: 99999,
        });
      }
    };

    updatePositions();
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [isItemDropdownOpen, isAccountDropdownOpen]);

  // Selected supplier object & party balance
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const partyBalance = selectedSupplier ? (selectedSupplier.payableToSupplier ?? selectedSupplier.balanceOwed ?? 0) : 0;

  // Handle Item Selection from dropdown (Image 2 & Image 4)
  const handleSelectItem = (prod: Product) => {
    setSelectedProductId(prod.id);
    setItemTitle(prod.itemTitle || prod.name);
    setItemCategory(typeof prod.category === 'string' ? prod.category : 'General');
    setItemMCode(prod.sku || prod.mcode || '');

    // Resolve packaging type
    const pkg = prod.packageType ||
      (prod.category?.toLowerCase().includes('bag') || (prod.measure || '').toLowerCase().includes('bag') ? 'Bag' :
       prod.category?.toLowerCase().includes('box') || (prod.measure || '').toLowerCase().includes('box') ? 'Box' :
       prod.category?.toLowerCase().includes('tin') || (prod.measure || '').toLowerCase().includes('tin') ? 'Tin' :
       prod.category?.toLowerCase().includes('pack') || (prod.measure || '').toLowerCase().includes('pack') ? 'Pack' : 'Carton');
    setItemPackageType(pkg);

    const qInCtn = prod.qtyInCarton && prod.qtyInCarton > 0 ? prod.qtyInCarton : 1;
    setQtyPerCtn(qInCtn);
    setExtraPiece('');

    const ctnRate = prod.ctnPurchaseRate && prod.ctnPurchaseRate > 0
      ? prod.ctnPurchaseRate
      : (prod.purchasePrice * qInCtn);
    setRatePerCtn(ctnRate > 0 ? ctnRate : '');

    const unitRate = prod.purchasePrice > 0 ? prod.purchasePrice : (ctnRate > 0 ? parseFloat((ctnRate / qInCtn).toFixed(3)) : '');
    setRate(unitRate);

    // Initial stock from catalog
    const stockRaw = Number(prod.totalStock !== undefined ? prod.totalStock : prod.currentQuantity) || 0;
    setItemStock(stockRaw);

    // Exactly matching Screenshot 4: CTN and QTY are empty waiting for input
    setCtn('');
    setQty('');
    setDiscount(0);
    setVatPercent(5);

    if (!keepDropdownOpenOnSelect) {
      setIsItemDropdownOpen(false);
    }

    // Focus on CTN input for rapid entry
    setTimeout(() => {
      ctnInputRef.current?.focus();
    }, 50);
  };

  // Dual Packaging Change Handlers
  const handleCtnChange = (val: number | '') => {
    setCtn(val);
  };

  const handleQtyDirectChange = (val: number | '') => {
    setQty(val);
  };

  const handleRatePerCtnChange = (val: number | '') => {
    setRatePerCtn(val);
  };

  const handleRateChange = (val: number | '') => {
    setRate(val);
  };

  const handleQtyPerCtnChange = (val: number | '') => {
    setQtyPerCtn(val);
  };

  // Synchronize itemStock automatically whenever products prop updates (without needing page reload!)
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((prod) => prod.id === selectedProductId);
      if (p) {
        const rawStock = Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0;
        setItemStock(Math.max(0, rawStock));
      }
    }
  }, [products, selectedProductId]);

  // Dual packaging row calculations (Subtotal = CTN * RATE/CTN + QTY * RATE)
  const numCtn = typeof ctn === 'number' ? ctn : 0;
  const numRatePerCtn = typeof ratePerCtn === 'number' ? ratePerCtn : 0;
  const numQtyPerCtn = typeof qtyPerCtn === 'number' && qtyPerCtn > 0 ? qtyPerCtn : 1;
  const numQty = typeof qty === 'number' ? qty : 0;
  const numRate = typeof rate === 'number' ? rate : 0;
  const numDiscount = typeof discount === 'number' ? discount : 0;
  const numVatPercent = typeof vatPercent === 'number' ? vatPercent : 0;

  const currentItemSubtotal = Number(((numCtn * numRatePerCtn) + (numQty * numRate)).toFixed(2));
  const currentItemDiscountAmt = discountType === 'Percentage'
    ? Number(((currentItemSubtotal * numDiscount) / 100).toFixed(2))
    : numDiscount;
  const currentItemGross = Math.max(0, Number((currentItemSubtotal - currentItemDiscountAmt).toFixed(2)));
  const currentItemVatAmount = vatType === 'Percentage'
    ? Number(((currentItemGross * numVatPercent) / 100).toFixed(2))
    : Number(numVatPercent.toFixed(2));
  const currentItemTotalAmount = Number((currentItemGross + currentItemVatAmount).toFixed(2));

  // Physical inventory intake into warehouse = (CTN * QTY/CTN) + QTY (supporting kg & grams)
  const currentItemTotalIntake = Number(((numCtn * numQtyPerCtn) + numQty).toFixed(2));
  const currentItemNewStock = Number((itemStock + currentItemTotalIntake).toFixed(2));

  // Backward compatibility alias variables
  const numericQty = numQty;
  const numericRate = numRate;
  const numericDiscount = numDiscount;
  const numericVatPercent = numVatPercent;
  const liveRowVatAmount = currentItemVatAmount;
  const liveRowAmount = currentItemTotalAmount;
  const liveRowStockPreview = currentItemNewStock;

  // Add Item Action (Triggered by blue [ Enter ] button or keyboard Enter)
  const handleAddRowItem = () => {
    setErrorMsg(null);
    if (!itemTitle.trim()) {
      setErrorMsg('Please select or enter an Item title first.');
      itemInputRef.current?.focus();
      return;
    }

    if (currentItemTotalIntake <= 0) {
      setErrorMsg('Carton count or loose quantity must be greater than 0.');
      ctnInputRef.current?.focus();
      return;
    }

    if (numRatePerCtn <= 0 && numRate <= 0) {
      setErrorMsg('Please enter purchase rate for carton/bag or loose quantity.');
      ratePerCtnInputRef.current?.focus();
      return;
    }

    const newItem: PurchaseBillItem = {
      id: `pbi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: selectedProductId || undefined,
      itemTitle: itemTitle.trim(),
      category: itemCategory || 'General',
      mcode: itemMCode || '',
      packageType: resolvedPackageType,
      ctn: numCtn,
      extraPiece: 0,
      unit: resolvedBaseUnit,
      ratePerCtn: numRatePerCtn,
      qtyPerCtn: numQtyPerCtn,
      qty: numQty,
      rate: numRate,
      discount: numDiscount,
      vatPercent: numVatPercent,
      vatAmount: currentItemVatAmount,
      amount: currentItemTotalAmount,
      stock: itemStock,
      newStock: currentItemNewStock,
      totalIntakeQty: currentItemTotalIntake,
      vatType,
    };

    setBillItems((prev) => [...prev, newItem]);

    // Reset row inputs ready for next item immediately
    setSelectedProductId('');
    setItemTitle('');
    setItemSearchQuery('');
    setItemCategory('General');
    setItemMCode('');
    setCtn('');
    setExtraPiece('');
    setRatePerCtn('');
    setQtyPerCtn(1);
    setQty('');
    setRate('');
    setDiscount(0);
    setVatPercent(5);
    setItemStock(0);
    setHighlightedItemIndex(0);

    // Refocus on item input immediately for zero-mouse ultra fast data entry
    setTimeout(() => {
      if (itemInputRef.current) {
        itemInputRef.current.focus();
        itemInputRef.current.select();
      }
      setIsItemDropdownOpen(true);
    }, 40);
  };

  const handleRemoveItem = (id: string) => {
    setBillItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Bill Totals
  const totalBillCtn = billItems.reduce((acc, it) => acc + (it.ctn || 0), 0);
  const totalBillQty = billItems.reduce((acc, it) => acc + (it.totalIntakeQty !== undefined ? it.totalIntakeQty : (it.qty || 0)), 0);
  const grossBillAmount = billItems.reduce((acc, it) => acc + Math.max(0, it.amount - (it.vatAmount || 0)), 0);
  const totalBillVatAmount = billItems.reduce((acc, it) => acc + (it.vatAmount || 0), 0);
  const totalBillItemDiscounts = billItems.reduce((acc, it) => acc + (it.discount || 0), 0);
  const numLoadExp = typeof loadExp === 'number' ? loadExp : 0;
  const netTotal = parseFloat(
    (billItems.reduce((acc, it) => acc + it.amount, 0) + (isLoadExpDeduction ? -numLoadExp : numLoadExp)).toFixed(2)
  );

  // Auto-fill paidAmount if cash is checked
  useEffect(() => {
    if (isCash) {
      setPaidAmount(netTotal);
    }
  }, [isCash, netTotal]);

  const remainingPayableBalance = parseFloat((netTotal - (Number(paidAmount) || 0)).toFixed(2));

  // Active product lookup for instant cost popup & stock verification
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

  // Synchronize itemPackageType whenever activeProduct changes
  useEffect(() => {
    if (activeProduct) {
      setItemPackageType(activeProduct.packageType || 'Single');
    }
  }, [activeProduct]);

  // Dynamic packaging type resolved from current product / selection
  const resolvedPackageType = React.useMemo(() => {
    if (itemPackageType) return itemPackageType;
    if (activeProduct?.packageType) return activeProduct.packageType;
    return 'Single';
  }, [itemPackageType, activeProduct]);

  const resolvedBaseUnit = React.useMemo(() => {
    const raw = (activeProduct?.measure || activeProduct?.unit || '').trim();
    if (raw.toLowerCase().includes('kilo') || raw.toLowerCase() === 'kg') return 'KG';
    if (raw.toLowerCase().includes('litter') || raw.toLowerCase().includes('liter') || raw.toLowerCase() === 'ltr') return 'Ltr';
    if (raw.toLowerCase().includes('gram') || raw.toLowerCase() === 'g') return 'Gram';
    if (raw.toLowerCase().includes('piece') || raw.toLowerCase() === 'pcs') return 'Pcs';
    if (raw && !['ctn', 'carton', 'bag', 'box'].includes(raw.toLowerCase())) return raw;
    if (itemTitle.toLowerCase().includes('kg')) return 'KG';
    return resolvedPackageType === 'Bag' ? 'KG' : 'Units';
  }, [activeProduct, itemTitle, resolvedPackageType]);

  const dominantPackageLabel = React.useMemo(() => {
    const firstWithPkg = billItems.find(it => it.packageType);
    if (firstWithPkg?.packageType) return `${firstWithPkg.packageType}s`;
    return `${resolvedPackageType}s`;
  }, [billItems, resolvedPackageType]);

  const dominantUnitLabel = React.useMemo(() => {
    const firstWithUnit = billItems.find(it => it.unit && !['ctn', 'carton'].includes(it.unit.toLowerCase()));
    if (firstWithUnit?.unit) return firstWithUnit.unit;
    return resolvedBaseUnit;
  }, [billItems, resolvedBaseUnit]);

  // SAVE PURCHASE BILL / REPORT
  // User: "aur ye new bill main add to stock btn funcionity remove krdo. us k baad baad purchase detail matlb new bill section main product select kr k seller select kr k details addkr k save report krwa skein aur wo report settings main aik report section hoga us main purchase detail section hoga us main save hogi"
  const handleSaveBill = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    let itemsToSave = [...billItems];
    // If bill list is empty but an item is currently entered/selected in the input row, automatically add it!
    if (itemsToSave.length === 0 && itemTitle.trim() && currentItemTotalIntake > 0) {
      const stagedItem: PurchaseBillItem = {
        id: `pbi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: selectedProductId || undefined,
        itemTitle: itemTitle.trim(),
        category: itemCategory || 'General',
        mcode: itemMCode || '',
        packageType: resolvedPackageType,
        ctn: numCtn,
        extraPiece: 0,
        unit: resolvedBaseUnit,
        ratePerCtn: numRatePerCtn,
        qtyPerCtn: numQtyPerCtn,
        qty: numQty,
        rate: numRate,
        discount: numDiscount,
        vatPercent: numVatPercent,
        vatAmount: currentItemVatAmount,
        amount: currentItemTotalAmount,
        stock: itemStock,
        newStock: currentItemNewStock,
        totalIntakeQty: currentItemTotalIntake,
        vatType,
      };
      itemsToSave = [stagedItem];
      setBillItems([stagedItem]);
    }

    if (itemsToSave.length === 0) {
      setErrorMsg('Please select an item and click the blue "Enter" button to add it into the purchasing details.');
      return;
    }

    const effectiveIsCash = Boolean(isCash);
    const supplierName = cashSupplierName.trim() || (selectedSupplier ? (selectedSupplier.accountTitle || selectedSupplier.title) : '');
    if (!supplierName) {
      setErrorMsg('Please enter or select Supplier Name');
      return;
    }

    // Normalize date to YYYY-MM-DD for reliable report filtering
    let formattedBillDate = billDate.trim();
    const dmy = formattedBillDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
      formattedBillDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    } else if (!formattedBillDate) {
      formattedBillDate = new Date().toISOString().split('T')[0];
    }

    setIsSaving(true);
    try {
      const billData: Partial<PurchaseBill> = {
        billNumber: billNumber.trim() || `PB-${Date.now().toString().slice(-4)}`,
        vendorBillNumber: vendorBillNumber.trim(),
        gatePassNumber: gatePassNumber.trim(),
        date: formattedBillDate,
        supplierId: selectedSupplierId || (isCash ? 'sup-cash' : 'sup-generic'),
        supplierAccountTitle: supplierName,
        isCash: Boolean(isCash),
        discountType,
        vatType,
        items: itemsToSave,
        loadExp: numLoadExp,
        isLoadExpDeduction,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim(),
        addToStock: true, // Directly adds stock to inventory!
        customerName: companyProfile?.name || 'APEX FOOD SUPPLIES LTD.',
        createdBy: currentUser?.name || 'Admin',
      };

      let savedBillResult: PurchaseBill;
      if (editingBillId) {
        savedBillResult = await api.updatePurchase(editingBillId, billData, {
          id: currentUser?.id || 'usr-admin',
          name: currentUser?.name || 'Admin',
          role: currentUser?.role || currentRole,
        });
        setSuccessMsg(
          `Purchase Bill #${savedBillResult.billNumber} updated successfully! Stock differences and supplier balances adjusted in real-time.`
        );
        setEditingBillId(null);
        if (onCancelEdit) onCancelEdit();
      } else {
        savedBillResult = await api.createPurchase(billData, 'manual', {
          id: currentUser?.id || 'usr-admin',
          name: currentUser?.name || 'Admin',
          role: currentUser?.role || currentRole,
        });
        setSuccessMsg(
          `Purchase Bill #${savedBillResult.billNumber} created successfully! Real-time stock updated in inventory automatically without reload.`
        );
      }

      setLastSavedBill(savedBillResult);
      setIsInvoiceModalOpen(true);

      // Reset form
      setBillItems([]);
      setSelectedProductId('');
      setItemTitle('');
      setCtn('');
      setRatePerCtn('');
      setQtyPerCtn(1);
      setQty('');
      setRate('');
      setDiscount(0);
      setVatPercent(5);
      setItemStock(0);
      setVendorBillNumber('');
      setGatePassNumber('');
      setNotes('');
      setPaidAmount(0);
      setLoadExp(0);
      if (isCash) {
        setCashSupplierName('');
        setIsCash(false);
      }

      // Increment next bill number
      const nextNum = (parseInt(billNumber.replace(/\D/g, ''), 10) || 1714) + 1;
      setBillNumber(String(nextNum));

      // Trigger app-wide silent background data refresh
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save purchase bill.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Add Product Form Submit
  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    setIsCreatingProduct(true);
    try {
      const ctnPur = typeof newProdCtnPurRate === 'number' ? newProdCtnPurRate : 0;
      const qInCtn = newProdQtyInCtn > 0 ? newProdQtyInCtn : 1;
      const unitPur = ctnPur > 0 ? parseFloat((ctnPur / qInCtn).toFixed(2)) : 10;
      const ctnSale = typeof newProdCtnSaleRate === 'number' ? newProdCtnSaleRate : ctnPur * 1.2;
      const unitSale = parseFloat((ctnSale / qInCtn).toFixed(2));

      const createdProd = await api.createProduct(
        {
          name: newProdName.trim(),
          itemTitle: newProdName.trim(),
          category: newProdCategory.trim() || 'General',
          unit: newProdMeasure,
          measure: newProdMeasure,
          qtyInCarton: qInCtn,
          ctnPurchaseRate: ctnPur,
          ctnSaleRate: ctnSale,
          purchasePrice: unitPur,
          sellingPrice: unitSale,
          currentQuantity: 0,
          totalStock: 0,
          minStockLevel: 10,
        },
        'manual',
        { id: 'usr-admin', name: 'Admin', role: currentRole }
      );

      // Set as active row item
      handleSelectItem(createdProd);

      // Clean form
      setNewProdName('');
      setNewProdCtnPurRate('');
      setNewProdCtnSaleRate('');
      setIsQuickAddProductOpen(false);

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Quick Add Supplier Form Submit
  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    setIsCreatingSupplier(true);
    try {
      const res = await api.createSupplier({
        title: newSupName.trim(),
        accountTitle: newSupName.trim(),
        phone: newSupPhone.trim(),
        city: newSupCity.trim() || 'Local',
        supplierGroup: 'General Supplier',
        payableToSupplier: 0,
      });

      if (res?.supplier?.id) {
        setSelectedSupplierId(res.supplier.id);
      }
      setIsQuickAddSupplierOpen(false);
      setNewSupName('');
      setNewSupPhone('');
      setNewSupCity('');

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  // Filtered item list for searchable dropdown (Image 2)
  const activeProducts = products.filter((p) => p.status !== false);
  const filteredProducts = activeProducts.filter((p) => {
    if (!itemSearchQuery.trim()) return true;
    const q = itemSearchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
  });

  // Filtered suppliers for account dropdown
  const filteredSuppliers = suppliers.filter((s) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    const title = (s.accountTitle || s.title || '').toLowerCase();
    return title.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Bar: Discount Type Radio & VAT Type & View Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Discount Type & VAT Type */}
        <div className="flex items-center gap-5 flex-wrap text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 font-bold">Discount Type:</span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="radio"
                name="discountType"
                checked={discountType === 'Percentage'}
                onChange={() => setDiscountType('Percentage')}
                className="accent-sky-500"
              />
              <span>Percentage</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="radio"
                name="discountType"
                checked={discountType === 'Amount'}
                onChange={() => setDiscountType('Amount')}
                className="accent-sky-500"
              />
              <span>Amount</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5 border-l border-slate-700/80 pl-4">
            <span className="text-sky-300 font-bold">VAT Type:</span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="radio"
                name="purVatType"
                checked={vatType === 'Percentage'}
                onChange={() => setVatType('Percentage')}
                className="accent-sky-500"
              />
              <span>Percentage (%)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="radio"
                name="purVatType"
                checked={vatType === 'Amount'}
                onChange={() => setVatType('Amount')}
                className="accent-sky-500"
              />
              <span>Amount ({currencySymbol()})</span>
            </label>
          </div>
        </div>

        {/* Action Link to Reports & Purchase Return & OCR */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenOcr && (
            <button
              type="button"
              onClick={onOpenOcr}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg border border-emerald-400/40 text-xs font-bold transition shadow-sm cursor-pointer shadow-emerald-950/40"
              title="Scan wholesale supplier bill / mandi slip with AI OCR"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <span>📷 Scan Supplier Slip (AI OCR)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('purchasing-return') : setIsPurchaseReturnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-lg border border-amber-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Record Purchase Return to Supplier"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Purchase Return</span>
          </button>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-lg border border-slate-700 text-xs font-bold transition"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>📑 View Purchase Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedBill && (
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-[11px] transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Printer className="w-3 h-3" />
                <span>Print / View Invoice</span>
              </button>
            )}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition flex items-center gap-1 cursor-pointer"
              >
                <span>View Reports</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Mode Active Banner */}
      {editingBillId && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-sky-950/80 border-2 border-amber-500/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">
                  EDITING PURCHASE BILL #{billNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                  Edit Mode Active
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                All previously entered items are loaded below. You can edit any item, change rates/cartons/loose qty, delete items, or select and add new items from inventory. Click <strong>&quot;Update Purchase Bill&quot;</strong> below to apply changes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Invoice Card (Image 1 Layout) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Master Details Row (Image 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 text-xs items-end">
          {/* Date */}
          <div className="md:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">Date:</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Bill# */}
          <div className="md:col-span-1">
            <label className="block text-slate-300 font-semibold mb-1">Bill#</label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sky-400 font-mono font-bold text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* V.Bill# */}
          <div className="md:col-span-1">
            <label className="block text-slate-300 font-semibold mb-1">V.Bill#</label>
            <input
              type="text"
              placeholder="Vendor#"
              value={vendorBillNumber}
              onChange={(e) => setVendorBillNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* GatePass# */}
          <div className="md:col-span-1">
            <label className="block text-slate-300 font-semibold mb-1">GP#</label>
            <input
              type="text"
              placeholder="GatePass#"
              value={gatePassNumber}
              onChange={(e) => setGatePassNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Account: Dropdown with [ + ] & Balance Box (Image 1) */}
          <div className="md:col-span-4 relative" ref={accountDropdownRef}>
            <label className="block text-slate-300 font-semibold mb-1">Account:</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isCash}
                onClick={() => {
                  if (isCash) return;
                  if (!isAccountDropdownOpen && accountDropdownRef.current) {
                    const rect = accountDropdownRef.current.getBoundingClientRect();
                    setAccountDropdownStyle({
                      position: 'fixed',
                      top: rect.bottom + 4,
                      left: Math.max(10, Math.min(window.innerWidth - 340, rect.left)),
                      width: Math.max(320, rect.width),
                      zIndex: 99999,
                    });
                  }
                  setIsAccountDropdownOpen((prev) => !prev);
                }}
                className={`w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-left text-xs flex items-center justify-between focus:outline-none ${
                  isCash ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-white hover:border-slate-600'
                }`}
              >
                <span className="truncate">
                  {isCash
                    ? 'Nothing selected (Cash Mode)'
                    : selectedSupplier
                    ? `${selectedSupplier.accountTitle || selectedSupplier.title}`
                    : 'Nothing selected'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              </button>

              {/* Quick Add Supplier [ + ] */}
              <button
                type="button"
                disabled={isCash}
                onClick={() => setIsQuickAddSupplierOpen(true)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs font-bold transition disabled:opacity-40"
                title="Add New Supplier"
              >
                +
              </button>

              {/* Balance Box: e.g. green pill 0 (Image 1) */}
              <div
                className="px-2 py-1.5 bg-emerald-950/70 border border-emerald-700/60 rounded text-emerald-300 font-mono font-bold text-xs shrink-0"
                title="Current Party Balance Owed"
              >
                {partyBalance.toLocaleString()}
              </div>
            </div>

            {/* Account Search Dropdown Menu */}
            {isAccountDropdownOpen && !isCash && (
              <div
                style={accountDropdownStyle}
                className="absolute top-full left-0 mt-1 w-full min-w-[320px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden text-xs z-50"
              >
                <div className="p-2 border-b border-slate-800 bg-slate-950">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search account title..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-2 py-1 text-white text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                  <div
                    onClick={() => {
                      setSelectedSupplierId('');
                      setIsAccountDropdownOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-sky-900/30 transition text-slate-300 ${
                      selectedSupplierId === '' ? 'bg-sky-950/60 text-sky-300 font-bold' : ''
                    }`}
                  >
                    Nothing selected
                  </div>
                  {filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplierId(s.id);
                        setCashSupplierName(s.accountTitle || s.title);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-sky-900/30 transition flex justify-between items-center ${
                        selectedSupplierId === s.id ? 'bg-sky-950/60 text-sky-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate">{s.accountTitle || s.title}</span>
                      <span className="text-[10px] text-emerald-400 ml-2 font-mono">
                        Bal: {s.payableToSupplier ?? 0}
                      </span>
                    </div>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <div className="px-3 py-3 text-center text-slate-500">No matching accounts.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Supplier Name Input (Always Enabled & Active) */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                <span>Supplier Name</span>
                <span className="text-amber-400 font-bold">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={isCash}
                  onChange={(e) => handleCashToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-sky-500"
                />
                <span>Cash</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Enter Supplier Name..."
              value={cashSupplierName}
              onChange={(e) => setCashSupplierName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none transition font-semibold"
            />
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PREVIOUS PURCHASING COST & STOCK INTELLIGENCE CARD           */}
        {/* ----------------------------------------------------------- */}
        {(activeProduct || selectedProductId || itemTitle.trim()) && (
          <div className="p-3 bg-slate-950/90 border border-sky-500/50 rounded-xl text-xs text-slate-200 erp-intel-box">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-sky-600 text-white">
                  <Package className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="font-bold text-white text-xs">
                    Stock &amp; Purchase Price Intelligence
                  </span>
                  {activeProduct && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {activeProduct.name} &bull; M.Code: {activeProduct.mcode || activeProduct.sku}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[11px] font-mono text-sky-400 font-semibold">
                Category: {activeProduct?.category || 'General'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Last Purchase Cost
                </span>
                <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                  {currencySymbol()} {(activeProduct?.purchasePrice || activeProduct?.lastPurchasePrice || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ unit</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  CTN: {currencySymbol()} {((activeProduct?.purchasePrice || 0) * (activeProduct?.qtyInCarton || 1)).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Wholesale Sale Rate
                </span>
                <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                  {currencySymbol()} {(activeProduct?.sellingPrice || activeProduct?.salePrice || 0).toLocaleString()}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  Min Sale: {currencySymbol()} {activeProduct?.saleMinPrice || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Warehouse Stock Remaining
                </span>
                <span className={`font-mono font-bold text-xs sm:text-sm ${
                  Math.max(0, activeProduct?.currentQuantity ?? itemStock) <= 10 ? 'text-rose-400' : 'text-sky-300'
                }`}>
                  {Math.max(0, activeProduct ? (activeProduct.currentQuantity ?? 0) : itemStock)} units
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  {activeProduct ? (Math.max(0, Number(activeProduct.currentQuantity) || 0) / (Number(activeProduct.qtyInCarton) || 15)).toFixed(1) : 0} CTN in godown
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Expected Markup / Margin
                </span>
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {typeof rate === 'number' && rate > 0 && activeProduct?.sellingPrice ? (
                    <span className="text-emerald-400">
                      +{currencySymbol()} {(Number(activeProduct.sellingPrice) - rate).toFixed(2)} / unit ({Number(activeProduct.sellingPrice) > 0 ? (((Number(activeProduct.sellingPrice) - rate) / Number(activeProduct.sellingPrice)) * 100).toFixed(1) : '0'}%)
                    </span>
                  ) : (
                    <span className="text-slate-400">Enter rate for margin preview</span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-500">
                  Target wholesale markup &gt; 15%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ITEMS ENTRY TABLE (Image 1 & Image 2) */}
        <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/40">
          <table className="w-full text-left text-xs min-w-[950px]">
            {/* Headers matching Image 1 */}
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span>ITEM</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={onRefreshData}
                        className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400"
                        title="Refresh products list"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddProductOpen(true)}
                        className="p-0.5 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold"
                        title="Add new product item"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </th>
                <th className="py-2.5 px-2 w-20 text-center text-[10px] leading-tight font-bold text-sky-300">
                  {resolvedPackageType.toUpperCase()}
                </th>
                <th className="py-2.5 px-2 w-24 text-right text-[10px] leading-tight font-bold text-sky-300">
                  RATE/{resolvedPackageType.toUpperCase()}
                </th>
                <th className="py-2.5 px-2 w-20 text-center text-[10px] leading-tight font-bold text-slate-300">
                  QTY/{resolvedPackageType.toUpperCase()}
                </th>
                <th className="py-2.5 px-2 w-20 text-right text-[10px] leading-tight font-bold text-sky-300">
                  {resolvedBaseUnit.toUpperCase()}
                </th>
                <th className="py-2.5 px-2 w-20 text-right">RATE</th>
                <th className="py-2.5 px-2 w-20 text-right">DISC RS.</th>
                <th className="py-2.5 px-2 w-16 text-center">VAT@%</th>
                <th className="py-2.5 px-2 w-20 text-right">VAT AMOUNT</th>
                <th className="py-2.5 px-2 w-24 text-right">AMOUNT</th>
                <th className="py-2.5 px-2 w-20 text-center">STOCK</th>
                <th className="py-2.5 px-2 w-20 text-center">ACTION</th>
              </tr>
            </thead>

            {/* Interactive Entry Row (Matching Image 1 & 2) */}
            <tbody className="divide-y divide-slate-800/80">
              <tr className="bg-slate-900/90 font-medium">
                {/* ITEM Field with Dropdown (Image 2) */}
                <td className="py-2 px-3 relative" ref={itemDropdownRef}>
                  <div className="relative">
                    <input
                      ref={itemInputRef}
                      type="text"
                      placeholder="Select / Search Item (↑ ↓ to navigate, Enter to select)..."
                      value={itemTitle}
                      onFocus={() => {
                        setIsItemDropdownOpen(true);
                        setHighlightedItemIndex(0);
                      }}
                      onChange={(e) => {
                        setItemTitle(e.target.value);
                        setItemSearchQuery(e.target.value);
                        setIsItemDropdownOpen(true);
                        setHighlightedItemIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setIsItemDropdownOpen(true);
                          setHighlightedItemIndex((prev) => Math.min(prev + 1, Math.max(0, filteredProducts.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setIsItemDropdownOpen(true);
                          setHighlightedItemIndex((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredProducts.length > 0 && highlightedItemIndex >= 0 && highlightedItemIndex < filteredProducts.length) {
                            handleSelectItem(filteredProducts[highlightedItemIndex]);
                          } else {
                            ctnInputRef.current?.focus();
                          }
                        } else if (e.key === 'Escape') {
                          setIsItemDropdownOpen(false);
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white font-bold text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <ChevronDown
                      onClick={() => {
                        if (!isItemDropdownOpen && itemInputRef.current) {
                          const rect = itemInputRef.current.getBoundingClientRect();
                          setItemDropdownStyle({
                            position: 'fixed',
                            top: rect.bottom + 4,
                            left: Math.max(10, Math.min(window.innerWidth - 380, rect.left)),
                            width: Math.max(340, rect.width * 1.4),
                            zIndex: 99999,
                          });
                        }
                        setIsItemDropdownOpen((prev) => !prev);
                      }}
                      className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 cursor-pointer"
                    />
                  </div>

                  {/* Dropdown Menu showing "NAME ~ <STOCK>" (Image 2 + Packaging details) */}
                  {isItemDropdownOpen && (
                    <div
                      style={itemDropdownStyle}
                      className="absolute top-full left-0 mt-1 min-w-[340px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs z-50"
                    >
                      <div className="p-2 border-b border-slate-800 bg-slate-950 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Type to filter items..."
                            value={itemSearchQuery}
                            onChange={(e) => {
                              setItemSearchQuery(e.target.value);
                              setHighlightedItemIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setHighlightedItemIndex((prev) => Math.min(prev + 1, Math.max(0, filteredProducts.length - 1)));
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setHighlightedItemIndex((prev) => Math.max(prev - 1, 0));
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredProducts.length > 0 && highlightedItemIndex >= 0 && highlightedItemIndex < filteredProducts.length) {
                                  handleSelectItem(filteredProducts[highlightedItemIndex]);
                                }
                              } else if (e.key === 'Escape') {
                                setIsItemDropdownOpen(false);
                              }
                            }}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setIsItemDropdownOpen(false)}
                            className="text-slate-400 hover:text-white px-1.5 py-0.5 text-xs font-bold hover:bg-slate-800 rounded cursor-pointer"
                            title="Close dropdown"
                          >
                            &times;
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none">
                            <input
                              type="checkbox"
                              checked={keepDropdownOpenOnSelect}
                              onChange={(e) => setKeepDropdownOpenOnSelect(e.target.checked)}
                              className="rounded border-slate-700 text-sky-600 focus:ring-0 w-3 h-3"
                            />
                            <span>Keep list open</span>
                          </label>
                          <span>{filteredProducts.length} items (Use ↑ ↓ &amp; Enter)</span>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                        {filteredProducts.map((p, idx) => {
                          const isSelected = selectedProductId === p.id;
                          const isHighlighted = idx === highlightedItemIndex;
                          const qCtn = Number(p.qtyInCarton) && Number(p.qtyInCarton) > 0 ? Number(p.qtyInCarton) : 1;
                          const ctnRate = Number(p.ctnPurchaseRate) || Number(((Number(p.purchasePrice) || 0) * qCtn).toFixed(2)) || 0;
                          const pkgUnit = ((p.category || '') + ' ' + (p.measure || '')).toLowerCase().includes('bag')
                            ? 'Bag'
                            : ((p.category || '') + ' ' + (p.measure || '')).toLowerCase().includes('box')
                            ? 'Box'
                            : 'CTN';

                          return (
                            <div
                              key={p.id}
                              onClick={() => handleSelectItem(p)}
                              onMouseEnter={() => setHighlightedItemIndex(idx)}
                              className={`px-3 py-2 cursor-pointer transition flex justify-between items-center text-slate-200 ${
                                isSelected
                                  ? 'bg-sky-950/90 border-l-4 border-sky-400 text-sky-200 font-bold'
                                  : isHighlighted
                                  ? 'bg-sky-900/60 border-l-4 border-sky-500 text-white font-semibold'
                                  : 'hover:bg-sky-900/30'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="font-semibold truncate text-white">{p.name}</div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                  <span>{pkgUnit}: {qCtn} units</span>
                                  <span>&bull;</span>
                                  <span className="text-amber-300">Rate: {currencySymbol()} {ctnRate}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`font-mono text-[11px] font-bold block ${
                                  Math.max(0, p.currentQuantity || 0) <= 5 ? 'text-rose-400' : 'text-sky-400'
                                }`}>
                                  ~ {Math.max(0, p.currentQuantity ?? 0)}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono block">
                                  {(Math.max(0, Number(p.currentQuantity) || 0) / (qCtn > 0 ? qCtn : 15)).toFixed(1)} {pkgUnit}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <div className="px-3 py-4 text-center text-slate-500">
                            No product found. Click [ + ] to add new!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>

                {/* CTN */}
                <td className="py-2 px-2">
                  <input
                    ref={ctnInputRef}
                    type="number"
                    min="0"
                    step="any"
                    value={ctn === 0 || ctn === '' ? '' : ctn}
                    onChange={(e) => handleCtnChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        ratePerCtnInputRef.current?.focus();
                        ratePerCtnInputRef.current?.select();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center font-mono font-bold text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* RATE/CTN */}
                <td className="py-2 px-2">
                  <input
                    ref={ratePerCtnInputRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={ratePerCtn}
                    onChange={(e) => handleRatePerCtnChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Strictly skip QTY/CTN capacity and jump directly to loose QTY input!
                        qtyInputRef.current?.focus();
                        qtyInputRef.current?.select();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-right font-mono font-bold text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* QTY/CTN (Strictly Non-Editable, skipped on Enter/Tab) */}
                <td className="py-2 px-2">
                  <input
                    type="number"
                    readOnly
                    tabIndex={-1}
                    value={qtyPerCtn}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-slate-400 text-xs pointer-events-none select-none"
                    title={`Capacity: ${qtyPerCtn} ${resolvedBaseUnit} per ${resolvedPackageType} (Non-editable)`}
                  />
                </td>

                {/* QTY (Direct Entry for kg / loose) */}
                <td className="py-2 px-2">
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="0"
                    step="any"
                    value={qty === 0 || qty === '' ? '' : qty}
                    onChange={(e) => handleQtyDirectChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rateInputRef.current?.focus();
                        rateInputRef.current?.select();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-right font-mono font-bold text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* RATE */}
                <td className="py-2 px-2">
                  <input
                    ref={rateInputRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={rate}
                    onChange={(e) => handleRateChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        discountInputRef.current?.focus();
                        discountInputRef.current?.select();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-right font-mono font-bold text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* DISC RS. */}
                <td className="py-2 px-2">
                  <input
                    ref={discountInputRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        vatPercentInputRef.current?.focus();
                        vatPercentInputRef.current?.select();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-right font-mono text-slate-300 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* VAT@% */}
                <td className="py-2 px-2">
                  <input
                    ref={vatPercentInputRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder={vatType === 'Percentage' ? '5' : '0.00'}
                    value={vatPercent}
                    onChange={(e) => setVatPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRowItem();
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-slate-300 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </td>

                {/* VAT AMOUNT */}
                <td className="py-2 px-2 text-right font-mono font-semibold text-slate-300">
                  {currentItemVatAmount.toFixed(2)}
                </td>

                {/* AMOUNT */}
                <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                  {currentItemTotalAmount.toFixed(2)}
                </td>

                {/* STOCK */}
                <td className="py-2 px-2 text-center font-mono">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-slate-200 font-bold">{itemStock}</span>
                    {currentItemTotalIntake > 0 && (
                      <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap">
                        +{currentItemTotalIntake} ➔ {currentItemNewStock}
                      </span>
                    )}
                  </div>
                </td>

                {/* ACTION: Blue [ Enter ] Button */}
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRowItem}
                    className="w-full px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-xs shadow transition cursor-pointer"
                    title="Enter this item into the bill"
                  >
                    Enter
                  </button>
                </td>
              </tr>

              {/* Added Line Items */}
              {billItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-800/40 text-slate-300 transition">
                  <td className="py-2 px-3 font-semibold text-white">
                    {index + 1}. {item.itemTitle}
                    {item.packageType && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                        {item.packageType}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-white">
                    {item.ctn > 0 ? (
                      <span>{item.ctn} <span className="text-[10px] text-sky-300 font-normal">{item.packageType || 'CTN'}</span></span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">{item.ratePerCtn ? `${currencySymbol()} ${item.ratePerCtn}` : '—'}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">{item.qtyPerCtn} {item.unit || 'KG'}/{item.packageType || 'CTN'}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-white">
                    {item.qty > 0 ? (
                      <span>{item.qty} <span className="text-[10px] text-sky-300 font-normal">{item.unit || 'KG'}</span></span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">{item.rate ? item.rate : '—'}</td>
                  <td className="py-2 px-2 text-right font-mono text-amber-400">{item.discount || 0}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">
                    {item.vatType === 'Amount' ? `${currencySymbol()} ${item.vatPercent}` : `${item.vatPercent}%`}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-300">{item.vatAmount.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                    {item.amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">
                    {item.stock !== undefined ? (
                      <span>
                        {item.stock}
                        {item.newStock !== undefined && item.newStock !== item.stock && (
                          <span className="text-[10px] text-emerald-400 block font-semibold">➔ {item.newStock}</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditRowItem(item.id)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                        title="Edit line item (reloads into entry row)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Row (Image 2 & Image 4) */}
            <tfoot className="bg-slate-950 font-bold border-t border-slate-700 text-white text-xs">
              <tr>
                <td className="py-2.5 px-3 uppercase tracking-wider text-slate-400">TOTAL</td>
                <td className="py-2.5 px-2 text-center font-mono text-sky-300">
                  {totalBillCtn.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{dominantPackageLabel}</span>
                </td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
                <td className="py-2.5 px-2 text-right font-mono text-sky-300">
                  {totalBillQty.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{dominantUnitLabel}</span>
                </td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
                <td className="py-2.5 px-2 text-right font-mono text-amber-400">
                  {totalBillItemDiscounts.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
                <td className="py-2.5 px-2 text-right font-mono text-sky-300">{totalBillVatAmount.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400 text-sm">
                  {grossBillAmount.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
                <td className="py-2.5 px-2 text-center text-slate-600">---</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* BOTTOM SECTION (Image 1 Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
          {/* Notes Left Side */}
          <div className="md:col-span-6 space-y-1">
            <label className="block text-slate-300 font-semibold text-xs">Notes :</label>
            <textarea
              rows={4}
              placeholder="Additional delivery instructions, vehicle number, carton specifications..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Totals & Expenses Right Side (Image 1) */}
          <div className="md:col-span-6 space-y-2 text-xs">
            <div className="grid grid-cols-2 items-center gap-2">
              <span className="text-slate-400 font-semibold">VAT Amount :</span>
              <input
                type="text"
                readOnly
                value={totalBillVatAmount.toFixed(2)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-right font-mono text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Load Exp:(-)</span>
                <input
                  type="checkbox"
                  checked={isLoadExpDeduction}
                  onChange={(e) => setIsLoadExpDeduction(e.target.checked)}
                  className="rounded accent-sky-500"
                  title="Check if loading expense is a deduction (-)"
                />
              </div>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={loadExp}
                onChange={(e) => setLoadExp(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-right font-mono text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-2 pt-1 border-t border-slate-800">
              <span className="text-white font-bold text-sm">Net Total:</span>
              <input
                type="text"
                readOnly
                value={netTotal.toFixed(2)}
                className="w-full bg-slate-950 border border-sky-600/50 rounded px-2.5 py-1.5 text-right font-mono font-black text-emerald-400 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-2">
              <span className="text-slate-300 font-semibold">Paid Amount:</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-right font-mono font-bold text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-2 text-xs font-semibold">
              <span className="text-amber-400">Balance:</span>
              <span className="text-right font-mono font-bold text-amber-400">
                {currencySymbol()} {remainingPayableBalance.toFixed(2)}
              </span>
            </div>

            {/* ACTION BUTTON (User requested: remove Add to Stock button, save report directly to Settings > Reports > Purchase Details) */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800/90">
              {editingBillId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
              <button
                type="button"
                id="btn-save-purchase-report"
                disabled={isSaving}
                onClick={handleSaveBill}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  editingBillId
                    ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white shadow-amber-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
                title={editingBillId ? 'Update Purchase Bill with all modified items' : 'Save purchasing details into database report'}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{editingBillId ? `Updating Bill #${billNumber}...` : 'Processing & Updating Stock...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingBillId ? `Update Purchase Bill #${billNumber}` : 'Save Report'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ADD PRODUCT / ITEM HEAD MODAL (Matching Image 1 & Image 3) */}
      <AddItemHeadModal
        isOpen={isQuickAddProductOpen}
        onClose={() => setIsQuickAddProductOpen(false)}
        onSuccess={(createdProduct) => {
          onRefreshData?.();
          handleSelectItem(createdProduct);
        }}
        categories={categories}
        brands={brands}
        measures={measures}
        onRefreshMasters={() => {
          api.getItemCategories().then(setCategories).catch(() => {});
          api.getItemBrands().then(setBrands).catch(() => {});
          api.getItemMeasures().then(setMeasures).catch(() => {});
        }}
      />

      {/* QUICK ADD SUPPLIER MODAL */}
      {isQuickAddSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Add New Supplier Account</span>
              </h3>
              <button onClick={() => setIsQuickAddSupplierOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSupplier} className="p-5 space-y-3 text-xs text-slate-300">
              <div>
                <label className="block font-semibold mb-1">Supplier / Account Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABDULLA AL KHATTAL GENERAL TRADING"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0300-XXXXXXX"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore / Karachi"
                    value={newSupCity}
                    onChange={(e) => setNewSupCity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddSupplierOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSupplier}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-xs transition"
                >
                  {isCreatingSupplier ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE INVOICE & RECEIPT MODAL (Unified with Reports Voucher Modal) */}
      {isInvoiceModalOpen && lastSavedBill && (
        <PurchaseBillVoucherModal
          bill={lastSavedBill}
          companyProfile={companyProfile}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

      {/* Purchase Return Modal */}
      <PurchaseReturnModal
        isOpen={isPurchaseReturnModalOpen}
        onClose={() => setIsPurchaseReturnModalOpen(false)}
        onSaved={() => {
          if (onRefreshData) onRefreshData();
        }}
        suppliers={suppliers}
        products={products}
      />

      {/* LOAD PURCHASE BILL MODAL */}
      {isLoadBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Load Purchase Bill to Edit</h3>
              </div>
              <button
                onClick={() => setIsLoadBillModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by Bill #, Supplier name..."
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
                autoFocus
              />

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-xl">
                {isLoadingRecentBills ? (
                  <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Loading recent bills...</span>
                  </div>
                ) : (
                  recentBills
                    .filter((b) => {
                      if (!billSearchQuery.trim()) return true;
                      const q = billSearchQuery.toLowerCase();
                      return (
                        (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
                        (b.supplierAccountTitle && b.supplierAccountTitle.toLowerCase().includes(q)) ||
                        (b.vendorBillNumber && b.vendorBillNumber.toLowerCase().includes(q))
                      );
                    })
                    .map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          loadBillIntoForm(b);
                          setIsLoadBillModalOpen(false);
                        }}
                        className="p-3 hover:bg-sky-950/40 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sky-400 font-mono">Bill #{b.billNumber}</span>
                            <span className="text-slate-400 text-[11px]">{b.date}</span>
                          </div>
                          <div className="text-white font-semibold mt-0.5">{b.supplierAccountTitle || 'Supplier'}</div>
                          <div className="text-slate-400 text-[10px]">{b.items?.length || 0} items &bull; Total: {currencySymbol()} {b.netTotal?.toLocaleString()}</div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          Load &amp; Edit
                        </button>
                      </div>
                    ))
                )}
                {!isLoadingRecentBills && recentBills.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs">No purchase bills found.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLoadBillModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};