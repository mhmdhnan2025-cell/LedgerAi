import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const stockFile = path.join(__dirname, 'qamar_stock_items.json');
const products = JSON.parse(fs.readFileSync(stockFile, 'utf8'));

console.log(`Loaded ${products.length} stock products from ${stockFile}`);

async function syncPostgres() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully.');

    // Companies to sync
    const targetCompanies = [
      { cid: 'comp_default_01', prefix: 'def_' },
      { cid: 'comp-muocj00t-j3co', prefix: '' },
    ];

    for (const { cid, prefix } of targetCompanies) {
      console.log(`\n--- Syncing company: ${cid} ---`);

      // 1. Delete all existing products for this company so it matches the 364 items exactly
      const delRes = await client.query(
        `DELETE FROM products WHERE company_id = $1`,
        [cid]
      );
      console.log(`Deleted ${delRes.rowCount} old products from PostgreSQL for ${cid}`);

      // 2. Insert all 364 new products
      let inserted = 0;
      for (const p of products) {
        const prodId = prefix ? `${prefix}${p.id}` : p.id;
        const prodObj = {
          ...p,
          id: prodId,
          companyId: cid,
        };

        await client.query(
          `INSERT INTO products (
            id, company_id, sku, name, name_ur, category, brand, measure_unit,
            purchase_price, sale_price, current_quantity, min_quantity, wholesale_rate, retail_rate,
            data, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
          [
            prodId,
            cid,
            p.sku || '',
            p.name,
            p.nameUr || '',
            p.category || '',
            p.brand || '',
            p.measureUnit || p.measure || p.unit || '',
            p.purchasePrice || 0,
            p.salePrice || 0,
            p.currentQuantity || 0,
            p.minQuantity || 5,
            p.wholesaleRate || 0,
            p.retailRate || 0,
            JSON.stringify(prodObj),
          ]
        );
        inserted++;
      }
      console.log(`Inserted ${inserted} new stock products to PostgreSQL for ${cid}`);
    }

    client.release();
  } catch (err) {
    console.error('PostgreSQL sync error:', err.message);
  } finally {
    await pool.end();
  }
}

// Update all tenant database.json files in data/
function syncJsonFiles() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('database') && f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const db = JSON.parse(raw);

      let cid = 'comp_default_01';
      let prefix = 'def_';
      if (file.includes('database_comp-')) {
        cid = file.replace('database_', '').replace('.json', '');
        prefix = cid === 'comp_default_01' ? 'def_' : '';
      }

      // Filter out old qmr products and mock test items
      const existing = Array.isArray(db.products) ? db.products : [];
      const customProducts = existing.filter(
        p => !p.id?.startsWith('prod-qmr-') && !p.id?.startsWith('def_prod-qmr-') && !p.sku?.startsWith('SKU-QMR-') &&
             p.id !== 'prod-meet-873' && p.id !== 'prod-channa-217' && p.id !== 'prod-mix-achar-5-kg-432' && p.id !== 'prod-almond-397'
      );

      const newCompanyProducts = products.map(p => ({
        ...p,
        id: prefix ? `${prefix}${p.id}` : p.id,
        companyId: cid,
      }));

      db.products = [...newCompanyProducts, ...customProducts];

      fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
      console.log(`Updated ${db.products.length} products in ${file} (Company: ${cid})`);
    } catch (err) {
      console.error(`Failed to update ${file}:`, err.message);
    }
  }
}

async function main() {
  await syncPostgres();
  syncJsonFiles();
  console.log('\nAll data synchronized successfully!');
}

main();
