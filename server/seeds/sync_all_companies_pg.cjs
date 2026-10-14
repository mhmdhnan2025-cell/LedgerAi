/**
 * Seed & Sync Script: sync_all_companies_pg.cjs
 * Synchronizes all 337 customers and their authoritative balances (155 non-zero, net 307,548.29 DR)
 * across EVERY tenant company in PostgreSQL, including 'comp-muocj00t-j3co' and 'comp_default_01'.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT_DIR = process.cwd();
const SEED_FILE = path.join(ROOT_DIR, 'server', 'seeds', 'all_337_customers.json');

if (!fs.existsSync(SEED_FILE)) {
  console.error('File not found:', SEED_FILE);
  process.exit(1);
}

const customers337 = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
console.log(`Loaded ${customers337.length} customers from ${SEED_FILE}`);

// Verify dataset totals before doing anything
let testDR = 0;
let testCR = 0;
let nonZeroCount = 0;
for (const c of customers337) {
  const bal = Number(c.outstandingBalance) || 0;
  if (Math.abs(bal) > 0.001) {
    nonZeroCount++;
    if (bal > 0) testDR += bal;
    else testCR += Math.abs(bal);
  }
}
const testNet = Number((testDR - testCR).toFixed(2));
console.log(`Verification of seed file:`);
console.log(`  Total Customers: ${customers337.length}`);
console.log(`  Non-zero Count: ${nonZeroCount}`);
console.log(`  Total DR: ${testDR.toFixed(2)}, Total CR: ${testCR.toFixed(2)}, Net: ${testNet.toFixed(2)} DR`);

if (customers337.length !== 337 || nonZeroCount !== 155 || testNet !== 307548.29) {
  console.error('Seed file validation failed! Expected 337 custs, 155 non-zero, 307548.29 net DR.');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Fetch all company IDs in the system
    const compRows = await client.query(`
      SELECT id FROM companies
      UNION
      SELECT DISTINCT company_id AS id FROM users WHERE company_id IS NOT NULL AND company_id != ''
      UNION
      SELECT DISTINCT company_id AS id FROM customers WHERE company_id IS NOT NULL AND company_id != ''
    `);

    const companyIds = Array.from(new Set(compRows.rows.map(r => r.id).filter(Boolean)));
    if (!companyIds.includes('comp_default_01')) companyIds.push('comp_default_01');
    if (!companyIds.includes('comp-muocj00t-j3co')) companyIds.push('comp-muocj00t-j3co');

    console.log(`Found ${companyIds.length} companies to sync:`, companyIds);

    for (const compId of companyIds) {
      console.log(`\n--- Syncing company: ${compId} ---`);

      // Clean delete existing customers for this company to avoid old ID duplicates
      await client.query('DELETE FROM customers WHERE company_id = $1;', [compId]);

      // Insert all 337 customers
      let insertCount = 0;
      for (const c of customers337) {
        const cCode = c.code.trim();
        const custId = `cust-${cCode}_${compId}`;
        const openBal = Number(c.openingBalance) || 0;
        const openType = c.openingBalanceType || 'DR';
        const outBal = Number(c.outstandingBalance) || 0;

        const customerPayload = {
          ...c,
          id: custId,
          companyId: compId,
          code: cCode,
          accountCode: cCode,
          manualCode: c.manualCode || '',
          name: c.name,
          accountTitle: c.name,
          title: c.name,
          customerGroup: c.customerGroup || 'Restaurants',
          regDate: c.regDate || '2026-04-18',
          contactPerson: c.contactPerson || '',
          mobile: c.mobile || '',
          mobile2: c.mobile2 || '',
          rawMobiles: c.rawMobiles || '',
          city: c.city || 'Sharjah',
          area: c.area || 'Sajja Industrial Area',
          sector: c.sector || 'Sector 1',
          location: c.area || 'Sajja Industrial Area',
          address: `${c.city || 'Sharjah'} ${c.area || 'Sajja Industrial Area'}`,
          assignedSalesman: c.assignedSalesman || c.salesman || '',
          salesman: c.salesman || c.assignedSalesman || '',
          status: 'ACTIVE',
          openingBalance: openBal,
          openingBalanceType: openType,
          outstandingBalance: outBal,
          creditLimit: c.creditLimit || 30000,
          totalSales: c.totalSales || 0,
          lastBillNumber: c.lastBillNumber || '',
          lastBillDate: c.lastBillDate || '',
          lastBillAmount: Number(c.lastBillAmount) || 0,
          lastReceiptDate: c.lastReceiptDate || '',
          lastReceiptAmount: Number(c.lastReceiptAmount) || 0,
          pdfOrder: c.pdfOrder !== undefined ? c.pdfOrder : 9999,
          sNo: c.sNo !== undefined ? c.sNo : (c.pdfOrder !== undefined ? c.pdfOrder : 9999),
          srNo: c.srNo,
          updatedAt: new Date().toISOString(),
        };

        const insertQuery = `
          INSERT INTO customers (
            id, company_id, code, account_code, manual_code, account_title, name, title, customer_group,
            reg_date, mobile, city, area, sector, location, address, status, opening_balance,
            opening_balance_type, outstanding_balance, credit_limit, total_sales, data, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, NOW()
          );
        `;

        await client.query(insertQuery, [
          custId,
          compId,
          cCode,
          cCode,
          c.manualCode || '',
          c.name,
          c.name,
          c.name,
          c.customerGroup || 'Restaurants',
          c.regDate || '2026-04-18',
          c.mobile || '',
          c.city || 'Sharjah',
          c.area || 'Sajja Industrial Area',
          c.sector || 'Sector 1',
          c.location || 'Sajja Industrial Area',
          `${c.city || 'Sharjah'} ${c.area || 'Sajja Industrial Area'}`,
          'ACTIVE',
          openBal,
          openType,
          outBal,
          c.creditLimit || 30000,
          0,
          JSON.stringify(customerPayload),
        ]);
        insertCount++;
      }
      console.log(`  Inserted ${insertCount} customers for ${compId}.`);

      // Verify PostgreSQL totals for this company
      const vRes = await client.query(`
        SELECT 
          COUNT(1)::int AS total_count,
          COUNT(1) FILTER (WHERE ABS(outstanding_balance) > 0.001)::int AS non_zero_count,
          ROUND(COALESCE(SUM(outstanding_balance), 0), 2)::float AS total_outstanding
        FROM customers
        WHERE company_id = $1;
      `, [compId]);

      console.log(`  PostgreSQL Result for ${compId}:`, vRes.rows[0]);
    }

    console.log('\n--- Final System-Wide Verification across all companies ---');
    const allSummary = await client.query(`
      SELECT 
        company_id,
        COUNT(1)::int AS total_count,
        COUNT(1) FILTER (WHERE ABS(outstanding_balance) > 0.001)::int AS non_zero_count,
        ROUND(COALESCE(SUM(outstanding_balance), 0), 2)::float AS total_outstanding
      FROM customers
      GROUP BY company_id
      ORDER BY company_id;
    `);
    console.log(JSON.stringify(allSummary.rows, null, 2));

  } catch (err) {
    console.error('Error during PostgreSQL customer synchronization:', err);
  } finally {
    await client.end();
  }
}

main();
