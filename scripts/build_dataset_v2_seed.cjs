const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CO = 'comp-muocj00t-j3co';
const tenant = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `database_${CO}.json`), 'utf8'));

const pick = (o, keys) => keys.reduce((acc, k) => { acc[k] = o[k]; return acc; }, {});

const custKeys = [
  'id', 'code', 'accountCode', 'account_code', 'manualCode', 'manual_code',
  'name', 'title', 'accountTitle', 'account_title', 'customerGroup', 'customer_group',
  'regDate', 'reg_date', 'contactPerson', 'mobile', 'mobile2', 'rawMobiles',
  'city', 'area', 'sector', 'location', 'address', 'status',
  'creditLimit', 'credit_limit', 'totalSales', 'total_sales',
  'openingBalance', 'opening_balance', 'openingBalanceType', 'opening_balance_type',
  'outstandingBalance', 'outstanding_balance', 'salesman', 'assignedSalesman',
  'srNo', 'sNo', 'pdfOrder', 'createdAt', 'updatedAt', 'updated_at',
  'companyId', 'company_id', 'lastBillNumber', 'lastBillDate', 'lastBillAmount',
  'lastReceiptDate', 'lastReceiptAmount', 'receivableSerial',
];

const prodKeys = [
  'id', 'sku', 'mcode', 'name', 'itemTitle', 'category', 'measure', 'unit',
  'purchasePrice', 'lastPurchasePrice', 'averagePurchaseCost', 'purchase_price',
  'sellingPrice', 'salePrice', 'ctnSaleRate', 'sale_price', 'saleDiscount',
  'currentQuantity', 'totalStock', 'openingStock', 'stockValue', 'current_quantity',
  'minQuantity', 'min_quantity', 'minStockLevel', 'profitMargin', 'lowStockAlert',
  'measure_unit', 'description', 'comments', 'scanType', 'packageType', 'qtyInCarton',
  'companyBrand', 'customFields', 'image', 'status', 'ctn', 'pcs', 'carton', 'extraKg',
  'ctnPurchaseRate', 'ctnMinSaleRate', 'prchFixedPrice', 'saleFixedPrice', 'saleMinPrice',
  'companyId', 'company_id', 'createdAt', 'updatedAt', 'updated_at',
];

const supKeys = [
  'id', 'companyId', 'company_id', 'code', 'title', 'accountTitle', 'account_title',
  'name', 'supplierGroup', 'supplier_group', 'mobile', 'vatNumber', 'vat_number',
  'ntnNumber', 'bankName', 'bankTitle', 'bankAccountNo', 'prefixTitle', 'firstName',
  'lastName', 'contactPerson', 'email', 'telephones', 'phone', 'city', 'address',
  'status', 'categories', 'documents', 'cnic', 'totalPurchases', 'srNo', 'sNo',
  'pdfOrder', 'pdfTitle', 'createdAt', 'updatedAt', 'updated_at',
  'payableToSupplier', 'payable_to_supplier', 'payableType', 'payable_type',
  'balanceOwed', 'openingBalance', 'opening_balance', 'openingBalanceType', 'opening_balance_type',
  'lastBillNumber', 'lastBillDate', 'lastBillAmount', 'lastPaymentDate', 'lastPaymentAmount',
  'postDatedPayments', 'postDatedReceipts', 'adjustedLedgerBalance', 'adjustedLedgerBalanceType',
];

const out = {
  meta: {
    key: 'zafr_dataset_v2_import',
    companyId: CO,
    generatedAt: new Date().toISOString(),
    source: ['items-report.csv', 'customers.pdf', 'reciveballe.pdf', 'payable.pdf'],
    counts: {
      customers: tenant.customers.length,
      products: tenant.products.length,
      suppliers: tenant.suppliers.length,
    },
  },
  customers: tenant.customers.map((c) => pick(c, custKeys)),
  products: tenant.products.map((p) => pick(p, prodKeys)),
  suppliers: tenant.suppliers.map((s) => pick(s, supKeys)),
};

const dest = path.join(ROOT, 'server', 'seeds', 'zafr_dataset_v2.json');
fs.writeFileSync(dest, JSON.stringify(out), 'utf8');
const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`[seed] ${dest}`);
console.log(`[seed] customers=${out.customers.length} products=${out.products.length} suppliers=${out.suppliers.length} (${kb} KB)`);
