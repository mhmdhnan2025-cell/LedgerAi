/**
 * CENTRAL CURRENCY HELPER (CLIENT)
 * --------------------------------
 * The reporting currency is stored on companyProfile.currency
 * (Settings -> Company Profile -> Currency on Tax Invoice).
 *
 * Every amount label in the UI reads the symbol from here so the whole
 * software - bills, stock, purchases, sales, all reports and the
 * Master Audit Report - speaks the same selected currency.
 *
 * NOTE: amounts themselves are stored as plain numbers in the ledger;
 * the selected currency is applied as the unit label everywhere
 * (no FX conversion is applied to historical figures).
 */

export const CURRENCY_OPTIONS = [
  'AED',
  'PKR',
  'SAR',
  'QAR',
  'KWD',
  'OMR',
  'BHD',
  'USD',
  'EUR',
  'GBP',
  'INR',
  'TRY',
  'CAD',
  'AUD',
  'CNY',
  'JPY',
];

let currencyCode = 'PKR';

/** Push the freshly saved company currency into the shared helper. */
export function setCurrency(code?: string | null): void {
  const clean = (code || '').trim().toUpperCase();
  if (clean) currencyCode = clean;
}

/** Active currency code, e.g. "AED". */
export function getCurrency(): string {
  return currencyCode;
}

/** Symbol printed in front of amounts: "Rs." for PKR, otherwise the code. */
export function currencySymbol(): string {
  const code = currencyCode || 'PKR';
  return code === 'PKR' || code === 'RS' ? 'Rs.' : code;
}

/**
 * Re-write historical / pre-saved prose (stored audit-log descriptions,
 * AI chat history saved in localStorage, default welcome texts) so the
 * old hardcoded "Rs." label shows the currently selected currency.
 */
export function adaptCurrencyText(text?: string | null): string {
  if (!text) return text || '';
  if (currencySymbol() === 'Rs.') return text;
  return text.replace(/\bRs\./g, currencySymbol());
}
