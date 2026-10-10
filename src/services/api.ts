import {
  AuditLog,
  BusinessSummary,
  CompanyProfile,
  Employee,
  Expense,
  ExpenseAllocationMethod,
  ExtractedDocumentData,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
  PurchaseBill,
  PurchaseReport,
  Restaurant,
  SaleBill,
  SaleReport,
  Customer,
  SmartAlert,
  Supplier,
  User,
  UserRole,
  ComprehensiveProfitReport,
  StockMovementReport,
  AiLedgerAuditReport,
  CashRegister,
  BankAccount,
  CashAccount,
  GlAccountOption,
  Voucher,
  NextVoucherNumbers,
  VoucherFilterParams,
  CashRecoveredReportItem,
  CashPaidReportItem,
  ExpenseAccount,
  SaleReturn,
  PurchaseReturn,
  CustomerLedgerReport,
} from '../types';
import { OfflineStorageService } from './offlineStorage';
import { setCurrency } from '../utils/currency';

export interface FullDatabaseSnapshot {
  users: User[];
  companyProfile?: CompanyProfile | null;
  employees?: Employee[];
  restaurants: Restaurant[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchaseBills?: PurchaseBill[];
  itemCategories?: string[];
  itemBrands?: string[];
  itemMeasures?: string[];
  auditLogs: AuditLog[];
  summary: BusinessSummary;
  alerts: SmartAlert[];
  isOffline?: boolean;
}

const AUTH_TOKEN_KEY = 'erp_auth_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string): void {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to save auth token:', e);
    }
  },
  clearToken(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear auth token:', e);
    }
  },
  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  },
};

// Global Fetch Interceptor to inject Authorization Bearer Token on all /api requests
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof (input as any).url === 'string') {
      url = (input as any).url;
    }

    if (url.startsWith('/api/') || url.includes('/api/')) {
      const token = authStorage.getToken();
      if (token) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        init.headers = headers;
      }
    }
    return originalFetch(input, init);
  };
}

