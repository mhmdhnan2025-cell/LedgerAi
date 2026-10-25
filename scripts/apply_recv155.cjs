const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CO = 'comp-muocj00t-j3co';
const TENANT = path.join(ROOT, 'data', `database_${CO}.json`);
const SEED = path.join(ROOT, 'server', 'seeds', 'receivables_pdf_155_final.json');

const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2);

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const tenant = JSON.parse(fs.readFileSync(TENANT, 'utf8'));

const byId = new Map(tenant.customers.map((c) => [c.id, c]));
const keep = new Set(seed.map((r) => r.customerId));

const touched = [];
for (const c of tenant.customers) {
  const had = c.receivableSerial != null && c.receivableSerial !== '';
  if (!had && !keep.has(c.id)) continue;
  touched.push({ id: c.id, title: c.accountTitle, serial: had ? c.receivableSerial : null, kept: keep.has(c.id) });

  if (!keep.has(c.id)) {
    c.openingBalance = 0;
    c.opening_balance = money(0);
    c.openingBalanceType = 'DR';
    c.opening_balance_type = 'DR';
    c.outstandingBalance = 0;
    c.outstanding_balance = money(0);
    c.receivableSerial = null;
    c.lastBillNumber = '';
    c.lastBillDate = '';
    c.lastBillAmount = 0;
    c.lastReceiptDate = '';
    c.lastReceiptAmount = 0;
  }
}

const applied = [];
const missing = [];
for (const r of seed) {
  const c = byId.get(r.customerId);
  if (!c) { missing.push(r.sNo + ':' + r.title); continue; }
  const amt = Number(r.balance);
  const cr = r.balanceType === 'CR';
  c.openingBalance = Math.round(amt * 100) / 100;
  c.opening_balance = money(amt);
  c.openingBalanceType = r.balanceType;
  c.opening_balance_type = r.balanceType;
  c.outstandingBalance = cr ? -Math.round(amt * 100) / 100 : Math.round(amt * 100) / 100;
  c.outstanding_balance = money(cr ? -amt : amt);
  c.receivableSerial = r.sNo;
  c.lastBillNumber = r.lastBillNumber || '';
  c.lastBillDate = r.lastBillDate || '';
  c.lastBillAmount = Number(r.lastBillAmount) || 0;
  c.lastReceiptDate = r.lastReceiptDate || '';
  c.lastReceiptAmount = Number(r.lastReceiptAmount) || 0;
  if (c.data && typeof c.data === 'object') {
    for (const k of [
      'openingBalance', 'opening_balance', 'openingBalanceType', 'opening_balance_type',
      'outstandingBalance', 'outstanding_balance', 'receivableSerial',
      'lastBillNumber', 'lastBillDate', 'lastBillAmount', 'lastReceiptDate', 'lastReceiptAmount',
    ]) c.data[k] = c[k];
  }
  applied.push(c.id);
}

fs.writeFileSync(TENANT, JSON.stringify(tenant), 'utf8');

const cleared = touched.filter((c) => !c.kept);
const active = tenant.customers.filter((c) => (c.outstandingBalance || 0) !== 0);
const dr = active.filter((c) => c.outstandingBalance > 0).reduce((a, c) => a + c.outstandingBalance, 0);
const cr = active.filter((c) => c.outstandingBalance < 0).reduce((a, c) => a + c.outstandingBalance, 0);
const opening = active.reduce((a, c) => a + (c.openingBalance || 0), 0);

console.log(`[apply] applied=${applied.length} missing=${missing.length}${missing.length ? ' -> ' + missing.join(', ') : ''}`);
console.log(`[apply] cleared receivables=${cleared.length}: ${cleared.map((c) => c.title + '(' + c.serial + ')').join(', ') || '-'}`);
console.log(`[apply] customers with receivable=${active.length} DR=${dr.toFixed(2)} CR=${cr.toFixed(2)} NET=${(dr + cr).toFixed(2)} openingSum=${opening.toFixed(2)}`);
