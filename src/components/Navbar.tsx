import { currencySymbol } from '../utils/currency';
import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Bot,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  HardDrive,
  LogIn,
  LogOut,
  KeyRound,
  Mic,
  Palette,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { BusinessSummary, CompanyProfile, SmartAlert, User, UserRole } from '../types';

export type AppTheme = 'cream' | 'pearl' | 'sand' | 'dark';

export interface NavbarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
  onNavigateTab?: (tab: string) => void;
  currentRole: UserRole;
  onChangeRole?: (role: UserRole) => void;
  onRoleChange?: (role: UserRole) => void;
  currentUser?: User | null;
  companyProfile?: CompanyProfile | null;
  onOpenCompanyProfile?: () => void;
  onOpenAuth?: () => void;
  onOpenBackup?: () => void;
  onLogout?: () => void;
  isOffline?: boolean;
  summary?: BusinessSummary | null;
  alerts?: SmartAlert[];
  onOpenAi?: () => void;
  onOpenAiAssistant?: (initialQuery?: string) => void;
  onOpenOcr?: () => void;
  onOpenDocumentOcr?: () => void;
  onOpenGeminiKey?: () => void;
  onResetData?: () => void;
  onSearchSelect?: (type: string, id: string) => void;
  currentTheme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  onNavigateTab,
  currentRole,
  onChangeRole,
  onRoleChange,
  currentUser,
  companyProfile,
  onOpenCompanyProfile,
  onOpenAuth,
  onOpenBackup,
  onLogout,
  isOffline = false,
  summary,
  alerts = [],
  onOpenAi,
  onOpenAiAssistant,
  onOpenOcr,
  onOpenDocumentOcr,
  onOpenGeminiKey,
  onResetData,
  onSearchSelect,
  currentTheme = 'cream',
  onThemeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    restaurants: any[];
    products: any[];
    orders: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);

  // Theme dropdown state
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const themeOptions: { id: AppTheme; name: string; urdu: string; desc: string; icon: string; badge?: string }[] = [
    {
      id: 'cream',
      name: 'Creamish White',
      urdu: 'آئیوری کریم (لائٹ)',
      desc: 'Warm ivory off-white, soothing with zero darkness (User favorite)',
      icon: '🍨',
      badge: 'Recommended',
    },
    {
      id: 'pearl',
      name: 'Pearl Slate',
      urdu: 'سفید پرل (لائٹ)',
      desc: 'Clean cool soft gray off-white with crisp modern contrast',
      icon: '🐚',
    },
    {
      id: 'sand',
      name: 'Warm Sand Latte',
      urdu: 'سینڈ لاتے (وارم)',
      desc: 'Desert sand latte shade with warm coffee/espresso accents',
      icon: '🌾',
    },
    {
      id: 'dark',
      name: 'Midnight Dark',
      urdu: 'اصل ڈارک (نائٹ)',
      desc: 'Original deep slate high-contrast dark theme',
      icon: '🌙',
    },
  ];

  const activeThemeObj = themeOptions.find((t) => t.id === currentTheme) || themeOptions[0];

  const selectedTab = currentTab || activeTab || 'aimunshi';
  const handleTabChange = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    else if (onNavigateTab) onNavigateTab(tab);
  };

  const handleRoleUpdate = (role: UserRole) => {
    if (onChangeRole) onChangeRole(role);
    else if (onRoleChange) onRoleChange(role);
  };

  const handleOpenAi = () => {
    if (onOpenAi) onOpenAi();
    else if (onOpenAiAssistant) onOpenAiAssistant();
  };

  const handleOpenOcr = () => {
    if (onOpenOcr) onOpenOcr();
    else if (onOpenDocumentOcr) onOpenDocumentOcr();
  };

  const criticalAlerts = (alerts || []).filter((a) => a && a.severity === 'critical');

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const navItems = [
    { id: 'aimunshi', label: '🤖 AI Munshi (Accountant)' },
    { id: 'sales', label: '💰 Sales Bill' },
    { id: 'purchasing', label: '🧾 Purchase Bill' },
    { id: 'cashbank', label: '💵 Cash / Bank' },
    { id: 'reports', label: '📑 Reports' },
    { id: 'inventory', label: '📦 Inventory & Stock' },
    { id: 'customers', label: '🏢 Customers & Khata' },
    { id: 'employees', label: '👥 Employees (ملازمین)' },
    { id: 'expenses', label: '⛽ Expenses & Petrol' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Banner: Role Switcher & System Status */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE WHOLESALE ERP
          </span>
        </div>

        {/* User Role Switcher, Auth & System Controls */}
        <div className="flex items-center gap-2.5">
          {/* Company Registration / Profile Status Badge */}
          {onOpenCompanyProfile && (
            companyProfile?.isRegistered ? (
              <button
                id="btn-navbar-company-profile"
                onClick={onOpenCompanyProfile}
                title={`Registered Business: ${companyProfile.name} (Proprietor: ${companyProfile.ownerName} - ${companyProfile.city})`}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-md text-slate-900 text-xs font-black transition cursor-pointer shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate text-slate-900">{companyProfile.name}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-1 py-0.2 rounded font-extrabold hidden sm:inline">
                  ✓ Registered
                </span>
              </button>
            ) : (
              <button
                id="btn-navbar-register-company"
                onClick={onOpenCompanyProfile}
                title="Register your company profile to activate official ledger, payroll, and invoices"
                className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-400 px-2.5 py-1 rounded-md text-amber-950 text-xs font-black transition animate-pulse cursor-pointer shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-amber-950 font-black">🏢 Register Company</span>
              </button>
            )
          )}

          {/* PostgreSQL Online Database Connected Status Indicator */}
          <div
            title="PostgreSQL Online Database Connected. Multi-device live sync active."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black border bg-emerald-100 text-emerald-950 border-emerald-400 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="hidden sm:inline text-emerald-950 font-black">PostgreSQL Online</span>
          </div>

          {/* Active User / Multi-Device Login Trigger */}
          {currentUser && (
            <div className="flex items-center gap-1.5">
              {currentUser.role === 'Admin' && (
                <button
                  id="btn-navbar-invite-code"
                  onClick={() => handleTabChange('settings')}
                  title="View and manage employee invite codes in Settings"
                  className="hidden lg:flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:border-indigo-600 px-2.5 py-1 rounded-md text-indigo-950 dark:text-indigo-100 text-xs font-black transition cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-800 dark:text-indigo-300" />
                  <span className="text-indigo-950 dark:text-indigo-100 font-black">Invite Code</span>
                </button>
              )}

              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  title="Account and role profile"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-md text-slate-900 text-xs font-black transition shadow-xs cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                  <span className="hidden sm:inline text-slate-900 font-black">{currentUser?.name || 'User'}</span>
                  <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                    {currentUser?.role || currentRole}
                  </span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out and lock company session"
                  className="flex items-center gap-1 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2.5 py-1 rounded-md text-rose-950 text-xs font-black transition cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-700" />
                  <span className="hidden sm:inline text-rose-950 font-black">Logout</span>
                </button>
              )}
            </div>
          )}

          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsThemeDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-black rounded-md transition cursor-pointer shadow-xs"
              title="Change Theme (Creamish White / Light / Dark)"
            >
              <Palette className="w-3.5 h-3.5 text-amber-600" />
              <span>{activeThemeObj.icon}</span>
              <span className="hidden md:inline text-slate-900 font-bold">{activeThemeObj.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-600" />
            </button>

            {isThemeDropdownOpen && (
              <div className="theme-menu-popup absolute right-0 mt-1.5 w-64 rounded-xl shadow-2xl z-50 p-1.5 text-xs space-y-1 bg-white border border-slate-300 text-slate-900">
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  Select Theme (تھیم منتخب کریں)
                </div>
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (onThemeChange) onThemeChange(t.id);
                      setIsThemeDropdownOpen(false);
                    }}
                    className={`theme-item w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition cursor-pointer ${
                      currentTheme === t.id
                        ? 'theme-active bg-sky-100 border border-sky-400 text-sky-950 font-bold'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="text-base leading-none mt-0.5">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{t.name}</span>
                        {t.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-800 font-urdu font-bold">{t.urdu}</div>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onResetData && (
            <>
              {resetConfirming ? (
                <div className="flex items-center gap-1 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded">
                  <span className="text-red-300 text-[11px]">Wipe All Data?</span>
                  <button
                    onClick={() => {
                      onResetData();
                      setResetConfirming(false);
                    }}
                    className="px-2 py-0.5 bg-red-600 text-white rounded font-bold hover:bg-red-500 text-xs"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setResetConfirming(false)}
                    className="px-1 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResetConfirming(true)}
                  title="Wipe database to completely clean state for real manual entries"
                  className="flex items-center gap-1 text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded text-xs font-black shadow-xs transition"
                >
                  <RefreshCw className="w-3 h-3 text-red-700" />
                  <span className="hidden xl:inline text-red-900 font-black">Clear All / Clean Start</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleTabChange('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-xl text-white">
            {companyProfile?.name ? companyProfile.name.charAt(0).toUpperCase() : 'K'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white max-w-[200px] sm:max-w-[280px] truncate">
                {companyProfile?.name || 'KITCHENPRO'}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {companyProfile?.isRegistered ? 'AI LEDGER' : 'AI ERP'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block max-w-[320px] truncate">
              {companyProfile?.isRegistered
                ? `${companyProfile.ownerName} &bull; ${companyProfile.city} &bull; ${companyProfile.businessType}`
                : 'Restaurant Supply Management & AI Munshi Ledger'}
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search restaurant, order #, rice, oil, petrol..."
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchResults && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto p-2 text-xs"
              onMouseLeave={() => setShowSearchDropdown(false)}
            >
              {searchResults.restaurants && searchResults.restaurants.length > 0 && (
                <div className="mb-2">
                  <div className="font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Restaurants</div>
                  {searchResults.restaurants.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        if (onSearchSelect) onSearchSelect('restaurant', r.id);
                        setShowSearchDropdown(false);
                      }}
                      className="px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                    >
                      <span className="font-medium text-white">{r.name}</span>
                      <span className="text-amber-400">Bal: {currencySymbol()} {r.outstandingBalance?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.products && searchResults.products.length > 0 && (
                <div className="mb-2">
                  <div className="font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Products</div>
                  {searchResults.products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (onSearchSelect) onSearchSelect('product', p.id);
                        setShowSearchDropdown(false);
                      }}
                      className="px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                    >
                      <span className="font-medium text-white">{p.name} ({p.currentQuantity} {p.unit})</span>
                      <span className="text-emerald-400">Sell: {currencySymbol()} {p.sellingPrice}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.orders && searchResults.orders.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Orders</div>
                  {searchResults.orders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        if (onSearchSelect) onSearchSelect('order', o.id);
                        setShowSearchDropdown(false);
                      }}
                      className="px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                    >
                      <span className="font-medium text-white">{o.orderNumber} - {o.restaurantName}</span>
                      <span className="text-indigo-400">{currencySymbol()} {o.totalAmount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!searchResults.restaurants || searchResults.restaurants.length === 0) &&
                (!searchResults.products || searchResults.products.length === 0) &&
                (!searchResults.orders || searchResults.orders.length === 0) && (
                  <div className="px-3 py-4 text-center text-slate-400">No matching business records found.</div>
                )}
            </div>
          )}
        </div>

        {/* AI Action Triggers */}
        <div className="flex items-center gap-2.5">
          {/* Gemini API Key Button */}
          {onOpenGeminiKey && (
            <button
              onClick={onOpenGeminiKey}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-200 rounded-lg border border-slate-700 text-xs font-bold shadow-sm transition cursor-pointer"
              title="Google Gemini AI Studio API Key Configuration"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Gemini Key</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="AI Key Active" />
            </button>
          )}

          {/* Document OCR Button */}
          <button
            onClick={handleOpenOcr}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-white rounded-lg border border-slate-700 text-xs font-bold shadow-sm transition cursor-pointer"
            title="Scan paper slip or handwritten invoice"
          >
            <Camera className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">OCR Slips & Bills</span>
          </button>

          {/* AI Voice & Chat Assistant Button */}
          <button
            onClick={handleOpenAi}
            className="relative flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg shadow-md shadow-indigo-600/30 text-xs font-bold transition transform active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Bot className="w-4 h-4" />
            <span>AI Copilot</span>
            <span className="hidden lg:inline bg-indigo-800/80 px-1.5 py-0.5 rounded text-[10px] text-indigo-200">
              Voice / Urdu
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="px-4 flex items-center space-x-1 border-t border-slate-800/90 bg-slate-900 overflow-x-auto no-scrollbar">
        {navItems.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
              {tab.id === 'dashboard' && criticalAlerts.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ml-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
