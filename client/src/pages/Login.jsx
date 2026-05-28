import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react';

// Where each role lands after login
const ROLE_HOME = {
  Admin:            '/',
  InventoryManager: '/inventory',
  Procurement:      '/purchase-orders',
  Production:       '/production',
  Sales:            '/sales',
  Finance:          '/invoices',
  QualityControl:   '/quality',
};

const DEMO_ACCOUNTS = [
  { role: 'Admin',      email: 'admin@operaflow.in',      pass: 'admin123',   color: 'bg-red-100 text-red-700' },
  { role: 'Inventory',  email: 'inventory@operaflow.in',  pass: 'inv123',     color: 'bg-blue-100 text-blue-700' },
  { role: 'Procure',    email: 'purchase@operaflow.in',   pass: 'proc123',    color: 'bg-amber-100 text-amber-700' },
  { role: 'Production', email: 'production@operaflow.in', pass: 'prod123',    color: 'bg-purple-100 text-purple-700' },
  { role: 'Sales',      email: 'sales@operaflow.in',      pass: 'sales123',   color: 'bg-green-100 text-green-700' },
  { role: 'Finance',    email: 'finance@operaflow.in',    pass: 'fin123',     color: 'bg-teal-100 text-teal-700' },
  { role: 'QC',         email: 'quality@operaflow.in',    pass: 'quality123', color: 'bg-orange-100 text-orange-700' },
];

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // ── KEY FIX: navigate AFTER React has applied the new user state ──
  // We watch `user` in context. Once it's set (after a successful login),
  // this effect fires and does the navigation. This avoids the race condition
  // where navigate() ran before setUser() had propagated to ProtectedRoute.
  useEffect(() => {
    if (user) {
      navigate(ROLE_HOME[user.role] || '/', { replace: true });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const doLogin = async (emailVal, passVal) => {
    setError('');
    setLoading(true);
    try {
      await login(emailVal, passVal);
      // Navigation is handled by the useEffect above — do NOT navigate here
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error   ||
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error'
          ? 'Cannot reach the server. Make sure the backend is running:\n  cd server && npm run dev'
          : 'Invalid email or password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    doLogin(email, password);
  };

  // Click a demo row → log in immediately, no second click needed
  const handleDemoLogin = (d) => {
    setEmail(d.email);
    setPassword(d.pass);
    doLogin(d.email, d.pass);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">OperaFlow ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        {/* Login card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0"/>
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="email" required autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="password" required autoComplete="current-password"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Signing in…
                </span>
              ) : (
                <><LogIn size={15}/> Sign in</>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Quick login — demo accounts
          </p>
          <p className="text-[11px] text-gray-400 mb-3">
            Click any row to sign in instantly.
            First time? Run <code className="bg-gray-100 px-1 rounded font-mono">node seedAdmin.js</code> in the server folder.
          </p>
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map(d => (
              <button
                key={d.role}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(d)}
                className="w-full flex items-center gap-2.5 text-left hover:bg-gray-50 active:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${d.color}`}>
                  {d.role}
                </span>
                <span className="text-xs text-gray-600 font-mono truncate flex-1">{d.email}</span>
                <span className="text-[10px] text-gray-300 shrink-0 group-hover:text-gray-500 font-mono">{d.pass}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Need an account?{' '}
          <Link to="/register-company" className="text-gray-700 font-medium hover:underline">Register</Link>
        </p>

      </div>
    </div>
  );
}
