import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, UserPlus, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  Admin:            '/',
  InventoryManager: '/inventory',
  Procurement:      '/purchase-orders',
  Production:       '/production',
  Sales:            '/sales',
  Finance:          '/invoices',
  QualityControl:   '/quality',
};

const ROLES = [
  {
    value: 'InventoryManager',
    label: 'Inventory Manager',
    desc: 'Stock, logistics, inventory planning',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'Procurement',
    label: 'Procurement',
    desc: 'Purchase orders, suppliers',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'Production',
    label: 'Production',
    desc: 'Production orders, bill of materials',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    value: 'Sales',
    label: 'Sales',
    desc: 'Sales orders, customers, invoices',
    color: 'bg-green-100 text-green-700',
  },
  {
    value: 'Finance',
    label: 'Finance',
    desc: 'Invoices, ledger, performance',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    value: 'QualityControl',
    label: 'Quality Control',
    desc: 'QC inspections, rejection records',
    color: 'bg-orange-100 text-orange-700',
  },
];

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'InventoryManager',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [showPassword, setShowPassword]              = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleMenu, setShowRoleMenu]               = useState(false);
  const [error, setError]                             = useState('');
  const [loading, setLoading]                         = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Navigate after user state updates (same fix as Login)
  useEffect(() => {
    if (user) {
      navigate(ROLE_HOME[user.role] || '/', { replace: true });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRole = ROLES.find(r => r.value === form.role) || ROLES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      // Navigation handled by useEffect above
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join OperaFlow ERP</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0"/>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="text" required autoComplete="name"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  placeholder="Abhay Singh"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="email" required autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type={showPassword ? 'text' : 'password'} required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type={showConfirmPassword ? 'text' : 'password'} required
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-300 focus:ring-red-300'
                      : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
                  }`}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Role selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your role</label>
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${selectedRole.color}`}>
                  {selectedRole.label}
                </span>
                <span className="text-gray-500 text-xs flex-1 text-left">{selectedRole.desc}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${showRoleMenu ? 'rotate-180' : ''}`}/>
              </button>

              {showRoleMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { set('role', r.value); setShowRoleMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${form.role === r.value ? 'bg-gray-50' : ''}`}
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${r.color}`}>{r.label}</span>
                      <span className="text-xs text-gray-500">{r.desc}</span>
                      {form.role === r.value && <span className="ml-auto text-gray-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note about Admin */}
            <p className="text-xs text-gray-400 -mt-1">
              Admin accounts can only be created by an existing Admin from User Management.
            </p>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Creating account…
                </span>
              ) : (
                <><UserPlus size={15}/> Create account</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
