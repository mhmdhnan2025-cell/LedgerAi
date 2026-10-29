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

export function parseBillTimestamp(d?: string): number {
  if (!d) return 0;
  const str = d.trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(str).getTime() || 0;
    }
    if (parts[2]?.length === 4) {
      // DD-MM-YYYY
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
    }
  }
  return new Date(str).getTime() || 0;
}

export function sortByBillDateDesc(
  a: { date?: string; billNumber?: string | number },
  b: { date?: string; billNumber?: string | number }
): number {
  const timeA = parseBillTimestamp(a.date);
  const timeB = parseBillTimestamp(b.date);
  if (timeB !== timeA) return timeB - timeA;
  const numA = Number(String(a.billNumber || '').replace(/\D/g, '')) || 0;
  const numB = Number(String(b.billNumber || '').replace(/\D/g, '')) || 0;
  return numB - numA;
}

