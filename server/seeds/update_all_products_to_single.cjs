/**
 * Script: update_all_products_to_single.cjs
 * Sets packageType to 'Single' for all products across:
 * - All JSON database files in data/
 * - PostgreSQL products table for all companies
 * Ensures qtyInCarton is 1, carton is 0, and extraKg/pcs equals currentQuantity for single items.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');

// 1. Update all JSON database files
const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('database') && f.endsWith('.json'));
console.log(`Found ${jsonFiles.length} database JSON files to update.`);

for (const file of jsonFiles) {
  const filePath = path.join(DATA_DIR, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(data.products) && data.products.length > 0) {
      let updatedCount = 0;
      data.products = data.products.map(p => {
        updatedCount++;
        const currentQty = Math.max(0, Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0);
        return {
          ...p,
          packageType: 'Single',
          qtyInCarton: 1,
          carton: 0,
          ctn: 0,
          extraKg: currentQty,
          pcs: currentQty,
          totalStock: currentQty,
          currentQuantity: currentQty,
          ctnPurchaseRate: 0,
          ctnSaleRate: 0,
          ctnMinSaleRate: 0,
        };
      });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${updatedCount} products to 'Single' in ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

// Also check qamar_stock_items.json if it exists
const qamarStockFile = path.join(ROOT_DIR, 'server', 'seeds', 'qamar_stock_items.json');
if (fs.existsSync(qamarStockFile)) {
  try {
    const qamarItems = JSON.parse(fs.readFileSync(qamarStockFile, 'utf8'));
    const updatedQamar = qamarItems.map(p => {
      const currentQty = Math.max(0, Number(p.totalStock !== undefined ? p.totalStock : p.currentQuantity) || 0);
      return {
        ...p,
        packageType: 'Single',
        qtyInCarton: 1,
        carton: 0,
        ctn: 0,
        extraKg: currentQty,
        pcs: currentQty,
        totalStock: currentQty,
        currentQuantity: currentQty,
      };
    });
    fs.writeFileSync(qamarStockFile, JSON.stringify(updatedQamar, null, 2), 'utf8');
    console.log(`Updated ${updatedQamar.length} products to 'Single' in qamar_stock_items.json`);
  } catch (err) {
    console.error('Error updating qamar_stock_items.json:', err);
  }
}

// 2. Update PostgreSQL database
async function updatePostgres() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    await client.connect();
    console.log('\nConnected to PostgreSQL.');

    // Check if package_type column exists in products table
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'package_type';
    `);

    const hasPkgCol = colCheck.rows.length > 0;
    console.log(`products table has package_type column: ${hasPkgCol}`);

    // If package_type column exists, update it
    if (hasPkgCol) {
      await client.query(`UPDATE products SET package_type = 'Single';`);
    }

    // Update data JSON column for all products
    const rows = await client.query(`SELECT id, company_id, data, current_quantity FROM products;`);
    console.log(`Found ${rows.rows.length} products in PostgreSQL.`);

    let pgUpdated = 0;
    for (const r of rows.rows) {
      let pData = {};
      try {
        pData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      } catch (e) {
        pData = {};
      }

      const currentQty = Math.max(0, Number(pData.totalStock !== undefined ? pData.totalStock : (r.current_quantity || 0)));
      pData.packageType = 'Single';
      pData.qtyInCarton = 1;
      pData.carton = 0;
      pData.ctn = 0;
      pData.extraKg = currentQty;
      pData.pcs = currentQty;
      pData.totalStock = currentQty;
      pData.currentQuantity = currentQty;
      pData.ctnPurchaseRate = 0;
      pData.ctnSaleRate = 0;
      pData.ctnMinSaleRate = 0;

      await client.query(
        `UPDATE products SET data = $1, updated_at = NOW() WHERE id = $2;`,
        [JSON.stringify(pData), r.id]
      );
      pgUpdated++;
    }

    console.log(`Successfully updated ${pgUpdated} products to 'Single' in PostgreSQL.`);
  } catch (err) {
    console.error('PostgreSQL update error:', err);
  } finally {
    await client.end();
  }
}

updatePostgres();
