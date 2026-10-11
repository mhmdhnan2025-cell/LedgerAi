import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  // Clean up any old duplicate customer rows for comp-muocj00t-j3co that don't match the standard ID pattern
  const extraRes = await pool.query(
    "SELECT id, name, code, opening_balance FROM customers WHERE company_id = 'comp-muocj00t-j3co' AND id NOT LIKE '%_comp-muocj00t-j3co'"
  );
  if (extraRes.rows.length > 0) {
    console.log('Found orphaned rows:', extraRes.rows);
    await pool.query(
      "DELETE FROM customers WHERE company_id = 'comp-muocj00t-j3co' AND id NOT LIKE '%_comp-muocj00t-j3co'"
    );
    console.log(`Deleted ${extraRes.rows.length} orphaned rows from comp-muocj00t-j3co`);
  }

  const companies = ['comp_default_01', 'comp-muocj00t-j3co'];
  for (const cid of companies) {
    const res = await pool.query('SELECT opening_balance, opening_balance_type, outstanding_balance FROM customers WHERE company_id = $1', [cid]);
    let dr = 0, cr = 0, nonZero = 0;
    for (const r of res.rows) {
      const b = parseFloat(r.opening_balance);
      if (b > 0) {
        nonZero++;
        if (r.opening_balance_type === 'CR') cr += b;
        else dr += b;
      }
    }
    console.log(`[PG ${cid}] Total: ${res.rows.length}, Non-zero: ${nonZero}`);
    console.log(`  DR: ${dr.toFixed(2)}, CR: ${cr.toFixed(2)}, Net: ${(dr - cr).toFixed(2)} DR`);
  }
  await pool.end();

  // Also verify JSON files
  const files = [
    'data/database.json',
    'data/database_comp-muocj00t-j3co.json',
    'data/all_329_customers.json',
    'server/seeds/all_329_customers.json',
  ];

  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
    const list = Array.isArray(content) ? content : (content.customers || []);
    let dr = 0, cr = 0, nonZero = 0;
    for (const r of list) {
      const b = parseFloat(r.openingBalance || 0);
      if (b > 0) {
        nonZero++;
        if (r.openingBalanceType === 'CR') cr += b;
        else dr += b;
      }
    }
    console.log(`[JSON ${f}] Total: ${list.length}, Non-zero: ${nonZero}`);
    console.log(`  DR: ${dr.toFixed(2)}, CR: ${cr.toFixed(2)}, Net: ${(dr - cr).toFixed(2)} DR`);
  }
}

run();
