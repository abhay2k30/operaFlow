import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, RefreshCw, Info, Building2, Calculator } from 'lucide-react';

// Holding cost rate presets for different risk profiles
const HOLDING_COST_PRESETS = [
  { label: 'Standard', value: 20, description: 'Typical for most businesses (20%)' },
  { label: 'Low Risk', value: 15, description: 'Stable products, reliable suppliers (15%)' },
  { label: 'High Risk', value: 30, description: 'Perishable or volatile items (30%)' },
  { label: 'Custom', value: null, description: 'Set your own percentage' },
];

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Chandigarh','Delhi','Jammu & Kashmir','Ladakh',
];

export default function Settings() {
  const { user }         = useAuth();
  const [org, setOrg]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    name: '', gstin: '', phone: '', email: '',
    address: { line1: '', city: '', state: 'Punjab', pincode: '' },
    planningDefaults: { orderingCost: 500, holdingRatePercent: 20, leadTimeDays: 7, safetyStockDays: 3 },
  });

  const [holdingPreset, setHoldingPreset] = useState('Standard');

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setOrg(data);
      const holdingRate = data.planningDefaults?.holdingRatePercent ?? 20;
      setForm({
        name:  data.name  || '',
        gstin: data.gstin || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || { line1:'', city:'', state:'Punjab', pincode:'' },
        planningDefaults: {
          orderingCost:        data.planningDefaults?.orderingCost       ?? 500,
          holdingRatePercent:  holdingRate,
          leadTimeDays:        data.planningDefaults?.leadTimeDays       ?? 7,
          safetyStockDays:     data.planningDefaults?.safetyStockDays    ?? 3,
        },
      });
      // Set preset based on value
      const preset = HOLDING_COST_PRESETS.find(p => p.value === holdingRate);
      setHoldingPreset(preset ? preset.label : 'Custom');
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm(f => ({ ...f, address: { ...f.address, [k]: v } }));
  const setPlan = (k, v) => setForm(f => ({ ...f, planningDefaults: { ...f.planningDefaults, [k]: Number(v) } }));

  const handleHoldingPresetChange = (presetLabel) => {
    setHoldingPreset(presetLabel);
    const preset = HOLDING_COST_PRESETS.find(p => p.label === presetLabel);
    if (preset && preset.value !== null) {
      setPlan('holdingRatePercent', preset.value);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400"><RefreshCw size={18} className="animate-spin mr-2"/>Loading…</div>;

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company profile and inventory planning defaults</p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          You are viewing settings in read-only mode. Only Admins can make changes.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Company profile */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-gray-400"/>
            <h2 className="font-semibold text-gray-900">Company Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} disabled={!isAdmin}
                placeholder="03AABCU9603R1ZX"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address.line1} onChange={e => setAddr('line1', e.target.value)} disabled={!isAdmin}
                placeholder="Street / area" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 mb-2"/>
              <div className="grid grid-cols-3 gap-2">
                <input value={form.address.city} onChange={e => setAddr('city', e.target.value)} disabled={!isAdmin}
                  placeholder="City" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
                <select value={form.address.state} onChange={e => setAddr('state', e.target.value)} disabled={!isAdmin}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white">
                  {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)} disabled={!isAdmin}
                  placeholder="Pincode" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
              </div>
            </div>
          </div>
        </div>

        {/* Planning defaults */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={16} className="text-gray-400"/>
            <h2 className="font-semibold text-gray-900">Inventory Planning Defaults</h2>
          </div>
          <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <Info size={13} className="mt-0.5 shrink-0"/>
            <span>
              These are the default values used to calculate <strong>EOQ</strong>, <strong>reorder points</strong> and <strong>safety stock</strong>
              across all products. You can override individual products' lead time and ordering cost from the Inventory → Products → Edit page.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordering Cost per PO (₹)
              </label>
              <input type="number" min="0" step="1" value={form.planningDefaults.orderingCost}
                onChange={e => setPlan('orderingCost', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
              <p className="text-xs text-gray-400 mt-1">Total cost to place one purchase order (transport, admin, etc.)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calculator size={14} className="inline mr-1"/>
                Holding Cost Rate (% / year)
              </label>
              <div className="space-y-2">
                <select value={holdingPreset} onChange={e => handleHoldingPresetChange(e.target.value)} disabled={!isAdmin}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white">
                  {HOLDING_COST_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" step="1"
                    value={form.planningDefaults.holdingRatePercent}
                    onChange={e => { setPlan('holdingRatePercent', e.target.value); setHoldingPreset('Custom'); }}
                    disabled={!isAdmin || holdingPreset !== 'Custom'}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400">
                  {HOLDING_COST_PRESETS.find(p => p.label === holdingPreset)?.description}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Lead Time (days)
              </label>
              <input type="number" min="0" step="1" value={form.planningDefaults.leadTimeDays}
                onChange={e => setPlan('leadTimeDays', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
              <p className="text-xs text-gray-400 mt-1">Days from placing a PO to receiving stock. Override per product for accuracy.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safety Stock Buffer (days of demand)
              </label>
              <input type="number" min="0" step="1" value={form.planningDefaults.safetyStockDays}
                onChange={e => setPlan('safetyStockDays', e.target.value)} disabled={!isAdmin}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
              <p className="text-xs text-gray-400 mt-1">Extra days of stock to buffer against demand spikes or supply delays.</p>
            </div>
          </div>
        </div>

        {/* Optimization Run */}
        {isAdmin && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={16} className="text-gray-400"/>
              <h2 className="font-semibold text-gray-900">Run Inventory Optimization</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Calculate EOQ, reorder points, safety stock, and ABC categories for all products based on transaction history.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const { data } = await api.post('/optimization/run');
                    alert(`Optimization complete!\n\nA items: ${data.aItems}\nB items: ${data.bItems}\nC items: ${data.cItems}\nItems needing reorder: ${data.itemsNeedingReorder}`);
                  } catch (err) {
                    alert('Optimization failed: ' + (err.response?.data?.error || err.message));
                  } finally { setSaving(false); }
                }}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <RefreshCw size={14} className="animate-spin"/> : <Calculator size={14}/>}
                {saving ? 'Running...' : 'Run Optimization'}
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data } = await api.post('/optimization/auto-criticality');
                    alert(`Criticality auto-assigned to ${data.updated} products`);
                  } catch (err) {
                    alert('Failed: ' + (err.response?.data?.error || err.message));
                  }
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Auto-assign criticality from ABC
              </button>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14}/>Saved!</span>}
          </div>
        )}
      </form>

      {/* Plan info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Account Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Plan</p>
            <p className="font-medium text-gray-800 capitalize">{org?.plan || 'trial'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Trial ends</p>
            <p className="font-medium text-gray-800">
              {org?.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Organisation ID</p>
            <p className="font-mono text-xs text-gray-500">{org?._id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
