import { db } from './db';

/**
 * CENTRAL CURRENCY HELPER (SERVER)
 * ---------------------------------
 * Reads the reporting currency from the company profile
 * (Settings -> Company Profile -> Currency on Tax Invoice).
 *
 * Used by every server generated report so downloads (business master,
 * restaurant statements, AI Ledger Master Audit, etc.) always print in
 * the selected currency - AED, PKR, SAR ... whatever is configured.
 */

export function companyCurrency(): string {
  try {
    const code = (db.getCompanyProfile()?.currency || 'PKR').trim().toUpperCase();
    return code || 'PKR';
  } catch {
    return 'PKR';
  }
}

export function currencySymbol(): string {
  const code = companyCurrency();
  return code === 'PKR' || code === 'RS' ? 'Rs.' : code;
}
