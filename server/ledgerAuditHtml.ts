import { buildAiLedgerMasterAuditReport, labelDate, num, pct, signedNum } from './ledgerAudit';
import { AiLedgerAuditCashRow, AiLedgerAuditReport } from '../src/types';

/**
 * AI LEDGER MASTER BUSINESS AUDIT REPORT - HTML RENDERER
 * ------------------------------------------------------
 * Produces the exact same one-page design as the official
 * "AI Ledger Master Business Audit Report" sample PDF:
 *
 *   Header -> Live strip -> 4 KPI cards
 *   -> Salesman Khata + Salesman Profit (left)
 *   -> Cash & Bank Liquidity Register / Cash In Hand (right)
 *   -> Business Worth strip -> Signatures -> Footer
 *
 * Print-ready (A4) so the browser "Save as PDF" output matches
 * the sample sheet 1:1.
 */

function esc(value: unknown): string {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderAiLedgerAuditHtml(data: AiLedgerAuditReport): string {
  const sym = data.currencySymbol;
  const c = data.company;
  const locationLine = [c.city, c.businessType, c.phone ? `Ph: ${c.phone}` : '', 'AI Munshi (Accountant)']
    .filter(Boolean)
    .join(' &bull; ');

  const card = (
    index: string,
    title: string,
    tag: string,
    rows: { label: string; value: string; color?: string }[],
    topColor: string,
    tagColor: string
  ) => `
    <div class="al-card" style="border-top-color:${topColor}">
      <div class="al-card-h">
        <div class="al-card-t">${esc(index)}. ${esc(title)}</div>
        <div class="al-tag" style="color:${tagColor}">${esc(tag)}</div>
      </div>
      ${rows
        .map(
          (r) =>
            `<div class="al-row"><span class="lbl">${esc(r.label)}</span><span class="val" style="color:${
              r.color || '#1e3a8a'
            }">${r.value}</span></div>`
        )
        .join('')}
    </div>`;

  const noSalesRow = `<tr><td colspan="4" class="muted center">No salesman sales recorded on ${esc(
    data.dateLabel
  )}</td></tr>`;

  const khataRows = data.salesmanKhata.length
    ? data.salesmanKhata
        .map(
          (r) => `<tr>
        <td class="strong">${esc(r.name)} <span class="muted">(${esc(r.route)})</span></td>
        <td class="num">${num(r.opening)}</td>
        <td class="num strong green">${num(r.todaySold)}</td>
        <td class="num">${num(r.closing)}</td>
      </tr>`
        )
        .join('')
    : noSalesRow;

  const profitRows = data.salesmanProfit.length
    ? data.salesmanProfit
        .map(
          (r) => `<tr>
        <td>${esc(r.name)}</td>
        <td class="num">${num(r.todaySales)}</td>
        <td class="num">${r.todaySales > 0 ? pct(r.marginPct) : '0.0%'}</td>
        <td class="num strong green">${sym} ${num(r.netProfit)}</td>
      </tr>`
        )
        .join('')
    : noSalesRow;

  const toneClass = (direction: string) =>
    direction === 'in' ? 'green' : direction === 'out' ? 'red' : 'muted';

  const cashRows = (rows: AiLedgerAuditCashRow[]) =>
    rows
      .map(
        (r) => `<div class="al-cash-row">
        <span class="lbl">${esc(r.label)}</span>
        <span class="amt ${toneClass(r.direction)}">${
          r.direction === 'memo' ? `${sym} ${num(r.value)}` : signedNum(r.value, sym, r.direction)
        }</span>
        <span class="tag">${esc(r.tag)}</span>
      </div>`
      )
      .join('');

  const footerLeft = [
    c.name,
    c.ownerName ? `Proprietor: ${c.ownerName}` : '',
    c.address ? `${c.address}, ${c.city}` : c.city,
  ]
    .filter(Boolean)
    .join(' &bull; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Ledger Master Business Audit Report</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#ffffff; }
  body { font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color:#0f172a;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .al-page { width:100%; max-width:196mm; margin:0 auto; padding:2mm 0 0; }

  /* ---------- HEADER ---------- */
  .al-head { display:flex; align-items:center; justify-content:space-between; gap:10px;
    background:linear-gradient(90deg,#0b1220 0%,#111c2e 55%,#0d1a2a 100%);
    border-left:5px solid #10b981; border-bottom:3px solid #10b981;
    border-radius:9px; padding:9px 13px; color:#fff; }
  .al-head-l { display:flex; align-items:center; gap:10px; min-width:0; }
  .al-logo { width:36px; height:36px; border-radius:8px; flex:0 0 36px; overflow:hidden;
    background:linear-gradient(135deg,#10b981,#059669); display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:18px; color:#fff; }
  .al-logo img { width:100%; height:100%; object-fit:cover; }
  .al-title { font-size:19px; font-weight:800; line-height:1.05; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .al-badge { background:#2563eb; color:#fff; font-size:8.5px; padding:3px 8px; border-radius:999px;
    font-weight:800; letter-spacing:.4px; }
  .al-sub { font-size:10px; color:#cbd5e1; margin-top:3px; }
  .al-head-r { text-align:right; flex:0 0 auto; }
  .al-date { font-size:11px; font-weight:700; color:#fff; }
  .al-verified { display:inline-block; margin-top:5px; border:1px solid #34d399; color:#6ee7b7;
    font-size:8.5px; padding:3px 8px; border-radius:5px; font-weight:800; letter-spacing:.3px; }

  /* ---------- LIVE STRIP ---------- */
  .al-strip { display:flex; align-items:center; flex-wrap:wrap; gap:6px 14px; background:#f8fafc;
    border:1px solid #e2e8f0; border-radius:7px; padding:5px 10px; margin-top:7px; font-size:10px; }
  .al-strip .live { color:#047857; font-weight:800; }
  .al-strip .it { color:#475569; }
  .al-strip .it b { font-weight:800; }
  .al-strip .dot { width:7px; height:7px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:5px; }

  /* ---------- KPI CARDS ---------- */
  .al-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:8px; }
  .al-card { background:#f8fafc; border:1px solid #e2e8f0; border-top:3px solid #2563eb;
    border-radius:7px; padding:7px 8px; }
  .al-card-h { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; }
  .al-card-t { font-size:10px; font-weight:800; color:#0f172a; text-transform:uppercase; line-height:1.15; }
  .al-tag { font-size:8px; font-weight:800; text-align:right; text-transform:uppercase; line-height:1.2; max-width:58px; }
  .al-row { display:flex; justify-content:space-between; align-items:flex-start; gap:8px;
    font-size:9.5px; margin-top:5px; }
  .al-row .lbl { color:#475569; }
  .al-row .val { font-weight:800; text-align:right; white-space:nowrap; }

  /* ---------- PANELS ---------- */
  .al-grid { display:grid; grid-template-columns:1.16fr 1fr; gap:8px; margin-top:8px; align-items:start; }
  .al-col { display:flex; flex-direction:column; gap:8px; }
  .al-panel { background:#f8fafc; border:1px solid #e2e8f0; border-radius:7px; overflow:hidden; }
  .al-panel-h { display:flex; justify-content:space-between; align-items:center; gap:6px; padding:6px 9px; }
  .al-panel-h .t { font-size:10px; font-weight:800; text-transform:uppercase; line-height:1.2; }
  .al-panel-h .s { font-size:8px; font-weight:800; color:#64748b; text-align:right; text-transform:uppercase;
    line-height:1.2; max-width:74px; }
  .al-sec { display:flex; justify-content:space-between; gap:6px; font-size:8px; font-weight:800; color:#64748b;
    text-transform:uppercase; padding:5px 9px 3px; border-top:1px solid #e2e8f0; }
  table.al-t { width:100%; border-collapse:collapse; font-size:9.5px; }
  .al-t th { background:#f1f5f9; color:#334155; font-size:8px; text-transform:uppercase; letter-spacing:.2px;
    padding:4px 8px; text-align:left; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; }
  .al-t td { padding:4px 8px; border-bottom:1px solid #eef2f7; color:#334155; }
  .al-t tr:last-child td { border-bottom:none; }
  .al-t .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .al-t .center { text-align:center; }
  .strong { font-weight:800; color:#0f172a; }
  .green { color:#15803d; }
  .red { color:#dc2626; }
  .amber { color:#b45309; }
  .blue { color:#1d4ed8; }
  .muted { color:#94a3b8; }
  .al-total { display:flex; justify-content:space-between; gap:8px; font-size:10px; font-weight:800;
    padding:6px 9px; background:#f1f5f9; border-top:1px solid #e2e8f0; color:#0f172a; }

  /* ---------- CASH REGISTER ---------- */
  .al-cash-row { display:flex; align-items:center; gap:6px; padding:4px 9px; font-size:9.5px;
    border-bottom:1px solid #f1f5f9; }
  .al-cash-row .lbl { flex:1; color:#334155; }
  .al-cash-row .amt { min-width:74px; text-align:right; font-weight:800; white-space:nowrap; }
  .al-cash-row .tag { width:58px; text-align:right; font-size:7.5px; font-weight:800; color:#94a3b8;
    text-transform:uppercase; }
  .al-cash-row.hl { background:#ecfdf5; border-bottom:none; border-top:1px solid #a7f3d0; padding:7px 9px; }
  .al-cash-row.hl .lbl { font-weight:800; color:#065f46; font-size:10.5px; text-transform:uppercase; }
  .al-cash-row.hl .amt { font-size:12.5px; color:#047857; }
  .al-cash-row.hl .tag { color:#059669; }

  /* ---------- BUSINESS WORTH ---------- */
  .al-worth { display:grid; grid-template-columns:repeat(5,1fr); border:1px solid #e2e8f0;
    border-radius:7px; overflow:hidden; margin-top:8px; }
  .al-worth > div { padding:7px 9px; border-right:1px solid #e2e8f0; background:#f8fafc; }
  .al-worth > div:last-child { border-right:none; background:#eff6ff; text-align:right; }
  .al-worth .k { font-size:8px; font-weight:800; text-transform:uppercase; color:#0f172a; line-height:1.2; }
  .al-worth .v { font-size:14px; font-weight:800; margin-top:3px; white-space:nowrap; }
  .al-worth .c { font-size:8px; color:#64748b; margin-top:2px; }

  /* ---------- SIGNATURES & FOOTER ---------- */
  .al-sign { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px;
    border-top:1.5px dashed #94a3b8; padding-top:7px; }
  .al-sign div { text-align:center; font-size:9.5px; font-weight:800; color:#0f172a; }
  .al-foot { display:flex; justify-content:space-between; gap:12px; margin-top:9px; padding-top:5px;
    border-top:1px solid #e2e8f0; font-size:8.5px; color:#94a3b8; }

  @media print {
    html, body { background:#fff !important; }
    .al-page { max-width:none; padding:0; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  }
</style>
</head>
<body>
<div class="al-page">

  <!-- ================= HEADER ================= -->
  <div class="al-head">
    <div class="al-head-l">
      <div class="al-logo">${c.logo ? `<img src="${esc(c.logo)}" alt="logo" />` : esc(c.initial)}</div>
      <div style="min-width:0">
        <div class="al-title">${esc(c.name)}<span class="al-badge">AI LEDGER</span></div>
        <div class="al-sub">${locationLine}</div>
      </div>
    </div>
    <div class="al-head-r">
      <div class="al-date">Date: ${esc(data.dateLabel)} | Closing: ${esc(data.closingTime)}</div>
      <div class="al-verified">LIVE SYNCED &bull; AUDIT VERIFIED</div>
    </div>
  </div>

  <!-- ================= LIVE STRIP ================= -->
  <div class="al-strip">
    <span><span class="dot"></span><span class="live">LIVE WHOLESALE ERP</span></span>
    <span class="it">Today Revenue: <b class="strong">${sym} ${num(data.strip.todayRevenue)}</b></span>
    <span class="it">Net Profit: <b class="${data.strip.netProfit >= 0 ? 'green' : 'red'}">${
      data.strip.netProfit >= 0 ? '+' : ''
    }${sym} ${num(data.strip.netProfit)}</b> (${pct(data.strip.netMarginPct)})</span>
    <span class="it">Receivables Due (Udhaar): <b class="amber">${sym} ${num(data.strip.receivables)}</b></span>
    <span class="it">Warehouse Stock: <b class="blue">${sym} ${num(data.strip.warehouseStock)}</b></span>
  </div>

  <!-- ================= 4 KPI CARDS ================= -->
  <div class="al-cards">
    ${card(
      '1',
      'Sales Record',
      data.currency,
      [
        { label: 'Sales This Month:', value: `${sym} ${num(data.salesCard.monthSales)}` },
        { label: "Today's Sales:", value: `${sym} ${num(data.salesCard.todaySales)}` },
        { label: 'Total Sales:', value: `${sym} ${num(data.salesCard.totalSales)}` },
      ],
      '#2563eb',
      '#2563eb'
    )}
    ${card(
      '2',
      'Purchases',
      data.currency,
      [
        { label: 'Purchases This Month:', value: `${sym} ${num(data.purchaseCard.monthPurchases)}` },
        { label: "Today's Purchases:", value: `${sym} ${num(data.purchaseCard.todayPurchases)}` },
        { label: 'Total Purchases:', value: `${sym} ${num(data.purchaseCard.totalPurchases)}` },
      ],
      '#3b82f6',
      '#2563eb'
    )}
    ${card(
      '3',
      'Khata Balance',
      'Status',
      [
        { label: 'Receivable (Udhaar):', value: `${sym} ${num(data.khataCard.receivable)}`, color: '#b45309' },
        { label: 'Payable (Suppliers):', value: `${sym} ${num(data.khataCard.payable)}`, color: '#dc2626' },
        {
          label: 'Net Balance (+/-):',
          value: `${data.khataCard.netBalance >= 0 ? '+' : '\u2212'}${sym} ${num(
            Math.abs(data.khataCard.netBalance)
          )}`,
          color: data.khataCard.netBalance >= 0 ? '#15803d' : '#dc2626',
        },
      ],
      '#f59e0b',
      '#f59e0b'
    )}
    ${card(
      '4',
      'Stock Movement',
      data.stockCard.unitLabel,
      [
        {
          label: 'Opening / Stock In:',
          value: `${num(data.stockCard.openingUnits)} / +${num(data.stockCard.stockIn)}`,
          color: '#1e3a8a',
        },
        { label: 'Stock Out (Sold):', value: `\u2212 ${num(data.stockCard.stockOut)}`, color: '#dc2626' },
        { label: 'Closing Stock:', value: num(data.stockCard.closingUnits), color: '#6d28d9' },
      ],
      '#7c3aed',
      '#2563eb'
    )}
  </div>

  <!-- ================= MAIN GRID ================= -->
  <div class="al-grid">

    <!-- LEFT COLUMN -->
    <div class="al-col">
      <div class="al-panel">
        <div class="al-panel-h">
          <div class="t" style="color:#0f766e">RETAIL SALES BY SALESMAN (VAN &amp; ROUTE KHATA)</div>
          <div class="s">DAILY AUDIT</div>
        </div>
        <table class="al-t">
          <thead>
            <tr>
              <th>Salesman / Route</th>
              <th class="num">Opening (${sym})</th>
              <th class="num">Today Sold</th>
              <th class="num">Closing (${sym})</th>
            </tr>
          </thead>
          <tbody>${khataRows}</tbody>
        </table>
      </div>

      <div class="al-panel">
        <div class="al-panel-h">
          <div class="t" style="color:#1d4ed8">PROFIT BY SALESMAN (NET MARGIN CONTRIBUTION)</div>
          <div class="s" style="color:#2563eb">COMMISSION &amp; PROFIT</div>
        </div>
        <table class="al-t">
          <thead>
            <tr>
              <th>Sales Representative</th>
              <th class="num">Today Sales</th>
              <th class="num">Margin %</th>
              <th class="num">Net Profit (${sym})</th>
            </tr>
          </thead>
          <tbody>${profitRows}</tbody>
        </table>
        <div class="al-total">
          <span>TOTAL SALESMEN PROFIT:</span>
          <span class="green">${sym} ${num(data.totalSalesmenProfit)}</span>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN : CASH & BANK LIQUIDITY REGISTER -->
    <div class="al-col">
      <div class="al-panel">
        <div class="al-panel-h">
          <div class="t" style="color:#0f172a">7. CASH &amp; BANK LIQUIDITY REGISTER (TIJORI / KHATA)</div>
          <div class="s">DAILY CLOSING</div>
        </div>

        <div class="al-sec"><span>CASH INFLOWS &amp; OUTFLOWS</span><span>TYPE</span></div>
        ${cashRows(data.cash.inflows)}

        <div class="al-sec"><span>BANK ACCOUNTS</span><span>ONLINE</span></div>
        ${cashRows(data.cash.bankRows)}

        <div class="al-sec"><span>GALLA / TIJORI RECONCILIATION</span><span>AUDIT</span></div>
        <div class="al-cash-row">
          <span class="lbl">Last Day Balance (Previous Cash B/F)</span>
          <span class="amt strong">${sym} ${num(data.cash.openingBalance)}</span>
          <span class="tag">OPENING</span>
        </div>
        <div class="al-cash-row">
          <span class="lbl">Today Balance (Net Cash Movement)</span>
          <span class="amt ${data.cash.todayNet >= 0 ? 'green' : 'red'}">${data.cash.todayNet >= 0 ? '+' : '\u2212'} ${sym} ${num(
            Math.abs(data.cash.todayNet)
          )}</span>
          <span class="tag">${data.cash.todayNet >= 0 ? 'SURPLUS' : 'DEFICIT'}</span>
        </div>
        <div class="al-cash-row hl">
          <span class="lbl">CASH IN HAND (Physical Vault)</span>
          <span class="amt">${sym} ${num(data.cash.cashInHand)}</span>
          <span class="tag">VERIFIED</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= BUSINESS WORTH ================= -->
  <div class="al-worth">
    <div>
      <div class="k">WAREHOUSE STOCK VALUE</div>
      <div class="v blue">${sym} ${num(data.worth.stockValue)}</div>
      <div class="c">${esc(data.worth.stockUnitCaption)}</div>
    </div>
    <div>
      <div class="k">MARKET UDHAAR (+)</div>
      <div class="v green">+ ${sym} ${num(data.worth.udhaar)}</div>
      <div class="c">Baaqi wusooli due</div>
    </div>
    <div>
      <div class="k">SUPPLIER PAYABLE (-)</div>
      <div class="v red">\u2212 ${sym} ${num(data.worth.payable)}</div>
      <div class="c">Mill &amp; vendor liability</div>
    </div>
    <div>
      <div class="k">FIX EXPENSE / SETUP (-)</div>
      <div class="v amber">\u2212 ${sym} ${num(data.worth.fixExpense)}</div>
      <div class="c">Monthly rent &amp; wages</div>
    </div>
    <div>
      <div class="k">TOTAL BUSINESS WORTH</div>
      <div class="v blue">${sym} ${num(data.worth.total)}</div>
      <div class="c">Net Business Equity</div>
    </div>
  </div>

  <!-- ================= SIGNATURES ================= -->
  <div class="al-sign">
    <div>Accountant / AI Munshi Operator</div>
    <div>Sales Supervisor / Route Incharge</div>
    <div>Managing Director / Owner Approval</div>
  </div>

  <!-- ================= FOOTER ================= -->
  <div class="al-foot">
    <span>${footerLeft} &bull; AI LEDGER &bull; LIVE WHOLESALE ERP &bull; Master Audit Report</span>
    <span>Auto-Generated by AI Munshi &bull; Page 1 of 1</span>
  </div>

</div>
</body>
</html>`;
}

