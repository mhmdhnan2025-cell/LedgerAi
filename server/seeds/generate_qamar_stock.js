import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, 'qamar_raw_stock.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
const header = lines[0];
const dataLines = lines.slice(1);

function categorize(name) {
  const n = name.toLowerCase();
  if (n.includes('tea') || n.includes('chai') || n.includes('lipton') || n.includes('alokozay') || n.includes('karak') || n.includes('coffee') || n.includes('nescafe')) {
    return 'Tea & Coffee';
  }
  if (n.includes('oil') || n.includes('ghee') || n.includes('tail')) {
    return 'Cooking Oil & Ghee';
  }
  if (n.includes('rice') || n.includes('chawal') || n.includes('atta') || n.includes('maida') || n.includes('suji') || n.includes('semolina') || n.includes('wheat') || n.includes('flour') || n.includes('rava') || n.includes('paratha')) {
    return 'Rice & Flour';
  }
  if (n.includes('daal') || n.includes('dal') || n.includes('chana') || n.includes('beans') || n.includes('peas') || n.includes('moong') || n.includes('urid') || n.includes('masoor') || n.includes('toor') || n.includes('beson')) {
    return 'Pulses';
  }
  if (n.includes('chicken') || n.includes('beef') || n.includes('mutton') || n.includes('veal') || n.includes('kheema') || n.includes('meat') || n.includes('fish') || n.includes('shrimp') || n.includes('sausages') || n.includes('tikka') || n.includes('shawarma')) {
    return 'Beef Mutton & Chicken';
  }
  if (n.includes('milk') || n.includes('cream') || n.includes('cheese') || n.includes('butter') || n.includes('yoghurt') || n.includes('ice cream')) {
    return 'Dairy & Beverages';
  }
  if (n.includes('sugar') || n.includes('gur') || n.includes('glucose')) {
    return 'Natural Sugars';
  }
  if (n.includes('kishmish') || n.includes('raisin') || n.includes('almond') || n.includes('kaju') || n.includes('cashew') || n.includes('pista') || n.includes('walnut') || n.includes('khubani') || n.includes('khajur') || n.includes('dates') || n.includes('apricot') || n.includes('peanuts')) {
    return 'Dried Fruits';
  }
  if (n.includes('salt') || n.includes('tatri') || n.includes('soda') || n.includes('ajinamoto')) {
    return 'Salt & Seasonings';
  }
  if (n.includes('achar') || n.includes('pickles')) {
    return 'Pickles';
  }
  if (n.includes('sauce') || n.includes('ketchup') || n.includes('mayonaise') || n.includes('mayonise') || n.includes('sirka') || n.includes('vinegar') || n.includes('tahina') || n.includes('imli') || n.includes('paste')) {
    return 'Sauces & Condiments';
  }
  if (n.includes('foil') || n.includes('tissue') || n.includes('glove') || n.includes('paper') || n.includes('bag') || n.includes('plastic') || n.includes('straw') || n.includes('cling') || n.includes('spoon') || n.includes('tray') || n.includes('cup') || n.includes('bowl') || n.includes('roll') || n.includes('tooth pick')) {
    return 'Packaging & Disposable';
  }
  if (n.includes('dish wash') || n.includes('hand wash') || n.includes('surf') || n.includes('clorex') || n.includes('foam') || n.includes('sponge') || n.includes('steel wool') || n.includes('hairnet')) {
    return 'Cleaning & Hygiene';
  }
  if (n.includes('masala') || n.includes('chili') || n.includes('chilly') || n.includes('zeera') || n.includes('elachi') || n.includes('cardamom') || n.includes('haldi') || n.includes('pepper') || n.includes('pepar') || n.includes('cloves') || n.includes('laung') || n.includes('darchini') || n.includes('dar chini') || n.includes('nutmeg') || n.includes('jaiphal') || n.includes('methi') || n.includes('ajwain') || n.includes('coriander') || n.includes('dhanya') || n.includes('dhaniya') || n.includes('ginger') || n.includes('adrak') || n.includes('garlic') || n.includes('lahsun') || n.includes('kalwanji') || n.includes('cumin') || n.includes('hing') || n.includes('anar dana') || n.includes('jalvatri') || n.includes('curry powder') || n.includes('tej patta')) {
    return 'Spices & Herbs';
  }
  return 'General';
}

function normalizeUnit(type, name) {
  const t = (type || '').trim().toLowerCase();
  const n = name.toLowerCase();

  if (t === 'kilo grams' || t === 'kg') return 'kg';
  if (t === 'liter' || t === 'litre' || t === 'lt') return 'liter';
  if (t === 'grams' || t === 'g' || t === 'gm') return 'gram';

  if (n.includes('kg')) return 'kg';
  if (n.includes('ltr') || n.includes('liter') || n.includes('lt')) return 'liter';
  if (n.includes('gm') || n.includes('gram')) return 'gram';
  if (n.includes('tin')) return 'tin';
  if (n.includes('ctn') || n.includes('cartan') || n.includes('carton')) return 'carton';
  if (n.includes('bag') || n.includes('bori')) return 'bag';
  if (n.includes('can')) return 'can';
  if (n.includes('bottle') || n.includes('jar')) return 'bottle';
  if (n.includes('packet') || n.includes('pkt') || n.includes('pouch') || n.includes('pack')) return 'packet';

  return 'piece';
}

const products = [];

for (const line of dataLines) {
  // Parse CSV line handling potential quotes
  const cols = line.split(',');
  const sr = parseInt(cols[0], 10);
  if (isNaN(sr)) continue;

  const itemName = cols[3]?.trim() || '';
  if (!itemName) continue;

  const type = cols[4]?.trim() || '';
  const pRate = parseFloat(cols[5]) || 0;
  const sRate = parseFloat(cols[6]) || 0;
  const disc = parseFloat(cols[7]) || 0;
  const tStock = parseFloat(cols[8]) || 0;
  const carton = cols[9]?.trim() ? parseInt(cols[9], 10) : undefined;
  const pcs = cols[10]?.trim() ? parseInt(cols[10], 10) : undefined;

  const unit = normalizeUnit(type, itemName);
  const category = categorize(itemName);
  const sellingPrice = sRate;

  const prod = {
    id: `prod-qmr-${sr}`,
    sku: `SKU-QMR-${String(sr).padStart(4, '0')}`,
    mcode: `M-${String(sr).padStart(4, '0')}`,
    name: itemName,
    itemTitle: itemName,
    category: category,
    unit: unit,
    measure: unit,
    packageType: carton ? 'Carton' : (unit === 'kg' ? 'Bag' : (unit === 'liter' ? 'Can' : 'Carton')),
    qtyInCarton: pcs !== undefined && pcs > 0 ? pcs : 1,
    ctn: carton,
    pcs: pcs,
    purchasePrice: pRate,
    salePrice: sellingPrice,
    sellingPrice: sellingPrice,
    saleDiscount: disc,
    currentQuantity: tStock,
    totalStock: tStock,
    minStockLevel: 5,
    minQuantity: 5,
    stockValue: Number((tStock * pRate).toFixed(2)),
    profitMargin: sellingPrice > 0 ? Number((((sellingPrice - pRate) / sellingPrice) * 100).toFixed(1)) : 0,
    lowStockAlert: tStock <= 5,
    status: true,
    companyId: 'comp-muocj00t-j3co',
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z'
  };

  products.push(prod);
}

console.log(`Parsed ${products.length} products successfully!`);

const outPath = path.join(__dirname, 'qamar_stock_items.json');
fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf8');
console.log(`Saved to ${outPath}`);
