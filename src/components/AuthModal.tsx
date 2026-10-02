import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { ShieldCheck, UserCheck, KeyRound, UserPlus, LogIn, AlertCircle, Laptop, Wifi, CheckCircle2, Trash2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User) => void;
  usersList: User[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  usersList,
}) => {
  // Filter out any dummy placeholder users from initial development
  const DUMMY_IDS = ['usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'];
  const DUMMY_USERNAMES = ['accountant', 'manager', 'sales'];
  const realUsers = usersList.filter(
    (u) => !DUMMY_IDS.includes(u.id) && !DUMMY_USERNAMES.includes((u.username || '').toLowerCase())
  );

  const [tab, setTab] = useState<'login' | 'register' | 'accounts'>(
    realUsers.length > 0 ? 'login' : 'register'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = async (user: User) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(user.username || user.name, user.password || 'admin');
      onUserChange(res.user);
      setSuccessMsg(`Welcome, ${res.user.name}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 500);
    } catch (err: any) {
      // Fallback for offline or local session
      onUserChange(user);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter username or email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username.trim(), password);
      onUserChange(res.user);
      setSuccessMsg(`Logged in successfully as ${res.user.name}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setError('Please fill in both Name and Username.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim() || undefined,
        password: password || 'admin',
        role,
      });
      onUserChange(res.user);
      setSuccessMsg(`Account "${res.user.name}" created successfully!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete user "${u.name}" (${u.username})?`)) {
      try {
        await api.deleteUser(u.id);
        setSuccessMsg(`User "${u.name}" deleted.`);
        setTimeout(() => setSuccessMsg(null), 1500);
      } catch (err: any) {
        setError(err.message || 'Could not delete user');
      }
    }
  };

  const roleColors: Record<UserRole, string> = {
    Admin: 'bg-rose-100 text-rose-800 border-rose-200',
    Manager: 'bg-amber-100 text-amber-800 border-amber-200',
    'Order Taker': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Inventory Staff': 'bg-blue-100 text-blue-800 border-blue-200',
    Accountant: 'bg-purple-100 text-purple-800 border-purple-200',
    Employee: 'bg-teal-100 text-teal-800 border-teal-200',
    Viewer: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">User Login & Account</h2>
              <p className="text-xs text-slate-300">Access same data across multiple devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sync Info Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
          <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Multi-Device Sync:</strong> Same username/password se kisi bhi doosre laptop ya phone par login karein to sara hisaab sync rehta hai.
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-2">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'login'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Login
          </button>

          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'register'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>

          {realUsers.length > 0 && (
            <button
              onClick={() => { setTab('accounts'); setError(null); }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === 'accounts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Saved Accounts ({realUsers.length})
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-900">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Apna username enter karein (e.g. hanan123)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password enter karein"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Logging in...' : 'Sign In'}
              </button>

              {realUsers.length > 0 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setTab('accounts')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Ya saved accounts mein se kisi account par 1-click login karein
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: REGISTER / CREATE NEW ACCOUNT */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muhammad Hannan"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. hanan123"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Role / Position
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  >
                    <option value="Admin">Admin (Owner / Full Access)</option>
                    <option value="Manager">Manager (Supervision)</option>
                    <option value="Order Taker">Order Taker (Sales)</option>
                    <option value="Inventory Staff">Inventory Staff (Stock)</option>
                    <option value="Accountant">Accountant (Ledger)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Apna password banayein"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* TAB 3: REAL SAVED ACCOUNTS */}
          {tab === 'accounts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Aapke banaye huway accounts. Kisi bhi account par click kar k foran switch karein:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {realUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleQuickLogin(u)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {u.name}
                            {isCurrent && (
                              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                Logged In
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            Username: <code className="text-indigo-700 font-mono font-semibold">{u.username}</code>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${roleColors[u.role]}`}>
                          {u.role}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteUser(u, e)}
                          title="Delete account"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-slate-500" />
            <span>Works across all devices</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
