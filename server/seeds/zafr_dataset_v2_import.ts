import fs from 'fs';
import path from 'path';
import { postgresService } from '../postgres';

const COMPANY_ID = 'comp-muocj00t-j3co';
const MARKER_KEY = 'zafr_dataset_v3_import';

interface DatasetV2Seed {
  meta: { key: string; companyId: string; counts: { customers: number; products: number; suppliers: number } };
  customers: any[];
  products: any[];
  suppliers: any[];
}

function loadSeed(): DatasetV2Seed | null {
  const candidates = [
    path.join(process.cwd(), 'server', 'seeds', 'zafr_dataset_v2.json'),
    path.join(process.cwd(), 'dist', 'seeds', 'zafr_dataset_v2.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      /* try next */
    }
  }
  return null;
}

async function deleteStale(table: 'customers' | 'suppliers' | 'products', keep: Set<string>): Promise<number> {
  const pool: any = (postgresService as any).pool;
  if (!pool) return 0;
  const res = await pool.query(`SELECT id FROM ${table} WHERE company_id = $1`, [COMPANY_ID]);
  const gone: string[] = res.rows.map((r: any) => r.id).filter((id: string) => !keep.has(id));
  if (gone.length) {
    await pool.query(`DELETE FROM ${table} WHERE company_id = $1 AND id = ANY($2::text[])`, [COMPANY_ID, gone]);
  }
  return gone.length;
}

/**
 * Applies the verified items-report.csv / customers.pdf / finalRecieveable.pdf /
 * payable.pdf dataset (367 items, 343 customers, 155 receivables, 41 payables)
 * to PostgreSQL. Runs once, before the tenant merge, guarded by a system marker.
 */
export async function runZafrDatasetV2Import(companyExists: (id: string) => boolean): Promise<void> {
  if (process.env.SKIP_ZAFR_IMPORT === 'true') return;
  if (!companyExists(COMPANY_ID)) return;

  try {
    const marker = await postgresService.getSystemSetting(MARKER_KEY);
    if (marker === 'done') return;

    const seed = loadSeed();
    if (!seed) {
      console.warn('[DatasetV2] seed file zafr_dataset_v2.json not found - skipping.');
      return;
    }

    const delC = await deleteStale('customers', new Set(seed.customers.map((c) => c.id)));
    const delS = await deleteStale('suppliers', new Set(seed.suppliers.map((s) => s.id)));
    const delP = await deleteStale('products', new Set(seed.products.map((p) => p.id)));

    for (const c of seed.customers) await postgresService.upsertCustomer(c, COMPANY_ID);
    for (const p of seed.products) await postgresService.upsertProduct(p, COMPANY_ID);
    for (const s of seed.suppliers) await postgresService.upsertSupplier(s, COMPANY_ID);

    await postgresService.setSystemSetting(MARKER_KEY, 'done');

    const receivable = seed.customers.reduce(
      (a: number, c: any) => a + Math.abs(Number(c.openingBalance) || 0) * (c.openingBalanceType === 'CR' ? -1 : 1),
      0
    );
    const payable = seed.suppliers.reduce((a: number, s: any) => a + (Number(s.payableToSupplier) || 0), 0);

    console.log(
      `[DatasetV2] Applied ${seed.customers.length} customers, ${seed.products.length} items, ` +
        `${seed.suppliers.length} suppliers (stale removed: customers=${delC} suppliers=${delS} products=${delP}). ` +
        `Receivable net DR ${receivable.toFixed(2)} | Payable CR ${payable.toFixed(2)}`
    );
  } catch (err: any) {
    console.warn('[DatasetV2] Import skipped due to error:', err?.message || err);
  }
}