export const api = {
  async fetchAll(): Promise<FullDatabaseSnapshot> {
    try {
      const res = await fetch('/api/db/all');
      if (!res.ok) throw new Error('Failed to fetch from server');
      const data: FullDatabaseSnapshot = await res.json();
      setCurrency(data.companyProfile?.currency);
      OfflineStorageService.saveSnapshot({
        restaurants: data.restaurants,
        products: data.products,
        orders: data.orders,
        payments: data.payments,
        expenses: data.expenses,
        suppliers: data.suppliers,
        employees: data.employees,
        auditLogs: data.auditLogs,
        users: data.users,
        businessSummary: data.summary,
      });
      return { ...data, isOffline: false };
    } catch (err) {
      console.warn('Network offline or server unreachable. Loading from client-side offline database...', err);
      const cached = OfflineStorageService.loadSnapshot();
      if (cached) {
        return {
          users: cached.users || [],
          restaurants: cached.restaurants || [],
          products: cached.products || [],
          orders: cached.orders || [],
          payments: cached.payments || [],
          expenses: cached.expenses || [],
          suppliers: cached.suppliers || [],
          employees: cached.employees || [],
          auditLogs: cached.auditLogs || [],
          summary: cached.businessSummary || {
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
          alerts: [],
          isOffline: true,
        };
      }
      throw err;
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const snap = await this.fetchAll();
      return snap.products || [];
    } catch {
      const cached = OfflineStorageService.loadSnapshot();
      return cached?.products || [];
    }
  },

  async login(
    username: string,
    password?: string
  ): Promise<{ success: boolean; user: User; token: string; company: any; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    if (data.token) {
      authStorage.setToken(data.token);
    }
    if (data.user) {
      OfflineStorageService.saveActiveUser(data.user);
    }
    return data;
  },

  async resetPassword(
    usernameOrEmail: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user?: User; company?: any; token?: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    if (data.token) {
      authStorage.setToken(data.token);
    }
    if (data.user) {
      OfflineStorageService.saveActiveUser(data.user);
    }
    return data;
  },

  async createCompany(payload: {
    companyName: string;
    ownerName: string;
    username: string;
    email?: string;
    password?: string;
    phone?: string;
    city?: string;
    businessType?: string;
    currency?: string;
  }): Promise<{ success: boolean; message: string; token: string; user: User; company: any }> {
    const res = await fetch('/api/auth/company/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create company');
    }
    if (data.token) {
      authStorage.setToken(data.token);
    }
    if (data.user) {
      OfflineStorageService.saveActiveUser(data.user);
    }
    return data;
  },

  async joinCompany(payload: {
    inviteCode: string;
    name: string;
    username: string;
    email?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string; token: string; user: User; company: any }> {
    const res = await fetch('/api/auth/company/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to join company');
    }
    if (data.token) {
      authStorage.setToken(data.token);
    }
    if (data.user) {
      OfflineStorageService.saveActiveUser(data.user);
    }
    return data;
  },

  async getCurrentUser(): Promise<{ success: boolean; user: User; company: any }> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch current user session');
    }
    return res.json();
  },

  logout(): void {
    authStorage.clearToken();
    OfflineStorageService.saveActiveUser(null);
  },

  async getInviteCode(): Promise<{
    success: boolean;
    inviteCode: string;
    inviteCodeStatus: 'ACTIVE' | 'REVOKED';
    inviteCodeCreatedAt?: string;
    inviteCodeExpiresAt?: string | null;
    companyName?: string;
  }> {
    const res = await fetch('/api/company/invite-code');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch invite code');
    }
    return data;
  },

  async regenerateInviteCode(): Promise<{ success: boolean; inviteCode: string; message: string }> {
    const res = await fetch('/api/company/invite-code/regenerate', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to regenerate invite code');
    }
    return data;
  },

  async revokeInviteCode(): Promise<{ success: boolean; inviteCodeStatus: 'REVOKED'; message: string }> {
    const res = await fetch('/api/company/invite-code/revoke', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to revoke invite code');
    }
    return data;
  },

  async activateInviteCode(): Promise<{ success: boolean; inviteCodeStatus: 'ACTIVE'; message: string }> {
    const res = await fetch('/api/company/invite-code/activate', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to activate invite code');
    }
    return data;
  },

  async register(userData: {
    name: string;
    username: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    OfflineStorageService.saveActiveUser(data.user);
    return data;
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch('/api/company/users');
      if (res.ok) {
        const data = await res.json();
        return data.users || [];
      }
    } catch {}
    const cached = OfflineStorageService.loadSnapshot();
    return cached?.users || [];
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await fetch(`/api/company/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete user');
    }
  },

  async getCompanyUsers(): Promise<User[]> {
    return this.getUsers();
  },

  async deleteCompanyUser(userId: string): Promise<void> {
    return this.deleteUser(userId);
  },

  async exportBackup(): Promise<any> {
    const res = await fetch('/api/backup/export');
    if (!res.ok) throw new Error('Failed to export backup');
    return res.json();
  },

  async importBackup(data: any, user?: { id: string; name: string; role: UserRole }): Promise<any> {
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Backup import failed');
    }
    OfflineStorageService.saveSnapshot(data);
    return res.json();
  },

  async resetSeedData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/reset-seed', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  },

  async clearAllData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/clear-data', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear database');
    return res.json();
  },

  async getProfitDiagnosis(): Promise<any> {
    const res = await fetch('/api/profit-diagnosis');
    if (!res.ok) throw new Error('Failed to fetch profit diagnosis');
    return res.json();
  },

  async deleteRestaurant(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/restaurants/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error('Failed to delete restaurant');
    return res.json();
  },

  async deleteProduct(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return res.json();
  },

  async deleteOrder(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error('Failed to delete order');
    return res.json();
  },

  async deletePayment(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error('Failed to delete payment');
    return res.json();
  },

  async deleteExpense(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error('Failed to delete expense');
    return res.json();
  },

  async updateExpense(
    id: string,
    updates: Partial<Expense>,
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Expense> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, user }),
    });
    if (!res.ok) throw new Error('Failed to update expense');
    return res.json();
  },

  async createRestaurant(
    data: { name: string; contactPerson: string; phone: string; address?: string; creditLimit?: number },
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Restaurant> {
    const res = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create restaurant');
    }
    return res.json();
  },

  async updateRestaurant(
    id: string,
    updates: Partial<Restaurant>,
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Restaurant> {
    const res = await fetch(`/api/restaurants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update restaurant');
    }
    return res.json();
  },

  async createProduct(
    product: any,
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Product> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create product');
    }
    return res.json();
  },

  async createProductsBatch(
    products: any[],
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<{ success: boolean; count: number; products: Product[] }> {
    const res = await fetch('/api/products/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, source, user }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch import products');
    }
    return res.json();
  },

  async updateProduct(
    id: string,
    updates: Partial<Product>,
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update product');
    }
    return res.json();
  },

  async createOrder(
    params: {
      restaurantId: string;
      items: { productId: string; quantity: number; unitPrice?: number }[];
      deliveryFee?: number;
      discount?: number;
      initialPayment?: number;
      paymentMethod?: PaymentMethod;
      notes?: string;
    },
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrder(
    orderId: string,
    updates: {
      status?: OrderStatus;
      items?: { productId: string; quantity: number; unitPrice?: number }[];
      deliveryFee?: number;
      discount?: number;
      notes?: string;
    },
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order');
    }
    return res.json();
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  async recordPayment(
    params: {
      restaurantId: string;
      orderId?: string;
      amount: number;
      paymentMethod: PaymentMethod;
      notes?: string;
    },
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Payment> {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record payment');
    }
    return res.json();
  },

  async createExpense(
    expense: any,
    source: 'manual' | 'ai_chat' | 'voice' | 'image_ocr' = 'manual',
    user?: { id: string; name: string; role: UserRole }
  ): Promise<Expense> {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expense, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record expense');
    }
    return res.json();
  },

  async allocateExpense(
    expenseId: string,
    method: ExpenseAllocationMethod,
    targetRestaurantIds?: string[],
    customBasisValues?: Record<string, number>
  ): Promise<Expense> {
    const res = await fetch(`/api/expenses/${expenseId}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, targetRestaurantIds, customBasisValues }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to allocate expense');
    }
    return res.json();
  },

  async sendAiChat(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    userContext?: { userRole?: UserRole; userName?: string; userId?: string; source?: 'ai_chat' | 'voice' }
  ): Promise<{ reply: string; executedTools: { name: string; args: any; result: any }[] }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    const vaultKey = (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key_vault') : null) || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (vaultKey && vaultKey.trim().length > 10) {
      headers['x-gemini-key'] = vaultKey.trim();
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          ...userContext,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'AI Chat request failed');
      }
      return res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Server response timed out. Please retry.');
      }
      throw err;
    }
  },

  async parseDocumentImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    hintType: string = 'general'
  ): Promise<ExtractedDocumentData> {
    const vaultKey = (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key_vault') : null) || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (vaultKey && vaultKey.trim().length > 10) {
      headers['x-gemini-key'] = vaultKey.trim();
    }

    const res = await fetch('/api/ai/parse-document', {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64, mimeType, hintType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Document OCR parsing failed');
    }
    return res.json();
  },

  async getGeminiApiKeyStatus(): Promise<{ hasKey: boolean; maskedKey: string; aiStudioUrl: string }> {
    const vaultKey = (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key_vault') || '').trim() : '');
    const headers: Record<string, string> = {};
    if (vaultKey && vaultKey.length > 10) {
      headers['x-gemini-key'] = vaultKey;
    }

    try {
      const res = await fetch('/api/settings/gemini-key', { headers });
      if (!res.ok) {
        if (vaultKey && vaultKey.length > 10) {
          return {
            hasKey: true,
            maskedKey: vaultKey.slice(0, 6) + '...' + vaultKey.slice(-4),
            aiStudioUrl: 'https://aistudio.google.com/app/apikey',
          };
        }
        return { hasKey: false, maskedKey: '', aiStudioUrl: 'https://aistudio.google.com/app/apikey' };
      }
      const data = await res.json();

      // Auto-Heal: If server doesn't have the key yet, but browser vault has it, restore it seamlessly!
      if (!data.hasKey && vaultKey && vaultKey.length > 10) {
        try {
          const syncRes = await this.saveGeminiApiKey(vaultKey);
          if (syncRes.success) {
            return {
              hasKey: true,
              maskedKey: syncRes.maskedKey || (vaultKey.slice(0, 6) + '...' + vaultKey.slice(-4)),
              aiStudioUrl: 'https://aistudio.google.com/app/apikey',
            };
          }
        } catch {}
      }

      return data;
    } catch {
      if (vaultKey && vaultKey.length > 10) {
        return {
          hasKey: true,
          maskedKey: vaultKey.slice(0, 6) + '...' + vaultKey.slice(-4),
          aiStudioUrl: 'https://aistudio.google.com/app/apikey',
        };
      }
      return { hasKey: false, maskedKey: '', aiStudioUrl: 'https://aistudio.google.com/app/apikey' };
    }
  },

  async saveGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string; maskedKey?: string }> {
    const cleanKey = apiKey.trim();
    if (typeof window !== 'undefined' && cleanKey.length > 5) {
      try {
        localStorage.setItem('gemini_api_key_vault', cleanKey);
        localStorage.setItem('gemini_api_key_configured', 'true');
      } catch {}
    }

    const res = await fetch('/api/settings/gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': cleanKey,
      },
      body: JSON.stringify({ apiKey: cleanKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save Gemini API Key');
    }
    return res.json();
  },

  async getDailyAiSummary(): Promise<{ summary: BusinessSummary; analysisText: string; generatedAt: string }> {
    const vaultKey = (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key_vault') : null) || '';
    const headers: Record<string, string> = {};
    if (vaultKey && vaultKey.trim().length > 10) {
      headers['x-gemini-key'] = vaultKey.trim();
    }

    const res = await fetch('/api/ai/daily-summary', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate AI executive summary');
    }
    return res.json();
  },

  async search(query: string): Promise<any> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  // =============================================================
  // COMPANY REGISTRATION & PROFILE (AI LEDGER SYSTEM)
  // =============================================================
  async getCompanyProfile(): Promise<{ success: boolean; company: CompanyProfile | null; isRegistered: boolean }> {
    const res = await fetch('/api/company');
    if (!res.ok) throw new Error('Failed to fetch company profile');
    const data = await res.json();
    setCurrency(data.company?.currency);
    return data;
  },

  async registerCompany(data: {
    name: string;
    ownerName: string;
    phone: string;
    city: string;
    address?: string;
    businessType?: string;
    ntn?: string;
    tagline?: string;
    notes?: string;
  }): Promise<{ success: boolean; company: CompanyProfile; message: string }> {
    const res = await fetch('/api/company/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register company');
    }
    const registered = await res.json();
    setCurrency(registered.company?.currency);
    return registered;
  },

  async updateCompanyProfile(updates: Partial<CompanyProfile>): Promise<{ success: boolean; company: CompanyProfile; message: string }> {
    const res = await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update company profile');
    }
    const data = await res.json();
    setCurrency(data.company?.currency);
    return data;
  },

  // =============================================================
  // EMPLOYEES MANAGEMENT
  // =============================================================
  async getEmployees(): Promise<Employee[]> {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },

  async searchEmployees(query: string): Promise<Employee[]> {
    const res = await fetch(`/api/employees/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search employees');
    return res.json();
  },

  async createEmployee(data: Partial<Employee>): Promise<{ success: boolean; employee: Employee; message: string }> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create employee');
    }
    return res.json();
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<{ success: boolean; employee: Employee; message: string }> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update employee');
    }
    return res.json();
  },

  async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete employee');
    }
    return res.json();
  },

  // =============================================================
  // SUPPLIERS MANAGEMENT
  // =============================================================
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch('/api/suppliers');
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  },

  async searchSuppliers(query: string, filters?: { city?: string; cnic?: string; mobile?: string; email?: string }): Promise<Supplier[]> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters?.city) params.set('city', filters.city);
    if (filters?.cnic) params.set('cnic', filters.cnic);
    if (filters?.mobile) params.set('mobile', filters.mobile);
    if (filters?.email) params.set('email', filters.email);
    const res = await fetch(`/api/suppliers/search?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to search suppliers');
    return res.json();
  },

  async createSupplier(data: Partial<Supplier>): Promise<{ success: boolean; supplier: Supplier; message: string }> {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create supplier');
    }
    return res.json();
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<{ success: boolean; supplier: Supplier; message: string }> {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update supplier');
    }
    return res.json();
  },

  async toggleSupplierStatus(id: string): Promise<{ success: boolean; supplier: Supplier; message: string }> {
    const res = await fetch(`/api/suppliers/${id}/status`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle supplier status');
    }
    return res.json();
  },

  async deleteSupplier(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete supplier');
    }
    return res.json();
  },

  // -----------------------------------------------------------
  // PURCHASING & PURCHASING DETAILS / BILLS
  // -----------------------------------------------------------
  async getPurchases(filters?: { supplierId?: string; fromDate?: string; toDate?: string; search?: string }): Promise<PurchaseBill[]> {
    const params = new URLSearchParams();
    if (filters?.supplierId) params.set('supplierId', filters.supplierId);
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetch(`/api/purchases?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch purchases');
    return res.json();
  },

  async getPurchaseById(id: string): Promise<PurchaseBill> {
    const res = await fetch(`/api/purchases/${id}`);
    if (!res.ok) throw new Error('Failed to fetch purchase bill');
    return res.json();
  },

  async createPurchase(bill: Partial<PurchaseBill>, source: string = 'manual', user?: { id: string; name: string; role: UserRole }): Promise<PurchaseBill> {
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill, source, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create purchase bill');
    }
    return res.json();
  },

  async deletePurchase(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/purchases/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete purchase bill');
    }
    return res.json();
  },

  async updatePurchase(id: string, bill: Partial<PurchaseBill>, user?: { id: string; name: string; role: UserRole }): Promise<PurchaseBill> {
    const res = await fetch(`/api/purchases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update purchase bill');
    }
    return res.json();
  },

  async addPurchaseBillToStock(id: string, user?: { id: string; name: string; role: UserRole }): Promise<PurchaseBill> {
    const res = await fetch(`/api/purchases/${id}/add-to-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add purchase bill to stock');
    }
    return res.json();
  },

  async getPurchaseReport(filters?: { supplierId?: string; fromDate?: string; toDate?: string; search?: string }): Promise<PurchaseReport> {
    const params = new URLSearchParams();
    if (filters?.supplierId) params.set('supplierId', filters.supplierId);
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetch(`/api/purchases-report?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch purchase report');
    return res.json();
  },

  // -----------------------------------------------------------
  // ITEM CATEGORIES, BRANDS & MEASURES
  // -----------------------------------------------------------
  async getItemCategories(): Promise<string[]> {
    const res = await fetch('/api/items/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async createItemCategory(category: string): Promise<string[]> {
    const res = await fetch('/api/items/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  async updateItemCategory(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch('/api/items/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async deleteItemCategory(category: string): Promise<string[]> {
    const res = await fetch(`/api/items/categories/${encodeURIComponent(category)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },

  async getItemBrands(): Promise<string[]> {
    const res = await fetch('/api/items/brands');
    if (!res.ok) throw new Error('Failed to fetch brands');
    return res.json();
  },

  async createItemBrand(brand: string): Promise<string[]> {
    const res = await fetch('/api/items/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand }),
    });
    if (!res.ok) throw new Error('Failed to create brand');
    return res.json();
  },

  async updateItemBrand(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch('/api/items/brands', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    });
    if (!res.ok) throw new Error('Failed to update brand');
    return res.json();
  },

  async deleteItemBrand(brand: string): Promise<string[]> {
    const res = await fetch(`/api/items/brands/${encodeURIComponent(brand)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete brand');
    return res.json();
  },

  async getItemMeasures(): Promise<string[]> {
    const res = await fetch('/api/items/measures');
    if (!res.ok) throw new Error('Failed to fetch measures');
    return res.json();
  },

  async createItemMeasure(measure: string): Promise<string[]> {
    const res = await fetch('/api/items/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ measure }),
    });
    if (!res.ok) throw new Error('Failed to create measure');
    return res.json();
  },

  async updateItemMeasure(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch('/api/items/measures', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    });
    if (!res.ok) throw new Error('Failed to update measure');
    return res.json();
  },

  async deleteItemMeasure(measure: string): Promise<string[]> {
    const res = await fetch(`/api/items/measures/${encodeURIComponent(measure)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete measure');
    return res.json();
  },

  // -----------------------------------------------------------
  // CUSTOMER MANAGEMENT API
  // -----------------------------------------------------------
  async getCustomers(filters?: {
    fromDate?: string;
    toDate?: string;
    code?: string;
    mcode?: string;
    title?: string;
    mobile?: string;
    cnic?: string;
    trn?: string;
    group?: string;
    city?: string;
    area?: string;
    sector?: string;
    status?: string;
    search?: string;
  }): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
    }
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async getCustomerById(id: string): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) throw new Error('Failed to fetch customer');
    return res.json();
  },

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create customer');
    }
    return res.json();
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update customer');
    }
    return res.json();
  },

  async toggleCustomerStatus(id: string): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}/status`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle customer status');
    }
    return res.json();
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete customer');
    }
    return res.json();
  },

  async getCustomerMeta(type: 'groups' | 'cities' | 'areas' | 'sectors' | 'zones' | 'countries'): Promise<string[]> {
    const res = await fetch(`/api/customers/meta/${type}`);
    if (!res.ok) throw new Error(`Failed to fetch customer ${type}`);
    return res.json();
  },

  async addCustomerMeta(type: string, value: string): Promise<string[]> {
    const res = await fetch('/api/customers/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value }),
    });
    if (!res.ok) throw new Error(`Failed to add customer meta ${type}`);
    return res.json();
  },

  // -----------------------------------------------------------
  // SALES & SALE BILLS API (REAL-TIME INVENTORY DEDUCTION)
  // -----------------------------------------------------------
  async getSalesmen(): Promise<string[]> {
    try {
      const res = await fetch('/api/salesmen');
      if (res.ok) return res.json();
    } catch {}
    return ['HAFIZ ABDUL QADEER', 'SULTAN MIR', 'Ashiq Ali', 'Akbar Bhai', 'Aman Deep'];
  },

  async getSales(filters?: {
    fromDate?: string;
    toDate?: string;
    mobileNo?: string;
    billNo?: string;
    customerId?: string;
    salesmanId?: string;
    orderBy?: string;
    search?: string;
  }): Promise<SaleBill[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
    }
    const res = await fetch(`/api/sales?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch sales bills');
    return res.json();
  },

  async getSaleById(id: string): Promise<SaleBill> {
    const res = await fetch(`/api/sales/${id}`);
    if (!res.ok) throw new Error('Failed to fetch sale bill');
    return res.json();
  },

  async createSale(bill: Partial<SaleBill>, user?: { id: string; name: string; role: UserRole }): Promise<SaleBill> {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create sale bill');
    }
    return res.json();
  },

  async deleteSale(id: string, user?: { id: string; name: string; role: UserRole }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/sales/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete sale bill');
    }
    return res.json();
  },

  async updateSale(id: string, bill: Partial<SaleBill>, user?: { id: string; name: string; role: UserRole }): Promise<SaleBill> {
    const res = await fetch(`/api/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update sale bill');
    }
    return res.json();
  },

  async getSalesReport(filters?: {
    fromDate?: string;
    toDate?: string;
    mobileNo?: string;
    billNo?: string;
    customerId?: string;
    salesmanId?: string;
    orderBy?: string;
    search?: string;
  }): Promise<SaleReport> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
    }
    const res = await fetch(`/api/sales-report?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch sales report');
    return res.json();
  },

  // -----------------------------------------------------------
  // PROFIT INTELLIGENCE REPORTS (Per Item, Bill, Restaurant, Salesman)
  // -----------------------------------------------------------
  async getComprehensiveProfitReport(filters?: {
    fromDate?: string;
    toDate?: string;
    search?: string;
    customerId?: string;
    salesmanId?: string;
  }): Promise<ComprehensiveProfitReport> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
    }
    const res = await fetch(`/api/reports/profit?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch comprehensive profit report');
    return res.json();
  },

  // -----------------------------------------------------------
  // STOCK MOVEMENT & AUDIT LEDGER (Day-wise / Week-wise)
  // -----------------------------------------------------------
  async getStockMovementLedger(filters?: {
    fromDate?: string;
    toDate?: string;
    productId?: string;
    category?: string;
    movementType?: string;
    timeframe?: 'day' | 'week' | 'month' | 'custom';
  }): Promise<StockMovementReport> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
    }
    const res = await fetch(`/api/inventory/movement-history?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch stock movement history');
    return res.json();
  },

  // -----------------------------------------------------------
  // AI LEDGER MASTER BUSINESS AUDIT REPORT + TIJORY CASH REGISTER
  // -----------------------------------------------------------
  async getAiLedgerAuditReport(date?: string): Promise<AiLedgerAuditReport> {
    const params = new URLSearchParams({ format: 'json' });
    if (date) params.set('date', date);
    const res = await fetch(`/api/reports/ledger-audit?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to build AI Ledger Master Audit Report');
    return data.data;
  },

  async getAiLedgerAuditReportHtml(date?: string): Promise<string> {
    const params = new URLSearchParams({ format: 'html' });
    if (date) params.set('date', date);
    const res = await fetch(`/api/reports/ledger-audit?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to render AI Ledger Master Audit Report');
    return res.text();
  },

  getCashRegister(): Promise<{ success: boolean; cashRegister: CashRegister }> {
    return fetch('/api/cash-register').then((res) => {
      if (!res.ok) throw new Error('Failed to fetch cash register');
      return res.json();
    });
  },

  updateCashRegister(
    updates: Partial<CashRegister>,
    user?: { id: string; name: string; role: UserRole }
  ): Promise<{ success: boolean; cashRegister: CashRegister; message: string }> {
    return fetch('/api/cash-register', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, source: 'cash_register_settings', userName: user?.name || 'Admin' }),
    }).then((res) => {
      if (!res.ok) throw new Error('Failed to update cash register');
      return res.json();
    });
  },

  async getDatabaseStatus(): Promise<{
    success: boolean;
    postgres: {
      connected: boolean;
      error?: string;
      host?: string;
      database?: string;
      tableCounts?: Record<string, number>;
      lastSyncedAt?: string;
      activePoolSize?: number;
    };
    lanIp: string;
    lanUrl: string;
    localUrl: string;
    databaseUrlConfigured: boolean;
  }> {
    const res = await fetch('/api/database/status');
    if (!res.ok) throw new Error('Failed to fetch database status');
    return res.json();
  },

  async configurePostgres(connectionUrl: string): Promise<{ success: boolean; message: string; status: any }> {
    const res = await fetch('/api/database/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to configure PostgreSQL');
    return data;
  },

  async syncToPostgres(): Promise<{ success: boolean; counts: Record<string, number>; message: string }> {
    const res = await fetch('/api/database/sync', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync to PostgreSQL');
    return data;
  },

  async pullFromPostgres(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/database/pull', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to pull from PostgreSQL');
    return data;
  },

  // -----------------------------------------------------------
  // CASH & BANK MANAGEMENT, VOUCHERS AND ACCOUNTS
  // -----------------------------------------------------------
  async getBanks(): Promise<BankAccount[]> {
    const res = await fetch('/api/banks');
    if (!res.ok) throw new Error('Failed to load banks');
    return res.json();
  },

  async getBankById(id: string): Promise<BankAccount> {
    const res = await fetch(`/api/banks/${id}`);
    if (!res.ok) throw new Error('Bank not found');
    return res.json();
  },

  async createBank(data: Partial<BankAccount>): Promise<BankAccount> {
    const res = await fetch('/api/banks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create bank');
    }
    return res.json();
  },

  async updateBank(id: string, updates: Partial<BankAccount>): Promise<BankAccount> {
    const res = await fetch(`/api/banks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update bank');
    }
    return res.json();
  },

  async deleteBank(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/banks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete bank');
    return res.json();
  },

  async getCashAccounts(): Promise<CashAccount[]> {
    const res = await fetch('/api/cash-accounts');
    if (!res.ok) throw new Error('Failed to load cash accounts');
    return res.json();
  },

  async updateCashAccount(id: string, updates: Partial<CashAccount>): Promise<CashAccount> {
    const res = await fetch(`/api/cash-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update cash account');
    }
    return res.json();
  },

  async getExpenseAccounts(): Promise<ExpenseAccount[]> {
    const res = await fetch('/api/expense-accounts');
    if (!res.ok) throw new Error('Failed to load expense accounts');
    return res.json();
  },

  async createExpenseAccount(data: { expenseType: string; name: string; code?: string }): Promise<ExpenseAccount> {
    const res = await fetch('/api/expense-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create expense account');
    }
    return res.json();
  },

  async deleteExpenseAccount(id: string): Promise<boolean> {
    const res = await fetch(`/api/expense-accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete expense account');
    return true;
  },

  async getGlAccounts(): Promise<GlAccountOption[]> {
    const res = await fetch('/api/accounts/gl');
    if (!res.ok) throw new Error('Failed to load GL accounts');
    return res.json();
  },

  async getNextVoucherNumbers(): Promise<NextVoucherNumbers> {
    const res = await fetch('/api/vouchers/next-numbers');
    if (!res.ok) throw new Error('Failed to fetch voucher sequence numbers');
    return res.json();
  },

  async getVouchers(params?: VoucherFilterParams): Promise<Voucher[]> {
    const query = new URLSearchParams();
    if (params?.voucherType) query.set('voucherType', params.voucherType);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.fromJv !== undefined && params?.fromJv !== '') query.set('fromJv', String(params.fromJv));
    if (params?.toJv !== undefined && params?.toJv !== '') query.set('toJv', String(params.toJv));
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/vouchers?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load vouchers');
    return res.json();
  },

  async getVoucherById(id: string): Promise<Voucher> {
    const res = await fetch(`/api/vouchers/${id}`);
    if (!res.ok) throw new Error('Voucher not found');
    return res.json();
  },

  async createVoucher(voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucher),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post voucher');
    }
    return res.json();
  },

  async updateVoucher(id: string, voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`/api/vouchers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucher),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update voucher');
    }
    return res.json();
  },

  async deleteVoucher(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete voucher');
    return res.json();
  },

  async getCashRecoveredReport(fromDate?: string, toDate?: string): Promise<{ items: CashRecoveredReportItem[]; totalAmount: number }> {
    const query = new URLSearchParams();
    if (fromDate) query.set('fromDate', fromDate);
    if (toDate) query.set('toDate', toDate);
    const res = await fetch(`/api/reports/cash-recovered?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load cash recovered report');
    return res.json();
  },

  async getCashPaidReport(fromDate?: string, toDate?: string): Promise<{
    items: CashPaidReportItem[];
    totalAmount: number;
    supplierAmount: number;
    expenseAmount: number;
  }> {
    const query = new URLSearchParams();
    if (fromDate) query.set('fromDate', fromDate);
    if (toDate) query.set('toDate', toDate);
    const res = await fetch(`/api/reports/cash-paid?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load cash paid report');
    return res.json();
  },

  // Customer Ledger Report
  async getCustomerLedgerReport(params: {
    customerId: string;
    fromDate?: string;
    toDate?: string;
    poNumber?: string;
  }): Promise<CustomerLedgerReport> {
    const query = new URLSearchParams();
    query.set('customerId', params.customerId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.poNumber) query.set('poNumber', params.poNumber);

    const res = await fetch(`/api/reports/customer-ledger?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate customer general ledger report');
    }
    return res.json();
  },

  // Sales Returns
  async getSaleReturns(): Promise<SaleReturn[]> {
    const res = await fetch('/api/sale-returns');
    if (!res.ok) throw new Error('Failed to load sales returns');
    return res.json();
  },

  async createSaleReturn(saleReturn: Partial<SaleReturn>): Promise<SaleReturn> {
    const res = await fetch('/api/sale-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleReturn),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record sales return');
    }
    return res.json();
  },

  async updateSaleReturn(id: string, updates: Partial<SaleReturn>): Promise<SaleReturn> {
    const res = await fetch(`/api/sale-returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update sales return');
    }
    return res.json();
  },

  async deleteSaleReturn(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/sale-returns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete sales return');
    return res.json();
  },

  // Purchase Returns
  async getPurchaseReturns(): Promise<PurchaseReturn[]> {
    const res = await fetch('/api/purchase-returns');
    if (!res.ok) throw new Error('Failed to load purchase returns');
    return res.json();
  },

  async createPurchaseReturn(purchaseReturn: Partial<PurchaseReturn>): Promise<PurchaseReturn> {
    const res = await fetch('/api/purchase-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseReturn),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record purchase return');
    }
    return res.json();
  },

  async updatePurchaseReturn(id: string, updates: Partial<PurchaseReturn>): Promise<PurchaseReturn> {
    const res = await fetch(`/api/purchase-returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update purchase return');
    }
    return res.json();
  },

  async deletePurchaseReturn(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/purchase-returns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete purchase return');
    return res.json();
  },
};

