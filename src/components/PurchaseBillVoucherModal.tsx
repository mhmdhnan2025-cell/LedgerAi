import React from 'react';
import { Printer, X, Receipt, Building2, Package, CheckCircle2, FileText, UserCheck, Phone, MapPin, Edit2, Download } from 'lucide-react';
import { printCleanDocument } from '../utils/printUtils';
import { currencySymbol } from '../utils/currency';
import { CompanyProfile, PurchaseBill } from '../types';

interface PurchaseBillVoucherModalProps {
  bill: PurchaseBill | null;
  companyProfile?: CompanyProfile | null;
  onClose: () => void;
  onEditBill?: (bill: PurchaseBill) => void;
}

export const PurchaseBillVoucherModal: React.FC<PurchaseBillVoucherModalProps> = ({
  bill,
  companyProfile,
  onClose,
  onEditBill,
}) => {
  if (!bill) return null;

  const documentTitle = `Purchase_Invoice_${bill.billNumber}_${(bill.supplierAccountTitle || bill.supplierName || 'Supplier').replace(/\s+/g, '_')}_${bill.date}`;

  const handlePrint = () => {
    printCleanDocument('printable-purchase-voucher', documentTitle);
  };

  const handleSavePdf = () => {
    printCleanDocument('printable-purchase-voucher', documentTitle);
  };

  const currency = currencySymbol();

  // Calculate or extract totals safely
  const grossAmount = typeof bill.grossAmount === 'number'
    ? bill.grossAmount
    : bill.items?.reduce((acc, it) => acc + Math.max(0, (it.amount || 0) - (it.vatAmount || 0)), 0) || 0;

  const totalDiscount = typeof bill.totalDiscount === 'number'
    ? bill.totalDiscount
    : bill.items?.reduce((acc, it) => acc + (it.discount || 0), 0) || 0;

  const totalVatAmount = typeof bill.totalVatAmount === 'number'
    ? bill.totalVatAmount
    : bill.items?.reduce((acc, it) => acc + (it.vatAmount || 0), 0) || 0;

  const netTotal = typeof bill.netTotal === 'number'
    ? bill.netTotal
    : bill.items?.reduce((acc, it) => acc + (it.amount || 0), 0) || 0;

  const paidAmount = typeof bill.paidAmount === 'number' ? bill.paidAmount : 0;
  const remainingBalance = typeof bill.remainingBalance === 'number' ? bill.remainingBalance : Math.max(0, netTotal - paidAmount);

  const totalCtn = bill.totalCtn ?? bill.items?.reduce((acc, it) => acc + (it.ctn || 0), 0) ?? 0;
  const totalQty = bill.totalQty ?? bill.items?.reduce((acc, it) => acc + (it.totalIntakeQty !== undefined ? it.totalIntakeQty : (it.qty || 0)), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl lg:max-w-6xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 print:m-0 print:border-none print:shadow-none print:bg-white print:text-black print:w-full print:max-w-none print:max-h-none">
        
        {/* Top Controls Bar (Hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Purchase Bill #{bill.billNumber}
              </h3>
              <p className="text-xs text-slate-400">
                Supplier: <strong className="text-slate-200">{bill.supplierAccountTitle || bill.supplierName || 'Local Supplier'}</strong> &bull; Buyer/Store: <strong className="text-emerald-400">{bill.customerName || companyProfile?.name || 'Self Store'}</strong> &bull; Date: {bill.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditBill && (
              <button
                onClick={() => {
                  onClose();
                  onEditBill(bill);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
                title="Edit this Purchase Bill with all items"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Bill</span>
              </button>
            )}
            <button
              onClick={handleSavePdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              title="Save Purchase Invoice as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice / Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher & Invoice Document Body */}
        <div id="printable-purchase-voucher" className="p-4 sm:p-6 md:p-8 space-y-6 text-xs text-slate-300 bg-slate-900 print:bg-white print:text-black print:p-6 flex-1 overflow-y-auto">
          
          {/* Header 1: Company Profile & Document Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800 print:border-black pb-5">
            <div className="space-y-1">
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black uppercase">
                {companyProfile?.name || 'APEX FOOD SUPPLIES LTD.'}
              </div>
              <p className="text-xs font-semibold text-slate-300 print:text-gray-700">
                {companyProfile?.tagline || 'Wholesale Restaurant Provisions & Food Distribution'}
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600 flex flex-wrap items-center gap-2">
                <span>{companyProfile?.address || 'Akbari Mandi Wholesale Logistics Hub, Lahore'}</span>
                {companyProfile?.city && <span>&bull; {companyProfile.city}</span>}
                {companyProfile?.phone && <span>&bull; Phone: {companyProfile.phone}</span>}
              </p>
              {(companyProfile?.trn || companyProfile?.ntn) && (
                <p className="text-[11px] font-mono text-slate-400 print:text-gray-600">
                  {companyProfile.trn ? `TRN / VAT#: ${companyProfile.trn}` : ''}
                  {companyProfile.trn && companyProfile.ntn ? ' &bull; ' : ''}
                  {companyProfile.ntn ? `NTN#: ${companyProfile.ntn}` : ''}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0 bg-slate-950/60 print:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-800/80 sm:border-0 print:border-0">
              <div className="text-xs font-black uppercase tracking-widest text-sky-400 print:text-gray-900">
                OFFICIAL PURCHASE INVOICE
              </div>
              <div className="font-mono font-black text-lg text-white print:text-black mt-0.5">
                #{bill.billNumber}
              </div>
              <div className="text-xs text-slate-300 print:text-gray-700 mt-1">
                Date: <strong className="text-white print:text-black font-mono font-bold">{bill.date}</strong>
              </div>
              <div className="text-xs text-slate-300 print:text-gray-700 mt-0.5">
                Mode: <strong className={bill.isCash ? 'text-amber-400 print:text-black font-bold' : 'text-sky-400 print:text-black font-bold'}>
                  {bill.isCash ? 'Cash Purchase' : 'Credit / Account'}
                </strong>
              </div>
              {bill.vendorBillNumber && (
                <div className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                  V.Bill#: <span className="font-mono font-bold text-white print:text-black">{bill.vendorBillNumber}</span>
                </div>
              )}
              {bill.gatePassNumber && (
                <div className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                  GP#: <span className="font-mono font-bold text-white print:text-black">{bill.gatePassNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Header 2: Parties Information (Supplier & Buyer) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 print:bg-gray-50 p-4 rounded-xl border border-slate-800 print:border-gray-300">
            {/* Supplier / Vendor */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-sky-400 print:text-gray-700 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400 print:text-black" />
                <span>Supplier / Vendor Details</span>
              </span>
              <div className="font-extrabold text-sm sm:text-base text-white print:text-black">
                {bill.supplierAccountTitle || bill.supplierName || 'Local Supplier'}
              </div>
              <div className="text-xs font-mono text-slate-400 print:text-gray-700">
                Account ID / Code: <span className="text-sky-300 print:text-black font-bold">{bill.supplierId || 'sup-generic'}</span>
              </div>
              <div className="text-[11px] text-slate-400 print:text-gray-600">
                Payment Terms: <span className="text-slate-200 print:text-black font-medium">{bill.isCash ? 'Immediate Cash Settlement' : 'Regular Ledger Khata'}</span>
              </div>
            </div>

            {/* Customer / Buyer (Store) */}
            <div className="space-y-1 md:border-l md:border-slate-800 print:md:border-gray-300 md:pl-4">
              <span className="text-[10px] uppercase font-bold text-emerald-400 print:text-gray-700 tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span>Purchased By (Store & Warehouse)</span>
              </span>
              <div className="font-extrabold text-sm sm:text-base text-white print:text-black">
                {bill.customerName || companyProfile?.name || 'APEX FOOD SUPPLIES LTD.'}
              </div>
              <div className="text-xs text-slate-300 print:text-gray-700">
                Proprietor: <span className="text-white print:text-black font-medium">{companyProfile?.ownerName || 'Management'}</span>
                &bull; Entered By: <span className="text-emerald-400 print:text-black font-bold">{bill.createdBy || 'Admin'}</span>
              </div>
              <div className="text-[11px] text-emerald-400 print:text-black font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span>Inventory Status: Added to Physical Warehouse Stock</span>
              </div>
            </div>
          </div>

          {/* Table: Streamlined Clean 8-Column Purchase Breakdown (No Horizontal Scroll, Perfect 1-Page A4 Print) */}
          <div className="border border-slate-800 print:border-black rounded-xl overflow-hidden bg-slate-950/40 print:bg-white shadow-xs w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black font-bold border-b border-slate-800 print:border-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-2 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2 text-center w-28 text-sky-300 print:text-black">Carton / PKG</th>
                  <th className="py-2.5 px-2 text-center w-24 text-slate-300 print:text-black">Loose Qty</th>
                  <th className="py-2.5 px-2 text-right w-28 text-slate-200 print:text-black">Rate</th>
                  <th className="py-2.5 px-2 text-right w-20 text-amber-300 print:text-black">Disc.</th>
                  <th className="py-2.5 px-2 text-right w-24 text-slate-300 print:text-black">VAT (5%)</th>
                  <th className="py-2.5 px-3 text-right w-28 font-black text-emerald-400 print:text-black">Amount ({currency})</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 print:divide-gray-300 font-medium">
                {bill.items?.map((it, idx) => {
                  const combined = `${it.itemTitle || ''} ${it.category || ''} ${it.unit || ''}`.toLowerCase();
                  const pkgLabel = it.packageType ||
                    (combined.includes('bag') || combined.includes('bori') || combined.includes('sugar') || combined.includes('suger') || combined.includes('atta') || combined.includes('rice') || combined.includes('daal') ? 'Bag' :
                     combined.includes('box') || combined.includes('dabba') ? 'Box' :
                     combined.includes('tin') || combined.includes('drum') ? 'Tin' :
                     combined.includes('pack') ? 'Pack' : 'Carton');

                  const looseUnit = it.unit || (pkgLabel === 'Bag' ? 'KG' : 'Units');
                  const ctnCount = Number(it.ctn) || 0;
                  const ratePerCtn = Number(it.ratePerCtn) || 0;
                  const qtyPerCtn = Number(it.qtyPerCtn) || (ctnCount > 0 && it.totalIntakeQty ? Math.round(it.totalIntakeQty / ctnCount) : 1);
                  const looseQty = Number(it.qty) || 0;
                  const totalIntake = it.totalIntakeQty !== undefined ? Number(it.totalIntakeQty) : ((ctnCount * qtyPerCtn) + looseQty);
                  const unitRate = Number(it.rate) || (ratePerCtn > 0 && qtyPerCtn > 0 ? Number((ratePerCtn / qtyPerCtn).toFixed(2)) : 0);
                  const disc = Number(it.discount) || 0;
                  const vatPct = Number(it.vatPercent) || (it.vatAmount && it.amount ? Math.round((it.vatAmount / (it.amount - it.vatAmount)) * 100) : 0);
                  const vatAmt = Number(it.vatAmount) || 0;
                  const lineAmt = Number(it.amount) || 0;

                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-800/40 print:hover:bg-transparent text-slate-300 print:text-black">
                      {/* # */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500 print:text-gray-600 font-bold">
                        {idx + 1}
                      </td>

                      {/* Title & Specs */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white print:text-black text-xs sm:text-sm">
                          {it.itemTitle}
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] print:border-black print:text-black print:bg-gray-100">
                            {pkgLabel}
                          </span>
                        </div>
                        {it.category && (
                          <div className="text-[10px] text-slate-400 print:text-gray-600 mt-0.5">
                            {it.category} {it.mcode ? `• ${it.mcode}` : ''}
                          </div>
                        )}
                      </td>

                      {/* CTN / PKG */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        {ctnCount > 0 ? (
                          <div>
                            <span className="font-bold text-sky-300 print:text-black">
                              {ctnCount} <span className="text-[10px] font-normal text-slate-400 print:text-gray-600">{pkgLabel}</span>
                            </span>
                            {qtyPerCtn > 1 && (
                              <div className="text-[9.5px] text-slate-400 print:text-gray-500 font-mono">
                                ({qtyPerCtn} {looseUnit}/{pkgLabel})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 print:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Loose Qty */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        {looseQty > 0 ? (
                          <div>
                            <span className="font-bold text-slate-200 print:text-black">
                              {looseQty} <span className="text-[10px] text-slate-400 print:text-gray-600">{looseUnit}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 print:text-gray-400">—</span>
                        )}
                        {totalIntake > 0 && ctnCount > 0 && looseQty > 0 && (
                          <div className="text-[9.5px] text-emerald-400 print:text-gray-600 font-mono">
                            Tot: {totalIntake} {looseUnit}
                          </div>
                        )}
                      </td>

                      {/* Rate */}
                      <td className="py-2.5 px-2 text-right font-mono">
                        <div className="font-bold text-white print:text-black">
                          {unitRate > 0 ? `${unitRate.toFixed(2)}` : '—'}
                          <span className="text-[9px] text-slate-400 print:text-gray-600 font-normal ml-0.5">/{looseUnit}</span>
                        </div>
                        {ratePerCtn > 0 && (
                          <div className="text-[9.5px] text-sky-300 print:text-gray-600 font-mono">
                            CTN: {ratePerCtn.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-2 text-right font-mono text-amber-400 print:text-black">
                        {disc > 0 ? disc.toFixed(2) : '0.00'}
                      </td>

                      {/* VAT */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 print:text-black">
                        <div>{vatAmt.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-500 print:text-gray-500">{vatPct}%</div>
                      </td>

                      {/* Line Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 print:text-black text-sm">
                        {lineAmt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Totals Row */}
              <tfoot className="bg-slate-950 print:bg-gray-100 font-bold border-t-2 border-slate-700 print:border-black text-white print:text-black text-xs">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-slate-400 print:text-black">
                    TOTAL SUMMARY
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-sky-300 print:text-black">
                    {totalCtn > 0 ? `${totalCtn} PKG` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-emerald-400 print:text-black text-[11px]">
                    {totalQty.toFixed(1)} Units
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-600 print:text-gray-400">---</td>
                  <td className="py-2.5 px-2 text-right font-mono text-amber-400 print:text-black">
                    {totalDiscount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-200 print:text-black">
                    {totalVatAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 print:text-black text-sm">
                    {netTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Financial & Notes Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
            {/* Notes & Delivery Instructions */}
            <div className="md:col-span-7 bg-slate-950/80 print:bg-gray-50 p-4 rounded-xl border border-slate-800 print:border-gray-300 space-y-2">
              <span className="text-[11px] font-bold text-sky-400 print:text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400 print:text-black" />
                <span>Notes &amp; Operational Instructions:</span>
              </span>
              <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed italic">
                {bill.notes || 'No specific delivery notes or vehicle details recorded for this purchase.'}
              </p>
              <div className="pt-2 border-t border-slate-800/80 print:border-gray-300 text-[11px] text-slate-400 print:text-gray-600">
                <strong className="text-slate-300 print:text-black">Warehouse Verification:</strong> All line items inspected for physical seal and quality standards upon receipt.
              </div>
            </div>

            {/* Comprehensive Financial Calculation Box */}
            <div className="md:col-span-5 bg-slate-950/80 print:bg-gray-50 p-4 rounded-xl border border-slate-800 print:border-gray-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 print:text-gray-700">
                <span>Gross Purchases Amount:</span>
                <span className="font-mono font-bold text-white print:text-black">
                  {currency} {grossAmount.toFixed(2)}
                </span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-amber-400 print:text-gray-700">
                  <span>Total Bill Discount:</span>
                  <span className="font-mono font-bold">
                    - {currency} {totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {totalVatAmount > 0 && (
                <div className="flex justify-between text-slate-300 print:text-gray-700">
                  <span>Total VAT Amount:</span>
                  <span className="font-mono font-bold text-sky-300 print:text-black">
                    + {currency} {totalVatAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {bill.loadExp > 0 && (
                <div className="flex justify-between text-slate-400 print:text-gray-700">
                  <span>Loading / Freight Expense:</span>
                  <span className="font-mono font-bold text-slate-200 print:text-black">
                    {bill.isLoadExpDeduction ? '- ' : '+ '}
                    {currency} {bill.loadExp.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-800 print:border-black pt-2 flex justify-between font-black text-sm text-white print:text-black">
                <span>Net Bill Total:</span>
                <span className="font-mono text-emerald-400 print:text-black text-base">
                  {currency} {netTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sky-400 print:text-gray-700 font-bold pt-0.5">
                <span>Amount Paid:</span>
                <span className="font-mono">
                  {currency} {paidAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span className="text-amber-400 print:text-black">This Bill Remaining:</span>
                <span className="font-mono text-amber-400 print:text-black">
                  {currency} {remainingBalance.toFixed(2)}
                </span>
              </div>

              {!bill.isCash && (
                <>
                  <div className="flex justify-between text-slate-400 print:text-gray-700 text-xs pt-1 border-t border-slate-800/60 print:border-gray-300">
                    <span>Previous Balance (سابقہ واجبات):</span>
                    <span className="font-mono font-bold text-slate-200 print:text-black">
                      {currency} {(Number(bill.partyBalanceBefore) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between font-black text-xs border-t-2 border-slate-700 print:border-black pt-1.5 bg-slate-900/60 print:bg-transparent p-1.5 rounded">
                    <span className="text-emerald-400 print:text-black uppercase">Total Net Payable (کل واجب الادا):</span>
                    <span className="font-mono text-emerald-400 print:text-black text-sm">
                      {currency} {((Number(bill.partyBalanceBefore) || 0) + remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Official Signatures Row (for physical documentation & audit) */}
          <div className="grid grid-cols-2 gap-10 pt-8 border-t border-slate-800 print:border-black text-center text-xs">
            <div>
              <div className="border-b border-slate-700 print:border-black pb-8"></div>
              <span className="text-slate-400 print:text-gray-700 mt-2 block font-medium">
                Supplier / Vendor Signature &amp; Stamp
              </span>
            </div>
            <div>
              <div className="border-b border-slate-700 print:border-black pb-8"></div>
              <span className="text-slate-400 print:text-gray-700 mt-2 block font-medium">
                Warehouse Incharge / Receiver Signature &amp; Stamp
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar (Pinned at bottom, hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs transition shadow cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice / Voucher</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
