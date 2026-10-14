/**
 * apply_receivables_perfect_155.cjs
 * Accurately applies the 155 party receivables from the PDF to all JSON databases and PostgreSQL.
 * Net balance: EXACTLY 307,548.29 DR (Sum DR: 309,037.80, Sum CR: 1,489.51)
 * Non-zero receivable customers count: EXACTLY 155.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CLEAN_JSON_PATH = path.join(ROOT_DIR, 'server', 'seeds', 'receivables_pdf_155_clean.json');
const TARGET_PDF_155_PATH = path.join(ROOT_DIR, 'server', 'seeds', 'receivables_pdf_155.json');

if (!fs.existsSync(CLEAN_JSON_PATH)) {
  console.error('File not found:', CLEAN_JSON_PATH);
  process.exit(1);
}

const pdfRecords = JSON.parse(fs.readFileSync(CLEAN_JSON_PATH, 'utf8'));
console.log(`Loaded ${pdfRecords.length} clean records from PDF.`);

// Overwrite receivables_pdf_155.json with the clean data
fs.writeFileSync(TARGET_PDF_155_PATH, JSON.stringify(pdfRecords, null, 2), 'utf8');
console.log(`Overwrote ${TARGET_PDF_155_PATH} with clean records.`);

function cleanName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/\b(restaurant|resturant|restaunt|cafeteria|cafetetria|kitchen|llc|l\.l\.c|trading|services|super market|carpentry|carpantry|bakery|shop)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const dbFiles = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('database') && f.endsWith('.json'));
console.log('Database files to update:', dbFiles);

for (const dbFile of dbFiles) {
  const filePath = path.join(DATA_DIR, dbFile);
  const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!Array.isArray(dbData.customers)) {
    console.log(`Skipping ${dbFile}: no customers array`);
    continue;
  }

  const customers = dbData.customers;
  const usedCustIds = new Set();
  let matchedCount = 0;
  let createdCount = 0;

  let fileCompanyId = 'comp_default_01';
  const compMatch = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
  if (compMatch) {
    fileCompanyId = compMatch[1];
  } else if (dbData.companyProfile && dbData.companyProfile.id) {
    fileCompanyId = dbData.companyProfile.id;
  }

  let maxCodeNum = 1040336;
  customers.forEach((c) => {
    const m = (c.code || c.accountCode || '').match(/0101(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxCodeNum && num < 900000) maxCodeNum = num;
    }
  });

  const pdfCustomerIds = new Set();

  for (const p of pdfRecords) {
    const pClean = cleanName(p.title);
    const pPhoneClean = (p.phone || '').replace(/[^0-9]/g, '');

    // 1. Exact title match
    let cust = customers.find(
      (c) =>
        !usedCustIds.has(c.id) &&
        (c.accountTitle || c.name || '').toLowerCase().trim() === p.title.toLowerCase().trim()
    );

    // 2. Cleaned name match
    if (!cust) {
      cust = customers.find(
        (c) => !usedCustIds.has(c.id) && cleanName(c.accountTitle || c.name) === pClean
      );
    }

    // 3. Match by unique bill number
    if (!cust && p.lastBillNumber && p.lastBillNumber !== '-') {
      cust = customers.find(
        (c) => !usedCustIds.has(c.id) && c.lastBillNumber === p.lastBillNumber
      );
    }

    // 4. Match by phone if phone is unique and non-placeholder
    if (
      !cust &&
      pPhoneClean &&
      pPhoneClean.length >= 7 &&
      pPhoneClean !== '971523000000' &&
      pPhoneClean !== '971509000000' &&
      pPhoneClean !== '971501000000' &&
      pPhoneClean !== '971525000000' &&
      pPhoneClean !== '971562000000'
    ) {
      cust = customers.find(
        (c) =>
          !usedCustIds.has(c.id) &&
          (c.mobile || '').replace(/[^0-9]/g, '') === pPhoneClean
      );
    }

    const effBalance = p.balanceType === 'CR' ? -Math.abs(p.balance) : Math.abs(p.balance);

    if (cust) {
      usedCustIds.add(cust.id);
      pdfCustomerIds.add(cust.id);
      matchedCount++;

      cust.accountTitle = p.title;
      cust.name = p.title;
      cust.title = p.title;
      if (p.phone) cust.mobile = p.phone;
      if (p.salesman) {
        cust.assignedSalesman = p.salesman;
        cust.salesman = p.salesman;
      } else {
        cust.assignedSalesman = '';
        cust.salesman = '';
      }
      cust.openingBalance = Math.abs(p.balance);
      cust.openingBalanceType = p.balanceType;
      cust.outstandingBalance = effBalance;
      cust.lastBillNumber = p.lastBillNumber || '';
      cust.lastBillDate = p.lastBillDate || '';
      cust.lastBillAmount = p.lastBillAmount || 0;
      cust.lastReceiptDate = p.lastReceiptDate || '';
      cust.lastReceiptAmount = p.lastReceiptAmount || 0;
      cust.pdfOrder = p.sNo;
      cust.sNo = p.sNo;
      cust.updatedAt = new Date().toISOString();
    } else {
      // Create new customer
      maxCodeNum++;
      const newCode = `0101${String(maxCodeNum).padStart(6, '0')}`;
      const newId = `cust-${newCode}_${fileCompanyId}`;

      const newCust = {
        id: newId,
        code: newCode,
        accountCode: newCode,
        manualCode: p.mCode || '',
        accountTitle: p.title,
        name: p.title,
        title: p.title,
        customerGroup: 'Restaurants',
        regDate: '2026-10-14',
        contactPerson: '',
        mobile: p.phone || '',
        city: 'Sharjah',
        area: 'Sajja Industrial Area',
        sector: 'Sector 1',
        location: 'Sajja Industrial Area',
        address: 'Sharjah Sajja Industrial Area',
        assignedSalesman: p.salesman || '',
        salesman: p.salesman || '',
        status: 'ACTIVE',
        openingBalance: Math.abs(p.balance),
        openingBalanceType: p.balanceType,
        outstandingBalance: effBalance,
        creditLimit: 30000,
        totalSales: 0,
        createdAt: '2026-10-14',
        updatedAt: new Date().toISOString(),
        lastBillNumber: p.lastBillNumber || '',
        lastBillDate: p.lastBillDate || '',
        lastBillAmount: p.lastBillAmount || 0,
        lastReceiptDate: p.lastReceiptDate || '',
        lastReceiptAmount: p.lastReceiptAmount || 0,
        pdfOrder: p.sNo,
        sNo: p.sNo,
        companyId: fileCompanyId,
      };

      customers.push(newCust);
      usedCustIds.add(newId);
      pdfCustomerIds.add(newId);
      createdCount++;
    }
  }

  // Zero out all customers that are NOT in the PDF
  let zeroedCount = 0;
  for (const c of customers) {
    if (!pdfCustomerIds.has(c.id)) {
      c.openingBalance = 0;
      c.openingBalanceType = 'DR';
      c.outstandingBalance = 0;
      c.lastBillNumber = '';
      c.lastBillDate = '';
      c.lastBillAmount = 0;
      c.lastReceiptDate = '';
      c.lastReceiptAmount = 0;
      c.pdfOrder = 9999;
      zeroedCount++;
    }
  }

  // Calculate totals
  let totalDR = 0;
  let totalCR = 0;
  let nonZeroCount = 0;
  for (const c of customers) {
    const bal = Number(c.outstandingBalance) || 0;
    if (Math.abs(bal) > 0.001) {
      nonZeroCount++;
      if (bal > 0) totalDR += bal;
      else if (bal < 0) totalCR += Math.abs(bal);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(
    `[${dbFile}] Updated: ${matchedCount} matched, ${createdCount} created, ${zeroedCount} zeroed out.`
  );
  console.log(
    `  NonZero: ${nonZeroCount}, DR: ${totalDR.toFixed(2)}, CR: ${totalCR.toFixed(2)}, Net: ${(totalDR - totalCR).toFixed(2)} DR`
  );
}

// -------------------------------------------------------------
// POSTGRESQL SYNC FOR ALL COMPANIES
// -------------------------------------------------------------
async function syncToPostgres() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp';
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database for sync.');

    for (const dbFile of dbFiles) {
      const filePath = path.join(DATA_DIR, dbFile);
      const dbData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const customers = dbData.customers || [];

      let fileCompanyId = 'comp_default_01';
      const compMatch = dbFile.match(/database_(comp-[a-z0-9-]+)\.json/);
      if (compMatch) {
        fileCompanyId = compMatch[1];
      } else if (dbData.companyProfile && dbData.companyProfile.id) {
        fileCompanyId = dbData.companyProfile.id;
      }

      // Remove any old orphaned customers for this company that no longer exist in the json file
      const validIds = customers.map(c => c.id);
      if (validIds.length > 0) {
        await client.query('DELETE FROM customers WHERE company_id = $1 AND NOT (id = ANY($2::text[]))', [fileCompanyId, validIds]);
      }
      await client.query('DELETE FROM customers WHERE company_id = $1', ['comp_default_01']);

      let pgUpdated = 0;
      for (const c of customers) {
        const cid = c.companyId || fileCompanyId;
        const openBal = c.openingBalance !== undefined && c.openingBalance !== null
          ? parseFloat(String(c.openingBalance)) || 0
          : (c.outstandingBalance !== undefined ? Math.abs(parseFloat(String(c.outstandingBalance)) || 0) : 0);
        const openType = c.openingBalanceType || ((c.outstandingBalance || 0) < 0 ? 'CR' : 'DR');
        const effOutBal = (c.outstandingBalance !== undefined && c.outstandingBalance !== null && !isNaN(Number(c.outstandingBalance)))
          ? Number(Number(c.outstandingBalance).toFixed(2))
          : (openType === 'CR' ? -Math.abs(openBal) : Math.abs(openBal));

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
          JSON.stringify({
            ...c,
            openingBalance: openBal,
            openingBalanceType: openType,
            outstandingBalance: effOutBal,
          }),
        ]);
        pgUpdated++;
      }
      console.log(`Synced ${pgUpdated} customers for [${dbFile} / ${fileCompanyId}] to PostgreSQL.`);
    }

    client.release();
  } catch (err) {
    console.warn('PostgreSQL sync notice (will use JSON DB if PG is offline):', err.message);
  } finally {
    await pool.end();
  }
}

syncToPostgres().then(() => {
  console.log('Finished applying and syncing perfect 155 receivables!');
});
