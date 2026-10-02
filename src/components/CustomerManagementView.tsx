import { currencySymbol } from '../utils/currency';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
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
  CreditCard,
  Hash,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  UserCheck,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';
import { Customer, CompanyProfile } from '../types';
import { api } from '../services/api';

interface CustomerManagementViewProps {
  onBackToSettings?: () => void;
  companyProfile?: CompanyProfile | null;
  onNavigateTab?: (tab: string) => void;
}

type ViewMode = 'list' | 'details' | 'search';

const DEFAULT_GROUPS = [
  'Restaurants',
  'Wholesale Traders',
  'Supermarkets',
  'Cafeterias & Fast Food',
  'Catering Services',
  'Grocery Stores',
  'Hotels & Resorts',
  'Retail Outlets',
  'Direct Consumers',
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
];

const DEFAULT_AREAS = [
  'Sajja Industrial Area',
  'Al Nahda',
  'Deira Wholesale Market',
  'Al Quoz Industrial',
  'Al Barsha Commercial',
  'Mussafah Industrial',
  'Industrial Area 10',
  'Al Qusais Commercial',
  'Downtown',
  'Gulberg',
];

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  onBackToSettings,
  companyProfile,
  onNavigateTab,
}) => {
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search & Filter state
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Advanced Search tab state
  const [filterCode, setFilterCode] = useState('');
  const [filterMCode, setFilterMCode] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterMobile, setFilterMobile] = useState('');
  const [filterCnic, setFilterCnic] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [isAdvancedSearchExecuted, setIsAdvancedSearchExecuted] = useState(false);

  // Group & City dropdowns
  const [availableGroups, setAvailableGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [showAddGroupInput, setShowAddGroupInput] = useState(false);

  const [availableCities, setAvailableCities] = useState<string[]>(DEFAULT_CITIES);
  const [newCityInput, setNewCityInput] = useState('');
  const [showAddCityInput, setShowAddCityInput] = useState(false);

  const [availableAreas, setAvailableAreas] = useState<string[]>(DEFAULT_AREAS);

  // Form state for creating / editing customer
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    manualCode: '',
    accountTitle: '',
    customerGroup: 'Restaurants',
    regDate: new Date().toISOString().split('T')[0],
    ntn: '',
    trn: '',
    cnic: '',
    prefixTitle: 'Mr',
    firstName: '',
    lastName: '',
    fatherName: '',
    contactPerson: '',
    mobile: '',
    mobile2: '',
    email: '',
    telephones: '',
    sector: 'Sector 1',
    area: 'Sajja Industrial Area',
    zone: 'Zone A',
    city: 'Sharjah',
    country: 'United Arab Emirates',
    address: '',
    location: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    outstandingBalance: 0,
    creditLimit: 30000,
  });

  // Action status message
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const list = await api.getCustomers();
      setCustomersList(list);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetForm = () => {
    setEditingCustomerId(null);
    setFormData({
      code: '',
      manualCode: '',
      accountTitle: '',
      customerGroup: availableGroups[0] || 'Restaurants',
      regDate: new Date().toISOString().split('T')[0],
      ntn: '',
      trn: '',
      cnic: '',
      prefixTitle: 'Mr',
      firstName: '',
      lastName: '',
      fatherName: '',
      contactPerson: '',
      mobile: '',
      mobile2: '',
      email: '',
      telephones: '',
      sector: 'Sector 1',
      area: availableAreas[0] || 'Sajja Industrial Area',
      zone: 'Zone A',
      city: availableCities[0] || 'Sharjah',
      country: 'United Arab Emirates',
      address: '',
      location: '',
      notes: '',
      status: 'ACTIVE',
      outstandingBalance: 0,
      creditLimit: 30000,
    });
    setActionMsg(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setViewMode('details');
  };

  const handleStartEdit = (cust: Customer) => {
    setEditingCustomerId(cust.id);
    setFormData({
      code: cust.code || cust.accountCode || '',
      manualCode: cust.manualCode || '',
      accountTitle: cust.accountTitle || cust.name || cust.title || '',
      customerGroup: cust.customerGroup || 'Restaurants',
      regDate: cust.regDate || new Date().toISOString().split('T')[0],
      ntn: cust.ntn || '',
      trn: cust.trn || '',
      cnic: cust.cnic || '',
      prefixTitle: cust.prefixTitle || 'Mr',
      firstName: cust.firstName || '',
      lastName: cust.lastName || '',
      fatherName: cust.fatherName || '',
      contactPerson: cust.contactPerson || '',
      mobile: cust.mobile || '',
      mobile2: cust.mobile2 || '',
      email: cust.email || '',
      telephones: cust.telephones || '',
      sector: cust.sector || 'Sector 1',
      area: cust.area || 'Sajja Industrial Area',
      zone: cust.zone || 'Zone A',
      city: cust.city || 'Sharjah',
      country: cust.country || 'United Arab Emirates',
      address: cust.address || '',
      location: cust.location || '',
      notes: cust.notes || '',
      status: cust.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      outstandingBalance: cust.outstandingBalance || 0,
      creditLimit: cust.creditLimit || 30000,
    });
    setViewMode('details');
    setActionMsg(null);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountTitle.trim()) {
      setActionMsg({ type: 'error', text: 'Customer Account Title / Name is required.' });
      return;
    }

    try {
      if (editingCustomerId) {
        const updated = await api.updateCustomer(editingCustomerId, formData);
        setCustomersList((prev) => prev.map((c) => (c.id === editingCustomerId ? updated : c)));
        setActionMsg({
          type: 'success',
          text: `Customer "${updated.accountTitle}" (Code: ${updated.code}) updated successfully!`,
        });
      } else {
        const created = await api.createCustomer(formData);
        setCustomersList((prev) => [created, ...prev]);
        setActionMsg({
          type: 'success',
          text: `Customer "${created.accountTitle}" (Code: ${created.code}) created successfully!`,
        });
      }
      setTimeout(() => {
        setViewMode('list');
      }, 1000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to save customer.' });
    }
  };

  const handleToggleStatus = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await api.toggleCustomerStatus(id);
      setCustomersList((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setActionMsg({
        type: 'success',
        text: `Customer "${updated.accountTitle}" status changed to ${updated.status}.`,
      });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update customer status.' });
    }
  };

  const handleDelete = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    try {
      await api.deleteCustomer(id);
      setCustomersList((prev) => prev.filter((c) => c.id !== id));
      setActionMsg({ type: 'success', text: `Customer "${name}" deleted.` });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to delete customer.' });
    }
  };

  const handleAddGroup = () => {
    const val = newGroupInput.trim();
    if (val && !availableGroups.includes(val)) {
      setAvailableGroups([...availableGroups, val]);
      setFormData({ ...formData, customerGroup: val });
      setNewGroupInput('');
      setShowAddGroupInput(false);
    }
  };

  const handleAddCity = () => {
    const val = newCityInput.trim();
    if (val && !availableCities.includes(val)) {
      setAvailableCities([...availableCities, val]);
      setFormData({ ...formData, city: val });
      setNewCityInput('');
      setShowAddCityInput(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      // Group filter
      if (groupFilter !== 'ALL' && c.customerGroup !== groupFilter) return false;

      // Text search
      if (listSearchQuery.trim()) {
        const q = listSearchQuery.toLowerCase().trim();
        const matches =
          (c.accountTitle && c.accountTitle.toLowerCase().includes(q)) ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.manualCode && c.manualCode.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.sector && c.sector.toLowerCase().includes(q)) ||
          (c.cnic && c.cnic.includes(q)) ||
          (c.trn && c.trn.includes(q));
        if (!matches) return false;
      }

      // Advanced filters (when on search view)
      if (isAdvancedSearchExecuted) {
        if (filterCode.trim() && !c.code?.toLowerCase().includes(filterCode.toLowerCase().trim())) return false;
        if (filterMCode.trim() && !c.manualCode?.toLowerCase().includes(filterMCode.toLowerCase().trim())) return false;
        if (filterTitle.trim() && !c.accountTitle?.toLowerCase().includes(filterTitle.toLowerCase().trim())) return false;
        if (filterMobile.trim() && !c.mobile?.includes(filterMobile.trim())) return false;
        if (filterCnic.trim() && !c.cnic?.includes(filterCnic.trim()) && !c.trn?.includes(filterCnic.trim())) return false;
        if (filterCity.trim() && c.city?.toLowerCase() !== filterCity.toLowerCase().trim()) return false;
        if (filterArea.trim() && !c.area?.toLowerCase().includes(filterArea.toLowerCase().trim())) return false;
        if (filterSector.trim() && !c.sector?.toLowerCase().includes(filterSector.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [
    customersList,
    listSearchQuery,
    statusFilter,
    groupFilter,
    isAdvancedSearchExecuted,
    filterCode,
    filterMCode,
    filterTitle,
    filterMobile,
    filterCnic,
    filterCity,
    filterArea,
    filterSector,
  ]);

  const totalOutstanding = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
  }, [filteredCustomers]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white">Customer Management</h1>
                <span className="text-[11px] bg-orange-950 text-orange-300 border border-orange-800/80 px-2 py-0.5 rounded-full font-bold">
                  Khata Directory
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage client accounts, credit limits, contact persons, locations, and real-time outstanding balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToSettings && (
              <button
                onClick={onBackToSettings}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Settings Hub
              </button>
            )}
            <button
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'list'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Customers List ({customersList.length})</span>
          </button>

          <button
            onClick={() => setViewMode('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === 'search'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Search &amp; Filters</span>
          </button>

          {viewMode === 'details' && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-orange-600 text-white shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{editingCustomerId ? 'Edit Customer' : 'New Customer Entry'}</span>
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400 hidden sm:flex items-center gap-2">
            <span>Total Receivables:</span>
            <span className="font-bold text-amber-400">{currencySymbol()} {totalOutstanding.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. VIEW MODE: CUSTOMER LIST */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 sm:p-4 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Title, Code, M.Code, Mobile, City..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Group Filter */}
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-orange-500"
              >
                <option value="ALL">All Groups</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-orange-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <button
                onClick={loadCustomers}
                title="Refresh customer list"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="text-slate-400 text-xs">
              Showing <strong className="text-white">{filteredCustomers.length}</strong> of{' '}
              {customersList.length} customers
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Code / M.Code</th>
                  <th className="py-2.5 px-3">Customer Account Title</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3">Contact Person &amp; Phone</th>
                  <th className="py-2.5 px-3">City / Area</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No customers found matching the criteria. Click &quot;Add Customer&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isPositiveBal = (cust.outstandingBalance || 0) > 0;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-orange-400">
                          <div>{cust.code || '---'}</div>
                          {cust.manualCode && (
                            <div className="text-[10px] text-slate-500">M: {cust.manualCode}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white hover:text-orange-300 transition cursor-pointer" onClick={() => handleStartEdit(cust)}>
                            {cust.accountTitle || cust.name}
                          </div>
                          {cust.trn && (
                            <div className="text-[10px] text-slate-500">TRN: {cust.trn}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                            {cust.customerGroup || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">
                            {cust.contactPerson || cust.firstName || 'Owner'}
                          </div>
                          <div className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-2.5 h-2.5 text-slate-500" />
                            {cust.mobile || 'No Phone'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">{cust.city || 'Sharjah'}</div>
                          <div className="text-slate-400 text-[11px] truncate max-w-[150px]">
                            {cust.area || cust.sector || 'Industrial Area'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={isPositiveBal ? 'text-amber-400' : 'text-slate-400'}>
                            {currencySymbol()} {(cust.outstandingBalance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={(e) => handleToggleStatus(cust.id, e)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              cust.status === 'ACTIVE'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                                : 'bg-rose-950/80 text-rose-400 border-rose-800 hover:bg-rose-900/60'
                            }`}
                          >
                            {cust.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(cust)}
                              title="Edit Customer"
                              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(cust.id, cust.accountTitle || cust.name, e)}
                              title="Delete Customer"
                              className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. VIEW MODE: ADVANCED SEARCH & FILTERS */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'search' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white">Specific Filter &amp; Search Criteria</h2>
            </div>
            <button
              onClick={() => {
                setFilterCode('');
                setFilterMCode('');
                setFilterTitle('');
                setFilterMobile('');
                setFilterCnic('');
                setFilterCity('');
                setFilterArea('');
                setFilterSector('');
                setIsAdvancedSearchExecuted(false);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Customer Code</label>
              <input
                type="text"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                placeholder="e.g. 0101040001"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Manual Code (M.Code)</label>
              <input
                type="text"
                value={filterMCode}
                onChange={(e) => setFilterMCode(e.target.value)}
                placeholder="e.g. C-101"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Account Title / Name</label>
              <input
                type="text"
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
                placeholder="e.g. Al Madina Restaurant"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={filterMobile}
                onChange={(e) => setFilterMobile(e.target.value)}
                placeholder="e.g. 050-1234567"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">CNIC / TRN / NTN</label>
              <input
                type="text"
                value={filterCnic}
                onChange={(e) => setFilterCnic(e.target.value)}
                placeholder="Tax or ID number"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">City</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Area / Location</label>
              <input
                type="text"
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                placeholder="e.g. Sajja Industrial Area"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Sector</label>
              <input
                type="text"
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                placeholder="e.g. Sector 1"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setIsAdvancedSearchExecuted(true);
                setViewMode('list');
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Apply Filters &amp; Show Matching Customers</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. VIEW MODE: ADD / EDIT CUSTOMER FORM */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'details' && (
        <form onSubmit={handleSaveCustomer} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                {editingCustomerId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <h2 className="text-base font-bold text-white">
                {editingCustomerId ? 'Edit Customer Details' : 'Add New Customer Account'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Cancel &amp; Return
            </button>
          </div>

          {/* Section 1: Basic Identifiers */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Account Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Customer Account Title / Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountTitle}
                  onChange={(e) => setFormData({ ...formData, accountTitle: e.target.value })}
                  placeholder="e.g. Al-Madina Restaurant &amp; Catering"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Manual Code (M.Code)</label>
                <input
                  type="text"
                  value={formData.manualCode}
                  onChange={(e) => setFormData({ ...formData, manualCode: e.target.value })}
                  placeholder="e.g. CUST-01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Group</label>
                <div className="flex gap-1.5">
                  <select
                    value={formData.customerGroup}
                    onChange={(e) => setFormData({ ...formData, customerGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-hidden focus:border-orange-500"
                  >
                    {availableGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddGroupInput(!showAddGroupInput)}
                    className="px-2 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg text-xs"
                    title="Add new group"
                  >
                    +
                  </button>
                </div>
                {showAddGroupInput && (
                  <div className="mt-1.5 flex gap-1">
                    <input
                      type="text"
                      placeholder="New Group Name"
                      value={newGroupInput}
                      onChange={(e) => setNewGroupInput(e.target.value)}
                      className="w-full bg-slate-950 border border-orange-500 rounded px-2 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      className="px-2 py-1 bg-orange-600 text-white rounded text-xs"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Registration Date</label>
                <input
                  type="date"
                  value={formData.regDate}
                  onChange={(e) => setFormData({ ...formData, regDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">TRN / Tax Number</label>
                <input
                  type="text"
                  value={formData.trn}
                  onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                  placeholder="e.g. 100234567800003"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">CNIC / Emirates ID</label>
                <input
                  type="text"
                  value={formData.cnic}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  placeholder="e.g. 784-1990-1234567-1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">NTN (National Tax No)</label>
                <input
                  type="text"
                  value={formData.ntn}
                  onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                  placeholder="e.g. 1234567-8"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Person & Telephones */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Contact Person &amp; Phone Numbers</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title / Prefix</label>
                <select
                  value={formData.prefixTitle}
                  onChange={(e) => setFormData({ ...formData, prefixTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="Mr">Mr.</option>
                  <option value="Ms">Ms.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Dr">Dr.</option>
                  <option value="M/s">M/s.</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. Tariq"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Mehmood"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Father / Guardian Name</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="e.g. Muhammad Aslam"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Primary Mobile <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 050-1234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Secondary Mobile</label>
                <input
                  type="text"
                  value={formData.mobile2}
                  onChange={(e) => setFormData({ ...formData, mobile2: e.target.value })}
                  placeholder="e.g. 055-9876543"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telephones / Landline</label>
                <input
                  type="text"
                  value={formData.telephones}
                  onChange={(e) => setFormData({ ...formData, telephones: e.target.value })}
                  placeholder="e.g. 06-5341234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. contact@restaurant.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location Details */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>3. Location &amp; Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">City</label>
                <div className="flex gap-1.5">
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-hidden focus:border-orange-500"
                  >
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCityInput(!showAddCityInput)}
                    className="px-2 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg text-xs"
                    title="Add new city"
                  >
                    +
                  </button>
                </div>
                {showAddCityInput && (
                  <div className="mt-1.5 flex gap-1">
                    <input
                      type="text"
                      placeholder="New City"
                      value={newCityInput}
                      onChange={(e) => setNewCityInput(e.target.value)}
                      className="w-full bg-slate-950 border border-orange-500 rounded px-2 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCity}
                      className="px-2 py-1 bg-orange-600 text-white rounded text-xs"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Area</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g. Sajja Industrial Area"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="e.g. Sector 1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Zone / Country</label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  placeholder="e.g. Zone A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-slate-300 font-semibold mb-1">Full Shop / Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Shop # 14, Building 3, Street 18, Sajja Industrial Area, Sharjah"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Credit & Financials */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>4. Khata &amp; Credit Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Opening Outstanding Balance ({currencySymbol()})</label>
                <input
                  type="number"
                  value={formData.outstandingBalance}
                  onChange={(e) => setFormData({ ...formData, outstandingBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Credit Limit ({currencySymbol()})</label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="30000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Activation Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500 font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Can place orders &amp; buy on credit)</option>
                  <option value="INACTIVE">INACTIVE (Khata paused / suspended)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-300 font-semibold mb-1">Internal Ledger Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. High priority client, weekly cash settlement on Mondays."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingCustomerId ? 'Update Customer' : 'Save Customer Record'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
