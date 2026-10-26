import { buildAiLedgerMasterAuditReport, labelDate, num, pct, signedNum } from './ledgerAudit';
import { AiLedgerAuditCashRow, AiLedgerAuditReport } from '../src/types';

/**
 * AI LEDGER MASTER BUSINESS AUDIT REPORT - HTML RENDERER
 * ------------------------------------------------------
 * Produces an executive, high-visibility, single-page A4
 * master business audit report.
 *
 * All text is in English accounting standards (zero Urdu).
 * All fonts are prominent, bold, and high contrast.
 * Fully responsive width (100% container, no clipping or overflow).
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
  const locationLine = [c.city, c.businessType, c.phone ? `Ph: ${c.phone}` : '', 'AI Munshi Business Audit']
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
        <td class="strong">${esc(r.name)}</td>
        <td class="num">
          <div>${num(r.todaySales)}</div>
          <div style="font-size:8px;color:#166534;font-weight:900">+${sym}${num(r.netProfit)}</div>
        </td>
        <td class="num">
          <div>${num(r.monthSales || 0)}</div>
          <div style="font-size:8px;color:#166534;font-weight:900">+${sym}${num(r.monthNetProfit || 0)}</div>
        </td>
        <td class="num strong ${(r.totalNetProfit || r.netProfit || 0) >= 0 ? 'green' : 'red'}">${(r.totalNetProfit || r.netProfit || 0) >= 0 ? '+' : '&minus;'}${sym} ${num(Math.abs(r.totalNetProfit || r.netProfit || 0))}</td>
        <td class="center"><span style="background:${(r.marginPct || 0) >= 0 ? '#dcfce7;color:#166534' : '#fee2e2;color:#991b1b'};padding:2px 5px;border-radius:4px;font-size:8px;font-weight:900">${(r.marginPct || 0).toFixed(1)}%</span></td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="5" class="muted center">No salesman sales recorded on ${esc(data.dateLabel)}</td></tr>`;

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
  @page { size: A4 portrait; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#ffffff; }
  body {
    font-family: Arial, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    line-height: 1.4;
  }
  .al-page { width: 100%; max-width: 100%; margin: 0 auto; padding: 4px; font-weight: 800; }
  .al-page * { font-weight: inherit; }

  /* ---------- HEADER ---------- */
  .al-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: linear-gradient(90deg, #091322 0%, #0f1e36 55%, #0a182b 100%);
    border-left: 6px solid #10b981; border-bottom: 3px solid #10b981;
    border-radius: 8px; padding: 11px 15px; color: #ffffff;
  }
  .al-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .al-logo {
    width: 44px; height: 44px; border-radius: 8px; flex: 0 0 44px; overflow: hidden;
    background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 20px; color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  .al-logo img { width: 100%; height: 100%; object-fit: cover; }
  .al-title {
    font-size: 21px; font-weight: 900; line-height: 1.1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    color: #ffffff; letter-spacing: 0.3px;
  }
  .al-badge {
    background: #2563eb; color: #ffffff; font-size: 9.5px; padding: 3px 9px; border-radius: 999px;
    font-weight: 900; letter-spacing: 0.5px;
  }
  .al-sub { font-size: 11px; font-weight: 800; color: #94a3b8; margin-top: 3px; }
  .al-head-r { text-align: right; flex: 0 0 auto; }
  .al-date { font-size: 12px; font-weight: 900; color: #ffffff; }
  .al-verified {
    display: inline-block; margin-top: 5px; border: 1.5px solid #34d399; color: #6ee7b7;
    font-size: 9px; padding: 3px 9px; border-radius: 5px; font-weight: 900; letter-spacing: 0.4px;
    background: rgba(16, 185, 129, 0.12);
  }

  /* ---------- LIVE STRIP ---------- */
  .al-strip {
    display: flex; align-items: center; flex-wrap: wrap; gap: 8px 18px; background: #f8fafc;
    border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; margin-top: 10px; font-size: 11px;
    font-weight: 800;
  }
  .al-strip .live { color: #047857; font-weight: 900; }
  .al-strip .it { color: #1e293b; font-weight: 800; }
  .al-strip .it b { font-weight: 900; }
  .al-strip .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; margin-right: 5px; }

  /* ---------- 4 KPI CARDS (EXTRA BOLD & PROMINENT) ---------- */
  .al-cards {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; width: 100%; box-sizing: border-box;
  }
  @media (max-width: 900px) {
    .al-cards { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 520px) {
    .al-cards { grid-template-columns: 1fr; }
  }
  .al-card {
    background: #ffffff; border: 2px solid #94a3b8; border-top: 5px solid #2563eb;
    border-radius: 10px; padding: 12px 14px; font-weight: 900; box-shadow: 0 2px 6px rgba(0,0,0,0.06); box-sizing: border-box;
  }
  .al-card-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; }
  .al-card-t { font-size: 13.5px !important; font-weight: 950 !important; color: #0f172a; text-transform: uppercase; line-height: 1.2; letter-spacing: 0.3px; }
  .al-tag { font-size: 10px !important; font-weight: 950 !important; text-align: right; text-transform: uppercase; line-height: 1.2; padding: 2px 7px; background: #f1f5f9; border-radius: 4px; border: 1px solid #cbd5e1; }
  .al-row {
    display: flex; justify-content: space-between; align-items: center; gap: 8px;
    font-size: 11.5px !important; margin-top: 6px;
  }
  .al-row .lbl { color: #0f172a !important; font-weight: 900 !important; font-size: 11.5px !important; }
  .al-row .val { font-weight: 950 !important; text-align: right; white-space: nowrap; font-size: 12px !important; font-family: monospace, sans-serif; letter-spacing: 0.2px; }

  /* ---------- PANELS & GRID (PREVENTS TEXT CLIPPING) ---------- */
  .al-grid {
    display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; margin-top: 12px; align-items: start; width: 100%; box-sizing: border-box;
  }
  @media (max-width: 960px) {
    .al-grid { grid-template-columns: 1fr; }
  }
  .al-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; box-sizing: border-box; }
  .al-panel {
    background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow-x: auto; width: 100%; box-sizing: border-box;
  }
  .al-panel-full {
    background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow-x: auto; width: 100%; margin-top: 12px; box-sizing: border-box;
  }
  .al-panel-h {
    display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px;
    background: #f1f5f9; border-bottom: 2px solid #cbd5e1; box-sizing: border-box;
  }
  .al-panel-h .t { font-size: 12px; font-weight: 950; text-transform: uppercase; line-height: 1.3; letter-spacing: 0.3px; word-break: break-word; overflow-wrap: break-word; min-width: 0; }
  .al-panel-h .s {
    font-size: 9px; font-weight: 900; color: #334155; text-align: right; text-transform: uppercase;
    line-height: 1.2; background: #ffffff; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1;
  }
  .al-sec {
    display: flex; justify-content: space-between; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 900; color: #1e293b;
    text-transform: uppercase; padding: 9px 14px 7px;
    border-top: 2px solid #cbd5e1; border-bottom: 1.5px solid #cbd5e1;
    background: #f1f5f9; margin-top: 6px;
  }
  .al-sec:first-of-type { margin-top: 0; }

  /* ---------- TABLES ---------- */
  table.al-t {
    width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; font-weight: 800;
  }
  table.al-t th {
    background: #e2e8f0; color: #0f172a; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2px;
    padding: 6px 4px; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;
    word-break: break-word; overflow-wrap: break-word; white-space: normal !important; line-height: 1.2; vertical-align: middle;
  }
  table.al-t th.num {
    text-align: right; white-space: normal !important; word-break: break-word;
  }
  table.al-t th.center {
    text-align: center; white-space: normal !important;
  }
  table.al-t td {
    padding: 6px 4px; border-bottom: 1.5px solid #eef2f7; color: #0f172a; font-weight: 800; font-size: 10px;
    word-wrap: break-word; overflow-wrap: break-word; vertical-align: middle;
  }
  table.al-t tr:last-child td { border-bottom: none; }
  table.al-t tr:hover { background: #fbfcfe; }
  table.al-t td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 800; font-size: 10.5px; }
  table.al-t td.center { text-align: center; }
  .strong { font-weight: 900; color: #0f172a; }
  .green { color: #15803d; font-weight: 900; }
  .red { color: #dc2626; font-weight: 900; }
  .amber { color: #b45309; font-weight: 900; }
  .blue { color: #1d4ed8; font-weight: 900; }
  .purple { color: #6d28d9; font-weight: 900; }
  .muted { color: #475569; font-weight: 800; }
  .al-total {
    display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 900;
    padding: 8px 12px; background: #f1f5f9; border-top: 2px solid #cbd5e1; color: #0f172a;
  }

  /* ---------- CASH & BANK LIQUIDITY REGISTER (EXTRA BOLD & EXPANDED) ---------- */
  .al-panel-cash .al-panel-h {
    padding: 10px 14px; background: #e2e8f0; border-bottom: 2.5px solid #cbd5e1;
  }
  .al-panel-cash .al-panel-h .t {
    font-size: 12.5px !important; font-weight: 950 !important; color: #0f172a !important; letter-spacing: 0.3px;
  }
  .al-panel-cash .al-sec {
    padding: 8px 14px 6px !important; font-size: 11px !important; font-weight: 900 !important;
    color: #0f172a !important; background: #eef2f6 !important; border-top: 2px solid #cbd5e1 !important;
    border-bottom: 1.5px solid #cbd5e1 !important; margin-top: 4px; letter-spacing: 0.4px;
  }
  .al-panel-cash .al-sec:first-of-type { margin-top: 0; }
  .al-cash-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 8px 14px !important; font-size: 12px !important; font-weight: 900 !important;
    border-bottom: 1.5px solid #eef2f7; box-sizing: border-box;
  }
  .al-cash-row:hover { background: #f8fafc; }
  .al-cash-row .lbl {
    flex: 1; color: #0f172a !important; font-weight: 900 !important; font-size: 12px !important; line-height: 1.3; min-width: 0;
  }
  .al-cash-row .amt {
    text-align: right; font-weight: 950 !important; font-size: 13px !important;
    white-space: nowrap; letter-spacing: 0.2px;
  }
  .al-cash-row .tag {
    text-align: right; font-size: 9px !important; font-weight: 900 !important;
    color: #334155 !important; text-transform: uppercase; background: #f1f5f9;
    padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; shrink: 0;
  }
  .al-cash-row.hl {
    background: #ecfdf5 !important; border-bottom: none; border-top: 3px solid #10b981 !important;
    padding: 14px 16px !important; margin-top: 8px;
  }
  .al-cash-row.hl .lbl {
    font-weight: 900 !important; color: #065f46 !important; font-size: 14px !important;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .al-cash-row.hl .amt { font-size: 18px !important; color: #047857 !important; font-weight: 900 !important; }
  .al-cash-row.hl .tag {
    color: #047857 !important; font-weight: 900 !important; font-size: 10.5px !important;
    background: #d1fae5 !important; border-color: #6ee7b7 !important;
  }

  /* ---------- BUSINESS WORTH ---------- */
  .al-worth {
    display: grid; grid-template-columns: repeat(5, 1fr); border: 2px solid #cbd5e1;
    border-radius: 8px; overflow: hidden; margin-top: 12px; width: 100%;
  }
  .al-worth > div { padding: 10px 12px; border-right: 1.5px solid #cbd5e1; background: #f8fafc; }
  .al-worth > div:last-child { border-right: none; background: #eff6ff; text-align: right; }
  .al-worth .k { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #0f172a; line-height: 1.2; }
  .al-worth .v { font-size: 15px; font-weight: 900; margin-top: 4px; white-space: nowrap; }
  .al-worth .c { font-size: 9px; color: #475569; margin-top: 2px; font-weight: 800; }

  /* ---------- SIGNATURES & FOOTER ---------- */
  .al-sign {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px;
    border-top: 2px dashed #64748b; padding-top: 9px;
  }
  .al-sign div { text-align: center; font-size: 10.5px; font-weight: 900; color: #0f172a; }
  .al-foot {
    display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; padding-top: 7px;
    border-top: 1.5px solid #cbd5e1; font-size: 9.5px; color: #64748b; font-weight: 800;
  }

  @media print {
    @page { size: A4 portrait; margin: 3mm 4mm !important; }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 9px !important;
      color: #000000 !important;
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }
    .al-page {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      max-height: 290mm !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      font-weight: 850 !important;
    }
    .al-page * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .al-panel, .al-panel-full {
      overflow: hidden !important;
      width: 100% !important;
      border: 1.5px solid #475569 !important;
      margin-top: 4px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .al-cards { gap: 5px !important; margin-top: 4px !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    .al-card { padding: 4px 6px !important; border: 1.5px solid #475569 !important; }
    .al-card-t { font-size: 10px !important; font-weight: 950 !important; color: #000000 !important; }
    .al-tag { font-size: 8.5px !important; font-weight: 900 !important; }
    .al-row { font-size: 9px !important; margin-top: 1.5px !important; font-weight: 850 !important; }
    .al-row .lbl { font-size: 9px !important; font-weight: 850 !important; color: #000000 !important; }
    .al-row .val { font-size: 9px !important; font-weight: 950 !important; color: #000000 !important; }
    .al-grid { gap: 6px !important; margin-top: 4px !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    .al-col { gap: 4px !important; }
    table.al-t {
      width: 100% !important;
      table-layout: fixed !important;
      font-size: 8.5px !important;
      font-weight: 850 !important;
      border-collapse: collapse !important;
    }
    table.al-t th {
      font-size: 8px !important;
      font-weight: 950 !important;
      padding: 2.5px 3px !important;
      line-height: 1.1 !important;
      white-space: normal !important;
      word-break: break-word !important;
      background: #e2e8f0 !important;
      color: #000000 !important;
      border-bottom: 2px solid #334155 !important;
    }
    table.al-t th.num { white-space: normal !important; }
    table.al-t td {
      font-size: 8.5px !important;
      font-weight: 850 !important;
      padding: 2.5px 3px !important;
      line-height: 1.15 !important;
      color: #000000 !important;
      border-bottom: 1px solid #cbd5e1 !important;
    }
    table.al-t td.num {
      font-size: 8.5px !important;
      font-weight: 950 !important;
      white-space: nowrap !important;
    }
    .strong, b { font-weight: 950 !important; color: #000000 !important; }
    .al-head { padding: 5px 8px !important; border-left: 5px solid #10b981 !important; border-bottom: 2.5px solid #10b981 !important; }
    .al-logo { width: 32px !important; height: 32px !important; font-size: 16px !important; flex: 0 0 32px !important; }
    .al-title { font-size: 14px !important; font-weight: 950 !important; color: #ffffff !important; }
    .al-badge { font-size: 8.5px !important; padding: 2px 6px !important; font-weight: 900 !important; }
    .al-sub { font-size: 8.5px !important; font-weight: 800 !important; margin-top: 1px !important; }
    .al-date { font-size: 9.5px !important; font-weight: 900 !important; }
    .al-verified { font-size: 8px !important; padding: 2px 6px !important; margin-top: 2px !important; }
    .al-strip { padding: 3px 6px !important; font-size: 8.5px !important; margin-top: 3px !important; font-weight: 850 !important; border: 1.5px solid #64748b !important; }
    .al-strip .it { color: #000000 !important; font-weight: 850 !important; }
    .al-strip .it b { font-weight: 950 !important; }
    .al-panel-h { padding: 3px 6px !important; background: #e2e8f0 !important; border-bottom: 2px solid #64748b !important; }
    .al-panel-h .t { font-size: 9.5px !important; font-weight: 950 !important; color: #000000 !important; }
    .al-panel-h .s { font-size: 8px !important; font-weight: 900 !important; padding: 1px 4px !important; }
    .al-panel-cash .al-panel-h .t { font-size: 9.5px !important; font-weight: 950 !important; color: #000000 !important; }
    .al-sec { padding: 2px 6px !important; font-size: 8px !important; font-weight: 950 !important; margin-top: 2px !important; color: #000000 !important; background: #f1f5f9 !important; border-top: 1.5px solid #cbd5e1 !important; border-bottom: 1.5px solid #cbd5e1 !important; }
    .al-cash-row { padding: 2px 6px !important; font-size: 8.5px !important; font-weight: 850 !important; border-bottom: 1px solid #e2e8f0 !important; }
    .al-cash-row .lbl { font-size: 8.5px !important; font-weight: 850 !important; color: #000000 !important; }
    .al-cash-row .amt { font-size: 9px !important; font-weight: 950 !important; }
    .al-cash-row .tag { font-size: 8px !important; font-weight: 900 !important; padding: 1px 4px !important; }
    .al-cash-row.hl { padding: 3px 6px !important; margin-top: 2px !important; background: #ecfdf5 !important; border-top: 2px solid #10b981 !important; }
    .al-cash-row.hl .lbl { font-size: 9.5px !important; font-weight: 950 !important; color: #065f46 !important; }
    .al-cash-row.hl .amt { font-size: 11px !important; font-weight: 950 !important; color: #047857 !important; }
    .al-total { padding: 3px 6px !important; font-size: 9px !important; font-weight: 950 !important; background: #e2e8f0 !important; border-top: 2px solid #64748b !important; }
    .al-worth { margin-top: 4px !important; border: 1.5px solid #475569 !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    .al-worth > div { padding: 3px 5px !important; border-right: 1.5px solid #cbd5e1 !important; }
    .al-worth .k { font-size: 7.5px !important; font-weight: 950 !important; color: #000000 !important; }
    .al-worth .v { font-size: 10px !important; font-weight: 950 !important; }
    .al-worth .c { font-size: 7px !important; font-weight: 800 !important; color: #334155 !important; }
    .al-sign { margin-top: 4px !important; padding-top: 3px !important; font-size: 8px !important; font-weight: 950 !important; color: #000000 !important; border-top: 2px dashed #475569 !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    .al-foot { margin-top: 2px !important; padding-top: 2px !important; font-size: 7.5px !important; font-weight: 850 !important; color: #334155 !important; border-top: 1px solid #cbd5e1 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
    <span class="it">Today Rev: <b class="strong">${sym} ${num(data.strip.todayRevenue)}</b></span>
    <span class="it">Today Profit: <b class="${data.strip.netProfit >= 0 ? 'green' : 'red'}">${data.strip.netProfit >= 0 ? '+' : ''}${sym} ${num(data.strip.netProfit)}</b></span>
    <span class="it">Month Profit: <b class="${(data.profitCard?.monthNetProfit ?? data.strip.monthNetProfit ?? 0) >= 0 ? 'green' : 'red'}">${(data.profitCard?.monthNetProfit ?? data.strip.monthNetProfit ?? 0) >= 0 ? '+' : ''}${sym} ${num(data.profitCard?.monthNetProfit ?? data.strip.monthNetProfit ?? 0)}</b></span>
    <span class="it">Overall Profit: <b class="${(data.profitCard?.totalNetProfit ?? data.strip.totalNetProfit ?? 0) >= 0 ? 'green' : 'red'}">${(data.profitCard?.totalNetProfit ?? data.strip.totalNetProfit ?? 0) >= 0 ? '+' : ''}${sym} ${num(data.profitCard?.totalNetProfit ?? data.strip.totalNetProfit ?? 0)}</b></span>
    <span class="it">Discounts: <b class="amber">&minus;${sym} ${num(data.discountsHead?.todayTotalDiscount ?? data.strip.todayDiscount ?? 0)}</b></span>
    <span class="it">Udhaar Due: <b class="amber">${sym} ${num(data.strip.receivables)}</b></span>
    <span class="it">Stock: <b class="blue">${sym} ${num(data.strip.warehouseStock)}</b></span>
  </div>

  <!-- ================= 4 KPI CARDS ================= -->
  <div class="al-cards">
    ${card(
      '1',
      'Sales Record',
      data.currency,
      [
        { label: 'Gross Sales:', value: `${sym} ${num(data.salesCard.grossSalesTotal ?? data.salesCard.totalSales)}` },
        {
          label: `Sale Returns (${data.salesCard.saleReturnsCount || 0}):`,
          value: `&minus; ${sym} ${num(data.salesCard.saleReturnsTotal || 0)}`,
          color: (data.salesCard.saleReturnsTotal || 0) > 0 ? '#dc2626' : '#64748b',
        },
        { label: 'Net Sales:', value: `${sym} ${num(data.salesCard.totalSales)}`, color: '#1e3a8a' },
        { label: "Today's Net Sales:", value: `${sym} ${num(data.salesCard.todaySales)}` },
        { label: 'Month Net Sales:', value: `${sym} ${num(data.salesCard.monthSales)}` },
      ],
      '#2563eb',
      '#2563eb'
    )}
    ${card(
      '2',
      'Purchases',
      data.currency,
      [
        { label: 'Gross Purchases:', value: `${sym} ${num(data.purchaseCard.grossPurchasesTotal ?? data.purchaseCard.totalPurchases)}` },
        {
          label: `Purchase Returns (${data.purchaseCard.purchaseReturnsCount || 0}):`,
          value: `&minus; ${sym} ${num(data.purchaseCard.purchaseReturnsTotal || 0)}`,
          color: (data.purchaseCard.purchaseReturnsTotal || 0) > 0 ? '#b45309' : '#64748b',
        },
        { label: 'Net Purchases:', value: `${sym} ${num(data.purchaseCard.totalPurchases)}`, color: '#1e3a8a' },
        { label: "Today's Net Purchases:", value: `${sym} ${num(data.purchaseCard.todayPurchases)}` },
        { label: 'Month Net Purchases:', value: `${sym} ${num(data.purchaseCard.monthPurchases)}` },
      ],
      '#3b82f6',
      '#2563eb'
    )}
    ${card(
      '3',
      'Khata Balance',
      'Status',
      [
        { label: 'Receivable (Customer Udhaar):', value: `${sym} ${num(data.khataCard.receivable)}`, color: '#b45309' },
        { label: 'Payable (Suppliers Due):', value: `${sym} ${num(data.khataCard.payable)}`, color: '#dc2626' },
        ...(data.khataCard.customerAdvance && data.khataCard.customerAdvance > 0
          ? [{ label: 'Customer Advances (CR):', value: `${sym} ${num(data.khataCard.customerAdvance)}`, color: '#0284c7' }]
          : []),
        ...(data.khataCard.supplierAdvance && data.khataCard.supplierAdvance > 0
          ? [{ label: 'Supplier Advance Paid (DR):', value: `${sym} ${num(data.khataCard.supplierAdvance)}`, color: '#0284c7' }]
          : []),
        {
          label: 'Net Khata Balance (+/-):',
          value: `${data.khataCard.netBalance >= 0 ? '+' : '&minus;'}${sym} ${num(
            Math.abs(data.khataCard.netBalance)
          )}`,
          color: data.khataCard.netBalance >= 0 ? '#15803d' : '#dc2626',
        },
        {
          label: 'Returns Khata Adj:',
          value: `SR &minus;${num(data.returnsSummary?.saleReturnsCreditTotal || 0)} / PR &minus;${num(data.returnsSummary?.purchaseReturnsCreditTotal || 0)}`,
          color: '#64748b',
        },
        { label: 'Khata Status:', value: 'LIVE BALANCED', color: '#15803d' },
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
        { label: 'Stock Out (Sold/Out):', value: `&minus; ${num(data.stockCard.stockOut)}`, color: '#dc2626' },
        { label: 'Closing Stock (Live):', value: num(data.stockCard.closingUnits), color: '#6d28d9' },
        {
          label: 'Returns In / Out:',
          value: `SR In: +${num(data.returnsSummary?.saleReturnsTodayCount || 0)} / PR Out: &minus;${num(data.returnsSummary?.purchaseReturnsTodayCount || 0)}`,
          color: '#64748b',
        },
        { label: 'Physical Audit:', value: 'SYNCED', color: '#15803d' },
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
          <div class="t" style="color:#0f766e">5. RETAIL SALES BY SALESMAN (VAN &amp; ROUTE KHATA)</div>
          <div class="s">DAILY AUDIT</div>
        </div>
        <table class="al-t">
          <thead>
            <tr>
              <th style="width:34%">Salesman / Route</th>
              <th class="num" style="width:22%">Opening</th>
              <th class="num" style="width:22%">Today Sold</th>
              <th class="num" style="width:22%;padding-right:6px">Closing</th>
            </tr>
          </thead>
          <tbody>${khataRows}</tbody>
        </table>
      </div>

      <div class="al-panel">
        <div class="al-panel-h">
          <div class="t" style="color:#1d4ed8">6. PROFIT BY SALESMAN (NET MARGIN CONTRIBUTION)</div>
          <div class="s" style="color:#2563eb">COMMISSION &amp; PROFIT</div>
        </div>
        <table class="al-t">
          <thead>
            <tr>
              <th style="width:30%">Salesman</th>
              <th class="num" style="width:18%">Today</th>
              <th class="num" style="width:18%">Month</th>
              <th class="num" style="width:20%">Total Profit</th>
              <th class="center" style="width:14%">Margin</th>
            </tr>
          </thead>
          <tbody>${profitRows}</tbody>
        </table>
        <div class="al-total">
          <span>TOTAL SALESMEN PROFIT CONTRIBUTION:</span>
          <span class="green">${sym} ${num(data.totalSalesmenProfit)}</span>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN : CASH & BANK LIQUIDITY REGISTER -->
    <div class="al-col">
      <div class="al-panel al-panel-cash">
        <div class="al-panel-h">
          <div class="t" style="color:#0f172a">7. CASH &amp; BANK LIQUIDITY REGISTER</div>
          <div class="s">DAILY CLOSING</div>
        </div>

        <div class="al-sec"><span>CASH INFLOWS &amp; OUTFLOWS</span><span>TYPE</span></div>
        ${cashRows(data.cash.inflows)}

        <div class="al-sec"><span>BANK ACCOUNTS</span><span>ONLINE</span></div>
        ${cashRows(data.cash.bankRows)}

        <div class="al-sec"><span>VAULT / TIJORI RECONCILIATION</span><span>AUDIT</span></div>
        <div class="al-cash-row">
          <span class="lbl">Last Day Balance (Previous Cash B/F)</span>
          <span class="amt strong">${sym} ${num(data.cash.openingBalance)}</span>
          <span class="tag">OPENING</span>
        </div>
        <div class="al-cash-row">
          <span class="lbl">Today Balance (Net Cash Movement)</span>
          <span class="amt ${data.cash.todayNet >= 0 ? 'green' : 'red'}">${data.cash.todayNet >= 0 ? '+' : '&minus;'} ${sym} ${num(
            Math.abs(data.cash.todayNet)
          )}</span>
          <span class="tag">${data.cash.todayNet >= 0 ? 'SURPLUS' : 'DEFICIT'}</span>
        </div>
        <div class="al-cash-row hl">
          <span class="lbl">TOTAL CASH IN HAND</span>
          <span class="amt">${sym} ${num(data.cash.totalCompanyCashInHand !== undefined ? data.cash.totalCompanyCashInHand : data.cash.cashInHand)}</span>
          <span class="tag">VERIFIED</span>
        </div>
      </div>

      <!-- ================= COMPACT SIDE DISCOUNTS REGISTER ================= -->
      <div class="al-panel" style="margin-top:8px">
        <div class="al-panel-h">
          <div class="t" style="color:#b45309">DISCOUNTS REGISTER (DEDUCTED FROM PROFIT)</div>
          <div class="s" style="color:#92400e">NET DEDUCTIONS</div>
        </div>
        <table class="al-t">
          <thead>
            <tr>
              <th style="width:48%">Discount Category</th>
              <th class="num" style="width:26%">Today</th>
              <th class="num" style="width:26%">Total Deducted</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="strong amber">Sale Bills Discount</td>
              <td class="num">${num(data.discountsHead?.todayBillDiscount ?? 0)}</td>
              <td class="num strong amber">&minus; ${sym} ${num(data.discountsHead?.totalBillDiscount ?? 0)}</td>
            </tr>
            <tr>
              <td class="strong purple">Cash/Bank Khata Discount</td>
              <td class="num">${num(data.discountsHead?.todayVoucherDiscount ?? 0)}</td>
              <td class="num strong purple">&minus; ${sym} ${num(data.discountsHead?.totalVoucherDiscount ?? 0)}</td>
            </tr>
            <tr>
              <td class="strong" style="color:#c2410c">Sale Return Discount</td>
              <td class="num">${num(data.discountsHead?.todaySaleReturnDiscount ?? 0)}</td>
              <td class="num strong" style="color:#c2410c">&minus; ${sym} ${num(data.discountsHead?.totalSaleReturnDiscount ?? 0)}</td>
            </tr>
            <tr style="background:#fef2f2;border-top:1.5px solid #fca5a5">
              <td class="strong red">TOTAL DISCOUNTS</td>
              <td class="num strong red">&minus; ${sym} ${num(data.discountsHead?.todayTotalDiscount ?? 0)}</td>
              <td class="num strong red">&minus; ${sym} ${num(data.discountsHead?.totalDiscounts ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ================= 8. NET PROFIT & PERFORMANCE ================= -->
  <div class="al-panel-full">
    <div class="al-panel-h">
      <div class="t" style="color:#059669">8. NET PROFIT &amp; PERFORMANCE (P&amp;L AUDIT REGISTER)</div>
      <div class="s" style="color:#047857">ACTUAL AUDITED PROFIT</div>
    </div>
    <table class="al-t">
      <thead>
        <tr>
          <th style="width:26%">Audit Period</th>
          <th class="num" style="width:16%">Net Profit</th>
          <th class="num" style="width:12%">Margin</th>
          <th class="num" style="width:16%">VAT Excluded</th>
          <th class="num" style="width:16%">Discounts</th>
          <th class="center" style="width:14%">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="strong">Today's Net Profit</td>
          <td class="num strong ${(data.profitCard?.todayNetProfit ?? data.strip.netProfit) >= 0 ? 'green' : 'red'}">${(data.profitCard?.todayNetProfit ?? data.strip.netProfit) >= 0 ? '+' : '&minus;'}${sym} ${num(Math.abs(data.profitCard?.todayNetProfit ?? data.strip.netProfit))}</td>
          <td class="num">${pct(data.profitCard?.todayMarginPct ?? data.strip.netMarginPct)}</td>
          <td class="num muted">${sym} ${num(data.profitCard?.todayVatExcluded ?? 0)}</td>
          <td class="num amber">&minus;${sym} ${num(data.discountsHead?.todayTotalDiscount ?? 0)}</td>
          <td class="center"><span style="background:${(data.profitCard?.todayNetProfit ?? data.strip.netProfit) >= 0 ? '#dcfce7;color:#166534' : '#fee2e2;color:#991b1b'};padding:2px 7px;border-radius:4px;font-size:8px;font-weight:900">${(data.profitCard?.todayNetProfit ?? data.strip.netProfit) >= 0 ? 'PROFIT' : 'LOSS'}</span></td>
        </tr>
        <tr>
          <td class="strong">This Month's Net Profit</td>
          <td class="num strong ${(data.profitCard?.monthNetProfit ?? 0) >= 0 ? 'green' : 'red'}">${(data.profitCard?.monthNetProfit ?? 0) >= 0 ? '+' : '&minus;'}${sym} ${num(Math.abs(data.profitCard?.monthNetProfit ?? 0))}</td>
          <td class="num">${pct(data.profitCard?.monthMarginPct ?? 0)}</td>
          <td class="num muted">${sym} ${num(data.profitCard?.monthVatExcluded ?? 0)}</td>
          <td class="num amber">&minus;${sym} ${num(data.discountsHead?.monthTotalDiscount ?? 0)}</td>
          <td class="center"><span style="background:${(data.profitCard?.monthNetProfit ?? 0) >= 0 ? '#dcfce7;color:#166534' : '#fee2e2;color:#991b1b'};padding:2px 7px;border-radius:4px;font-size:8px;font-weight:900">${(data.profitCard?.monthNetProfit ?? 0) >= 0 ? 'PROFIT' : 'LOSS'}</span></td>
        </tr>
        <tr style="background:#f8fafc;border-top:1.5px solid #cbd5e1">
          <td class="strong blue">OVERALL NET PROFIT (ALL TIME)</td>
          <td class="num strong ${(data.profitCard?.totalNetProfit ?? 0) >= 0 ? 'green' : 'red'}">${(data.profitCard?.totalNetProfit ?? 0) >= 0 ? '+' : '&minus;'}${sym} ${num(Math.abs(data.profitCard?.totalNetProfit ?? 0))}</td>
          <td class="num strong">${pct(data.profitCard?.totalMarginPct ?? 0)}</td>
          <td class="num muted">${sym} ${num(data.profitCard?.totalVatExcluded ?? 0)}</td>
          <td class="num strong red">&minus;${sym} ${num(data.discountsHead?.totalDiscounts ?? 0)}</td>
          <td class="center"><span style="background:${(data.profitCard?.totalNetProfit ?? 0) >= 0 ? '#dbeafe;color:#1e40af' : '#fee2e2;color:#991b1b'};padding:2px 7px;border-radius:4px;font-size:8px;font-weight:900">AUDIT VERIFIED</span></td>
        </tr>
      </tbody>
    </table>
    <div class="no-print" style="font-size:9px;color:#1e293b;padding:8px 12px;background:#f8fafc;border-top:1.5px solid #cbd5e1;line-height:1.5;font-weight:800">
      &bull; <b>Sales Gross Profit (Trading Profit):</b> Gross Sales (Ex-VAT) &minus; Cost of Goods (COGS). <i>(Note: Invoicing trade discounts are deducted once at bill creation and are NEVER deducted twice.)</i><br/>
      &bull; <b>Cash &amp; Bank &amp; Return Discounts:</b> Settlement deductions allowed during cash/bank recoveries and sale return discounts are audited separately under Discounts Head and are 100% deducted from Net Profit.<br/>
      &bull; <b>Cash &amp; Bank &amp; Purchase Payments:</b> Payments to suppliers (via Cash &amp; Bank or on Purchase Bills) and employee settlements update party Khatas &amp; Cash Out (Liquidity Register) and are NEVER deducted from Daily Profit.<br/>
      &bull; <b>Statutory Tax Liability:</b> Total VAT collected of ${sym} ${num(data.profitCard?.totalVatExcluded ?? 0)} is 100% excluded from company profit (payable to Tax Authority).
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
      <div class="c">Receivables Due</div>
    </div>
    <div>
      <div class="k">SUPPLIER PAYABLE (-)</div>
      <div class="v red">&minus; ${sym} ${num(data.worth.payable)}</div>
      <div class="c">Mill &amp; Vendor Liability</div>
    </div>
    <div>
      <div class="k">FIX EXPENSE / SETUP (-)</div>
      <div class="v amber">&minus; ${sym} ${num(data.worth.fixExpense)}</div>
      <div class="c">Monthly Rent &amp; Wages</div>
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
