import { currencySymbol } from '../utils/currency';
import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  List,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  Save,
  RotateCcw,
  Printer,
  FileText,
  Upload,
  CreditCard,
  Hash,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Check,
  FilePlus,
  RefreshCw,
} from 'lucide-react';
import { Supplier, CompanyProfile } from '../types';
import { api } from '../services/api';

interface SupplierManagementViewProps {
  suppliers?: Supplier[];
  onSuppliersChange?: (updatedList: Supplier[]) => void;
  onBackToSettings?: () => void;
  companyProfile?: CompanyProfile | null;
  onNavigateTab?: (tab: string) => void;
}

type ViewMode = 'list' | 'details' | 'search';

const DEFAULT_GROUPS = [
  'General Trading',
  'Foodstuff Trading',
  'Flour & Grains',
  'Rice Wholesale',
  'Spices & Grains',
  'Packaging & Cartons',
  'Supermarket Wholesale',
  'Cooking Oils & Ghee',
  'Local Procurement',
  'Pulses & Lentils',
];

const DEFAULT_CITIES = [
  'Sharjah',
  'Dubai',
  'Abu Dhabi',
  'Ajman',
  'Ras Al Khaimah',
  'Umm Al Quwain',
  'Fujairah',
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
];

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({
  suppliers: propSuppliers = [],
  onSuppliersChange,
  onBackToSettings,
  companyProfile,
  onNavigateTab,
}) => {
  // Master list of suppliers
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(propSuppliers);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Fast list search filter
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Reports / Search view state
  const [reportFilterName, setReportFilterName] = useState('');
  const [reportFilterCnic, setReportFilterCnic] = useState('');
  const [reportFilterMobile, setReportFilterMobile] = useState('');
  const [reportFilterCity, setReportFilterCity] = useState('');
  const [reportFilterEmail, setReportFilterEmail] = useState('');
  const [reportExecuted, setReportExecuted] = useState(false);

  // Group & City master additions
  const [availableGroups, setAvailableGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>(DEFAULT_CITIES);
  const [newCityInput, setNewCityInput] = useState('');

  // Form state for Supplier Details / Edit / New
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [supplierGroup, setSupplierGroup] = useState('Foodstuff Trading');
  const [accountTitle, setAccountTitle] = useState('');
  const [mobile, setMobile] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [ntnNumber, setNtnNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankTitle, setBankTitle] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [prefixTitle, setPrefixTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telephones, setTelephones] = useState('');
  const [city, setCity] = useState('Sharjah');
  const [address, setAddress] = useState('');
  const [cnic, setCnic] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [payableToSupplier, setPayableToSupplier] = useState<number | ''>(0);
  const [payableType, setPayableType] = useState<'CR' | 'DR'>('CR');
  const [documents, setDocuments] = useState<{ id: string; name: string; date: string; size?: string }[]>([]);
  const [selectedFileName, setSelectedFileName] = useState('');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Dedicated fetch function to load suppliers from server
  const fetchSuppliers = React.useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const data = await api.getSuppliers();
      if (Array.isArray(data) && data.length > 0) {
        setSuppliersList(data);
        if (onSuppliersChange) onSuppliersChange(data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [onSuppliersChange]);

  // Load suppliers if empty or sync prop changes
  React.useEffect(() => {
    if (propSuppliers && propSuppliers.length > 0) {
      setSuppliersList(propSuppliers);
    } else {
      fetchSuppliers();
    }
  }, [propSuppliers, fetchSuppliers]);

  // Calculate next sequential ERP code e.g. 0401010349
  const generateNextCode = () => {
    const existingCodes = suppliersList
      .map((s) => parseInt(s.code, 10))
      .filter((n) => !isNaN(n) && n > 401010000);
    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 401010348;
    return `0${maxCode + 1}`;
  };

  // Reset form to blank / new supplier
  const resetFormForNew = () => {
    setEditingSupplierId(null);
    setCode(generateNextCode());
    setSupplierGroup('Foodstuff Trading');
    setAccountTitle('');
    setMobile('');
    setVatNumber('');
    setNtnNumber('');
    setBankName('');
    setBankTitle('');
    setBankAccountNo('');
    setPrefixTitle('Mr');
    setFirstName('');
    setLastName('');
    setEmail('');
    setTelephones('');
    setCity('Sharjah');
    setAddress('');
    setCnic('');
    setIsActive(true);
    setPayableToSupplier(0);
    setPayableType('CR');
    setDocuments([]);
    setSelectedFileName('');
    setFeedback(null);
    setViewMode('details');
  };

  // Populate form for editing existing supplier
  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setCode(sup.code || '');
    setSupplierGroup(sup.supplierGroup || 'General Trading');
    setAccountTitle(sup.accountTitle || sup.title || sup.name || '');
    setMobile(sup.mobile || sup.phone || '');
    setVatNumber(sup.vatNumber || '');
    setNtnNumber(sup.ntnNumber || '');
    setBankName(sup.bankName || '');
    setBankTitle(sup.bankTitle || '');
    setBankAccountNo(sup.bankAccountNo || '');
    setPrefixTitle(sup.prefixTitle || 'Mr');
    setFirstName(sup.firstName || '');
    setLastName(sup.lastName || '');
    setEmail(sup.email || '');
    setTelephones(sup.telephones || '');
    setCity(sup.city || 'Sharjah');
    setAddress(sup.address || '');
    setCnic(sup.cnic || '');
    setIsActive(sup.status === 'ACTIVE');
    setPayableToSupplier(sup.payableToSupplier !== undefined ? sup.payableToSupplier : (sup.balanceOwed || 0));
    setPayableType(sup.payableType || 'CR');
    setDocuments(sup.documents || []);
    setSelectedFileName('');
    setFeedback(null);
    setViewMode('details');
  };

  // Toggle supplier active / inactive (Switch / Unswitch)
  const handleToggleStatus = async (sup: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updatedSup = await api.toggleSupplierStatus(sup.id);
      const updatedList = suppliersList.map((s) => (s.id === sup.id ? updatedSup.supplier : s));
      setSuppliersList(updatedList);
      if (onSuppliersChange) onSuppliersChange(updatedList);

      if (editingSupplierId === sup.id) {
        setIsActive(updatedSup.supplier.status === 'ACTIVE');
      }

      setFeedback({
        type: 'success',
        message: `Supplier "${sup.title}" status changed to ${updatedSup.supplier.status}.`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      // Local fallback
      const newStatus: 'ACTIVE' | 'INACTIVE' = sup.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updatedList = suppliersList.map((s) => (s.id === sup.id ? { ...s, status: newStatus } : s));
      setSuppliersList(updatedList);
      if (onSuppliersChange) onSuppliersChange(updatedList);
      if (editingSupplierId === sup.id) {
        setIsActive(newStatus === 'ACTIVE');
      }
      setFeedback({
        type: 'success',
        message: `Supplier status updated to ${newStatus}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Save or update supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTitle.trim()) {
      setFeedback({ type: 'error', message: 'Account Title is required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const contactName = `${firstName} ${lastName}`.trim() || accountTitle.trim();
    const payload: Partial<Supplier> = {
      code: code.trim() || generateNextCode(),
      title: accountTitle.trim(),
      accountTitle: accountTitle.trim(),
      name: accountTitle.trim(),
      supplierGroup,
      mobile: mobile.trim(),
      phone: mobile.trim(),
      vatNumber: vatNumber.trim(),
      ntnNumber: ntnNumber.trim(),
      bankName: bankName.trim(),
      bankTitle: bankTitle.trim(),
      bankAccountNo: bankAccountNo.trim(),
      prefixTitle,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      contactPerson: contactName,
      email: email.trim(),
      telephones: telephones.trim(),
      city: city.trim(),
      address: address.trim(),
      cnic: cnic.trim(),
      status: isActive ? 'ACTIVE' : 'INACTIVE',
      payableToSupplier: Number(payableToSupplier) || 0,
      balanceOwed: Number(payableToSupplier) || 0,
      payableType,
      documents,
    };

    try {
      if (editingSupplierId) {
        const res = await api.updateSupplier(editingSupplierId, payload);
        const updatedList = suppliersList.map((s) => (s.id === editingSupplierId ? res.supplier : s));
        setSuppliersList(updatedList);
        if (onSuppliersChange) onSuppliersChange(updatedList);
        setFeedback({
          type: 'success',
          message: `Supplier "${res.supplier.title}" details and payable balance updated successfully!`,
        });
      } else {
        const res = await api.createSupplier(payload);
        const updatedList = [res.supplier, ...suppliersList];
        setSuppliersList(updatedList);
        if (onSuppliersChange) onSuppliersChange(updatedList);
        setEditingSupplierId(res.supplier.id);
        setFeedback({
          type: 'success',
          message: `New supplier "${res.supplier.title}" registered successfully with Code ${res.supplier.code}!`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save supplier details.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete supplier
  const handleDeleteSupplier = async (id: string) => {
    try {
      await api.deleteSupplier(id);
      const updatedList = suppliersList.filter((s) => s.id !== id);
      setSuppliersList(updatedList);
      if (onSuppliersChange) onSuppliersChange(updatedList);
      setDeleteConfirmId(null);
      if (editingSupplierId === id) {
        resetFormForNew();
        setViewMode('list');
      }
      setFeedback({ type: 'success', message: 'Supplier deleted successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete supplier.' });
    }
  };

  // Add Document mockup
  const handleAttachDocument = () => {
    if (!selectedFileName.trim()) return;
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: selectedFileName.trim(),
      date: new Date().toISOString().split('T')[0],
      size: '148 KB',
    };
    setDocuments([...documents, newDoc]);
    setSelectedFileName('');
    setFeedback({ type: 'success', message: `Document "${newDoc.name}" attached.` });
    setTimeout(() => setFeedback(null), 2500);
  };

  // Add new group
  const handleAddNewGroup = () => {
    if (!newGroupInput.trim()) return;
    if (!availableGroups.includes(newGroupInput.trim())) {
      const updated = [...availableGroups, newGroupInput.trim()];
      setAvailableGroups(updated);
      setSupplierGroup(newGroupInput.trim());
    }
    setNewGroupInput('');
  };

  // Add new city
  const handleAddNewCity = () => {
    if (!newCityInput.trim()) return;
    if (!availableCities.includes(newCityInput.trim())) {
      const updated = [...availableCities, newCityInput.trim()];
      setAvailableCities(updated);
      setCity(newCityInput.trim());
    }
    setNewCityInput('');
  };

  // Filtered suppliers for List view
  const filteredList = useMemo(() => {
    const q = listSearchQuery.toLowerCase().trim();
    return suppliersList.filter((s) => {
      const matchesSearch =
        !q ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.status === 'ACTIVE') ||
        (statusFilter === 'INACTIVE' && s.status === 'INACTIVE');

      const matchesGroup =
        groupFilter === 'ALL' || (s.supplierGroup && s.supplierGroup.toLowerCase() === groupFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [suppliersList, listSearchQuery, statusFilter, groupFilter]);

  // Filtered suppliers for Reports / Search view
  const reportResults = useMemo(() => {
    return suppliersList.filter((s) => {
      if (reportFilterName.trim()) {
        const nameQ = reportFilterName.toLowerCase().trim();
        if (!s.title?.toLowerCase().includes(nameQ) && !s.accountTitle?.toLowerCase().includes(nameQ)) {
          return false;
        }
      }
      if (reportFilterCnic.trim()) {
        const cnicQ = reportFilterCnic.toLowerCase().trim();
        if (!s.cnic?.toLowerCase().includes(cnicQ)) return false;
      }
      if (reportFilterMobile.trim()) {
        const mobQ = reportFilterMobile.toLowerCase().trim();
        if (!s.mobile?.includes(mobQ) && !s.telephones?.includes(mobQ) && !s.phone?.includes(mobQ)) {
          return false;
        }
      }
      if (reportFilterCity.trim() && reportFilterCity !== 'Nothing selected') {
        const cityQ = reportFilterCity.toLowerCase().trim();
        if (!s.city?.toLowerCase().includes(cityQ)) return false;
      }
      if (reportFilterEmail.trim()) {
        const emQ = reportFilterEmail.toLowerCase().trim();
        if (!s.email?.toLowerCase().includes(emQ)) return false;
      }
      return true;
    });
  }, [
    suppliersList,
    reportFilterName,
    reportFilterCnic,
    reportFilterMobile,
    reportFilterCity,
    reportFilterEmail,
  ]);

  // Summary figures
  const totalPayableAll = useMemo(() => {
    return suppliersList.reduce((sum, s) => sum + (Number(s.payableToSupplier) || Number(s.balanceOwed) || 0), 0);
  }, [suppliersList]);

  const activeCount = useMemo(() => {
    return suppliersList.filter((s) => s.status === 'ACTIVE').length;
  }, [suppliersList]);

  const inactiveCount = suppliersList.length - activeCount;

  return (
    <div id="supplier-management-view" className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* TOP BREADCRUMB & NAVIGATION BAR (matching user ERP interface) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onBackToSettings}
            className="text-slate-400 hover:text-white transition flex items-center gap-1 font-semibold"
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            Settings
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-white font-bold text-sm">
            {viewMode === 'list' && 'Suppliers List'}
            {viewMode === 'details' && (editingSupplierId ? 'Supplier Details / Edit' : 'New Supplier Registration')}
            {viewMode === 'search' && 'Suppliers Reports & Search'}
          </span>
        </div>

        {/* Right Top Action Buttons [ List ] [ Search ] [ New ] */}
        <div className="flex items-center gap-2">
          <button
            id="supplier-btn-list"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>

          <button
            id="supplier-btn-search"
            onClick={() => setViewMode('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'search'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search / Reports
          </button>

          <button
            id="supplier-btn-refresh"
            onClick={fetchSuppliers}
            disabled={isLoadingSuppliers}
            title="Refresh suppliers from database (سپلائرز ریفریش کریں)"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSuppliers ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            id="supplier-btn-new"
            onClick={resetFormForNew}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'details' && !editingSupplierId
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Supplier
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: SUPPLIERS LIST TABLE                                  */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Suppliers</div>
              <div className="text-2xl font-black text-white mt-1">{suppliersList.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Vendors &amp; Wholesalers</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Active Suppliers</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{inactiveCount} Inactive</div>
            </div>

            <div className="col-span-2 bg-slate-900 border border-blue-900/40 rounded-xl p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                    Total Payable To Suppliers
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {currencySymbol()} {totalPayableAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-bold text-amber-400">CR</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Accumulated supplier credit liability across all vendors
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="supplier-list-search"
                type="text"
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                placeholder="Search by code, title, city, mobile..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 max-w-[150px]"
              >
                <option value="ALL">All Groups</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <button
                onClick={resetFormForNew}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Supplier
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 uppercase tracking-wider text-[10px] font-bold">
                    <th className="px-3 py-3 w-12 text-center">SR#</th>
                    <th className="px-3 py-3 w-28">CODE</th>
                    <th className="px-4 py-3">TITLE / BUSINESS NAME</th>
                    <th className="px-3 py-3">PERSON</th>
                    <th className="px-3 py-3">CONTACT NO</th>
                    <th className="px-3 py-3">CITY</th>
                    <th className="px-3 py-3 text-right">PAYABLE TO SUPPLIER</th>
                    <th className="px-3 py-3 text-center">STATUS / ACTIVATION</th>
                    <th className="px-3 py-3 text-center w-24">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <div className="font-semibold text-slate-300">No suppliers found</div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Try adjusting your search criteria or register a new supplier.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((sup, idx) => {
                      const payable = Number(sup.payableToSupplier) || Number((sup as any).payable_to_supplier) || Number((sup as any).balanceOwed) || 0;
                      const supTitle = sup.title || sup.name || (sup as any).account_title || (sup as any).accountTitle || 'Supplier';
                      const supGroup = sup.supplierGroup || (sup as any).supplier_group || 'General';
                      const supVat = sup.vatNumber || (sup as any).vat_number || '';
                      const supPerson = sup.contactPerson || (sup as any).contact_person || (sup as any).contactPerson || '-';
                      const supPhone = sup.mobile || (sup as any).mobile || sup.telephones || sup.phone || (sup as any).phone || '-';
                      const supCity = sup.city || (sup as any).city || '-';
                      const supPayableType = sup.payableType || (sup as any).payable_type || 'CR';
                      return (
                        <tr
                          key={sup.id || (sup as any).code || idx}
                          onClick={() => openEditSupplier(sup)}
                          className="hover:bg-slate-800/50 transition cursor-pointer group"
                        >
                          <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-blue-400 text-[11px]">
                            {sup.code || (sup as any).code || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-white group-hover:text-blue-300 transition">
                              {supTitle}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                                {supGroup}
                              </span>
                              {supVat && <span>VAT: {supVat}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {supPerson}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-300">
                            {supPhone}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {supCity}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-amber-300">
                            {currencySymbol()} {payable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            <span className="text-[10px] text-amber-400/80">{supPayableType}</span>
                          </td>
                          {/* Switch / Unswitch Supplier Activation */}
                          <td
                            className="px-3 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              id={`toggle-status-${sup.id}`}
                              onClick={(e) => handleToggleStatus(sup, e)}
                              title={sup.status === 'ACTIVE' ? 'Click to Deactivate' : 'Click to Activate'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition shadow-sm ${
                                sup.status === 'ACTIVE'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  sup.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              {sup.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          </td>
                          {/* Actions: Edit & Delete */}
                          <td
                            className="px-3 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`edit-supplier-${sup.id}`}
                                onClick={() => openEditSupplier(sup)}
                                title="Edit Supplier Details"
                                className="p-1.5 rounded-lg bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-supplier-${sup.id}`}
                                onClick={() => setDeleteConfirmId(sup.id)}
                                title="Delete Supplier"
                                className="p-1.5 rounded-lg bg-rose-900/30 hover:bg-rose-600 text-rose-400 hover:text-white transition"
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

            {/* Table Footer */}
            <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                Showing <span className="text-white font-bold">{filteredList.length}</span> of{' '}
                <span className="text-white font-bold">{suppliersList.length}</span> total suppliers
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('search')}
                  className="hover:text-blue-400 transition flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  Detailed Reports
                </button>
                <span>•</span>
                <button
                  onClick={resetFormForNew}
                  className="hover:text-emerald-400 transition flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: SUPPLIER DETAILS / EDIT FORM                          */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'details' && (
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8 cols: Main Form */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {editingSupplierId ? `Edit Supplier: ${accountTitle || code}` : 'Add New Supplier'}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Master ledger account, banking details, and contact profile
                    </p>
                  </div>
                </div>

                {/* Auto Code Badge */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Hash className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-xs font-bold text-blue-300">
                    {code || generateNextCode()}
                  </span>
                </div>
              </div>

              {/* Group and Add New Group */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Suppliers Group :
                  </label>
                  <select
                    id="supplier-group-select"
                    value={supplierGroup}
                    onChange={(e) => setSupplierGroup(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {availableGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Add New Group :
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newGroupInput}
                      onChange={(e) => setNewGroupInput(e.target.value)}
                      placeholder="e.g. Dairy & Oils"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewGroup}
                      className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Account Title *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Legal business / enterprise name
                  </span>
                </label>
                <input
                  id="supplier-account-title"
                  type="text"
                  required
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g. ABDULLA AL KHATTAL GENERAL TRADING"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Mobile, VAT, NTN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Mobile :
                  </label>
                  <input
                    id="supplier-mobile"
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 0524491466"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    VAT# (TRN) :
                  </label>
                  <input
                    id="supplier-vat"
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="e.g. 100234567800003"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    NTN # :
                  </label>
                  <input
                    id="supplier-ntn"
                    type="text"
                    value={ntnNumber}
                    onChange={(e) => setNtnNumber(e.target.value)}
                    placeholder="National Tax Number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="bg-slate-800/50 border border-slate-750 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Landmark className="w-3.5 h-3.5 text-blue-400" />
                  Bank Account Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Bank Name :
                    </label>
                    <input
                      id="supplier-bank-name"
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Emirates NBD / Meezan Bank"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Bank Title :
                    </label>
                    <input
                      id="supplier-bank-title"
                      type="text"
                      value={bankTitle}
                      onChange={(e) => setBankTitle(e.target.value)}
                      placeholder="Title of account"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Bank A/C# :
                    </label>
                    <input
                      id="supplier-bank-account"
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="IBAN / Account Number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person Details */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Primary Representative Contact
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Prefix Title :
                    </label>
                    <select
                      value={prefixTitle}
                      onChange={(e) => setPrefixTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      First Name :
                    </label>
                    <input
                      id="supplier-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Shan Martin"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Last Name :
                    </label>
                    <input
                      id="supplier-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Hulle"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Email Address :
                    </label>
                    <input
                      id="supplier-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="supplier@company.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Telephones / Landline :
                    </label>
                    <input
                      id="supplier-telephones"
                      type="text"
                      value={telephones}
                      onChange={(e) => setTelephones(e.target.value)}
                      placeholder="Office phone numbers"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      City :
                    </label>
                    <select
                      id="supplier-city-select"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">
                      Add New City :
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCityInput}
                        onChange={(e) => setNewCityInput(e.target.value)}
                        placeholder="New City"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCity}
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">
                    Address / Warehouse Location :
                  </label>
                  <textarea
                    id="supplier-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Sharjah Saja Industrial Area, Warehouse #14"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition"
                  >
                    Back to List
                  </button>
                  <button
                    type="button"
                    onClick={resetFormForNew}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Form
                  </button>
                </div>

                <button
                  id="supplier-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-md shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingSupplierId ? 'Update Supplier' : 'Save & Register Supplier'}
                </button>
              </div>
            </div>

            {/* Right 4 cols: Widgets (Activation switch, Payable to Supplier, Documents, Make Bill) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Widget 1: Supplier Activation Switch */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Supplier Active
                  </span>
                  {/* Interactive Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="supplier-active-switch"
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    isActive
                      ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>
                    Supplier is currently{' '}
                    <strong className="uppercase font-black">{isActive ? 'Active' : 'Inactive'}</strong>.
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Switch off to suspend new purchase orders or ledger procurement from this supplier.
                </p>
              </div>

              {/* Widget 2: Payable to Supplier (Edit & Save update) */}
              <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Payable to Supplier
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-[10px] font-mono font-bold text-amber-300">
                    {payableType}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">
                    Payable Amount (Rs / AED) :
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-mono text-xs text-slate-400">{currencySymbol()}</span>
                    <input
                      id="supplier-payable-input"
                      type="number"
                      step="0.01"
                      value={payableToSupplier}
                      onChange={(e) => setPayableToSupplier(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-amber-900/60 rounded-lg pl-10 pr-12 py-2 text-sm font-bold text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <div className="absolute right-2 top-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPayableType(payableType === 'CR' ? 'DR' : 'CR')}
                        className="px-1.5 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-[10px] font-bold text-amber-300 transition"
                      >
                        {payableType}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/80 rounded-lg p-2.5 text-xs text-slate-300 font-mono flex items-center justify-between">
                  <span className="text-slate-400">Current Ledger Balance:</span>
                  <span className="font-bold text-amber-400">
                    {currencySymbol()} {Number(payableToSupplier || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {payableType}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Update this payable figure directly and click Update to record ledger obligations.
                </p>
              </div>

              {/* Widget 3: Quick Purchase / Procurement Action */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-2.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FilePlus className="w-3.5 h-3.5 text-blue-400" />
                  Supplier Procurement
                </div>
                <p className="text-[11px] text-slate-400">
                  Make new sales bill or procurement invoice for this supplier:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('orders');
                    } else {
                      setFeedback({
                        type: 'success',
                        message: `Redirecting to purchase order generation for "${accountTitle || 'Supplier'}"...`,
                      });
                    }
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Make New Bill Of This Supplier
                </button>
              </div>

              {/* Widget 4: Documents Attachment Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    Documents
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {documents.length} attached
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedFileName}
                    onChange={(e) => setSelectedFileName(e.target.value)}
                    placeholder="e.g. TradeLicense.pdf / Agreement"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAttachDocument}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shrink-0"
                  >
                    Attach
                  </button>
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800 text-xs border border-slate-750"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-200">{doc.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocuments(documents.filter((d) => d.id !== doc.id))}
                          className="text-rose-400 hover:text-rose-300 p-0.5 ml-2"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-slate-800 rounded-lg text-center text-[10px] text-slate-400">
                    No documents attached yet (e.g. VAT certificate, contract)
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: SUPPLIERS REPORTS & ADVANCED SEARCH                   */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'search' && (
        <div className="space-y-4">
          {/* Header Report Card (matches the user's screenshot layout) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
            {/* Business Header Banner */}
            <div className="text-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-black text-white tracking-wide">
                {companyProfile?.name || 'ZAHRAT AL FAJR FOODSTUFF TR L.L.C'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {companyProfile?.address || 'SAJJA INDUSTRIAL AREA SHARJAH'} | PH:{' '}
                {companyProfile?.phone || '0555661423'} | {companyProfile?.email || 'Z.ALFAJRFOODSTUFF@GMAIL.COM'}
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-blue-950/80 border border-blue-800 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
                SUPPLIERS LIST [ REPORT GENERATED ON: {new Date().toLocaleDateString('en-GB')} ]
              </div>
            </div>

            {/* Filter Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Supplier Name :
                </label>
                <input
                  id="report-filter-name"
                  type="text"
                  value={reportFilterName}
                  onChange={(e) => setReportFilterName(e.target.value)}
                  placeholder="e.g. Shan Martin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  CNIC :
                </label>
                <input
                  id="report-filter-cnic"
                  type="text"
                  value={reportFilterCnic}
                  onChange={(e) => setReportFilterCnic(e.target.value)}
                  placeholder="CNIC / ID"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Supplier Mobile :
                </label>
                <input
                  id="report-filter-mobile"
                  type="text"
                  value={reportFilterMobile}
                  onChange={(e) => setReportFilterMobile(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  City :
                </label>
                <select
                  id="report-filter-city"
                  value={reportFilterCity}
                  onChange={(e) => setReportFilterCity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Nothing selected</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Email :
                </label>
                <input
                  id="report-filter-email"
                  type="text"
                  value={reportFilterEmail}
                  onChange={(e) => setReportFilterEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons: Search, Reset, Print */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setReportFilterName('');
                  setReportFilterCnic('');
                  setReportFilterMobile('');
                  setReportFilterCity('');
                  setReportFilterEmail('');
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>

              <button
                type="button"
                onClick={() => setReportExecuted(true)}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 border-b border-slate-700 uppercase tracking-wider text-[10px] font-bold">
                    <th className="px-3 py-3 w-12 text-center">SR#</th>
                    <th className="px-3 py-3 w-28">CODE</th>
                    <th className="px-4 py-3">TITLE</th>
                    <th className="px-3 py-3">PERSON</th>
                    <th className="px-3 py-3">EMAIL</th>
                    <th className="px-3 py-3">CONTACTNO</th>
                    <th className="px-3 py-3">CITY</th>
                    <th className="px-3 py-3 text-right">PAYABLE</th>
                    <th className="px-3 py-3 text-center w-24">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        No supplier records match the specified search parameters.
                      </td>
                    </tr>
                  ) : (
                    reportResults.map((sup, idx) => {
                      const payable = Number(sup.payableToSupplier) || Number(sup.balanceOwed) || 0;
                      return (
                        <tr key={sup.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-blue-400 text-[11px]">
                            {sup.code}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-white">
                            {sup.title || sup.name}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {sup.contactPerson || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                            {sup.email || '-'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-300">
                            {sup.mobile || sup.telephones || sup.phone || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {sup.city || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-300">
                            {currencySymbol()} {payable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditSupplier(sup)}
                                title="Edit"
                                className="p-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-600 text-blue-300 hover:text-white transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(sup.id)}
                                title="Delete"
                                className="p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-600 text-rose-300 hover:text-white transition"
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

            <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
              <div>
                Total Results Found: <span className="text-white font-bold">{reportResults.length}</span>
              </div>
              <button
                onClick={() => setViewMode('list')}
                className="text-blue-400 hover:text-blue-300 font-bold transition flex items-center gap-1"
              >
                Return to Suppliers List
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Supplier Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete this supplier master ledger record? All attached balance info will be removed from the active suppliers registry.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSupplier(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
