import { db } from './db.js';
import {
  AiLedgerAuditCashRow,
  AiLedgerAuditCompany,
  AiLedgerAuditReport,
  AiLedgerAuditReturnsSummary,
  AiLedgerAuditSalesmanKhata,
  AiLedgerAuditSalesmanProfit,
  AiLedgerAuditSaleBillProfit,
  Customer,
  Expense,
  Payment,
  Product,
  PurchaseBill,
  SaleBill,
  Voucher,
  SaleReturn,
  PurchaseReturn,
} from '../src/types';

/**
 * AI LEDGER MASTER BUSINESS AUDIT REPORT - LEDGER ENGINE
 * ------------------------------------------------------
 * Calculates every single figure printed on the one-page
 * "AI Ledger Master Business Audit Report" straight from the
 * live system ledger:
 *
 *   Sale Bills, Purchase Bills, Orders, Payments, Expenses,
 *   Customers (Udhaar), Suppliers (Payable), Products (Stock),
 *   Stock Movement and the Tijori / Cash & Bank Register.
 *
 * Nothing on the report is hard-coded or manually typed.
 */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BANK_IN_METHODS = ['Bank Transfer', 'Online', 'Cheque'];

// -------------------------------------------------------------
// DATE HELPERS
// -------------------------------------------------------------
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayYmd(): string {
  return toYmd(new Date());
}

export function labelDate(ymd: string): string {
  const parts = (ymd || '').split('-');
  const monthIdx = Math.max(0, Math.min(11, (Number(parts[1]) || 1) - 1));
  return `${parts[2]}-${MONTH_LABELS[monthIdx]}-${parts[0]}`;
}

// -------------------------------------------------------------
// NUMBER FORMATTING (never rounds money away)
// -------------------------------------------------------------
export function num(value: number): string {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  const isWhole = Math.abs(rounded % 1) < 0.005;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function pct(value: number): string {
  return `${(Math.round((Number(value) || 0) * 10) / 10).toFixed(1)}%`;
}

export function signedNum(value: number, symbol: string, direction: 'in' | 'out' | 'memo' | 'neutral'): string {
  const amount = Math.abs(Math.round((Number(value) || 0) * 100) / 100);
  if (direction === 'in') return `+ ${symbol} ${num(amount)}`;
  if (direction === 'out') return `\u2212 ${symbol} ${num(amount)}`;
  return `${symbol} ${num(amount)}`;
}

export function currencySymbolOf(currency: string): string {
  const code = (currency || 'PKR').trim().toUpperCase();
  return code === 'PKR' || code === 'RS' ? 'Rs.' : code;
}

// -------------------------------------------------------------
// COST OF GOODS (identical deterministic engine as Profit Report)
// -------------------------------------------------------------
function buildCostLookup(products: Product[]) {
  const map = new Map<string, { unitCost: number; ctnCost: number; qtyInCarton: number }>();
  for (const p of products) {
    const unitCost = p.purchasePrice || p.averagePurchaseCost || p.lastPurchasePrice || (p.sellingPrice ? p.sellingPrice * 0.75 : 0) || 0;
    const qtyInCarton = p.qtyInCarton && p.qtyInCarton > 1 ? p.qtyInCarton : 1;
    const ctnCost = (p.ctnPurchaseRate && p.ctnPurchaseRate > 0) ? p.ctnPurchaseRate : ((p as any).ctnPrice || (unitCost * qtyInCarton));
    const obj = { unitCost, ctnCost, qtyInCarton };
    if (p.id) map.set(p.id, obj);
    if (p.name) map.set(p.name.toLowerCase().trim(), obj);
    if (p.itemTitle) map.set(p.itemTitle.toLowerCase().trim(), obj);
    if (p.mcode) map.set(p.mcode.toLowerCase().trim(), obj);
    if (p.sku) map.set(p.sku.toLowerCase().trim(), obj);
  }
  return {
    costOf(items: { productId?: string; itemTitle?: string; mcode?: string; qty: number; rate: number; ctn?: number; ratePerCtn?: number }[]): number {
      let total = 0;
      for (const it of items) {
        let entry: { unitCost: number; ctnCost: number; qtyInCarton: number } | undefined;
        if (it.productId) entry = map.get(it.productId);
        if (entry === undefined && it.itemTitle) entry = map.get(it.itemTitle.toLowerCase().trim());
        if (entry === undefined && it.mcode) entry = map.get(it.mcode.toLowerCase().trim());

        const unitCost = entry ? entry.unitCost : (it.rate > 0 ? it.rate * 0.75 : 0);
        const qtyInCarton = entry ? entry.qtyInCarton : 1;
        const ctnCost = entry ? entry.ctnCost : (unitCost * qtyInCarton);

        const ctn = Number(it.ctn) || 0;
        const qty = Number(it.qty) || 0;

        if (ctn > 0 && qty === 0) {
          total += ctn * ctnCost;
        } else if (ctn > 0 && qty > 0) {
          total += (ctn * ctnCost) + (qty * unitCost);
        } else {
          total += qty * unitCost;
        }
      }
      return total;
    },
  };
}

// -------------------------------------------------------------
// CASH / BANK MOVEMENT BUILDING BLOCKS
// -------------------------------------------------------------
interface LedgerContext {
  saleBills: SaleBill[];
  purchaseBills: PurchaseBill[];
  saleReturns: SaleReturn[];
  purchaseReturns: PurchaseReturn[];
  expenses: Expense[];
  payments: Payment[];
  vouchers: Voucher[];
  openingCashBalance: number;
}

function saleCreditAdded(bill: SaleBill): number {
  if (bill.paymentType !== 'Account') return 0;
  return Math.max(0, Number(bill.balanceReceivable) || 0);
}

function saleCashKept(bill: SaleBill): number {
  const received = Math.max(0, Number(bill.cashReceived) || 0);
  const change = Math.max(0, Number(bill.changeGiven) || 0);
  const kept = received - change;
  const billCash = Math.max(0, (Number(bill.netTotal) || 0) - (Number(bill.balanceReceivable) || 0));
  const recovered = bill.balanceRecovered ? Math.max(0, Number(bill.balanceRecoveredAmount) || 0) : 0;
  if (kept > 0) return Math.max(kept, billCash + recovered);
  return billCash + recovered;
}

function cashMovementOn(ctx: LedgerContext, date: string): { cashIn: number; cashOut: number } {
  let cashIn = 0;
  let cashOut = 0;

  for (const bill of ctx.saleBills) {
    if (db.normalizeDateToYMD(bill.date) === date) cashIn += saleCashKept(bill);
  }
  for (const payment of ctx.payments) {
    if (db.normalizeDateToYMD(payment.paymentDate) !== date) continue;
    if ((payment.paymentMethod || 'Cash') !== 'Cash') continue;
    if (payment.orderId && ctx.saleBills.some((b) => (b.id === payment.orderId || b.billNumber === payment.orderNumber) && Number(b.cashReceived) > 0)) continue;
    cashIn += Number(payment.amount) || 0;
  }
  for (const v of (ctx.vouchers || [])) {
    if (v.status !== 'POSTED') continue;
    if (db.normalizeDateToYMD(v.date) !== date) continue;
    if (v.voucherType === 'CR') {
      cashIn += Number(v.totalAmount) || 0;
    } else if (v.voucherType === 'CB' && Array.isArray(v.entries)) {
      cashIn += v.entries.reduce((acc, e) => acc + (Number(e?.receipt) || 0), 0);
    }
  }
  // Purchase returns in cash: supplier gave cash back to company (+ Cash In)
  for (const ret of (ctx.purchaseReturns || [])) {
    if (db.normalizeDateToYMD(ret.date) !== date) continue;
    if (ret.isCash) cashIn += Number(ret.netTotal) || 0;
  }

  for (const bill of ctx.purchaseBills) {
    if (db.normalizeDateToYMD(bill.date) !== date) continue;
    const hasVoucher = (ctx.vouchers || []).some(
      (v) => (v.status === 'POSTED' && v.voucherType === 'CP') &&
             (((v as any).referenceNumber && (v as any).referenceNumber === bill.billNumber) ||
              (v.entries || []).some((e) => e.narration?.includes(bill.billNumber)))
    );
    if (hasVoucher) continue;
    const paidCash = bill.isCash ? (Number(bill.paidAmount) || Number(bill.netTotal) || 0) : (Number(bill.paidAmount) || 0);
    cashOut += paidCash;
  }
  for (const expense of ctx.expenses) {
    if (db.normalizeDateToYMD(expense.date) !== date) continue;
    if (expense.voucherId || (expense.id && expense.id.startsWith('exp-vch-'))) continue;
    const pm = (expense.paymentMethod || 'Cash').toLowerCase();
    if (!pm.includes('bank') && !pm.includes('cheque') && !pm.includes('transfer')) {
      cashOut += Number(expense.amount) || 0;
    }
  }
  for (const v of (ctx.vouchers || [])) {
    if (v.status !== 'POSTED') continue;
    if (db.normalizeDateToYMD(v.date) !== date) continue;
    if (v.voucherType === 'CP') {
      cashOut += Number(v.totalAmount) || 0;
    } else if (v.voucherType === 'CB' && Array.isArray(v.entries)) {
      cashOut += v.entries.reduce((acc, e) => acc + (Number(e?.payment) || 0), 0);
    }
  }
  // Sale returns in cash: customer was refunded cash (- Cash Out)
  for (const ret of (ctx.saleReturns || [])) {
    if (db.normalizeDateToYMD(ret.date) !== date) continue;
    if (ret.isCash) cashOut += Number(ret.netTotal) || 0;
  }

  return { cashIn, cashOut };
}

function bankMovementOn(ctx: LedgerContext, date: string): { bankIn: number; bankOut: number } {
  let bankIn = 0;
  let bankOut = 0;

  for (const payment of ctx.payments) {
    if (db.normalizeDateToYMD(payment.paymentDate) !== date) continue;
    if (BANK_IN_METHODS.includes(payment.paymentMethod || '')) bankIn += Number(payment.amount) || 0;
  }
  for (const v of (ctx.vouchers || [])) {
    if (v.status !== 'POSTED') continue;
    if (db.normalizeDateToYMD(v.date) !== date) continue;
    if (v.voucherType === 'BR') {
      bankIn += Number(v.totalAmount) || 0;
    }
  }

  for (const bill of ctx.purchaseBills) {
    if (db.normalizeDateToYMD(bill.date) !== date) continue;
    if (!bill.isCash) bankOut += Number(bill.paidAmount) || 0;
  }
  for (const expense of ctx.expenses) {
    if (db.normalizeDateToYMD(expense.date) !== date) continue;
    if (expense.voucherId || (expense.id && expense.id.startsWith('exp-vch-'))) continue;
    const pm = (expense.paymentMethod || 'Cash').toLowerCase();
    if (pm.includes('bank') || pm.includes('cheque') || pm.includes('transfer')) {
      bankOut += Number(expense.amount) || 0;
    }
  }
  for (const v of (ctx.vouchers || [])) {
    if (v.status !== 'POSTED') continue;
    if (db.normalizeDateToYMD(v.date) !== date) continue;
    if (v.voucherType === 'BP') {
      bankOut += Number(v.totalAmount) || 0;
    }
  }

  return { bankIn, bankOut };
}

function cashBalanceBefore(ctx: LedgerContext, date: string): number {
  const dates = new Set<string>();
  for (const bill of ctx.saleBills) dates.add(db.normalizeDateToYMD(bill.date));
  for (const bill of ctx.purchaseBills) dates.add(db.normalizeDateToYMD(bill.date));
  for (const ret of (ctx.saleReturns || [])) dates.add(db.normalizeDateToYMD(ret.date));
  for (const ret of (ctx.purchaseReturns || [])) dates.add(db.normalizeDateToYMD(ret.date));
  for (const expense of ctx.expenses) dates.add(db.normalizeDateToYMD(expense.date));
  for (const payment of ctx.payments) dates.add(db.normalizeDateToYMD(payment.paymentDate));
  for (const v of (ctx.vouchers || [])) if (v.date) dates.add(db.normalizeDateToYMD(v.date));

  let balance = Number(ctx.openingCashBalance) || 0;
  for (const d of Array.from(dates).sort()) {
    if (d >= date) continue;
    const move = cashMovementOn(ctx, d);
    balance += move.cashIn - move.cashOut;
  }
  return balance;
}

// -------------------------------------------------------------
// KHATA (RECEIVABLE / PAYABLE) AS OF THE AUDIT DATE
// -------------------------------------------------------------
function recoveriesMap(saleBills: SaleBill[], date: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const bill of saleBills) {
    if (db.normalizeDateToYMD(bill.date) > date) continue;
    if (!bill.balanceRecovered) continue;
    const amount = Number(bill.balanceRecoveredAmount) || 0;
    if (amount <= 0) continue;
    map.set(bill.customerId, (map.get(bill.customerId) || 0) + amount);
  }
  return map;
}

