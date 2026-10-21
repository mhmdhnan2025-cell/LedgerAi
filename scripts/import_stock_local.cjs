const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const COMPANY = 'comp-muocj00t-j3co';
const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'items-report.csv');
const JSON_PATH = path.join(ROOT, 'data', `database_${COMPANY}.json`);

const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const DB_URL = (envText.match(/DATABASE_URL\s*=\s*"([^"]+)"/) || [])[1];
if (!DB_URL) throw new Error('DATABASE_URL not found in .env');

function categorize(name) {
  const n = name.toLowerCase();
  if (n.includes('tea') || n.includes('chai') || n.includes('lipton') || n.includes('alokozay') || n.includes('karak') || n.includes('coffee') || n.includes('nescafe')) return 'Tea & Coffee';
  if (n.includes('oil') || n.includes('ghee') || n.includes('tail')) return 'Cooking Oil & Ghee';
  if (n.includes('rice') || n.includes('chawal') || n.includes('atta') || n.includes('maida') || n.includes('suji') || n.includes('semolina') || n.includes('wheat') || n.includes('flour') || n.includes('rava') || n.includes('paratha')) return 'Rice & Flour';
  if (n.includes('daal') || n.includes('dal') || n.includes('chana') || n.includes('beans') || n.includes('peas') || n.includes('moong') || n.includes('urid') || n.includes('masoor') || n.includes('toor') || n.includes('beson')) return 'Pulses';
  if (n.includes('chicken') || n.includes('beef') || n.includes('mutton') || n.includes('veal') || n.includes('kheema') || n.includes('meat') || n.includes('fish') || n.includes('shrimp') || n.includes('sausages') || n.includes('tikka') || n.includes('shawarma')) return 'Beef Mutton & Chicken';
  if (n.includes('milk') || n.includes('cream') || n.includes('cheese') || n.includes('butter') || n.includes('yoghurt') || n.includes('ice cream')) return 'Dairy & Beverages';
  if (n.includes('sugar') || n.includes('gur') || n.includes('glucose')) return 'Natural Sugars';
  if (n.includes('kishmish') || n.includes('raisin') || n.includes('almond') || n.includes('kaju') || n.includes('cashew') || n.includes('pista') || n.includes('walnut') || n.includes('khubani') || n.includes('khajur') || n.includes('dates') || n.includes('apricot') || n.includes('peanuts')) return 'Dried Fruits';
  if (n.includes('salt') || n.includes('tatri') || n.includes('soda') || n.includes('ajinamoto')) return 'Salt & Seasonings';
  if (n.includes('achar') || n.includes('pickles')) return 'Pickles';
  if (n.includes('sauce') || n.includes('ketchup') || n.includes('mayonaise') || n.includes('mayonise') || n.includes('sirka') || n.includes('vinegar') || n.includes('tahina') || n.includes('imli') || n.includes('paste')) return 'Sauces & Condiments';
  if (n.includes('foil') || n.includes('tissue') || n.includes('glove') || n.includes('paper') || n.includes('bag') || n.includes('plastic') || n.includes('straw') || n.includes('cling') || n.includes('spoon') || n.includes('tray') || n.includes('cup') || n.includes('bowl') || n.includes('roll') || n.includes('tooth pick')) return 'Packaging & Disposable';
  if (n.includes('dish wash') || n.includes('hand wash') || n.includes('surf') || n.includes('clorex') || n.includes('foam') || n.includes('sponge') || n.includes('steel wool') || n.includes('hairnet')) return 'Cleaning & Hygiene';
  if (n.includes('masala') || n.includes('chili') || n.includes('chilly') || n.includes('zeera') || n.includes('elachi') || n.includes('cardamom') || n.includes('haldi') || n.includes('pepper') || n.includes('pepar') || n.includes('cloves') || n.includes('laung') || n.includes('darchini') || n.includes('dar chini') || n.includes('nutmeg') || n.includes('jaiphal') || n.includes('methi') || n.includes('ajwain') || n.includes('coriander') || n.includes('dhanya') || n.includes('dhaniya') || n.includes('ginger') || n.includes('adrak') || n.includes('garlic') || n.includes('lahsun') || n.includes('kalwanji') || n.includes('cumin') || n.includes('hing') || n.includes('anar dana') || n.includes('jalvatri') || n.includes('curry powder') || n.includes('tej patta')) return 'Spices & Herbs';
  return 'General';
}

const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;
const pad4 = (n) => String(n).padStart(4, '0');
const TODAY = new Date().toISOString().split('T')[0];

function buildFromCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const products = [];
  const txs = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const sr = parseInt(cols[0], 10);
    if (isNaN(sr)) continue;
    const name = (cols[3] || '').trim();
    if (!name) continue;

    const pRate = parseFloat(cols[5]) || 0;
    const sRate = parseFloat(cols[6]) || 0;
    const disc = parseFloat(cols[7]) || 0;
    const tStock = parseFloat(cols[8]) || 0;
    const stock = Math.max(0, tStock);

    const code = `M-${pad4(sr)}`;
    const prod = {
      id: `prod-zaf-${pad4(sr)}`,
      sku: code,
      mcode: code,
      name,
      itemTitle: name,
      category: categorize(name),
      measure: 'Kilo grams',
      unit: 'Kilo grams',
      description: '',
      companyBrand: '',
      packageType: 'Single',
      qtyInCarton: 1,
      carton: 0,
      ctn: 0,
      extraKg: 0,
      pcs: 0,
      ctnPurchaseRate: 0,
      ctnSaleRate: 0,
      ctnMinSaleRate: 0,
      purchasePrice: pRate,
      lastPurchasePrice: pRate,
      averagePurchaseCost: pRate,
      sellingPrice: sRate,
      salePrice: sRate,
      prchFixedPrice: false,
      saleFixedPrice: false,
      saleDiscount: disc,
      saleMinPrice: 0,
      currentQuantity: stock,
      totalStock: stock,
      openingStock: stock,
      minStockLevel: 5,
      minQuantity: 5,
      stockValue: round2(stock * pRate),
      profitMargin: sRate > 0 ? round1(((sRate - pRate) / sRate) * 100) : 0,
      lowStockAlert: stock <= 5,
      status: true,
      comments: '',
      scanType: 'General',
      customFields: '',
      image: '',
      companyId: COMPANY,
      createdAt: TODAY,
      updatedAt: TODAY,
    };
    products.push(prod);

    if (stock > 0) {
      txs.push({
        id: `tx-zaf-${pad4(sr)}`,
        productId: prod.id,
        productName: name,
        type: 'PURCHASE',
        quantity: stock,
        previousQuantity: 0,
        newQuantity: stock,
        unit: 'Kilo grams',
        unitCost: pRate,
        totalAmount: round2(stock * pRate),
        referenceType: 'SUPPLIER_PURCHASE',
        referenceId: '',
        notes: 'Inventory intake entry',
        date: TODAY,
        performedBy: 'Stock Import',
      });
    }
  }
  return { products, txs };
}

async function main() {
  const { products, txs } = buildFromCsv();
  if (products.length !== 367) {
    console.error(`ABORT: expected 367 rows, parsed ${products.length}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DB_URL, max: 2 });
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT count(*)::int AS n FROM products WHERE company_id = $1', [COMPANY]);
    if (existing.rows[0].n > 0) {
      console.log(`NOTE: ${existing.rows[0].n} products already exist for company — upserting (values are absolute, no double counting).`);
    }

    await client.query('BEGIN');
    let pDone = 0;
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, company_id, sku, name, name_ur, category, brand, measure_unit, purchase_price, sale_price, current_quantity, min_quantity, wholesale_rate, retail_rate, data, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id, sku = EXCLUDED.sku, name = EXCLUDED.name,
           category = EXCLUDED.category, brand = EXCLUDED.brand, measure_unit = EXCLUDED.measure_unit,
           purchase_price = EXCLUDED.purchase_price, sale_price = EXCLUDED.sale_price,
           current_quantity = EXCLUDED.current_quantity, min_quantity = EXCLUDED.min_quantity,
           wholesale_rate = EXCLUDED.wholesale_rate, retail_rate = EXCLUDED.retail_rate,
           data = EXCLUDED.data, updated_at = NOW()`,
        [p.id, COMPANY, p.sku, p.name, '', p.category, p.companyBrand, p.measure,
         p.purchasePrice, p.sellingPrice, p.currentQuantity, p.minQuantity,
         p.ctnSaleRate, 0, JSON.stringify(p)]
      );
      pDone++;
    }

    let tDone = 0;
    for (const t of txs) {
      await client.query(
        `INSERT INTO inventory_transactions (id, company_id, product_id, product_name, type, quantity, previous_quantity, new_quantity, unit_cost, reference_id, reference_type, notes, timestamp, user_name, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, COMPANY, t.productId, t.productName, t.type, t.quantity, t.previousQuantity, t.newQuantity,
         t.unitCost, t.referenceId, t.referenceType, t.notes, t.date, t.performedBy, JSON.stringify(t)]
      );
      tDone++;
    }
    await client.query('COMMIT');
    console.log(`PostgreSQL: upserted ${pDone} products, inserted ${tDone} intake transactions.`);

    const json = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    json.products = products;
    json.inventoryTransactions = txs.concat((json.inventoryTransactions || []).filter((x) => !txs.some((t) => t.id === x.id)));
    fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Local JSON updated: ${JSON_PATH}`);

    const verify = await client.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE data->>'packageType' = 'Single')::int AS singles,
              count(*) FILTER (WHERE data->>'measure' = 'Kilo grams')::int AS kgs,
              count(*) FILTER (WHERE (data->>'status')::boolean IS TRUE OR data->>'status' IS NULL)::int AS active,
              sum(current_quantity)::numeric AS total_stock,
              sum(purchase_price * current_quantity)::numeric AS stock_value
       FROM products WHERE company_id = $1`,
      [COMPANY]
    );
    console.log('VERIFY:', JSON.stringify(verify.rows[0]));

    const samples = await client.query(
      `SELECT id, name, purchase_price, sale_price, current_quantity, data->>'packageType' AS pkg, data->>'measure' AS measure, data->>'mcode' AS mcode
       FROM products WHERE company_id = $1 AND id IN ('prod-zaf-0001','prod-zaf-0002','prod-zaf-0016','prod-zaf-0022','prod-zaf-0366','prod-zaf-0367') ORDER BY id`,
      [COMPANY]
    );
    for (const s of samples.rows) console.log('SAMPLE:', JSON.stringify(s));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('IMPORT FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
