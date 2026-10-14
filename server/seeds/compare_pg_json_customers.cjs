const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    await client.connect();

    const pgRes = await client.query(`
      SELECT 
        code,
        name,
        account_title,
        opening_balance,
        opening_balance_type,
        outstanding_balance
      FROM customers
      WHERE company_id = 'comp-muocj00t-j3co'
      ORDER BY code;
    `);

    const jsonPath = path.join(process.cwd(), 'server', 'seeds', 'all_337_customers.json');
    const jsonCusts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const pgMap = new Map();
    for (const r of pgRes.rows) {
      pgMap.set(r.code, r);
    }

    const jsonMap = new Map();
    for (const j of jsonCusts) {
      jsonMap.set(j.code, j);
    }

    console.log(`PostgreSQL has ${pgRes.rows.length} customers.`);
    console.log(`all_337_customers.json has ${jsonCusts.length} customers.`);

    // Find missing in PG
    const missingInPg = [];
    for (const [code, j] of jsonMap.entries()) {
      if (!pgMap.has(code)) {
        missingInPg.push({ code, title: j.accountTitle, balance: j.outstandingBalance });
      }
    }
    console.log(`Customers in JSON but missing in PG (${missingInPg.length}):`, JSON.stringify(missingInPg, null, 2));

    // Find balance differences
    const diffs = [];
    for (const [code, j] of jsonMap.entries()) {
      if (pgMap.has(code)) {
        const p = pgMap.get(code);
        const pBal = Number(p.outstanding_balance || 0);
        const jBal = Number(j.outstandingBalance || 0);
        if (Math.abs(pBal - jBal) > 0.001) {
          diffs.push({
            code,
            title: j.accountTitle,
            pgBal: pBal,
            jsonBal: jBal,
            diff: Number((pBal - jBal).toFixed(2)),
          });
        }
      }
    }
    console.log(`Customers with balance difference (${diffs.length}):`, JSON.stringify(diffs, null, 2));
  } catch (err) {
    console.error('Comparison error:', err);
  } finally {
    await client.end();
  }
}

main();
