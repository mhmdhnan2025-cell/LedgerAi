/**
 * Syncs data/database_comp-muocj00t-j3co.json into PostgreSQL and prints
 * verification counts/totals for all four imported datasets.
 * Run: npx tsx scripts/sync_pg_after_import.ts
 */
import fs from 'fs';
import path from 'path';
import { postgresService } from '../server/postgres';

const ROOT = process.cwd();
const COMPANY = 'comp-muocj00t-j3co';
const TENANT_FILE = path.join(ROOT, 'data', `database_${COMPANY}.json`);

const r2 = (n: number) => Math.round(Number(n) * 100) / 100;

async function main() {
  const status = await postgresService.testConnection();
  if (!status.connected) {
    console.error('PostgreSQL not reachable:', status.error);
    process.exit(1);
  }
  await postgresService.initSchema();

  const tenant = JSON.parse(fs.readFileSync(TENANT_FILE, 'utf8'));
  const keepCustomers = new Set<string>(tenant.customers.map((c: any) => c.id));
  const keepSuppliers = new Set<string>(tenant.suppliers.map((s: any) => s.id));
  const keepProducts = new Set<string>(tenant.products.map((p: any) => p.id));

  // remove rows that no longer exist in the JSON snapshot
  const pool: any = (postgresService as any).pool;
  const stale = async (table: string, keep: Set<string>) => {
    const res = await pool.query(`SELECT id FROM ${table} WHERE company_id = $1`, [COMPANY]);
    const gone = res.rows.map((r: any) => r.id).filter((id: string) => !keep.has(id));
    if (gone.length) {
      await pool.query(`DELETE FROM ${table} WHERE company_id = $1 AND id = ANY($2::text[])`, [COMPANY, gone]);
    }
    return gone.length;
  };

  const delC = await stale('customers', keepCustomers);
  const delS = await stale('suppliers', keepSuppliers);
  const delP = await stale('products', keepProducts);
  console.log(`[stale] removed customers=${delC} suppliers=${delS} products=${delP}`);

  const result = await postgresService.migrateFullSnapshotToPostgres(tenant, COMPANY);
  if (!result.success) {
    console.error('migrate failed:', result.message);
    process.exit(1);
  }
  console.log('[sync] counts:', JSON.stringify(result.counts));

  // ---- verification -------------------------------------------------------
  const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

  const cust = (await q(
    `SELECT count(*)::int n, coalesce(sum(opening_balance)::numeric,0) open_total,
            coalesce(sum(outstanding_balance)::numeric,0) out_total FROM customers WHERE company_id=$1`,
    [COMPANY]
  ))[0];
  const custWithBal = (await q(
    `SELECT count(*)::int n FROM customers WHERE company_id=$1 AND opening_balance <> 0`,
    [COMPANY]
  ))[0];
  const custCr = (await q(
    `SELECT count(*)::int n FROM customers WHERE company_id=$1 AND opening_balance_type='CR'`,
    [COMPANY]
  ))[0];
  const cat = (await q(
    `SELECT category, count(*)::int n FROM products WHERE company_id=$1 GROUP BY category ORDER BY n DESC`,
    [COMPANY]
  )).map((r: any) => `${r.category}=${r.n}`);
  const prod = (await q(
    `SELECT count(*)::int n, coalesce(sum(current_quantity)::numeric,0) qty,
            coalesce(min(current_quantity),0) minq, coalesce(max(current_quantity),0) maxq
     FROM products WHERE company_id=$1`,
    [COMPANY]
  ))[0];
  const sup = (await q(
    `SELECT count(*)::int n, coalesce(sum(payable_to_supplier)::numeric,0) total,
            count(*) FILTER (WHERE payable_to_supplier <> 0)::int nz FROM suppliers WHERE company_id=$1`,
    [COMPANY]
  ))[0];

  console.log('');
  console.log('=== POSTGRES VERIFICATION (ZAHRAT AL FAJR) ===');
  console.log(`products   : ${prod.n} | category ${cat.join(', ')} | qty ${prod.qty} (min ${prod.minq} / max ${prod.maxq})`);
  console.log(`customers  : ${cust.n} | with receivable ${custWithBal.n} | CR rows ${custCr.n}`);
  console.log(`             opening total ${r2(Number(cust.open_total))} | outstanding total ${r2(Number(cust.out_total))}`);
  console.log(`suppliers  : ${sup.n} | with payable ${sup.nz} | payable total CR ${r2(Number(sup.total))}`);
  console.log(`(expected receivable NET DR 357555.34 | payable CR 1270661.91)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