/** Word-compatible envelope so the report also downloads as a .doc like the other reports. */
export function renderAiLedgerAuditDoc(data: AiLedgerAuditReport): string {
  const html = renderAiLedgerAuditHtml(data);
  const wordXml = `<xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>`;
  return html
    .replace('<head>', `<head>\n<!--[if gte mso 9]>${wordXml}<![endif]-->`)
    .replace('<title>', '<title>');
}

export function generateAiLedgerAuditHtml(requestedDate?: string): {
  success: boolean;
  error?: string;
  fileName: string;
  html: string;
  data?: AiLedgerAuditReport;
} {
  const result = buildAiLedgerMasterAuditReport(requestedDate);
  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Report generation failed.', fileName: result.fileName, html: '' };
  }
  return {
    success: true,
    fileName: result.fileName,
    html: renderAiLedgerAuditHtml(result.data),
    data: result.data,
  };
}

export function generateAiLedgerAuditDoc(requestedDate?: string): {
  success: boolean;
  error?: string;
  fileName: string;
  docContent: string;
  data?: AiLedgerAuditReport;
} {
  const result = buildAiLedgerMasterAuditReport(requestedDate);
  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Report generation failed.', fileName: result.fileName, docContent: '' };
  }
  return {
    success: true,
    fileName: result.fileName.replace(/\.html$/, '.doc'),
    docContent: renderAiLedgerAuditDoc(result.data),
    data: result.data,
  };
}

export { labelDate };
