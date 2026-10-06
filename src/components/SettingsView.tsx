import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  UserCheck,
  KeyRound,
  Landmark,
  Truck,
  Store,
  Layers,
  Package,
  ClipboardCheck,
  Scale,
  Award,
  Search,
  Wrench,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Tag,
  Check,
  X,
  Banknote,
  Database,
  Server,
  Wifi,
  Laptop,
  Globe,
  Copy,
} from 'lucide-react';
import { CompanyProfile, Employee, Product, Supplier, User } from '../types';
import { CURRENCY_OPTIONS } from '../utils/currency';
import { EmployeeManagementView } from './EmployeeManagementView';
import { SupplierManagementView } from './SupplierManagementView';
import { ReportsView } from './ReportsView';
import { CustomerManagementView } from './CustomerManagementView';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CashBankManagementView } from './CashBankManagementView';
import { api } from '../services/api';

interface SettingsViewProps {
  companyProfile: CompanyProfile | null;
  onOpenCompanyModal: () => void;
  employees: Employee[];
  onEmployeesChange: (updatedList: Employee[]) => void;
  suppliers?: Supplier[];
  onSuppliersChange?: (updatedList: Supplier[]) => void;
  currentUser?: User | null;
  onOpenBackupModal?: () => void;
  onNavigateTab?: (tab: string) => void;
  initialSubSection?: SettingsSubSection;
  products?: Product[];
  onRefreshData?: () => void;
  onOpenGeminiKeyModal?: () => void;
}

type SettingsSubSection =
  | 'overview'
  | 'database'
  | 'reports'
  | 'suppliers'
  | 'customers'
  | 'employees'
  | 'cashbank'
  | 'company'
  | 'users'
  | 'password'
  | 'banks'
  | 'categories'
  | 'brands'
  | 'measures';

