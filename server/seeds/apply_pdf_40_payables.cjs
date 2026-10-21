/**
 * Seed: payables_pdf_final.json (40 suppliers, CR 1096568.86) -> suppliers.
 * - payableToSupplier / payableType / openingBalance come straight from the PDF
 * - last bill / payment / post-dated columns stored for the Payable Report
 * - "Noor al israa" (sNo 31) has no master record -> created
 * Writes: data/database*.json + PostgreSQL `suppliers`.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const PAY = path.join(ROOT, 'server', 'seeds', 'payables_pdf_final.json');
const ZAFR = path.join(ROOT, 'server', 'seeds', 'zafr_supplier_data.ts');
const ZAFR_COMPANY = 'comp-muocj00t-j3co';

const payables = JSON.parse(fs.readFileSync(PAY, 'utf8'));
const zafrRaw = fs.readFileSync(ZAFR, 'utf8');
const zafr = (zafrRaw.match(/\{[^{}]*\}/g) || [])
  .map((x) => {
    try {
      return JSON.parse(x);
    } catch (e) {
      return null;
    }
  })
  .filter(Boolean);
console.log(`payable rows: ${payables.length}, zafr suppliers: ${zafr.length}`);

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const byId = new Map(zafr.map((s) => [s.id, s]));

function companyIdOf(dbFile, dbData) {
  const cm = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
  if (cm) return cm[1];
  if (dbFile === 'database.json') return (dbData.companyProfile && dbData.companyProfile.id) || 'comp_default_01';
  return 'comp_default_01';
}

function buildSupplier(p, companyId, dbFile) {
  const master = p.supplierId ? byId.get(p.supplierId) : null;
  const sameCompany = companyId === ZAFR_COMPANY;
  const baseId = (master && master.id) || `sup-rec-${String(p.sNo).padStart(4, '0')}`;
  const id = sameCompany ? baseId : `${baseId}_${companyId}`;
  const bal = round2(Math.abs(p.balance));
  const s = {
    id,
    companyId,
    code: (master && master.code) || `REC${String(p.sNo).padStart(3, '0')}`,
    title: p.fullTitle || p.title,
    accountTitle: p.fullTitle || p.title,
    name: p.fullTitle || p.title,
    supplierGroup: (master && master.supplierGroup) || 'General Trading',
    mobile: (master && master.mobile) || '',
    vatNumber: (master && master.vatNumber) || '',
    ntnNumber: (master && master.ntnNumber) || '',
    bankName: (master && master.bankName) || '',
    bankTitle: (master && master.bankTitle) || '',
    bankAccountNo: (master && master.bankAccountNo) || '',
    prefixTitle: (master && master.prefixTitle) || '',
    firstName: (master && master.firstName) || '',
    lastName: (master && master.lastName) || '',
    contactPerson: (master && master.contactPerson) || '',
    email: (master && master.email) || '',
    telephones: (master && master.telephones) || '',
    phone: (master && master.phone) || (master && master.mobile) || '',
    city: (master && master.city) || '',
    address: (master && master.address) || '',
    status: 'ACTIVE',
    payableToSupplier: bal,
    payableType: p.balanceType,
    balanceOwed: bal,
    openingBalance: bal,
    openingBalanceType: p.balanceType,
    documents: (master && master.documents) || [],
    categories: (master && master.categories) || [],
    totalPurchases: (master && master.totalPurchases) || 0,
    createdAt: (master && master.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // ---- Payable Report columns (payable.pdf) ----
    srNo: p.sNo,
    sNo: p.sNo,
    pdfOrder: p.sNo,
    pdfTitle: p.title,
    lastBillNumber: p.lastBillNumber || '',
    lastBillDate: p.lastBillDate || '',
    lastBillAmount: p.lastBillAmount || 0,
    lastPaymentDate: p.lastPaymentDate || '',
    lastPaymentAmount: p.paymentAmount || 0,
    postDatedPayments: p.postDatedPayments || 0,
    postDatedReceipts: p.postDatedReceipts || 0,
    adjustedLedgerBalance: round2(Math.abs(p.adjustedLedgerBalance)),
    adjustedLedgerBalanceType: p.adjustedLedgerBalanceType,
  };
  return s;
}

// ---- 1) data/database*.json ------------------------------------------------
const dbFiles = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^database.*\.json$/.test(f) && !f.includes('all_337') && !f.includes('329'));

let totalCreated = 0;
for (const dbFile of dbFiles) {
  const filePath = path.join(DATA_DIR, dbFile);
  const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(dbData.suppliers)) {
    console.log(`[${dbFile}] no suppliers array - skipped`);
    continue;
  }
  const companyId = companyIdOf(dbFile, dbData);
  const suppliers = dbData.suppliers;
  const byKey = new Map();
  for (const s of suppliers) {
    byKey.set(s.id, s);
    if (s.srNo) byKey.set(`sr:${s.srNo}`, s);
    const t = String(s.title || s.accountTitle || s.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (t && !byKey.has(`t:${t}`)) byKey.set(`t:${t}`, s);
  }

  let updated = 0;
  let created = 0;
  const pdfTargetIds = new Set();
  for (const p of payables) {
    const master = p.supplierId ? byId.get(p.supplierId) : null;
    let target = null;
    if (master) {
      const sameId = companyId === ZAFR_COMPANY ? master.id : `${master.id}_${companyId}`;
      target = byKey.get(sameId) || null;
      if (!target && companyId === ZAFR_COMPANY) target = suppliers.find((s) => s.id === master.id) || null;
    }
    if (!target) {
      const key = `t:${(p.fullTitle || p.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
      target = byKey.get(key) || null;
    }
    if (!target) {
      target = buildSupplier(p, companyId, dbFile);
      suppliers.push(target);
      byKey.set(target.id, target);
      created++;
      totalCreated++;
      updated++;
      pdfTargetIds.add(target.id);
      continue;
    }
    const fresh = buildSupplier(p, companyId, dbFile);
    for (const k of Object.keys(fresh)) {
      if (k === 'id' || k === 'companyId') continue;
      target[k] = fresh[k];
    }
    updated++;
    pdfTargetIds.add(target.id);
  }

  // suppliers that are NOT in the payable PDF keep a zero balance
  let zeroed = 0;
  for (const s of suppliers) {
    if (pdfTargetIds.has(s.id)) continue;
    if (Number(s.payableToSupplier) !== 0) {
      s.payableToSupplier = 0;
      s.balanceOwed = 0;
      s.payableType = 'CR';
      zeroed++;
    }
  }

  dbData.suppliers = suppliers;
  fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`[${dbFile}] company ${companyId}: suppliers=${suppliers.length} updated=${updated} created=${created} zeroed=${zeroed}`);
}
console.log(`new supplier records created across files: ${totalCreated}`);

// ---- 2) PostgreSQL ---------------------------------------------------------
async function syncPostgres() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });
  await client.connect();
  let n = 0;
  for (const dbFile of dbFiles) {
    const dbData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, dbFile), 'utf8'));
    if (!Array.isArray(dbData.suppliers)) continue;
    const companyId = companyIdOf(dbFile, dbData);
    for (const s of dbData.suppliers) {
      const q = `
        INSERT INTO suppliers (
          id, company_id, code, title, account_title, name, supplier_group, mobile, vat_number, phone,
          city, address, status, payable_to_supplier, payable_type, categories, data,
          opening_balance, opening_balance_type, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
        ON CONFLICT (id) DO UPDATE SET
          company_id = EXCLUDED.company_id, code = EXCLUDED.code, title = EXCLUDED.title,
          account_title = EXCLUDED.account_title, name = EXCLUDED.name, supplier_group = EXCLUDED.supplier_group,
          mobile = EXCLUDED.mobile, vat_number = EXCLUDED.vat_number, phone = EXCLUDED.phone,
          city = EXCLUDED.city, address = EXCLUDED.address, status = EXCLUDED.status,
          payable_to_supplier = EXCLUDED.payable_to_supplier, payable_type = EXCLUDED.payable_type,
          categories = EXCLUDED.categories, data = EXCLUDED.data,
          opening_balance = EXCLUDED.opening_balance, opening_balance_type = EXCLUDED.opening_balance_type,
          updated_at = NOW();`;
      await client.query(q, [
        s.id, companyId, s.code, s.title, s.accountTitle || s.title, s.name || s.title,
        s.supplierGroup || '', s.mobile || '', s.vatNumber || '', s.phone || '', s.city || '',
        s.address || '', s.status || 'ACTIVE', s.payableToSupplier, s.payableType || 'CR',
        JSON.stringify(s.categories || []), JSON.stringify(s), s.openingBalance || 0,
        s.openingBalanceType || 'CR',
      ]);
      n++;
    }
  }
  console.log(`PostgreSQL: ${n} supplier rows upserted.`);
  await client.end();
}

// ---- 3) verification -------------------------------------------------------
function verify() {
  const dbData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'database.json'), 'utf8'));
  const all = dbData.suppliers || [];
  const withBal = all.filter((s) => Number(s.payableToSupplier) > 0.001);
  const total = round2(withBal.reduce((a, b) => a + Number(b.payableToSupplier), 0));
  const order = withBal.map((s) => s.srNo).sort((a, b) => a - b).join(',');
  const expectOrder = payables.map((p) => p.sNo).join(',');
  console.log('--- VERIFY ---');
  console.log(`suppliers: ${all.length} (with balance: ${withBal.length}, expect 41)`);
  console.log(`payable total: ${total.toFixed(2)} (expect 1190110.17)`);
  console.log(`report order srNo matches PDF: ${order === expectOrder}`);
  const ok = withBal.length === 41 && Math.abs(total - 1190110.17) < 0.005 && order === expectOrder;
  console.log(ok ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
  return ok;
}

syncPostgres()
  .then(() => process.exit(verify() ? 0 : 1))
  .catch((e) => {
    console.warn('PG sync failed (JSON updated):', e.message);
    process.exit(verify() ? 0 : 1);
  });
