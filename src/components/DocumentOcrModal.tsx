import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  KeyRound,
  Layers,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { currencySymbol } from '../utils/currency';
import {
  Customer,
  ExtractedDocumentData,
  Product,
  ProductCategory,
  PurchaseBill,
  Restaurant,
  SaleBill,
  Supplier,
  UserRole,
} from '../types';

interface DocumentOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  products: Product[];
  suppliers?: Supplier[];
  currentRole: UserRole;
  currentUser?: { id: string; name: string; role: UserRole };
  onDataMutated: () => void;
  onCreateOrder: (params: any) => Promise<void>;
  onCreateExpense: (params: any) => Promise<void>;
  onCreateProduct?: (productData: any) => Promise<void>;
  onOpenGeminiKeyModal?: () => void;
}

export interface OCRItemRow {
  id: string;
  selected: boolean;
  name: string;
  mcode: string;
  isNewItem?: boolean;
  category: string;
  ctn: number;
  qtyPerCtn: number;
  quantity: number;
  unit: string;
  isLumpSum?: boolean;
  ratePerCtn: number;
  price: number; // rate per unit
  salePrice: number; // selling price for catalog & sale bills
  total: number; // line total
  confidence: number;
  matchedProductId?: string;
  existingStock?: number;
  isManualRow?: boolean;
}

function mapToProductCategory(name: string, cat?: string): ProductCategory {
  const text = `${name} ${cat || ''}`.toLowerCase();
  if (text.includes('rice') || text.includes('chawal') || text.includes('kainat') || text.includes('basmati')) {
    return 'Rice & Grains';
  }
  if (
    text.includes('daal') ||
    text.includes('dal') ||
    text.includes('chana') ||
    text.includes('moong') ||
    text.includes('masoor') ||
    text.includes('maash')
  ) {
    return 'Pulses & Daal';
  }
  if (text.includes('flour') || text.includes('atta') || text.includes('maida') || text.includes('suji')) {
    return 'Flour & Atta';
  }
  if (text.includes('sugar') || text.includes('cheeni') || text.includes('gur') || text.includes('sweet')) {
    return 'Sugar & Sweeteners';
  }
  if (
    text.includes('oil') ||
    text.includes('ghee') ||
    text.includes('banaspati') ||
    text.includes('canola') ||
    text.includes('mustard')
  ) {
    return 'Cooking Oil & Ghee';
  }
  if (
    text.includes('meat') ||
    text.includes('beef') ||
    text.includes('mutton') ||
    text.includes('chicken') ||
    text.includes('keema') ||
    text.includes('mince') ||
    text.includes('gosht')
  ) {
    return 'Meat & Poultry';
  }
  if (
    text.includes('milk') ||
    text.includes('doodh') ||
    text.includes('cheese') ||
    text.includes('paneer') ||
    text.includes('butter') ||
    text.includes('cream') ||
    text.includes('yogurt') ||
    text.includes('dahi') ||
    text.includes('egg') ||
    text.includes('eggs')
  ) {
    return 'Dairy';
  }
  if (
    text.includes('tomato') ||
    text.includes('onion') ||
    text.includes('potato') ||
    text.includes('capsicum') ||
    text.includes('lettuce') ||
    text.includes('garlic') ||
    text.includes('ginger') ||
    text.includes('vegetable') ||
    text.includes('sabzi') ||
    text.includes('adrak') ||
    text.includes('lehsan') ||
    text.includes('piyaz') ||
    text.includes('aloo') ||
    text.includes('kheera') ||
    text.includes('cucumber')
  ) {
    return 'Vegetables & Fresh';
  }
  if (text.includes('salt') || text.includes('namak')) {
    return 'Salt & Seasonings';
  }
  if (
    text.includes('pepper') ||
    text.includes('mirch') ||
    text.includes('masala') ||
    text.includes('spice') ||
    text.includes('haldi') ||
    text.includes('zeera') ||
    text.includes('coriander') ||
    text.includes('dhania')
  ) {
    return 'Spices & Masala';
  }
  if (
    text.includes('box') ||
    text.includes('container') ||
    text.includes('bag') ||
    text.includes('plastic') ||
    text.includes('shopper') ||
    text.includes('foil') ||
    text.includes('wrap')
  ) {
    return 'Packaging & Containers';
  }
  if (
    text.includes('soap') ||
    text.includes('surf') ||
    text.includes('detergent') ||
    text.includes('bleach') ||
    text.includes('clean') ||
    text.includes('phenyl')
  ) {
    return 'Cleaning & Hygiene';
  }
  return 'Kitchen Supplies';
}

function normalizeUnit(unitStr?: string): string {
  const u = (unitStr || 'KG').toUpperCase().trim();
  if (u.includes('CTN') || u.includes('CARTON')) return 'CTN';
  if (u.includes('KG') || u.includes('KILO')) return 'KG';
  if (u.includes('GM') || u.includes('GRAM')) return 'GM';
  if (u.includes('LTR') || u.includes('LITER') || u.includes('LITRE') || u.includes('L')) return 'LTR';
  if (u.includes('BAG') || u.includes('BORI')) return 'BAG';
  if (u.includes('BOX')) return 'BOX';
  if (u.includes('CAN')) return 'CAN';
  if (u.includes('PC') || u.includes('PIECE') || u.includes('PKT') || u.includes('PACK')) return 'PCS';
  if (u.includes('LUMP') || u.includes('SUM')) return 'LUMP_SUM';
  return u || 'KG';
}

