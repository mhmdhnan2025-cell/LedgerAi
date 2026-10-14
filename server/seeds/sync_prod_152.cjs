/**
 * sync_prod_152.cjs
 * Applies customers.pdf (337) + receivables PDF (152, NET 285407.17 DR)
 * to the LIVE production app via REST API.
 *   node server/seeds/sync_prod_152.cjs --dry-run
 *   node server/seeds/sync_prod_152.cjs --apply
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROD_BASE || 'https://ledgerai-production-ba44.up.railway.app';
const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();

const pdfCustomers = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'seeds', 'customers_pdf_337_new.json'), 'utf8'));
const pdfReceivables = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'seeds', 'receivables_pdf_152_new.json'), 'utf8'));

function cleanName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/\b(restaurant|resturant|restaunt|restuant|restutran|cafeteria|cafetetria|cafeteria|cafateria|cafteria|kitchen|llc|l\.l\.c|trading|tradimg|services|super market|carpentry|carpantry|carpentary|bakery|shop|bfc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
}
function isPlaceholderPhone(p) {
  return !p || p === '0' || String(p).toUpperCase() === 'NULL' || /^0+$/.test(p);
}
function parseMobiles(raw) {
  const out = [];
  const re = /(M1|M2|Ph)\s*:\s*([^\s]+)/gi;
  let m;
  while ((m = re.exec(raw || '')) !== null) {
    const val = m[2].trim();
    if (!isPlaceholderPhone(val)) out.push(val);
  }
  return out;
}
function toISODate(d) {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(-?\d{4})$/);
  if (!m) return d || '';
  let y = m[3];
  if (y.startsWith('-')) y = y.slice(1).padStart(4, '0');
  else y = y.padStart(4, '0');
  return `${y}-${m[2]}-${m[1]}`;
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function j(url, opts) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts && opts.headers) },
  });
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  if (!res.ok) throw new Error(`${opts ? opts.method || 'GET' : 'GET'} ${url} -> ${res.status} ${body.slice(0, 200)}`);
  return json;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | ${BASE}`);
  const prod = await j(`${BASE}/api/customers`);
  const rows = Array.isArray(prod) ? prod : prod.customers;
  console.log(`Prod customers: ${rows.length}`);

  // ---- classify prod rows against customers PDF (code + clean title) ----
  const pdfByCode = new Map(pdfCustomers.map((p) => [p.code, p]));
  const assigned = new Map(); // pdfSr -> prod row
  const junk = [];
  const candidatesByCode = new Map();
  for (const row of rows) {
    const code = row.code || row.accountCode || '';
    const pc = pdfByCode.get(code);
    if (pc && cleanName(row.accountTitle || row.name) === cleanName(pc.name)) {
      if (!candidatesByCode.has(code)) candidatesByCode.set(code, []);
      candidatesByCode.get(code).push(row);
    } else {
      junk.push(row); // wrong code or wrong title for its code
    }
  }
  const dupJunk = [];
  for (const [code, cands] of candidatesByCode) {
    assigned.set(pdfByCode.get(code).sr, cands[0]);
    for (let i = 1; i < cands.length; i++) dupJunk.push(cands[i]);
  }
  // PDF customers not assigned yet -> try recover from junk by clean title
  const recovered = [];
  const stillMissing = [];
  for (const pc of pdfCustomers) {
    if (assigned.has(pc.sr)) continue;
    const hitIdx = junk.findIndex((r) => cleanName(r.accountTitle || r.name) === cleanName(pc.name));
    if (hitIdx >= 0) {
      const row = junk.splice(hitIdx, 1)[0];
      assigned.set(pc.sr, row);
      recovered.push({ pc, row });
    } else {
      stillMissing.push(pc);
    }
  }
  const deleteList = [...junk, ...dupJunk];
  console.log(`classified: assigned ${assigned.size}/337 (recovered ${recovered.length}), delete candidates ${deleteList.length}, create ${stillMissing.length}`);
  recovered.forEach(({ pc, row }) => console.log(`  RECOVERED sr${pc.sr} "${pc.name}" <- prod id=${row.id} code=${row.code} title=${row.accountTitle || row.name}`));
  deleteList.forEach((r) => console.log(`  DELETE id=${r.id} code=${r.code} title=${JSON.stringify(r.accountTitle || r.name)} bal=${r.outstandingBalance}`));
  stillMissing.forEach((pc) => console.log(`  CREATE sr${pc.sr} code=${pc.code} "${pc.name}"`));

  if (!APPLY) {
    // dry-run: also show what balances would be written
    let would = 0;
    for (const r of pdfReceivables) would += r.balanceType === 'CR' ? -r.balance : r.balance;
    console.log(`DRY-RUN done. Would end with net balance ${round2(would).toFixed(2)} DR across 152 parties.`);
    return;
  }

  // ---- deletes ----
  let deleted = 0;
  for (const r of deleteList) {
    await j(`${BASE}/api/customers/${encodeURIComponent(r.id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ source: 'pdf-import-152', user: { id: 'sync', name: 'PDF Sync', role: 'ADMIN' } }),
    });
    deleted++;
  }
  console.log(`Deleted ${deleted} extra customers.`);

  // ---- creates ----
  const createdIds = new Map(); // sr -> new id
  for (const pc of stillMissing) {
    const phones = parseMobiles(pc.mobileRaw);
    const cust = {
      code: pc.code,
      accountCode: pc.code,
      manualCode: '',
      accountTitle: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      name: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      title: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      customerGroup: 'Restaurants',
      regDate: toISODate(pc.date),
      contactPerson: String(pc.contact || '').trim(),
      mobile: phones[0] || '',
      mobile2: phones[1] || '',
      rawMobiles: pc.mobileRaw || '',
      city: String(pc.city || '').trim(),
      area: String(pc.area || '').trim(),
      sector: String(pc.sector || '').trim(),
      location: String(pc.area || '').trim(),
      address: [String(pc.city || '').trim(), String(pc.area || '').trim()].filter(Boolean).join(' '),
      assignedSalesman: String(pc.employee || '').replace(/\s+/g, ' ').trim(),
      salesman: String(pc.employee || '').replace(/\s+/g, ' ').trim(),
      status: 'ACTIVE',
      openingBalance: 0,
      openingBalanceType: 'DR',
      outstandingBalance: 0,
      creditLimit: 30000,
      totalSales: 0,
      sNo: pc.sr,
      srNo: pc.sr,
      pdfOrder: pc.sr,
      companyId: 'comp_default_01',
    };
    const created = await j(`${BASE}/api/customers`, {
      method: 'POST',
      body: JSON.stringify({ customer: cust, source: 'pdf-import-152', user: { id: 'sync', name: 'PDF Sync', role: 'ADMIN' } }),
    });
    createdIds.set(pc.sr, created.id || created.customer?.id);
    console.log(`  CREATED ${pc.code} "${pc.name}" id=${createdIds.get(pc.sr)}`);
  }

  // ---- updates for the 337 ----
  const recBySrTitle = new Map();
  // map receivables to pdf sr via title (exact lower)
  const pdfByTitle = new Map(pdfCustomers.map((p) => [p.name.toLowerCase().trim(), p]));
  for (const r of pdfReceivables) {
    const pc = pdfByTitle.get(r.title.toLowerCase().trim());
    if (!pc) throw new Error(`receivable not in customers PDF: ${r.title}`);
    recBySrTitle.set(pc.sr, r);
  }
  let updated = 0;
  let balCount = 0;
  let net = 0;
  for (const pc of pdfCustomers) {
    const row = assigned.get(pc.sr);
    const id = row ? row.id : createdIds.get(pc.sr);
    if (!id) throw new Error(`no prod id for sr ${pc.sr}`);
    const phones = parseMobiles(pc.mobileRaw);
    const rec = recBySrTitle.get(pc.sr);
    const updates = {
      code: pc.code,
      accountCode: pc.code,
      manualCode: (row && row.manualCode) || '',
      accountTitle: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      name: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      title: String(pc.name || '').replace(/\s+/g, ' ').trim(),
      regDate: toISODate(pc.date),
      contactPerson: String(pc.contact || '').trim(),
      rawMobiles: pc.mobileRaw || '',
      mobile: phones[0] || '',
      mobile2: phones[1] || '',
      city: String(pc.city || '').trim(),
      area: String(pc.area || '').trim(),
      sector: String(pc.sector || '').trim(),
      location: String(pc.area || '').trim(),
      address: [String(pc.city || '').trim(), String(pc.area || '').trim()].filter(Boolean).join(' '),
      assignedSalesman: String(pc.employee || '').replace(/\s+/g, ' ').trim(),
      salesman: String(pc.employee || '').replace(/\s+/g, ' ').trim(),
      sNo: pc.sr,
      srNo: pc.sr,
      pdfOrder: pc.sr,
      openingBalance: 0,
      openingBalanceType: 'DR',
      outstandingBalance: 0,
      lastBillNumber: '',
      lastBillDate: '',
      lastBillAmount: 0,
      lastReceiptDate: '',
      lastReceiptAmount: 0,
    };
    if (rec) {
      const bal = round2(Math.abs(rec.balance));
      updates.accountTitle = rec.title;
      updates.name = rec.title;
      updates.title = rec.title;
      if (rec.phone) updates.mobile = rec.phone;
      if (rec.salesman) {
        updates.assignedSalesman = rec.salesman;
        updates.salesman = rec.salesman;
      }
      updates.openingBalance = bal;
      updates.openingBalanceType = rec.balanceType;
      updates.outstandingBalance = rec.balanceType === 'CR' ? -bal : bal;
      updates.lastBillNumber = rec.lastBillNumber || '';
      updates.lastBillDate = rec.lastBillDate || '';
      updates.lastBillAmount = rec.lastBillAmount || 0;
      updates.lastReceiptDate = rec.lastReceiptDate || '';
      updates.lastReceiptAmount = rec.lastReceiptAmount || 0;
      balCount++;
      net += updates.outstandingBalance;
    }
    await j(`${BASE}/api/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, source: 'pdf-import-152', user: { id: 'sync', name: 'PDF Sync', role: 'ADMIN' } }),
    });
    updated++;
    if (updated % 50 === 0) console.log(`  updated ${updated}/337...`);
  }
  console.log(`Updated ${updated} customers; balances set on ${balCount}; net ${round2(net).toFixed(2)}`);

  // ---- verify ----
  const after = await j(`${BASE}/api/customers`);
  const rows2 = Array.isArray(after) ? after : after.customers;
  const withBal = rows2.filter((c) => Math.abs(Number(c.outstandingBalance) || 0) > 0.001);
  let dr = 0, cr = 0;
  for (const c of withBal) {
    const b = Number(c.outstandingBalance);
    if (b > 0) dr += b; else cr += -b;
  }
  const net2 = round2(dr - cr);
  console.log('--- PROD VERIFY ---');
  console.log(`customers: ${rows2.length} (expect 337)`);
  console.log(`with balance: ${withBal.length} (expect 152)`);
  console.log(`DR ${round2(dr).toFixed(2)} | CR ${round2(cr).toFixed(2)} | NET ${net2.toFixed(2)} (expect 285407.17)`);
  const ok = rows2.length === 337 && withBal.length === 152 && Math.abs(net2 - 285407.17) < 0.005;
  console.log(ok ? 'PROD SYNC OK' : 'PROD VERIFY FAILED');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
