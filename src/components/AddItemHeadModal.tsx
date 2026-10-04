import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Check } from 'lucide-react';
import { Product, ProductCategory, UnitType } from '../types';
import { api } from '../services/api';

interface AddItemHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  initialProduct?: Product | null;
  categories?: string[];
  brands?: string[];
  measures?: string[];
  onRefreshMasters?: () => void;
}

export const AddItemHeadModal: React.FC<AddItemHeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct,
  categories: propCategories = [],
  brands: propBrands = [],
  measures: propMeasures = [],
  onRefreshMasters,
}) => {
  // Master lists
  const [categories, setCategories] = useState<string[]>(propCategories);
  const [brands, setBrands] = useState<string[]>(propBrands);
  const [measures, setMeasures] = useState<string[]>(propMeasures);

  // Form Fields (Exact match to Image 1 & Image 3)
  const [category, setCategory] = useState<string>('Nothing selected');
  const [mcode, setMcode] = useState<string>('');
  const [itemTitle, setItemTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [measure, setMeasure] = useState<string>('Nothing selected');
  const [companyBrand, setCompanyBrand] = useState<string>('Nothing selected');

  // Package Type Selection (Carton, Bag, Box, Tin, Pack, Single)
  const [packageType, setPackageType] = useState<'Carton' | 'Bag' | 'Box' | 'Tin' | 'Pack' | 'Single'>('Carton');
  const [qtyInCarton, setQtyInCarton] = useState<number | ''>('');
  const [ctnPurchaseRate, setCtnPurchaseRate] = useState<number | ''>('');
  const [ctnSaleRate, setCtnSaleRate] = useState<number | ''>('');
  const [ctnMinSaleRate, setCtnMinSaleRate] = useState<number | ''>('0.00');

  // Pricing & Stock
  const [totalStock, setTotalStock] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [prchFixedPrice, setPrchFixedPrice] = useState<boolean>(false);
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [saleFixedPrice, setSaleFixedPrice] = useState<boolean>(false);
  const [saleDiscount, setSaleDiscount] = useState<number | ''>('0.00');
  const [saleMinPrice, setSaleMinPrice] = useState<number | ''>('');
  const [minQuantity, setMinQuantity] = useState<number | ''>(0);
  const [comments, setComments] = useState<string>('');
  const [scanTypeGeneral, setScanTypeGeneral] = useState<boolean>(true);
  const [customFields, setCustomFields] = useState<string>('');
  const [image, setImage] = useState<string>('');

  // Inline Quick-Adds for Category, Brand, Measure
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState('');
  const [showAddMeasure, setShowAddMeasure] = useState(false);
  const [newMeasureInput, setNewMeasureInput] = useState('');

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form based on initialProduct
  useEffect(() => {
    if (initialProduct) {
      setCategory(initialProduct.category || 'Nothing selected');
      setMcode(initialProduct.mcode || initialProduct.sku || '');
      setItemTitle(initialProduct.itemTitle || initialProduct.name || '');
      setDescription(initialProduct.description || '');
      setMeasure(initialProduct.measure || initialProduct.unit || 'Nothing selected');
      setCompanyBrand(initialProduct.companyBrand || 'Nothing selected');

      // Detect package type
      const pkg = (initialProduct.packageType as any) ||
        (initialProduct.category?.toLowerCase().includes('bag') ? 'Bag' :
         initialProduct.category?.toLowerCase().includes('box') ? 'Box' :
         initialProduct.category?.toLowerCase().includes('tin') ? 'Tin' :
         initialProduct.qtyInCarton && initialProduct.qtyInCarton > 1 ? 'Carton' : 'Carton');
      setPackageType(pkg);

      setQtyInCarton(initialProduct.qtyInCarton || '');
      setCtnPurchaseRate(initialProduct.ctnPurchaseRate || '');
      setCtnSaleRate(initialProduct.ctnSaleRate || '');
      setCtnMinSaleRate(initialProduct.ctnMinSaleRate !== undefined ? initialProduct.ctnMinSaleRate : '0.00');

      const stockVal = initialProduct.totalStock !== undefined ? initialProduct.totalStock : initialProduct.currentQuantity;
      setTotalStock(stockVal !== undefined ? stockVal : '');

      setPurchasePrice(initialProduct.purchasePrice || '');
      setPrchFixedPrice(Boolean(initialProduct.prchFixedPrice));
      setSalePrice(initialProduct.salePrice || initialProduct.sellingPrice || '');
      setSaleFixedPrice(Boolean(initialProduct.saleFixedPrice));
      setSaleDiscount(initialProduct.saleDiscount !== undefined ? initialProduct.saleDiscount : '0.00');
      setSaleMinPrice(initialProduct.saleMinPrice || '');
      setMinQuantity(initialProduct.minQuantity !== undefined ? initialProduct.minQuantity : 0);
      setComments(initialProduct.comments || '');
      setScanTypeGeneral(initialProduct.scanType !== 'Barcode');
      setCustomFields(initialProduct.customFields || '');
      setImage(initialProduct.image || '');
    } else {
      resetToNewForm();
    }
  }, [initialProduct, isOpen]);

  // Sync prop changes
  useEffect(() => {
    if (propCategories.length > 0) setCategories(propCategories);
    if (propBrands.length > 0) setBrands(propBrands);
    if (propMeasures.length > 0) setMeasures(propMeasures);
  }, [propCategories, propBrands, propMeasures]);

  // Load masters from API if empty
  useEffect(() => {
    if (isOpen) {
      if (categories.length === 0) api.getItemCategories().then(setCategories).catch(() => {});
      if (brands.length === 0) api.getItemBrands().then(setBrands).catch(() => {});
      if (measures.length === 0) api.getItemMeasures().then(setMeasures).catch(() => {});
    }
  }, [isOpen]);

  const resetToNewForm = () => {
    setCategory('Nothing selected');
    setMcode('');
    setItemTitle('');
    setDescription('');
    setMeasure('Nothing selected');
    setCompanyBrand('Nothing selected');
    setPackageType('Carton');
    setQtyInCarton('');
    setCtnPurchaseRate('');
    setCtnSaleRate('');
    setCtnMinSaleRate('0.00');
    setTotalStock('');
    setPurchasePrice('');
    setPrchFixedPrice(false);
    setSalePrice('');
    setSaleFixedPrice(false);
    setSaleDiscount('0.00');
    setSaleMinPrice('');
    setMinQuantity(0);
    setComments('');
    setScanTypeGeneral(true);
    setCustomFields('');
    setImage('');
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  // Dynamic Packaging Labels (Image 1 vs Bag/Box/Tin)
  const pkgLabel = packageType === 'Bag' ? 'Bag' :
                   packageType === 'Box' ? 'Box' :
                   packageType === 'Tin' ? 'Tin' :
                   packageType === 'Pack' ? 'Pack' : 'Carton';
  const pkgShort = packageType === 'Bag' ? 'Bag' :
                   packageType === 'Box' ? 'Box' :
                   packageType === 'Tin' ? 'Tin' :
                   packageType === 'Pack' ? 'Pack' : 'CTN';

  // Live breakdown of Total Stock
  const numStock = typeof totalStock === 'number' ? totalStock : parseFloat(String(totalStock)) || 0;
  const numQtyInPkg = typeof qtyInCarton === 'number' ? qtyInCarton : parseFloat(String(qtyInCarton)) || 1;
  const hasPkg = packageType !== 'Single' && numQtyInPkg > 1;
  const computedWholePkgs = hasPkg ? Math.floor(numStock / numQtyInPkg) : Math.floor(numStock);
  const computedLooseUnits = hasPkg ? Number((numStock % numQtyInPkg).toFixed(2)) : 0;

  // Handle Quick Add Handlers
  const handleAddCategory = async () => {
    const val = newCatInput.trim();
    if (!val) return;
    try {
      const updated = await api.createItemCategory(val);
      setCategories(updated);
      setCategory(val);
      setNewCatInput('');
      setShowAddCategory(false);
      onRefreshMasters?.();
    } catch (e: any) {
      alert(e.message || 'Failed to add category');
    }
  };

  const handleAddBrand = async () => {
    const val = newBrandInput.trim();
    if (!val) return;
    try {
      const updated = await api.createItemBrand(val);
      setBrands(updated);
      setCompanyBrand(val);
      setNewBrandInput('');
      setShowAddBrand(false);
      onRefreshMasters?.();
    } catch (e: any) {
      alert(e.message || 'Failed to add brand');
    }
  };

  const handleAddMeasure = async () => {
    const val = newMeasureInput.trim();
    if (!val) return;
    try {
      const updated = await api.createItemMeasure(val);
      setMeasures(updated);
      setMeasure(val);
      setNewMeasureInput('');
      setShowAddMeasure(false);
      onRefreshMasters?.();
    } catch (e: any) {
      alert(e.message || 'Failed to add measure');
    }
  };

  // Image Upload Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill unit rates if package rates change and unit rates are not fixed
  const handleCtnPurchaseRateChange = (val: string) => {
    setCtnPurchaseRate(val === '' ? '' : Number(val));
    const numCtnRate = Number(val);
    if (!prchFixedPrice && numCtnRate > 0 && numQtyInPkg > 0) {
      setPurchasePrice(parseFloat((numCtnRate / numQtyInPkg).toFixed(2)));
    }
  };

  const handleCtnSaleRateChange = (val: string) => {
    setCtnSaleRate(val === '' ? '' : Number(val));
    const numCtnRate = Number(val);
    if (!saleFixedPrice && numCtnRate > 0 && numQtyInPkg > 0) {
      const unitSale = parseFloat((numCtnRate / numQtyInPkg).toFixed(2));
      setSalePrice(unitSale);
      if (!saleMinPrice) setSaleMinPrice(unitSale);
    }
  };

  // Submit Handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemTitle.trim()) {
      setErrorMsg('Item Title is required!');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const finalCategory = category && category !== 'Nothing selected' ? category.trim() : 'General';
      const finalMeasure = measure && measure !== 'Nothing selected' ? measure.trim() : 'Kilo grams';
      const finalBrand = companyBrand && companyBrand !== 'Nothing selected' ? companyBrand.trim() : '';

      const numericQtyInCtn = packageType === 'Single' ? 1 : (Number(qtyInCarton) > 0 ? Number(qtyInCarton) : 1);
      const numericCtnPur = packageType === 'Single' ? 0 : (Number(ctnPurchaseRate) || 0);
      const numericCtnSale = packageType === 'Single' ? 0 : (Number(ctnSaleRate) || 0);
      const numericCtnMinSale = packageType === 'Single' ? 0 : (Number(ctnMinSaleRate) || 0);

      const numericTotalStock = Number(totalStock) >= 0 ? Number(totalStock) : 0;
      const numericPurchasePrice = Number(purchasePrice) || (numericCtnPur > 0 && numericQtyInCtn > 0 ? parseFloat((numericCtnPur / numericQtyInCtn).toFixed(2)) : 0);
      const numericSalePrice = Number(salePrice) || (numericCtnSale > 0 && numericQtyInCtn > 0 ? parseFloat((numericCtnSale / numericQtyInCtn).toFixed(2)) : 0);
      const numericSaleMin = Number(saleMinPrice) || numericSalePrice;
      const numericMinQty = Number(minQuantity) || 0;

      const payload: Partial<Product> = {
        name: itemTitle.trim(),
        itemTitle: itemTitle.trim(),
        mcode: mcode.trim(),
        sku: mcode.trim() || `M-${Date.now().toString().slice(-4)}`,
        description: description.trim(),
        category: finalCategory,
        measure: finalMeasure,
        unit: finalMeasure as UnitType,
        companyBrand: finalBrand,
        packageType,
        qtyInCarton: numericQtyInCtn,
        ctnPurchaseRate: numericCtnPur,
        ctnSaleRate: numericCtnSale,
        ctnMinSaleRate: numericCtnMinSale,
        totalStock: numericTotalStock,
        currentQuantity: numericTotalStock,
        purchasePrice: numericPurchasePrice,
        prchFixedPrice,
        sellingPrice: numericSalePrice,
        salePrice: numericSalePrice,
        saleFixedPrice,
        saleDiscount: Number(saleDiscount) || 0,
        saleMinPrice: numericSaleMin,
        minQuantity: numericMinQty,
        minStockLevel: numericMinQty,
        comments: comments.trim(),
        scanType: scanTypeGeneral ? 'General' : 'Barcode',
        customFields: customFields.trim(),
        image,
        status: true,
      };

      let saved: Product;
      if (initialProduct?.id) {
        saved = await api.updateProduct(initialProduct.id, payload);
      } else {
        saved = await api.createProduct(payload);
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto text-slate-200">
        {/* Header Bar */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
            <h2 className="font-bold text-sm text-white tracking-wide">
              {initialProduct ? 'Edit Product / Item Head' : 'Add Product / Item Head'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/70 border border-rose-600/60 rounded text-rose-200 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">&times;</button>
          </div>
        )}

        {/* Form Body - Matching Image 1 & 3 Exact Layout */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Top Form Fields: Category, M.CODE, Item Title, Description, Measure, Company Brands */}
          <div className="space-y-3">
            {/* Category */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Category :</label>
              <div className="col-span-9 flex items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="Nothing selected">Nothing selected</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  title="Add New Category"
                  className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline Add Category */}
            {showAddCategory && (
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3"></div>
                <div className="col-span-9 p-2 bg-slate-950 border border-sky-500/50 rounded flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="New category title..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddCategory(false); setNewCatInput(''); }}
                    className="text-slate-400 hover:text-white px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}

            {/* M.CODE */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">M.CODE :</label>
              <div className="col-span-9">
                <input
                  type="text"
                  placeholder="M.CODE"
                  value={mcode}
                  onChange={(e) => setMcode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Item Title */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Item Title :</label>
              <div className="col-span-9">
                <input
                  type="text"
                  required
                  placeholder="e.g. Sugar (RENUKA) 50 kg"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-bold text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Description :</label>
              <div className="col-span-9">
                <input
                  type="text"
                  placeholder="Product description or details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Measure */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Measure :</label>
              <div className="col-span-9 flex items-center gap-2">
                <select
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="Nothing selected">Nothing selected</option>
                  <option value="Kilo grams">Kilo grams</option>
                  <option value="Liter">Liter</option>
                  <option value="Grams">Grams</option>
                  <option value="ML">ML</option>
                  <option value="PCS">PCS</option>
                  <option value="Carton">Carton</option>
                  <option value="Bag">Bag</option>
                  <option value="Box">Box</option>
                  <option value="Tin">Tin</option>
                  <option value="Pack">Pack</option>
                  <option value="Meter">Meter</option>
                  <option value="Dozen">Dozen</option>
                  {measures
                    .filter((m) => !['Kilo grams', 'Liter', 'Grams', 'ML', 'PCS', 'Carton', 'Bag', 'Box', 'Tin', 'Pack', 'Meter', 'Dozen'].includes(m))
                    .map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddMeasure(!showAddMeasure)}
                  title="Add New Measure"
                  className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline Add Measure */}
            {showAddMeasure && (
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3"></div>
                <div className="col-span-9 p-2 bg-slate-950 border border-sky-500/50 rounded flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="New measure / unit..."
                    value={newMeasureInput}
                    onChange={(e) => setNewMeasureInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMeasure(); } }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddMeasure}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddMeasure(false); setNewMeasureInput(''); }}
                    className="text-slate-400 hover:text-white px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}

            {/* Company Brands */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Company Brands :</label>
              <div className="col-span-9 flex items-center gap-2">
                <select
                  value={companyBrand}
                  onChange={(e) => setCompanyBrand(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="Nothing selected">Nothing selected</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddBrand(!showAddBrand)}
                  title="Add New Brand"
                  className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline Add Brand */}
            {showAddBrand && (
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3"></div>
                <div className="col-span-9 p-2 bg-slate-950 border border-sky-500/50 rounded flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="New company brand..."
                    value={newBrandInput}
                    onChange={(e) => setNewBrandInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(); } }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddBrand}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddBrand(false); setNewBrandInput(''); }}
                    className="text-slate-400 hover:text-white px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Separator Line */}
          <div className="border-t border-slate-800 my-3"></div>

          {/* Package Type Selector (User Requirement: ctn, bag, box waly check pr click kr k likhy ga) */}
          <div className="grid grid-cols-12 gap-3 items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <label className="col-span-3 text-right font-bold text-sky-400">Package Type :</label>
            <div className="col-span-9 flex flex-wrap items-center gap-2">
              {(['Carton', 'Bag', 'Box', 'Tin', 'Pack', 'Single'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPackageType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    packageType === type
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {packageType === type && <Check className="w-3 h-3 text-white" />}
                  <span>{type === 'Carton' ? 'Carton (CTN)' : type === 'Bag' ? 'Bag (Bori)' : type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Packaging Details: Qty in Carton/Bag, CTN/Bag Purchase Rate, CTN/Bag Sale Rate, CTN Min Sale Rate */}
          {packageType !== 'Single' && (
            <div className="space-y-3">
              {/* Qty In Carton / Bag */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-3 text-right font-medium text-slate-300">
                  Qty In {pkgLabel} :
                </label>
                <div className="col-span-9">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 50"
                    value={qtyInCarton}
                    onChange={(e) => setQtyInCarton(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CTN / Bag Purchase Rate */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-3 text-right font-medium text-slate-300">
                  {pkgShort} Purchase Rate :
                </label>
                <div className="col-span-9">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 98.00"
                    value={ctnPurchaseRate}
                    onChange={(e) => handleCtnPurchaseRateChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CTN / Bag Sale Rate */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-3 text-right font-medium text-slate-300">
                  {pkgShort} Sale Rate :
                </label>
                <div className="col-span-9">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 102.00"
                    value={ctnSaleRate}
                    onChange={(e) => handleCtnSaleRateChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CTN / Bag Min Sale Rate */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-3 text-right font-medium text-slate-300">
                  {pkgShort} Min Sale Rate :
                </label>
                <div className="col-span-9">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={ctnMinSaleRate}
                    onChange={(e) => setCtnMinSaleRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Separator Line */}
          <div className="border-t border-slate-800 my-3"></div>

          {/* Stock & Unit Pricing (Matching Image 1 & Image 3) */}
          <div className="space-y-3">
            {/* Total Stock */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-bold text-white">Total Stock :</label>
              <div className="col-span-9">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 868.50"
                    value={totalStock}
                    onChange={(e) => setTotalStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono font-bold text-xs focus:border-sky-500 focus:outline-none"
                  />
                  {hasPkg && numStock > 0 && (
                    <span className="shrink-0 px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/60 rounded text-[11px] font-mono text-emerald-300">
                      = {computedWholePkgs} {pkgLabel}s {computedLooseUnits > 0 ? `+ ${computedLooseUnits} ${measure !== 'Nothing selected' ? measure : 'Units'}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase Price & Prch Fixed Price */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Purchase Price :</label>
              <div className="col-span-5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2.51"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <label className="font-medium text-slate-300 cursor-pointer select-none">Prch Fixed Price:</label>
                <input
                  type="checkbox"
                  checked={prchFixedPrice}
                  onChange={(e) => setPrchFixedPrice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Sale Price & Sale Fixed Price */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Sale Price :</label>
              <div className="col-span-5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2.65"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <label className="font-medium text-slate-300 cursor-pointer select-none">Sale Fixed Price:</label>
                <input
                  type="checkbox"
                  checked={saleFixedPrice}
                  onChange={(e) => setSaleFixedPrice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Sale Discount & Sale Min Price */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Sale Discount :</label>
              <div className="col-span-4">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <label className="col-span-2 text-right font-medium text-slate-300">Sale Min Price :</label>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2.65"
                  value={saleMinPrice}
                  onChange={(e) => setSaleMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Min Quantity */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Min Quantity :</label>
              <div className="col-span-4">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <span className="col-span-5 text-slate-400 text-[11px] italic">
                ( Min Quantity for generate demand list )
              </span>
            </div>

            {/* Comments */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Comments :</label>
              <div className="col-span-9">
                <input
                  type="text"
                  placeholder="Remarks or product notes..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Scan Type */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <label className="col-span-3 text-right font-medium text-slate-300">Scan Type :</label>
              <div className="col-span-9 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scanTypeGeneral"
                  checked={scanTypeGeneral}
                  onChange={(e) => setScanTypeGeneral(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="scanTypeGeneral" className="text-slate-300 font-medium cursor-pointer select-none">
                  General
                </label>
              </div>
            </div>
          </div>

          {/* Separator Line */}
          <div className="border-t border-slate-800 my-3"></div>

          {/* Custom Fields */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <label className="col-span-3 text-right font-medium text-slate-300">Custom Fields :</label>
            <div className="col-span-9">
              <input
                type="text"
                placeholder="Custom metadata or tags..."
                value={customFields}
                onChange={(e) => setCustomFields(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Separator Line */}
          <div className="border-t border-slate-800 my-3"></div>

          {/* Image Upload */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <label className="col-span-3 text-right font-medium text-slate-300">Image :</label>
            <div className="col-span-9 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-xs font-medium cursor-pointer"
              >
                Choose file
              </button>
              <span className="text-slate-500 text-xs">
                {image ? 'Image selected' : 'No file chosen'}
              </span>
              <span className="text-slate-500 text-[10px] ml-auto">
                PNG, JPG (200PX or 200KB)
              </span>
              {image && (
                <img src={image} alt="Preview" className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0" />
              )}
            </div>
          </div>

          {/* Footer Buttons (Exact match to Image 1: Save & New Form) */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-xs cursor-pointer transition"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-bold text-xs shadow-md transition cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={resetToNewForm}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded font-bold text-xs shadow-md transition cursor-pointer"
              >
                New Form
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
