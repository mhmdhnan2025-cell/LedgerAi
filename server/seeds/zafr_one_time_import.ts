import { postgresService } from '../postgres';
import { ZAFR_STOCK_ROWS } from './zafr_stock_data';
import { ZAFR_SUPPLIERS } from './zafr_supplier_data';

const COMPANY_ID = 'comp-muocj00t-j3co';
const MARKER_KEY = 'zafr_stock_import_v1';
const SUP_MARKER_KEY = 'zafr_supplier_import_v1';

function categorize(name: string): string {
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

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;
const pad4 = (n: number) => String(n).padStart(4, '0');

function buildProducts() {
  const today = new Date().toISOString().split('T')[0];
  const products: any[] = [];
  const txs: any[] = [];
  for (const row of ZAFR_STOCK_ROWS) {
    const code = `M-${pad4(row.sr)}`;
    const prod: any = {
      id: `prod-zaf-${pad4(row.sr)}`,
      sku: code,
      mcode: code,
      name: row.name,
      itemTitle: row.name,
      category: row.category || categorize(row.name),
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
      purchasePrice: row.pRate,
      lastPurchasePrice: row.pRate,
      averagePurchaseCost: row.pRate,
      sellingPrice: row.sRate,
      salePrice: row.sRate,
      prchFixedPrice: false,
      saleFixedPrice: false,
      saleDiscount: row.disc,
      saleMinPrice: 0,
      currentQuantity: row.stock,
      totalStock: row.stock,
      openingStock: row.stock,
      minStockLevel: 5,
      minQuantity: 5,
      stockValue: round2(row.stock * row.pRate),
      profitMargin: row.sRate > 0 ? round1(((row.sRate - row.pRate) / row.sRate) * 100) : 0,
      lowStockAlert: row.stock <= 5,
      status: true,
      comments: '',
      scanType: 'General',
      customFields: '',
      image: '',
      companyId: COMPANY_ID,
      createdAt: today,
      updatedAt: today,
    };
    products.push(prod);
    if (row.stock > 0) {
      txs.push({
        id: `tx-zaf-${pad4(row.sr)}`,
        productId: prod.id,
        productName: row.name,
        type: 'PURCHASE',
        quantity: row.stock,
        previousQuantity: 0,
        newQuantity: row.stock,
        unit: 'Kilo grams',
        unitCost: row.pRate,
        totalAmount: round2(row.stock * row.pRate),
        referenceType: 'SUPPLIER_PURCHASE',
        referenceId: '',
        notes: 'Inventory intake entry',
        date: today,
        performedBy: 'Stock Import',
      });
    }
  }
  return { products, txs };
}

async function importZafrStock(): Promise<void> {
  if (process.env.SKIP_ZAFR_IMPORT === 'true') return;
  const marker = await postgresService.getSystemSetting(MARKER_KEY);
  if (marker === 'done') return;

  const { products, txs } = buildProducts();
  for (const p of products) {
    await postgresService.upsertProduct(p, COMPANY_ID);
  }
  for (const t of txs) {
    await postgresService.insertInventoryTransaction(t, COMPANY_ID);
  }
  await postgresService.setSystemSetting(MARKER_KEY, 'done');
  console.log(`✅ [ZafrImport] Imported ${products.length} stock items (+${txs.length} intake entries) for ${COMPANY_ID}`);
}

async function importZafrSuppliers(): Promise<void> {
  if (process.env.SKIP_ZAFR_IMPORT === 'true') return;
  const supMarker = await postgresService.getSystemSetting(SUP_MARKER_KEY);
  if (supMarker === 'done') return;

  const existing = await postgresService.loadCompanyData(COMPANY_ID);
  const existingSuppliers: any[] = (existing as any)?.suppliers || [];
  for (const s of existingSuppliers) {
    if (s?.id) await postgresService.deleteSupplier(s.id, COMPANY_ID);
  }
  for (const s of ZAFR_SUPPLIERS) {
    await postgresService.upsertSupplier(s as any, COMPANY_ID);
  }
  await postgresService.setSystemSetting(SUP_MARKER_KEY, 'done');
  console.log(
    `✅ [ZafrImport] Imported ${ZAFR_SUPPLIERS.length} suppliers for ${COMPANY_ID} (replaced ${existingSuppliers.length} existing)`
  );
}

export async function runZafrOneTimeStockImport(companyExists: (id: string) => boolean): Promise<void> {
  if (process.env.SKIP_ZAFR_IMPORT === 'true') return;
  if (!companyExists(COMPANY_ID)) return;

  try {
    await importZafrStock();
  } catch (err: any) {
    console.warn('[ZafrImport] Stock phase skipped due to error:', err?.message || err);
  }

  try {
    await importZafrSuppliers();
  } catch (err: any) {
    console.warn('[ZafrImport] Supplier phase skipped due to error:', err?.message || err);
  }
}
