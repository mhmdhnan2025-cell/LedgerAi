/**
 * Seed: receivables_pdf_152_final.json -> customers (exactly the 152 parties of
 * recievable.pdf, NET 302163.55 DR). Enriched (area/city/sector/regDate/phone
 * book) from customers_pdf_337_new.json, but every report field that the PDF
 * shows (srNo, title, phone, salesman, last bill/receipt, balance) comes from
 * the PDF itself.
 *
 * Writes: data/database*.json + PostgreSQL `customers`.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const REC = path.join(ROOT, 'server', 'seeds', 'receivables_pdf_152_final.json');
const MAST = path.join(ROOT, 'server', 'seeds', 'customers_pdf_337_new.json');

const receivables = JSON.parse(fs.readFileSync(REC, 'utf8'));
const master = JSON.parse(fs.readFileSync(MAST, 'utf8'));
console.log(`receivable rows: ${receivables.length}, master rows: ${master.length}`);

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digits = (s) => String(s || '').replace(/\D/g, '');
const toISODate = (d) => {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(-?\d{4})$/);
  if (!m) return d || '';
  return `${m[3].startsWith('-') ? m[3].slice(1) : m[3]}-${m[2]}-${m[1]}`;
};
const parseMobiles = (raw) =>
  (String(raw || '').match(/(M1|M2|Ph)\s*:\s*([^\s]+)/gi) || [])
    .map((x) => x.split(':').slice(1).join(':').trim())
    .filter((p) => p && p !== '0' && !/^0+$/.test(p) && p.toUpperCase() !== 'NULL');

// ---- match each receivable row to the 337-customer master -----------------
const usedMaster = new Set();
const byPhone = [];
const byTitle = new Map();
const byClean = new Map();
master.forEach((m, i) => {
  const d = digits(m.mobileRaw || '');
  if (d.length >= 6) byPhone.push({ i, d });
  const t = norm(m.name);
  if (t) {
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t).push(i);
  }
  const c = t.replace(/\s/g, '');
  if (c) {
    if (!byClean.has(c)) byClean.set(c, []);
    byClean.get(c).push(i);
  }
});

const enriched = new Map(); // sNo -> master row
let matchCount = 0;
const unmatched = [];
for (const r of receivables) {
  let mi = -1;
  const rd = digits(r.phone);
  if (rd.length >= 6) {
    const hit = byPhone.find((p) => !usedMaster.has(p.i) && (p.d.includes(rd) || rd.includes(p.d)));
    if (hit) mi = hit.i;
  }
  if (mi < 0) {
    const list = byTitle.get(norm(r.title)) || [];
    const free = list.find((i) => !usedMaster.has(i));
    if (free !== undefined) mi = free;
  }
  if (mi < 0) {
    const list = byClean.get(norm(r.title).replace(/\s/g, '')) || [];
    const free = list.find((i) => !usedMaster.has(i));
    if (free !== undefined) mi = free;
  }
  if (mi >= 0) {
    usedMaster.add(mi);
    enriched.set(r.sNo, master[mi]);
    matchCount++;
  } else {
    unmatched.push(r);
  }
}
console.log(`master matched: ${matchCount}/${receivables.length}`);
unmatched.forEach((u) => console.log(`   no master row: sNo ${u.sNo} "${u.title}"`));

// ---- build a customer record from a receivable row ------------------------
function buildCustomer(r, companyId) {
  const m = enriched.get(r.sNo);
  const code = (m && m.code) || `REC${String(r.sNo).padStart(3, '0')}`;
  const bal = round2(Math.abs(r.balance));
  const out = r.balanceType === 'CR' ? -bal : bal;
  const phones = m ? parseMobiles(m.mobileRaw) : [];
  const area = (m && String(m.area || '').trim()) || '';
  const sector = (m && String(m.sector || '').trim()) || '';
  const city = (m && String(m.city || '').trim()) || '';
  const salesman = String(r.salesman || '').trim();
  const phone = String(r.phone || '');
  return {
    id: `cust-${code}_${companyId}`,
    companyId,
    code,
    accountCode: code,
    manualCode: r.mCode || '',
    customerGroup: 'Restaurants',
    srNo: r.sNo,
    sNo: r.sNo,
    pdfOrder: r.sNo,
    name: r.title,
    accountTitle: r.title,
    title: r.title,
    account_title: r.title,
    assignedSalesman: salesman,
    salesman,
    mobile: phone,
    mobile2: phones.find((p) => p !== phone) || '',
    rawMobiles: (m && m.mobileRaw) || '',
    contactPerson: (m && m.contact) || '',
    area,
    sector,
    city,
    location: area,
    address: [city, area].filter(Boolean).join(' '),
    regDate: (m && toISODate(m.date)) || '',
    reg_date: (m && toISODate(m.date)) || '',
    creditLimit: 30000,
    totalSales: 0,
    status: 'ACTIVE',
    openingBalance: bal,
    openingBalanceType: r.balanceType,
    opening_balance: bal,
    opening_balance_type: r.balanceType,
    outstandingBalance: out,
    outstanding_balance: out,
    lastBillNumber: r.lastBillNumber || '',
    lastBillDate: r.lastBillDate || '',
    lastBillAmount: r.lastBillAmount || 0,
    lastReceiptDate: r.lastReceiptDate || '',
    lastReceiptAmount: r.lastReceiptAmount || 0,
    createdAt: (m && toISODate(m.date)) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---- 1) data/database*.json ------------------------------------------------
const dbFiles = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^database.*\.json$/.test(f) && !f.includes('all_337') && !f.includes('329'));
let wrote = 0;
for (const dbFile of dbFiles) {
  const filePath = path.join(DATA_DIR, dbFile);
  const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(dbData.customers)) {
    console.log(`[${dbFile}] no customers array - skipped`);
    continue;
  }
  let companyId = 'comp_default_01';
  const cm = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
  if (cm) companyId = cm[1];
  else if (dbData.companyProfile && dbData.companyProfile.id) companyId = dbData.companyProfile.id;

  const created = receivables.map((r) => buildCustomer(r, companyId));
  dbData.customers = created;
  fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf8');
  wrote++;
  console.log(`[${dbFile}] wrote ${created.length} customers (company ${companyId})`);
}
console.log(`database files updated: ${wrote}`);

// ---- 2) PostgreSQL ---------------------------------------------------------
async function syncPostgres() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });
  await client.connect();
  let total = 0;
  for (const dbFile of dbFiles) {
    const dbData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, dbFile), 'utf8'));
    if (!Array.isArray(dbData.customers)) continue;
    let companyId = 'comp_default_01';
    const cm = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
    if (cm) companyId = cm[1];
    else if (dbData.companyProfile && dbData.companyProfile.id) companyId = dbData.companyProfile.id;
    for (const c of dbData.customers) {
      const q = `
        INSERT INTO customers (
          id, company_id, code, account_code, manual_code, account_title, name, title, customer_group,
          reg_date, mobile, city, area, sector, location, address, status, opening_balance,
          opening_balance_type, outstanding_balance, credit_limit, total_sales, data, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
        ON CONFLICT (id) DO UPDATE SET
          company_id = EXCLUDED.company_id, code = EXCLUDED.code, account_code = EXCLUDED.account_code,
          manual_code = EXCLUDED.manual_code, account_title = EXCLUDED.account_title, name = EXCLUDED.name,
          title = EXCLUDED.title, customer_group = EXCLUDED.customer_group, reg_date = EXCLUDED.reg_date,
          mobile = EXCLUDED.mobile, city = EXCLUDED.city, area = EXCLUDED.area, sector = EXCLUDED.sector,
          location = EXCLUDED.location, address = EXCLUDED.address, status = EXCLUDED.status,
          opening_balance = EXCLUDED.opening_balance, opening_balance_type = EXCLUDED.opening_balance_type,
          outstanding_balance = EXCLUDED.outstanding_balance, credit_limit = EXCLUDED.credit_limit,
          total_sales = EXCLUDED.total_sales, data = EXCLUDED.data, updated_at = NOW();`;
      await client.query(q, [
        c.id, companyId, c.code, c.accountCode, c.manualCode || '', c.accountTitle, c.name, c.title,
        c.customerGroup, c.regDate || '', c.mobile || '', c.city || '', c.area || '', c.sector || '',
        c.location || '', c.address || '', c.status, c.openingBalance, c.openingBalanceType,
        c.outstandingBalance, c.creditLimit, c.totalSales, JSON.stringify(c),
      ]);
      total++;
    }
  }
  console.log(`PostgreSQL: ${total} customer rows upserted.`);
  await client.end();
}

// ---- 3) verification -------------------------------------------------------
function verify() {
  const dbData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'database.json'), 'utf8'));
  const cs = dbData.customers;
  let dr = 0;
  let cr = 0;
  for (const c of cs) {
    const b = Number(c.outstandingBalance) || 0;
    if (b > 0) dr += b;
    else cr += -b;
  }
  const net = round2(dr - cr);
  const sr = cs.map((c) => c.srNo);
  const badSr = sr.filter((s, i) => s !== i + 1).length;
  const dupIds = cs.length - new Set(cs.map((c) => c.id)).size;
  const badOpen = cs.filter((c) => Number(c.openingBalance) !== Math.abs(Number(c.outstandingBalance))).length;
  console.log('--- VERIFY ---');
  console.log(`customers: ${cs.length} (expect 152)`);
  console.log(`srNo 1..152 in order: ${badSr === 0}`);
  console.log(`DR: ${round2(dr).toFixed(2)} | CR: ${round2(cr).toFixed(2)} | NET: ${net.toFixed(2)} (expect 302163.55)`);
  console.log(`duplicate ids: ${dupIds} | opening==|outstanding|: ${badOpen === 0}`);
  const ok = cs.length === 152 && badSr === 0 && dupIds === 0 && badOpen === 0 && Math.abs(net - 302163.55) < 0.005;
  console.log(ok ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
  return ok;
}

syncPostgres()
  .then(() => process.exit(verify() ? 0 : 1))
  .catch((e) => {
    console.warn('PG sync failed (JSON updated):', e.message);
    process.exit(verify() ? 0 : 1);
  });
