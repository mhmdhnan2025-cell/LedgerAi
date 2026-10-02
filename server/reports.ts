import { currencySymbol } from './currency';
import { db } from './db.js';

/**
 * Generates an ultra-clean, beautifully formatted Microsoft Word (.doc) document
 * for a specific Restaurant's Account Ledger, Orders, Payments, and Profit/Loss Diagnosis.
 * 
 * Uses standard Microsoft Office Word XML + HTML envelope (MHTML compatible)
 * with strict table layouts (tables with border-collapse and fixed widths)
 * so that Microsoft Word, LibreOffice, and Google Docs open it in Print Layout
 * with 100% crystal-clear alignment, high readability, and no distorted styles.
 */
export function generateRestaurantReportDoc(restaurantIdOrName: string): {
  success: boolean;
  error?: string;
  restaurant?: any;
  summary?: any;
  fileName: string;
  docContent: string;
} {
  const restaurant = db.getRestaurantById(restaurantIdOrName) || db.findRestaurantByName(restaurantIdOrName);
  if (!restaurant) {
    return {
      success: false,
      error: `Restaurant "${restaurantIdOrName}" not found in database.`,
      fileName: 'statement.doc',
      docContent: '',
    };
  }

  const orders = db.getOrders().filter((o) => o.restaurantId === restaurant.id && o.status !== 'Cancelled');
  const payments = db.getPayments().filter((p) => p.restaurantId === restaurant.id);
  const expenses = db.getExpenses().filter((e) => {
    if (e.targetRestaurantId === restaurant.id) return true;
    if (e.allocations && e.allocations.some((a) => a.restaurantId === restaurant.id)) return true;
    return false;
  });

  const totalBilled = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, it) => s + (it.totalCost || 0), 0), 0);
  const grossProfit = totalBilled - totalCost;
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  let directExpenses = 0;
  expenses.forEach((e) => {
    if (e.targetRestaurantId === restaurant.id) {
      directExpenses += e.amount || 0;
    } else if (e.allocations) {
      const alloc = e.allocations.find((a) => a.restaurantId === restaurant.id);
      if (alloc) directExpenses += alloc.amount || 0;
    }
  });

  const netProfit = grossProfit - directExpenses;
  const isProfit = netProfit >= 0;
  const netMargin = totalBilled > 0 ? ((netProfit / totalBilled) * 100).toFixed(1) : '0.0';

  const dateGenerated = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const company = db.getCompanyProfile();
  const companyName = company?.name || 'AI MUNSHI WHOLESALE SUPPLIES';
  const companyTagline = company?.tagline || 'Commercial Food, Grains & Kitchen Supplies Wholesale ERP';
  const companyOwner = company?.ownerName ? `Proprietor: ${company.ownerName}` : '';
  const companyPhone = company?.phone ? `Phone / WhatsApp: ${company.phone}` : '';
  const companyAddress = company?.address ? `${company.address}, ${company.city}` : (company?.city || '');

  const cleanName = restaurant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Statement_${cleanName}_${todayStr}.doc`;

  // Construct standard Microsoft Word HTML Envelope
  const docContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Statement of Account - ${restaurant.name}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 0.8in 0.8in 0.8in 0.8in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      background-color: #ffffff;
    }
    h1 {
      font-size: 20pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
      padding: 0;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 2pt solid #0284c7;
      padding-bottom: 3pt;
      text-transform: uppercase;
    }
    h3 {
      font-size: 11pt;
      font-weight: bold;
      color: #334155;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    p {
      margin-top: 3pt;
      margin-bottom: 6pt;
      font-size: 10.5pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      margin-top: 6pt;
      margin-bottom: 14pt;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: bold;
      font-size: 10pt;
      padding: 7pt 9pt;
      border: 1pt solid #0f172a;
      text-align: left;
    }
    td {
      padding: 6pt 9pt;
      border: 1pt solid #cbd5e1;
      font-size: 10pt;
      vertical-align: top;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-row td {
      background-color: #f1f5f9;
      font-weight: bold;
      border-top: 2pt solid #0f172a;
      color: #0f172a;
    }
    .kpi-table {
      margin-top: 12pt;
      margin-bottom: 16pt;
    }
    .kpi-table td {
      background-color: #f8fafc;
      border: 1.5pt solid #cbd5e1;
      padding: 10pt 8pt;
      text-align: center;
      width: 25%;
    }
    .kpi-num {
      font-size: 15pt;
      font-weight: bold;
      margin-top: 4pt;
    }
    .kpi-label {
      font-size: 9pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: bold;
    }
    .highlight-box {
      background-color: #f8fafc;
      border: 1.5pt dashed #0284c7;
      padding: 12pt;
      margin-top: 14pt;
      margin-bottom: 14pt;
    }
    .badge-paid {
      color: #15803d;
      font-weight: bold;
    }
    .badge-due {
      color: #b45309;
      font-weight: bold;
    }
    .badge-loss {
      color: #b91c1c;
      font-weight: bold;
    }
    .footer-note {
      font-size: 9pt;
      color: #64748b;
      border-top: 1pt solid #cbd5e1;
      padding-top: 10pt;
      margin-top: 25pt;
    }
  </style>
</head>
<body>
<div class="Section1">

  <!-- Main Header Table -->
  <table style="border: none; margin-bottom: 10pt;">
    <tr>
      <td style="border: none; padding: 0; vertical-align: top; width: 60%;">
        <h1>${companyName.toUpperCase()}</h1>
        <p style="font-size: 11pt; color: #475569; margin: 2pt 0;">
          <strong>${companyTagline}</strong>
        </p>
        <p style="font-size: 10pt; color: #64748b; margin: 0;">
          Official Customer Khata Statement & Profit/Loss Audit (حساب بل و منافع رپورٹ)
        </p>
        ${companyOwner || companyPhone ? `
        <p style="font-size: 9.5pt; color: #334155; margin: 2pt 0;">
          <strong>${[companyOwner, companyPhone].filter(Boolean).join(' &bull; ')}</strong>
        </p>` : ''}
        ${companyAddress ? `
        <p style="font-size: 9pt; color: #64748b; margin: 1pt 0;">
          ${companyAddress} ${company?.ntn ? `&bull; NTN: ${company.ntn}` : ''}
        </p>` : ''}
      </td>
      <td style="border: none; padding: 0; text-align: right; vertical-align: top; width: 40%;">
        <p style="font-size: 10pt; color: #64748b; margin: 0;"><strong>Date:</strong> ${dateGenerated}</p>
        <p style="font-size: 10pt; color: #64748b; margin: 2pt 0;"><strong>Document:</strong> Word Statement (.doc)</p>
        <div style="display: inline-block; background-color: ${balanceDue > 0 ? '#fef3c7' : '#dcfce7'}; border: 1pt solid ${balanceDue > 0 ? '#f59e0b' : '#22c55e'}; padding: 4pt 10pt; margin-top: 4pt; font-weight: bold; font-size: 10pt; color: ${balanceDue > 0 ? '#92400e' : '#166534'};">
          ${balanceDue > 0 ? `BAAQI UDHAAR PAYABLE: ${currencySymbol()} ${balanceDue.toLocaleString()}` : 'HISAB CLEAR (All Paid)'}
        </div>
      </td>
    </tr>
  </table>

  <!-- Restaurant Account Details Table -->
  <table style="margin-bottom: 12pt; background-color: #f8fafc;">
    <tr>
      <td style="width: 50%; border: 1pt solid #cbd5e1;">
        <p style="margin: 0; font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: bold;">Account Name / Restaurant</p>
        <p style="margin: 2pt 0 0 0; font-size: 13pt; font-weight: bold; color: #0f172a;">${restaurant.name}</p>
        <p style="margin: 3pt 0 0 0; font-size: 10pt; color: #334155;"><strong>Contact Person:</strong> ${restaurant.contactPerson}</p>
      </td>
      <td style="width: 50%; border: 1pt solid #cbd5e1;">
        <p style="margin: 0; font-size: 10pt; color: #334155;"><strong>Phone:</strong> ${restaurant.phone}</p>
        <p style="margin: 2pt 0 0 0; font-size: 10pt; color: #334155;"><strong>Delivery Address:</strong> ${restaurant.address || 'Commercial Market, City'}</p>
        <p style="margin: 2pt 0 0 0; font-size: 10pt; color: #334155;"><strong>Approved Credit Limit:</strong> ${currencySymbol()} ${(restaurant.creditLimit || 0).toLocaleString()}</p>
      </td>
    </tr>
  </table>

  <!-- 4-Column KPI Executive Summary Table -->
  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Total Billed Sales (کل بل)</div>
        <div class="kpi-num" style="color: #0f172a;">${currencySymbol()} ${totalBilled.toLocaleString()}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 2pt;">${orders.length} Completed Orders</div>
      </td>
      <td>
        <div class="kpi-label">Cash Received (وصول شدہ)</div>
        <div class="kpi-num" style="color: #15803d;">${currencySymbol()} ${totalPaid.toLocaleString()}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 2pt;">${payments.length} Payments Logged</div>
      </td>
      <td style="background-color: ${balanceDue > 0 ? '#fffbeb' : '#f0fdf4'}; border-color: ${balanceDue > 0 ? '#f59e0b' : '#86efac'};">
        <div class="kpi-label" style="color: ${balanceDue > 0 ? '#b45309' : '#15803d'};">Baaqi Udhaar (باقی ادھار)</div>
        <div class="kpi-num" style="color: ${balanceDue > 0 ? '#b45309' : '#15803d'};">${currencySymbol()} ${balanceDue.toLocaleString()}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 2pt;">Receivable Balance</div>
      </td>
      <td style="background-color: ${isProfit ? '#f0fdf4' : '#fef2f2'}; border-color: ${isProfit ? '#86efac' : '#fca5a5'};">
        <div class="kpi-label" style="color: ${isProfit ? '#15803d' : '#b91c1c'};">Net Profit (خالص منافع)</div>
        <div class="kpi-num" style="color: ${isProfit ? '#15803d' : '#b91c1c'};">${isProfit ? '+' : ''}${currencySymbol()} ${netProfit.toLocaleString()}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 2pt;">${netMargin}% Net Margin</div>
      </td>
    </tr>
  </table>

  <!-- Section 1: Order Delivery & Invoicing History -->
  <h2>1. Wholesale Supply Orders Record (آرڈر اور سپلائی ریکارڈ)</h2>
  ${orders.length === 0 ? '<p style="color: #64748b; font-style: italic;">No orders recorded for this restaurant account.</p>' : `
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Order #</th>
        <th style="width: 14%;">Date</th>
        <th style="width: 36%;">Items & Description</th>
        <th class="text-right" style="width: 18%;">Order Amount</th>
        <th class="text-right" style="width: 18%;">Balance Due</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o) => `
        <tr>
          <td><strong>${o.orderNumber}</strong></td>
          <td>${o.orderDate}</td>
          <td>
            ${(o.items || []).map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join('; ')}
            ${o.deliveryFee > 0 ? `<br><span style="font-size: 8.5pt; color: #64748b;">+ Delivery Fee: ${currencySymbol()} ${o.deliveryFee.toLocaleString()}</span>` : ''}
          </td>
          <td class="text-right"><strong>${currencySymbol()} ${(o.totalAmount || 0).toLocaleString()}</strong></td>
          <td class="text-right" style="color: ${(o.balanceDue || 0) > 0 ? '#b45309' : '#15803d'}; font-weight: bold;">
            ${currencySymbol()} ${(o.balanceDue || 0).toLocaleString()}
          </td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3"><strong>Total Billed Orders (${orders.length} orders)</strong></td>
        <td class="text-right"><strong>${currencySymbol()} ${totalBilled.toLocaleString()}</strong></td>
        <td class="text-right" style="color: #b45309;"><strong>${currencySymbol()} ${balanceDue.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>
  `}

  <!-- Section 2: Payments & Recoveries Ledger -->
  <h2>2. Payments & Recovery Receipts (وصولی کی تفصیل)</h2>
  ${payments.length === 0 ? '<p style="color: #64748b; font-style: italic;">No payment receipts logged yet. Outstanding balance equals total billed amount.</p>' : `
  <table>
    <thead>
      <tr>
        <th style="width: 16%;">Receipt #</th>
        <th style="width: 16%;">Payment Date</th>
        <th style="width: 18%;">Method</th>
        <th style="width: 32%;">Reference / Notes</th>
        <th class="text-right" style="width: 18%;">Amount Received</th>
      </tr>
    </thead>
    <tbody>
      ${payments.map((p) => `
        <tr>
          <td><strong>${p.paymentNumber}</strong></td>
          <td>${p.paymentDate}</td>
          <td><span style="background: #f1f5f9; padding: 2pt 6pt; font-weight: bold; font-size: 9pt;">${p.paymentMethod}</span></td>
          <td>${p.notes || 'Payment against account ledger'}</td>
          <td class="text-right" style="color: #15803d; font-weight: bold;">${currencySymbol()} ${(p.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>Total Payments Received (${payments.length} receipts)</strong></td>
        <td class="text-right" style="color: #15803d;"><strong>${currencySymbol()} ${totalPaid.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>
  `}

  <!-- Section 3: Direct Allocated Operational Expenses -->
  <h2>3. Direct Allocated Delivery & Fuel Expenses (ڈلیوری اور پٹرول خرچہ)</h2>
  ${expenses.length === 0 ? '<p style="color: #64748b; font-style: italic;">No direct petrol, delivery, or operational expenses allocated to this account.</p>' : `
  <table>
    <thead>
      <tr>
        <th style="width: 16%;">Expense #</th>
        <th style="width: 16%;">Date</th>
        <th style="width: 18%;">Category</th>
        <th style="width: 32%;">Description / Purpose</th>
        <th class="text-right" style="width: 18%;">Allocated Amount</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.map((e) => {
        let amt = e.amount || 0;
        if (e.allocations) {
          const al = e.allocations.find((a) => a.restaurantId === restaurant.id);
          if (al) amt = al.amount || 0;
        }
        return `
          <tr>
            <td><strong>${e.expenseNumber}</strong></td>
            <td>${e.date}</td>
            <td>${e.category}</td>
            <td>${e.title}</td>
            <td class="text-right" style="color: #b91c1c; font-weight: bold;">${currencySymbol()} ${amt.toLocaleString()}</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>Total Direct Allocated Expenses</strong></td>
        <td class="text-right" style="color: #b91c1c;"><strong>${currencySymbol()} ${directExpenses.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>
  `}

  <!-- Section 4: Deterministic Profit & Loss Calculation Box -->
  <h2>4. Final Profit & Loss Audit Statement (حتمی منافع و نقصان گوشوارہ)</h2>
  <div class="highlight-box">
    <table style="border: none; margin: 0;">
      <tr>
        <td style="border: none; padding: 4pt 0; font-size: 10.5pt; width: 65%;">
          <strong>1. Gross Billed Turnover (کل بلنگ سیلز):</strong>
        </td>
        <td style="border: none; padding: 4pt 0; text-align: right; font-size: 10.5pt; font-weight: bold; width: 35%;">
          ${currencySymbol()} ${totalBilled.toLocaleString()}
        </td>
      </tr>
      <tr>
        <td style="border: none; padding: 4pt 0; font-size: 10.5pt; color: #475569;">
          <em>Less: Wholesale Purchase Cost of Items Sold (سامان کی اصل خرید قیمت):</em>
        </td>
        <td style="border: none; padding: 4pt 0; text-align: right; font-size: 10.5pt; color: #475569;">
          - ${currencySymbol()} ${totalCost.toLocaleString()}
        </td>
      </tr>
      <tr>
        <td style="border-top: 1pt solid #cbd5e1; border-bottom: 1pt solid #cbd5e1; padding: 5pt 0; font-size: 11pt; font-weight: bold; color: #0f172a;">
          Gross Wholesale Margin (خام منافع):
        </td>
        <td style="border-top: 1pt solid #cbd5e1; border-bottom: 1pt solid #cbd5e1; padding: 5pt 0; text-align: right; font-size: 11pt; font-weight: bold; color: #15803d;">
          ${currencySymbol()} ${grossProfit.toLocaleString()}
        </td>
      </tr>
      <tr>
        <td style="border: none; padding: 4pt 0; font-size: 10.5pt; color: #b91c1c;">
          <em>Less: Direct Allocated Fuel, Calling & Delivery Costs (پٹرول اور ڈلیوری اخراجات):</em>
        </td>
        <td style="border: none; padding: 4pt 0; text-align: right; font-size: 10.5pt; color: #b91c1c; font-weight: bold;">
          - ${currencySymbol()} ${directExpenses.toLocaleString()}
        </td>
      </tr>
      <tr>
        <td style="border-top: 2pt solid #0f172a; padding: 8pt 0; font-size: 13pt; font-weight: bold; color: ${isProfit ? '#15803d' : '#b91c1c'};">
          NET OPERATING OUTCOME (${isProfit ? 'خالص منافع - PROFIT' : 'خالص نقصان - LOSS'}):
        </td>
        <td style="border-top: 2pt solid #0f172a; padding: 8pt 0; text-align: right; font-size: 14pt; font-weight: bold; color: ${isProfit ? '#15803d' : '#b91c1c'};">
          ${isProfit ? '+' : ''}${currencySymbol()} ${netProfit.toLocaleString()} (${netMargin}%)
        </td>
      </tr>
      <tr>
        <td style="border-top: 1pt dashed #cbd5e1; padding: 6pt 0; font-size: 11pt; font-weight: bold; color: #b45309;">
          Remaining Market Udhaar to be Collected (بقایا ادھار وصولی):
        </td>
        <td style="border-top: 1pt dashed #cbd5e1; padding: 6pt 0; text-align: right; font-size: 12pt; font-weight: bold; color: #b45309;">
          ${currencySymbol()} ${balanceDue.toLocaleString()}
        </td>
      </tr>
    </table>
  </div>

  <!-- Signatures & Verification Block -->
  <table style="border: none; margin-top: 35pt;">
    <tr>
      <td style="border: none; width: 45%; text-align: center; vertical-align: bottom;">
        <div style="border-bottom: 1.5pt solid #0f172a; margin-bottom: 4pt; height: 35pt;"></div>
        <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #0f172a;">Authorized Distributor Signature</p>
        <p style="margin: 0; font-size: 8.5pt; color: #64748b;">AI Munshi Wholesale Supply ERP</p>
      </td>
      <td style="border: none; width: 10%;"></td>
      <td style="border: none; width: 45%; text-align: center; vertical-align: bottom;">
        <div style="border-bottom: 1.5pt solid #0f172a; margin-bottom: 4pt; height: 35pt;"></div>
        <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #0f172a;">Customer Stamp & Receiver Signature</p>
        <p style="margin: 0; font-size: 8.5pt; color: #64748b;">${restaurant.name}</p>
      </td>
    </tr>
  </table>

  <div class="footer-note">
    <p style="margin: 0; text-align: center;">
      This statement is generated automatically by AI Munshi wholesale supply intelligence software. All figures are verified against actual order receipts and inventory intake ledgers.
    </p>
  </div>

</div>
</body>
</html>`;

  return {
    success: true,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone,
      contactPerson: restaurant.contactPerson,
      address: restaurant.address,
    },
    summary: {
      totalBilled,
      totalPaid,
      balanceDue,
      grossProfit,
      directExpenses,
      netProfit,
      isProfit,
      netMargin,
      ordersCount: orders.length,
      paymentsCount: payments.length,
    },
    fileName,
    docContent,
  };
}

/**
 * Generates an ultra-clean, beautifully formatted Microsoft Word (.doc) document
 * for the Entire Business (Master Audit: All Restaurants, Stock Inventory, Expenses, Net Profit/Loss).
 */
export function generateBusinessMasterReportDoc(): {
  success: boolean;
  summary?: any;
  fileName: string;
  docContent: string;
} {
  const diagnosis = db.getProfitDiagnosis();
  const summary = db.getBusinessSummary();
  const products = db.getProducts();
  const expenses = db.getExpenses();

  const dateGenerated = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const company = db.getCompanyProfile();
  const companyName = company?.name || 'AI MUNSHI &bull; MASTER AUDIT';
  const companyTagline = company?.tagline || 'Wholesale Food & Commercial Kitchen Supply Distribution';
  const companyOwner = company?.ownerName ? `Proprietor: ${company.ownerName}` : '';
  const companyPhone = company?.phone ? `Phone / WhatsApp: ${company.phone}` : '';
  const companyAddress = company?.address ? `${company.address}, ${company.city}` : (company?.city || '');

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Master_Business_Profit_Audit_${todayStr}.doc`;

  const totalTurnover = diagnosis.totalRevenue || 0;
  const totalCost = diagnosis.totalCostOfGoods || 0;
  const grossProfit = diagnosis.grossProfit || 0;
  const totalExpenses = diagnosis.totalExpenses || 0;
  const netProfit = diagnosis.netProfitOrLoss || 0;
  const isProfit = diagnosis.isProfit;
  const marketUdhaar = diagnosis.totalOutstandingReceivables || 0;
  const inventoryVal = summary.inventoryTotalValue || 0;

  const docContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Master Business Profit & Loss Audit Report</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 0.8in 0.8in 0.8in 0.8in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      background-color: #ffffff;
    }
    h1 {
      font-size: 20pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
      padding: 0;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 2pt solid #0284c7;
      padding-bottom: 3pt;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      margin-top: 6pt;
      margin-bottom: 14pt;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: bold;
      font-size: 9.5pt;
      padding: 6pt 8pt;
      border: 1pt solid #0f172a;
      text-align: left;
    }
    td {
      padding: 5pt 8pt;
      border: 1pt solid #cbd5e1;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-row td {
      background-color: #f1f5f9;
      font-weight: bold;
      border-top: 2pt solid #0f172a;
      color: #0f172a;
    }
    .kpi-table {
      margin-top: 12pt;
      margin-bottom: 16pt;
    }
    .kpi-table td {
      background-color: #f8fafc;
      border: 1.5pt solid #cbd5e1;
      padding: 8pt 6pt;
      text-align: center;
    }
    .kpi-num {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 3pt;
    }
    .kpi-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: bold;
    }
    .highlight-box {
      background-color: #f8fafc;
      border: 1.5pt dashed #0284c7;
      padding: 12pt;
      margin-top: 14pt;
      margin-bottom: 14pt;
    }
    .footer-note {
      font-size: 9pt;
      color: #64748b;
      border-top: 1pt solid #cbd5e1;
      padding-top: 10pt;
      margin-top: 25pt;
    }
  </style>
</head>
<body>
<div class="Section1">

  <!-- Main Header Table -->
  <table style="border: none; margin-bottom: 10pt;">
    <tr>
      <td style="border: none; padding: 0; vertical-align: top; width: 65%;">
        <h1>${companyName.toUpperCase()}</h1>
        <p style="font-size: 11pt; color: #475569; margin: 2pt 0;">
          <strong>${companyTagline}</strong>
        </p>
        <p style="font-size: 10pt; color: #64748b; margin: 0;">
          Overall Business Profit & Loss, Inventory Asset & Market Udhaar Audit Report
        </p>
        ${companyOwner || companyPhone ? `
        <p style="font-size: 9.5pt; color: #334155; margin: 2pt 0;">
          <strong>${[companyOwner, companyPhone].filter(Boolean).join(' &bull; ')}</strong>
        </p>` : ''}
        ${companyAddress ? `
        <p style="font-size: 9pt; color: #64748b; margin: 1pt 0;">
          ${companyAddress} ${company?.ntn ? `&bull; NTN: ${company.ntn}` : ''}
        </p>` : ''}
      </td>
      <td style="border: none; padding: 0; text-align: right; vertical-align: top; width: 35%;">
        <p style="font-size: 10pt; color: #64748b; margin: 0;"><strong>Audit Date:</strong> ${dateGenerated}</p>
        <p style="font-size: 10pt; color: #64748b; margin: 2pt 0;"><strong>Report Type:</strong> Official Word Document (.doc)</p>
        <div style="display: inline-block; background-color: ${isProfit ? '#dcfce7' : '#fee2e2'}; border: 1pt solid ${isProfit ? '#22c55e' : '#ef4444'}; padding: 4pt 10pt; margin-top: 4pt; font-weight: bold; font-size: 10pt; color: ${isProfit ? '#166534' : '#991b1b'};">
          ${isProfit ? 'OVERALL PROFITABLE BUSINESS' : 'CURRENTLY IN OPERATING LOSS'}
        </div>
      </td>
    </tr>
  </table>

  <!-- 5-Column Executive KPIs Table -->
  <table class="kpi-table">
    <tr>
      <td style="width: 20%;">
        <div class="kpi-label">Total Turnover (سیلز)</div>
        <div class="kpi-num" style="color: #0f172a;">${currencySymbol()} ${totalTurnover.toLocaleString()}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2pt;">Wholesale Billed Sales</div>
      </td>
      <td style="width: 20%;">
        <div class="kpi-label">Goods Cost (COGS)</div>
        <div class="kpi-num" style="color: #475569;">${currencySymbol()} ${totalCost.toLocaleString()}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2pt;">Item Purchase Price</div>
      </td>
      <td style="width: 20%;">
        <div class="kpi-label">Operating Expenses</div>
        <div class="kpi-num" style="color: #b91c1c;">${currencySymbol()} ${totalExpenses.toLocaleString()}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2pt;">Petrol, Wages & Logistics</div>
      </td>
      <td style="width: 20%; background-color: ${isProfit ? '#f0fdf4' : '#fef2f2'}; border-color: ${isProfit ? '#86efac' : '#fca5a5'};">
        <div class="kpi-label" style="color: ${isProfit ? '#15803d' : '#b91c1c'};">Net Profit (خالص منافع)</div>
        <div class="kpi-num" style="color: ${isProfit ? '#15803d' : '#b91c1c'};">${isProfit ? '+' : ''}${currencySymbol()} ${netProfit.toLocaleString()}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2pt;">${diagnosis.netMarginPct}% Net Margin</div>
      </td>
      <td style="width: 20%; background-color: #fffbeb; border-color: #f59e0b;">
        <div class="kpi-label" style="color: #b45309;">Market Udhaar (ادھار)</div>
        <div class="kpi-num" style="color: #b45309;">${currencySymbol()} ${marketUdhaar.toLocaleString()}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2pt;">Pending Receivables</div>
      </td>
    </tr>
  </table>

  <!-- Section 1: Restaurant-by-Restaurant Ledger & Profit Breakdown -->
  <h2>1. Restaurant Accounts Ledger & Profit Breakdown (تمام ہوٹلوں کا حساب و منافع)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Restaurant Account</th>
        <th class="text-right" style="width: 8%;">Orders</th>
        <th class="text-right" style="width: 14%;">Total Billed</th>
        <th class="text-right" style="width: 13%;">Total Paid</th>
        <th class="text-right" style="width: 13%;">Baaqi Udhaar</th>
        <th class="text-right" style="width: 13%;">Direct Exp</th>
        <th class="text-right" style="width: 15%;">Net Profit / Loss</th>
      </tr>
    </thead>
    <tbody>
      ${diagnosis.restaurantReports.map((r) => `
        <tr>
          <td>
            <strong>${r.restaurantName}</strong>
            <br><span style="font-size: 8pt; color: #64748b;">${r.actionRecommendation}</span>
          </td>
          <td class="text-right">${r.totalOrders}</td>
          <td class="text-right font-bold">${currencySymbol()} ${(r.totalRevenue || 0).toLocaleString()}</td>
          <td class="text-right" style="color: #15803d;">${currencySymbol()} ${(r.totalPaid || 0).toLocaleString()}</td>
          <td class="text-right" style="color: ${(r.balanceDue || 0) > 0 ? '#b45309' : '#15803d'}; font-weight: bold;">
            ${currencySymbol()} ${(r.balanceDue || 0).toLocaleString()}
          </td>
          <td class="text-right" style="color: #b91c1c;">${currencySymbol()} ${(r.directExpenses || 0).toLocaleString()}</td>
          <td class="text-right" style="color: ${r.isProfit ? '#15803d' : '#b91c1c'}; font-weight: bold;">
            ${r.isProfit ? '+' : ''}${currencySymbol()} ${(r.netProfit || 0).toLocaleString()}
            <br><span style="font-size: 8pt; color: #64748b;">(${r.grossMarginPct}% Margin)</span>
          </td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>Overall Business Totals</td>
        <td class="text-right">${diagnosis.restaurantReports.reduce((s, r) => s + (r.totalOrders || 0), 0)}</td>
        <td class="text-right">${currencySymbol()} ${totalTurnover.toLocaleString()}</td>
        <td class="text-right" style="color: #15803d;">${currencySymbol()} ${diagnosis.restaurantReports.reduce((s, r) => s + (r.totalPaid || 0), 0).toLocaleString()}</td>
        <td class="text-right" style="color: #b45309;">${currencySymbol()} ${marketUdhaar.toLocaleString()}</td>
        <td class="text-right" style="color: #b91c1c;">${currencySymbol()} ${totalExpenses.toLocaleString()}</td>
        <td class="text-right" style="color: ${isProfit ? '#15803d' : '#b91c1c'}; font-size: 10.5pt;">
          <strong>${isProfit ? '+' : ''}${currencySymbol()} ${netProfit.toLocaleString()}</strong>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Section 2: Warehouse Stock & Inventory Valuation -->
  <h2>2. Warehouse Inventory & Stock Asset Valuation (گودام کا مال اور انوینٹری اثاثہ)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Product Name</th>
        <th style="width: 18%;">Category</th>
        <th style="width: 15%;">In-Stock Qty</th>
        <th class="text-right" style="width: 14%;">Purchase Rate</th>
        <th class="text-right" style="width: 14%;">Selling Rate</th>
        <th class="text-right" style="width: 14%;">Stock Value</th>
      </tr>
    </thead>
    <tbody>
      ${products.map((p) => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td>
            <strong>${p.currentQuantity} ${p.unit}</strong>
            ${p.currentQuantity <= p.minStockLevel ? '<br><span style="color: #b91c1c; font-size: 8pt; font-weight: bold;">[LOW STOCK ALERT]</span>' : ''}
          </td>
          <td class="text-right">${currencySymbol()} ${(p.purchasePrice || 0).toLocaleString()} / ${p.unit}</td>
          <td class="text-right">${currencySymbol()} ${(p.sellingPrice || 0).toLocaleString()} / ${p.unit}</td>
          <td class="text-right" style="font-weight: bold;">${currencySymbol()} ${(p.stockValue || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="5"><strong>Total Warehouse Inventory Valuation Asset</strong></td>
        <td class="text-right" style="color: #0284c7;"><strong>${currencySymbol()} ${inventoryVal.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- Section 3: Operational Expenses Breakdown -->
  <h2>3. Operational & Logistics Expenses Ledger (پٹرول اور کاروباری اخراجات)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Expense #</th>
        <th style="width: 15%;">Date</th>
        <th style="width: 20%;">Category</th>
        <th style="width: 34%;">Description & Purpose</th>
        <th class="text-right" style="width: 16%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.map((e) => `
        <tr>
          <td><strong>${e.expenseNumber}</strong></td>
          <td>${e.date}</td>
          <td>${e.category}</td>
          <td>${e.title}${e.targetRestaurantName ? ` <span style="color: #64748b;">(Tagged to ${e.targetRestaurantName})</span>` : ''}</td>
          <td class="text-right" style="color: #b91c1c; font-weight: bold;">${currencySymbol()} ${(e.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>Total Operational Expenses Deducted</strong></td>
        <td class="text-right" style="color: #b91c1c;"><strong>${currencySymbol()} ${totalExpenses.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- Section 4: Strategic Recommendations & Summary -->
  <h2>4. Munshi Strategic Assessment & Recovery Plan (کاروباری ہدایات)</h2>
  <div class="highlight-box">
    <p style="margin: 0 0 6pt 0; font-size: 11pt; font-weight: bold; color: #0f172a;">Key Audit Findings & Actions:</p>
    <ul style="margin: 0; padding-left: 18pt; font-size: 10pt; line-height: 1.6; color: #334155;">
      <li><strong>Total Receivables (Pending Market Udhaar):</strong> ${currencySymbol()} ${marketUdhaar.toLocaleString()} is currently locked in restaurant credit accounts. Immediate payment recovery follow-up recommended for overdue accounts.</li>
      <li><strong>Net Operational Margins:</strong> The wholesale business is operating at a <strong>${diagnosis.netMarginPct}% net profit margin</strong> after deducting all direct petrol and vehicle delivery costs.</li>
      <li><strong>Warehouse Inventory Security:</strong> Total active warehouse asset valuation stands at <strong>${currencySymbol()} ${inventoryVal.toLocaleString()}</strong>.</li>
    </ul>
  </div>

  <!-- Signatures Block -->
  <table style="border: none; margin-top: 30pt;">
    <tr>
      <td style="border: none; width: 45%; text-align: center; vertical-align: bottom;">
        <div style="border-bottom: 1.5pt solid #0f172a; margin-bottom: 4pt; height: 35pt;"></div>
        <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #0f172a;">Managing Director / Partner Signature</p>
        <p style="margin: 0; font-size: 8.5pt; color: #64748b;">AI Munshi Wholesale ERP Certified</p>
      </td>
      <td style="border: none; width: 10%;"></td>
      <td style="border: none; width: 45%; text-align: center; vertical-align: bottom;">
        <div style="border-bottom: 1.5pt solid #0f172a; margin-bottom: 4pt; height: 35pt;"></div>
        <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #0f172a;">Chief Financial Officer / Head Munshi</p>
        <p style="margin: 0; font-size: 8.5pt; color: #64748b;">Internal Audit & Khata Verification</p>
      </td>
    </tr>
  </table>

  <div class="footer-note">
    <p style="margin: 0; text-align: center;">
      Deterministic Audit Report generated by AI Munshi Wholesale ERP on ${dateGenerated}.
    </p>
  </div>

</div>
</body>
</html>`;

  return {
    success: true,
    summary: {
      totalRevenue: totalTurnover,
      totalCostOfGoods: totalCost,
      grossProfit,
      totalExpenses,
      netProfitOrLoss: netProfit,
      isProfit,
      totalOutstandingReceivables: marketUdhaar,
      inventoryTotalValue: inventoryVal,
      restaurantsCount: diagnosis.restaurantReports.length,
    },
    fileName,
    docContent,
  };
}

/**
 * Backward compatibility alias for HTML previews
 */
export function generateRestaurantReportHtml(restaurantIdOrName: string) {
  const result = generateRestaurantReportDoc(restaurantIdOrName);
  return {
    ...result,
    html: result.docContent,
  };
}

export function generateBusinessMasterReportHtml() {
  const result = generateBusinessMasterReportDoc();
  return {
    ...result,
    html: result.docContent,
  };
}

/**
 * Generates Profit by Salesman Report (HTML / Word DOC)
 */
export function generateProfitBySalesmanReportDoc(format: 'html' | 'doc' = 'html') {
  const compProfit = db.getComprehensiveProfitReport();
  const salesmen = compProfit.perSalesman || [];
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const companyTagline = company?.tagline || 'Wholesale Restaurant Supplies & Food Distribution';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Profit_By_Salesman_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = salesmen.map((s, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${s.salesmanName}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${s.billsCount}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${s.customersHandledCount}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol()} ${s.totalSalesVolume.toLocaleString()}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: ${s.totalProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${currencySymbol()} ${s.totalProfit.toLocaleString()}
      </td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${s.profitMarginPct.toFixed(1)}%</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Profit by Salesman Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Profit by Salesman Report</div>
      <div class="sub">${companyTagline} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Salesman Name</th>
          <th style="text-align: center;">Total Bills</th>
          <th style="text-align: center;">Customers</th>
          <th style="text-align: right;">Sales Volume</th>
          <th style="text-align: right;">Gross Profit</th>
          <th style="text-align: right;">Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6" style="padding: 20px; text-align: center;">No sales records found.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Profit by Restaurant / Customer Report (HTML / Word DOC)
 */
export function generateProfitByRestaurantReportDoc(format: 'html' | 'doc' = 'html') {
  const compProfit = db.getComprehensiveProfitReport();
  const rests = compProfit.perRestaurant || [];
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const companyTagline = company?.tagline || 'Wholesale Restaurant Supplies & Food Distribution';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Profit_By_Restaurant_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = rests.map((r, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${r.accountTitle}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${r.code || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${r.billsCount}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol()} ${r.totalSalesVolume.toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: ${r.grossProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${currencySymbol()} ${r.grossProfit.toLocaleString()}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${r.profitMarginPct.toFixed(1)}%</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: #d97706; font-weight: bold;">${currencySymbol()} ${(r.outstandingBalance || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Profit by Restaurant / Customer - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Profit by Restaurant / Customer Report</div>
      <div class="sub">${companyTagline} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Customer / Restaurant Name</th>
          <th style="text-align: center;">A/C Code</th>
          <th style="text-align: center;">Bills</th>
          <th style="text-align: right;">Total Sales</th>
          <th style="text-align: right;">Gross Profit</th>
          <th style="text-align: right;">Margin %</th>
          <th style="text-align: right;">Outstanding Udhaar</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7" style="padding: 20px; text-align: center;">No customer records found.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Stock Inventory Report (HTML / Word DOC)
 */
export function generateStockReportDoc(format: 'html' | 'doc' = 'html') {
  const products = db.getProducts();
  const summary = db.getBusinessSummary();
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Stock_Inventory_Report_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = products.map((p, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${p.name}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${p.sku || p.mcode || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${p.category}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${p.currentQuantity <= (p.minStockLevel || 5) ? '#ef4444' : '#1e293b'};">
        ${p.currentQuantity} ${p.unit}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${(p.purchasePrice || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol()} ${(p.sellingPrice || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">
        ${currencySymbol()} ${((p.currentQuantity || 0) * (p.purchasePrice || 0)).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Warehouse Stock Inventory Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Warehouse Stock Inventory Report</div>
      <div class="sub">Total Inventory Asset Valuation: ${currencySymbol()} ${(summary.inventoryTotalValue || 0).toLocaleString()} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item Title</th>
          <th style="text-align: center;">M-Code / SKU</th>
          <th>Category</th>
          <th style="text-align: right;">Current Stock</th>
          <th style="text-align: right;">Purchase Cost</th>
          <th style="text-align: right;">Selling Price</th>
          <th style="text-align: right;">Total Asset Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7" style="padding: 20px; text-align: center;">No stock items recorded.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Sales Report (HTML / Word DOC)
 */
export function generateSalesReportDoc(format: 'html' | 'doc' = 'html') {
  const saleBills = db.getSaleBills();
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Sales_Register_Report_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = saleBills.map((b, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">#${b.billNumber}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${b.date}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${b.customerAccountTitle}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${b.salesmanName || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${(b.grossAmount || b.netTotal).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">${currencySymbol()} ${(b.netTotal || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: #10b981;">${currencySymbol()} ${(b.cashReceived || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: #d97706; font-weight: bold;">${currencySymbol()} ${(b.balanceReceivable || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const totalSales = saleBills.reduce((s, b) => s + (b.netTotal || 0), 0);

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Sales Register Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Sales Register Report</div>
      <div class="sub">Total Invoices: ${saleBills.length} | Total Net Sales: ${currencySymbol()} ${totalSales.toLocaleString()} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Bill #</th>
          <th style="text-align: center;">Date</th>
          <th>Customer Name</th>
          <th>Salesman</th>
          <th style="text-align: right;">Gross Total</th>
          <th style="text-align: right;">Net Total</th>
          <th style="text-align: right;">Paid</th>
          <th style="text-align: right;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="padding: 20px; text-align: center;">No sale bills recorded yet.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Purchases Report (HTML / Word DOC)
 */
export function generatePurchasesReportDoc(format: 'html' | 'doc' = 'html') {
  const purchaseBills = db.getPurchaseBills();
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Purchases_Report_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = purchaseBills.map((b, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">#${b.billNumber}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${b.date}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${b.supplierAccountTitle}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${b.items?.length || 0}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${(b.grossAmount || b.netTotal).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">${currencySymbol()} ${(b.netTotal || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: #10b981;">${currencySymbol()} ${(b.paidAmount || 0).toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-weight: bold;">${currencySymbol()} ${(b.remainingBalance || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const totalPurchases = purchaseBills.reduce((s, b) => s + (b.netTotal || 0), 0);

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Supplier Purchases Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Purchases & Inward Goods Report</div>
      <div class="sub">Total Invoices: ${purchaseBills.length} | Total Purchases: ${currencySymbol()} ${totalPurchases.toLocaleString()} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Bill #</th>
          <th style="text-align: center;">Date</th>
          <th>Supplier Name</th>
          <th style="text-align: center;">Items</th>
          <th style="text-align: right;">Gross Amount</th>
          <th style="text-align: right;">Net Total</th>
          <th style="text-align: right;">Paid</th>
          <th style="text-align: right;">Payable Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="padding: 20px; text-align: center;">No purchase bills recorded yet.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Profit by Item Report (HTML / Word DOC)
 */
export function generateProfitByItemReportDoc(format: 'html' | 'doc' = 'html') {
  const compProfit = db.getComprehensiveProfitReport();
  const items = compProfit.perItem || [];
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Profit_By_Item_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = items.map((it, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${it.itemTitle}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${it.mcode || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${it.category}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${it.qtySold} (${it.ctnSold} CTN)</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${it.avgSaleRate.toFixed(2)}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${(it.avgPurchaseRate || 0).toFixed(2)}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol()} ${it.totalRevenue.toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: ${it.grossProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${currencySymbol()} ${it.grossProfit.toLocaleString()}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${it.profitMarginPct.toFixed(1)}%</td>
    </tr>
  `).join('');

  const totalRev = items.reduce((s, it) => s + it.totalRevenue, 0);
  const totalProfit = items.reduce((s, it) => s + it.grossProfit, 0);

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Profit by Item Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Profit Per Item Report</div>
      <div class="sub">Total Revenue: ${currencySymbol()} ${totalRev.toLocaleString()} | Total Gross Profit: ${currencySymbol()} ${totalProfit.toLocaleString()} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item Title</th>
          <th style="text-align: center;">M-Code</th>
          <th>Category</th>
          <th style="text-align: right;">Qty Sold</th>
          <th style="text-align: right;">Avg Sale Rate</th>
          <th style="text-align: right;">Cost Rate</th>
          <th style="text-align: right;">Total Revenue</th>
          <th style="text-align: right;">Gross Profit</th>
          <th style="text-align: right;">Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="padding: 20px; text-align: center;">No item sales records found.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates Profit by Bill Report (HTML / Word DOC)
 */
export function generateProfitByBillReportDoc(format: 'html' | 'doc' = 'html') {
  const compProfit = db.getComprehensiveProfitReport();
  const bills = compProfit.perBill || [];
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Profit_By_Bill_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const rows = bills.map((b, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">#${b.billNumber}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${b.date}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 500;">${b.customerAccountTitle}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${b.salesmanName || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${b.itemsCount}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol()} ${b.netTotal.toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol()} ${b.costOfGoods.toLocaleString()}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; color: ${b.grossProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${currencySymbol()} ${b.grossProfit.toLocaleString()}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${b.profitMarginPct.toFixed(1)}%</td>
    </tr>
  `).join('');

  const totalSales = bills.reduce((s, b) => s + b.netTotal, 0);
  const totalProfit = bills.reduce((s, b) => s + b.grossProfit, 0);

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Profit by Bill Report - ${companyName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background: #fff; color: #1e293b; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 20px; font-weight: bold; color: #0f766e; }
      .sub { font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th { background: #0f766e; color: #fff; padding: 10px; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${companyName} - Profit Per Sale Bill Report</div>
      <div class="sub">Total Invoices: ${bills.length} | Sales: ${currencySymbol()} ${totalSales.toLocaleString()} | Profit: ${currencySymbol()} ${totalProfit.toLocaleString()} | Generated: ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Bill #</th>
          <th style="text-align: center;">Date</th>
          <th>Customer Name</th>
          <th>Salesman</th>
          <th style="text-align: center;">Items</th>
          <th style="text-align: right;">Sale Amount</th>
          <th style="text-align: right;">Cost of Goods</th>
          <th style="text-align: right;">Gross Profit</th>
          <th style="text-align: right;">Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="padding: 20px; text-align: center;">No sale bills found.</td></tr>'}
      </tbody>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html };
}

/**
 * Generates an official, printable Sale Bill Invoice document for a specific Customer / Bill Number
 */
export function generateCustomerSaleBillDoc(identifier: string, format: 'html' | 'doc' = 'html') {
  const cleanId = (identifier || '').trim().toLowerCase();
  const allBills = db.getSaleBills();
  
  // Find bill by bill number, or find latest bill for this customer name/id/code
  let bill = allBills.find((b) => b.id === identifier || b.billNumber === identifier);
  if (!bill) {
    const matchingBills = allBills.filter(
      (b) =>
        (b.customerAccountTitle && b.customerAccountTitle.toLowerCase().includes(cleanId)) ||
        (b.customerId && b.customerId.toLowerCase().includes(cleanId)) ||
        (b.customerMobile && b.customerMobile.includes(cleanId))
    );
    if (matchingBills.length > 0) {
      bill = matchingBills[matchingBills.length - 1]; // latest
    }
  }

  if (!bill) {
    return {
      success: false,
      error: `Customer ya Bill "${identifier}" ka koi Sale Bill nahi mila.`,
      fileName: 'sale_bill.html',
      docContent: '',
      html: '',
    };
  }

  const customer = db.getCustomerById(bill.customerId);
  const company = db.getCompanyProfile();
  const companyName = company?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C';
  const companyPhone = company?.phone || '';
  const companyAddress = company?.address || '';
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Sale_Bill_${bill.billNumber}_${todayStr}.${format === 'doc' ? 'doc' : 'html'}`;

  const itemRows = (bill.items || []).map((it, idx) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${it.itemTitle}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${it.mcode || '-'}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${it.ctn > 0 ? `${it.ctn} CTN` : '-'}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${it.qty} ${it.unit || ''}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${currencySymbol()} ${(it.rate || 0).toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${currencySymbol()} ${(it.amount || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const previousBalance = bill.partyBalanceBefore !== undefined ? bill.partyBalanceBefore : (customer?.outstandingBalance || 0);
  const netTotal = bill.netTotal || 0;
  const cashReceived = bill.cashReceived || 0;
  const newBalance = Math.max(0, previousBalance + netTotal - cashReceived);

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Sale Bill #${bill.billNumber} - ${bill.customerAccountTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 25px; background: #fff; color: #0f172a; line-height: 1.4; }
      .header-box { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
      .company-name { font-size: 22px; font-weight: bold; color: #0f172a; }
      .company-sub { font-size: 11px; color: #64748b; }
      .invoice-title { font-size: 24px; font-weight: bold; color: #0284c7; text-align: right; }
      .details-grid { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
      .details-grid td { padding: 6px 10px; font-size: 12px; vertical-align: top; }
      table.items-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      table.items-table th { background: #0284c7; color: #fff; padding: 10px 8px; text-align: left; }
      .totals-table { width: 350px; margin-left: auto; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
      .totals-table td { padding: 6px 12px; border: 1px solid #e2e8f0; }
      .signature-box { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <table style="width: 100%; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
      <tr>
        <td>
          <div class="company-name">${companyName}</div>
          <div class="company-sub">${companyAddress} ${companyPhone ? `&bull; Phone: ${companyPhone}` : ''}</div>
        </td>
        <td style="text-align: right;">
          <div class="invoice-title">SALE BILL / INVOICE</div>
          <div style="font-size: 13px; font-weight: bold; color: #334155;">Bill #: ${bill.billNumber}</div>
          <div style="font-size: 12px; color: #64748b;">Date: ${bill.date}</div>
        </td>
      </tr>
    </table>

    <table class="details-grid">
      <tr>
        <td style="width: 60%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong style="color: #0284c7; font-size: 13px;">CUSTOMER / GAHAK DETAILS:</strong><br>
          <strong>Account Title:</strong> ${bill.customerAccountTitle}<br>
          <strong>Customer Code:</strong> ${customer?.code || bill.customerId || 'Cash Customer'}<br>
          <strong>Mobile / Phone:</strong> ${bill.customerMobile || customer?.mobile || 'N/A'}<br>
          <strong>Address / Area:</strong> ${customer?.area || customer?.city || 'N/A'}
        </td>
        <td style="width: 40%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong style="color: #0284c7; font-size: 13px;">PAYMENT &amp; ORDER INFO:</strong><br>
          <strong>Payment Mode:</strong> ${bill.paymentType || 'Credit / Account'}<br>
          <strong>Salesman:</strong> ${bill.salesmanName || 'General Staff'}<br>
          <strong>Status:</strong> ${bill.status || 'Active'}
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="text-align: center;">M-Code</th>
          <th style="text-align: center;">Cartons</th>
          <th style="text-align: center;">Total Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Subtotal / Gross:</td>
        <td style="text-align: right; font-weight: bold;">${currencySymbol()} ${(bill.grossAmount || netTotal).toLocaleString()}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #0284c7;">Current Bill Total:</td>
        <td style="text-align: right; font-weight: bold; color: #0284c7;">${currencySymbol()} ${netTotal.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Previous Balance (Sabqa Baqaya):</td>
        <td style="text-align: right; font-weight: bold; color: #d97706;">${currencySymbol()} ${previousBalance.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Cash Received (Wasool Shuda):</td>
        <td style="text-align: right; font-weight: bold; color: #10b981;">${currencySymbol()} ${cashReceived.toLocaleString()}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="font-weight: bold; color: #dc2626;">Net Balance Receivable (Kul Baqaya):</td>
        <td style="text-align: right; font-weight: bold; color: #dc2626; font-size: 14px;">${currencySymbol()} ${newBalance.toLocaleString()}</td>
      </tr>
    </table>

    <table style="width: 100%; margin-top: 50px; font-size: 12px; color: #64748b;">
      <tr>
        <td style="width: 50%;">Prepared By: __________________</td>
        <td style="width: 50%; text-align: right;">Receiver Signature: __________________</td>
      </tr>
    </table>
  </body>
  </html>`;

  return { success: true, fileName, docContent: html, html, bill, customer };
}