function customerBalanceAsOf(
  customer: Customer,
  saleBills: SaleBill[],
  date: string,
  recoveries: Map<string, number>,
  vouchers: Voucher[] = [],
  saleReturns: SaleReturn[] = []
): number {
  let balance = Number(customer.outstandingBalance) || 0;
  for (const bill of saleBills) {
    if (bill.customerId !== customer.id) continue;
    if (db.normalizeDateToYMD(bill.date) <= date) continue;
    balance -= saleCreditAdded(bill);
  }
  for (const sr of saleReturns) {
    if (sr.customerId !== customer.id && sr.customerCode !== customer.code) continue;
    if (db.normalizeDateToYMD(sr.date) <= date) continue;
    balance += Number(sr.netTotal) || 0;
  }
  for (const v of vouchers) {
    if (v.status !== 'POSTED') continue;
    if (db.normalizeDateToYMD(v.date) <= date) continue;
    if (v.voucherType === 'CR' || v.voucherType === 'BR' || v.voucherType === 'CB') {
      for (const e of (v.entries || [])) {
        if (
          e.accountId === customer.id ||
          (customer.code && e.accountCode === customer.code) ||
          (customer.accountTitle && e.accountTitle?.toLowerCase() === customer.accountTitle?.toLowerCase())
        ) {
          const amt = v.voucherType === 'CB' ? (Number(e.receipt) || 0) : (Number(e.amount) || 0);
          balance += amt;
        }
      }
    }
  }
  return balance - (recoveries.get(customer.id) || 0);
}

function receivableAsOf(
  customers: Customer[],
  saleBills: SaleBill[],
  date: string,
  recoveries: Map<string, number>,
  vouchers: Voucher[] = [],
  saleReturns: SaleReturn[] = []
): { total: number; customerAdvance: number } {
  let total = 0;
  let customerAdvance = 0;
  const known = new Set<string>();

  for (const customer of customers) {
    known.add(customer.id);
    const bal = customerBalanceAsOf(customer, saleBills, date, recoveries, vouchers, saleReturns);
    if (bal > 0) {
      total += bal;
    } else if (bal < 0) {
      customerAdvance += Math.abs(bal);
    }
  }

  // Credit portions booked against customers no longer in the master list
  for (const bill of saleBills) {
    if (db.normalizeDateToYMD(bill.date) > date) continue;
    if (!bill.customerId || known.has(bill.customerId)) continue;
    total += saleCreditAdded(bill);
  }

  return { total, customerAdvance };
}

function payableAsOf(
  suppliers: { id: string; code?: string; title?: string; payableToSupplier?: number }[],
  purchaseBills: PurchaseBill[],
  date: string,
  vouchers: Voucher[] = [],
  purchaseReturns: PurchaseReturn[] = []
): { total: number; supplierAdvance: number } {
  const supplierIds = new Set(suppliers.map((s) => s.id));
  let total = 0;
  let supplierAdvance = 0;

  for (const supplier of suppliers) {
    let payable = Number(supplier.payableToSupplier) || 0;
    for (const bill of purchaseBills) {
      if (bill.supplierId !== supplier.id) continue;
      if (db.normalizeDateToYMD(bill.date) <= date) continue;
      payable -= Number(bill.remainingBalance) || 0;
    }
    for (const pr of purchaseReturns) {
      if (pr.supplierId !== supplier.id && pr.supplierCode !== supplier.code) continue;
      if (db.normalizeDateToYMD(pr.date) <= date) continue;
      payable += Number(pr.netTotal) || 0;
    }
    for (const v of vouchers) {
      if (v.status !== 'POSTED') continue;
      if (db.normalizeDateToYMD(v.date) <= date) continue;
      if (v.voucherType === 'CP' || v.voucherType === 'BP' || v.voucherType === 'CB') {
        for (const e of (v.entries || [])) {
          if (
            e.accountId === supplier.id ||
            (supplier.code && e.accountCode === supplier.code) ||
            (supplier.title && e.accountTitle?.toLowerCase() === supplier.title?.toLowerCase())
          ) {
            const amt = v.voucherType === 'CB' ? (Number(e.payment) || 0) : (Number(e.amount) || 0);
            payable += amt;
          }
        }
      }
    }
    if (payable > 0) {
      total += payable;
    } else if (payable < 0) {
      supplierAdvance += Math.abs(payable);
    }
  }

  // Purchase bills booked against a supplier missing from the master list
  for (const bill of purchaseBills) {
    if (supplierIds.has(bill.supplierId)) continue;
    if (db.normalizeDateToYMD(bill.date) > date) continue;
    total += Math.max(0, Number(bill.remainingBalance) || 0);
  }

  return { total, supplierAdvance };
}

