/**
 * Utility to determine if a bill date matches "today" (accounting date)
 * Supports UTC YYYY-MM-DD and local YYYY-MM-DD.
 */
export function isBillDateToday(billDate?: string): boolean {
  if (!billDate) return false;
  const dStr = billDate.slice(0, 10);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const todayLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  return dStr === todayUtc || dStr === todayLocal;
}