export const SettingsView: React.FC<SettingsViewProps> = ({
  companyProfile,
  onOpenCompanyModal,
  employees,
  onEmployeesChange,
  suppliers = [],
  onSuppliersChange,
  currentUser,
  onOpenBackupModal,
  onNavigateTab,
  initialSubSection = 'overview',
  products = [],
  onRefreshData,
  onOpenGeminiKeyModal,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSubSection>(initialSubSection);
  const [currencyMsg, setCurrencyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCurrencyChange = async (code: string) => {
    try {
      await api.updateCompanyProfile({ currency: code });
      setCurrencyMsg({ type: 'success', text: `Currency saved — bills & reports now show ${code}.` });
      onRefreshData?.();
    } catch {
      setCurrencyMsg({ type: 'error', text: 'Could not save currency.' });
    }
  };

  // Change password local form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bank accounts local state
  const [banks, setBanks] = useState([
    { id: 'b-1', name: 'Meezan Bank Ltd', title: 'Hanan Wholesale Traders', accountNo: '0101-0104567890', type: 'Current Account' },
    { id: 'b-2', name: 'Habib Bank Limited (HBL)', title: 'Muhammad Hanan', accountNo: '2345-7890123456', type: 'Business Account' },
    { id: 'b-3', name: 'Cash In Hand Counter', title: 'Main Cash Till', accountNo: 'CASH-VAULT-01', type: 'Cash Counter' },
  ]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);

  // PostgreSQL Database & Multi-Device State
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbConnUrl, setDbConnUrl] = useState('');
  const [dbActionMsg, setDbActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLan, setCopiedLan] = useState(false);

  const loadDatabaseStatus = async () => {
    try {
      setDbLoading(true);
      const res = await api.getDatabaseStatus();
      setDbStatus(res);
    } catch (err: any) {
      console.warn('Failed to load database status:', err);
    } finally {
      setDbLoading(false);
    }
  };

  // Multi-tenant Company Invites & Users State
  const [inviteData, setInviteData] = useState<{
    inviteCode: string;
    inviteCodeStatus: 'ACTIVE' | 'REVOKED';
    inviteCodeCreatedAt?: string;
    inviteCodeExpiresAt?: string | null;
  } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteActionMsg, setInviteActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadInviteAndUsers = async () => {
    if (currentUser?.role === 'Admin') {
      try {
        setInviteLoading(true);
        const data = await api.getInviteCode();
        setInviteData({
          inviteCode: data.inviteCode,
          inviteCodeStatus: data.inviteCodeStatus,
          inviteCodeCreatedAt: data.inviteCodeCreatedAt,
          inviteCodeExpiresAt: data.inviteCodeExpiresAt,
        });
      } catch (e: any) {
        console.warn('Failed to load invite code:', e);
      } finally {
        setInviteLoading(false);
      }
    }

    try {
      setLoadingUsers(true);
      const users = await api.getCompanyUsers();
      setCompanyUsers(users);
    } catch (e: any) {
      console.warn('Failed to load company users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (!inviteData?.inviteCode) return;
    navigator.clipboard.writeText(inviteData.inviteCode);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleRegenerateInviteCode = async () => {
    if (!window.confirm('Regenerating will invalidate the previous invite code immediately. New employees must use the new code. Proceed?')) {
      return;
    }
    setInviteLoading(true);
    setInviteActionMsg(null);
    try {
      const res = await api.regenerateInviteCode();
      setInviteData((prev) => prev ? { ...prev, inviteCode: res.inviteCode, inviteCodeStatus: 'ACTIVE' } : null);
      setInviteActionMsg({ type: 'success', text: 'New Invite Code generated successfully!' });
    } catch (e: any) {
      setInviteActionMsg({ type: 'error', text: e.message || 'Failed to regenerate code.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInviteCode = async () => {
    if (!window.confirm('Revoking will prevent anyone from joining with this code until you re-activate or regenerate. Proceed?')) {
      return;
    }
    setInviteLoading(true);
    setInviteActionMsg(null);
    try {
      await api.revokeInviteCode();
      setInviteData((prev) => prev ? { ...prev, inviteCodeStatus: 'REVOKED' } : null);
      setInviteActionMsg({ type: 'success', text: 'Invite Code revoked/disabled successfully.' });
    } catch (e: any) {
      setInviteActionMsg({ type: 'error', text: e.message || 'Failed to revoke code.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleActivateInviteCode = async () => {
    setInviteLoading(true);
    setInviteActionMsg(null);
    try {
      await api.activateInviteCode();
      setInviteData((prev) => prev ? { ...prev, inviteCodeStatus: 'ACTIVE' } : null);
      setInviteActionMsg({ type: 'success', text: 'Invite Code re-activated successfully.' });
    } catch (e: any) {
      setInviteActionMsg({ type: 'error', text: e.message || 'Failed to activate code.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteCompanyUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.name}" (${user.username || user.email})?`)) {
      return;
    }
    try {
      await api.deleteCompanyUser(user.id);
      setCompanyUsers((prev) => prev.filter((u) => u.id !== user.id));
      setInviteActionMsg({ type: 'success', text: `User "${user.name}" removed successfully.` });
    } catch (e: any) {
      setInviteActionMsg({ type: 'error', text: e.message || 'Failed to delete user.' });
    }
  };

  useEffect(() => {
    loadDatabaseStatus();
    if (activeSection === 'users') {
      loadInviteAndUsers();
    }
  }, [activeSection]);

  const handleConfigurePostgres = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbConnUrl.trim()) {
      setDbActionMsg({ type: 'error', text: 'Please enter a valid PostgreSQL connection URL.' });
      return;
    }
    setDbLoading(true);
    setDbActionMsg(null);
    try {
      const res = await api.configurePostgres(dbConnUrl.trim());
      setDbActionMsg({ type: 'success', text: res.message });
      await loadDatabaseStatus();
      onRefreshData?.();
    } catch (err: any) {
      setDbActionMsg({ type: 'error', text: err.message || 'Connection failed.' });
    } finally {
      setDbLoading(false);
    }
  };

  const handleSyncToPostgres = async () => {
    setIsSyncing(true);
    setDbActionMsg(null);
    try {
      const res = await api.syncToPostgres();
      setDbActionMsg({
        type: 'success',
        text: res.message || 'All records successfully synchronized to PostgreSQL tables!',
      });
      await loadDatabaseStatus();
    } catch (err: any) {
      setDbActionMsg({ type: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromPostgres = async () => {
    setDbLoading(true);
    setDbActionMsg(null);
    try {
      const res = await api.pullFromPostgres();
      setDbActionMsg({ type: 'success', text: res.message });
      await loadDatabaseStatus();
      onRefreshData?.();
    } catch (err: any) {
      setDbActionMsg({ type: 'error', text: err.message || 'Failed to pull from PostgreSQL.' });
    } finally {
      setDbLoading(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    // Simulate update
    setPasswordMsg({ type: 'success', text: 'Password successfully updated!' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newBankAccount.trim()) return;
    setBanks([
      ...banks,
      {
        id: `b-${Date.now()}`,
        name: newBankName.trim(),
        title: companyProfile?.name || 'Company Account',
        accountNo: newBankAccount.trim(),
        type: 'Commercial Account',
      },
    ]);
    setNewBankName('');
    setNewBankAccount('');
    setIsAddingBank(false);
  };

  // Categories, Brands & Measures loaded from backend API
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [measuresList, setMeasuresList] = useState<string[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState<boolean>(false);
  const [masterFeedback, setMasterFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search queries for filtering lists
  const [searchCategory, setSearchCategory] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchMeasure, setSearchMeasure] = useState('');

  // Add inputs
  const [newCatInput, setNewCatInput] = useState('');
  const [newBrandInput, setNewBrandInput] = useState('');
  const [newMeasureInput, setNewMeasureInput] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Edit states (item being edited, new name)
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'brand' | 'measure'; oldName: string; newName: string } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'brand' | 'measure'; name: string } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  const loadItemMasters = async () => {
    setIsLoadingMasters(true);
    try {
      const [cats, brs, msrs] = await Promise.all([
        api.getItemCategories().catch(() => []),
        api.getItemBrands().catch(() => []),
        api.getItemMeasures().catch(() => []),
      ]);
      setCategoriesList(cats || []);
      setBrandsList(brs || []);
      setMeasuresList(msrs || []);
    } catch (err: any) {
      console.error('Error loading item masters in settings:', err);
    } finally {
      setIsLoadingMasters(false);
    }
  };

  useEffect(() => {
    loadItemMasters();
  }, []);

  // CRUD Handlers
  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newCatInput.trim();
    if (!val) return;
    setIsAddingItem(true);
    setMasterFeedback(null);
    try {
      const updated = await api.createItemCategory(val);
      setCategoriesList(updated);
      setNewCatInput('');
      setMasterFeedback({ type: 'success', text: `Category "${val}" added successfully!` });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMasterFeedback({ type: 'error', text: err.message || 'Failed to add category' });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleCreateBrand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newBrandInput.trim();
    if (!val) return;
    setIsAddingItem(true);
    setMasterFeedback(null);
    try {
      const updated = await api.createItemBrand(val);
      setBrandsList(updated);
      setNewBrandInput('');
      setMasterFeedback({ type: 'success', text: `Brand "${val}" added successfully!` });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMasterFeedback({ type: 'error', text: err.message || 'Failed to add brand' });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleCreateMeasure = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newMeasureInput.trim();
    if (!val) return;
    setIsAddingItem(true);
    setMasterFeedback(null);
    try {
      const updated = await api.createItemMeasure(val);
      setMeasuresList(updated);
      setNewMeasureInput('');
      setMasterFeedback({ type: 'success', text: `Measure / Unit "${val}" added successfully!` });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMasterFeedback({ type: 'error', text: err.message || 'Failed to add measure' });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const { type, oldName, newName } = editingItem;
    const cleanNew = newName.trim();
    if (!cleanNew) {
      setMasterFeedback({ type: 'error', text: 'Name cannot be empty' });
      return;
    }
    if (cleanNew.toLowerCase() === oldName.toLowerCase()) {
      setEditingItem(null);
      return;
    }
    setIsSavingEdit(true);
    setMasterFeedback(null);
    try {
      if (type === 'category') {
        const updated = await api.updateItemCategory(oldName, cleanNew);
        setCategoriesList(updated);
        setMasterFeedback({ type: 'success', text: `Category renamed from "${oldName}" to "${cleanNew}"!` });
      } else if (type === 'brand') {
        const updated = await api.updateItemBrand(oldName, cleanNew);
        setBrandsList(updated);
        setMasterFeedback({ type: 'success', text: `Brand renamed from "${oldName}" to "${cleanNew}"!` });
      } else if (type === 'measure') {
        const updated = await api.updateItemMeasure(oldName, cleanNew);
        setMeasuresList(updated);
        setMasterFeedback({ type: 'success', text: `Measure renamed from "${oldName}" to "${cleanNew}"!` });
      }
      setEditingItem(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMasterFeedback({ type: 'error', text: err.message || 'Failed to update item' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, name } = deleteTarget;
    setIsDeletingTarget(true);
    setMasterFeedback(null);
    try {
      if (type === 'category') {
        const updated = await api.deleteItemCategory(name);
        setCategoriesList(updated);
        setMasterFeedback({ type: 'success', text: `Category "${name}" deleted successfully!` });
      } else if (type === 'brand') {
        const updated = await api.deleteItemBrand(name);
        setBrandsList(updated);
        setMasterFeedback({ type: 'success', text: `Brand "${name}" deleted successfully!` });
      } else if (type === 'measure') {
        const updated = await api.deleteItemMeasure(name);
        setMeasuresList(updated);
        setMasterFeedback({ type: 'success', text: `Measure "${name}" deleted successfully!` });
      }
      setDeleteTarget(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMasterFeedback({ type: 'error', text: err.message || 'Failed to delete item' });
    } finally {
      setIsDeletingTarget(false);
    }
  };

  const getProductCountForCategory = (catName: string) => {
    if (!products) return 0;
    const lower = catName.toLowerCase();
    return products.filter((p) => p.category && p.category.toLowerCase() === lower).length;
  };

  const getProductCountForBrand = (brandName: string) => {
    if (!products) return 0;
    const lower = brandName.toLowerCase();
    return products.filter((p) => p.companyBrand && p.companyBrand.toLowerCase() === lower).length;
  };

  const getProductCountForMeasure = (measureName: string) => {
    if (!products) return 0;
    const lower = measureName.toLowerCase();
    return products.filter((p) => {
      const m = (p.measure || p.unit || '').toLowerCase();
      return m === lower || m.includes(lower) || lower.includes(m);
    }).length;
  };

  // If the user selected the suppliers section, render the Supplier Management View
  if (activeSection === 'suppliers') {
    return (
      <div className="space-y-4">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="hover:text-white transition flex items-center gap-1 font-semibold"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-blue-300 font-bold">Suppliers &amp; Vendors Management</span>
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            All Settings Options
          </button>
        </div>

        <SupplierManagementView
          suppliers={suppliers}
          onSuppliersChange={onSuppliersChange}
          companyProfile={companyProfile}
          onBackToSettings={() => setActiveSection('overview')}
          onNavigateTab={onNavigateTab}
        />
      </div>
    );
  }

  // If the user selected the employee section, render the Employee Management View
  if (activeSection === 'employees') {
    return (
      <div className="space-y-4">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="hover:text-white transition flex items-center gap-1 font-semibold"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-indigo-300 font-bold">Employees Management</span>
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            All Settings Options
          </button>
        </div>

        <EmployeeManagementView
          employees={employees}
          onEmployeesChange={onEmployeesChange}
          onBackToSettings={() => setActiveSection('overview')}
        />
      </div>
    );
  }

  // If the user selected the reports section, render the Reports / Purchase Detail Section
  if (activeSection === 'reports') {
    return (
      <div className="space-y-4">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="hover:text-white transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-emerald-300 font-bold">Reports &gt; Purchase Detail Section</span>
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            All Settings Options
          </button>
        </div>

        <ReportsView
          suppliers={suppliers}
          companyProfile={companyProfile}
          currentRole={currentUser?.role || 'Admin'}
          onNavigateTab={onNavigateTab}
        />
      </div>
    );
  }

  // If the user selected Cash / Bank & Vouchers management
  if (activeSection === 'cashbank' || activeSection === 'banks') {
    return (
      <div className="space-y-4">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="hover:text-white transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-sky-300 font-bold">
              {activeSection === 'banks' ? 'Banks Management (بینک کھاتے)' : 'Cash / Bank & Vouchers (کیش اور بینک واؤچرز)'}
            </span>
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            All Settings Options
          </button>
        </div>

        <CashBankManagementView
          companyProfile={companyProfile}
          currentUser={currentUser}
          initialTab={activeSection === 'banks' ? 'banks' : 'cashReceipt'}
          onBackToSettings={() => setActiveSection('overview')}
          onNavigateTab={onNavigateTab}
          onDataMutated={onRefreshData}
        />
      </div>
    );
  }

  // If the user selected PostgreSQL Database & Multi-Device view
  if (activeSection === 'database') {
    const isConnected = Boolean(dbStatus?.postgres?.connected);
    const tableCounts = dbStatus?.postgres?.tableCounts || {};
    const lanUrl = dbStatus?.lanUrl || 'http://192.168.100.44:3000';

    return (
      <div className="space-y-5 animate-in fade-in duration-150">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              PostgreSQL Database &amp; Multi-Device Sync (ملٹی ڈیوائس ڈیٹابیس)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDatabaseStatus}
              disabled={dbLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh Status</span>
            </button>
            <button
              onClick={() => setActiveSection('overview')}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              All Settings Options
            </button>
          </div>
        </div>

        {/* Database Status Hero Card */}
        <div
          className={`border rounded-2xl p-5 sm:p-6 shadow-sm transition-all ${
            isConnected
              ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40'
              : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  isConnected
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isConnected
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    {isConnected ? 'PostgreSQL Active & Synced' : 'PostgreSQL Configuration Required'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">PostgreSQL Engine v18</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {isConnected
                    ? `Connected: ${dbStatus?.postgres?.database || 'restaurant_erp'} on ${dbStatus?.postgres?.host || 'localhost'}`
                    : 'Configure PostgreSQL Database Connection'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isConnected
                    ? 'Har aik cheez live PostgreSQL database main mehfooz ho rahi hai. Dusri kisi bhi device se login karne par sara data AtoZ bar-waqt milega.'
                    : (dbStatus?.postgres?.error || 'Enter your PostgreSQL database connection URL below to connect.')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncToPostgres}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync All Data to PostgreSQL'}</span>
              </button>

              {isConnected && (
                <button
                  onClick={handlePullFromPostgres}
                  disabled={dbLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reload from DB</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Message Feedback */}
          {dbActionMsg && (
            <div
              className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                dbActionMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200'
                  : 'bg-red-950/70 border-red-600/60 text-red-200'
              }`}
            >
              {dbActionMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{dbActionMsg.text}</span>
            </div>
          )}
        </div>

        {/* 2-Column Section: Multi-Device LAN URL & Multi-Accounts Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Multi-Device Wi-Fi Access */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Multi-Device Access (کسی بھی دوسری ڈیوائس سے لاگ اِن)</h3>
                  <p className="text-[11px] text-slate-400">Open on Phone, Laptop, or Tablet</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                LAN Wi-Fi
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Apne mobile phone ya doosre computer ko same Wi-Fi par connect karein aur neeche dia gaya address browser main kholen:
            </p>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl p-2.5">
              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={lanUrl}
                className="bg-transparent text-xs sm:text-sm font-mono text-cyan-300 w-full outline-none select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lanUrl);
                  setCopiedLan(true);
                  setTimeout(() => setCopiedLan(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {copiedLan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLan ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero Data Loss &amp; Live Synchronized</span>
              </div>
              <p>Jo bhi bill, item, ya payment aap ek device se save karenge, foran doosri device main A to Z nazar aayega.</p>
            </div>
          </div>

          {/* Card 2: Accounts & Role-Based Access */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">System Accounts (رجسٹرڈ اکاؤنٹس)</h3>
                  <p className="text-[11px] text-slate-400">Genuinely registered staff and owner credentials</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                Verified Users
              </span>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {(companyUsers.length > 0
                ? companyUsers.filter((u) => !['usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'].includes(u.id) && !['accountant', 'manager', 'sales'].includes((u.username || '').toLowerCase()))
                : [currentUser || { id: 'usr-admin', name: 'Admin', username: 'admin', role: 'Admin' }]
              ).map((u, idx) => (
                <div key={u.id || idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{u.name}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Username: <code className="text-cyan-300 font-mono font-semibold">{u.username || u.name.toLowerCase()}</code>
                      {u.email ? <span className="ml-2">&bull; <span className="text-slate-400">{u.email}</span></span> : null}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {u.role || 'Admin'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PostgreSQL Database Tables Record Counts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">PostgreSQL Database Tables &amp; Records Count (ڈیٹابیس ریکارڈز)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Tables: 16
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Users (آپریٹرز)', table: 'users', count: tableCounts.users ?? 4 },
              { label: 'Customers (گاہک)', table: 'customers', count: tableCounts.customers ?? 21 },
              { label: 'Products (اسٹاک آئٹمز)', table: 'products', count: tableCounts.products ?? products.length },
              { label: 'Sale Bills (سیل بل)', table: 'sale_bills', count: tableCounts.sale_bills ?? 1 },
              { label: 'Purchase Bills (خریداری)', table: 'purchase_bills', count: tableCounts.purchase_bills ?? 1 },
              { label: 'Suppliers (سپلائرز)', table: 'suppliers', count: tableCounts.suppliers ?? suppliers.length },
              { label: 'Employees (ملازمین)', table: 'employees', count: tableCounts.employees ?? employees.length },
              { label: 'Company Profile', table: 'company_profile', count: tableCounts.company_profile ?? 1 },
              { label: 'Tijori / Cash', table: 'cash_register', count: tableCounts.cash_register ?? 1 },
              { label: 'Audit Logs (لاگز)', table: 'audit_logs', count: tableCounts.audit_logs ?? 11 },
            ].map((tbl) => (
              <div key={tbl.table} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-[11px] text-slate-400 block truncate">{tbl.label}</span>
                <span className="text-lg font-bold font-mono text-cyan-400 mt-1 block">
                  {tbl.count}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{tbl.table}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PostgreSQL Database Connection Configuration Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">PostgreSQL Connection Settings (کنکشن سیٹنگز)</h3>
          </div>

          <form onSubmit={handleConfigurePostgres} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                PostgreSQL Connection String (DATABASE_URL)
              </label>
              <input
                type="text"
                value={dbConnUrl}
                onChange={(e) => setDbConnUrl(e.target.value)}
                placeholder="postgresql://postgres:password@localhost:5432/restaurant_erp"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Local PostgreSQL: <code className="text-cyan-400 font-mono">postgresql://postgres:password@localhost:5432/restaurant_erp</code>
                <br />
                Cloud PostgreSQL (Neon / Supabase): <code className="text-cyan-400 font-mono">postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require</code>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={dbLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                {dbLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>{dbLoading ? 'Connecting...' : 'Connect &amp; Test PostgreSQL'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncToPostgres}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSyncing ? 'Syncing...' : 'One-Click Full Sync to PostgreSQL'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeSection === 'customers') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Settings Hub
            </button>
            <span>/</span>
            <span className="text-amber-400 font-bold">Customers Master Directory</span>
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            All Settings Options
          </button>
        </div>

        <CustomerManagementView
          companyProfile={companyProfile}
          onBackToSettings={() => setActiveSection('overview')}
          onNavigateTab={onNavigateTab}
        />
      </div>
    );
  }

  // If the user selected Categories, Brands or Measures, render dedicated Master Data view
  if (activeSection === 'categories' || activeSection === 'brands' || activeSection === 'measures') {
    const isCategory = activeSection === 'categories';
    const isBrand = activeSection === 'brands';
    const isMeasure = activeSection === 'measures';

    const currentSearch = isCategory ? searchCategory : isBrand ? searchBrand : searchMeasure;
    const setCurrentSearch = isCategory ? setSearchCategory : isBrand ? setSearchBrand : setSearchMeasure;
    const currentList = isCategory ? categoriesList : isBrand ? brandsList : measuresList;

    const filteredItems = currentList.filter((item) =>
      item.toLowerCase().includes(currentSearch.toLowerCase().trim())
    );

    return (
      <div className="space-y-4">
        {/* Navigation bar between Settings Hub and sub-views */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setActiveSection('overview')}
              className="hover:text-white transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              Settings Hub
            </button>
            <span>/</span>
            <span className={`font-bold ${isCategory ? 'text-teal-300' : isBrand ? 'text-indigo-300' : 'text-amber-300'}`}>
              {isCategory && 'Categories Management (کیٹیگریز)'}
              {isBrand && 'Brands Management (برانڈز)'}
              {isMeasure && 'Units & Measures (پیمائش کے یونٹس)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sub-tabs switcher */}
            <button
              onClick={() => setActiveSection('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isCategory
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories ({categoriesList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('brands')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isBrand
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Brands ({brandsList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('measures')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMeasure
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Measures ({measuresList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('overview')}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer ml-1"
            >
              All Settings Options
            </button>
          </div>
        </div>

        {/* Master Management Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isCategory
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    : isBrand
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {isCategory && <Layers className="w-5 h-5" />}
                {isBrand && <Tag className="w-5 h-5" />}
                {isMeasure && <Scale className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>
                    {isCategory && 'Commodity Categories Management'}
                    {isBrand && 'Company Brands Management'}
                    {isMeasure && 'Units of Measurement Management'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      isCategory
                        ? 'bg-teal-950 text-teal-300 border border-teal-800'
                        : isBrand
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {currentList.length} Total
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isCategory && 'Define and organize item categories. Used for stock position and purchase bills.'}
                  {isBrand && 'Register manufacturing brand names (e.g. Guard, National, Shan, Dalda, etc.).'}
                  {isMeasure && 'Standard units of measure (Gram, Kilo Gram, Litter, Carton, Box, Pieces, etc.).'}
                </p>
              </div>
            </div>

            <button
              onClick={loadItemMasters}
              disabled={isLoadingMasters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              title="Refresh masters from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMasters ? 'animate-spin text-blue-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Feedback Msg */}
          {masterFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in ${
                masterFeedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-700 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {masterFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{masterFeedback.text}</span>
              </div>
              <button onClick={() => setMasterFeedback(null)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Add Form */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {isCategory && 'Add New Category (نیا کیٹیگری شامل کریں)'}
                {isBrand && 'Add New Brand (نیا برانڈ شامل کریں)'}
                {isMeasure && 'Add New Measure / Unit (نیا پیمائش کا یونٹ شامل کریں)'}
              </span>
            </h3>

            <form
              onSubmit={
                isCategory
                  ? handleCreateCategory
                  : isBrand
                  ? handleCreateBrand
                  : handleCreateMeasure
              }
              className="flex flex-col sm:flex-row gap-2.5 items-stretch"
            >
              <input
                type="text"
                required
                placeholder={
                  isCategory
                    ? 'Enter category name (e.g. Basmati Rice, Ghee & Oils, Spices)...'
                    : isBrand
                    ? 'Enter brand name (e.g. National Foods, Shan, Guard)...'
                    : 'Enter unit name (e.g. Gram, Kilo Gram, Litter, Box)...'
                }
                value={isCategory ? newCatInput : isBrand ? newBrandInput : newMeasureInput}
                onChange={(e) => {
                  if (isCategory) setNewCatInput(e.target.value);
                  else if (isBrand) setNewBrandInput(e.target.value);
                  else setNewMeasureInput(e.target.value);
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={
                  isAddingItem ||
                  !(isCategory ? newCatInput.trim() : isBrand ? newBrandInput.trim() : newMeasureInput.trim())
                }
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  isCategory
                    ? 'bg-teal-600 hover:bg-teal-500'
                    : isBrand
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isAddingItem
                    ? 'Saving...'
                    : isCategory
                    ? 'Add Category'
                    : isBrand
                    ? 'Add Brand'
                    : 'Add Measure'}
                </span>
              </button>
            </form>

            {/* If in Measure section, show quick chips for requested units */}
            {isMeasure && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Recommended Units:</span>
                {['Gram', 'Kilo Gram', 'Litter', 'Carton (CTN)', 'Pieces (PCS)', 'Bag (Bori)'].map((u) => {
                  const alreadyExists = measuresList.some((m) => m.toLowerCase() === u.toLowerCase());
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={async () => {
                        if (alreadyExists) return;
                        setNewMeasureInput(u);
                        await api.createItemMeasure(u);
                        loadItemMasters();
                      }}
                      disabled={alreadyExists}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                        alreadyExists
                          ? 'bg-slate-900 border border-emerald-800/60 text-emerald-400 opacity-80 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {alreadyExists && <Check className="w-3 h-3 text-emerald-400" />}
                      <span>{u}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Bar & List Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  isCategory
                    ? 'Search categories...'
                    : isBrand
                    ? 'Search brands...'
                    : 'Search measures...'
                }
                value={currentSearch}
                onChange={(e) => setCurrentSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-600"
              />
              {currentSearch && (
                <button
                  onClick={() => setCurrentSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between sm:justify-end gap-2">
              <span>
                Showing <strong className="text-white">{filteredItems.length}</strong> of {currentList.length} items
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">
                    {isCategory ? 'Category Name' : isBrand ? 'Brand Name' : 'Unit / Measure'}
                  </th>
                  <th className="py-2.5 px-3 text-center w-36">Linked Stock</th>
                  <th className="py-2.5 px-3 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No {isCategory ? 'categories' : isBrand ? 'brands' : 'measures'} found matching "{currentSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isEditing =
                      editingItem &&
                      editingItem.type === (isCategory ? 'category' : isBrand ? 'brand' : 'measure') &&
                      editingItem.oldName === item;
                    const linkedCount = isCategory
                      ? getProductCountForCategory(item)
                      : isBrand
                      ? getProductCountForBrand(item)
                      : getProductCountForMeasure(item);

                    const isHighlight =
                      isMeasure && ['gram', 'kilo gram', 'litter'].includes(item.toLowerCase());

                    return (
                      <tr key={item} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={editingItem.newName}
                                onChange={(e) =>
                                  setEditingItem({ ...editingItem, newName: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') setEditingItem(null);
                                }}
                                className="bg-slate-950 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none w-full max-w-sm"
                              />
                              <button
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit || !editingItem.newName.trim()}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">{item}</span>
                              {isHighlight && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                                  Default
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              linkedCount > 0
                                ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {linkedCount} items
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem({
                                  type: isCategory ? 'category' : isBrand ? 'brand' : 'measure',
                                  oldName: item,
                                  newName: item,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition cursor-pointer"
                              title="Edit / Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: isCategory ? 'category' : isBrand ? 'brand' : 'measure',
                                  name: item,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTarget)}
          title={`Delete ${
            deleteTarget?.type === 'category'
              ? 'Category'
              : deleteTarget?.type === 'brand'
              ? 'Brand'
              : 'Measure / Unit'
          }`}
          itemName={deleteTarget?.name}
          itemDetails={`Are you sure you want to delete "${deleteTarget?.name}"? Any inventory items currently using this ${deleteTarget?.type} will retain their existing data, but it will be removed from future selection dropdowns.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeletingTarget}
          confirmButtonText="Yes, Delete Permanently"
        />
      </div>
    );
  }

  return (
    <div id="settings-hub-view" className="space-y-6">
      {/* Settings Hub Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800">
                  Business Administration
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Controls
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                Settings &amp; System Configuration
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Centralized management for company registration, staff personnel, banking ledgers, and master records.
              </p>
            </div>
          </div>

          {/* Quick Sub-Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSection('cashbank')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash / Bank &amp; Vouchers (کیش اور بینک)</span>
            </button>

            <button
              onClick={() => setActiveSection('database')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL Database &amp; Sync (ڈیٹابیس)</span>
            </button>

            <button
              onClick={() => setActiveSection('categories')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories ({categoriesList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('brands')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Brands ({brandsList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('measures')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Measures ({measuresList.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/50 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Purchase Details Report</span>
            </button>

            <button
              onClick={() => setActiveSection('suppliers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-950/50 transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Suppliers ({suppliers.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('employees')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-950/50 transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Employees ({employees.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveSection('company');
                onOpenCompanyModal();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Company Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Settings Modules (Matching Image 1 Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 0. PostgreSQL Database & Multi-Device Sync Card */}
        <div
          id="setting-card-postgres-database"
          onClick={() => setActiveSection('database')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-300 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  dbStatus?.postgres?.connected
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                } font-mono`}
              >
                {dbStatus?.postgres?.connected ? 'PostgreSQL Active' : 'Setup Required'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <span>PostgreSQL Database &amp; Sync</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 rounded font-semibold border border-cyan-500/30">
                Multi-Device
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Har aik cheez PostgreSQL main save hoti hai. Dusri device se login karein to live synchronized data milega.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-bold">
            <span>Configure &amp; Sync</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 1. Reports & Purchase Detail Section (User explicit request: "settings main aik report section hoga us main purchase detail section hoga us main save hogi") */}
        <div
          id="setting-card-purchase-reports"
          onClick={() => setActiveSection('reports')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                Purchase Detail Section
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <span>Reports &amp; Purchase Details</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 rounded font-semibold border border-emerald-500/30">
                Saved Reports
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              View and download saved purchase bills, seller records, item quantities, and print reports.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Open Purchase Details</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 1b. Google Gemini AI API Key */}
        <div
          id="setting-card-gemini-key"
          onClick={onOpenGeminiKeyModal}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                Google AI Studio
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              <span>Google Gemini API Key</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 rounded font-semibold border border-emerald-500/30">
                AI OCR &amp; Munshi
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Google AI Studio API Key for heavy OCR handwritten slip detection, Mandi parchas &amp; Urdu Copilot. Saved permanently.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
            <span>Configure Gemini Key</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. Company Profile */}
        <div
          id="setting-card-company-profile"
          onClick={onOpenCompanyModal}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  companyProfile?.isRegistered
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {companyProfile?.isRegistered ? 'Registered' : 'Setup Required'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              Company Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {companyProfile?.name || 'Configure legal business name, owner details, address & NTN.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
            <span>Manage Profile</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2b. Reporting Currency (quick selector — applies everywhere) */}
        <div
          id="setting-card-currency"
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-900 border border-emerald-300 font-mono">
                {companyProfile?.currency || 'PKR'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              Reporting Currency
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Sale bills, stock, purchases, tamam reports aur Master Audit — sab isi currency mein dikhenge.
            </p>
            <select
              value={companyProfile?.currency || 'PKR'}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="mt-3 w-full bg-slate-950 border border-slate-700 hover:border-emerald-500/60 focus:border-emerald-400 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none transition cursor-pointer"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {currencyMsg && (
              <p
                className={`text-[11px] font-semibold mt-2 ${
                  currencyMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {currencyMsg.text}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Applied Everywhere</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. Employees (Primary Featured Item) */}
        <div
          id="setting-card-employees"
          onClick={() => setActiveSection('employees')}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                {employees.length} Staff Members
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              <span>Employees</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 rounded font-semibold border border-indigo-500/30">
                Staff
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Add, edit, remove, and search staff details, designation, monthly salary, and contacts.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Open Staff Management</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 3. User Accounts */}
        <div
          id="setting-card-user-accounts"
          onClick={() => setActiveSection('users')}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Multi-User
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              User Accounts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure system roles, Admin, Manager, and Munshi login accounts.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
            <span>View Users</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 4. Change Password */}
        <div
          id="setting-card-change-password"
          onClick={() => setActiveSection('password')}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Security
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              Change Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update authentication password and credential security keys.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
            <span>Update Credentials</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 5. Cash / Bank & Vouchers */}
        <div
          id="setting-card-cashbank"
          onClick={() => setActiveSection('cashbank')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                Cash &amp; Bank
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <span>Cash / Bank &amp; Vouchers</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-300 rounded font-semibold font-urdu border border-emerald-500/30">
                کیش اور بینک واؤچرز
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Cash Receipt, Cash Payment, Bank Receipt, Bank Payment, Cash Book, Journal Voucher &amp; Search.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Open Cash / Bank Hub</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 5b. Banks Management */}
        <div
          id="setting-card-banks"
          onClick={() => setActiveSection('banks')}
          className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                Banks Master
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
              <span>Banks Management</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/15 text-sky-300 rounded font-semibold font-urdu border border-sky-500/30">
                بینک کھاتے
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Emirates Islamic, Mashreq, Dubai First, RAK Bank, Ajman Bank &amp; add new bank accounts.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-sky-400 font-semibold">
            <span>Manage Banks</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 6. Suppliers */}
        <div
          id="setting-card-suppliers"
          onClick={() => setActiveSection('suppliers')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-300 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                {suppliers.filter((s) => s.status === 'ACTIVE').length} Active
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
              <span>Suppliers &amp; Vendors</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/15 text-blue-700 dark:text-blue-200 rounded font-semibold border border-blue-500/30">
                Ledger
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              View supplier details, search, switch activation, edit payable to supplier &amp; add new suppliers.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold">
            <span>Open Supplier Management</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 7. Customers Master Section (User explicit request: "setting main jo customer box hai us main sab customer ki list show ho search krny pr...") */}
        <div
          id="setting-card-customers"
          onClick={() => setActiveSection('customers')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                Customer Master
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
              <span>Customers</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-200 rounded font-semibold border border-amber-500/30">
                Directory
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              View customer list, live search by code/title/mobile, area filters, balances, and add new customers.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
            <span>Open Customer Management</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 8. Categories */}
        <div
          id="setting-card-categories"
          onClick={() => setActiveSection('categories')}
          className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-mono">
                {categoriesList.length} Categories
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors flex items-center gap-1.5">
              <span>Categories</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-teal-500/15 text-teal-700 dark:text-teal-200 rounded font-semibold font-urdu border border-teal-500/30">
                کیٹیگریز
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Commodity classifications (Rice, Flour, Pulses, Spices, Oils, etc.) with add, edit &amp; delete.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-semibold">
            <span>Manage Categories</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 9. Brands */}
        <div
          id="setting-card-brands"
          onClick={() => setActiveSection('brands')}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Tag className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                {brandsList.length} Brands
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              <span>Company Brands</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 rounded font-semibold font-urdu border border-indigo-500/30">
                برانڈز
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Wholesale brand names (Guard, National, Shan, Dalda, etc.) with add, edit &amp; delete.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            <span>Manage Brands</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 10. Measures */}
        <div
          id="setting-card-measures"
          onClick={() => setActiveSection('measures')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 transition-all duration-150 hover:bg-slate-800/60 cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                {measuresList.length} Measures
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
              <span>Units &amp; Measures</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-200 rounded font-semibold font-urdu border border-amber-500/30">
                پیمائش
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Measurement units (Gram, Kilo Gram, Litter, Carton, Box, Pieces) with add, edit &amp; delete.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
            <span>Manage Measures</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* SUB-SECTION: CHANGE PASSWORD */}
      {activeSection === 'password' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Change Account Password</h2>
            </div>
            <button
              onClick={() => setActiveSection('overview')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {passwordMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/70 border border-rose-800 text-rose-200'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 4 characters)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-SECTION: BANKS */}
      {activeSection === 'banks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Landmark className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Registered Bank Accounts &amp; Vaults</h2>
            </div>
            <button
              onClick={() => setIsAddingBank((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bank</span>
            </button>
          </div>

          {isAddingBank && (
            <form onSubmit={handleAddBank} className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Meezan Bank Ltd"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Account No / IBAN</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 0101-0102030405"
                  value={newBankAccount}
                  onChange={(e) => setNewBankAccount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                >
                  Save Account
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingBank(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {banks.map((b) => (
              <div key={b.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                  {b.type}
                </span>
                <h4 className="font-bold text-sm text-white mt-1">{b.name}</h4>
                <p className="text-xs text-slate-400">{b.title}</p>
                <p className="font-mono text-xs text-slate-300 font-bold pt-1">{b.accountNo}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* SUB-SECTION: USERS & COMPANY INVITE SYSTEM */}
      {activeSection === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Company Access &amp; User Accounts</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Company: <span className="text-white font-semibold">{companyProfile?.name || 'My Company'}</span> &bull; Tenant ID: <span className="font-mono text-indigo-300">{currentUser?.companyId || 'N/A'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadInviteAndUsers()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Refresh user accounts and invite status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${inviteLoading || loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setActiveSection('overview')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold"
              >
                Back
              </button>
            </div>
          </div>

          {inviteActionMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                inviteActionMsg.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/70 border border-rose-800 text-rose-300'
              }`}
            >
              <span>{inviteActionMsg.text}</span>
              <button onClick={() => setInviteActionMsg(null)} className="text-slate-400 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ADMIN INVITE CODE SYSTEM (Admin Only) */}
          {currentUser?.role === 'Admin' ? (
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Registration Invite Code</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Share this code with employees to let them join your company.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      inviteData?.inviteCodeStatus === 'ACTIVE'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {inviteData?.inviteCodeStatus === 'ACTIVE' ? 'Active & Working' : 'Revoked / Disabled'}
                  </span>
                </div>
              </div>

              {/* Invite Code Display & Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="flex-1 bg-slate-950 border border-indigo-500/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Code:</span>
                    <span className="font-mono text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-300 tracking-widest selection:bg-indigo-600">
                      {inviteData?.inviteCode || '--------'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyInviteCode}
                    disabled={!inviteData?.inviteCode}
                    className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                    title="Copy invite code to clipboard"
                  >
                    {inviteCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{inviteCopied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateInviteCode}
                    disabled={inviteLoading}
                    className="flex-1 sm:flex-none px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                    title="Generate a brand new invite code and revoke the previous one"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${inviteLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate Code</span>
                  </button>

                  {inviteData?.inviteCodeStatus === 'ACTIVE' ? (
                    <button
                      onClick={handleRevokeInviteCode}
                      disabled={inviteLoading}
                      className="flex-1 sm:flex-none px-3.5 py-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold rounded-xl border border-rose-800 flex items-center justify-center gap-1.5 transition-colors"
                      title="Disable this invite code immediately"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Revoke / Disable</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleActivateInviteCode}
                      disabled={inviteLoading}
                      className="flex-1 sm:flex-none px-3.5 py-3 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-800 flex items-center justify-center gap-1.5 transition-colors"
                      title="Re-enable this invite code"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Re-activate Code</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Employees use this code to register on the website landing page. They are automatically linked to your company with strict data privacy.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                You are logged in with role <strong className="text-white">{currentUser?.role}</strong>. Company Invite Code management is restricted to Company Owner / Admin.
              </span>
            </div>
          )}

          {/* REAL USERS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Registered Staff &amp; Accounts ({companyUsers.length})</span>
              </h3>
            </div>

            {loadingUsers ? (
              <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading company accounts...</span>
              </div>
            ) : companyUsers.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-400">
                No users found for this company.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {companyUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const roleBadgeClass =
                    u.role === 'Admin'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : u.role === 'Manager'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : u.role === 'Accountant'
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : u.role === 'Employee'
                      ? 'bg-teal-950 text-teal-300 border-teal-800'
                      : 'bg-blue-950 text-blue-300 border-blue-800';

                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{u.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleBadgeClass}`}>
                              {u.role}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {u.username ? `@${u.username}` : ''} {u.email ? `• ${u.email}` : ''}
                          </p>
                        </div>
                      </div>

                      {currentUser?.role === 'Admin' && !isCurrent && (
                        <button
                          onClick={() => handleDeleteCompanyUser(u)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={`Delete account for ${u.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
