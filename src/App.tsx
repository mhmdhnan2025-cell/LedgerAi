import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api, authStorage } from './services/api';
import { AuthEntryView } from './components/AuthEntryView';
import {
  AuditLog,
  BusinessSummary,
  CompanyProfile,
  Employee,
  Expense,
  ExpenseAllocationMethod,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
  Restaurant,
  SmartAlert,
  Supplier,
  User,
  UserRole,
} from './types';
import { OfflineStorageService } from './services/offlineStorage';
import { Navbar, AppTheme } from './components/Navbar';
import { SmartAlertsBanner } from './components/SmartAlertsBanner';
import { RestaurantsView } from './components/RestaurantsView';
import { InventoryView } from './components/InventoryView';
import { ExpensesView } from './components/ExpensesView';
import { AuditLogsView } from './components/AuditLogsView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { DocumentOcrModal } from './components/DocumentOcrModal';
import { InvoiceModal } from './components/InvoiceModal';
import { AiMunshiHub } from './components/AiMunshiHub';
import { AuthModal } from './components/AuthModal';
import { CompanyRegistrationModal } from './components/CompanyRegistrationModal';
import { SettingsView } from './components/SettingsView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { SupplierManagementView } from './components/SupplierManagementView';
import { PurchasingView } from './components/PurchasingView';
import { ReportsView } from './components/ReportsView';
import { SalesView } from './components/SalesView';
import { CustomerManagementView } from './components/CustomerManagementView';
import { GeminiApiKeyModal } from './components/GeminiApiKeyModal';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'aimunshi' | 'sales' | 'purchasing' | 'reports' | 'inventory' | 'restaurants' | 'customers' | 'expenses' | 'suppliers' | 'settings' | 'employees'
  >('aimunshi');
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin');
  const [authUser, setAuthUser] = useState<User | null>(() => OfflineStorageService.loadActiveUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Theme selection state (Creamish White is default as requested)
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('erp_theme') as AppTheme;
      if (saved && ['cream', 'pearl', 'sand', 'dark'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error(e);
    }
    return 'cream';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem('erp_theme', currentTheme);
    } catch (e) {
      console.error(e);
    }
  }, [currentTheme]);

  // Business Company Profile (AI Ledger System)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Employees List (Staff & Payroll within Settings)
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Suppliers List (Vendors & Payables within Settings)
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Business Data State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [summary, setSummary] = useState<BusinessSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI & Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isGeminiKeyModalOpen, setIsGeminiKeyModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [preselectedRestaurantId, setPreselectedRestaurantId] = useState<string | undefined>();
  const [preselectedExpenseId, setPreselectedExpenseId] = useState<string | undefined>();
  const [initialAiQuery, setInitialAiQuery] = useState<string | undefined>();

  // Fetch all core business data for the authenticated tenant
  const loadBusinessData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.fetchAll();
      setRestaurants(data.restaurants || []);
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setPayments(data.payments || []);
      setExpenses(data.expenses || []);
      setAuditLogs(data.auditLogs || []);
      setAlerts(data.alerts || []);
      setSummary(data.summary || null);
      if (data.companyProfile) {
        setCompanyProfile(data.companyProfile);
      }
      let empList = data.employees || [];
      if (!empList || empList.length === 0) {
        try {
          const directEmps = await api.getEmployees();
          if (Array.isArray(directEmps) && directEmps.length > 0) {
            empList = directEmps;
          }
        } catch (e) {
          console.warn('Fallback getEmployees error:', e);
        }
      }
      setEmployees(empList);
      setSuppliers(data.suppliers || []);
      if (data.users && data.users.length > 0) {
        setUsersList(data.users);
      }
      setIsOffline(Boolean(data.isOffline));
      setError(null);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      setError(err.message || 'Unable to connect to backend service.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setAuthUser(null);
    setCompanyProfile(null);
    setRestaurants([]);
    setProducts([]);
    setOrders([]);
    setPayments([]);
    setExpenses([]);
    setAuditLogs([]);
    setAlerts([]);
    setSummary(null);
    setEmployees([]);
    setSuppliers([]);
    setUsersList([]);
  };

  const handleAuthSuccess = async (user: User, company: any, token: string) => {
    setAuthUser(user);
    setCurrentRole(user.role);
    if (company) {
      setCompanyProfile(company);
    }
    await loadBusinessData();
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setAuthUser(null);
        setIsCheckingAuth(false);
        setIsLoading(false);
        return;
      }

      try {
        const session = await api.getCurrentUser();
        if (session && session.user) {
          setAuthUser(session.user);
          setCurrentRole(session.user.role);
          if (session.company) {
            setCompanyProfile(session.company);
          }
          await loadBusinessData(true);
        } else {
          handleLogout();
        }
      } catch (err) {
        console.warn('Session verification failed, resetting session:', err);
        handleLogout();
      } finally {
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (authUser?.role) {
      setCurrentRole(authUser.role);
    }
  }, [authUser]);

  const currentUser = authUser || {
    id: 'user-1',
    name: `Staff (${currentRole})`,
    role: currentRole,
  };

  // Handler to create order
  const handleCreateOrder = async (params: {
    restaurantId: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
    deliveryFee?: number;
    discount?: number;
    initialPayment?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }) => {
    await api.createOrder(params, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to update order
  const handleUpdateOrder = async (orderId: string, updates: any) => {
    await api.updateOrder(orderId, updates, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to update order status
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await api.updateOrderStatus(orderId, status, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to create restaurant
  const handleCreateRestaurant = async (data: {
    name: string;
    contactPerson: string;
    phone: string;
    address: string;
    creditLimit: number;
  }) => {
    await api.createRestaurant(data, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to update restaurant
  const handleUpdateRestaurant = async (id: string, updates: Partial<Restaurant>) => {
    await api.updateRestaurant(id, updates, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to record payment
  const handleRecordPayment = async (params: {
    restaurantId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    orderId?: string;
    notes?: string;
  }) => {
    await api.recordPayment(params, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to create product
  const handleCreateProduct = async (productData: any) => {
    await api.createProduct(productData, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to update product
  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    await api.updateProduct(id, updates, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to create expense
  const handleCreateExpense = async (expenseData: any) => {
    await api.createExpense(expenseData, 'manual', currentUser);
    await loadBusinessData(true);
  };

  // Handler to allocate expense
  const handleAllocateExpense = async (
    expenseId: string,
    method: ExpenseAllocationMethod,
    targetRestaurantIds?: string[]
  ) => {
    await api.allocateExpense(expenseId, method, targetRestaurantIds);
    await loadBusinessData(true);
  };

  // Handle alert navigation click
  const handleAlertAction = (alert: SmartAlert) => {
    if (alert.type === 'low_inventory' || alert.type === 'critical_stock') {
      setCurrentTab('inventory');
    } else if (alert.type === 'credit_limit_exceeded') {
      if (alert.entityId) {
        setPreselectedRestaurantId(alert.entityId);
      }
      setCurrentTab('restaurants');
    } else if (alert.type === 'unusual_expense') {
      if (alert.entityId) {
        setPreselectedExpenseId(alert.entityId);
      }
      setCurrentTab('expenses');
    } else if (alert.type === 'unpaid_invoice') {
      setCurrentTab('orders');
    }
  };

  const handleResetData = async () => {
    setIsLoading(true);
    try {
      await api.clearAllData();
      await loadBusinessData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to clear data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    try {
      await api.deleteRestaurant(id);
      await loadBusinessData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete restaurant');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      await loadBusinessData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await api.deleteOrder(id);
      await loadBusinessData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete order');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      await loadBusinessData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  const handleSearchSelect = (type: string, id: string) => {
    if (type === 'restaurant') {
      setPreselectedRestaurantId(id);
      setCurrentTab('restaurants');
    } else if (type === 'product') {
      setCurrentTab('inventory');
    } else if (type === 'order') {
      const ord = orders.find((o) => o.id === id);
      if (ord) setActiveInvoiceOrder(ord);
      setCurrentTab('orders');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen auth-page-root flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
          Restaurant Supply ERP & Profit Intelligence
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
          <span>Verifying company session & multi-tenant credentials...</span>
        </p>
      </div>
    );
  }

  // Unauthenticated visitors must see the website entry view (Login, Create Company, Join Company)
  if (!authUser) {
    return (
      <AuthEntryView
        onAuthenticated={handleAuthSuccess}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="min-h-screen auth-page-root flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
          <Bot className="w-6 h-6" />
        </div>
        <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
          Restaurant Supply ERP & Profit Intelligence
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
          <span>Synchronizing live warehouse inventory, orders, and ledger...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setPreselectedRestaurantId(undefined);
          setPreselectedExpenseId(undefined);
        }}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        currentUser={currentUser}
        companyProfile={companyProfile}
        onOpenCompanyProfile={() => setIsCompanyModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isOffline={isOffline}
        summary={summary}
        alerts={alerts}
        onResetData={handleResetData}
        onSearchSelect={handleSearchSelect}
        onOpenAi={() => {
          setInitialAiQuery(undefined);
          setIsAiModalOpen(true);
        }}
        onOpenOcr={() => setIsOcrModalOpen(true)}
        onOpenGeminiKey={() => setIsGeminiKeyModalOpen(true)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step 1 Company Registration Prominent Notice */}
        {!companyProfile?.isRegistered && (
          <div
            id="banner-register-company-step1"
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-indigo-950/90 border-2 border-amber-500/60 text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-amber-950/30"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-mono">
                    Step 1 Required
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    Business Onboarding &bull; AI Ledger System
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Register Your Company Profile
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Establish your official business entity (Company Name, Owner/Proprietor, Contact Number, City, and NTN) to generate branded tax invoices, manage staff personnel, and maintain accurate ledger accounts.
                </p>
              </div>
            </div>
            <button
              id="btn-banner-register-company"
              onClick={() => setIsCompanyModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <span>🏢 Register Company Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real-time Business Alerts Bar */}
        <SmartAlertsBanner
          alerts={alerts}
          onActionClick={handleAlertAction}
          onDismissAlert={(id) => setAlerts(alerts.filter((a) => a.id !== id))}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadBusinessData()}
              className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Current Active View */}
        {currentTab === 'aimunshi' && (
          <AiMunshiHub
            currentRole={currentRole}
            companyProfile={companyProfile}
            onRefreshData={() => loadBusinessData(true)}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
            summary={summary}
          />
        )}

        {currentTab === 'sales' && (
          <SalesView
            products={products}
            currentRole={currentRole}
            companyProfile={companyProfile}
            currentUser={currentUser}
            onRefreshData={() => loadBusinessData(true)}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {currentTab === 'purchasing' && (
          <PurchasingView
            products={products}
            suppliers={suppliers}
            companyProfile={companyProfile}
            currentRole={currentRole}
            currentUser={currentUser}
            onRefreshData={() => loadBusinessData(true)}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            suppliers={suppliers}
            products={products}
            companyProfile={companyProfile}
            currentRole={currentRole}
            onRefreshData={() => loadBusinessData(true)}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {currentTab === 'restaurants' && (
          <RestaurantsView
            restaurants={restaurants}
            orders={orders}
            payments={payments}
            currentRole={currentRole}
            onCreateRestaurant={handleCreateRestaurant}
            onUpdateRestaurant={handleUpdateRestaurant}
            onRecordPayment={handleRecordPayment}
            onDeleteRestaurant={handleDeleteRestaurant}
            onOpenOrderForRestaurant={(restaurantId) => {
              setPreselectedRestaurantId(restaurantId);
              setCurrentTab('orders');
            }}
            selectedRestaurantId={preselectedRestaurantId}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            orders={orders}
            currentRole={currentRole}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            restaurants={restaurants}
            currentRole={currentRole}
            onCreateExpense={handleCreateExpense}
            onAllocateExpense={handleAllocateExpense}
            onDeleteExpense={handleDeleteExpense}
            preselectedExpenseId={preselectedExpenseId}
          />
        )}

        {currentTab === 'audit' && <AuditLogsView logs={auditLogs} />}

        {currentTab === 'settings' && (
          <SettingsView
            companyProfile={companyProfile}
            onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
            employees={employees}
            onEmployeesChange={(updated) => setEmployees(updated)}
            suppliers={suppliers}
            onSuppliersChange={(updated) => setSuppliers(updated)}
            currentUser={authUser}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
            products={products}
            onRefreshData={() => loadBusinessData(true)}
            onOpenGeminiKeyModal={() => setIsGeminiKeyModalOpen(true)}
          />
        )}

        {currentTab === 'suppliers' && (
          <SupplierManagementView
            suppliers={suppliers}
            onSuppliersChange={(updated) => setSuppliers(updated)}
            companyProfile={companyProfile}
            onBackToSettings={() => setCurrentTab('settings')}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeeManagementView
            employees={employees}
            onEmployeesChange={(updated) => setEmployees(updated)}
            onBackToSettings={() => setCurrentTab('settings')}
          />
        )}

        {currentTab === 'customers' && (
          <CustomerManagementView
            companyProfile={companyProfile}
            onBackToSettings={() => setCurrentTab('settings')}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}
      </main>

      {/* Persistent Floating AI Action Button - Compact & Non-Intrusive */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex items-center gap-1.5 print:hidden">
        <button
          onClick={() => {
            setInitialAiQuery(undefined);
            setIsAiModalOpen(true);
          }}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white rounded-full font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all text-[11px] cursor-pointer"
          title="Open AI Copilot & Voice Assistant"
        >
          <div className="relative">
            <Bot className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span>AI Copilot</span>
        </button>

        <button
          onClick={() => setIsOcrModalOpen(true)}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-full font-bold shadow-md border border-slate-700/80 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Upload receipt / photo"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AI ASSISTANT MODAL (TEXT & VOICE) */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentRole={currentRole}
        companyProfile={companyProfile}
        onDataMutated={() => loadBusinessData(true)}
        initialQuery={initialAiQuery}
      />

      {/* DOCUMENT OCR MODAL */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        restaurants={restaurants}
        products={products}
        suppliers={suppliers}
        currentRole={currentRole}
        currentUser={authUser || undefined}
        onDataMutated={() => loadBusinessData(true)}
        onCreateOrder={handleCreateOrder}
        onCreateExpense={handleCreateExpense}
        onCreateProduct={handleCreateProduct}
        onOpenGeminiKeyModal={() => setIsGeminiKeyModalOpen(true)}
      />

      {/* GEMINI API KEY MODAL */}
      <GeminiApiKeyModal
        isOpen={isGeminiKeyModalOpen}
        onClose={() => setIsGeminiKeyModalOpen(false)}
        onKeyUpdated={() => loadBusinessData(true)}
      />

      {/* WHOLESALE SUPPLY INVOICE & DELIVERY CHALLAN MODAL */}
      <InvoiceModal
        order={activeInvoiceOrder}
        restaurant={restaurants.find((r) => r.id === activeInvoiceOrder?.restaurantId)}
        onClose={() => setActiveInvoiceOrder(null)}
      />

      {/* MULTI-DEVICE AUTH & USER LOGIN MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(user) => {
          setAuthUser(user);
          OfflineStorageService.saveActiveUser(user);
          loadBusinessData(true);
        }}
        usersList={usersList}
      />

      {/* COMPANY REGISTRATION & PROFILE MODAL (AI LEDGER SYSTEM) */}
      <CompanyRegistrationModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        initialCompany={companyProfile}
        isDismissible={true}
        onRegistered={(updatedComp) => {
          setCompanyProfile(updatedComp);
          setIsCompanyModalOpen(false);
          loadBusinessData(true);
        }}
      />

      {/* DATABASE BACKUP & RESTORE MODAL */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={authUser}
        onDataRestored={() => loadBusinessData(true)}
        snapshot={null}
      />
    </div>
  );
}
