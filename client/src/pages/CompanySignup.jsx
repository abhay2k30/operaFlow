import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, MapPin, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Chandigarh','Delhi','Jammu & Kashmir','Ladakh',
];

const STEPS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'admin',   label: 'Admin',   icon: User },
  { id: 'done',    label: 'Done',    icon: CheckCircle },
];

export default function CompanySignup() {
  const [step, setStep]         = useState(0); // 0=company, 1=admin, 2=done
  const [form, setForm]         = useState({
    // Company
    companyName: '', gstin: '', companyPhone: '', companyEmail: '',
    line1: '', city: '', state: 'Punjab', pincode: '',
    // Admin
    adminName: '', adminEmail: '', adminPassword: '', adminConfirm: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateCompany = () => {
    if (!form.companyName.trim()) return 'Company name is required';
    return null;
  };
  const validateAdmin = () => {
    if (!form.adminName.trim())   return 'Admin name is required';
    if (!form.adminEmail.trim())  return 'Admin email is required';
    if (form.adminPassword.length < 6) return 'Password must be at least 6 characters';
    if (form.adminPassword !== form.adminConfirm) return 'Passwords do not match';
    return null;
  };

  const nextStep = () => {
    setError('');
    const err = step === 0 ? validateCompany() : validateAdmin();
    if (err) { setError(err); return; }
    if (step === 0) { setStep(1); return; }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register-company', {
        companyName:   form.companyName,
        gstin:         form.gstin         || undefined,
        companyPhone:  form.companyPhone  || undefined,
        companyEmail:  form.companyEmail  || undefined,
        line1:         form.line1         || undefined,
        city:          form.city          || undefined,
        state:         form.state         || undefined,
        pincode:       form.pincode       || undefined,
        adminName:     form.adminName,
        adminEmail:    form.adminEmail,
        adminPassword: form.adminPassword,
      });
      // Store token and user — useEffect will navigate
      localStorage.setItem('token', data.token);
      // Manually trigger auth context update via login flow
      // (we already have token, just set the user)
      setStep(2);
      setTimeout(() => {
        window.location.href = '/'; // hard reload so AuthContext re-reads token
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
      setStep(1);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register your company</h1>
          <p className="text-sm text-gray-500 mt-1">Set up OperaFlow ERP for your manufacturing business</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-black text-white' :
                i < step   ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                <s.icon size={13}/> {s.label}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`}/>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 2 — Success */}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600"/>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Company registered!</h2>
            <p className="text-sm text-gray-500 mb-1">
              <strong>{form.companyName}</strong> is all set up.
            </p>
            <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
            <div className="mt-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"/>
            </div>
          </div>
        )}

        {/* Step 0 — Company details */}
        {step === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Building2 size={18} className="text-gray-400"/>
              <h2 className="font-semibold text-gray-900">Company details</h2>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / Firm name *</label>
                <input type="text" required value={form.companyName} onChange={e => set('companyName', e.target.value)}
                  placeholder="Abhay Industries Pvt Ltd"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
                  <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())}
                    placeholder="03AABCU9603R1ZX"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input type="tel" value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company email</label>
                <input type="email" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)}
                  placeholder="info@yourcompany.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input value={form.line1} onChange={e => set('line1', e.target.value)}
                  placeholder="Street / area / industrial estate"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"/>
                <div className="grid grid-cols-3 gap-2">
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="City"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <select value={form.state} onChange={e => set('state', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                    {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={form.pincode} onChange={e => set('pincode', e.target.value)}
                    placeholder="Pincode"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
              </div>
            </div>

            <button onClick={nextStep}
              className="w-full mt-5 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors">
              Continue →
            </button>
          </div>
        )}

        {/* Step 1 — Admin account */}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <User size={18} className="text-gray-400"/>
              <h2 className="font-semibold text-gray-900">Create admin account</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              This will be the owner account. You can add staff accounts later from inside the app.
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your full name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="text" required value={form.adminName} onChange={e => set('adminName', e.target.value)}
                    placeholder="Abhay Singh"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your email (login email) *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="email" required value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                    placeholder="admin@yourcompany.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type={showPass ? 'text' : 'password'} required value={form.adminPassword}
                    onChange={e => set('adminPassword', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password *</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type={showConf ? 'text' : 'password'} required value={form.adminConfirm}
                    onChange={e => set('adminConfirm', e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      form.adminConfirm && form.adminPassword !== form.adminConfirm
                        ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-gray-900'
                    }`}/>
                  <button type="button" onClick={() => setShowConf(!showConf)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConf ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {form.adminConfirm && form.adminPassword !== form.adminConfirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setStep(0); setError(''); }}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                ← Back
              </button>
              <button onClick={nextStep} disabled={loading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Creating…
                  </span>
                ) : 'Create company'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
