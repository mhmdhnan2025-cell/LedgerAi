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
  Briefcase,
  DollarSign,
  Calendar,
  Save,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Employee } from '../types';
import { api } from '../services/api';

interface EmployeeManagementViewProps {
  employees: Employee[];
  onEmployeesChange: (updatedList: Employee[]) => void;
  onBackToSettings?: () => void;
}

type ViewMode = 'list' | 'new' | 'edit';

const DESIGNATION_OPTIONS = [
  'Salesman',
  'Accountant',
  'CEO',
  'Manager',
  'Driver',
  'Packing Officer',
  'Warehouse Incharge',
  'Delivery Boy',
  'Cashier',
  'Procurement Officer',
];

const SALARY_TYPES = ['MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY'];
const PREFIX_TITLES = ['Mr', 'Mrs', 'Ms', 'Dr'];

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  employees,
  onEmployeesChange,
  onBackToSettings,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDesignationFilter, setSelectedDesignationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State for New / Edit Employee
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [code, setCode] = useState('');
  const [salesmanAcc, setSalesmanAcc] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [prefixTitle, setPrefixTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('Salesman');
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [salary, setSalary] = useState<number | ''>(3000);
  const [commissionAmount, setCommissionAmount] = useState<number | ''>(0);
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [telephones, setTelephones] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [bankTitle, setBankTitle] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [status, setStatus] = useState<'YES' | 'NO'>('YES');

  // Notification / Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Directly fetch employees from API to ensure data is always present even if parent state was initially empty
  const fetchEmployeesData = async () => {
    setIsLoading(true);
    try {
      const list = await api.getEmployees();
      if (Array.isArray(list) && list.length > 0) {
        onEmployeesChange(list);
      }
    } catch (err: any) {
      console.warn('Direct fetch of employees failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!employees || employees.length === 0) {
      fetchEmployeesData();
    }
  }, [employees?.length]);

  // Generate next automatic sequential employee code
  const getNextEmployeeCode = () => {
    const count = employees.length + 1;
    const pad = count < 10 ? `0${count}` : `${count}`;
    return `04010400${pad}`;
  };

  const resetForm = () => {
    setEditingEmployeeId(null);
    setRegDate(new Date().toISOString().split('T')[0]);
    setCode(getNextEmployeeCode());
    setSalesmanAcc('');
    setAccountTitle('');
    setPrefixTitle('Mr');
    setFirstName('');
    setLastName('');
    setFullName('');
    setDesignation('Salesman');
    setSalaryType('MONTHLY');
    setSalary(2000);
    setCommissionAmount(0);
    setEmail('');
    setContactNo('');
    setTelephones('');
    setAddress('');
    setCity('Lahore');
    setBankTitle('');
    setBankAccount('');
    setStatus('YES');
    setFeedback(null);
  };

  const handleOpenNewForm = () => {
    resetForm();
    setViewMode('new');
  };

  const handleOpenEditForm = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setRegDate(emp.regDate || new Date().toISOString().split('T')[0]);
    setCode(emp.code);
    setSalesmanAcc(emp.salesmanAcc || '');
    setAccountTitle(emp.accountTitle || '');
    setPrefixTitle(emp.prefixTitle || 'Mr');
    setFirstName(emp.firstName || '');
    setLastName(emp.lastName || '');
    setFullName(emp.fullName || '');
    setDesignation(emp.designation || 'Salesman');
    setSalaryType(emp.salaryType || 'MONTHLY');
    setSalary(emp.salary !== undefined ? emp.salary : 0);
    setCommissionAmount(emp.commissionAmount !== undefined ? emp.commissionAmount : 0);
    setEmail(emp.email || '');
    setContactNo(emp.contactNo || '');
    setTelephones(emp.telephones || '');
    setAddress(emp.address || '');
    setCity(emp.city || 'Lahore');
    setBankTitle(emp.bankTitle || '');
    setBankAccount(emp.bankAccount || '');
    setStatus(emp.status === 'NO' ? 'NO' : 'YES');
    setFeedback(null);
    setViewMode('edit');
  };

  // Keep Account Title and Full Name synchronized with First & Last Name if user hasn't explicitly customized them
  const handleNameChange = (first: string, last: string) => {
    setFirstName(first);
    setLastName(last);
    const combined = `${first.trim()} ${last.trim()}`.trim();
    if (!accountTitle || accountTitle === `${firstName} ${lastName}`.trim()) {
      setAccountTitle(combined);
    }
    if (!fullName || fullName === `${firstName} ${lastName}`.trim()) {
      setFullName(combined);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedCode = code.trim();
    const effectiveTitle = accountTitle.trim() || `${firstName.trim()} ${lastName.trim()}`.trim() || 'Employee';
    const effectiveFullName = fullName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim() || effectiveTitle;

    if (!trimmedCode) {
      setFeedback({ type: 'error', message: 'Employee code is required.' });
      return;
    }
    if (!effectiveTitle) {
      setFeedback({ type: 'error', message: 'Account title / employee name is required.' });
      return;
    }

    const payload: Partial<Employee> = {
      code: trimmedCode,
      salesmanAcc: salesmanAcc.trim(),
      accountTitle: effectiveTitle,
      prefixTitle,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: effectiveFullName,
      designation: designation.trim() || 'Salesman',
      salaryType,
      salary: Number(salary) || 0,
      commissionAmount: Number(commissionAmount) || 0,
      email: email.trim(),
      contactNo: contactNo.trim(),
      telephones: telephones.trim(),
      address: address.trim(),
      city: city.trim(),
      bankTitle: bankTitle.trim(),
      bankAccount: bankAccount.trim(),
      regDate,
      status,
    };

    setIsSubmitting(true);
    try {
      if (viewMode === 'edit' && editingEmployeeId) {
        const res = await api.updateEmployee(editingEmployeeId, payload);
        const updated = employees.map((emp) => (emp.id === editingEmployeeId ? res.employee : emp));
        onEmployeesChange(updated);
        setFeedback({ type: 'success', message: `Employee "${res.employee.fullName}" successfully updated.` });
        setTimeout(() => setViewMode('list'), 1200);
      } else {
        const res = await api.createEmployee(payload);
        const updated = [...employees, res.employee];
        onEmployeesChange(updated);
        setFeedback({ type: 'success', message: `Employee "${res.employee.fullName}" successfully added.` });
        setTimeout(() => setViewMode('list'), 1200);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save employee record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await api.deleteEmployee(id);
      const updated = employees.filter((e) => e.id !== id);
      onEmployeesChange(updated);
      setDeleteConfirmId(null);
      setFeedback({ type: 'success', message: 'Employee record deleted.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete employee.' });
    }
  };

  // Filtered employees calculation
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      // Text match across all relevant fields
      const matchesQuery =
        !q ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.salesmanAcc && emp.salesmanAcc.toLowerCase().includes(q)) ||
        (emp.accountTitle && emp.accountTitle.toLowerCase().includes(q)) ||
        (emp.fullName && emp.fullName.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.contactNo && emp.contactNo.toLowerCase().includes(q)) ||
        (emp.city && emp.city.toLowerCase().includes(q));

      // Designation filter
      const matchesDesignation =
        selectedDesignationFilter === 'ALL' ||
        (emp.designation && emp.designation.toLowerCase() === selectedDesignationFilter.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'YES' && emp.status !== 'NO') ||
        (statusFilter === 'NO' && emp.status === 'NO');

      return matchesQuery && matchesDesignation && matchesStatus;
    });
  }, [employees, searchQuery, selectedDesignationFilter, statusFilter]);

  // Total calculated salary of the current filtered list (matching Image 2 & 3!)
  const totalSalarySum = useMemo(() => {
    return filteredEmployees.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);
  }, [filteredEmployees]);

  return (
    <div id="employee-management-container" className="space-y-5">
      {/* Top Header & Breadcrumb / Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          {onBackToSettings && (
            <button
              id="btn-back-to-settings"
              onClick={onBackToSettings}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Return to Settings Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Settings &gt;</span>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Staff &amp; Payroll
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 mt-0.5">
              <span>Employees</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {employees.length} Registered
              </span>
            </h1>
          </div>
        </div>

        {/* Action Buttons matching Image 2 & Image 3: [Refresh] [List] [Search] [New] */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            id="btn-refresh-employees"
            onClick={fetchEmployeesData}
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Refresh employees list from database"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            id="btn-view-employee-list"
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-slate-800 text-white border-slate-700 shadow-xs'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <List className="w-4 h-4 text-indigo-400" />
            <span>List</span>
          </button>

          <button
            id="btn-toggle-employee-search"
            onClick={() => {
              if (viewMode !== 'list') setViewMode('list');
              setIsSearchOpen((prev) => !prev);
            }}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
              isSearchOpen && viewMode === 'list'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80 shadow-xs'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4 text-indigo-400" />
            <span>Search</span>
          </button>

          <button
            id="btn-add-new-employee"
            onClick={handleOpenNewForm}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-950/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          id="employee-feedback-alert"
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* VIEW MODE: TABLE LIST & SEARCH */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Quick Search & Filter Toolbar (toggleable or always available) */}
          {(isSearchOpen || searchQuery || selectedDesignationFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <div
              id="employee-search-bar"
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center animate-in fade-in duration-150"
            >
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-employee-search"
                  type="text"
                  placeholder="Search by code, title, full name, phone number, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={isSearchOpen}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="sm:col-span-3">
                <select
                  id="select-filter-designation"
                  value={selectedDesignationFilter}
                  onChange={(e) => setSelectedDesignationFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Roles / Designations</option>
                  {DESIGNATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-2">
                <select
                  id="select-filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="YES">Active (YES)</option>
                  <option value="NO">Inactive (NO)</option>
                </select>

                {(searchQuery || selectedDesignationFilter !== 'ALL' || statusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDesignationFilter('ALL');
                      setStatusFilter('ALL');
                    }}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs whitespace-nowrap"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Container (Matching Image 2 & 3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table id="table-employees" className="w-full text-left text-xs sm:text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <th className="py-3 px-3.5 w-12 text-center">SR#</th>
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5">Saleman/Acc</th>
                    <th className="py-3 px-3.5">Title</th>
                    <th className="py-3 px-3.5">Full Name</th>
                    <th className="py-3 px-3.5">Designation</th>
                    <th className="py-3 px-3.5">Contact No.</th>
                    <th className="py-3 px-3.5 text-center">Salary Type</th>
                    <th className="py-3 px-3.5 text-right font-mono">Salary</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-400">No employees found.</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {searchQuery
                            ? `No records match the search "${searchQuery}".`
                            : 'Click "+ New" to add your first employee.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, index) => {
                      const isRowDeleting = deleteConfirmId === emp.id;
                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-slate-800/50 transition-colors group"
                        >
                          {/* SR# */}
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-xs">
                            {index + 1}
                          </td>

                          {/* CODE */}
                          <td className="py-3 px-3.5 font-mono font-bold text-slate-200 text-xs">
                            {emp.code}
                          </td>

                          {/* SALEMAN/ACC */}
                          <td className="py-3 px-3.5 font-mono text-slate-400 text-xs">
                            {emp.salesmanAcc || '-'}
                          </td>

                          {/* TITLE */}
                          <td className="py-3 px-3.5 text-slate-200 font-semibold whitespace-nowrap">
                            {emp.accountTitle || emp.fullName}
                          </td>

                          {/* FULL NAME */}
                          <td className="py-3 px-3.5 text-white font-medium whitespace-nowrap">
                            {emp.fullName || `${emp.firstName} ${emp.lastName}`.trim()}
                          </td>

                          {/* DESIGNATION */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700/60">
                              {emp.designation || 'Staff'}
                            </span>
                          </td>

                          {/* CONTACT NO. */}
                          <td className="py-3 px-3.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                            {emp.contactNo ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-emerald-400/80" />
                                {emp.contactNo}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* SALARY TYPE */}
                          <td className="py-3 px-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {emp.salaryType || 'MONTHLY'}
                          </td>

                          {/* SALARY */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                            {Number(emp.salary || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* STATUS */}
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                emp.status !== 'NO'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {emp.status !== 'NO' ? 'YES' : 'NO'}
                            </span>
                          </td>

                          {/* ACTION */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {isRowDeleting ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                                  title="Confirm delete"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                                  title="Cancel"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  id={`btn-edit-emp-${emp.id}`}
                                  onClick={() => handleOpenEditForm(emp)}
                                  className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/60 transition cursor-pointer"
                                  title="Edit employee details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-emp-${emp.id}`}
                                  onClick={() => setDeleteConfirmId(emp.id)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition cursor-pointer"
                                  title="Delete employee"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* TABLE FOOTER WITH TOTAL ROW (MATCHING IMAGE 2 & 3) */}
                <tfoot>
                  <tr className="bg-slate-950 font-black text-xs sm:text-sm border-t-2 border-slate-700/80 text-white">
                    <td
                      colSpan={8}
                      className="py-3 px-4 text-left uppercase tracking-wider text-slate-300 font-black"
                    >
                      TOTAL
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                      {totalSalarySum.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td colSpan={2} className="py-3 px-3.5 text-right text-xs text-slate-500">
                      {filteredEmployees.length} Staff
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: NEW / EDIT FORM (MATCHING IMAGE 4) */}
      {(viewMode === 'new' || viewMode === 'edit') && (
        <div
          id="employee-form-container"
          className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Form Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                {viewMode === 'edit' ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {viewMode === 'edit' ? 'Edit Employee Details' : 'New Employee Registration'}
                </h2>
                <p className="text-xs text-slate-400">
                  Fill in staff identification, payroll salary structure, and official contact numbers.
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Back to List
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveEmployee} className="p-5 sm:p-6 space-y-6 text-slate-200">
            {/* Top Meta Bar: Reg Date, Employee Code, Account Title */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Reg Date :
                </label>
                <input
                  id="input-emp-reg-date"
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                  <span>Employee Code</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-emp-code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., 0401040001"
                  className="w-full bg-slate-900 border border-slate-700 font-mono font-bold rounded-lg px-3 py-2 text-xs sm:text-sm text-indigo-300 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                  <span>Account Title</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-emp-account-title"
                  type="text"
                  required
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g., Akbar Bhai"
                  className="w-full bg-slate-900 border border-slate-700 font-semibold rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Role, Designation, and Salary Structure */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  Designation
                </label>
                <input
                  id="input-emp-designation"
                  type="text"
                  list="designation-suggestions"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g., Salesman"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
                <datalist id="designation-suggestions">
                  {DESIGNATION_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Salary Type
                </label>
                <select
                  id="select-emp-salary-type"
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                >
                  {SALARY_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Salary Amount ({currencySymbol()})
                </label>
                <input
                  id="input-emp-salary-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g., 3000.00"
                  className="w-full bg-slate-800/90 border border-slate-700 font-mono font-bold rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Commission Amount
                </label>
                <input
                  id="input-emp-commission"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g., 0.00"
                  className="w-full bg-slate-800/90 border border-slate-700 font-mono rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Prefix Title</label>
                <select
                  id="select-emp-prefix-title"
                  value={prefixTitle}
                  onChange={(e) => setPrefixTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                >
                  {PREFIX_TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-300 mb-1">First Name</label>
                <input
                  id="input-emp-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => handleNameChange(e.target.value, lastName)}
                  placeholder="e.g., Akbar"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-300 mb-1">Last Name</label>
                <input
                  id="input-emp-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => handleNameChange(firstName, e.target.value)}
                  placeholder="e.g., Bhai"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Salesman Account & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Full Name (Display)
                </label>
                <input
                  id="input-emp-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Akbar Bhai"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Salesman Account Code (Optional)
                </label>
                <input
                  id="input-emp-salesman-acc"
                  type="text"
                  value={salesmanAcc}
                  onChange={(e) => setSalesmanAcc(e.target.value)}
                  placeholder="e.g., 0101100009"
                  className="w-full bg-slate-800/90 border border-slate-700 font-mono rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Mobile / Contact No.
                </label>
                <input
                  id="input-emp-mobile"
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="e.g., 0507309192"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Telephones / Alternate
                </label>
                <input
                  id="input-emp-telephones"
                  type="text"
                  value={telephones}
                  onChange={(e) => setTelephones(e.target.value)}
                  placeholder="e.g., 042-3512345"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Email
                </label>
                <input
                  id="input-emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., akbar@company.com"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Address & City & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Address
                </label>
                <input
                  id="input-emp-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., House # 12, Street 4, Badami Bagh"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1">City</label>
                <input
                  id="input-emp-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Lahore"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1">Active Status</label>
                <select
                  id="select-emp-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'YES' | 'NO')}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="YES">YES (Active)</option>
                  <option value="NO">NO (Inactive)</option>
                </select>
              </div>
            </div>

            {/* Banking Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Bank Title
                </label>
                <input
                  id="input-emp-bank-title"
                  type="text"
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  placeholder="e.g., Meezan Bank / HBL / Cash"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Bank Account Number / IBAN
                </label>
                <input
                  id="input-emp-bank-account"
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g., 0101-0102030405"
                  className="w-full bg-slate-800/90 border border-slate-700 font-mono rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Action Buttons: [Save] [New Form] [Back] */}
            <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                id="btn-form-back-list"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Back to List
              </button>

              <button
                type="button"
                id="btn-form-clear-new"
                onClick={resetForm}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                New Form
              </button>

              <button
                type="submit"
                id="btn-form-save-employee"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Employee</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
