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

  if (t === 'kilo grams' || t === 'kg') return 'Kilo grams';
  if (t === 'liter' || t === 'litre' || t === 'lt') return 'Liter';
  if (t === 'grams' || t === 'g' || t === 'gm') return 'Grams';

  if (n.includes('kg')) return 'Kilo grams';
  if (n.includes('ltr') || n.includes('liter') || n.includes('lt')) return 'Liter';
  if (n.includes('gm') || n.includes('gram')) return 'Grams';
  if (n.includes('cartan') || n.includes('carton') || n.includes('ctn')) return 'Carton';
  if (n.includes('bag') || n.includes('bori')) return 'Bag';
  if (n.includes('tin')) return 'Tin';
  if (n.includes('can')) return 'Can';
  if (n.includes('bottle') || n.includes('jar')) return 'Bottle';
  if (n.includes('packet') || n.includes('pkt') || n.includes('pack')) return 'Packet';

  return 'Kilo grams';
}

// User-specified Qty In Carton lookup
function getQtyInCarton(sr, name) {
  const n = name.toLowerCase();
  if (sr === 6 || n.includes('black chana')) return 15;
  if (sr === 11 || n.includes('sugar')) return 50;
  if (sr === 86 || n.includes('haldi no 1')) return 25;
  if (sr === 88 || n.includes('semolina') || n.includes('suji')) return 25;
  if (sr === 89 || n.includes('sona masoori')) return 18;
  if (sr === 103 || n.includes('red chilly')) return 25;
  if (sr === 118 || n.includes('al fajr steam rice')) return 35;
  if (sr === 129 || n.includes('white chana 12mm')) return 25;
  if (sr === 165 || n === 'sella rice') return 37;
  if (sr === 185 || n.includes('green peas')) return 20;
  if (sr === 240 || n.includes('cream fresh')) return 24;
  if (sr === 305 || n.includes('carry bag large')) return 20;
  if (sr === 360 || n.includes('golden sella rice')) return 35;
  if (sr === 363) return 1;

  return 15;
}

const products = [];

for (const line of dataLines) {
  const cols = line.split(',');
  const sr = parseInt(cols[0], 10);
  if (isNaN(sr)) continue;

  const itemName = cols[3]?.trim() || '';
  if (!itemName) continue;

  const type = cols[4]?.trim() || '';
  let pRate = parseFloat(cols[5]) || 0;
  const sRate = parseFloat(cols[6]) || 0;
  const disc = parseFloat(cols[7]) || 0;
  const rawTStock = parseFloat(cols[8]) || 0;

  // Rule 1: Under no circumstances should stock ever be negative. Minimum is 0.
  // Rule 2: Do NOT add Pcs column to totalStock. Total stock is purely T.Stock clamped >= 0.
  let totalStock = Math.max(0, rawTStock);

  const unit = normalizeUnit(type, itemName);
  const category = categorize(itemName);
  let sellingPrice = sRate;

  // Rule 4 & 5: Default qtyInCarton for all items is 15, EXCEPT Pak Atta 50 Kg (sr === 12)
  let qtyInCarton = 15;
  let pkgType = 'Carton';

  const n = itemName.toLowerCase();
  const isAtta = sr === 12 || n.includes('pak atta');

  if (isAtta) {
    qtyInCarton = 1;
    pkgType = 'Bag';
    totalStock = 3.00; // As user specified and confirmed in screenshot: 3 bags
    pRate = 119.59;    // User verified purchase price
    sellingPrice = 6.00;
  } else if (unit === 'Bag' || n.includes('bori') || n.includes('bag')) {
    pkgType = 'Bag';
    qtyInCarton = 15;
  } else if (unit === 'Liter' || n.includes('tin') || n.includes('can')) {
    pkgType = 'Can';
    qtyInCarton = 15;
  } else if (n.includes('box')) {
    pkgType = 'Box';
    qtyInCarton = 15;
  } else {
    pkgType = 'Carton';
    qtyInCarton = 15;
  }

  // Calculate whole packages and loose extra kgs dynamically
  let carton = 0;
  let extraKg = 0;

  if (qtyInCarton === 1) {
    carton = totalStock;
    extraKg = 0;
  } else {
    carton = Math.floor(totalStock / qtyInCarton);
    extraKg = Number((totalStock % qtyInCarton).toFixed(2));
  }

  const prod = {
    id: `prod-qmr-${sr}`,
    sku: `SKU-QMR-${String(sr).padStart(4, '0')}`,
    mcode: `M-${String(sr).padStart(4, '0')}`,
    name: itemName,
    itemTitle: itemName,
    category: category,
    unit: unit,
    measure: unit,
    packageType: pkgType,
    qtyInCarton: qtyInCarton,
    carton: carton,
    ctn: carton,
    extraKg: extraKg,
    pcs: extraKg, // alias for backwards compatibility
    purchasePrice: pRate,
    costPrice: pRate,
    salePrice: sellingPrice,
    sellingPrice: sellingPrice,
    saleDiscount: disc,
    currentQuantity: totalStock,
    totalStock: totalStock,
    openingStock: totalStock,
    minStockLevel: 5,
    minQuantity: 5,
    stockValue: Number((totalStock * pRate).toFixed(2)),
    profitMargin: (sellingPrice > 0 && pRate > 0) ? Number((((sellingPrice - pRate) / sellingPrice) * 100).toFixed(1)) : 0,
    lowStockAlert: totalStock <= 5,
    status: true,
    companyId: 'comp_default_01',
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z'
  };

  products.push(prod);
}

console.log(`Parsed ${products.length} products successfully!`);

// Print sample verifications
const testItems = [6, 7, 8, 9, 10, 11, 86, 88, 89, 103, 115, 118, 129, 161, 165, 183, 185, 338, 360, 363];
for (const id of testItems) {
  const p = products.find(x => x.id === `prod-qmr-${id}`);
  if (p) {
    console.log(`[Item ${id}] ${p.name} | Ctn: ${p.carton} x ${p.qtyInCarton} + ExtraKg: ${p.extraKg} = Total: ${p.totalStock} | Stock Value: ${p.stockValue}`);
  }
}

const outPath = path.join(__dirname, 'qamar_stock_items.json');
fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf8');
console.log(`Saved to ${outPath}`);

// Also copy to dist/seeds if exists
const distSeedsPath = path.join(process.cwd(), 'dist', 'seeds', 'qamar_stock_items.json');
if (fs.existsSync(path.dirname(distSeedsPath))) {
  fs.writeFileSync(distSeedsPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Copied to ${distSeedsPath}`);
}
