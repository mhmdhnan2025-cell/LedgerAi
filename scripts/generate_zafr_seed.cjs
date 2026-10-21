const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'items-report.csv');
const OUT_PATH = path.join(ROOT, 'server', 'seeds', 'zafr_stock_data.ts');

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

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const raw = fs.readFileSync(CSV_PATH, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
const rows = [];
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
  rows.push({ sr, name, category: categorize(name), pRate, sRate, disc, stock: Math.max(0, tStock) });
}

if (rows.length !== 367) {
  console.error(`ABORT: expected 367 rows, parsed ${rows.length}`);
  process.exit(1);
}

const out = [
  '// AUTO-GENERATED from StockInventry.csv by scripts/generate_zafr_seed.cjs — do not edit by hand.',
  'export interface ZafrStockRow {',
  '  sr: number;',
  "  name: string;",
  "  category: string;",
  '  pRate: number;',
  '  sRate: number;',
  '  disc: number;',
  '  stock: number;',
  '}',
  '',
  'export const ZAFR_STOCK_ROWS: ZafrStockRow[] = [',
  ...rows.map(
    (r) =>
      `  { sr: ${r.sr}, name: '${esc(r.name)}', category: '${esc(r.category)}', pRate: ${r.pRate}, sRate: ${r.sRate}, disc: ${r.disc}, stock: ${r.stock} },`
  ),
  '];',
  '',
].join('\n');

fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log(`Wrote ${rows.length} rows -> ${OUT_PATH}`);

// --- Suppliers phase: from recovery backup, deterministic ids, city Sharjah ---
const SUP_OUT = path.join(ROOT, 'server', 'seeds', 'zafr_supplier_data.ts');
const recovery = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'recovery', 'database_comp-muocj00t-j3co.json'), 'utf8')
);
const sups = recovery.suppliers || [];
if (sups.length !== 75) {
  console.error(`ABORT: expected 75 suppliers in recovery, got ${sups.length}`);
  process.exit(1);
}

const supLines = sups.map((s, i) => {
  const id = `sup-zaf-${String(i + 1).padStart(4, '0')}`;
  const obj = {
    id,
    code: s.code || '',
    title: s.title,
    accountTitle: s.accountTitle || s.title,
    name: s.name || s.title,
    supplierGroup: s.supplierGroup || 'General Trading',
    mobile: s.mobile || '',
    phone: s.phone || s.mobile || '',
    telephones: s.telephones || s.mobile || s.phone || '',
    contactPerson: s.contactPerson || '',
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    prefixTitle: s.prefixTitle || 'Mr',
    email: s.email || '',
    vatNumber: s.vatNumber || '',
    ntnNumber: s.ntnNumber || '',
    bankName: s.bankName || '',
    bankTitle: s.bankTitle || '',
    bankAccountNo: s.bankAccountNo || '',
    city: 'Sharjah',
    address: s.address || '',
    status: s.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    payableToSupplier: s.payableToSupplier || 0,
    payableType: s.payableType || 'CR',
    documents: s.documents || [],
    categories: Array.isArray(s.categories) && s.categories.length ? s.categories : [s.supplierGroup || 'General Trading'],
    totalPurchases: s.totalPurchases || 0,
    createdAt: s.createdAt || '',
  };
  return `  ${JSON.stringify(obj)},`;
});

const supOut = [
  '// AUTO-GENERATED from data/recovery database by scripts/generate_zafr_seed.cjs — do not edit by hand.',
  'export const ZAFR_SUPPLIERS: any[] = [',
  ...supLines,
  '];',
  '',
].join('\n');
fs.writeFileSync(SUP_OUT, supOut, 'utf8');
console.log(`Wrote ${sups.length} suppliers -> ${SUP_OUT}`);
