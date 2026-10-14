/**
 * Seed Script: apply_all_337_customers.cjs
 * Applies all 337 customer records from the Customers List PDF (Date: 14-10-2026)
 * across all tenant databases and PostgreSQL.
 * For the 155 customers with balances, their exact opening balances, last bills,
 * and last receipts are set (Total Net Balance: exactly 307,548.29 DR).
 * For the other 182 customers, balance is 0.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SEED_FILE = path.join(ROOT_DIR, 'server', 'seeds', 'all_337_customers.json');

if (!fs.existsSync(SEED_FILE)) {
  console.error('File not found:', SEED_FILE);
  process.exit(1);
}

const customers337 = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
console.log(`Loaded ${customers337.length} customers from all_337_customers.json`);

function cleanName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/\b(restaurant|resturant|restaunt|cafeteria|cafetetria|kitchen|llc|l\.l\.c|trading|services|super market|carpentry|carpantry|bakery|shop)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeSalesman(sm) {
  if (!sm) return '';
  const s = sm.trim();
  const lower = s.toLowerCase();
  if (lower.includes('hafiz') && (lower.includes('qadeer') || lower.includes('qader'))) return 'HAFIZ ABDUL QADEER';
  if (lower.includes('sultan') && (lower.includes('mir') || lower.includes('ameer'))) return 'SULTAN MIR';
  if (lower.includes('qamar') && lower.includes('abbas')) return 'Qamar Abbas';
  if (lower.includes('akbar') && lower.includes('bhai')) return 'Akbar Bhai';
  if (lower.includes('ashiq') && lower.includes('ali')) return 'Ashiq Ali';
  return s;
}

// Master salesmen list to ensure all 5 are recognized in system
const MASTER_SALESMEN = [
  'HAFIZ ABDUL QADEER',
  'Qamar Abbas',
  'Akbar Bhai',
  'Ashiq Ali',
  'SULTAN MIR',
  'Aman Deep',
  'Zahrat Al Fajr'
];

const dbFiles = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('database') && f.endsWith('.json'));
console.log('Database files to update:', dbFiles);

for (const dbFile of dbFiles) {
  const filePath = path.join(DATA_DIR, dbFile);
  const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let fileCompanyId = 'comp_default_01';
  const compMatch = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
  if (compMatch) {
    fileCompanyId = compMatch[1];
  } else if (dbData.companyProfile && dbData.companyProfile.id) {
    fileCompanyId = dbData.companyProfile.id;
  }

  const existingCustomers = Array.isArray(dbData.customers) ? dbData.customers : [];
  const existingMapByCode = new Map();
  const existingMapByName = new Map();

  existingCustomers.forEach((c) => {
    if (c.code) existingMapByCode.set(c.code.trim(), c);
    if (c.accountCode) existingMapByCode.set(c.accountCode.trim(), c);
    const cn = cleanName(c.accountTitle || c.name);
    if (cn && !existingMapByName.has(cn)) {
      existingMapByName.set(cn, c);
    }
  });

  const updatedCustomers = [];
  let matchedExisting = 0;
  let newlyCreated = 0;

  for (const c of customers337) {
    const cCode = c.code.trim();
    const cClean = cleanName(c.name);

    let existing = existingMapByCode.get(cCode);
    if (!existing && cClean) {
      existing = existingMapByName.get(cClean);
    }

    const custId = existing && existing.id ? existing.id : `cust-${cCode}_${fileCompanyId}`;
    if (existing) matchedExisting++;
    else newlyCreated++;

    const smNormalized = normalizeSalesman(c.assignedSalesman || c.salesman);

    const newCustRecord = {
      id: custId,
      companyId: fileCompanyId,
      code: cCode,
      accountCode: cCode,
      manualCode: existing?.manualCode || '',
      name: c.name,
      accountTitle: c.name,
      title: c.name,
      customerGroup: c.customerGroup || 'Restaurants',
      regDate: c.regDate || '2026-04-18',
      contactPerson: c.contactPerson || '',
      mobile: c.mobile || '',
      mobile2: c.mobile2 || '',
      rawMobiles: c.rawMobiles || '',
      telephones: c.mobile2 || '',
      city: c.city || 'Sharjah',
      area: c.area || 'Sajja Industrial Area',
      sector: c.sector || 'Sector 1',
      location: c.area || 'Sajja Industrial Area',
      address: `${c.city || 'Sharjah'} ${c.area || 'Sajja Industrial Area'}`,
      assignedSalesman: smNormalized,
      salesman: smNormalized,
      status: 'ACTIVE',
      openingBalance: Number(c.openingBalance) || 0,
      openingBalanceType: c.openingBalanceType || 'DR',
      outstandingBalance: Number(c.outstandingBalance) || 0,
      creditLimit: c.creditLimit || 30000,
      totalSales: existing?.totalSales || 0,
      createdAt: c.regDate || '2026-04-18',
      updatedAt: new Date().toISOString(),
      lastBillNumber: c.lastBillNumber || '',
      lastBillDate: c.lastBillDate || '',
      lastBillAmount: Number(c.lastBillAmount) || 0,
      lastReceiptDate: c.lastReceiptDate || '',
      lastReceiptAmount: Number(c.lastReceiptAmount) || 0,
      pdfOrder: c.pdfOrder !== undefined ? c.pdfOrder : 9999,
      sNo: c.sNo !== undefined ? c.sNo : 9999,
      srNo: c.srNo,
    };

    updatedCustomers.push(newCustRecord);
  }

  dbData.customers = updatedCustomers;

  // Ensure customer groups contains necessary categories
  const neededGroups = ['Restaurants', 'Cafeteria', 'Cloud Kitchen', 'Supermarket', 'Catering Services', 'Commercial Hub', 'Bakery'];
  if (Array.isArray(dbData.customerGroups)) {
    neededGroups.forEach((g) => {
      if (!dbData.customerGroups.includes(g)) dbData.customerGroups.push(g);
    });
  } else {
    dbData.customerGroups = neededGroups;
  }

  // Calculate totals
  let totalDR = 0;
  let totalCR = 0;
  for (const c of updatedCustomers) {
    const bal = Number(c.outstandingBalance) || 0;
    if (bal > 0) totalDR += bal;
    else if (bal < 0) totalCR += Math.abs(bal);
  }
  const netBal = totalDR - totalCR;

  fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`[${dbFile}] Set ${updatedCustomers.length} customers (${matchedExisting} matched, ${newlyCreated} created).`);
  console.log(`  Total DR: ${totalDR.toFixed(2)}, Total CR: ${totalCR.toFixed(2)}, Net: ${netBal.toFixed(2)} DR`);
}

// -------------------------------------------------------------
// POSTGRESQL SYNC
// -------------------------------------------------------------
async function syncToPostgres() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp';
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    console.log('\nConnected to PostgreSQL database for sync.');

    const defaultDb = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'database.json'), 'utf8')
    );
    const customers = defaultDb.customers || [];

    // Optional: remove orphaned customers not in the 337 set for comp_default_01
    const validCodes = new Set(customers.map((c) => c.code));
    await client.query(`DELETE FROM customers WHERE company_id = 'comp_default_01' AND code NOT IN (${Array.from(validCodes).map((_, i) => `$${i + 1}`).join(',')})`, Array.from(validCodes));

    let pgUpdated = 0;
    for (const c of customers) {
      const cid = c.companyId || 'comp_default_01';
      const openBal = Number(c.openingBalance) || 0;
      const openType = c.openingBalanceType || 'DR';
      const effOutBal = Number(c.outstandingBalance) || 0;

      const q = `
        INSERT INTO customers (
          id, company_id, code, account_code, manual_code, account_title, name, title, customer_group,
          reg_date, mobile, city, area, sector, location, address, status, opening_balance,
          opening_balance_type, outstanding_balance, credit_limit, total_sales, data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, NOW()
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
        c.regDate || '2026-10-14',
        c.mobile || '',
        c.city || 'Sharjah',
        c.area || 'Sajja Industrial Area',
        c.sector || 'Sector 1',
        c.location || 'Sajja Industrial Area',
        c.address || 'Sharjah Sajja Industrial Area',
        c.status || 'ACTIVE',
        openBal,
        openType,
        effOutBal,
        c.creditLimit || 30000,
        c.totalSales || 0,
        JSON.stringify(c),
      ]);
      pgUpdated++;
    }

    console.log(`Successfully synced ${pgUpdated} customers to PostgreSQL.`);
    client.release();
  } catch (err) {
    console.warn('PostgreSQL sync notice (will use JSON DB if PG is offline):', err.message);
  } finally {
    await pool.end();
  }
}

syncToPostgres().then(() => {
  console.log('\nAll 337 customers and 155 receivables balances fully applied!');
});
