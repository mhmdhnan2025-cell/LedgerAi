/**
 * Core Data Models for Restaurant Supply Management & Profit Intelligence
 */

export type UserRole =
  | 'Admin'
  | 'Employee'
  | 'Manager'
  | 'Order Taker'
  | 'Inventory Staff'
  | 'Accountant'
  | 'Viewer';

export interface Company {
  id: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  inviteCode: string;
  inviteCodeStatus: 'ACTIVE' | 'REVOKED';
  inviteCodeCreatedAt?: string;
  inviteCodeExpiresAt?: string | null;
  phone?: string;
  city?: string;
  address?: string;
  businessType?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UnitType = 'kg' | 'gram' | 'liter' | 'carton' | 'box' | 'piece' | 'bag' | 'can' | 'bundle';

export type ProductCategory =
  | 'Rice & Grains'
  | 'Pulses & Daal'
  | 'Flour & Atta'
  | 'Sugar & Sweeteners'
  | 'Cooking Oil & Ghee'
  | 'Spices & Masala'
  | 'Salt & Seasonings'
  | 'Vegetables & Fresh'
  | 'Meat & Poultry'
  | 'Beverages & Syrups'
  | 'Packaging & Containers'
  | 'Cleaning & Hygiene'
  | 'Kitchen Supplies'
  | 'Dairy'
  | 'Custom';

export interface Product {
  id: string;
  sku: string;
  mcode?: string;                 // M.CODE from Item Management
  articleNo?: string;             // Article# from Item Management
  barcode?: string;               // Barcode
  manualBarcode?: string;         // Manual Barcode
  name: string;
  itemTitle?: string;             // Item Title from Item Management
  description?: string;
  category: ProductCategory | string;
  measure?: string;               // Measure / Unit
  unit: UnitType | string;
  companyBrand?: string;          // Company Brands
  packageType?: string;           // Package Type: Carton, Bag, Box, Tin, Pack
  qtyInCarton?: number;           // Qty In Carton (e.g. 15 kg/ctn, 25 kg/ctn)
  carton?: number;                // Carton count
  ctn?: number;                   // Carton count alias
  extraKg?: number;               // Extra loose KG / loose units
  pcs?: number;                   // Loose extra kg/pcs alias
  ctnPurchaseRate?: number;       // CTN Purchase Rate
  ctnSaleRate?: number;           // CTN Sale Rate
  ctnMinSaleRate?: number;        // CTN Min Sale Rate
  totalStock?: number;            // Total Stock = (Carton * QtyInCarton) + ExtraKg
  currentQuantity: number;
  minStockLevel: number;
  minQuantity?: number;           // Min Quantity for generate demand list
  purchasePrice: number;          // Actual cost per unit
  prchFixedPrice?: boolean;       // Prch Fixed Price checkbox
  sellingPrice: number;           // Standard wholesale selling price / Sale Price
  salePrice?: number;             // Sale Price
  saleFixedPrice?: boolean;       // Sale Fixed Price checkbox
  saleDiscount?: number;          // Sale Discount
  saleMinPrice?: number;          // Sale Min Price
  comments?: string;
  scanType?: string;              // General / Barcode
  customFields?: string;
  image?: string;                 // Image preview
  status?: boolean;               // Active status toggle (default true)
  supplierId?: string;
  supplierName?: string;
  companyId?: string;
  lastPurchasePrice: number;
  averagePurchaseCost: number;
  stockValue: number;             // currentQuantity * purchasePrice
  profitMargin: number;           // ((sellingPrice - purchasePrice) / sellingPrice) * 100
  lowStockAlert: boolean;
  shortageQuantity?: number;      // Shortage quantity needed for current pending orders
  totalOrderedQuantity?: number;  // Total quantity in active orders
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillItem {
  id: string;
  productId?: string;
  itemTitle: string;
  category?: string;
  mcode?: string;
  packageType?: string;           // Carton, Bag, Box, Tin, Pack
  ctn: number;
  ratePerCtn: number;
  qtyPerCtn: number;
  qty: number;
  rate: number;
  discount: number;
  vatPercent: number;
  vatAmount: number;
  amount: number;
  stock?: number;
  newStock?: number;              // Stock after addition
  extraPiece?: number;
  unit?: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;             // e.g. "1713"
  vendorBillNumber?: string;       // V.Bill# e.g. "V-9921"
  gatePassNumber?: string;         // GP# e.g. "GP-441"
  date: string;                    // e.g. "21-09-2026"
  supplierId: string;              // Account / Supplier ID
  supplierAccountTitle: string;    // Account Name
  customerName?: string;           // Purchaser / Buyer / Customer name
  partyBalanceBefore?: number;     // Party Bal prior to bill
  isCash: boolean;                 // Cash checkbox
  discountType: 'Percentage' | 'Amount' | 'Percent';
  items: PurchaseBillItem[];
  totalCtn: number;
  totalQty: number;
  totalDiscount: number;
  totalVatAmount: number;
  grossAmount: number;
  loadExp: number;                 // Load Exp:(-) Amount
  isLoadExpDeduction: boolean;     // (-) checkbox
  netTotal: number;
  paidAmount: number;
  remainingBalance: number;        // Payable added to supplier Party Bal
  stockAdded?: boolean;            // Track if added to physical inventory stock
  addToStock?: boolean;            // Form submission flag to add to inventory stock
  notes?: string;
  status?: string;
  totalAmount?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseReport {
  totalBillsCount: number;
  totalCtn?: number;
  totalQty?: number;
  totalGrossAmount: number;
  totalDiscount: number;
  totalVatAmount: number;
  totalNetPurchases: number;
  totalPaidAmount: number;
  totalRemainingBalance: number;
  supplierBreakdown: {
    supplierId: string;
    supplierName: string;
    billsCount: number;
    totalAmount: number;
    totalPaid?: number;
    paidAmount?: number;
    balance?: number;
    remainingBalance?: number;
  }[];
  itemBreakdown: {
    productId?: string;
    itemTitle: string;
    category?: string;
    totalCtn?: number;
    totalQty: number;
    totalAmount: number;
    averageRate?: number;
  }[];
  bills: PurchaseBill[];
}

export type InventoryTransactionType = 'PURCHASE' | 'ORDER_FULFILLMENT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryTransactionType;
  quantity: number;
  unit: UnitType | string;
  unitCost: number;
  totalAmount: number;
  referenceType: 'ORDER' | 'SUPPLIER_PURCHASE' | 'MANUAL_ADJUSTMENT';
  referenceId?: string;
  notes?: string;
  date: string;
  performedBy: string;
}

export interface RestaurantContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  creditLimit: number;
  outstandingBalance: number; // Total invoiced - total paid
  totalPurchases: number;     // Lifetime revenue from this restaurant
  totalPaid: number;          // Lifetime payments received
  profitGenerated: number;    // Net profit generated
  allocatedExpenses: number;  // Shared expenses allocated to this restaurant
  lastOrderDate?: string;
  averageOrderValue: number;
  orderCount: number;
  topProducts?: { productId: string; productName: string; quantity: number; unit: string }[];
  contacts?: RestaurantContact[];
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface Supplier {
  id: string;
  companyId?: string;
  code: string;                 // e.g. "0401010341"
  title: string;                // e.g. "ABDULLA AL KHATTAL GENERAL TRADING"
  accountTitle?: string;
  accountNumber?: string;
  name: string;                 // mapped to title for legacy compatibility
  supplierGroup?: string;       // e.g. "General Trading", "Foodstuff"
  mobile?: string;              // e.g. "0524491466"
  vatNumber?: string;           // VAT#
  ntnNumber?: string;           // NTN #
  bankName?: string;
  bankTitle?: string;
  bankAccountNo?: string;
  prefixTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | string;
  firstName?: string;
  lastName?: string;
  contactPerson: string;        // e.g. "Shan Martin", "Local"
  email?: string;
  telephones?: string;
  phone: string;                // compatibility
  city?: string;                // e.g. "Sharjah"
  address: string;              // e.g. "Sharjah Saja"
  cnic?: string;                // CNIC
  status: 'ACTIVE' | 'INACTIVE'; // switch unswitch activation
  payableToSupplier: number;    // amount e.g. 15681.46
  payableType?: 'CR' | 'DR';    // CR or DR (default CR)
  documents?: { id: string; name: string; date: string; url?: string; size?: string }[];
  categories?: string[];
  totalPurchases?: number;
  balanceOwed?: number;         // same as payableToSupplier
  productsSuppliedCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Delivered'
  | 'Partially Paid'
  | 'Paid'
  | 'Cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType | string;
  unitPrice: number;        // Selling price
  purchaseCost: number;     // Actual cost per unit at order time
  subtotal: number;         // quantity * unitPrice
  totalCost: number;        // quantity * purchaseCost
  grossProfit: number;      // subtotal - totalCost
  shortageQuantity?: number; // Quantity short at time of order
  deductedQuantity?: number; // Quantity actually deducted from physical stock
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  allocatedExpenseAmount: number; // e.g., allocated petrol/packaging for this delivery
  grossProfit: number;            // Total items grossProfit - discount
  netProfit: number;              // grossProfit - allocatedExpenseAmount
  hasShortage?: boolean;          // True if order was booked with insufficient stock
  shortageAlertNote?: string;     // Summary of items short in stock
  inventoryDeducted: boolean;     // Prevents double-deduction
  source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online' | 'Other';

export interface Payment {
  id: string;
  paymentNumber: string;
  restaurantId: string;
  restaurantName: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  paymentDate: string;
  date?: string;
  status?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  recordedBy: string;
  source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr';
  createdAt: string;
}

export type ExpenseCategory =
  | 'Petrol'
  | 'Delivery'
  | 'Phone/Calling'
  | 'Salaries'
  | 'Packaging'
  | 'Electricity'
  | 'Warehouse'
  | 'Transportation'
  | 'Maintenance'
  | 'Miscellaneous'
  | 'Custom';

export type ExpenseScope = 'business_wide' | 'restaurant_specific' | 'order_specific';

export type ExpenseAllocationMethod =
  | 'equal'
  | 'distance'
  | 'order_value'
  | 'order_weight'
  | 'delivery_count'
  | 'manual';

export interface ExpenseAllocationItem {
  restaurantId: string;
  restaurantName: string;
  orderId?: string;
  amount: number;
  ratio: number;
  basisValue?: number; // e.g. distance in km or order value in PKR
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  scope: ExpenseScope;
  targetRestaurantId?: string;
  targetRestaurantName?: string;
  targetOrderId?: string;
  notes?: string;
  receiptImage?: string;
  allocationMethod?: ExpenseAllocationMethod;
  allocations?: ExpenseAllocationItem[];
  recordedBy: string;
  source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr';
  paymentMethod?: string;
  bankId?: string;
  bankTitle?: string;
  voucherId?: string;
  createdAt: string;
}

export interface ExpenseAccount {
  id: string;
  expenseType: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AppTheme = 'cream' | 'pearl' | 'sand' | 'dark' | 'dark_blue' | 'light_blue';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'Order' | 'Inventory' | 'Product' | 'Payment' | 'Expense' | 'Restaurant' | 'Supplier' | 'Purchase' | 'System' | 'User' | 'BusinessSummary';
  entityId?: string;
  previousValue?: string;
  newValue?: string;
  source: 'manual' | 'ai_chat' | 'voice' | 'image' | 'image_ocr';
  description: string;
}

export interface CompanyProfile {
  id: string;
  name: string;               // Company / Business name (e.g. "ZAHRAT AL FAJR FOODSTUFF TR L.L.C")
  tagline?: string;           // Optional tagline / subtitle
  ownerName: string;          // Business Owner / Proprietor Name
  phone: string;              // Official WhatsApp / Phone for customer receipts & ledger
  phone2?: string;            // Secondary contact phone
  email?: string;             // Business email
  address: string;            // Street / Market Address
  city: string;               // City (e.g. "Sharjah", "Dubai", "Lahore")
  businessType: string;       // e.g. "Wholesale Food & Grains", "Foodstuff Trading"
  ntn?: string;               // NTN / Sales Tax registration number
  trn?: string;               // TRN / VAT registration number
  poBox?: string;             // P.O. Box printed on the Tax Invoice letterhead
  nameAr?: string;            // Company name in Arabic for the bilingual Tax Invoice header
  bankAccountTitle?: string;  // Payee / A/C name printed under "Bank Details for Payment"
  bankName?: string;          // Bank name printed under "Bank Details for Payment"
  bankAccountNo?: string;     // Account number printed under "Bank Details for Payment"
  iban?: string;              // IBAN printed under "Bank Details for Payment"
  logo?: string;              // Company Logo (base64 data URL or image path)
  currency: string;           // Default "PKR" (Symbol "Rs.")
  isRegistered: boolean;      // true once company registration is complete
  registeredAt: string;       // ISO date timestamp
  notes?: string;
}

/**
 * TIJORI / GALLA (CASH & BANK) REGISTER
 * Stores the opening balances used by the AI Ledger Master Audit Report
 * to reconcile physical Cash In Hand at the end of every business day.
 */
export interface CashRegister {
  openingCashBalance: number;   // Cash B/F before the first tracked business day
  openingBankBalance: number;   // Bank balance before the first tracked business day
  closingTime: string;          // e.g. "10:00 PM" printed on the Master Audit header
  updatedAt?: string;
}

export interface Employee {
  id: string;
  code: string;               // e.g. "0401040002"
  salesmanAcc?: string;       // e.g. "0101100009"
  accountTitle: string;       // e.g. "Akbar Bhai"
  prefixTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | string;
  firstName: string;
  lastName: string;
  fullName: string;           // e.g. "Akbar Bhai"
  designation: string;        // e.g. "Salesman", "Accountant", "CEO", "Driver", "Packing Officer"
  salaryType: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY' | string;
  salary: number;             // Amount e.g. 3000.00
  commissionAmount?: number;  // Commission e.g. 0.00
  email?: string;
  contactNo: string;          // Mobile phone
  telephones?: string;
  address?: string;
  city?: string;
  bankTitle?: string;
  bankAccount?: string;
  image?: string;
  regDate: string;            // e.g. "21-09-2026"
  status: 'YES' | 'NO' | 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseSnapshot {
  restaurants: Restaurant[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  suppliers?: Supplier[];
  auditLogs: AuditLog[];
  users: User[];
  companyProfile?: CompanyProfile | null;
  employees?: Employee[];
  businessSummary?: any;
}

export interface BusinessSummary {
  todayRevenue: number;
  todayGrossProfit: number;
  todayNetProfit: number;
  todayExpenses: number;
  todayOrdersCount: number;
  todayRestaurantsServed: number;
  outstandingPaymentsTotal: number;
  inventoryTotalValue: number;
  lowStockItemsCount: number;
  topRestaurantToday?: { name: string; profit: number };
  highestExpenseToday?: { category: string; amount: number };
}

export interface SmartAlert {
  id: string;
  type:
    | 'low_inventory'
    | 'critical_stock'
    | 'unpaid_invoice'
    | 'credit_limit_exceeded'
    | 'falling_margin'
    | 'rising_cost'
    | 'unusual_expense'
    | 'loss_making_item';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  actionableText?: string;
  timestamp: string;
}

export interface ExtractedDocumentItem {
  id: string;
  name: string;
  category?: ProductCategory;
  quantity: number;
  unit: UnitType;
  price?: number;
  purchaseCost?: number;
  confidence: number; // 0 to 1
  needsConfirmation: boolean;
  status: 'valid' | 'warning' | 'error';
  ctn?: number;
  ratePerCtn?: number;
  qtyPerCtn?: number;
  mcode?: string;
  discount?: number;
  vatPercent?: number;
  totalAmount?: number;
  salePrice?: number;
}

export interface ExtractedDocumentData {
  documentType: 'purchase_invoice' | 'restaurant_order' | 'inventory_sheet' | 'expense_receipt' | 'payment_receipt' | 'handwritten_note' | 'sales_invoice';
  rawText?: string;
  partyName?: string;
  supplierName?: string;
  restaurantName?: string;
  customerName?: string;
  customerCode?: string;
  customerAccountCode?: string;
  salesmanName?: string;
  date?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  previousBalance?: number;
  previousPayable?: number;
  previousReceivable?: number;
  loadExp?: number;
  isLoadExpDeduction?: boolean;
  discountTotal?: number;
  vatTotal?: number;
  isCash?: boolean;
  paidAmount?: number;
  receiptSubtype?: 'expense' | 'customer_payment';
  expenseCategory?: string;
  vehicleNo?: string;
  paymentMethod?: string;
  items: ExtractedDocumentItem[];
  confidenceSummary: {
    totalItems: number;
    highConfidence: number;
    needsReview: number;
  };
  notes?: string;
  unclearFields?: string[];
}

export interface AIActionConfirmation {
  id: string;
  type: 'delete_order' | 'delete_inventory' | 'cancel_order' | 'modify_financial_record' | 'bulk_inventory_adjustment' | 'credit_override';
  title: string;
  description: string;
  data: Record<string, unknown>;
  severity: 'danger' | 'warning';
}

export interface RestaurantProfitReport {
  restaurantId: string;
  restaurantName: string;
  totalOrders: number;
  totalRevenue: number;
  totalCostOfGoods: number;
  grossProfit: number;
  grossMarginPct: number;
  directExpenses: number; // petrol, calling, delivery
  netProfit: number; // grossProfit - directExpenses (negative = LOSS)
  isProfit: boolean;
  totalPaid: number;
  balanceDue: number; // kitne reh gaye
  actionRecommendation: string;
}

export interface BusinessProfitDiagnosis {
  totalRevenue: number;
  totalCostOfGoods: number;
  grossProfit: number;
  totalExpenses: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  netMarginPct: number;
  totalOutstandingReceivables: number;
  restaurantReports: RestaurantProfitReport[];
  criticalIssues: string[];
  actionPlan: string[];
}

export interface Customer {
  id: string;
  companyId?: string;
  code: string;                 // A/C Code e.g. "0101040001" or "0101040087"
  accountCode?: string;         // compatibility
  manualCode?: string;          // C.CODE / M.CODE (User defined code)
  accountTitle: string;         // e.g. "dar alzubair rest"
  name: string;                 // mapped to accountTitle
  title?: string;               // compatibility
  customerGroup?: string;       // e.g. "Restaurants", "Cafeteria", "General"
  regDate?: string;             // e.g. "21-09-2026" or "18/04/2026"
  ntn?: string;
  trn?: string;
  cnic?: string;
  prefixTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  contactPerson?: string;
  mobile: string;               // e.g. "971528000000" or "0528000000"
  mobile2?: string;
  email?: string;
  telephones?: string;
  sector?: string;
  area?: string;
  zone?: string;
  city?: string;                // e.g. "Sharjah", "Dubai", "Lahore"
  country?: string;
  address?: string;
  location?: string;
  notes?: string;
  image?: string;
  assignedSalesman?: string;    // Handling Salesman name
  status: 'ACTIVE' | 'INACTIVE';
  outstandingBalance: number;   // Current balance receivable
  creditLimit?: number;
  totalSales?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleBillItem {
  id: string;
  productId?: string;
  itemTitle: string;
  category?: string;
  mcode?: string;
  packageType?: string;           // Carton, Bag, Box, Tin, Pack
  ctn: number;
  ratePerCtn: number;
  qtyPerCtn: number;
  qty: number;
  rate: number;
  discount: number;
  vatPercent: number;
  vatAmount: number;
  amount: number;
  stock?: number;
  remainingStock?: number;        // Stock after sale deduction
  unit?: string;              // Packing unit printed on Tax Invoice (BAG / TIN / CTN)
}

export interface SaleBill {
  id: string;
  billNumber: string;             // e.g. "6762"
  lpoNo?: string;                 // Customer Purchase Order / L.P.O No printed on Tax Invoice
  date: string;                   // e.g. "21-09-2026"
  customerId: string;             // Account / Customer ID
  customerAccountTitle: string;   // Account Name e.g. "SHAROOQ AL FAJAR"
  customerName?: string;
  customerMobile?: string;
  customerTrn?: string;           // Customer TRN / Tax Registration Number
  salesmanId?: string;            // Employee ID
  salesmanName?: string;          // e.g. "HAFIZ ABDUL QADEER"
  user?: string;                  // Creator e.g. "Aman Deep"
  partyBalanceBefore?: number;    // Party Bal prior to bill
  paymentType: 'Account' | 'Cash' | 'Card';
  discountType: 'Percentage' | 'Amount';
  items: SaleBillItem[];
  totalCtn: number;
  totalQty: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  totalDiscount: number;
  totalVatAmount: number;
  grossAmount: number;
  netTotal: number;
  totalAmount?: number;
  cashReceived: number;
  balanceReceivable: number;
  changeGiven: number;
  balanceRecovered: boolean;
  balanceRecoveredAmount: number;
  amountReceivable: number;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  createdAt: string;
  updatedAt?: string;
}

export interface SaleReport {
  totalBillsCount: number;
  totalCtn: number;
  totalQty: number;
  totalGrossAmount: number;
  totalDiscount: number;
  totalVatAmount: number;
  totalNetSales: number;
  totalCashReceived: number;
  totalBalanceReceivable: number;
  bills: SaleBill[];
}

// -------------------------------------------------------------
// PROFIT REPORT BREAKDOWN INTERFACES (Per Item, Bill, Restaurant, Salesman)
// -------------------------------------------------------------
export interface ItemProfitReportItem {
  productId?: string;
  mcode: string;
  itemTitle: string;
  category: string;
  qtySold: number;
  ctnSold: number;
  avgPurchaseRate: number;
  avgSaleRate: number;
  totalRevenue: number;
  totalCostOfGoods: number;
  grossProfit: number;
  profitMarginPct: number;
  currentRemainingStock: number;
  currentStockCartons: number;
  status: 'PROFITABLE' | 'LOW_MARGIN' | 'LOSS';
}

export interface BillProfitReportItem {
  billId: string;
  billNumber: string;
  date: string;
  customerId: string;
  customerAccountTitle: string;
  salesmanName: string;
  itemsCount: number;
  totalCtn: number;
  totalQty: number;
  grossAmount: number;
  billDiscount: number;
  vatAmount: number;
  netTotal: number;
  costOfGoods: number;
  grossProfit: number;
  netProfit: number;
  profitMarginPct: number;
  items: SaleBillItem[];
}

export interface RestaurantCustomerProfitReportItem {
  customerId: string;
  code?: string;
  accountTitle: string;
  customerGroup: string;
  city: string;
  mobile: string;
  billsCount: number;
  totalCtn: number;
  totalQty: number;
  totalSalesVolume: number;
  totalCostOfGoods: number;
  grossProfit: number;
  profitMarginPct: number;
  outstandingBalance: number;
  status: 'HEALTHY' | 'LOSS' | 'PENDING_COLLECTION';
}

export interface SalesmanCustomerDetail {
  customerTitle: string;
  billsCount: number;
  totalSales: number;
  profit: number;
}

export interface SalesmanProfitReportItem {
  salesmanId?: string;
  salesmanName: string;
  designation?: string;
  contactNo?: string;
  billsCount: number;
  totalCtnSold: number;
  totalQtySold: number;
  totalSalesVolume: number;
  totalCostOfGoods: number;
  totalProfit: number;
  profitMarginPct: number;
  customersHandledCount: number;
  customersList?: SalesmanCustomerDetail[];
}

export interface ComprehensiveProfitReport {
  summary: {
    totalSalesVolume: number;
    totalSalesBeforeTax: number;
    totalSalesTaxCollected: number;
    totalCostOfGoods: number;
    totalInputTaxPaid: number;
    totalCostWithTax: number;
    totalGrossProfit: number;
    profitWithoutTax: number;
    profitWithTax: number;
    netVatPayable: number;
    totalDiscountsGiven: number;
    totalNetProfit: number;
    overallMarginPct: number;
    totalBillsCount: number;
    totalQtySold: number;
    totalCtnSold: number;
  };
  perItem: ItemProfitReportItem[];
  perBill: BillProfitReportItem[];
  perRestaurant: RestaurantCustomerProfitReportItem[];
  perSalesman: SalesmanProfitReportItem[];
}

// -------------------------------------------------------------
// STOCK MOVEMENT & INVENTORY AUDIT LEDGER (Day-wise / Week-wise)
// -------------------------------------------------------------
export interface StockMovementLedgerEntry {
  id: string;
  timestamp: string;
  date: string;
  productId: string;
  productName: string;
  mcode: string;
  category: string;
  movementType: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
  referenceId: string;
  referenceLabel: string; // e.g. "Sale Bill #6762" or "Purchase Bill #1713"
  partyName: string;      // Customer Name or Supplier Name
  salesmanOrUser: string; // Salesman name or Performed by
  cartonsChange: number;  // negative for sales, positive for purchases
  quantityChange: number; // negative for sales, positive for purchases
  unitRate: number;
  totalAmount: number;
  runningStockAfter: number;
  notes?: string;
}

export interface StockMovementSummaryItem {
  productId: string;
  mcode: string;
  name: string;
  category: string;
  packageType?: string;
  unit: string;
  qtyInCarton: number;
  openingStock: number;
  stockInPurchases: number;
  stockOutSales: number;
  closingStock: number;
  closingStockCartons: number;
  purchasePrice: number;
  sellingPrice: number;
  totalStockValue: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface StockMovementReport {
  timeframe: 'day' | 'week' | 'month' | 'custom';
  fromDate: string;
  toDate: string;
  totalOpeningUnits: number;
  totalInwardUnits: number;
  totalOutwardUnits: number;
  totalClosingUnits: number;
  totalStockValue: number;
  itemsSummary: StockMovementSummaryItem[];
  ledgerTransactions: StockMovementLedgerEntry[];
}

// -------------------------------------------------------------
// AI LEDGER MASTER BUSINESS AUDIT REPORT (Single Page Print/PDF)
// Every figure below is calculated from the live system ledger.
// -------------------------------------------------------------
export interface AiLedgerAuditCompany {
  name: string;
  tagline: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  businessType: string;
  ntn: string;
  trn: string;
  logo: string;
  initial: string;
}

export interface AiLedgerAuditSalesmanKhata {
  name: string;
  route: string;
  opening: number;      // Udhaar khata balance before the audit date
  todaySold: number;    // Net sales billed on the audit date
  closing: number;      // Udhaar khata balance after the audit date
}

export interface AiLedgerAuditSalesmanProfit {
  name: string;
  todaySales: number;
  marginPct: number;
  netProfit: number;
}

export interface AiLedgerAuditCashRow {
  label: string;
  value: number;
  tag: string;
  direction: 'in' | 'out' | 'memo' | 'neutral';
}

export interface AiLedgerAuditReturnsSummary {
  saleReturnsToday: number;
  saleReturnsMonth: number;
  saleReturnsTotal: number;
  saleReturnsTodayCount: number;
  saleReturnsMonthCount: number;
  saleReturnsTotalCount: number;
  saleReturnsCashTotal: number;
  saleReturnsCreditTotal: number;

  purchaseReturnsToday: number;
  purchaseReturnsMonth: number;
  purchaseReturnsTotal: number;
  purchaseReturnsTodayCount: number;
  purchaseReturnsMonthCount: number;
  purchaseReturnsTotalCount: number;
  purchaseReturnsCashTotal: number;
  purchaseReturnsCreditTotal: number;
}

export interface AiLedgerAuditReport {
  success: boolean;
  fileName: string;
  reportDate: string;             // YYYY-MM-DD (audit date)
  dateLabel: string;              // e.g. 28-Sep-2026
  generatedAt: string;
  closingTime: string;
  currency: string;               // from CompanyProfile.currency e.g. AED / PKR
  currencySymbol: string;         // e.g. AED or Rs.
  company: AiLedgerAuditCompany;
  strip: {
    todayRevenue: number;
    netProfit: number;
    netMarginPct: number;
    receivables: number;
    warehouseStock: number;
    todaySaleReturns?: number;
    todayPurchaseReturns?: number;
    totalSaleReturns?: number;
    totalPurchaseReturns?: number;
  };
  salesCard: {
    monthSales: number;
    todaySales: number;
    totalSales: number;
    grossSalesToday?: number;
    grossSalesMonth?: number;
    grossSalesTotal?: number;
    saleReturnsToday?: number;
    saleReturnsMonth?: number;
    saleReturnsTotal?: number;
    saleReturnsCount?: number;
  };
  purchaseCard: {
    monthPurchases: number;
    todayPurchases: number;
    totalPurchases: number;
    grossPurchasesToday?: number;
    grossPurchasesMonth?: number;
    grossPurchasesTotal?: number;
    purchaseReturnsToday?: number;
    purchaseReturnsMonth?: number;
    purchaseReturnsTotal?: number;
    purchaseReturnsCount?: number;
  };
  returnsSummary?: AiLedgerAuditReturnsSummary;
  khataCard: { receivable: number; payable: number; netBalance: number };
  stockCard: {
    unitLabel: string;
    openingUnits: number;
    stockIn: number;
    stockOut: number;
    closingUnits: number;
  };
  salesmanKhata: AiLedgerAuditSalesmanKhata[];
  salesmanProfit: AiLedgerAuditSalesmanProfit[];
  totalSalesmenProfit: number;
  cash: {
    inflows: AiLedgerAuditCashRow[];
    bankRows: AiLedgerAuditCashRow[];
    openingBalance: number;
    todayNet: number;
    cashInHand: number;
  };
  worth: {
    stockValue: number;
    stockUnitCaption: string;
    udhaar: number;
    payable: number;
    fixExpense: number;
    total: number;
  };
}

// -------------------------------------------------------------
// CASH & BANK MANAGEMENT, VOUCHERS AND ACCOUNTS
// -------------------------------------------------------------
export type VoucherType = 'BR' | 'BP' | 'CR' | 'CP' | 'CB' | 'JV';

export interface BankAccount {
  id: string;
  companyId?: string;
  accountCode: string;
  bankTitle: string;
  bankType: string;
  description: string;
  balance: number;
  balanceType: 'DR' | 'CR';
  createdAt?: string;
  updatedAt?: string;
}

export interface CashAccount {
  id: string;
  companyId?: string;
  accountCode: string;
  title: string;
  balance: number;
  balanceType: 'DR' | 'CR';
  createdAt?: string;
  updatedAt?: string;
}

export interface GlAccountOption {
  id: string;
  code: string;
  title: string;
  type: 'Customer' | 'Supplier' | 'Bank' | 'Cash' | 'Expense' | 'General';
  balance: number;
  balanceType: 'DR' | 'CR';
  balanceFormatted: string; // e.g. "148.61 DR"
}

export interface VoucherEntry {
  id: string;
  accountId: string;
  accountCode: string;
  accountTitle: string;
  accountType?: 'Customer' | 'Supplier' | 'Bank' | 'Cash' | 'Expense' | 'General';
  chequeNo?: string;
  chequeDate?: string;
  chequeBank?: string;
  narration: string;
  amount: number;
  debit?: number;
  credit?: number;
  receipt?: number;
  payment?: number;
}

export interface Voucher {
  id: string;
  companyId?: string;
  voucherType: VoucherType;
  jvNumber: number;
  voucherNumber: number;
  voucherNumberFormatted: string;
  date: string; // DD-MM-YYYY or YYYY-MM-DD
  poNumber?: string;
  bankAccountId?: string;
  bankAccountTitle?: string;
  cashAccountId?: string;
  cashAccountTitle?: string;
  salesmanId?: string;
  salesmanTitle?: string;
  totalAmount: number;
  entries: VoucherEntry[];
  status: 'POSTED' | 'DRAFT';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherFilterParams {
  voucherType?: string;
  fromDate?: string;
  toDate?: string;
  fromJv?: number | string;
  toJv?: number | string;
  search?: string;
}

export interface CashRecoveredReportItem {
  srNo: number;
  voucherId: string;
  voucherType: VoucherType;
  voucherNumberFormatted: string;
  jvNumber: number;
  date: string;
  accountCode: string;
  accountTitle: string;
  paymentMode: string;
  narration: string;
  amount: number;
}

export interface CashPaidReportItem {
  srNo: number;
  voucherId: string;
  voucherType: VoucherType;
  voucherNumberFormatted: string;
  jvNumber: number;
  date: string;
  accountCode: string;
  accountTitle: string;
  paymentMode: string;
  narration: string;
  amount: number;
  category?: 'Supplier' | 'Expense' | 'Other';
}

export interface NextVoucherNumbers {
  jvNumber: number;
  voucherNumbers: {
    BR: number;
    BP: number;
    CR: number;
    CP: number;
    CB: number;
    JV: number;
  };
}

// -------------------------------------------------------------
// CUSTOMER GENERAL LEDGER REPORTING
// -------------------------------------------------------------
export interface CustomerLedgerEntry {
  id: string;
  refType: 'SV#' | 'CR#' | 'BR#' | 'CB#' | 'SR#' | 'JV#' | 'OB';
  refNumber: string | number;
  date: string;
  billNumber?: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'DR' | 'CR';
  entityId?: string;
  entityType?: 'saleBill' | 'voucher' | 'saleReturn' | 'payment';
  customerName?: string;
  customerAccountTitle?: string;
}

export interface CustomerLedgerReport {
  customerId: string;
  customerCode: string;
  customerName: string;
  accountTitle: string;
  phone?: string;
  address?: string;
  fromDate: string;
  toDate: string;
  generatedDate: string;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  closingBalance: number;
  closingBalanceType: 'DR' | 'CR';
  totalDebit: number;
  totalCredit: number;
  entries: CustomerLedgerEntry[];
}

// -------------------------------------------------------------
// SALES RETURN & PURCHASE RETURN
// -------------------------------------------------------------
export interface SaleReturnItem {
  id: string;
  productId: string;
  itemTitle: string;
  sku?: string;
  category?: string;
  unit?: string;
  ctn?: number;
  ratePerCtn?: number;
  qtyPerCtn?: number;
  qty: number;
  rate: number;
  disc?: number;
  vatPct?: number;
  vatAmt?: number;
  total: number;
  stock?: number;
  reason?: string;
}

export interface SaleReturn {
  id: string;
  companyId?: string;
  returnNumber: string; // e.g. "208" or "SR-208"
  returnNumberFormatted: string; // e.g. "SR-208"
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  customerAccountTitle: string;
  customerCode?: string;
  originalBillNumber?: string;
  salesmanName?: string;
  isCash?: boolean;
  items: SaleReturnItem[];
  discount?: number;
  totalAmount: number;
  netTotal: number;
  reason?: string;
  status: 'COMPLETED' | 'CANCELLED';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseReturnItem {
  id: string;
  productId: string;
  itemTitle: string;
  sku?: string;
  category?: string;
  unit?: string;
  ctn?: number;
  ratePerCtn?: number;
  qtyPerCtn?: number;
  qty: number;
  rate: number;
  disc?: number;
  vatPct?: number;
  vatAmt?: number;
  total: number;
  stock?: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: string;
  companyId?: string;
  returnNumber: string; // e.g. "12" or "PR-12"
  returnNumberFormatted: string; // e.g. "PR-12"
  date: string; // YYYY-MM-DD
  supplierId: string;
  supplierName: string;
  supplierAccountTitle: string;
  supplierCode?: string;
  originalBillNumber?: string;
  isCash?: boolean;
  items: PurchaseReturnItem[];
  discount?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalAmount: number;
  netTotal: number;
  reason?: string;
  status: 'COMPLETED' | 'CANCELLED';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

