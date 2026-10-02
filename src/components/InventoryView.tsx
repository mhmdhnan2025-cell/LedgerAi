import { currencySymbol } from '../utils/currency';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  Package,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Building2,
  Tag,
  Settings,
  ChevronDown,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw,
  Scale,
} from 'lucide-react';
import { Order, Product, ProductCategory, UnitType, UserRole } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { isBilingualMatch } from '../utils/productSynonyms';
import { api } from '../services/api';

interface InventoryViewProps {
  products: Product[];
  orders?: Order[];
  currentRole: UserRole;
  onCreateProduct: (product: any) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct?: (id: string) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products = [],
  orders = [],
  currentRole,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateTab,
}) => {
  // View mode: 'stock-position' (Image 3 design) vs 'order-shortages'
  const [activeViewMode, setActiveViewMode] = useState<'stock-position' | 'shortages'>('stock-position');

  // Filter States matching Image 3
  const [filterCategory, setFilterCategory] = useState<string>('Nothing selected');
  const [filterCompany, setFilterCompany] = useState<string>('Nothing selected');
  const [filterArticle, setFilterArticle] = useState<string>('');
  const [filterItemName, setFilterItemName] = useState<string>('');
  const [filterBarcode, setFilterBarcode] = useState<string>('');
  const [filterManualBarcode, setFilterManualBarcode] = useState<string>('');
  const [filterCustomField1, setFilterCustomField1] = useState<string>('Nothing selected');
  const [filterCustomField2, setFilterCustomField2] = useState<string>('Nothing selected');
  const [filterOrderBy, setFilterOrderBy] = useState<string>('Nothing selected');

  // Checkbox options matching Image 3
  const [colUpdateMCode, setColUpdateMCode] = useState<boolean>(false);
  const [colUpdateCompany, setColUpdateCompany] = useState<boolean>(false);
  const [showCategory, setShowCategory] = useState<boolean>(false);
  const [colUpdateCategory, setColUpdateCategory] = useState<boolean>(false);
  const [colUpdatePurchaseRate, setColUpdatePurchaseRate] = useState<boolean>(false);
  const [showCompany, setShowCompany] = useState<boolean>(false);
  const [colUpdateMiniQty, setColUpdateMiniQty] = useState<boolean>(false);
  const [colUpdateSalesRate, setColUpdateSalesRate] = useState<boolean>(false);
  const [showArticle, setShowArticle] = useState<boolean>(false);
  const [colUpdateDiscount, setColUpdateDiscount] = useState<boolean>(false);
  const [zeroStockHide, setZeroStockHide] = useState<boolean>(false);

  // Modal State for Add / Edit Item (Images 1 & 2)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form Fields matching Images 1 & 2 - Completely empty by default (no demo/mock values)
  const [formCategory, setFormCategory] = useState<string>('');
  const [formMCode, setFormMCode] = useState<string>('');
  const [formItemTitle, setFormItemTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMeasure, setFormMeasure] = useState<string>('');
  const [formCompanyBrand, setFormCompanyBrand] = useState<string>('');

  // Unified Packaging Mode & Quantities - Single section for all packaging types
  // If CTN/Bag/Box/Packet/Tin selected → ask: how many packages + qty per package
  // If "Single" (no packaging) → just enter total stock amount directly
  const [formPackageType, setFormPackageType] = useState<'carton' | 'bag' | 'box' | 'packet' | 'tin' | 'single'>('single');
  const [formPackageCount, setFormPackageCount] = useState<number | string>(''); // Kitny CTN / Bag / Box / Packet / Tin hain
  const [formQtyPerPackage, setFormQtyPerPackage] = useState<number | string>(''); // Quantity per package (e.g., 50kg per bag, 24 pcs per box)
  const [formLooseUnits, setFormLooseUnits] = useState<number | string>(''); // Extra loose pieces
  const [formTotalStock, setFormTotalStock] = useState<number | string>(''); // For single items: direct stock amount
  const [formPurchasePrice, setFormPurchasePrice] = useState<number | string>(''); // Per unit purchase price
  const [formPrchFixedPrice, setFormPrchFixedPrice] = useState<boolean>(false);
  const [formPackagePurchaseRate, setFormPackagePurchaseRate] = useState<number | string>(''); // Per package purchase rate
  const [formSalePrice, setFormSalePrice] = useState<number | string>(''); // Per unit sale price
  const [formSaleFixedPrice, setFormSaleFixedPrice] = useState<boolean>(false);
  const [formPackageSaleRate, setFormPackageSaleRate] = useState<number | string>(''); // Per package sale rate
  const [formPackageMinSaleRate, setFormPackageMinSaleRate] = useState<number | string>(''); // Per package min sale rate
  const [formSaleDiscount, setFormSaleDiscount] = useState<number | string>('');
  const [formSaleMinPrice, setFormSaleMinPrice] = useState<number | string>('');
  const [formMinQuantity, setFormMinQuantity] = useState<number | string>('');
  const [formComments, setFormComments] = useState<string>('');
  const [formScanTypeGeneral, setFormScanTypeGeneral] = useState<boolean>(true);
  const [formCustomFields, setFormCustomFields] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('');
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);

  // Dynamic Categories, Brands & Measures loaded from Database
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [measuresList, setMeasuresList] = useState<string[]>([]);

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

  // Fetch Categories, Brands, Measures on mount
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
          if (cats && cats.length > 0) setCategoriesList(cats);
          if (brs && brs.length > 0) setBrandsList(brs);
          if (msrs && msrs.length > 0) setMeasuresList(msrs);
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

  // Quick-Add Handlers with instant persistence & selection
  const handleQuickAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryInline.trim();
    if (!clean) return;
    setIsSavingCategory(true);
    try {
      const updated = await api.createItemCategory(clean);
      setCategoriesList(updated);
      setFormCategory(clean);
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
      setBrandsList(updated);
      setFormCompanyBrand(clean);
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
      setMeasuresList(updated);
      setFormMeasure(clean);
      setNewMeasureInline('');
      setShowAddMeasureInline(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add measure');
    } finally {
      setIsSavingMeasure(false);
    }
  };

  // Delete product state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProd, setIsDeletingProd] = useState<boolean>(false);

  // Quick Restock / Stock Adjustment modal state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockCost, setRestockCost] = useState<number>(0);
  const [restockSellingPrice, setRestockSellingPrice] = useState<number>(0);
  const [restockNotes, setRestockNotes] = useState<string>('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState<boolean>(false);

  // Inline Notification
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique categories and brands combining server master + products
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(categoriesList);
    products.forEach((p) => {
      if (p.category && p.category !== 'Nothing selected') set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoriesList, products]);

  const companyBrandOptions = useMemo(() => {
    const set = new Set<string>(brandsList);
    products.forEach((p) => {
      if (p.companyBrand && p.companyBrand !== 'Nothing selected') set.add(p.companyBrand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brandsList, products]);

  // Measures including Gram, Kilo Gram, Litter, Carton, etc.
  const measureOptions = useMemo(() => {
    const priority = ['Gram', 'Kilo Gram', 'Litter', 'Gram (g)', 'Kilogram (Kg)', 'Litre (Ltr)'];
    const standardUnits = [
      'Carton (CTN)',
      'Pieces (PCS)',
      'Bag (Bori)',
      'Box',
      'Packet (Pack)',
      'Tin',
      'Dozen',
      'Meter',
    ];
    const rest = new Set<string>(standardUnits);
    measuresList.forEach((m) => {
      if (m && m.trim() && !priority.some((p) => p.toLowerCase() === m.toLowerCase())) {
        rest.add(m.trim());
      }
    });
    products.forEach((p) => {
      if (p.measure && p.measure !== 'Nothing selected' && p.measure.trim()) {
        if (!priority.some((pr) => pr.toLowerCase() === p.measure!.toLowerCase())) {
          rest.add(p.measure.trim());
        }
      }
    });
    return [...priority, ...Array.from(rest)];
  }, [measuresList, products]);

  // Dynamic order metrics (shortage & ordered quantity)
  const productMetrics = useMemo(() => {
    const map = new Map<string, { totalOrdered: number; shortage: number }>();
    const activeOrders = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Delivered');
    for (const order of activeOrders) {
      for (const item of order.items) {
        const prev = map.get(item.productId) || { totalOrdered: 0, shortage: 0 };
        prev.totalOrdered += Number(item.quantity) || 0;
        prev.shortage += Number(item.shortageQuantity) || 0;
        map.set(item.productId, prev);
      }
    }
    return map;
  }, [orders]);

  const getProductOrderMetrics = (prod: Product) => {
    const fromMap = productMetrics.get(prod.id);
    const totalOrdered = prod.totalOrderedQuantity ?? fromMap?.totalOrdered ?? 0;
    const baseShortage = prod.shortageQuantity ?? fromMap?.shortage ?? 0;
    const stock = prod.totalStock !== undefined ? prod.totalStock : prod.currentQuantity;
    const shortage = stock >= totalOrdered ? 0 : Math.max(0, baseShortage > 0 ? baseShortage - stock : totalOrdered - stock);
    return { totalOrdered, shortage };
  };

  const productsWithShortage = useMemo(() => {
    return products.filter((p) => {
      const { shortage } = getProductOrderMetrics(p);
      return shortage > 0;
    });
  }, [products, productMetrics]);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const stock = p.totalStock !== undefined ? p.totalStock : p.currentQuantity;

      // Zero Stock Hide filter
      if (zeroStockHide && stock <= 0) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'Nothing selected') {
        if (p.category !== filterCategory) return false;
      }

      // Company filter
      if (filterCompany !== 'Nothing selected') {
        if (p.companyBrand !== filterCompany) return false;
      }

      // Article# filter
      if (filterArticle.trim()) {
        const art = (p.articleNo || '').toLowerCase();
        if (!art.includes(filterArticle.trim().toLowerCase())) return false;
      }

      // Item Name filter
      if (filterItemName.trim()) {
        const query = filterItemName.trim().toLowerCase();
        const matchesName =
          p.name.toLowerCase().includes(query) ||
          (p.itemTitle && p.itemTitle.toLowerCase().includes(query)) ||
          (p.mcode && p.mcode.toLowerCase().includes(query)) ||
          isBilingualMatch(query, p.name);
        if (!matchesName) return false;
      }

      // Barcode filter
      if (filterBarcode.trim()) {
        const bc = (p.barcode || '').toLowerCase();
        if (!bc.includes(filterBarcode.trim().toLowerCase())) return false;
      }

      // Manual Barcode filter
      if (filterManualBarcode.trim()) {
        const mbc = (p.manualBarcode || '').toLowerCase();
        if (!mbc.includes(filterManualBarcode.trim().toLowerCase())) return false;
      }

      return true;
    });

    // Apply Order By
    if (filterOrderBy !== 'Nothing selected') {
      result = [...result].sort((a, b) => {
        const stockA = a.totalStock !== undefined ? a.totalStock : a.currentQuantity;
        const stockB = b.totalStock !== undefined ? b.totalStock : b.currentQuantity;
        const pRateA = a.ctnPurchaseRate || a.purchasePrice;
        const pRateB = b.ctnPurchaseRate || b.purchasePrice;
        const sRateA = a.ctnSaleRate || a.sellingPrice;
        const sRateB = b.ctnSaleRate || b.sellingPrice;

        switch (filterOrderBy) {
          case 'Item Name ASC':
            return a.name.localeCompare(b.name);
          case 'Item Name DESC':
            return b.name.localeCompare(a.name);
          case 'Stock High to Low':
            return stockB - stockA;
          case 'Stock Low to High':
            return stockA - stockB;
          case 'Purchase Rate High to Low':
            return pRateB - pRateA;
          case 'Sale Rate High to Low':
            return sRateB - sRateA;
          case 'M.Code ASC':
            return (a.mcode || '').localeCompare(b.mcode || '');
          default:
            return 0;
        }
      });
    }

    return result;
  }, [
    products,
    filterCategory,
    filterCompany,
    filterArticle,
    filterItemName,
    filterBarcode,
    filterManualBarcode,
    filterOrderBy,
    zeroStockHide,
  ]);

  // Aggregate Totals for Table Footer
  const summaryTotals = useMemo(() => {
    let totalStockSum = 0;
    let totalCartonSum = 0;
    let totalPcsSum = 0;
    let totalStockValue = 0;

    filteredProducts.forEach((p) => {
      const rawStock = p.totalStock !== undefined ? p.totalStock : p.currentQuantity;
      const stock = Number(rawStock) || 0;
      const qCtn = Number(p.qtyInCarton) && Number(p.qtyInCarton) > 0 ? Number(p.qtyInCarton) : 1;
      let ctn = 0;
      let pcs = 0;

      if (qCtn > 1) {
        if (stock >= 0) {
          ctn = Math.floor(stock / qCtn);
          pcs = Math.round(stock % qCtn);
        } else {
          ctn = Math.ceil(stock / qCtn);
          pcs = Math.round(stock % qCtn);
        }
      } else {
        ctn = Math.floor(stock);
        pcs = 0;
      }

      if (isNaN(ctn)) ctn = 0;
      if (isNaN(pcs)) pcs = 0;

      totalStockSum += stock;
      totalCartonSum += ctn;
      totalPcsSum += pcs;
      totalStockValue += (Number(stock) || 0) * (Number(p.purchasePrice) || 0);
    });

    return {
      totalStockSum: isNaN(totalStockSum) ? 0 : totalStockSum,
      totalCartonSum: isNaN(totalCartonSum) ? 0 : totalCartonSum,
      totalPcsSum: isNaN(totalPcsSum) ? 0 : totalPcsSum,
      totalStockValue: isNaN(totalStockValue) ? 0 : totalStockValue,
      count: filteredProducts.length,
    };
  }, [filteredProducts]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterCategory('Nothing selected');
    setFilterCompany('Nothing selected');
    setFilterArticle('');
    setFilterItemName('');
    setFilterBarcode('');
    setFilterManualBarcode('');
    setFilterCustomField1('Nothing selected');
    setFilterCustomField2('Nothing selected');
    setFilterOrderBy('Nothing selected');
    setZeroStockHide(false);
  };

  // Open Add New Modal (resetting form fields - all blank, no prefill)
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setEditingProductId(null);
    setFormCategory('');
    setFormMCode('');
    setFormItemTitle('');
    setFormDescription('');
    setFormMeasure('');
    setFormCompanyBrand('');
    setFormPackageType('single');
    setFormPackageCount('');
    setFormQtyPerPackage('');
    setFormLooseUnits('');
    setFormTotalStock('');
    setFormPurchasePrice('');
    setFormPrchFixedPrice(false);
    setFormPackagePurchaseRate('');
    setFormSalePrice('');
    setFormSaleFixedPrice(false);
    setFormPackageSaleRate('');
    setFormPackageMinSaleRate('');
    setFormSaleDiscount('');
    setFormSaleMinPrice('');
    setFormMinQuantity('');
    setFormComments('');
    setFormScanTypeGeneral(true);
    setFormCustomFields('');
    setFormImage('');
    setShowAddCategoryInline(false);
    setShowAddBrandInline(false);
    setShowAddMeasureInline(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal for a specific product
  const handleOpenEditModal = (prod: Product) => {
    setIsEditMode(true);
    setEditingProductId(prod.id);
    setFormCategory(prod.category || 'Nothing selected');
    setFormMCode(prod.mcode || prod.sku || '');
    setFormItemTitle(prod.itemTitle || prod.name || '');
    setFormDescription(prod.description || '');
    setFormMeasure(prod.measure || prod.unit || 'KG');
    setFormCompanyBrand(prod.companyBrand || 'Nothing selected');
    
    // Determine package type from existing data
    const existingQCtn = prod.qtyInCarton && prod.qtyInCarton > 0 ? prod.qtyInCarton : 1;
    const catMeasure = `${prod.category || ''} ${prod.measure || ''}`.toLowerCase();
    let pkgType: 'carton' | 'bag' | 'box' | 'packet' | 'tin' | 'single' = 'single';
    if (catMeasure.includes('bag') || catMeasure.includes('bori')) pkgType = 'bag';
    else if (catMeasure.includes('box') || catMeasure.includes('dabba')) pkgType = 'box';
    else if (catMeasure.includes('packet') || catMeasure.includes('pack')) pkgType = 'packet';
    else if (catMeasure.includes('tin') || catMeasure.includes('drum') || catMeasure.includes('can')) pkgType = 'tin';
    else if (existingQCtn > 1) pkgType = 'carton';
    
    setFormPackageType(pkgType);
    
    if (pkgType === 'single') {
      // Single item - just total stock
      setFormTotalStock(prod.totalStock !== undefined ? prod.totalStock : prod.currentQuantity);
      setFormPackageCount('');
      setFormQtyPerPackage('');
      setFormLooseUnits('');
    } else {
      // Packaged item - calculate package count and qty per package
      const totalStock = prod.totalStock !== undefined ? prod.totalStock : prod.currentQuantity;
      setFormPackageCount(Math.floor(totalStock / existingQCtn));
      setFormQtyPerPackage(existingQCtn);
      setFormLooseUnits(totalStock % existingQCtn);
      setFormTotalStock(totalStock);
    }
    
    setFormPurchasePrice(prod.purchasePrice);
    setFormPrchFixedPrice(Boolean(prod.prchFixedPrice));
    setFormSalePrice(prod.salePrice || prod.sellingPrice);
    setFormSaleFixedPrice(Boolean(prod.saleFixedPrice));
    setFormSaleDiscount(prod.saleDiscount || 0);
    setFormSaleMinPrice(prod.saleMinPrice || prod.sellingPrice);
    setFormMinQuantity(prod.minQuantity !== undefined ? prod.minQuantity : prod.minStockLevel);
    setFormComments(prod.comments || '');
    setFormScanTypeGeneral(prod.scanType !== 'Barcode');
    setFormCustomFields(prod.customFields || '');
    setFormImage(prod.image || '');
    setIsFormModalOpen(true);
  };

  // Calculate derived values for form
  const computedPkgCount = Number(formPackageCount) || 0;
  const computedQtyPerPkg = Number(formQtyPerPackage) || 1;
  const computedLooseUnits = Number(formLooseUnits) || 0;
  const computedTotalStock = formPackageType === 'single' 
    ? (Number(formTotalStock) || 0) 
    : (computedPkgCount * computedQtyPerPkg + computedLooseUnits);
  const computedQtyInCarton = formPackageType === 'single' ? 1 : computedQtyPerPkg;
  const computedCtnPurchaseRate = formPackageType === 'single' ? 0 : (Number(formPackagePurchaseRate) || 0);
  const computedCtnSaleRate = formPackageType === 'single' ? 0 : (Number(formPackageSaleRate) || 0);
  const computedCtnMinSaleRate = formPackageType === 'single' ? 0 : (Number(formPackageMinSaleRate) || 0);
  const computedPurchasePrice = Number(formPurchasePrice) || (computedCtnPurchaseRate > 0 && computedQtyPerPkg > 0 
    ? parseFloat((computedCtnPurchaseRate / computedQtyPerPkg).toFixed(2)) 
    : 0);
  const computedSalePrice = Number(formSalePrice) || (computedCtnSaleRate > 0 && computedQtyPerPkg > 0 
    ? parseFloat((computedCtnSaleRate / computedQtyPerPkg).toFixed(2)) 
    : 0);
  const computedMinQuantity = Number(formMinQuantity) || 5;

  // Submit Add / Edit Form
  const handleSubmitItemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemTitle.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Item Title is required!' });
      return;
    }

    setIsSubmittingForm(true);
    setFeedbackMsg(null);
    try {
      const payload: Partial<Product> = {
        name: formItemTitle.trim(),
        itemTitle: formItemTitle.trim(),
        mcode: formMCode.trim(),
        sku: formMCode.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        description: formDescription.trim(),
        category: formCategory.trim() && formCategory !== 'Nothing selected' ? formCategory.trim() : 'General',
        measure: formMeasure.trim() && formMeasure !== 'Nothing selected' ? formMeasure.trim() : 'Kilogram (Kg)',
        unit: (formMeasure.trim() && formMeasure !== 'Nothing selected' ? formMeasure.trim().toLowerCase() : 'kg') as UnitType,
        companyBrand: formCompanyBrand.trim() && formCompanyBrand !== 'Nothing selected' ? formCompanyBrand.trim() : '',
        qtyInCarton: computedQtyInCarton,
        ctnPurchaseRate: computedCtnPurchaseRate,
        ctnSaleRate: computedCtnSaleRate,
        ctnMinSaleRate: computedCtnMinSaleRate,
        totalStock: computedTotalStock,
        currentQuantity: computedTotalStock,
        minQuantity: computedMinQuantity,
        minStockLevel: computedMinQuantity,
        purchasePrice: computedPurchasePrice,
        prchFixedPrice: formPrchFixedPrice,
        sellingPrice: computedSalePrice,
        salePrice: computedSalePrice,
        saleFixedPrice: formSaleFixedPrice,
        saleDiscount: Number(formSaleDiscount) || 0,
        saleMinPrice: Number(formSaleMinPrice) || computedSalePrice,
        comments: formComments.trim(),
        scanType: formScanTypeGeneral ? 'General' : 'Barcode',
        customFields: formCustomFields.trim(),
        image: formImage,
        status: true,
      };

      if (isEditMode && editingProductId) {
        await onUpdateProduct(editingProductId, payload);
        setFeedbackMsg({ type: 'success', text: `Product "${formItemTitle}" updated successfully!` });
      } else {
        await onCreateProduct(payload);
        setFeedbackMsg({ type: 'success', text: `Product "${formItemTitle}" added successfully!` });
      }

      setIsFormModalOpen(false);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Toggle item status
  const handleToggleStatus = async (prod: Product) => {
    const current = prod.status !== undefined ? prod.status : true;
    try {
      await onUpdateProduct(prod.id, { status: !current });
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Delete product confirmation
  const handleConfirmDelete = async () => {
    if (!productToDelete || !onDeleteProduct) return;
    setIsDeletingProd(true);
    try {
      await onDeleteProduct(productToDelete.id);
      setFeedbackMsg({ type: 'success', text: `Product "${productToDelete.name}" deleted successfully.` });
      setProductToDelete(null);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete product' });
    } finally {
      setIsDeletingProd(false);
    }
  };

  // Quick Restock submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    setIsSubmittingRestock(true);
    try {
      const currentStock = restockProduct.totalStock !== undefined ? restockProduct.totalStock : restockProduct.currentQuantity;
      const newStock = currentStock + Number(restockQty);
      await onUpdateProduct(restockProduct.id, {
        totalStock: newStock,
        currentQuantity: newStock,
        purchasePrice: Number(restockCost) || restockProduct.purchasePrice,
        sellingPrice: Number(restockSellingPrice) || restockProduct.sellingPrice,
        notes: restockNotes || `Restocked ${restockQty} ${restockProduct.unit}`,
      });
      setFeedbackMsg({ type: 'success', text: `Restocked ${restockQty} units for ${restockProduct.name}.` });
      setRestockProduct(null);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Restock failed' });
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = [
      'SR#',
      'M.CODE',
      'ARTICLE#',
      'CATEGORY',
      'COMPANY',
      'ITEM',
      'TYPE',
      'P.RATE',
      'S.RATE',
      'DISC',
      'T.STOCK',
      'CARTON',
      'PCS',
      'STATUS',
    ];

    const rows = filteredProducts.map((p, idx) => {
      const stock = p.totalStock !== undefined ? p.totalStock : p.currentQuantity;
      const qCtn = p.qtyInCarton && p.qtyInCarton > 0 ? p.qtyInCarton : 1;
      let ctn = 0;
      let pcs = 0;
      if (qCtn > 1) {
        if (stock >= 0) {
          ctn = Math.floor(stock / qCtn);
          pcs = Math.round(stock % qCtn);
        } else {
          ctn = Math.ceil(stock / qCtn);
          pcs = Math.round(stock % qCtn);
        }
      } else {
        ctn = Math.floor(stock);
      }

      const pRate = (p.ctnPurchaseRate || p.purchasePrice * qCtn).toFixed(2);
      const sRate = (p.ctnSaleRate || p.sellingPrice * qCtn).toFixed(2);
      const disc = (p.saleDiscount || 0).toFixed(2);
      const statusText = (p.status !== undefined ? p.status : true) ? 'Active' : 'Inactive';

      return [
        idx + 1,
        `"${p.mcode || p.sku || ''}"`,
        `"${p.articleNo || ''}"`,
        `"${p.category || ''}"`,
        `"${p.companyBrand || ''}"`,
        `"${p.itemTitle || p.name || ''}"`,
        `"${p.scanType || 'General'}"`,
        pRate,
        sRate,
        disc,
        stock.toFixed(2),
        ctn,
        pcs,
        statusText,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Position_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Actions Bar (Matching Image 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm print:hidden">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-400 font-semibold">
            <Settings className="w-4 h-4 text-blue-400" />
            <span>Settings</span>
          </div>
          <span className="text-slate-600">&gt;</span>
          <span className="text-blue-400 font-bold">Items Management</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
            {products.length} Items Total
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <button
            onClick={() => setActiveViewMode(activeViewMode === 'stock-position' ? 'shortages' : 'stock-position')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              activeViewMode === 'shortages'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Order Shortages ({productsWithShortage.length})</span>
          </button>

          <button
            onClick={() => {
              // Trigger search focus
              const input = document.getElementById('filter-item-name-input');
              if (input) input.focus();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-md print:hidden ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WHOLESALE ORDER SHORTAGE BANNER */}
      {productsWithShortage.length > 0 && activeViewMode === 'shortages' && (
        <div className="bg-gradient-to-r from-rose-950/50 via-slate-900 to-amber-950/30 border border-rose-600/40 rounded-2xl p-4 shadow-lg print:hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  Active Order Stock Shortages (آرڈرز کی کمی کا الرٹ)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {productsWithShortage.length} Items Deficient
                </span>
              </div>
              <p className="text-xs text-slate-300">
                The following warehouse items have demand exceeding available stock. Click Restock to fulfill deliveries:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {productsWithShortage.map((p) => {
                  const { totalOrdered, shortage } = getProductOrderMetrics(p);
                  const stock = p.totalStock !== undefined ? p.totalStock : p.currentQuantity;
                  return (
                    <div
                      key={p.id}
                      className="bg-slate-950/90 border border-rose-700/60 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs min-w-[260px]"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>
                            Demand: <strong className="text-indigo-300">{totalOrdered} {p.unit}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Stock: <strong className="text-slate-300">{stock} {p.unit}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-rose-400 font-extrabold text-xs">
                          Kami: {shortage} {p.unit}
                        </span>
                        <button
                          onClick={() => {
                            setRestockProduct(p);
                            setRestockCost(p.purchasePrice);
                            setRestockSellingPrice(p.sellingPrice);
                            setRestockQty(shortage);
                            setRestockNotes(`Restock ${shortage} ${p.unit} for pending orders deficit`);
                          }}
                          className="mt-1 px-2 py-0.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded text-[10px] font-bold border border-rose-500/40 transition cursor-pointer"
                        >
                          Restock {shortage} {p.unit}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BOX (Exact layout from Image 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm print:hidden">
        {/* Row 1: Category */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Category :
          </label>
          <div className="md:col-span-10">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Nothing selected">Nothing selected</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Company & Article# */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Company :
          </label>
          <div className="md:col-span-4">
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Nothing selected">Nothing selected</option>
              {companyBrandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Article#
          </label>
          <div className="md:col-span-4">
            <input
              type="text"
              value={filterArticle}
              onChange={(e) => setFilterArticle(e.target.value)}
              placeholder=""
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            >
            </input>
          </div>
        </div>

        {/* Row 3: Item Name, Barcode, Manual Barcode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Item Name :
          </label>
          <div className="md:col-span-3">
            <input
              id="filter-item-name-input"
              type="text"
              value={filterItemName}
              onChange={(e) => setFilterItemName(e.target.value)}
              placeholder=""
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <label className="md:col-span-1 text-slate-300 font-semibold text-right pr-2">
            Barcode
          </label>
          <div className="md:col-span-3">
            <input
              type="text"
              value={filterBarcode}
              onChange={(e) => setFilterBarcode(e.target.value)}
              placeholder=""
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <label className="md:col-span-1 text-slate-300 font-semibold text-right pr-2">
            Manual Barcode
          </label>
          <div className="md:col-span-2">
            <input
              type="text"
              value={filterManualBarcode}
              onChange={(e) => setFilterManualBarcode(e.target.value)}
              placeholder=""
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 4: Custom Fields */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Custom Fields :
          </label>
          <div className="md:col-span-5">
            <select
              value={filterCustomField1}
              onChange={(e) => setFilterCustomField1(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Nothing selected">Nothing selected</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <select
              value={filterCustomField2}
              onChange={(e) => setFilterCustomField2(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Nothing selected">Nothing selected</option>
            </select>
          </div>
        </div>

        {/* Row 5: Order By */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <label className="md:col-span-2 text-slate-300 font-semibold text-right pr-2">
            Order By :
          </label>
          <div className="md:col-span-10">
            <select
              value={filterOrderBy}
              onChange={(e) => setFilterOrderBy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Nothing selected">Nothing selected</option>
              <option value="Item Name ASC">Item Name (A to Z)</option>
              <option value="Item Name DESC">Item Name (Z to A)</option>
              <option value="Stock High to Low">Stock (Highest first)</option>
              <option value="Stock Low to High">Stock (Lowest first)</option>
              <option value="Purchase Rate High to Low">Purchase Rate (High to Low)</option>
              <option value="Sale Rate High to Low">Sale Rate (High to Low)</option>
              <option value="M.Code ASC">M.Code (Ascending)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Matrix (Matching Image 3) */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-2 gap-x-4 text-xs text-slate-300">
            {/* Column 1 */}
            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateMCode}
                onChange={(e) => setColUpdateMCode(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>M.CODE Update</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateCompany}
                onChange={(e) => setColUpdateCompany(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>Company Update</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={showCategory}
                onChange={(e) => setShowCategory(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className={showCategory ? 'text-blue-400 font-bold' : ''}>Show Category</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateCategory}
                onChange={(e) => setColUpdateCategory(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>Category Update</span>
            </label>

            {/* Column 2 */}
            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdatePurchaseRate}
                onChange={(e) => setColUpdatePurchaseRate(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>PurchaseRate Update</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={showCompany}
                onChange={(e) => setShowCompany(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className={showCompany ? 'text-blue-400 font-bold' : ''}>Show Company</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateMiniQty}
                onChange={(e) => setColUpdateMiniQty(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>Mini Qty Update</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateSalesRate}
                onChange={(e) => setColUpdateSalesRate(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>SalesRate Update</span>
            </label>

            {/* Column 3 */}
            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={showArticle}
                onChange={(e) => setShowArticle(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className={showArticle ? 'text-blue-400 font-bold' : ''}>Show Article</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={colUpdateDiscount}
                onChange={(e) => setColUpdateDiscount(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>Discount Update</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
              <input
                type="checkbox"
                checked={zeroStockHide}
                onChange={(e) => setZeroStockHide(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className={zeroStockHide ? 'text-amber-400 font-bold' : ''}>Zero Stock Hide</span>
            </label>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => {
              // Filters already apply reactively
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* STOCK POSITION SECTION (Matching Image 3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Section Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Stock Position &amp; Packaging Inventory</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Report generated on : <span className="font-mono text-slate-300">{currentDateFormatted}</span> &bull; Showing <span className="text-white font-bold">{filteredProducts.length}</span> items
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              title="Download Stock Position as Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              title="Print Stock Position Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Stock Valuation & Volume Summary KPI Cards (User mandate: "stock ki quantity amount sab details stock main sai show hoi chhye") */}
        <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Physical Stock Qty</span>
            <span className="text-base font-black font-mono text-white mt-0.5 block">
              {filteredProducts.reduce((s, p) => s + (Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Across {filteredProducts.length} items</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Stock Purchase Valuation</span>
            <span className="text-base font-black font-mono text-emerald-400 mt-0.5 block">
              {currencySymbol()} {filteredProducts.reduce((s, p) => s + ((Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0) * (Number(p.purchasePrice) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">Cost value of physical goods</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Expected Wholesale Value</span>
            <span className="text-base font-black font-mono text-sky-400 mt-0.5 block">
              {currencySymbol()} {filteredProducts.reduce((s, p) => s + ((Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0) * (Number(p.sellingPrice) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sale value at standard rates</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Stock Status Alerts</span>
            <div className="flex items-center gap-3 mt-1 font-mono text-xs">
              <span className="text-amber-400 font-bold">
                {filteredProducts.filter((p) => {
                  const s = Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0;
                  return s <= (p.minStockLevel || 5) && s > 0;
                }).length} Low
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-bold">
                {filteredProducts.filter((p) => (Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0) <= 0).length} Zero
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Threshold warnings</span>
          </div>
        </div>

        {/* Printable Header Info (Visible only during print) */}
        <div className="hidden print:block p-4 border-b border-slate-300 text-black">
          <h1 className="text-xl font-bold">Stock Position Report</h1>
          <p className="text-xs">Generated on: {currentDateFormatted}</p>
        </div>

        {/* Main Stock Position Table (Matching Image 3 Columns + Amount) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">SR#</th>
                <th className="py-2.5 px-3">M.CODE</th>
                {showArticle && <th className="py-2.5 px-3">ARTICLE#</th>}
                {showCategory && <th className="py-2.5 px-3">CATEGORY</th>}
                {showCompany && <th className="py-2.5 px-3">COMPANY</th>}
                <th className="py-2.5 px-3 min-w-[180px]">ITEM</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3 text-right">P.RATE</th>
                <th className="py-2.5 px-3 text-right">S.RATE</th>
                <th className="py-2.5 px-3 text-right">DISC</th>
                <th className="py-2.5 px-3 text-right font-black">T.STOCK</th>
                <th className="py-2.5 px-3 text-right">PKG/CTN/BAG</th>
                <th className="py-2.5 px-3 text-right">LOOSE/PCS</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">STOCK VALUE (RS)</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-center print:hidden">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={13 + (showArticle ? 1 : 0) + (showCategory ? 1 : 0) + (showCompany ? 1 : 0)}
                    className="py-12 text-center text-slate-500 font-sans"
                  >
                    No stock items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod, index) => {
                  const rawStock = prod.totalStock !== undefined ? prod.totalStock : prod.currentQuantity;
                  const stock = Number(rawStock) || 0;
                  const qCtn = Number(prod.qtyInCarton) && Number(prod.qtyInCarton) > 0 ? Number(prod.qtyInCarton) : 1;

                  let cartons = 0;
                  let pcs = 0;
                  if (qCtn > 1) {
                    if (stock >= 0) {
                      cartons = Math.floor(stock / qCtn);
                      pcs = Math.round(stock % qCtn);
                    } else {
                      cartons = Math.ceil(stock / qCtn);
                      pcs = Math.round(stock % qCtn);
                    }
                  } else {
                    cartons = Math.floor(stock);
                    pcs = 0;
                  }
                  if (isNaN(cartons)) cartons = 0;
                  if (isNaN(pcs)) pcs = 0;

                  const rawMeasure = (prod.measure || prod.unit || 'CTN').toString().trim();
                  const isKg = rawMeasure.toLowerCase().includes('kg') || rawMeasure.toLowerCase().includes('kilo') || rawMeasure.toLowerCase().includes('gram');
                  const isLtr = rawMeasure.toLowerCase().includes('lit') || rawMeasure.toLowerCase().includes('ltr');
                  const isBox = rawMeasure.toLowerCase().includes('box') || rawMeasure.toLowerCase().includes('dabba');
                  const isBag = rawMeasure.toLowerCase().includes('bag') || rawMeasure.toLowerCase().includes('bori');
                  const isCtn = !isKg && !isLtr && !isBox && !isBag;
                  const displayUnit = isKg ? 'KG' : isLtr ? 'Litter' : isBox ? 'Box' : isBag ? 'Bag' : 'CTN';

                  let formattedStockDisplay = '';
                  if (qCtn > 1) {
                    if (pcs > 0) {
                      formattedStockDisplay = `${cartons}.${pcs}`;
                    } else {
                      formattedStockDisplay = `${cartons}`;
                    }
                  } else {
                    if (isCtn) {
                      formattedStockDisplay = Number.isInteger(stock) ? `${stock}` : `${stock}`;
                    } else if (isKg || isLtr) {
                      formattedStockDisplay = Number.isInteger(stock) ? `${stock}.00` : `${stock.toFixed(2)}`;
                    } else {
                      formattedStockDisplay = Number.isInteger(stock) ? `${stock}` : `${stock.toFixed(2)}`;
                    }
                  }

                  const pRate = (Number(prod.ctnPurchaseRate) || (Number(prod.purchasePrice || 0) * qCtn)).toFixed(2);
                  const sRate = (Number(prod.ctnSaleRate) || (Number(prod.sellingPrice || 0) * qCtn)).toFixed(2);
                  const disc = (Number(prod.saleDiscount) || 0).toFixed(2);
                  const isActive = prod.status !== undefined ? prod.status : true;

                  const isNegative = stock < 0;
                  const isLow = stock <= (prod.minStockLevel || 5) && !isNegative;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isNegative ? 'bg-rose-950/20' : isLow ? 'bg-amber-950/15' : ''
                      }`}
                    >
                      {/* SR# */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-sans">{index + 1}</td>

                      {/* M.CODE */}
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{prod.mcode || prod.sku || '-'}</td>

                      {/* Optional ARTICLE# */}
                      {showArticle && (
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{prod.articleNo || '-'}</td>
                      )}

                      {/* Optional CATEGORY */}
                      {showCategory && (
                        <td className="py-2.5 px-3 text-slate-400 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">{prod.category}</span>
                        </td>
                      )}

                      {/* Optional COMPANY */}
                      {showCompany && (
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{prod.companyBrand || '-'}</td>
                      )}

                      {/* ITEM */}
                      <td className="py-2.5 px-3 text-white font-sans font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.itemTitle || prod.name}</span>
                          {qCtn > 1 && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({qCtn} {prod.unit}/ctn)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{prod.scanType || 'General'}</td>

                      {/* P.RATE */}
                      <td className="py-2.5 px-3 text-right text-slate-200">{Number(pRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                      {/* S.RATE */}
                      <td className="py-2.5 px-3 text-right text-slate-200">{Number(sRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                      {/* DISC */}
                      <td className="py-2.5 px-3 text-right text-slate-400">{disc}</td>

                      {/* T.STOCK */}
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isNegative ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1.5 font-mono">
                          <span>{formattedStockDisplay}</span>
                          <span
                            className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded border ${
                              isKg
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                                : isLtr
                                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60'
                                : isBox
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                                : isBag
                                ? 'bg-purple-950/60 text-purple-300 border-purple-700/60'
                                : 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60'
                            }`}
                          >
                            {displayUnit}
                          </span>
                        </div>
                      </td>

                      {/* PKG / CARTON / BAG */}
                      <td className={`py-2.5 px-3 text-right font-mono ${isNegative ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {cartons}{' '}
                        <span className="text-[10px] text-slate-500 font-sans">
                          {isKg
                            ? 'KG'
                            : isLtr
                            ? 'Ltr'
                            : isBag
                            ? 'Bags'
                            : isBox
                            ? 'Boxes'
                            : ((prod.category || '') + ' ' + (prod.measure || '')).toLowerCase().includes('packet')
                            ? 'Packs'
                            : ((prod.category || '') + ' ' + (prod.measure || '')).toLowerCase().includes('tin')
                            ? 'Tins'
                            : 'Ctns'}
                        </span>
                      </td>

                      {/* LOOSE / PCS */}
                      <td className={`py-2.5 px-3 text-right font-mono ${isNegative ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {pcs > 0 ? `${pcs} Pcs` : '-'}
                      </td>

                      {/* STOCK VALUE (AMOUNT) */}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono">
                        {currencySymbol()} {((Number(stock) || 0) * (Number(prod.purchasePrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* STATUS TOGGLE (Switch as shown in Image 3) */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(prod)}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isActive ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                          title={isActive ? 'Active (Click to Deactivate)' : 'Inactive (Click to Activate)'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* ACTION (Image 3 buttons: Edit, View/Stock, Delete) */}
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition cursor-pointer"
                            title="Edit Item Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setRestockProduct(prod);
                              setRestockCost(prod.purchasePrice);
                              setRestockSellingPrice(prod.sellingPrice);
                              setRestockQty(50);
                              setRestockNotes('');
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white transition cursor-pointer"
                            title="Quick Stock Adjustment / Restock"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteProduct && (
                            <button
                              onClick={() => setProductToDelete(prod)}
                              className="p-1 rounded bg-slate-800 hover:bg-red-950 text-red-400 hover:text-red-300 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summaries */}
            {filteredProducts.length > 0 && (
              <tfoot className="bg-slate-950 font-mono text-xs font-bold border-t-2 border-slate-800 text-white">
                <tr>
                  <td
                    colSpan={6 + (showArticle ? 1 : 0) + (showCategory ? 1 : 0) + (showCompany ? 1 : 0)}
                    className="py-3 px-4 font-sans text-slate-300"
                  >
                    Showing {summaryTotals.count} items
                  </td>
                  {/* DISC */}
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  {/* T.STOCK */}
                  <td className="py-3 px-3 text-right text-blue-400 font-extrabold text-sm">
                    {summaryTotals.totalStockSum.toFixed(2)}
                  </td>
                  {/* PKG/CTN/BAG */}
                  <td className="py-3 px-3 text-right text-blue-300 text-sm">{summaryTotals.totalCartonSum}</td>
                  {/* LOOSE/PCS */}
                  <td className="py-3 px-3 text-right text-blue-300 text-sm">{summaryTotals.totalPcsSum}</td>
                  {/* STOCK VALUE (RS) */}
                  <td className="py-3 px-3 text-right text-emerald-400 font-extrabold text-sm">
                    {currencySymbol()}{' '}
                    {summaryTotals.totalStockValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  {/* STATUS + ACTION */}
                  <td colSpan={2} className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ADD / EDIT ITEM MODAL (Matching Images 1 & 2) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {isEditMode ? 'Edit Item Details' : 'Add Item Form (Item Management)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Specify carton conversion, purchase rate, selling price, and stock levels.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitItemForm} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
              {/* TOP SECTION (Image 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category with + button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">Category :</label>
                    <span className="text-[10px] text-blue-400 font-urdu">نیا کیٹیگری کیلئے + دبائیں</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Category (کیٹیگری منتخب کریں) --</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                      title="Add New Category (+ نیا کیٹیگری شامل کریں)"
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {showAddCategoryInline && (
                    <div className="mt-1.5 p-2 bg-slate-950 border border-blue-500/50 rounded-lg flex items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        autoFocus
                        placeholder="New category name (e.g. Spices, Grains)..."
                        value={newCategoryInline}
                        onChange={(e) => setNewCategoryInline(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddCategory();
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        disabled={isSavingCategory || !newCategoryInline.trim()}
                        onClick={() => handleQuickAddCategory()}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded cursor-pointer"
                      >
                        {isSavingCategory ? 'Saving...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInline(false);
                          setNewCategoryInline('');
                        }}
                        className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                {/* M.CODE */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">M.CODE :</label>
                  <input
                    type="text"
                    value={formMCode}
                    onChange={(e) => setFormMCode(e.target.value)}
                    placeholder="M.CODE (e.g. M-1001)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Item Title */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Item Title : *</label>
                <input
                  type="text"
                  required
                  value={formItemTitle}
                  onChange={(e) => setFormItemTitle(e.target.value)}
                  placeholder="e.g. Black Chana 15 Kg"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Description :</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Item details or specifications"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Measure & Company Brands with + buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Measure with + button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">Measure (پیمائش) :</label>
                    <span className="text-[10px] text-teal-400 font-urdu">نیا یونٹ کیلئے + دبائیں</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={formMeasure}
                      onChange={(e) => setFormMeasure(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">-- Select Measure (Gram, Kilo Gram, Litter...) --</option>
                      {measureOptions.map((msr) => (
                        <option key={msr} value={msr}>
                          {msr}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddMeasureInline(!showAddMeasureInline)}
                      title="Add New Measure (+ نیا پیمائش کا یونٹ شامل کریں)"
                      className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {showAddMeasureInline && (
                    <div className="mt-1.5 p-2 bg-slate-950 border border-teal-500/50 rounded-lg flex items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        autoFocus
                        placeholder="New unit (e.g. Gram, Kilogram, Liter, Dozen)..."
                        value={newMeasureInline}
                        onChange={(e) => setNewMeasureInline(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddMeasure();
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-teal-400"
                      />
                      <button
                        type="button"
                        disabled={isSavingMeasure || !newMeasureInline.trim()}
                        onClick={() => handleQuickAddMeasure()}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded cursor-pointer"
                      >
                        {isSavingMeasure ? 'Saving...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMeasureInline(false);
                          setNewMeasureInline('');
                        }}
                        className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                {/* Company Brands with + button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">Company Brands (برانڈز) :</label>
                    <span className="text-[10px] text-indigo-400 font-urdu">نیا برانڈ کیلئے + دبائیں</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={formCompanyBrand}
                      onChange={(e) => setFormCompanyBrand(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Nothing selected">Nothing selected</option>
                      {companyBrandOptions.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddBrandInline(!showAddBrandInline)}
                      title="Add New Brand (+ نیا برانڈ شامل کریں)"
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {showAddBrandInline && (
                    <div className="mt-1.5 p-2 bg-slate-950 border border-indigo-500/50 rounded-lg flex items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        autoFocus
                        placeholder="New brand name (e.g. National, Shan, Guard)..."
                        value={newBrandInline}
                        onChange={(e) => setNewBrandInline(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddBrand();
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        disabled={isSavingBrand || !newBrandInline.trim()}
                        onClick={() => handleQuickAddBrand()}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded cursor-pointer"
                      >
                        {isSavingBrand ? 'Saving...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddBrandInline(false);
                          setNewBrandInline('');
                        }}
                        className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3"></div>

              {/* UNIFIED PACKAGING & STOCK SECTION - Single section for all packaging types */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                {/* Package Type Selector */}
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-300">Packaging Type (پیکیج کی قسم) :</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Single / Loose (صرف لاگت)', val: 'single', icon: '📦' },
                      { label: 'Carton / CTN (کارٹن)', val: 'carton', icon: '📦' },
                      { label: 'Bag / Bori (بوری/تھیلا)', val: 'bag', icon: '🛍️' },
                      { label: 'Box / Dabba (ڈبہ/باکس)', val: 'box', icon: '📦' },
                      { label: 'Packet / Pack (پیکٹ)', val: 'packet', icon: '✉️' },
                      { label: 'Tin / Drum (ٹین/ڈرم)', val: 'tin', icon: '🛢️' },
                    ].map((pkg) => (
                      <button
                        key={pkg.val}
                        type="button"
                        onClick={() => {
                          setFormPackageType(pkg.val as any);
                          // Auto-set measure based on package type
                          const measureMap: Record<string, string> = {
                            carton: 'Carton (CTN)',
                            bag: 'Bag (Bori)',
                            box: 'Box',
                            packet: 'Packet (Pack)',
                            tin: 'Tin',
                            single: 'Kilogram (Kg)'
                          };
                          setFormMeasure(measureMap[pkg.val] || 'Kilogram (Kg)');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-bold transition cursor-pointer ${
                          formPackageType === pkg.val
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'
                        }`}
                      >
                        <span>{pkg.icon}</span>
                        <span>{pkg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SINGLE ITEM MODE - Just Total Stock Amount */}
                {formPackageType === 'single' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 bg-blue-950/20 p-3 rounded-lg">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-300 mb-1 text-green-400">
                        Total Stock Amount (کل اسٹاک مقدار) * :
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 10 (10 packets oil), 50, 100..."
                        value={formTotalStock}
                        onChange={(e) => setFormTotalStock(e.target.value)}
                        className="w-full bg-slate-800 border border-green-500/50 rounded-lg px-3 py-2 text-white font-mono font-bold text-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
                      />
                      <p className="text-[10px] text-green-400/80 mt-1 font-urdu">
                        گی جیسے 10 پیکٹ تیل، بس COLлек ٹوٹل لکھ دیں - کوئی کٹن/باکس نہیں
                      </p>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Purchase Price / Unit (خریداری قیمت) :</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 280"
                        value={formPurchasePrice}
                        onChange={(e) => setFormPurchasePrice(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Sale Price / Unit (فروخت قیمت) :</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 300"
                        value={formSalePrice}
                        onChange={(e) => setFormSalePrice(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-emerald-400"
                      />
                    </div>
                  </div>
                )}

                {/* PACKAGED ITEM MODE - Package Count + Qty Per Package + Rates */}
                {formPackageType !== 'single' && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-amber-400">
                          Kitny {formPackageType === 'carton' ? 'CTN' : formPackageType === 'bag' ? 'Bags' : formPackageType === 'box' ? 'Boxes' : formPackageType === 'packet' ? 'Packets' : 'Tins'} Hain (پیکیج کی تعداد) * :
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder={formPackageType === 'carton' ? 'e.g. 5 CTN' : formPackageType === 'bag' ? 'e.g. 10 Bags' : formPackageType === 'box' ? 'e.g. 20 Boxes' : formPackageType === 'packet' ? 'e.g. 50 Packets' : 'e.g. 8 Tins'}
                          value={formPackageCount}
                          onChange={(e) => setFormPackageCount(e.target.value)}
                          className="w-full bg-slate-800 border border-amber-500/50 rounded-lg px-3 py-2 text-white font-mono font-bold text-amber-300 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-sky-400">
                          Qty Per {formPackageType === 'carton' ? 'CTN' : formPackageType === 'bag' ? 'Bag' : formPackageType === 'box' ? 'Box' : formPackageType === 'packet' ? 'Packet' : 'Tin'} (فی پیکیج مقدار) * :
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder={formPackageType === 'carton' ? 'e.g. 15 pcs/CTN' : formPackageType === 'bag' ? 'e.g. 50 kg/Bag' : formPackageType === 'box' ? 'e.g. 24 pcs/Box' : formPackageType === 'packet' ? 'e.g. 10 units/Pack' : 'e.g. 16 Ltr/Tin'}
                          value={formQtyPerPackage}
                          onChange={(e) => setFormQtyPerPackage(e.target.value)}
                          className="w-full bg-slate-800 border border-sky-500/50 rounded-lg px-3 py-2 text-white font-mono font-bold text-sky-300 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-rose-400">
                          Loose / Extra Units (باقی بچے) :
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 5"
                          value={formLooseUnits}
                          onChange={(e) => setFormLooseUnits(e.target.value)}
                          className="w-full bg-slate-800 border border-rose-500/50 rounded-lg px-3 py-2 text-white font-mono text-rose-300 focus:border-rose-500"
                        />
                      </div>
                    </div>

                    {/* Auto-calculated Total Stock Display */}
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-urdu">ٹوٹل محاسبه شدہ اسٹاک:</span>
                        <span className="font-bold text-white font-mono text-lg">
                          {computedTotalStock} Units
                        </span>
                        <span className="text-sky-400 font-mono">
                          = ({computedPkgCount} × {computedQtyPerPkg}) + {computedLooseUnits}
                        </span>
                      </div>
                    </div>

                    {/* Package Rates Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/50">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Purchase Rate Per {formPackageType === 'carton' ? 'CTN' : formPackageType === 'bag' ? 'Bag' : formPackageType === 'box' ? 'Box' : formPackageType === 'packet' ? 'Packet' : 'Tin'} :
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 4500 per bag"
                          value={formPackagePurchaseRate}
                          onChange={(e) => setFormPackagePurchaseRate(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Sale Rate Per {formPackageType === 'carton' ? 'CTN' : formPackageType === 'bag' ? 'Bag' : formPackageType === 'box' ? 'Box' : formPackageType === 'packet' ? 'Packet' : 'Tin'} :
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 4800 per bag"
                          value={formPackageSaleRate}
                          onChange={(e) => setFormPackageSaleRate(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Min Sale Rate Per {formPackageType === 'carton' ? 'CTN' : formPackageType === 'bag' ? 'Bag' : formPackageType === 'box' ? 'Box' : formPackageType === 'packet' ? 'Packet' : 'Tin'} :
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 4600 per bag"
                          value={formPackageMinSaleRate}
                          onChange={(e) => setFormPackageMinSaleRate(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Auto-calculated Unit Rates Preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/50 bg-slate-900/30 p-2 rounded">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-300">Per Unit Purchase:</span>
                        <strong className="text-white">{currencySymbol()} {computedPurchasePrice.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-400">Per Unit Sale:</span>
                        <strong className="text-white">{currencySymbol()} {computedSalePrice.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sky-300">Full Packages:</span>
                        <strong className="text-white">{computedPkgCount}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-rose-300">Loose Units:</span>
                        <strong className="text-white">{computedLooseUnits}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Min Quantity & Demand List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Min Quantity :
                    <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                      ( Min Quantity for generate demand list )
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 5"
                    value={formMinQuantity}
                    onChange={(e) => setFormMinQuantity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Comments :</label>
                  <input
                    type="text"
                    value={formComments}
                    onChange={(e) => setFormComments(e.target.value)}
                    placeholder="General comments..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Scan Type */}
              <div className="flex items-center gap-3 pt-1">
                <span className="font-semibold text-slate-300">Scan Type :</span>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={formScanTypeGeneral}
                    onChange={(e) => setFormScanTypeGeneral(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>General</span>
                </label>
              </div>

              <div className="border-t border-slate-800 pt-3"></div>

              {/* Custom Fields (Image 2) */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Custom Fields :</label>
                <input
                  type="text"
                  value={formCustomFields}
                  onChange={(e) => setFormCustomFields(e.target.value)}
                  placeholder="Optional custom attribute / field"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="border-t border-slate-800 pt-3"></div>

              {/* Image Input (Image 2) */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Image :</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setFormImage(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">PNG, JPG (200PX or 200KB)</span>
                </div>
                {formImage && (
                  <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                    <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Modal Actions (Save & New Form matching Image 2) */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  New Form
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingForm ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK / ADJUSTMENT MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Stock Adjustment / Restock</h3>
                <p className="text-xs text-slate-400">
                  {restockProduct.name} ({restockProduct.mcode || restockProduct.sku})
                </p>
              </div>
              <button
                onClick={() => setRestockProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Current Warehouse Stock:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {(Number(restockProduct.totalStock !== undefined
                    ? restockProduct.totalStock
                    : restockProduct.currentQuantity) || 0
                  ).toFixed(2)}{' '}
                  {restockProduct.unit}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Quantity to Add ({restockProduct.unit}) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    step="any"
                    value={restockCost}
                    onChange={(e) => setRestockCost(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Selling Price</label>
                  <input
                    type="number"
                    step="any"
                    value={restockSellingPrice}
                    onChange={(e) => setRestockSellingPrice(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Received new stock delivery"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingRestock ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        title="Delete Item Record"
        itemName={productToDelete ? productToDelete.name : ''}
        itemDetails="Are you sure you want to permanently delete this catalog item? This will remove its historical stock records from the system."
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
        confirmButtonText="Delete Item"
        isDeleting={isDeletingProd}
      />
    </div>
  );
};