export const DocumentOcrModal: React.FC<DocumentOcrModalProps> = ({
  isOpen,
  onClose,
  restaurants = [],
  products = [],
  suppliers = [],
  currentRole,
  currentUser,
  onDataMutated,
  onCreateOrder,
  onCreateExpense,
  onCreateProduct,
  onOpenGeminiKeyModal,
}) => {
  // CRITICAL USER MANDATE:
  // "ocr image add krny sy phly option ho stock and purchase bill hai ya customer sale bill hai phr imagr addkrny pr usk hi section main details aye gi dusry main kuch show ni hona chhye bcz client confuse na ho jaye. genral expense ka tab del krdo is main."
  const [ocrMode, setOcrMode] = useState<'purchase' | 'sale'>('purchase');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<ExtractedDocumentData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Customers Directory (Full 329 Customers)
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Supplier state for Purchase Bill
  const [supplierName, setSupplierName] = useState<string>('Wholesale Mandi / Supplier');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isCashPurchase, setIsCashPurchase] = useState<boolean>(false);
  const [purchasePaidAmount, setPurchasePaidAmount] = useState<number>(0);
  const [addToStockInventory, setAddToStockInventory] = useState<boolean>(true);

  // Sale Bill state
  const [isCashSale, setIsCashSale] = useState<boolean>(false);
  const [saleCashReceived, setSaleCashReceived] = useState<number>(0);

  // Items table
  const [itemsList, setItemsList] = useState<OCRItemRow[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState<string>('');

  // Fetch full customer directory on open
  useEffect(() => {
    if (isOpen) {
      api
        .getCustomers()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCustomersList(data);
          }
        })
        .catch((e) => console.warn('Could not load customer directory for OCR:', e));
    }
  }, [isOpen]);

  // When supplierName changes or suppliers list is ready, match supplier
  useEffect(() => {
    if (!supplierName.trim()) {
      setSelectedSupplier(null);
      setSelectedSupplierId('');
      return;
    }
    const clean = supplierName.trim().toLowerCase();
    const matched = (suppliers || []).find(
      (s) =>
        s &&
        (s.id === selectedSupplierId ||
          (s.title && s.title.toLowerCase() === clean) ||
          (s.accountTitle && s.accountTitle.toLowerCase() === clean) ||
          (s.name && s.name.toLowerCase() === clean) ||
          (s.code && s.code.toLowerCase() === clean) ||
          (s.title && s.title.toLowerCase().includes(clean)) ||
          (clean.length > 3 && s.title && clean.includes(s.title.toLowerCase())))
    );
    if (matched) {
      setSelectedSupplier(matched);
      setSelectedSupplierId(matched.id);
    } else {
      setSelectedSupplier(null);
    }
  }, [supplierName, suppliers, selectedSupplierId]);

  // When customer is selected, update selectedCustomer state
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null);
      return;
    }
    const found = (customersList || []).find((c) => c && (c.id === selectedCustomerId || c.code === selectedCustomerId));
    if (found) {
      setSelectedCustomer(found);
    } else {
      const rMatch = (restaurants || []).find((r) => r && r.id === selectedCustomerId);
      if (rMatch) {
        setSelectedCustomer({
          id: rMatch.id,
          code: (rMatch as any).code || '0101040001',
          accountTitle: rMatch.name,
          name: rMatch.name,
          mobile: rMatch.phone || '',
          area: rMatch.address || '',
          contactPerson: rMatch.contactPerson || '',
          outstandingBalance: rMatch.outstandingBalance || 0,
        } as Customer);
      }
    }
  }, [selectedCustomerId, customersList, restaurants]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Auto-detect SKU in catalog or keep existing
  const matchProductInCatalog = (name: string, mcodeOrSku?: string): Product | undefined => {
    if (mcodeOrSku && mcodeOrSku.trim()) {
      const cleanSku = mcodeOrSku.trim().toLowerCase();
      const bySku = (products || []).find(
        (p) =>
          (p.sku && p.sku.toLowerCase() === cleanSku) ||
          (p.mcode && p.mcode.toLowerCase() === cleanSku)
      );
      if (bySku) return bySku;
    }
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return (products || []).find((p) => {
      if (!p) return false;
      const pName = (p.name || '').toLowerCase();
      const pTitle = (p.itemTitle || '').toLowerCase();
      const pSku = (p.sku || p.mcode || '').toLowerCase();
      return (
        pName === lower ||
        pTitle === lower ||
        pSku === lower ||
        (pName && pName.length > 3 && lower.includes(pName)) ||
        (lower.length > 3 && pName.includes(lower))
      );
    });
  };

  // Generate unique code for brand new stock
  const generateNewSku = (index: number): string => {
    const rand = 1000 + ((Date.now() + index * 37) % 8999);
    return `ITM-${rand}`;
  };

  const handleRunOcr = async () => {
    if (!previewUrl) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let mimeType = 'image/jpeg';
      let base64Data = previewUrl;

      const commaIndex = previewUrl.indexOf(',');
      if (commaIndex !== -1) {
        const meta = previewUrl.substring(0, commaIndex);
        base64Data = previewUrl.substring(commaIndex + 1);
        const mimeMatch = meta.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // CRITICAL: Pass chosen ocrMode to backend OCR as hintType
      const result = await api.parseDocumentImage(base64Data, mimeType, ocrMode);
      setOcrResult(result);

      if (result.date) setInvoiceDate(result.date);
      if (result.invoiceNumber) setBillNumber(result.invoiceNumber);

      // In Purchase Mode: match supplier
      if (ocrMode === 'purchase') {
        const detectedSup = (result.supplierName || result.partyName || '').trim();
        if (detectedSup) {
          setSupplierName(detectedSup);
          const cleanSupplier = detectedSup.toLowerCase();
          const matched = (suppliers || []).find(
            (s) =>
              s &&
              ((s.title && s.title.toLowerCase().includes(cleanSupplier)) ||
                (s.name && s.name.toLowerCase().includes(cleanSupplier)) ||
                (s.accountTitle && s.accountTitle.toLowerCase().includes(cleanSupplier)) ||
                (cleanSupplier.length > 3 && s.title && cleanSupplier.includes(s.title.toLowerCase())))
          );
          if (matched) {
            setSelectedSupplier(matched);
            setSelectedSupplierId(matched.id);
          } else {
            setSelectedSupplier(null);
            setSelectedSupplierId('new-supplier');
          }
        }
      }

      // In Sale Mode: match customer from 329 customers
      if (ocrMode === 'sale') {
        const codeClean = (result.customerAccountCode || result.customerCode || '').trim().toLowerCase();
        const nameClean = (result.customerName || result.restaurantName || result.partyName || '').toLowerCase().trim();

        let matchedCust = (customersList || []).find(
          (c) =>
            c &&
            ((codeClean && (c.code?.toLowerCase() === codeClean || c.accountCode?.toLowerCase() === codeClean)) ||
              (nameClean &&
                ((c.accountTitle && c.accountTitle.toLowerCase().includes(nameClean)) ||
                  (c.name && c.name.toLowerCase().includes(nameClean)) ||
                  (nameClean.length > 3 && c.accountTitle && nameClean.includes(c.accountTitle.toLowerCase())))))
        );

        if (!matchedCust && (restaurants || []).length > 0 && nameClean) {
          const r = (restaurants || []).find(
            (rest) =>
              rest &&
              rest.name &&
              (rest.name.toLowerCase().includes(nameClean) || nameClean.includes(rest.name.toLowerCase()))
          );
          if (r) {
            setSelectedCustomerId(r.id);
          }
        } else if (matchedCust) {
          setSelectedCustomerId(matchedCust.id);
          setSelectedCustomer(matchedCust);
        }
      }

      // Items parsing with SKU detection vs generation, cartons, pieces, lump-sum, and sale price
      const rows: OCRItemRow[] = (result.items || []).map((it: any, idx: number) => {
        const itemName = (it.itemTitle || it.name || `Item ${idx + 1}`).trim();
        const matched = matchProductInCatalog(itemName, it.mcode);

        const ctn = Number(it.ctn) || 0;
        const qtyPerCtn = Number(it.qtyPerCtn) || (ctn > 0 ? Math.round((Number(it.quantity) || 1) / ctn) || 1 : 1);
        let qty = Number(it.quantity) || (ctn > 0 ? ctn * qtyPerCtn : 1);
        let ratePerCtn = Number(it.ratePerCtn) || 0;
        let rate = Number(it.price || it.rate) || 0;
        let lineTotal = Number(it.totalAmount || it.amount || it.total || it.purchaseCost) || 0;

        const isLumpSum =
          it.unit?.toUpperCase() === 'LUMP_SUM' ||
          (!ctn && !it.ratePerCtn && lineTotal > 0 && rate <= 0 && qty <= 1);

        if (isLumpSum) {
          qty = 1;
          if (lineTotal > 0 && rate <= 0) rate = lineTotal;
        } else {
          // If carton rate given but piece rate not, derive piece rate
          if (ratePerCtn > 0 && rate <= 0 && qtyPerCtn > 0) {
            rate = Number((ratePerCtn / qtyPerCtn).toFixed(2));
          }
          // If piece rate given but carton rate not, derive carton rate
          if (rate > 0 && ratePerCtn <= 0 && qtyPerCtn > 1) {
            ratePerCtn = Number((rate * qtyPerCtn).toFixed(2));
          }
          // Calculate line total
          if (lineTotal <= 0) {
            if (ctn > 0 && ratePerCtn > 0) {
              lineTotal = Number((ctn * ratePerCtn).toFixed(2));
            } else if (rate > 0 && qty > 0) {
              lineTotal = Number((rate * qty).toFixed(2));
            }
          }
        }

        // Sale bill specific: if slip had no price, apply matched catalog selling price!
        if (ocrMode === 'sale' && rate <= 0 && matched) {
          rate = matched.sellingPrice || 0;
          if (qtyPerCtn > 1) ratePerCtn = Number((rate * qtyPerCtn).toFixed(2));
          lineTotal = Number((qty * rate).toFixed(2));
        }

        // Purchase bill sale price suggestion (pre-filled from existing product or 20% margin default)
        const salePrice =
          it.salePrice ||
          (matched ? matched.sellingPrice : rate > 0 ? Math.round(rate * 1.2) : 0);

        // SKU / M-Code: existing detection vs new generation
        let mcode = '';
        let isNewItem = false;
        if (matched) {
          mcode = matched.sku || matched.mcode || it.mcode || '';
          isNewItem = false;
        } else {
          mcode = it.mcode ? it.mcode.trim() : generateNewSku(idx);
          isNewItem = true;
        }

        const category = it.category || (matched ? matched.category : mapToProductCategory(itemName));
        const unit = isLumpSum ? 'LUMP_SUM' : normalizeUnit(it.unit || (matched ? matched.unit : ctn > 0 ? 'CTN' : 'KG'));

        return {
          id: it.id || `ocr-item-${Date.now()}-${idx + 1}`,
          selected: true,
          name: matched ? matched.name : itemName,
          mcode,
          isNewItem,
          category,
          ctn,
          qtyPerCtn,
          quantity: qty,
          unit,
          isLumpSum,
          ratePerCtn,
          price: rate,
          salePrice,
          total: lineTotal,
          confidence: it.confidence || 0.9,
          matchedProductId: matched ? matched.id : undefined,
          existingStock: matched ? matched.currentQuantity : undefined,
        };
      });

      setItemsList(rows);

      // Payments initialization from slip
      const billTotal = rows.reduce((s, r) => s + r.total, 0);
      if (result.paidAmount) {
        setPurchasePaidAmount(result.paidAmount);
        setSaleCashReceived(result.paidAmount);
      } else {
        setPurchasePaidAmount(billTotal);
        setSaleCashReceived(billTotal);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Heavy OCR parsing failed. Baraye meherbani tasweer dobara check karein.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleItem = (index: number) => {
    setItemsList((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleUpdateItemField = (index: number, field: keyof OCRItemRow, value: any) => {
    setItemsList((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const updated = { ...it, [field]: value };

        // Match against catalog if user edits name
        if (field === 'name') {
          const m = matchProductInCatalog(String(value));
          if (m) {
            updated.matchedProductId = m.id;
            updated.existingStock = m.currentQuantity;
            updated.mcode = m.sku || m.mcode || updated.mcode;
            updated.isNewItem = false;
            if (m.category) updated.category = m.category;
            if (m.sellingPrice) updated.salePrice = m.sellingPrice;
          } else {
            updated.matchedProductId = undefined;
            updated.isNewItem = true;
          }
        }

        // Auto-recalculate quantities, rates, and line total
        if (field === 'ctn' || field === 'qtyPerCtn') {
          const c = Number(field === 'ctn' ? value : updated.ctn) || 0;
          const qpc = Number(field === 'qtyPerCtn' ? value : updated.qtyPerCtn) || 1;
          if (c > 0) {
            updated.quantity = c * qpc;
          }
          if (updated.ratePerCtn > 0) {
            updated.total = Number((c * updated.ratePerCtn).toFixed(2));
            if (qpc > 0) updated.price = Number((updated.ratePerCtn / qpc).toFixed(2));
          }
        } else if (field === 'ratePerCtn') {
          const rpc = Number(value) || 0;
          const c = Number(updated.ctn) || 0;
          const qpc = Number(updated.qtyPerCtn) || 1;
          if (c > 0) {
            updated.total = Number((c * rpc).toFixed(2));
          }
          if (qpc > 0) {
            updated.price = Number((rpc / qpc).toFixed(2));
          }
        } else if (field === 'price' || field === 'quantity') {
          const q = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const p = Number(field === 'price' ? value : updated.price) || 0;
          updated.total = Number((q * p).toFixed(2));
        } else if (field === 'total') {
          const t = Number(value) || 0;
          const q = Number(updated.quantity) || 1;
          if (q > 0) updated.price = Number((t / q).toFixed(2));
        }

        return updated;
      })
    );
  };

  const handleAddItemRow = () => {
    const newSku = generateNewSku(itemsList.length);
    const newRow: OCRItemRow = {
      id: `manual-item-${Date.now()}`,
      selected: true,
      name: '',
      mcode: newSku,
      isNewItem: true,
      category: 'Kitchen Supplies',
      ctn: 0,
      qtyPerCtn: 1,
      quantity: 1,
      unit: 'KG',
      ratePerCtn: 0,
      price: 0,
      salePrice: 0,
      total: 0,
      confidence: 1.0,
      isManualRow: true,
    };
    setItemsList((prev) => [...prev, newRow]);
  };

  const handleDeleteItemRow = (index: number) => {
    setItemsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleAll = () => {
    const allSelected = itemsList.every((it) => it.selected);
    setItemsList((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
  };

  const selectedItems = itemsList.filter((it) => it.selected);
  const selectedCount = selectedItems.length;
  const allSelected = itemsList.length > 0 && selectedCount === itemsList.length;

  const totalSelectedAmount = selectedItems.reduce((sum, it) => {
    const val = it.total > 0 ? it.total : (it.price || 0) * (it.quantity || 1);
    return sum + val;
  }, 0);

  const displayTotal =
    totalSelectedAmount > 0 ? totalSelectedAmount : ocrResult?.totalAmount || 0;

  // CRITICAL USER MANDATE: Comparison between calculated total and slip total!
  // "cheezu ki price wegera calculte kr k total amount sy comaprison kry theek ban rha dono same hai agr nahi hai to alert dy k itny ka dif ha."
  const slipGrandTotal = ocrResult?.totalAmount || 0;
  const hasTotalMismatch =
    slipGrandTotal > 0 && Math.abs(totalSelectedAmount - slipGrandTotal) >= 1;
  const totalDifference = Math.abs(totalSelectedAmount - slipGrandTotal);

  // Supplier previous payable calculation:
  const supplierPrevPayable = selectedSupplier
    ? selectedSupplier.payableToSupplier || 0
    : ocrResult?.previousPayable || ocrResult?.previousBalance || 0;
  const newSupplierPayable = Math.max(
    0,
    Number(
      (
        supplierPrevPayable +
        displayTotal -
        (isCashPurchase ? displayTotal : purchasePaidAmount)
      ).toFixed(2)
    )
  );

  // Customer previous receivable calculation:
  const customerPrevReceivable = selectedCustomer
    ? selectedCustomer.outstandingBalance || 0
    : ocrResult?.previousReceivable || ocrResult?.previousBalance || 0;
  const newCustomerReceivable = Math.max(
    0,
    Number(
      (
        customerPrevReceivable +
        displayTotal -
        (isCashSale ? displayTotal : saleCashReceived)
      ).toFixed(2)
    )
  );

  // Filtered customer search list for sale bill
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customersList.slice(0, 30);
    const q = customerSearch.toLowerCase().trim();
    return customersList
      .filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.accountTitle.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.mobile && c.mobile.includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [customersList, customerSearch]);

  // Mandatory fields check
  const missingReportFields = useMemo(() => {
    const list: string[] = [];

    if (ocrMode === 'purchase') {
      if (!supplierName.trim()) {
        list.push('Supplier ka naam / account title laazmi hai');
      }
      if (selectedCount === 0) {
        list.push('Kam az kam 1 item select karna zaroori hai');
      }
      selectedItems.forEach((it, i) => {
        if (!it.name.trim()) {
          list.push(`Item #${i + 1} ka naam missing hai`);
        }
        if (!it.quantity || it.quantity <= 0) {
          list.push(`Item "${it.name || `#${i + 1}`}" ki Quantity (Tadad) > 0 hona laazmi hai`);
        }
        if (!it.price || it.price <= 0) {
          list.push(`Item "${it.name || `#${i + 1}`}" ka Rate (Khareed Price) > 0 hona laazmi hai`);
        }
      });
    } else if (ocrMode === 'sale') {
      if (!selectedCustomerId && !selectedCustomer) {
        list.push('Customer / Gahak select karna laazmi hai');
      }
      if (selectedCount === 0) {
        list.push('Kam az kam 1 item select karna zaroori hai');
      }
      selectedItems.forEach((it, i) => {
        if (!it.name.trim()) {
          list.push(`Item #${i + 1} ka naam missing hai`);
        }
        if (!it.quantity || it.quantity <= 0) {
          list.push(`Item "${it.name || `#${i + 1}`}" ki Quantity > 0 hona laazmi hai`);
        }
        if (!it.price || it.price <= 0) {
          list.push(`Item "${it.name || `#${i + 1}`}" ka Selling Rate (Price) > 0 hona laazmi hai`);
        }
      });
    }

    return list;
  }, [
    ocrMode,
    supplierName,
    selectedCustomerId,
    selectedCustomer,
    selectedCount,
    selectedItems,
  ]);

  const handleConfirmImport = async () => {
    if (missingReportFields.length > 0) {
      setErrorMsg(`Report k liye zaroori cheezain darj karein:\n${missingReportFields.join('\n')}`);
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const activeUser = currentUser || {
      id: 'staff-user',
      name: `Staff (${currentRole})`,
      role: currentRole,
    };

    try {
      if (ocrMode === 'purchase') {
        // Resolve or auto-create supplier
        let finalSupplierId = selectedSupplier ? selectedSupplier.id : undefined;
        let finalSupplierTitle = supplierName.trim();

        if (!finalSupplierId && supplierName.trim()) {
          try {
            const createdSup = await api.createSupplier({
              title: supplierName.trim(),
              name: supplierName.trim(),
              accountTitle: supplierName.trim(),
              payableToSupplier: supplierPrevPayable,
            });
            if (createdSup && createdSup.supplier) {
              finalSupplierId = createdSup.supplier.id;
              finalSupplierTitle = createdSup.supplier.accountTitle || createdSup.supplier.title;
            }
          } catch (e) {
            console.warn('Auto create supplier error, using title:', e);
          }
        }

        // =====================================================================
        // OPERATION 1: CREATE OFFICIAL PURCHASE BILL & UPDATE WAREHOUSE STOCK
        // =====================================================================
        const billPayload: Partial<PurchaseBill> = {
          billNumber: billNumber || undefined,
          date: invoiceDate,
          supplierId: finalSupplierId,
          supplierAccountTitle: finalSupplierTitle,
          partyBalanceBefore: supplierPrevPayable,
          isCash: isCashPurchase,
          paidAmount: isCashPurchase ? displayTotal : purchasePaidAmount,
          loadExp: 0,
          items: selectedItems.map((it) => ({
            id: it.id,
            productId: it.matchedProductId,
            itemTitle: it.name.trim(),
            category: it.category,
            mcode: it.mcode,
            qty: it.quantity,
            rate: it.price,
            salePrice: it.salePrice, // preserved for inventory sellingPrice
            amount: it.total,
            ctn: it.ctn,
            ratePerCtn: it.ratePerCtn,
            qtyPerCtn: it.qtyPerCtn,
            discount: 0,
            vatPercent: 0,
            vatAmount: 0,
            stock: it.existingStock || 0,
            unit: it.unit,
          })),
        };

        const createdBill = await api.createPurchase(billPayload, 'ocr_scan', activeUser);

        setSuccessMsg(
          `Kamyabi! Purchase Bill #${createdBill.billNumber} mehfooz ho gaya. Tamam items ka stock warehouse me jama ho gaya aur Supplier ka payable balance update ho chuka hai!`
        );
      } else if (ocrMode === 'sale') {
        // =====================================================================
        // OPERATION 2: CREATE OFFICIAL SALE BILL & DEDUCT PHYSICAL INVENTORY
        // =====================================================================
        const custTitle = selectedCustomer
          ? selectedCustomer.accountTitle || selectedCustomer.name
          : 'Walk-in Customer';

        const saleBillPayload: Partial<SaleBill> = {
          billNumber: billNumber || undefined,
          date: invoiceDate,
          customerId: selectedCustomer ? selectedCustomer.id : 'cust-cash',
          customerAccountTitle: custTitle,
          customerMobile: selectedCustomer ? selectedCustomer.mobile : '',
          partyBalanceBefore: customerPrevReceivable,
          paymentType: isCashSale ? 'Cash' : 'Account',
          cashReceived: isCashSale ? displayTotal : saleCashReceived,
          items: selectedItems.map((it) => ({
            id: it.id,
            productId: it.matchedProductId,
            itemTitle: it.name.trim(),
            category: it.category,
            mcode: it.mcode,
            qty: it.quantity,
            rate: it.price,
            amount: it.total,
            ctn: it.ctn,
            ratePerCtn: it.ratePerCtn,
            qtyPerCtn: it.qtyPerCtn,
            discount: 0,
            vatPercent: 0,
            vatAmount: 0,
            stock: it.existingStock || 0,
            unit: it.unit,
          })),
        };

        const createdSale = await api.createSale(saleBillPayload, activeUser);

        setSuccessMsg(
          `Kamyabi! Sale Bill #${createdSale.billNumber} ban gaya. Gahak (${custTitle}) ka khata update ho gaya aur inventory me se stock minus ho chuka hai!`
        );
      }

      onDataMutated();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg('Import error: ' + (err.message || 'Operation failed'));
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Heavy AI OCR Slip &amp; Bill Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini Vision 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mandi parchas, handwritten slips, customer sale memos &amp; purchase bills automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGeminiKeyModal && (
              <button
                onClick={onOpenGeminiKeyModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white rounded-lg border border-indigo-700/60 text-xs font-semibold transition"
                title="Configure Gemini API Key from Google AI Studio"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Gemini Key (AI Studio)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-300 max-h-[85vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Notice / Alert:</span>
                <span className="whitespace-pre-line text-xs">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <span className="font-bold text-sm">{successMsg}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: UPFRONT MODE SELECTION (BEFORE IMAGE UPLOAD)               */}
          {/* CRITICAL USER REQUIREMENT:                                        */}
          {/* "ocr image add krny sy phly option ho stock and purchase bill hai   */}
          {/* ya customer sale bill hai phr imagr addkrny pr usk hi section      */}
          {/* main details aye gi dusry main kuch show ni hona chhye bcz client   */}
          {/* confuse na ho jaye. genral expense ka tab del krdo is main."      */}
          {/* ================================================================= */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                <span>Select Bill Type Before Uploading (بل کی قسم منتخب کریں):</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Details sirf muntakhib karda section me aayen gi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Stock & Purchase Bill */}
              <button
                type="button"
                onClick={() => {
                  setOcrMode('purchase');
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer relative ${
                  ocrMode === 'purchase'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-950/60'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    ocrMode === 'purchase' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <PackagePlus className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Stock &amp; Purchase Bill</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      اسٹاک / پرچیز بل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    Supplier bill, Mandi parcha, factory intake &amp; warehouse stock entry.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Supplier Ledger + Cartons + Pieces + Stock Barhana
                  </div>
                </div>
              </button>

              {/* Option 2: Customer Sale Bill */}
              <button
                type="button"
                onClick={() => {
                  setOcrMode('sale');
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer relative ${
                  ocrMode === 'sale'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-950/60'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    ocrMode === 'sale' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Customer Sale Bill</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      کسٹمر سیل بل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    Customer sale memo, delivery note, khata update &amp; inventory deduction.
                  </p>
                  <div className="text-[10px] text-indigo-400 font-semibold mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Customer Khata + Sale Report + Stock Minus
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* STEP 2: UPLOAD DROPZONE & PREVIEW                                 */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ocr-file-input"
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/70 hover:bg-slate-950 transition text-center min-h-[170px]"
              >
                <Upload className="w-9 h-9 text-indigo-400 mb-2 animate-bounce" />
                <span className="font-bold text-slate-200 text-sm">
                  {ocrMode === 'purchase'
                    ? 'Upload Supplier Purchase Bill / Mandi Slip Photo'
                    : 'Upload Customer Sale Bill / Memo Photo'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Urdu, Arabic &amp; English handwritten or printed slips supported (JPG, PNG, WEBP)
                </span>
                <input
                  id="ocr-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview & Scan Trigger */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[170px]">
              {previewUrl ? (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-48 object-contain rounded-xl border border-slate-800 shadow"
                  />
                  <button
                    onClick={handleRunOcr}
                    disabled={isAnalyzing}
                    className="mt-3 w-full py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI Heavy Detection Running (پرچی پڑھی جا رہی ہے)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          Run Heavy AI OCR Extraction (
                          {ocrMode === 'purchase' ? 'پرچیز بل پڑھیں' : 'کسٹمر سیل بل پڑھیں'})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-slate-500 text-center py-6">
                  <ImageIcon className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  <span className="text-xs">No slip image selected yet</span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* STEP 3: OCR DETAILS SECTION (ONLY CHOSEN MODE DETAILS DISPLAYED)   */}
          {/* ================================================================= */}
          {ocrResult && (
            <div className="bg-slate-950 border border-indigo-900/40 rounded-2xl p-5 space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      OCR Extracted Details ({itemsList.length} items detected) &bull;{' '}
                      <span className={ocrMode === 'purchase' ? 'text-emerald-400' : 'text-indigo-400'}>
                        {ocrMode === 'purchase' ? 'Stock & Purchase Bill' : 'Customer Sale Bill'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Multi-lingual handwritten &amp; printed slip detection complete.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {ocrMode === 'purchase' ? 'Purchase Invoice' : 'Customer Sale Invoice'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AI Verified
                  </span>
                </div>
              </div>

              {/* CRITICAL TOTAL COMPARISON & ALERT BANNER */}
              {slipGrandTotal > 0 && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
                    hasTotalMismatch
                      ? 'bg-rose-950/70 border-rose-600 text-rose-200'
                      : 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {hasTotalMismatch ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs sm:text-sm">
                        {hasTotalMismatch
                          ? `⚠️ Total Amount Farq Alert: Items Total aur Slip Total me Rs. ${totalDifference.toLocaleString()} ka difference hai!`
                          : `✅ Perfect Match: Slip Total aur Items Total dono theek hain!`}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        Items Ka Total: <strong>{currencySymbol()} {totalSelectedAmount.toLocaleString()}</strong> &bull; Slip Par Likhha Total: <strong>{currencySymbol()} {slipGrandTotal.toLocaleString()}</strong>
                        {hasTotalMismatch && ocrMode === 'sale' && (
                          <span className="block text-[10px] text-rose-300 mt-0.5 font-semibold">
                            (Note: Farq is wajah se bhi hosakta hai k slip par pichhla sabqa baqaya shamil ho)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      hasTotalMismatch
                        ? 'bg-rose-500 text-white shadow-lg'
                        : 'bg-emerald-500 text-white shadow-lg'
                    }`}
                  >
                    {hasTotalMismatch ? `Diff: ${currencySymbol()} ${totalDifference.toLocaleString()}` : '0 Diff (Exact)'}
                  </span>
                </div>
              )}

              {/* MANDATORY REPORT REQUIREMENTS ALERT */}
              {missingReportFields.length > 0 && (
                <div className="p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>⚠️ Report k liye ye cheezain zaroori hain (Mandatory Fields):</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-100/90 space-y-1 pl-1">
                    {missingReportFields.map((field, idx) => (
                      <li key={idx} className="font-medium">
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECTION A: PURCHASE BILL DETAILS (ONLY SHOWN IN PURCHASE MODE) */}
              {/* ------------------------------------------------------------- */}
              {ocrMode === 'purchase' && (
                <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-white">
                        Supplier Verification &amp; Khata (سپلائر تصدیق اور پچھلا کھاتہ)
                      </span>
                    </div>
                    {selectedSupplier ? (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        System Matched Supplier: [{selectedSupplier.code || 'Registered'}] {selectedSupplier.title}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ✨ New Supplier (System me naya create ho ga)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Supplier Name / Account Title:
                      </label>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="e.g. Badami Bagh Sabzi Mandi / Haji Traders"
                        className={`w-full px-3 py-2 bg-slate-950 rounded-xl border text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 ${
                          !supplierName.trim() ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                        }`}
                      />
                      {!supplierName.trim() && (
                        <span className="text-[10px] text-rose-400 font-bold block mt-1">
                          ⚠️ Report k liye supplier name laazmi hai
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Bill / Bilty #:
                      </label>
                      <input
                        type="text"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Bill Date:
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Financial Computation Grid for Supplier Khata */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Previous Payable (پچھلا بقایا)
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm mt-0.5 block">
                        {currencySymbol()} {supplierPrevPayable.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Current Bill (موجودہ بل)
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                        + {currencySymbol()} {displayTotal.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Current Paid (ادا رقم)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={isCashPurchase ? displayTotal : purchasePaidAmount}
                        disabled={isCashPurchase}
                        onChange={(e) => setPurchasePaidAmount(Number(e.target.value) || 0)}
                        className="w-full px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Bill Balance (بل کا بقایا)
                      </span>
                      <span className="font-mono font-bold text-orange-400 text-sm mt-0.5 block">
                        = {currencySymbol()}{' '}
                        {isCashPurchase
                          ? 0
                          : Math.max(0, displayTotal - purchasePaidAmount).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        New Total Payable (نیا کل بقایا)
                      </span>
                      <span className="font-mono font-bold text-rose-400 text-sm mt-0.5 block">
                        = {currencySymbol()} {newSupplierPayable.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isCashPurchase}
                        onChange={(e) => setIsCashPurchase(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <span className="text-slate-300 font-semibold">
                        Cash Purchase (مکمل نقد خریداری — کوئی نیا ادھار نہیں)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={addToStockInventory}
                        onChange={(e) => setAddToStockInventory(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <span className="text-slate-300 font-semibold text-emerald-400">
                        Automatically add to warehouse stock inventory (اسٹاک میں جمع کریں)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECTION B: SALE BILL DETAILS (ONLY SHOWN IN SALE MODE)       */}
              {/* ------------------------------------------------------------- */}
              {ocrMode === 'sale' && (
                <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-xs text-white">
                        Customer Verification &amp; Khata (گاہک تصدیق اور وصولی)
                      </span>
                    </div>
                    {selectedCustomer ? (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Code: {selectedCustomer.code || '010104XXXX'} &bull; {selectedCustomer.accountTitle}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⚠️ Please Select Customer from Directory
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Search &amp; Match Customer (By Code 010104XXXX / Name / Mobile):
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customer code (e.g. 0101040001), restaurant name..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Dropdown list of matched customers */}
                      {customersList.length > 0 && (
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => {
                            setSelectedCustomerId(e.target.value);
                            const found = customersList.find((c) => c.id === e.target.value);
                            if (found) setSelectedCustomer(found);
                          }}
                          className={`mt-2 w-full px-3 py-2 bg-slate-950 rounded-xl border text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                            !selectedCustomerId ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                          }`}
                        >
                          <option value="">-- Choose Customer from Directory --</option>
                          {filteredCustomers.map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.code}] {c.accountTitle} &bull; {c.contactPerson || c.area || ''} (Bal: {currencySymbol()}{' '}
                              {c.outstandingBalance || 0})
                            </option>
                          ))}
                        </select>
                      )}
                      {!selectedCustomerId && !selectedCustomer && (
                        <span className="text-[10px] text-rose-400 font-bold block mt-1">
                          ⚠️ Report k liye customer select karna laazmi hai
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Sale Bill #:
                      </label>
                      <input
                        type="text"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white font-mono"
                      />
                      <label className="block text-[11px] font-bold text-slate-300 mt-2 mb-1">
                        Date:
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Financial Computation Grid for Customer Khata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Previous Receivable (پچھلا بقایا)
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm mt-0.5 block">
                        {currencySymbol()} {customerPrevReceivable.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Current Sale (موجودہ سیل)
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                        + {currencySymbol()} {displayTotal.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Cash Received (وصول شدہ رقم)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={isCashSale ? displayTotal : saleCashReceived}
                        disabled={isCashSale}
                        onChange={(e) => setSaleCashReceived(Number(e.target.value) || 0)}
                        className="w-full px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        New Receivable (نیا کل بقایا)
                      </span>
                      <span className="font-mono font-bold text-cyan-400 text-sm mt-0.5 block">
                        = {currencySymbol()} {newCustomerReceivable.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isCashSale}
                        onChange={(e) => setIsCashSale(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <span className="text-slate-300 font-semibold">
                        Cash Counter Sale (فوری مکمل نقد ادائیگی — کھاتہ صفر)
                      </span>
                    </label>

                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Physical inventory will be deducted automatically for each sold item.
                    </span>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* RECOGNIZED ITEMS TABLE WITH INLINE EDIT & MANDATORY CHECKS   */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    <span>&bull;</span>
                    <span className="text-slate-400">
                      {selectedCount} of {itemsList.length} items included
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Naya Item Shamil Karein</span>
                    </button>
                    <div className="text-emerald-400 font-mono font-bold text-xs bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      Items Total: {currencySymbol()} {totalSelectedAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-2 border border-slate-800 divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                  {itemsList.map((item, index) => {
                    const isInvalidPrice = item.selected && (!item.price || item.price <= 0);
                    const isInvalidQty = item.selected && (!item.quantity || item.quantity <= 0);
                    const isInvalidTitle = item.selected && !item.name.trim();

                    return (
                      <div
                        key={item.id}
                        className={`py-3 px-3 flex flex-col gap-2.5 text-xs transition rounded-xl ${
                          item.selected ? 'bg-slate-900/80 hover:bg-slate-850' : 'opacity-40'
                        } ${isInvalidPrice || isInvalidQty || isInvalidTitle ? 'border border-rose-500/40 bg-rose-950/10' : ''}`}
                      >
                        {/* Row Header: Checkbox, Name, SKU Badge, Category, Delete */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(index)}
                            className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-800 shrink-0 cursor-pointer"
                          />

                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItemField(index, 'name', e.target.value)}
                            placeholder="Item name / title"
                            className={`px-2.5 py-1 bg-slate-950 rounded-lg text-xs font-bold text-white flex-1 min-w-[200px] outline-none border ${
                              isInvalidTitle ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700 focus:border-indigo-500'
                            }`}
                          />

                          {/* SKU / M-Code Status Badge */}
                          {item.matchedProductId ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                              ✓ Existing Code: {item.mcode} (In Stock: {item.existingStock || 0} {item.unit})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                              ✨ New Item (Code: {item.mcode})
                            </span>
                          )}

                          <input
                            type="text"
                            value={item.mcode}
                            onChange={(e) => handleUpdateItemField(index, 'mcode', e.target.value)}
                            placeholder="SKU / M-Code"
                            className="w-24 px-2 py-1 bg-slate-950 rounded-lg text-[11px] text-slate-300 font-mono border border-slate-700"
                            title="SKU / Item Code"
                          />

                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateItemField(index, 'category', e.target.value)}
                            placeholder="Category"
                            className="w-28 px-2 py-1 bg-slate-950 rounded-lg text-[11px] text-slate-300 border border-slate-700"
                          />

                          <button
                            type="button"
                            onClick={() => handleDeleteItemRow(index)}
                            className="ml-auto text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                            title="Delete item row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Measurement & Rates Row: Cartons, Qty/Ctn, Quantity, Unit, Rate/Ctn, Rate/Piece, Sale Price, Total */}
                        <div className="flex items-center gap-3 flex-wrap pl-6 text-slate-300">
                          {/* Cartons */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Ctns (کارٹن):</span>
                            <input
                              type="number"
                              min="0"
                              value={item.ctn || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'ctn', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-14 px-2 py-1 text-xs bg-slate-950 rounded-lg text-white font-mono border border-slate-700 text-center"
                            />
                          </div>

                          {/* Pcs per Carton */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Pcs/Ctn (فی کارٹن پیس):</span>
                            <input
                              type="number"
                              min="1"
                              value={item.qtyPerCtn || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'qtyPerCtn', parseFloat(e.target.value) || 1)
                              }
                              placeholder="1"
                              className="w-14 px-2 py-1 text-xs bg-slate-950 rounded-lg text-white font-mono border border-slate-700 text-center"
                            />
                          </div>

                          {/* Total Quantity */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Total Qty (کل تعداد):</span>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.quantity || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className={`w-16 px-2 py-1 text-xs bg-slate-950 rounded-lg text-white font-mono border ${
                                isInvalidQty ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                              } text-center`}
                            />
                          </div>

                          {/* Unit */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Unit:</span>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateItemField(index, 'unit', e.target.value)}
                              className="w-16 px-2 py-1 text-xs bg-slate-950 rounded-lg text-white font-mono border border-slate-700 uppercase text-center"
                            />
                          </div>

                          {/* Rate per Carton */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Rate/Ctn (کارٹن ریٹ):</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.ratePerCtn || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'ratePerCtn', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-20 px-2 py-1 text-xs bg-slate-950 rounded-lg font-mono border border-slate-700 text-white text-right"
                            />
                          </div>

                          {/* Rate per Piece / Unit (Khareed Price) */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {ocrMode === 'purchase' ? 'Khareed Rate (خرید):' : 'Sale Rate (سیل ریٹ):'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'price', parseFloat(e.target.value) || 0)
                              }
                              placeholder="Rate"
                              className={`w-20 px-2 py-1 text-xs bg-slate-950 rounded-lg font-mono border ${
                                isInvalidPrice
                                  ? 'border-rose-500 text-rose-300 ring-1 ring-rose-500'
                                  : 'border-slate-700 text-white'
                              } text-right`}
                            />
                          </div>

                          {/* CRITICAL USER REQUIREMENT: Ask Sale Price during Purchase Bill */}
                          {ocrMode === 'purchase' && (
                            <div className="flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-800/60">
                              <span className="text-[10px] text-emerald-300 font-bold">Sale Price (سیل ریٹ):</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.salePrice || ''}
                                onChange={(e) =>
                                  handleUpdateItemField(index, 'salePrice', parseFloat(e.target.value) || 0)
                                }
                                placeholder="Sale"
                                className="w-20 px-2 py-1 text-xs bg-slate-950 rounded-lg font-mono border border-emerald-700 text-emerald-300 font-bold text-right"
                                title="Set selling price for this product in catalog"
                              />
                            </div>
                          )}

                          {/* Line Total */}
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-[10px] text-slate-400 font-medium">Total:</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.total || ''}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'total', parseFloat(e.target.value) || 0)
                              }
                              className="w-24 px-2 py-1 text-xs bg-slate-950 rounded-lg font-mono text-emerald-400 font-bold border border-slate-700 text-right"
                            />
                          </div>
                        </div>

                        {/* Warnings if mandatory fields empty */}
                        {(isInvalidPrice || isInvalidQty) && (
                          <div className="pl-6 flex items-center gap-2">
                            {isInvalidPrice && (
                              <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                                ⚠️ Rate (Price) laazmi hai
                              </span>
                            )}
                            {isInvalidQty && (
                              <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                                ⚠️ Quantity laazmi hai
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 text-center sm:text-left">
                  {ocrMode === 'purchase' ? (
                    <span>
                      Stock &amp; Purchase Bill with <strong>{selectedCount}</strong> items for <strong>{supplierName}</strong> (Total: {currencySymbol()}{' '}
                      {displayTotal.toLocaleString()})
                    </span>
                  ) : (
                    <span>
                      Customer Sale Bill with <strong>{selectedCount}</strong> items for{' '}
                      <strong>{selectedCustomer ? selectedCustomer.accountTitle : 'Selected Customer'}</strong> (Total: {currencySymbol()}{' '}
                      {displayTotal.toLocaleString()})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isImporting}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    Discard
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting || missingReportFields.length > 0}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      ocrMode === 'purchase'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Database aur Ledger me darj ho raha hai...</span>
                      </>
                    ) : ocrMode === 'purchase' ? (
                      <>
                        <PackagePlus className="w-4 h-4" />
                        <span>
                          Save Purchase Bill &amp; Update Stock ({currencySymbol()} {displayTotal.toLocaleString()})
                        </span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          Save Sale Bill &amp; Deduct Stock ({currencySymbol()} {displayTotal.toLocaleString()})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
