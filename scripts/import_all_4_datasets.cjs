/**
 * One-shot importer for the four fresh datasets (Zahrat Al Fajr only):
 *   1. items-report.csv          -> 367 products  (category = "Kilogram")
 *   2. customers_pdf_343.json    -> 343 customers (full replace)
 *   3. receivables_pdf_152_final -> 158 receivables attached to their own customer
 *   4. payables_pdf_final        -> 41 payables attached to their own supplier
 *
 * Writes data/database_comp-muocj00t-j3co.json (Postgres is synced separately
 * by scripts/sync_pg_after_import.ts).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMPANY = 'comp-muocj00t-j3co';
const TENANT_FILE = path.join(ROOT, 'data', `database_${COMPANY}.json`);
const SEEDS = path.join(ROOT, 'server', 'seeds');

const NOW = new Date().toISOString();
const TODAY = NOW.split('T')[0];

const r2 = (n) => Math.round(Number(n) * 100) / 100;
const r1 = (n) => Math.round(Number(n) * 10) / 10;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function fail(msg) {
  console.error('FATAL: ' + msg);
  process.exit(1);
}

function backup() {
  const dir = path.join(ROOT, 'data', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = NOW.replace(/[:.]/g, '-');
  const dest = path.join(dir, `database_${COMPANY}.${stamp}.json`);
  fs.copyFileSync(TENANT_FILE, dest);
  console.log('[backup] ' + path.relative(ROOT, dest));
}

/** RFC4180-ish CSV parser (handles quoted fields). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch === '\r') { /* skip */ }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length && r.some((c) => String(c).trim() !== ''));
}

function toDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const yy = Number(y);
  if (yy < 1900 || yy > 2200) return null;
  const dd = String(d).padStart(2, '0');
  const mm = String(mo).padStart(2, '0');
  if (Number(mm) > 12 || Number(dd) > 31) return null;
  return `${y}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// 1. PRODUCTS
// ---------------------------------------------------------------------------
function importProducts(tenant) {
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, 'items-report.csv'), 'utf8').replace(/^\uFEFF/, ''));
  const bySku = new Map();
  for (const p of tenant.products || []) if (p.sku) bySku.set(p.sku, p);

  let updated = 0;
  const missing = [];
  for (const cols of rows.slice(1)) {
    const sr = parseInt(String(cols[0]).trim(), 10);
    if (!Number.isFinite(sr)) continue;
    const name = String(cols[3] || '').trim();
    if (!name) continue;

    const pRate = Number(cols[5]) || 0;
    const sRate = Number(cols[6]) || 0;
    const disc = Number(cols[7]) || 0;
    const qty = Math.max(0, Number(cols[8]) || 0); // negative stock clamped to 0
    const sku = `M-${String(sr).padStart(4, '0')}`;

    const p = bySku.get(sku);
    if (!p) { missing.push(sku); continue; }

    const set = (k, v) => { p[k] = v; };
    set('name', name);
    set('itemTitle', name);
    set('mcode', sku);
    set('category', 'Kilogram');
    set('purchasePrice', pRate);
    set('lastPurchasePrice', pRate);
    set('averagePurchaseCost', pRate);
    set('sellingPrice', sRate);
    set('salePrice', sRate);
    set('ctnSaleRate', sRate);
    set('saleDiscount', disc);
    set('currentQuantity', qty);
    set('totalStock', qty);
    set('openingStock', qty);
    set('stockValue', r2(qty * pRate));
    set('profitMargin', sRate > 0 ? r1(((sRate - pRate) / sRate) * 100) : 0);
    set('lowStockAlert', qty <= Number(p.minStockLevel ?? 5));
    set('measure', p.measure || 'Kilo grams');
    set('unit', p.unit || 'Kilo grams');
    set('updatedAt', NOW);

    // snake_case mirrors (kept in sync by the Postgres round-trip)
    p.purchase_price = pRate;
    p.sale_price = sRate;
    p.current_quantity = qty;
    p.min_quantity = p.min_quantity ?? 5;
    p.category = 'Kilogram';
    p.updated_at = NOW;
    p.company_id = COMPANY;

    updated++;
  }
  console.log(`[products] ${updated} of ${rows.length - 1} rows written (${missing.length} sku not found${missing.length ? ': ' + missing.join(', ') : ''})`);
  return updated;
}

// ---------------------------------------------------------------------------
// 2 + 3. CUSTOMERS + RECEIVABLES
// ---------------------------------------------------------------------------
function importCustomers(tenant) {
  const recs = JSON.parse(fs.readFileSync(path.join(SEEDS, 'receivables_pdf_152_final.json'), 'utf8'));
  const custRows = JSON.parse(fs.readFileSync(path.join(SEEDS, 'customers_pdf_343.json'), 'utf8'));

  const recByTitle = new Map();
  for (const r of recs) {
    const k = norm(r.title);
    if (recByTitle.has(k)) fail(`receivable title collision: ${r.title}`);
    recByTitle.set(k, r);
  }

  const customers = [];
  let applied = 0;
  const unmatchedRec = [];

  custRows.forEach((row, i) => {
    const code = String(row.code || '').trim();
    if (!code) fail(`customer row ${row.srNo} has no code`);

    const rec = recByTitle.get(norm(row.accountTitle)) || null;
    if (rec) applied++;

    const bal = rec ? Number(rec.balance) : 0;
    const balType = rec ? rec.balanceType : 'DR';
    const signed = balType === 'CR' ? -bal : bal;

    const mobile = ['NULL', '0', ''].includes(String(row.mobile || '').trim()) ? '' : String(row.mobile).trim();
    const mobile2 = ['NULL', '0', ''].includes(String(row.mobile2 || '').trim()) ? '' : String(row.mobile2).trim();
    const regDate = toDate(row.date) || TODAY;
    const salesman = String(row.employee || '').trim() || (rec && rec.salesman) || '';
    const srNo = Number(row.srNo) || i + 1;
    const id = `cust-${code}_${COMPANY}`;

    const c = {
      id,
      code,
      accountCode: code,
      account_code: code,
      manualCode: '',
      manual_code: '',
      name: row.accountTitle,
      title: row.accountTitle,
      accountTitle: row.accountTitle,
      account_title: row.accountTitle,
      customerGroup: 'Restaurants',
      customer_group: 'Restaurants',
      regDate,
      reg_date: regDate,
      contactPerson: String(row.contactPerson || '').trim(),
      mobile,
      mobile2,
      rawMobiles: String(row.telephones || '').trim(),
      city: String(row.city || '').trim(),
      area: String(row.area || '').trim(),
      sector: String(row.sector || '').trim(),
      location: '',
      address: '',
      status: 'ACTIVE',
      creditLimit: 30000,
      credit_limit: '30000.00',
      totalSales: 0,
      total_sales: '0.00',
      openingBalance: bal,
      opening_balance: r2(bal).toFixed(2),
      openingBalanceType: balType,
      opening_balance_type: balType,
      outstandingBalance: r2(signed),
      outstanding_balance: r2(signed).toFixed(2),
      salesman,
      assignedSalesman: salesman,
      srNo,
      sNo: srNo,
      pdfOrder: srNo,
      createdAt: regDate,
      updatedAt: NOW,
      updated_at: NOW,
      companyId: COMPANY,
      company_id: COMPANY,
      lastBillNumber: rec ? String(rec.lastBillNumber || '') : '',
      lastBillDate: rec ? String(rec.lastBillDate || '') : '',
      lastBillAmount: rec ? Number(rec.lastBillAmount) || 0 : 0,
      lastReceiptDate: rec ? String(rec.lastReceiptDate || '') : '',
      lastReceiptAmount: rec ? Number(rec.lastReceiptAmount) || 0 : 0,
      receivableSerial: rec ? rec.sNo : null,
    };
    c.data = { ...c };
    customers.push(c);
    if (rec) recByTitle.delete(norm(row.accountTitle));
  });

  for (const r of recByTitle.values()) unmatchedRec.push(`${r.sNo} ${r.title}`);
  if (unmatchedRec.length) fail(`receivables with no customer: ${unmatchedRec.join(' | ')}`);
  if (applied !== recs.length) fail(`only ${applied}/${recs.length} receivables matched`);

  tenant.customers = customers;
  console.log(`[customers] ${customers.length} built, ${applied} receivables attached`);
  return { count: customers.length, applied };
}

// ---------------------------------------------------------------------------
// 4. PAYABLES
// ---------------------------------------------------------------------------
function importPayables(tenant) {
  const pays = JSON.parse(fs.readFileSync(path.join(SEEDS, 'payables_pdf_final.json'), 'utf8'));
  const sups = tenant.suppliers || [];
  const byTitle = new Map();
  for (const s of sups) byTitle.set(norm(s.title || s.accountTitle || s.name), s);

  const before = sups.filter((s) => Number(s.payableToSupplier || 0) !== 0).map((s) => s.id);
  const touched = [];
  let applied = 0;
  const unmatched = [];

  for (const p of pays) {
    const key = norm(p.fullTitle || p.title);
    let sup = byTitle.get(key);
    if (!sup) {
      const cands = sups.filter((s) => {
        const t = norm(s.title || s.accountTitle || s.name);
        return t && (t.startsWith(key) || key.startsWith(t));
      });
      if (cands.length === 1) sup = cands[0];
    }
    if (!sup) { unmatched.push(`${p.sNo} ${p.fullTitle || p.title}`); continue; }

    const bal = Number(p.balance) || 0;
    sup.payableToSupplier = r2(bal);
    sup.payable_to_supplier = r2(bal).toFixed(2);
    sup.balanceOwed = r2(bal);
    sup.openingBalance = r2(bal);
    sup.opening_balance = r2(bal).toFixed(2);
    sup.openingBalanceType = 'CR';
    sup.opening_balance_type = 'CR';
    sup.payableType = 'CR';
    sup.payable_type = 'CR';
    sup.lastBillNumber = String(p.lastBillNumber || '');
    sup.lastBillDate = String(p.lastBillDate || '');
    sup.lastBillAmount = Number(p.lastBillAmount) || 0;
    sup.lastPaymentDate = String(p.lastPaymentDate || '');
    sup.lastPaymentAmount = Number(p.paymentAmount) || 0;
    sup.postDatedPayments = Number(p.postDatedPayments) || 0;
    sup.postDatedReceipts = Number(p.postDatedReceipts) || 0;
    sup.adjustedLedgerBalance = Number(p.adjustedLedgerBalance) || bal;
    sup.adjustedLedgerBalanceType = p.adjustedLedgerBalanceType || 'CR';
    sup.updatedAt = NOW;
    sup.updated_at = NOW;
    sup.company_id = COMPANY;

    touched.push(sup.id);
    applied++;
  }

  if (unmatched.length) fail(`payables with no supplier: ${unmatched.join(' | ')}`);
  if (applied !== pays.length) fail(`only ${applied}/${pays.length} payables matched`);

  const orphan = before.filter((id) => !touched.includes(id));
  if (orphan.length) console.warn(`[payables] WARN: ${orphan.length} supplier(s) had a balance but no payable row: ${orphan.join(', ')}`);

  const total = pays.reduce((a, p) => a + Number(p.balance) || 0, 0);
  console.log(`[payables] ${applied} suppliers updated, total CR ${r2(total).toFixed(2)}`);
  return { applied, total: r2(total) };
}

// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(TENANT_FILE)) fail('tenant file not found: ' + TENANT_FILE);
  backup();

  const tenant = JSON.parse(fs.readFileSync(TENANT_FILE, 'utf8'));

  importProducts(tenant);
  const cust = importCustomers(tenant);
  const pay = importPayables(tenant);

  const recs = JSON.parse(fs.readFileSync(path.join(SEEDS, 'receivables_pdf_152_final.json'), 'utf8'));
  const dr = recs.filter((r) => r.balanceType === 'DR').reduce((a, r) => a + Number(r.balance), 0);
  const cr = recs.filter((r) => r.balanceType === 'CR').reduce((a, r) => a + Number(r.balance), 0);
  const custWithBal = tenant.customers.filter((c) => Number(c.openingBalance) !== 0);

  fs.writeFileSync(TENANT_FILE, JSON.stringify(tenant, null, 2), 'utf8');

  console.log('');
  console.log('=== IMPORT SUMMARY (ZAHRAT AL FAJR) ===');
  console.log(`products      : ${tenant.products.length} (category = "Kilogram")`);
  console.log(`customers     : ${cust.count} (of which ${custWithBal.length} carry a receivable)`);
  console.log(`receivables   : ${cust.applied} rows | DR ${r2(dr).toFixed(2)} - CR ${r2(cr).toFixed(2)} = NET ${r2(dr - cr).toFixed(2)}`);
  console.log(`payables      : ${pay.applied} rows | CR ${pay.total.toFixed(2)}`);
  console.log(`suppliers     : ${tenant.suppliers.length}`);
}

main();
