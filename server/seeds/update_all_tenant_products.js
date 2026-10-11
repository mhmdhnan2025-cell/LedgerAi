import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stockPath = path.join(__dirname, 'qamar_stock_items.json');
const products = JSON.parse(fs.readFileSync(stockPath, 'utf8'));

console.log(`Loaded ${products.length} stock products from seed.`);

const dataDir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dataDir).filter(f => f.startsWith('database') && f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(dataDir, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const db = JSON.parse(raw);

    // Derive companyId
    let cid = 'comp_default_01';
    if (file.includes('database_comp-')) {
      cid = file.replace('database_', '').replace('.json', '');
    } else if (db.companyProfile && db.companyProfile.id) {
      cid = db.companyProfile.id;
    }

    // Map products with companyId
    const companyProducts = products.map(p => ({
      ...p,
      companyId: cid,
    }));

    db.products = companyProducts;

    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`Updated ${companyProducts.length} products in ${file} (Company: ${cid})`);
  } catch (err) {
    console.error(`Failed to update ${file}:`, err.message);
  }
}

console.log('All database files updated successfully!');
