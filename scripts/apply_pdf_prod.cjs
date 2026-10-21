/**
 * Seed Railway production with the CURRENT local data (non-destructive records,
 * but production ends up matching the new PDFs exactly):
 *   - customers: 158 receivable parties -> PUT existing, POST missing,
 *                then zero any stale prod balance not in the new list
 *   - suppliers: 41 payable parties    -> PUT existing, POST missing,
 *                then zero any stale prod payable not in the new list
 *   - products:  367 items (Single, totalStock) -> PUT existing, POST missing
 *
 *   node scripts/apply_pdf_prod.cjs          (apply)
 *   node scripts/apply_pdf_prod.cjs --dry    (plan only)
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROD_BASE || 'https://ledgerai-production-ba44.up.railway.app';
const COMPANY = process.env.PROD_COMPANY || 'comp-muocj00t-j3co';
const H = { 'x-company-id': COMPANY, 'Content-Type': 'application/json' };
const DRY = process.argv.includes('--dry');

const ROOT = path.join(__dirname, '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'database_comp-muocj00t-j3co.json'), 'utf8'));
const localCustomers = (db.customers || []).filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001);
const localSuppliers = (db.suppliers || []).filter((s) => Number(s.payableToSupplier) > 0.001);
const localProducts = db.products || [];
console.log(
  `local: ${localCustomers.length} customers with balance, ${localSuppliers.length} suppliers with payable, ${localProducts.length} products`
);
if (localCustomers.length !== 158 || localSuppliers.length !== 41 || localProducts.length !== 367) {
  console.error('ABORT: local seed data is not 158/41/367 - run the local seed scripts first.');
  process.exit(1);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function getJson(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}
async function send(method, url, body) {
  const r = await fetch(url, { method, headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text.slice(0, 200) };
  }
  return { status: r.status, json };
}

function customerUpdates(c) {
  return {
    srNo: c.srNo,
    sNo: c.sNo,
    pdfOrder: c.pdfOrder,
    accountTitle: c.accountTitle,
    name: c.name,
    title: c.title,
    manualCode: c.manualCode || '',
    customerGroup: c.customerGroup || 'Restaurants',
    assignedSalesman: c.assignedSalesman || '',
    salesman: c.salesman || '',
    mobile: c.mobile || '',
    mobile2: c.mobile2 || '',
    area: c.area || '',
    sector: c.sector || '',
    city: c.city || '',
    location: c.location || '',
    address: c.address || '',
    regDate: c.regDate || '',
    creditLimit: c.creditLimit || 30000,
    status: c.status || 'ACTIVE',
    openingBalance: c.openingBalance,
    openingBalanceType: c.openingBalanceType,
    outstandingBalance: c.outstandingBalance,
    lastBillNumber: c.lastBillNumber || '',
    lastBillDate: c.lastBillDate || '',
    lastBillAmount: c.lastBillAmount || 0,
    lastReceiptDate: c.lastReceiptDate || '',
    lastReceiptAmount: c.lastReceiptAmount || 0,
  };
}

function supplierUpdates(s) {
  return {
    code: s.code,
    title: s.title,
    accountTitle: s.accountTitle,
    name: s.name,
    supplierGroup: s.supplierGroup || '',
    categories: s.categories || [],
    mobile: s.mobile || '',
    phone: s.phone || '',
    city: s.city || '',
    address: s.address || '',
    status: s.status || 'ACTIVE',
    payableToSupplier: s.payableToSupplier,
    payableType: s.payableType || 'CR',
    balanceOwed: s.balanceOwed || s.payableToSupplier,
    openingBalance: s.openingBalance,
    openingBalanceType: s.openingBalanceType || 'CR',
    srNo: s.srNo,
    sNo: s.sNo,
    pdfOrder: s.pdfOrder,
    pdfTitle: s.pdfTitle || '',
    lastBillNumber: s.lastBillNumber || '',
    lastBillDate: s.lastBillDate || '',
    lastBillAmount: s.lastBillAmount || 0,
    lastPaymentDate: s.lastPaymentDate || '',
    lastPaymentAmount: s.lastPaymentAmount || 0,
    postDatedPayments: s.postDatedPayments || 0,
    postDatedReceipts: s.postDatedReceipts || 0,
    adjustedLedgerBalance: s.adjustedLedgerBalance || 0,
    adjustedLedgerBalanceType: s.adjustedLedgerBalanceType || s.payableType || 'CR',
  };
}

function productUpdates(p) {
  const { id, companyId, createdAt, updatedAt, ...rest } = p;
  return rest;
}

async function main() {
  const prodCustomers = await getJson(`${BASE}/api/customers`);
  const prodSuppliers = await getJson(`${BASE}/api/suppliers`);
  const prodProducts = await getJson(`${BASE}/api/products`);
  console.log(
    `production: ${prodCustomers.length} customers, ${prodSuppliers.length} suppliers, ${prodProducts.length} products`
  );

  const custByIdCode = new Map();
  const custByTitle = new Map();
  prodCustomers.forEach((c) => {
    if (c.code && !custByIdCode.has(c.code)) custByIdCode.set(c.code, c);
    const t = norm(c.accountTitle || c.name);
    if (t && !custByTitle.has(t)) custByTitle.set(t, c);
  });
  const supByCode = new Map();
  prodSuppliers.forEach((s) => {
    if (s.code && !supByCode.has(s.code)) supByCode.set(s.code, s);
  });
  const prodById = new Map(prodProducts.map((p) => [p.id, p]));

  const custPlan = localCustomers.map((c) => {
    const target = custByIdCode.get(c.code) || custByTitle.get(norm(c.accountTitle)) || null;
    return { c, target };
  });
  const supPlan = localSuppliers.map((s) => {
    const target = supByCode.get(s.code) || null;
    return { s, target };
  });
  const prodPlan = localProducts.map((p) => ({ p, target: prodById.get(p.id) || null }));

  const custUpd = custPlan.filter((p) => p.target);
  const custNew = custPlan.filter((p) => !p.target);
  const supUpd = supPlan.filter((p) => p.target);
  const supNew = supPlan.filter((p) => !p.target);
  const prodUpd = prodPlan.filter((p) => p.target);
  const prodNew = prodPlan.filter((p) => !p.target);

  const custTargetIds = new Set(custUpd.map((p) => p.target.id));
  const staleCust = prodCustomers.filter(
    (c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001 && !custTargetIds.has(c.id)
  );
  const supTargetIds = new Set(supUpd.map((p) => p.target.id));
  const staleSup = prodSuppliers.filter(
    (s) => Number(s.payableToSupplier) > 0.001 && !supTargetIds.has(s.id)
  );

  console.log(`customers: update ${custUpd.length}, create ${custNew.length}, zero-stale ${staleCust.length}`);
  custNew.forEach((p) => console.log(`   + CREATE customer ${p.c.srNo} "${p.c.accountTitle}"`));
  staleCust.forEach((c) => console.log(`   - ZERO stale customer "${c.accountTitle}" (bal ${c.outstandingBalance})`));
  console.log(`suppliers: update ${supUpd.length}, create ${supNew.length}, zero-stale ${staleSup.length}`);
  supNew.forEach((p) => console.log(`   + CREATE supplier ${p.s.srNo} "${p.s.title}"`));
  staleSup.forEach((s) => console.log(`   - ZERO stale supplier "${s.title}" (payable ${s.payableToSupplier})`));
  console.log(`products: update ${prodUpd.length}, create ${prodNew.length}`);
  prodNew.forEach((p) => console.log(`   + CREATE product ${p.p.sku} "${p.p.name}"`));

  if (DRY) {
    console.log('DRY RUN - no changes made.');
    return 0;
  }

  let ok = 0;
  let fail = 0;
  for (const { c, target } of custPlan) {
    let res;
    if (target) {
      res = await send('PUT', `${BASE}/api/customers/${encodeURIComponent(target.id)}`, {
        updates: customerUpdates(c),
        source: 'pdf-receivables-import',
        user: { id: 'admin', name: 'Admin', role: 'Admin' },
      });
    } else {
      res = await send('POST', `${BASE}/api/customers`, {
        customer: { ...c, id: undefined },
        source: 'pdf-receivables-import',
        user: { id: 'admin', name: 'Admin', role: 'Admin' },
      });
    }
    if (res.status >= 200 && res.status < 300) ok++;
    else {
      fail++;
      console.log(`   FAIL customer ${c.srNo} "${c.accountTitle}" -> ${res.status} ${JSON.stringify(res.json).slice(0, 160)}`);
    }
  }
  for (const c of staleCust) {
    const res = await send('PUT', `${BASE}/api/customers/${encodeURIComponent(c.id)}`, {
      updates: { outstandingBalance: 0, openingBalance: 0, openingBalanceType: 'DR' },
      source: 'pdf-receivables-import',
      user: { id: 'admin', name: 'Admin', role: 'Admin' },
    });
    if (res.status >= 200 && res.status < 300) ok++;
    else {
      fail++;
      console.log(`   FAIL zero customer "${c.accountTitle}" -> ${res.status}`);
    }
  }
  console.log(`customers done: ${ok} ok, ${fail} failed`);

  ok = 0;
  fail = 0;
  for (const { s, target } of supPlan) {
    let res;
    if (target) {
      res = await send('PUT', `${BASE}/api/suppliers/${encodeURIComponent(target.id)}`, {
        ...supplierUpdates(s),
        source: 'pdf-payables-import',
        userName: 'Admin',
      });
    } else {
      res = await send('POST', `${BASE}/api/suppliers`, {
        ...supplierUpdates(s),
        id: undefined,
        source: 'pdf-payables-import',
        userName: 'Admin',
      });
    }
    if (res.status >= 200 && res.status < 300) ok++;
    else {
      fail++;
      console.log(`   FAIL supplier ${s.srNo} "${s.title}" -> ${res.status} ${JSON.stringify(res.json).slice(0, 160)}`);
    }
  }
  for (const s of staleSup) {
    const res = await send('PUT', `${BASE}/api/suppliers/${encodeURIComponent(s.id)}`, {
      payableToSupplier: 0,
      balanceOwed: 0,
      openingBalance: 0,
      source: 'pdf-payables-import',
      userName: 'Admin',
    });
    if (res.status >= 200 && res.status < 300) ok++;
    else {
      fail++;
      console.log(`   FAIL zero supplier "${s.title}" -> ${res.status}`);
    }
  }
  console.log(`suppliers done: ${ok} ok, ${fail} failed`);

  ok = 0;
  fail = 0;
  for (const { p, target } of prodPlan) {
    let res;
    if (target) {
      res = await send('PUT', `${BASE}/api/products/${encodeURIComponent(target.id)}`, {
        updates: productUpdates(p),
        source: 'stock-import',
        user: { id: 'admin', name: 'Admin', role: 'Admin' },
      });
    } else {
      res = await send('POST', `${BASE}/api/products`, {
        product: productUpdates(p),
        source: 'stock-import',
        user: { id: 'admin', name: 'Admin', role: 'Admin' },
      });
    }
    if (res.status >= 200 && res.status < 300) ok++;
    else {
      fail++;
      if (fail <= 10) console.log(`   FAIL product ${p.sku} "${p.name}" -> ${res.status} ${JSON.stringify(res.json).slice(0, 160)}`);
    }
  }
  console.log(`products done: ${ok} ok, ${fail} failed`);

  // ---- verification ----
  const afterC = await getJson(`${BASE}/api/customers`);
  const afterS = await getJson(`${BASE}/api/suppliers`);
  const afterP = await getJson(`${BASE}/api/products`);
  const withBal = afterC.filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001);
  let dr = 0;
  let cr = 0;
  withBal.forEach((c) => {
    const b = Number(c.outstandingBalance);
    if (b > 0) dr += b;
    else cr += -b;
  });
  const net = Math.round((dr - cr) * 100) / 100;
  const pay = afterS.filter((s) => Number(s.payableToSupplier) > 0.001);
  const payTotal = Math.round(pay.reduce((a, b) => a + Number(b.payableToSupplier), 0) * 100) / 100;
  const singles = afterP.filter((p) => p.packageType === 'Single').length;
  const stockSum = Math.round(afterP.reduce((a, p) => a + (Number(p.currentQuantity) || 0), 0) * 100) / 100;
  console.log('--- VERIFY PRODUCTION ---');
  console.log(`customers: ${afterC.length} total | with balance: ${withBal.length} (expect 158)`);
  console.log(`DR ${dr.toFixed(2)} | CR ${cr.toFixed(2)} | NET ${net.toFixed(2)} (expect 320582.12)`);
  console.log(`suppliers: ${afterS.length} total | with payable: ${pay.length} (expect 41)`);
  console.log(`payable total: ${payTotal.toFixed(2)} (expect 1190110.17)`);
  console.log(`products: ${afterP.length} total | Single: ${singles} | stock sum: ${stockSum} (expect 367 / 367 / 24463.92)`);
  const okAll =
    withBal.length === 158 &&
    Math.abs(net - 320582.12) < 0.005 &&
    pay.length === 41 &&
    Math.abs(payTotal - 1190110.17) < 0.005 &&
    afterP.length === 367 &&
    singles === 367 &&
    Math.abs(stockSum - 24463.92) < 0.005;
  console.log(okAll ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
  return okAll ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('ERROR', e);
    process.exit(1);
  });
