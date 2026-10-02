import React, { useState } from 'react';
import {
  Building2,
  KeyRound,
  UserPlus,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Palette,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { AppTheme } from './Navbar';

interface AuthEntryViewProps {
  onAuthenticated: (user: User, company: any, token: string) => void;
  currentTheme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const AuthEntryView: React.FC<AuthEntryViewProps> = ({
  onAuthenticated,
  currentTheme = 'cream',
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'create_company' | 'join_company' | 'reset_password'>('login');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const themeOptions: { id: AppTheme; name: string; urdu: string; icon: string }[] = [
    { id: 'cream', name: 'Creamish White', urdu: 'آئیوری کریم (لائٹ)', icon: '🍦' },
    { id: 'pearl', name: 'Pearl Slate', urdu: 'پرل سلور (کول لائٹ)', icon: '💎' },
    { id: 'sand', name: 'Warm Sand', urdu: 'وارم سینڈ (لیٹے)', icon: '☕' },
    { id: 'dark', name: 'Midnight Slate', urdu: 'مڈ نائٹ (ڈارک موڈ)', icon: '🌙' },
  ];

  const activeThemeObj = themeOptions.find((t) => t.id === currentTheme) || themeOptions[0];
  const isDark = currentTheme === 'dark';

  // Theme-aware styles for crisp contrast in both Light (Cream/Pearl/Sand) and Dark (Midnight)
  const inputWithIconClass = isDark
    ? "w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
    : "w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs transition-all";

  const inputWithSmallIconClass = isDark
    ? "w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
    : "w-full pl-9 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs";

  const inputStandardClass = isDark
    ? "w-full px-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
    : "w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs";

  const inviteCodeInputClass = isDark
    ? "w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-indigo-500/50 rounded-xl text-white placeholder-slate-500 font-mono text-base tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
    : "w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-indigo-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono text-base tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs";

  const labelClass = isDark
    ? "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
    : "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

  const labelMb2Class = isDark
    ? "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
    : "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2";

  const inputIconClass = isDark ? "text-slate-500" : "text-slate-400";

  const handleSelectTheme = (themeId: AppTheme) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
      if (document.body) {
        document.body.setAttribute('data-theme', themeId);
      }
      try {
        localStorage.setItem('erp_theme', themeId);
      } catch (e) {}
    }
    setShowThemeMenu(false);
  };

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Reset Password form state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Create Company form state
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [currency, setCurrency] = useState('AED');

  // Join Company form state
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Clear messages on tab change
  const handleTabChange = (tab: 'login' | 'create_company' | 'join_company' | 'reset_password') => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim() || !resetNewPassword) {
      setError('Please enter your username/email and new password.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (resetConfirmPassword && resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.resetPassword(resetIdentifier.trim(), resetNewPassword);
      setSuccessMsg(res.message || 'Password updated successfully! Logging you in...');
      if (res.user && res.company && res.token) {
        setTimeout(() => {
          onAuthenticated(res.user!, res.company, res.token!);
        }, 600);
      } else {
        const loginRes = await api.login(resetIdentifier.trim(), resetNewPassword);
        setTimeout(() => {
          onAuthenticated(loginRes.user, loginRes.company, loginRes.token);
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login(loginIdentifier.trim(), loginPassword);
      setSuccessMsg(res.message || `Welcome back, ${res.user.name}!`);
      setTimeout(() => {
        onAuthenticated(res.user, res.company, res.token);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !ownerName.trim() || !createUsername.trim() || !createPassword) {
      setError('Please fill in Company Name, Owner Name, Username, and Password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.createCompany({
        companyName: companyName.trim(),
        ownerName: ownerName.trim(),
        username: createUsername.trim().toLowerCase(),
        email: createEmail.trim() || undefined,
        password: createPassword,
        phone: companyPhone.trim() || undefined,
        city: companyCity.trim() || undefined,
        currency: currency || 'AED',
      });
      setSuccessMsg(res.message || `Company "${res.company.name}" created successfully!`);
      setTimeout(() => {
        onAuthenticated(res.user, res.company, res.token);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Failed to create company.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Join Company
  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !joinName.trim() || !joinUsername.trim() || !joinPassword) {
      setError('Please fill in Invite Code, Full Name, Username, and Password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.joinCompany({
        inviteCode: inviteCode.trim().toUpperCase(),
        name: joinName.trim(),
        username: joinUsername.trim().toLowerCase(),
        email: joinEmail.trim() || undefined,
        password: joinPassword,
      });
      setSuccessMsg(res.message || `Joined "${res.company.name}" successfully!`);
      setTimeout(() => {
        onAuthenticated(res.user, res.company, res.token);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Failed to join company. Please check your invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* Quick Theme Switcher at Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowThemeMenu((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer backdrop-blur-md ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                : 'bg-white/95 hover:bg-white border-slate-300 text-slate-800'
            }`}
            title="Switch Theme (تھیم تبدیل کریں)"
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>{activeThemeObj.icon}</span>
            <span className="hidden sm:inline font-bold">{activeThemeObj.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showThemeMenu && (
            <div
              className={`absolute right-0 mt-1.5 w-56 border rounded-2xl shadow-2xl p-1.5 z-50 text-xs space-y-1 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
              }`}>
                Select Theme (تھیم منتخب کریں)
              </div>
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTheme(t.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-start gap-2.5 transition cursor-pointer ${
                    currentTheme === t.id
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 font-bold'
                      : (isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{t.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-urdu">{t.urdu}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/10 dark:bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-xl shadow-indigo-500/25 mb-4 border border-indigo-400/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className={`auth-header-title text-3xl font-black tracking-tight sm:text-4xl ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Restaurant & Wholesale Supply ERP
          </h1>
          <p className={`auth-header-subtitle mt-2 text-sm font-medium ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Multi-Tenant Enterprise Cloud &bull; Isolated Database & AI Munshi
          </p>
        </div>

        {/* Auth Container Card */}
        <div className={`auth-card rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 border ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200/90'
        }`}>
          {/* Tab Navigation */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 p-1.5 gap-1 border-b ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs sm:text-sm font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80')
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('create_company')}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs sm:text-sm font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'create_company'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80')
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Company</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('join_company')}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs sm:text-sm font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'join_company'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80')
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Join with Code</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('reset_password')}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs sm:text-sm font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'reset_password'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80')
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Reset Password</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Feedback Notifications */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{successMsg}</div>
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className={labelMb2Class}>
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. hunny78 or yourname@company.com"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetIdentifier(loginIdentifier);
                        handleTabChange('reset_password');
                      }}
                      className={`text-xs transition-colors cursor-pointer ${
                        isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800 font-semibold'
                      }`}
                    >
                      Forgot / Reset Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>Sign In to Your Company</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    The system automatically routes you to your registered company with full data isolation.
                  </p>
                </div>
              </form>
            )}

            {/* TAB 2: CREATE NEW COMPANY */}
            {activeTab === 'create_company' && (
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  isDark ? 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                }`}>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span>You will become the Company Owner & Admin with full control over all operations.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Company / Karobar Name *
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${inputIconClass}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Al-Madina Food Supplies"
                        className={inputWithSmallIconClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Owner Full Name *
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${inputIconClass}`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Muhammad Usman"
                        className={inputWithSmallIconClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="e.g. usman_admin"
                      className={inputStandardClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password *
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${inputIconClass}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className={inputWithSmallIconClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="owner@company.com"
                      className={inputStandardClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+971 / 0300..."
                      className={inputStandardClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      City / Region
                    </label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="e.g. Dubai / Lahore"
                      className={inputStandardClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Create Company & Open Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: JOIN COMPANY VIA INVITE CODE */}
            {activeTab === 'join_company' && (
              <form onSubmit={handleJoinCompany} className="space-y-4">
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  isDark ? 'bg-blue-950/40 border border-blue-500/20 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  <KeyRound className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span>Enter the 8-character Invite Code provided by your Company Admin to join.</span>
                </div>

                <div>
                  <label className={labelClass}>
                    Company Invite Code * (e.g. X7K9-P2M4)
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <KeyRound className="w-5 h-5 text-indigo-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="X7K9-P2M4"
                      maxLength={12}
                      className={inviteCodeInputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className={inputStandardClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="e.g. tariq_sales"
                      className={inputStandardClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={joinEmail}
                      onChange={(e) => setJoinEmail(e.target.value)}
                      placeholder="tariq@company.com"
                      className={inputStandardClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Create your password"
                      className={inputStandardClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Join Company as Employee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: RESET PASSWORD */}
            {activeTab === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  <KeyRound className={`w-5 h-5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>Enter your username or email and choose your new password. You will be logged in immediately.</span>
                </div>

                <div>
                  <label className={labelMb2Class}>
                    Username or Email *
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="e.g. hunny78 or yourname@company.com"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelMb2Class}>
                    New Password * (Min 6 characters)
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelMb2Class}>
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${inputIconClass}`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-5 h-5" />
                        <span>Update Password & Log In</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className={`text-xs py-1.5 transition-colors text-center ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    &larr; Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Security & Isolation Footer Notice */}
        <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Strict Multi-Tenant Database Isolation &bull; End-to-End Enterprise Security</span>
        </div>
      </div>
    </div>
  );
};