// -------------------------------------------------------------
// STOCK UNIT SHORT NAMES (BAG / TIN / CTN / BOX / KG ...)
// -------------------------------------------------------------
function shortUnit(unit: string): string {
  const upper = (unit || '').trim().toUpperCase();
  if (!upper) return 'UNIT';
  if (upper.includes('CARTON') || upper.includes('CTN')) return 'CTN';
  if (upper.includes('BAG') || upper.includes('BORI')) return 'BAG';
  if (upper.includes('BOX') || upper.includes('CASE')) return 'BOX';
  if (upper.includes('TIN') || upper.includes('CAN')) return 'TIN';
  if (upper.includes('KILO') || upper === 'KG') return 'KG';
  if (upper.includes('LITER') || upper === 'LTR') return 'LTR';
  if (upper.includes('PIECE') || upper === 'PCS') return 'PCS';
  if (upper.includes('BUNDLE') || upper.includes('BDL')) return 'BDL';
  if (upper.includes('GRAM')) return 'G';
  const first = upper.split(/[\s()]+/)[0];
  return (first || 'UNIT').slice(0, 4);
}

// -------------------------------------------------------------
// BILL ITEM -> PRODUCT MATCHING
// Bills sometimes carry legacy product ids (the product master was
// re-seeded), so we fall back to M-code, exact title, then a
// word-order-independent title match ("oil sindbaad" = "Sindbaad oil").
// -------------------------------------------------------------
function titleKey(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenKey(value: string): string {
  return titleKey(value)
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

function buildProductResolver(products: Product[]) {
  const byId = new Map<string, Product>();
  const byMcode = new Map<string, Product>();
  const byTitle = new Map<string, Product>();
  const byTokens = new Map<string, Product>();

  for (const p of products) {
    if (p.id) byId.set(p.id, p);
    if (p.mcode) byMcode.set(p.mcode.toLowerCase().trim(), p);
    for (const label of [p.name, p.itemTitle]) {
      if (!label) continue;
      const title = titleKey(label);
      if (title && !byTitle.has(title)) byTitle.set(title, p);
      const tokens = tokenKey(label);
      if (tokens && !byTokens.has(tokens)) byTokens.set(tokens, p);
    }
  }

  return function resolve(
    item: { productId?: string; mcode?: string; itemTitle?: string }
  ): Product | undefined {
    if (item.productId && byId.has(item.productId)) return byId.get(item.productId);
    if (item.mcode && byMcode.has(item.mcode.toLowerCase().trim())) return byMcode.get(item.mcode.toLowerCase().trim());
    if (item.itemTitle) {
      const title = titleKey(item.itemTitle);
      if (byTitle.has(title)) return byTitle.get(title);
      const tokens = tokenKey(item.itemTitle);
      if (byTokens.has(tokens)) return byTokens.get(tokens);
    }
    return undefined;
  };
}

// -------------------------------------------------------------
// MAIN REPORT BUILDER
// -------------------------------------------------------------
export function buildAiLedgerMasterAuditReport(requestedDate?: string): {
  success: boolean;
  error?: string;
  fileName: string;
  data?: AiLedgerAuditReport;
} {
  try {
    const today = todayYmd();

    const allSaleBills = (db.getSaleBills() || []).filter(
      (b) =>
        b &&
        b.status !== 'Cancelled' &&
        (b as any).status !== 'CANCELLED' &&
        (b as any).status !== 'Deleted' &&
        (b as any).status !== 'DELETED' &&
        !(b as any).isDeleted
    );
    const purchaseBills = (db.getPurchaseBills() || []).filter(
      (b) =>
        b &&
        b.status !== 'Cancelled' &&
        (b as any).status !== 'CANCELLED' &&
        (b as any).status !== 'Deleted' &&
        (b as any).status !== 'DELETED' &&
        !(b as any).isDeleted
    );
    const saleReturns = (db.getSaleReturns() || []).filter(
      (r) =>
        r &&
        r.status !== 'CANCELLED' &&
        (r as any).status !== 'Cancelled' &&
        (r as any).status !== 'DELETED' &&
        (r as any).status !== 'Deleted' &&
        !(r as any).isDeleted
    );
    const purchaseReturns = (db.getPurchaseReturns() || []).filter(
      (r) =>
        r &&
        r.status !== 'CANCELLED' &&
        (r as any).status !== 'Cancelled' &&
        (r as any).status !== 'DELETED' &&
        (r as any).status !== 'Deleted' &&
        !(r as any).isDeleted
    );
    const expenses = (db.getExpenses() || []).filter(
      (e) =>
        e &&
        (e.category as string) !== 'Discount Allowed' &&
        !(e.id && e.id.startsWith('exp-disc-')) &&
        !(e as any).isDeleted &&
        (e as any).status !== 'DELETED' &&
        (e as any).status !== 'Deleted' &&
        (e as any).status !== 'Cancelled' &&
        (e as any).status !== 'CANCELLED'
    );
    const payments = (db.getPayments() || []).filter(
      (p) =>
        p &&
        !(p as any).isDeleted &&
        (p as any).status !== 'DELETED' &&
        (p as any).status !== 'Deleted' &&
        (p as any).status !== 'Cancelled' &&
        (p as any).status !== 'CANCELLED'
    );
    const vouchers = (db.getVouchers() || []).filter(
      (v) =>
        v &&
        v.status === 'POSTED' &&
        !(v as any).isDeleted &&
        (v as any).status !== 'DELETED' &&
        (v as any).status !== 'Deleted' &&
        (v as any).status !== 'CANCELLED' &&
        (v as any).status !== 'Cancelled'
    );
    const orders = (db.getOrders() || []).filter(
      (o) =>
        o &&
        o.status !== 'Cancelled' &&
        (o as any).status !== 'CANCELLED' &&
        (o as any).status !== 'Deleted' &&
        (o as any).status !== 'DELETED' &&
        !(o as any).isDeleted
    );
    const customers = db.getCustomers() || [];
    const suppliers = db.getSuppliers() || [];
    const products = db.getProducts() || [];
    const restaurants = db.getRestaurants() || [];
    const company = db.getCompanyProfile();
    const cashRegister = db.getCashRegister();

    // ---- Audit date -------------------------------------------------
    // Default = today. If a specific date is requested, use it.
    // If no date requested: check if today has any activity (sales, purchases, vouchers, expenses).
    // If today has activity (e.g. vouchers or receipts entered today), open on today!
    // If today is completely empty and there are past transactions, fall back to latest activity date.
    let auditDate = today;
    const requested = (requestedDate || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
      auditDate = db.normalizeDateToYMD(requested);
    } else {
      const allActivityDates = [
        ...allSaleBills.map((b) => db.normalizeDateToYMD(b.date)),
        ...purchaseBills.map((b) => db.normalizeDateToYMD(b.date)),
        ...vouchers.map((v) => db.normalizeDateToYMD(v.date)),
        ...expenses.map((e) => db.normalizeDateToYMD(e.date)),
      ].filter(Boolean).sort();

      if (allActivityDates.length > 0) {
        const latestTx = allActivityDates[allActivityDates.length - 1];
        if (latestTx && latestTx >= today) {
          // If latest transaction is today or ahead of server UTC today (e.g. user in UTC+4 / UTC+5), default to it
          auditDate = latestTx;
        } else if (allActivityDates.includes(today)) {
          auditDate = today;
        } else if (latestTx) {
          auditDate = latestTx;
        }
      }
    }

    const monthKey = auditDate.slice(0, 7);
    const cost = buildCostLookup(products);

    const billExVatRevenue = (b: SaleBill): number => {
      const billDiscount = Number(b.totalDiscount) || Number(b.billDiscountAmount) || 0;
      const vat = Number(b.totalVatAmount) || 0;
      if (b.grossAmount !== undefined && b.grossAmount > 0) {
        return Math.max(0, Number((b.grossAmount - billDiscount).toFixed(2)));
      }
      return Math.max(0, Number((b.netTotal - vat).toFixed(2)));
    };

    // COGS helper (available to all audit registers):
    const cogsOfBills = (billsList: SaleBill[]) => cost.costOf(
      billsList.flatMap((b) => b.items || []).map((it) => ({
        productId: it.productId,
        itemTitle: it.itemTitle,
        mcode: it.mcode,
        qty: it.qty,
        rate: it.rate,
        ctn: it.ctn,
        ratePerCtn: it.ratePerCtn,
      }))
    );

    const inMonth = (dateStr: string) => db.normalizeDateToYMD(dateStr).slice(0, 7) === monthKey;
    const onDate = (dateStr: string) => db.normalizeDateToYMD(dateStr) === auditDate;
    const uptoDate = (dateStr: string) => db.normalizeDateToYMD(dateStr) <= auditDate;

    // -------------------------------------------------------------
    // 1. SALES RECORD (Gross Sales - Sale Returns = Net Sales)
    // -------------------------------------------------------------
    const saleBillsUpto = allSaleBills.filter((b) => uptoDate(b.date));
    const saleBillsMonth = allSaleBills.filter((b) => uptoDate(b.date) && inMonth(b.date));
    const saleBillsToday = allSaleBills.filter((b) => onDate(b.date));
    const ordersUpto = orders.filter((o) => uptoDate(o.orderDate));
    const ordersMonth = orders.filter((o) => uptoDate(o.orderDate) && inMonth(o.orderDate));
    const ordersToday = orders.filter((o) => onDate(o.orderDate));
    const saleReturnsUpto = saleReturns.filter((r) => uptoDate(r.date));
    const saleReturnsMonthList = saleReturns.filter((r) => uptoDate(r.date) && inMonth(r.date));
    const saleReturnsTodayList = saleReturns.filter((r) => onDate(r.date));

    const sumNet = (list: SaleBill[]) => list.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
    const sumOrder = (list: typeof orders) => list.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const sumReturn = (list: SaleReturn[]) => list.reduce((s, r) => s + (Number(r.netTotal) || 0), 0);

    const grossSalesTotal = sumNet(saleBillsUpto) + sumOrder(ordersUpto);
    const grossSalesMonth = sumNet(saleBillsMonth) + sumOrder(ordersMonth);
    const grossSalesToday = sumNet(saleBillsToday) + sumOrder(ordersToday);

    const saleReturnsTotal = sumReturn(saleReturnsUpto);
    const saleReturnsMonth = sumReturn(saleReturnsMonthList);
    const saleReturnsToday = sumReturn(saleReturnsTodayList);

    const saleReturnsCount = saleReturnsUpto.length;
    const saleReturnsTodayCount = saleReturnsTodayList.length;
    const saleReturnsMonthCount = saleReturnsMonthList.length;
    const saleReturnsCashTotal = saleReturnsUpto.filter((r) => r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);
    const saleReturnsCreditTotal = saleReturnsUpto.filter((r) => !r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);

    const totalSales = Math.max(0, grossSalesTotal - saleReturnsTotal);
    const monthSales = Math.max(0, grossSalesMonth - saleReturnsMonth);
    const todaySales = Math.max(0, grossSalesToday - saleReturnsToday);

    // -------------------------------------------------------------
    // 2. PURCHASES (Gross Purchases - Purchase Returns = Net Purchases)
    // -------------------------------------------------------------
    const purchaseUpto = purchaseBills.filter((b) => uptoDate(b.date));
    const purchaseMonth = purchaseBills.filter((b) => uptoDate(b.date) && inMonth(b.date));
    const purchaseToday = purchaseBills.filter((b) => onDate(b.date));
    const purchaseReturnsUpto = purchaseReturns.filter((r) => uptoDate(r.date));
    const purchaseReturnsMonthList = purchaseReturns.filter((r) => uptoDate(r.date) && inMonth(r.date));
    const purchaseReturnsTodayList = purchaseReturns.filter((r) => onDate(r.date));

    const sumPurchase = (list: PurchaseBill[]) => list.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
    const sumPReturn = (list: PurchaseReturn[]) => list.reduce((s, r) => s + (Number(r.netTotal) || 0), 0);

    const grossPurchasesTotal = sumPurchase(purchaseUpto);
    const grossPurchasesMonth = sumPurchase(purchaseMonth);
    const grossPurchasesToday = sumPurchase(purchaseToday);

    const purchaseReturnsTotal = sumPReturn(purchaseReturnsUpto);
    const purchaseReturnsMonth = sumPReturn(purchaseReturnsMonthList);
    const purchaseReturnsToday = sumPReturn(purchaseReturnsTodayList);

    const purchaseReturnsCount = purchaseReturnsUpto.length;
    const purchaseReturnsTodayCount = purchaseReturnsTodayList.length;
    const purchaseReturnsMonthCount = purchaseReturnsMonthList.length;
    const purchaseReturnsCashTotal = purchaseReturnsUpto.filter((r) => r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);
    const purchaseReturnsCreditTotal = purchaseReturnsUpto.filter((r) => !r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);

    const totalPurchases = Math.max(0, grossPurchasesTotal - purchaseReturnsTotal);
    const monthPurchases = Math.max(0, grossPurchasesMonth - purchaseReturnsMonth);
    const todayPurchases = Math.max(0, grossPurchasesToday - purchaseReturnsToday);

    // -------------------------------------------------------------
    // 3. KHATA BALANCE (Receivable / Payable / Net)
    // -------------------------------------------------------------
    const recoveries = recoveriesMap(allSaleBills, auditDate);
    const recResult = receivableAsOf(customers, allSaleBills, auditDate, recoveries, vouchers, saleReturns);
    const customerReceivable = recResult.total;
    const customerAdvance = recResult.customerAdvance;

    let restaurantReceivable = 0;
    for (const r of restaurants) {
      const billed = ordersUpto.filter((o) => o.restaurantId === r.id).reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
      const paid = payments
        .filter((p) => p.restaurantId === r.id && uptoDate(p.paymentDate))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      restaurantReceivable += Math.max(0, billed - paid);
    }

    const receivable = customerReceivable + restaurantReceivable;
    const payResult = payableAsOf(suppliers, purchaseBills, auditDate, vouchers, purchaseReturns);
    const payable = payResult.total;
    const supplierAdvance = payResult.supplierAdvance;
    const netKhataBalance = receivable - payable;

    // -------------------------------------------------------------
    // 4. STOCK MOVEMENT (Opening / Stock In / Stock Out / Closing)
    //    Calculated product-by-product so the identity
    //    Opening + Stock In - Stock Out = Closing always holds and
    //    one item's movement never contaminates another's balance.
    //    Balances before the audit date are already folded into the
    //    live currentQuantity by the ledger, so only movements on the
    //    audit date and after it are unwound.
    // -------------------------------------------------------------
    const resolveProduct = buildProductResolver(products);
    const purchasedOn = new Map<string, number>();
    const purchasedAfter = new Map<string, number>();
    const soldOn = new Map<string, number>();
    const soldAfter = new Map<string, number>();

    const bump = (map: Map<string, number>, key: string, qty: number) => {
      if (!key || !qty) return;
      map.set(key, (map.get(key) || 0) + qty);
    };

    for (const bill of purchaseBills) {
      const date = db.normalizeDateToYMD(bill.date);
      if (date < auditDate) continue;
      const bucket = date === auditDate ? purchasedOn : purchasedAfter;
      for (const item of bill.items || []) {
        const product = resolveProduct(item);
        if (!product) continue;
        bump(bucket, product.id, Number(item.qty) || 0);
      }
    }

    // Customer returns restore stock (act as stock IN)
    for (const ret of saleReturns) {
      const date = db.normalizeDateToYMD(ret.date);
      if (date < auditDate) continue;
      const bucket = date === auditDate ? purchasedOn : purchasedAfter;
      for (const item of ret.items || []) {
        const product = resolveProduct(item);
        if (!product) continue;
        bump(bucket, product.id, Number(item.qty) || 0);
      }
    }

    for (const bill of allSaleBills) {
      const date = db.normalizeDateToYMD(bill.date);
      if (date < auditDate) continue;
      const bucket = date === auditDate ? soldOn : soldAfter;
      for (const item of bill.items || []) {
        const product = resolveProduct(item);
        if (!product) continue;
        bump(bucket, product.id, Number(item.qty) || 0);
      }
    }

    // Supplier returns deduct stock (act as stock OUT)
    for (const ret of purchaseReturns) {
      const date = db.normalizeDateToYMD(ret.date);
      if (date < auditDate) continue;
      const bucket = date === auditDate ? soldOn : soldAfter;
      for (const item of ret.items || []) {
        const product = resolveProduct(item);
        if (!product) continue;
        bump(bucket, product.id, Number(item.qty) || 0);
      }
    }

    let stockIn = 0;
    let stockOut = 0;
    let openingUnits = 0;
    let closingUnits = 0;
    let warehouseStockValue = 0;
    const unitCount = new Map<string, number>();

    for (const p of products) {
      const id = p.id;
      const inOnDate = purchasedOn.get(id) || 0;
      const outOnDate = soldOn.get(id) || 0;
      const closing = (Number(p.currentQuantity) || 0) - (purchasedAfter.get(id) || 0) + (soldAfter.get(id) || 0);
      const opening = closing - inOnDate + outOnDate;

      stockIn += inOnDate;
      stockOut += outOnDate;
      openingUnits += opening;
      closingUnits += closing;
      warehouseStockValue += closing * (Number(p.purchasePrice) || 0);

      const unit = shortUnit(p.unit);
      unitCount.set(unit, (unitCount.get(unit) || 0) + 1);
    }

    const sortedUnits = Array.from(unitCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    const stockBadge = sortedUnits.length === 0 ? 'UNITS' : sortedUnits.length <= 4 ? sortedUnits.join(' / ') : 'UNITS / MIX';
    const stockSuffix = sortedUnits.length === 1 ? sortedUnits[0] : 'UNITS';

    // -------------------------------------------------------------
    // 5. RETAIL SALES BY SALESMAN (Van & Route Khata)
    //    Only salesmen that actually have sale records are included.
    // -------------------------------------------------------------
    const customerById = new Map(customers.map((c) => [c.id, c] as const));
    const salesmanMap = new Map<string, { bills: SaleBill[]; customerIds: Set<string>; name: string }>();

    for (const bill of saleBillsUpto) {
      const name = (bill.salesmanName || bill.user || 'Sales Staff').trim() || 'Sales Staff';
      const key = name.toLowerCase();
      if (!salesmanMap.has(key)) salesmanMap.set(key, { bills: [], customerIds: new Set(), name });
      const entry = salesmanMap.get(key)!;
      entry.bills.push(bill);
      entry.name = name;
      if (bill.customerId) entry.customerIds.add(bill.customerId);
    }

    // Customers explicitly assigned to a salesman that already has sales records
    for (const c of customers) {
      const sm = (c.assignedSalesman || '').trim();
      if (!sm) continue;
      const entry = salesmanMap.get(sm.toLowerCase());
      if (entry) entry.customerIds.add(c.id);
    }

    const salesmanKhata: AiLedgerAuditSalesmanKhata[] = [];
    const salesmanProfit: AiLedgerAuditSalesmanProfit[] = [];
    let totalSalesmenProfit = 0;
    let totalSalesmenTodayProfit = 0;
    let totalSalesmenMonthProfit = 0;

    for (const entry of Array.from(salesmanMap.values())) {
      const bills = entry.bills.slice().sort((a, b) => db.normalizeDateToYMD(a.date).localeCompare(db.normalizeDateToYMD(b.date)));

      let closing = 0;
      const areas: string[] = [];
      for (const customerId of Array.from(entry.customerIds)) {
        const customer = customerById.get(customerId);
        if (customer) {
          closing += customerBalanceAsOf(customer, allSaleBills, auditDate, recoveries);
          const area = (customer.area || customer.city || '').trim();
          if (area && !areas.includes(area)) areas.push(area);
        } else {
          closing += bills
            .filter((b) => b.customerId === customerId && uptoDate(b.date))
            .reduce((s, b) => s + saleCreditAdded(b), 0);
        }
      }

      const todayBills = bills.filter((b) => onDate(b.date));
      const monthBills = bills.filter((b) => inMonth(b.date));
      const allBills = bills;

      const creditToday = todayBills.reduce((s, b) => s + saleCreditAdded(b), 0);
      const recoveredToday = todayBills.reduce(
        (s, b) => (b.balanceRecovered ? s + (Number(b.balanceRecoveredAmount) || 0) : s),
        0
      );
      const opening = closing - creditToday + recoveredToday;
      const todaySold = todayBills.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
      const monthSold = monthBills.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
      const totalSold = allBills.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
      const route = areas.length > 0 ? areas.slice(0, 2).join(', ') : 'Counter Sale/Direct';

      salesmanKhata.push({ name: entry.name, route, opening, todaySold, closing });

      // Profit contributions (Ex-VAT Revenue - Cost of Goods):
      const calcProfitForBills = (bList: SaleBill[]) => {
        const exVatRev = bList.reduce((s, b) => s + billExVatRevenue(b), 0);
        const cogs = cost.costOf(
          bList
            .flatMap((b) => b.items || [])
            .map((it) => ({
              productId: it.productId,
              itemTitle: it.itemTitle,
              mcode: it.mcode,
              qty: it.qty,
              rate: it.rate,
              ctn: it.ctn,
              ratePerCtn: it.ratePerCtn,
            }))
        );
        const profit = Number((exVatRev - cogs).toFixed(2));
        const margin = exVatRev > 0 ? (profit / exVatRev) * 100 : 0;
        return { profit, margin };
      };

      const todayP = calcProfitForBills(todayBills);
      const monthP = calcProfitForBills(monthBills);
      const totalP = calcProfitForBills(allBills);

      salesmanProfit.push({
        name: entry.name,
        todaySales: todaySold,
        marginPct: todayP.margin || monthP.margin || totalP.margin,
        netProfit: todayP.profit,
        monthSales: monthSold,
        monthNetProfit: monthP.profit,
        monthMarginPct: monthP.margin,
        totalSales: totalSold,
        totalNetProfit: totalP.profit,
        totalMarginPct: totalP.margin,
        billsCount: allBills.length,
      });

      totalSalesmenTodayProfit += todayP.profit;
      totalSalesmenMonthProfit += monthP.profit;
      totalSalesmenProfit += (totalP.profit || todayP.profit);
    }

    salesmanKhata.sort((a, b) => b.todaySold - a.todaySold || b.closing - a.closing);
    salesmanProfit.sort((a, b) => b.todaySales - a.todaySales);

    // -------------------------------------------------------------
    // 6. COMPREHENSIVE PROFIT & DISCOUNTS AUDIT ENGINE
    //    * Excludes 100% of VAT (Tax liability owed to FTA)
    //    * Deducts all bill discounts (percentage or flat amount)
    //    * Deducts all Cash & Bank voucher settlement discounts
    //    * Calculates Today Net Profit, Month Net Profit & Overall Net Profit
    // -------------------------------------------------------------
    // Bill discounts:
    const todayBillDiscount = saleBillsToday.reduce(
      (s, b) => s + (Number(b.totalDiscount) || Number(b.billDiscountAmount) || 0),
      0
    ) + ordersToday.reduce((s, o) => s + (Number(o.discount) || 0), 0);

    const monthBillDiscount = saleBillsMonth.reduce(
      (s, b) => s + (Number(b.totalDiscount) || Number(b.billDiscountAmount) || 0),
      0
    ) + ordersMonth.reduce((s, o) => s + (Number(o.discount) || 0), 0);

    const totalBillDiscount = saleBillsUpto.reduce(
      (s, b) => s + (Number(b.totalDiscount) || Number(b.billDiscountAmount) || 0),
      0
    ) + ordersUpto.reduce((s, o) => s + (Number(o.discount) || 0), 0);

    // Cash & Bank voucher settlement discounts:
    const getVoucherDiscount = (v: Voucher): number => {
      if (!v) return 0;
      const entriesDisc = (v.entries || []).reduce((sum, e) => sum + (Number(e.discount) || 0), 0);
      if (entriesDisc > 0) return entriesDisc;
      return Number((v as any).discountAmount) || 0;
    };

    const todayVoucherDiscount = vouchers
      .filter((v) => onDate(v.date))
      .reduce((sum, v) => sum + getVoucherDiscount(v), 0);

    const monthVoucherDiscount = vouchers
      .filter((v) => inMonth(v.date))
      .reduce((sum, v) => sum + getVoucherDiscount(v), 0);

    const totalVoucherDiscount = vouchers
      .reduce((sum, v) => sum + getVoucherDiscount(v), 0);

    // Itemized Sales Bills & Profit Register for full transparency in Section 6B
    const salesBillsProfit: AiLedgerAuditSaleBillProfit[] = allSaleBills.map((b) => {
      const bDate = db.normalizeDateToYMD(b.date);
      const period: 'today' | 'this_month' | 'past' = onDate(bDate)
        ? 'today'
        : (inMonth(bDate) ? 'this_month' : 'past');
      const bCogs = cogsOfBills([b]);
      const exVat = billExVatRevenue(b);
      const billDisc = Number(b.billDiscountAmount) || Number(b.totalDiscount) || 0;
      const billVat = Number(b.totalVatAmount) || 0;
      const grossProfit = Number((exVat - bCogs).toFixed(2));
      const netProfit = grossProfit;
      const marginPct = exVat > 0 ? Number(((grossProfit / exVat) * 100).toFixed(1)) : 0;
      const itemsSummary = (b.items || [])
        .map((it) => {
          const qty = it.ctn ? `${it.ctn} Ctn` : `${it.qty} ${it.unit || 'Units'}`;
          return `${it.itemTitle || 'Item'} (${qty})`;
        })
        .join(', ');

      return {
        billId: b.id,
        billNumber: b.billNumberFormatted || String(b.billNumber),
        date: b.date,
        customerId: b.customerId,
        customerName: b.customerAccountTitle || b.customerName || 'Customer',
        salesmanName: (b.salesmanName || b.user || 'Sales Staff').trim(),
        itemsSummary: itemsSummary || 'Sale Items',
        exVatRevenue: exVat,
        cogs: bCogs,
        discountAmount: billDisc,
        vatAmount: billVat,
        netTotal: Number(b.netTotal) || 0,
        grossProfit,
        netProfit,
        marginPct,
        period,
        paymentType: b.paymentType || 'Account',
      };
    });
    salesBillsProfit.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    // Collect itemized discount entries for full transparency in Section 8 (Discounts Audit Head)
    const discountEntries: Array<{
      date: string;
      refNumber: string;
      source: string;
      partyName: string;
      discountAmount: number;
      period: 'today' | 'this_month' | 'past';
    }> = [];

    // From vouchers (Cash Receipt CR, Bank Receipt BR, etc.)
    for (const v of vouchers) {
      if (!v) continue;
      const vDate = db.normalizeDateToYMD(v.date);
      const period = onDate(vDate) ? 'today' : (inMonth(vDate) ? 'this_month' : 'past');
      const vTypeLabel = v.voucherType === 'CR' ? 'Cash Receipt'
        : v.voucherType === 'BR' ? 'Bank Receipt'
        : v.voucherType === 'CP' ? 'Cash Payment'
        : v.voucherType === 'BP' ? 'Bank Payment'
        : v.voucherType === 'CB' ? 'Cash & Bank'
        : 'Journal Voucher';

      for (const e of (v.entries || [])) {
        const d = Number(e.discount || 0);
        if (d > 0) {
          discountEntries.push({
            date: v.date,
            refNumber: v.voucherNumberFormatted || String(v.voucherNumber),
            source: `${vTypeLabel} (${v.voucherType})`,
            partyName: e.accountTitle || 'Customer / Party',
            discountAmount: d,
            period,
          });
        }
      }
    }

    // From sale bills
    for (const b of allSaleBills) {
      if (!b) continue;
      const bDate = db.normalizeDateToYMD(b.date);
      const period = onDate(bDate) ? 'today' : (inMonth(bDate) ? 'this_month' : 'past');
      const d = Number(b.totalDiscount) || Number(b.billDiscountAmount) || 0;
      if (d > 0) {
        discountEntries.push({
          date: b.date,
          refNumber: b.billNumberFormatted || `BILL-${b.billNumber}`,
          source: 'Sale Bill (Invoice)',
          partyName: b.customerAccountTitle || b.customerName || 'Customer',
          discountAmount: d,
          period,
        });
      }
    }

    // Helper for return discounts (flat discount + item discounts)
    const getReturnDiscount = (r: { discount?: number; items?: Array<{ disc?: number }> }): number => {
      const flat = Number(r.discount || 0);
      const itemsDisc = (r.items || []).reduce((s, it) => s + (Number(it.disc) || 0), 0);
      return flat + itemsDisc;
    };

    const todaySaleReturnDiscount = saleReturnsTodayList.reduce((s, r) => s + getReturnDiscount(r), 0);
    const monthSaleReturnDiscount = saleReturnsMonthList.reduce((s, r) => s + getReturnDiscount(r), 0);
    const totalSaleReturnDiscount = saleReturnsUpto.reduce((s, r) => s + getReturnDiscount(r), 0);

    const todayPurchaseReturnDiscount = purchaseReturnsTodayList.reduce((s, r) => s + getReturnDiscount(r), 0);
    const monthPurchaseReturnDiscount = purchaseReturnsMonthList.reduce((s, r) => s + getReturnDiscount(r), 0);
    const totalPurchaseReturnDiscount = purchaseReturnsUpto.reduce((s, r) => s + getReturnDiscount(r), 0);

    // From sale returns
    for (const sr of saleReturnsUpto) {
      if (!sr) continue;
      const srDate = db.normalizeDateToYMD(sr.date);
      const period = onDate(srDate) ? 'today' : (inMonth(srDate) ? 'this_month' : 'past');
      const d = getReturnDiscount(sr);
      if (d > 0) {
        discountEntries.push({
          date: sr.date,
          refNumber: sr.returnNumberFormatted || sr.returnNumber || `SR-${sr.id}`,
          source: 'Sale Return',
          partyName: sr.customerAccountTitle || sr.customerName || 'Customer',
          discountAmount: d,
          period,
        });
      }
    }

    // From purchase returns
    for (const pr of purchaseReturnsUpto) {
      if (!pr) continue;
      const prDate = db.normalizeDateToYMD(pr.date);
      const period = onDate(prDate) ? 'today' : (inMonth(prDate) ? 'this_month' : 'past');
      const d = getReturnDiscount(pr);
      if (d > 0) {
        discountEntries.push({
          date: pr.date,
          refNumber: pr.returnNumberFormatted || pr.returnNumber || `PR-${pr.id}`,
          source: 'Purchase Return',
          partyName: pr.supplierAccountTitle || pr.supplierName || 'Supplier',
          discountAmount: d,
          period,
        });
      }
    }

    // Sort descending by date
    discountEntries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    // Total Combined Discounts:
    const todayTotalDiscount = Number((todayBillDiscount + todayVoucherDiscount + todaySaleReturnDiscount + todayPurchaseReturnDiscount).toFixed(2));
    const monthTotalDiscount = Number((monthBillDiscount + monthVoucherDiscount + monthSaleReturnDiscount + monthPurchaseReturnDiscount).toFixed(2));
    const totalDiscounts = Number((totalBillDiscount + totalVoucherDiscount + totalSaleReturnDiscount + totalPurchaseReturnDiscount).toFixed(2));

    // VAT Excluded:
    const todayVatExcluded = saleBillsToday.reduce((s, b) => s + (Number(b.totalVatAmount) || 0), 0);
    const monthVatExcluded = saleBillsMonth.reduce((s, b) => s + (Number(b.totalVatAmount) || 0), 0);
    const totalVatExcluded = saleBillsUpto.reduce((s, b) => s + (Number(b.totalVatAmount) || 0), 0);

    // Operating Expenses:
    const todayExpenses = expenses.filter((e) => onDate(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthExpenses = expenses.filter((e) => uptoDate(e.date) && inMonth(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalExpenses = expenses.filter((e) => uptoDate(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Return COGS & Ex-VAT helpers:
    const cogsOfSaleReturns = (returnsList: SaleReturn[]) => cost.costOf(
      returnsList.flatMap((r) => r.items || []).map((it) => ({
        productId: it.productId,
        itemTitle: it.itemTitle,
        mcode: (it as any).mcode,
        qty: it.qty,
        rate: it.rate,
        ctn: it.ctn,
        ratePerCtn: it.ratePerCtn,
      }))
    );

    const saleReturnExVat = (r: SaleReturn): number => {
      const vat = Number(r.taxAmount) || 0;
      return Math.max(0, Number(((Number(r.netTotal) || 0) - vat).toFixed(2)));
    };

    const todayReturnCogs = cogsOfSaleReturns(saleReturnsTodayList);
    const monthReturnCogs = cogsOfSaleReturns(saleReturnsMonthList);
    const totalReturnCogs = cogsOfSaleReturns(saleReturnsUpto);

    const todaySaleReturnExVat = saleReturnsTodayList.reduce((s, r) => s + saleReturnExVat(r), 0);
    const monthSaleReturnExVat = saleReturnsMonthList.reduce((s, r) => s + saleReturnExVat(r), 0);
    const totalSaleReturnExVat = saleReturnsUpto.reduce((s, r) => s + saleReturnExVat(r), 0);

    // Gross Ex-VAT Revenues (post trade bill discount):
    const todayGrossExVatRevenue = saleBillsToday.reduce((s, b) => s + billExVatRevenue(b), 0) + ordersToday.reduce((s, o) => s + ((o.totalAmount || 0) - (o.discount || 0)), 0);
    const monthGrossExVatRevenue = saleBillsMonth.reduce((s, b) => s + billExVatRevenue(b), 0) + ordersMonth.reduce((s, o) => s + ((o.totalAmount || 0) - (o.discount || 0)), 0);
    const totalGrossExVatRevenue = saleBillsUpto.reduce((s, b) => s + billExVatRevenue(b), 0) + ordersUpto.reduce((s, o) => s + ((o.totalAmount || 0) - (o.discount || 0)), 0);

    // Net Ex-VAT Revenues (deducting Sale Returns Ex-VAT):
    const todayExVatRevenue = Math.max(0, Number((todayGrossExVatRevenue - todaySaleReturnExVat).toFixed(2)));
    const monthExVatRevenue = Math.max(0, Number((monthGrossExVatRevenue - monthSaleReturnExVat).toFixed(2)));
    const totalExVatRevenue = Math.max(0, Number((totalGrossExVatRevenue - totalSaleReturnExVat).toFixed(2)));

    // Net COGS (deducting returned inventory cost):
    const todayCogs = Math.max(0, Number((cogsOfBills(saleBillsToday) - todayReturnCogs).toFixed(2)));
    const monthCogs = Math.max(0, Number((cogsOfBills(saleBillsMonth) - monthReturnCogs).toFixed(2)));
    const totalCogs = Math.max(0, Number((cogsOfBills(saleBillsUpto) - totalReturnCogs).toFixed(2)));

    // Gross Profits:
    const todayGrossProfit = Number((todayExVatRevenue - todayCogs).toFixed(2));
    const monthGrossProfit = Number((monthExVatRevenue - monthCogs).toFixed(2));
    const totalGrossProfit = Number((totalExVatRevenue - totalCogs).toFixed(2));

    // Net Profits (Gross Profit - Cash & Bank Voucher Discounts - Sale Return Discounts - Operating Expenses):
    const todayNetProfit = Number((todayGrossProfit - todayVoucherDiscount - todaySaleReturnDiscount - todayExpenses).toFixed(2));
    const monthNetProfit = Number((monthGrossProfit - monthVoucherDiscount - monthSaleReturnDiscount - monthExpenses).toFixed(2));
    const totalNetProfit = Number((totalGrossProfit - totalVoucherDiscount - totalSaleReturnDiscount - totalExpenses).toFixed(2));

    const todayNetMargin = todayExVatRevenue > 0 ? (todayNetProfit / todayExVatRevenue) * 100 : 0;
    const monthMarginPct = monthExVatRevenue > 0 ? (monthNetProfit / monthExVatRevenue) * 100 : 0;
    const totalMarginPct = totalExVatRevenue > 0 ? (totalNetProfit / totalExVatRevenue) * 100 : 0;

    // -------------------------------------------------------------
    // 7. CASH & BANK LIQUIDITY REGISTER (CASH IN HAND)
    // -------------------------------------------------------------
    const ctx: LedgerContext = {
      saleBills: allSaleBills,
      purchaseBills,
      saleReturns,
      purchaseReturns,
      expenses,
      payments,
      vouchers,
      openingCashBalance: cashRegister.openingCashBalance,
    };

    const todayMove = cashMovementOn(ctx, auditDate);
    const todayBank = bankMovementOn(ctx, auditDate);
    const openingCashBalance = cashBalanceBefore(ctx, auditDate);
    const todayNetCash = todayMove.cashIn - todayMove.cashOut;
    const cashInHand = openingCashBalance + todayNetCash;

    // Build comprehensive set of supplier IDs, codes, account titles for exact detection
    const supplierIds = new Set<string>();
    const supplierCodes = new Set<string>();
    const supplierTitles = new Set<string>();
    for (const s of suppliers) {
      if (s.id) supplierIds.add(s.id);
      if (s.code) supplierCodes.add(s.code.toLowerCase().trim());
      if (s.accountTitle) supplierTitles.add(s.accountTitle.toLowerCase().trim());
      if (s.title) supplierTitles.add(s.title.toLowerCase().trim());
    }

    // Supplier cash payments today:
    // 1) Cash purchases / paid on purchase bills today
    let todaySupplierCash = 0;
    for (const b of purchaseToday) {
      const paid = b.isCash ? (Number(b.paidAmount) || Number(b.netTotal) || 0) : (Number(b.paidAmount) || 0);
      todaySupplierCash += paid;
    }

    // 2) CP vouchers and CB payments for suppliers
    for (const v of vouchers) {
      if (v.status !== 'POSTED') continue;
      if (db.normalizeDateToYMD(v.date) !== auditDate) continue;
      if (v.voucherType === 'CP') {
        for (const e of (v.entries || [])) {
          const isSupplier =
            e.accountType === 'Supplier' ||
            String(e.accountCode || '').startsWith('02') ||
            (e.accountId && supplierIds.has(e.accountId)) ||
            (e.accountCode && supplierCodes.has(e.accountCode.toLowerCase().trim())) ||
            (e.accountTitle && supplierTitles.has(e.accountTitle.toLowerCase().trim()));
          if (isSupplier) {
            todaySupplierCash += Number(e.amount) || 0;
          }
        }
      } else if (v.voucherType === 'CB' && Array.isArray(v.entries)) {
        for (const e of v.entries) {
          const isSupplier =
            e.accountType === 'Supplier' ||
            String(e.accountCode || '').startsWith('02') ||
            (e.accountId && supplierIds.has(e.accountId)) ||
            (e.accountCode && supplierCodes.has(e.accountCode.toLowerCase().trim())) ||
            (e.accountTitle && supplierTitles.has(e.accountTitle.toLowerCase().trim()));
          if (isSupplier) {
            todaySupplierCash += Number(e.payment) || 0;
          }
        }
      }
    }

    // 3) Payments logged directly against suppliers in payments table
    for (const p of payments) {
      if (db.normalizeDateToYMD((p as any).paymentDate || (p as any).date || '') !== auditDate) continue;
      if ((p as any).supplierId || (p as any).supplierName) {
        if (((p as any).paymentMethod || 'Cash').toLowerCase().includes('cash')) {
          todaySupplierCash += Number(p.amount) || 0;
        }
      }
    }

    const todayDiscount =
      saleBillsToday.reduce(
        (s, b) =>
          s +
          (Number(b.billDiscountAmount) || 0) +
          (b.items || []).reduce((i, it) => i + (Number(it.discount) || 0), 0),
        0
      ) + ordersToday.reduce((s, o) => s + (Number(o.discount) || 0), 0);

    // Calculate exact Market Udhaar Recovery vs Counter Cash Sales
    let todayMarketWasooli = 0;
    for (const v of vouchers) {
      if (v.status !== 'POSTED') continue;
      if (db.normalizeDateToYMD(v.date) !== auditDate) continue;
      if (v.voucherType === 'CR') {
        todayMarketWasooli += Number(v.totalAmount) || 0;
      } else if (v.voucherType === 'CB' && Array.isArray(v.entries)) {
        todayMarketWasooli += v.entries.reduce((acc, e) => acc + (Number(e?.receipt) || 0), 0);
      }
    }
    for (const p of payments) {
      if (db.normalizeDateToYMD(p.paymentDate || (p as any).date || '') !== auditDate) continue;
      if ((p.paymentMethod || 'Cash').toLowerCase().includes('cash')) {
        todayMarketWasooli += Number(p.amount) || 0;
      }
    }
    for (const b of saleBillsToday) {
      if (b.balanceRecovered) {
        todayMarketWasooli += Number(b.balanceRecoveredAmount) || 0;
      }
    }

    const todayPRCash = purchaseReturnsTodayList.filter((r) => r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);
    const todaySRCash = saleReturnsTodayList.filter((r) => r.isCash).reduce((s, r) => s + (Number(r.netTotal) || 0), 0);
    const todayCounterCashSales = Math.max(0, todayMove.cashIn - todayMarketWasooli - todayPRCash);

    const inflows: AiLedgerAuditCashRow[] = [
      { label: 'Total Cash Received (Cash In)', value: todayMove.cashIn, tag: 'CASH IN', direction: 'in' },
      { label: 'Market Udhaar Wasooli (Credit Recovery)', value: todayMarketWasooli, tag: 'WASOOLI', direction: 'in' },
      { label: 'Counter Cash Sales (Direct Sales)', value: todayCounterCashSales, tag: 'SALES', direction: 'in' },
    ];
    if (todayPRCash > 0) {
      inflows.push({ label: 'Cash from Purchase Returns', value: todayPRCash, tag: 'PUR RETURN', direction: 'in' });
    }
    inflows.push(
      { label: 'Today Paid to Supplier (Mill / Vendor Cash)', value: todaySupplierCash, tag: 'SUPPLIER', direction: 'out' },
      { label: 'Daily Expense (Salaries, Petrol, Utilities, Misc)', value: todayExpenses, tag: 'EXPENSE', direction: 'out' }
    );
    if (todaySRCash > 0) {
      inflows.push({ label: 'Cash Refunded on Sales Returns', value: todaySRCash, tag: 'SALE RETURN', direction: 'out' });
    }
    // Note: Discounts are excluded from Cash Liquidity Register to avoid double writing,
    // and are comprehensively tracked in Section 8 (Discounts Audit Head).

    const bankRows: AiLedgerAuditCashRow[] = [
      { label: 'Bank Received (Direct Online / Raast / Cheques)', value: todayBank.bankIn, tag: 'BANK IN', direction: 'in' },
      { label: 'Bank Paid (Vendor Cheques / Online Cleared)', value: todayBank.bankOut, tag: 'BANK OUT', direction: 'out' },
    ];

    // -------------------------------------------------------------
    // 8. FIX EXPENSE / SETUP (-) & TOTAL BUSINESS WORTH
    //    Expenses are NOT auto-added here and NOT auto-cut from the worth
    //    (business worth = stock + receivable - payable only).
    // -------------------------------------------------------------
    const fixExpense = 0;
    const totalBusinessWorth = warehouseStockValue + receivable - payable;

    // -------------------------------------------------------------
    // COMPANY PROFILE (from Company Registration / Settings)
    // -------------------------------------------------------------
    const companyName = (company?.name || 'AI LEDGER WHOLESALE ERP').trim();
    const currency = (company?.currency || 'PKR').trim() || 'PKR';
    const symbol = currencySymbolOf(currency);
    const companyInfo: AiLedgerAuditCompany = {
      name: companyName,
      tagline: (company?.tagline || '').trim(),
      ownerName: (company?.ownerName || '').trim(),
      phone: (company?.phone || '').trim(),
      address: (company?.address || '').trim(),
      city: (company?.city || '').trim(),
      businessType: (company?.businessType || 'Wholesale ERP').trim(),
      ntn: (company?.ntn || '').trim(),
      trn: (company?.trn || '').trim(),
      logo: (company?.logo || '').trim(),
      initial: (companyName.replace(/[^A-Za-z0-9]/g, '')[0] || 'M').toUpperCase(),
    };

    const data: AiLedgerAuditReport = {
      success: true,
      fileName: `AI_Ledger_Master_Business_Audit_Report_${auditDate}.html`,
      reportDate: auditDate,
      dateLabel: labelDate(auditDate),
      generatedAt: new Date().toISOString(),
      closingTime: cashRegister.closingTime || '10:00 PM',
      currency,
      currencySymbol: symbol,
      company: companyInfo,
      strip: {
        todayRevenue: todaySales,
        netProfit: todayNetProfit,
        netMarginPct: todayNetMargin,
        monthNetProfit,
        totalNetProfit,
        todayDiscount: todayTotalDiscount,
        monthDiscount: monthTotalDiscount,
        totalDiscount: totalDiscounts,
        receivables: receivable,
        warehouseStock: warehouseStockValue,
        todaySaleReturns: saleReturnsToday,
        todayPurchaseReturns: purchaseReturnsToday,
        totalSaleReturns: saleReturnsTotal,
        totalPurchaseReturns: purchaseReturnsTotal,
      },
      salesCard: {
        monthSales,
        todaySales,
        totalSales,
        grossSalesToday,
        grossSalesMonth,
        grossSalesTotal,
        saleReturnsToday,
        saleReturnsMonth,
        saleReturnsTotal,
        saleReturnsCount,
      },
      purchaseCard: {
        monthPurchases,
        todayPurchases,
        totalPurchases,
        grossPurchasesToday,
        grossPurchasesMonth,
        grossPurchasesTotal,
        purchaseReturnsToday,
        purchaseReturnsMonth,
        purchaseReturnsTotal,
        purchaseReturnsCount,
      },
      returnsSummary: {
        saleReturnsToday,
        saleReturnsMonth,
        saleReturnsTotal,
        saleReturnsTodayCount,
        saleReturnsMonthCount,
        saleReturnsTotalCount: saleReturnsCount,
        saleReturnsCashTotal,
        saleReturnsCreditTotal,

        purchaseReturnsToday,
        purchaseReturnsMonth,
        purchaseReturnsTotal,
        purchaseReturnsTodayCount,
        purchaseReturnsMonthCount,
        purchaseReturnsTotalCount: purchaseReturnsCount,
        purchaseReturnsCashTotal,
        purchaseReturnsCreditTotal,
      },
      khataCard: {
        receivable,
        payable,
        netBalance: netKhataBalance,
        customerAdvance,
        supplierAdvance,
      },
      stockCard: { unitLabel: stockBadge, openingUnits, stockIn, stockOut, closingUnits },
      salesmanKhata,
      salesmanProfit,
      totalSalesmenProfit,
      totalSalesmenTodayProfit,
      totalSalesmenMonthProfit,
      salesBillsProfit,
      cash: {
        inflows,
        bankRows,
        openingBalance: openingCashBalance,
        todayNet: todayNetCash,
        cashInHand,
      },
      worth: {
        stockValue: warehouseStockValue,
        stockUnitCaption: `${num(closingUnits)} ${stockSuffix} evaluated`,
        udhaar: receivable,
        payable,
        fixExpense,
        total: totalBusinessWorth,
      },
      profitCard: {
        todayNetProfit,
        todayGrossProfit,
        todayMarginPct: todayNetMargin,
        todayExpenses,
        todayVatExcluded,

        monthNetProfit,
        monthGrossProfit,
        monthMarginPct,
        monthExpenses,
        monthVatExcluded,

        totalNetProfit,
        totalGrossProfit,
        totalMarginPct,
        totalExpenses,
        totalVatExcluded,
      },
      discountsHead: {
        todayBillDiscount,
        monthBillDiscount,
        totalBillDiscount,

        todayVoucherDiscount,
        monthVoucherDiscount,
        totalVoucherDiscount,

        todaySaleReturnDiscount,
        monthSaleReturnDiscount,
        totalSaleReturnDiscount,

        todayPurchaseReturnDiscount,
        monthPurchaseReturnDiscount,
        totalPurchaseReturnDiscount,

        todayTotalDiscount,
        monthTotalDiscount,
        totalDiscounts,
        discountEntries,
      },
    };

    return { success: true, fileName: data.fileName, data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to build AI Ledger Master Audit Report.',
      fileName: `AI_Ledger_Master_Business_Audit_Report.html`,
    };
  }
}
