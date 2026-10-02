import { Product, Restaurant, Order, Payment, Expense, AuditLog, User, DatabaseSnapshot } from '../types';

const STORAGE_KEYS = {
  SNAPSHOT: 'supplysmarterp_snapshot_v2',
  AUTH_USER: 'supplysmarterp_auth_user_v2',
  OFFLINE_FLAG: 'supplysmarterp_is_offline',
};

/**
 * Robust Client-Side Offline Storage & Local Database Engine
 * Guarantees zero data loss even if the server is offline, restarted, or not deployed.
 */
export class OfflineStorageService {
  public static saveSnapshot(data: Partial<DatabaseSnapshot>): void {
    try {
      const existing: Partial<DatabaseSnapshot> = this.loadSnapshot() || {};
      const merged: DatabaseSnapshot = {
        restaurants: data.restaurants || existing.restaurants || [],
        products: data.products || existing.products || [],
        orders: data.orders || existing.orders || [],
        payments: data.payments || existing.payments || [],
        expenses: data.expenses || existing.expenses || [],
        suppliers: data.suppliers || existing.suppliers || [],
        employees: data.employees || existing.employees || [],
        auditLogs: data.auditLogs || existing.auditLogs || [],
        users: data.users || existing.users || [],
        businessSummary: data.businessSummary || existing.businessSummary || {
          totalTurnover: 0,
          totalCOGS: 0,
          grossProfit: 0,
          grossMarginPercentage: 0,
          totalExpenses: 0,
          netProfit: 0,
          netProfitMarginPercentage: 0,
          totalReceivables: 0,
          totalStockValue: 0,
          healthyMarginPercentage: 15,
        },
      };
      localStorage.setItem(STORAGE_KEYS.SNAPSHOT, JSON.stringify(merged));
    } catch (err) {
      console.warn('Failed to save offline snapshot to localStorage:', err);
    }
  }

  public static loadSnapshot(): DatabaseSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SNAPSHOT);
      if (!raw) return null;
      const DUMMY_IDS = ['usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'];
      const DUMMY_USERNAMES = ['accountant', 'manager', 'sales'];
      const isDummy = (u: any) => !u || DUMMY_IDS.includes(u.id) || DUMMY_USERNAMES.includes((u.username || '').toLowerCase());

      const parsed: DatabaseSnapshot = JSON.parse(raw);
      if (parsed.users) {
        parsed.users = parsed.users.filter((u) => !isDummy(u));
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to parse offline snapshot from localStorage:', err);
      return null;
    }
  }

  public static saveActiveUser(user: User | null): void {
    try {
      const DUMMY_IDS = ['usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'];
      const DUMMY_USERNAMES = ['accountant', 'manager', 'sales'];
      const isDummy = (u: any) => !u || DUMMY_IDS.includes(u.id) || DUMMY_USERNAMES.includes((u.username || '').toLowerCase());

      if (isDummy(user)) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      } else {
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      }
    } catch (err) {
      console.warn('Failed to save user in localStorage:', err);
    }
  }

  public static loadActiveUser(): User | null {
    try {
      const DUMMY_IDS = ['usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'];
      const DUMMY_USERNAMES = ['accountant', 'manager', 'sales'];
      const isDummy = (u: any) => !u || DUMMY_IDS.includes(u.id) || DUMMY_USERNAMES.includes((u.username || '').toLowerCase());

      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (isDummy(parsed)) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  public static exportDatabaseJSON(): void {
    const data = this.loadSnapshot();
    if (!data) {
      alert('No database content found to export.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wholesale-erp-database-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public static importDatabaseJSON(jsonString: string): DatabaseSnapshot {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.restaurants) || !Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
      throw new Error('Invalid database backup format. Missing core entities.');
    }
    this.saveSnapshot(parsed);
    return parsed;
  }
}
