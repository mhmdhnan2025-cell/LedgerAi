/**
 * Seed Script: apply_pdf_152_receivables_new.cjs
 * Applies customers.pdf (337 rows, Report 15-10-2026) + receivebles new.pdf
 * (152 party receivable rows, 14-10-2026, NET 285,407.17 DR) to:
 *   - data/database*.json (default + tenants)
 *   - server/seeds/all_337_customers.json + data/all_337_customers.json
 *   - local PostgreSQL (per company)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const PDF_CUST = path.join(ROOT, 'server', 'seeds', 'customers_pdf_337_new.json');
const PDF_REC = path.join(ROOT, 'server', 'seeds', 'receivables_pdf_152_new.json');

const pdfCustomers = JSON.parse(fs.readFileSync(PDF_CUST, 'utf8'));
const pdfReceivables = JSON.parse(fs.readFileSync(PDF_REC, 'utf8'));
console.log(`Loaded customers PDF rows: ${pdfCustomers.length}, receivables PDF rows: ${pdfReceivables.length}`);

function cleanName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/\b(restaurant|resturant|restaunt|restuant|restutran|cafeteria|cafetetria|cafeteria|cafateria|cafteria|kitchen|llc|l\.l\.c|trading|tradimg|services|super market|carpentry|carpantry|carpentary|bakery|shop|bfc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

function isPlaceholderPhone(p) {
  return !p || p === '0' || p.toUpperCase() === 'NULL' || /^0+$/.test(p);
}

function parseMobiles(raw) {
  const out = [];
  const re = /(M1|M2|Ph)\s*:\s*([^\s]+)/gi;
  let m;
  while ((m = re.exec(raw || '')) !== null) {
    const val = m[2].trim();
    if (!isPlaceholderPhone(val)) out.push(val);
  }
  return out;
}

function toISODate(d) {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(-?\d{4})$/);
  if (!m) return d || '';
  let y = m[3];
  if (y.startsWith('-')) y = y.slice(1).padStart(4, '0');
  else y = y.padStart(4, '0');
  return `${y}-${m[2]}-${m[1]}`;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

const pdfByCode = new Map(pdfCustomers.map((p) => [p.code, p]));

function applyCustomerPdfFields(c) {
  const pc = pdfByCode.get(c.code || c.accountCode);
  if (!pc) return false;
  c.sNo = pc.sr;
  c.srNo = pc.sr;
  c.pdfOrder = pc.sr;
  c.regDate = toISODate(pc.date);
  c.reg_date = c.regDate;
  const emp = String(pc.employee || '').replace(/\s+/g, ' ').trim();
  c.assignedSalesman = emp;
  c.salesman = emp;
  const name = String(pc.name || '').replace(/\s+/g, ' ').trim();
  c.name = name;
  c.accountTitle = name;
  c.title = name;
  c.account_title = name;
  c.contactPerson = String(pc.contact || '').trim();
  c.rawMobiles = pc.mobileRaw || '';
  const phones = parseMobiles(pc.mobileRaw);
  c.mobile = phones[0] || '';
  c.mobile2 = phones[1] || '';
  c.area = String(pc.area || '').trim();
  c.sector = String(pc.sector || '').trim();
  c.city = String(pc.city || '').trim();
  c.location = c.area;
  c.address = [c.city, c.area].filter(Boolean).join(' ');
  return true;
}

function applyReceivableToCustomer(cust, r) {
  const bal = round2(Math.abs(r.balance));
  cust.name = r.title;
  cust.accountTitle = r.title;
  cust.title = r.title;
  cust.account_title = r.title;
  if (r.phone) {
    cust.mobile = r.phone;
  }
  if (r.salesman) {
    cust.assignedSalesman = r.salesman;
    cust.salesman = r.salesman;
  }
  cust.openingBalance = bal;
  cust.openingBalanceType = r.balanceType;
  cust.opening_balance = bal;
  cust.opening_balance_type = r.balanceType;
  cust.outstandingBalance = r.balanceType === 'CR' ? -bal : bal;
  cust.outstanding_balance = cust.outstandingBalance;
  cust.lastBillNumber = r.lastBillNumber || '';
  cust.lastBillDate = r.lastBillDate || '';
  cust.lastBillAmount = r.lastBillAmount || 0;
  cust.lastReceiptDate = r.lastReceiptDate || '';
  cust.lastReceiptAmount = r.lastReceiptAmount || 0;
}

function zeroCustomerBalances(c) {
  c.openingBalance = 0;
  c.openingBalanceType = 'DR';
  c.opening_balance = 0;
  c.opening_balance_type = 'DR';
  c.outstandingBalance = 0;
  c.outstanding_balance = 0;
  c.lastBillNumber = '';
  c.lastBillDate = '';
  c.lastBillAmount = 0;
  c.lastReceiptDate = '';
  c.lastReceiptAmount = 0;
}

function matchReceivables(customers, label) {
  const byTitle = new Map();
  const byClean = new Map();
  const byPhone = new Map();
  for (const c of customers) {
    const t = (c.accountTitle || c.name || '').toLowerCase().trim();
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t).push(c);
    const k = cleanName(c.accountTitle || c.name);
    if (!byClean.has(k)) byClean.set(k, []);
    byClean.get(k).push(c);
    const phones = [...parseMobiles(c.rawMobiles), ...(c.mobile ? [c.mobile] : [])];
    for (const p of phones) {
      const d = p.replace(/\D/g, '');
      if (d.length >= 7) {
        if (!byPhone.has(d)) byPhone.set(d, []);
        byPhone.get(d).push(c);
      }
    }
  }
  const used = new Set();
  const matchedPairs = [];
  const unmatched = [];
  for (const r of pdfReceivables) {
    let c = null;
    const t = r.title.toLowerCase().trim();
    if (byTitle.has(t)) c = byTitle.get(t).find((x) => !used.has(x)) || null;
    if (!c && byClean.has(cleanName(r.title))) c = byClean.get(cleanName(r.title)).find((x) => !used.has(x)) || null;
    if (!c) {
      const d = (r.phone || '').replace(/\D/g, '');
      if (d.length >= 7 && byPhone.has(d)) c = byPhone.get(d).find((x) => !used.has(x)) || null;
    }
    if (!c) {
      unmatched.push(r);
      continue;
    }
    used.add(c);
    applyReceivableToCustomer(c, r);
    matchedPairs.push({ r, c });
  }
  const matchedCust = used;
  for (const c of customers) {
    if (!matchedCust.has(c)) zeroCustomerBalances(c);
  }
  let net = 0;
  for (const c of customers) net += Number(c.outstandingBalance) || 0;
  net = round2(net);
  console.log(
    `[${label}] receivables matched: ${matchedPairs.length}/${pdfReceivables.length}, unmatched: ${unmatched.length}, withBalance: ${customers.filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001).length}, net: ${net.toFixed(2)}`
  );
  unmatched.forEach((u) => console.log(`   UNMATCHED: sNo ${u.sNo} "${u.title}" ${u.balance} ${u.balanceType}`));
  return { matchedPairs, unmatched, net };
}

// ---------------------------------------------------------------
// 1) data/database*.json
// ---------------------------------------------------------------
const dbFiles = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^database.*\.json$/.test(f) && !f.includes('all_337') && !f.includes('329'));
console.log('Database files:', dbFiles);

const fileReports = [];
for (const dbFile of dbFiles) {
  const filePath = path.join(DATA_DIR, dbFile);
  const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(dbData.customers)) {
    console.log(`[${dbFile}] no customers array - skipped`);
    continue;
  }
  const customers = dbData.customers;
  let pdfMatched = 0;
  let extras = 0;
  for (const c of customers) {
    if (applyCustomerPdfFields(c)) pdfMatched++;
    else extras++;
  }
  // create any PDF customers missing in this file (guard against dups by code)
  let created = 0;
  const haveCodes = new Set(customers.map((c) => c.code || c.accountCode));
  let fileCompanyId = 'comp_default_01';
  const compMatch = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
  if (compMatch) fileCompanyId = compMatch[1];
  else if (dbData.companyProfile && dbData.companyProfile.id) fileCompanyId = dbData.companyProfile.id;
  for (const pc of pdfCustomers) {
    if (haveCodes.has(pc.code)) continue;
    const cust = {
      id: `cust-${pc.code}_${fileCompanyId}`,
      companyId: fileCompanyId,
      code: pc.code,
      accountCode: pc.code,
      manualCode: '',
      customerGroup: 'Restaurants',
      creditLimit: 30000,
      totalSales: 0,
      status: 'ACTIVE',
      createdAt: toISODate(pc.date),
    };
    customers.push(cust);
    applyCustomerPdfFields(cust);
    created++;
  }
  const { unmatched, net } = matchReceivables(customers, dbFile);
  for (const c of customers) c.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf8');
  const withBal = customers.filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001).length;
  fileReports.push({ dbFile, total: customers.length, pdfMatched, extras, created, unmatched: unmatched.length, withBal, net });
  console.log(`[${dbFile}] wrote: ${customers.length} customers (pdfMatched ${pdfMatched}, extras zeroed ${extras}, created ${created})`);
}

// ---------------------------------------------------------------
// 2) Seed files (preserve ids/companyId, update fields + balances)
// ---------------------------------------------------------------
for (const seedRel of [path.join('server', 'seeds', 'all_337_customers.json'), path.join('data', 'all_337_customers.json')]) {
  const seedPath = path.join(ROOT, seedRel);
  if (!fs.existsSync(seedPath)) {
    console.log(`Seed not found: ${seedRel} - skipped`);
    continue;
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let m = 0;
  for (const c of seed) {
    if (applyCustomerPdfFields(c)) m++;
  }
  matchReceivables(seed, seedRel);
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf8');
  console.log(`[${seedRel}] updated ${m}/${seed.length} customers (ids preserved)`);
}

// ---------------------------------------------------------------
// 3) PostgreSQL sync (all companies from database files)
// ---------------------------------------------------------------
async function syncToPostgres() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp';
  const pool = new Pool({ connectionString });
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL.');
    let total = 0;
    for (const dbFile of dbFiles) {
      const filePath = path.join(DATA_DIR, dbFile);
      const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(dbData.customers)) continue;
      let fileCompanyId = 'comp_default_01';
      const compMatch = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
      if (compMatch) fileCompanyId = compMatch[1];
      else if (dbData.companyProfile && dbData.companyProfile.id) fileCompanyId = dbData.companyProfile.id;
      for (const c of dbData.customers) {
        const cid = c.companyId || fileCompanyId;
        const openBal = Number(c.openingBalance) || 0;
        const openType = c.openingBalanceType || 'DR';
        const effOutBal = round2(Number(c.outstandingBalance) || 0);
        const q = `
          INSERT INTO customers (
            id, company_id, code, account_code, manual_code, account_title, name, title, customer_group,
            reg_date, mobile, city, area, sector, location, address, status, opening_balance,
            opening_balance_type, outstanding_balance, credit_limit, total_sales, data, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            code = EXCLUDED.code,
            account_code = EXCLUDED.account_code,
            manual_code = EXCLUDED.manual_code,
            account_title = EXCLUDED.account_title,
            name = EXCLUDED.name,
            title = EXCLUDED.title,
            customer_group = EXCLUDED.customer_group,
            reg_date = EXCLUDED.reg_date,
            mobile = EXCLUDED.mobile,
            city = EXCLUDED.city,
            area = EXCLUDED.area,
            sector = EXCLUDED.sector,
            location = EXCLUDED.location,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            opening_balance = EXCLUDED.opening_balance,
            opening_balance_type = EXCLUDED.opening_balance_type,
            outstanding_balance = EXCLUDED.outstanding_balance,
            credit_limit = EXCLUDED.credit_limit,
            total_sales = EXCLUDED.total_sales,
            data = EXCLUDED.data,
            updated_at = NOW();
        `;
        await client.query(q, [
          c.id,
          cid,
          c.code || c.accountCode || '',
          c.accountCode || c.code || '',
          c.manualCode || '',
          c.accountTitle || c.name || '',
          c.name || c.accountTitle || '',
          c.title || c.accountTitle || '',
          c.customerGroup || 'Restaurants',
          c.regDate || '2026-04-18',
          c.mobile || '',
          c.city || '',
          c.area || '',
          c.sector || '',
          c.location || '',
          c.address || '',
          c.status || 'ACTIVE',
          openBal,
          openType,
          effOutBal,
          c.creditLimit || 30000,
          c.totalSales || 0,
          JSON.stringify(c),
        ]);
        total++;
      }
      console.log(`[PG] synced ${dbFile} (${dbData.customers.length} customers, company ${fileCompanyId})`);
    }
    console.log(`PostgreSQL sync complete: ${total} customer rows upserted.`);
  } catch (err) {
    console.warn('PostgreSQL sync failed (JSON DBs updated):', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// ---------------------------------------------------------------
// 4) Final verification from default database.json
// ---------------------------------------------------------------
function verifyDefault() {
  const dbData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'database.json'), 'utf8'));
  const customers = dbData.customers;
  const withBal = customers.filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001);
  let dr = 0, cr = 0;
  for (const c of withBal) {
    const b = Number(c.outstandingBalance);
    if (b > 0) dr += b; else cr += -b;
  }
  const net = round2(dr - cr);
  console.log('--- VERIFY default database.json ---');
  console.log(`customers: ${customers.length} (expect 337)`);
  console.log(`with balance: ${withBal.length} (expect 152)`);
  console.log(`DR: ${round2(dr).toFixed(2)} | CR: ${round2(cr).toFixed(2)} | NET: ${net.toFixed(2)} (expect 285407.17)`);
  const badOb = withBal.filter((c) => Number(c.openingBalance) !== Math.abs(Number(c.outstandingBalance)));
  console.log(`openingBalance == |outstanding| for all: ${badOb.length === 0}`);
  const noDupCodes = new Set(customers.map((c) => c.code)).size === customers.length;
  console.log(`no duplicate codes: ${noDupCodes}`);
  const ok =
    customers.length === 337 && withBal.length === 152 && Math.abs(net - 285407.17) < 0.005 && badOb.length === 0 && noDupCodes;
  console.log(ok ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
  return ok;
}

syncToPostgres().then(() => {
  const ok = verifyDefault();
  process.exit(ok ? 0 : 1);
});
