import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Search, Building2, Phone, Mail, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';

const INDIA_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },          { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },     { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },           { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },   { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },          { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },        { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },         { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },       { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },     { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },          { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },     { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },             { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },      { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

const EMPTY_FORM = {
  name: '', type: 'Supplier', gstin: '', pan: '', phone: '', email: '',
  address: { line1: '', city: '', state: 'Punjab', stateCode: '03', pincode: '' },
  creditDays: 30, paymentTerms: 'Net 30',
  bankDetails: { accountName: '', accountNo: '', ifsc: '', bank: '', branch: '' },
  notes: ''
};

const Badge = ({ type }) => {
  const colors = {
    Supplier: 'bg-blue-100 text-blue-700',
    Customer: 'bg-green-100 text-green-700',
    Both:     'bg-purple-100 text-purple-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || ''}`}>{type}</span>;
};

export default function Parties() {
  const [parties, setParties]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterType, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchParties(); }, [filterType]);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'All') params.type = filterType;
      const { data } = await api.get('/parties', { params });
      setParties(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditParty(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit   = (p) => {
    setEditParty(p);
    setForm({
      name: p.name, type: p.type, gstin: p.gstin || '', pan: p.pan || '',
      phone: p.phone || '', email: p.email || '',
      address: p.address || { line1:'', city:'', state:'Punjab', stateCode:'03', pincode:'' },
      creditDays: p.creditDays || 30, paymentTerms: p.paymentTerms || 'Net 30',
      bankDetails: p.bankDetails || { accountName:'', accountNo:'', ifsc:'', bank:'', branch:'' },
      notes: p.notes || ''
    });
    setError('');
    setShowModal(true);
  };

  const setAddr  = (k, v) => setForm(f => ({ ...f, address:     { ...f.address,     [k]: v } }));
  const setBank  = (k, v) => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, [k]: v } }));

  // Auto-fill state code when state changes
  const handleStateChange = (stateName) => {
    const st = INDIA_STATES.find(s => s.name === stateName);
    setAddr('state', stateName);
    if (st) setAddr('stateCode', st.code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editParty) {
        await api.put(`/parties/${editParty._id}`, form);
      } else {
        await api.post('/parties', form);
      }
      setShowModal(false);
      fetchParties();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save party');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this party?')) return;
    await api.delete(`/parties/${id}`);
    fetchParties();
  };

  const filtered = parties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.gstin || '').includes(search.toUpperCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parties</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suppliers and customers master data</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus size={16} /> Add Party
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or GSTIN…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {['All','Supplier','Customer','Both'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${filterType === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No parties found. Add your first supplier or customer.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GSTIN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Credit Days</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <React.Fragment key={p._id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3"><Badge type={p.type} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.gstin || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {p.phone && <span className="flex items-center gap-1 text-gray-600"><Phone size={11}/>{p.phone}</span>}
                        {p.email && <span className="flex items-center gap-1 text-gray-600"><Mail size={11}/>{p.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.address?.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.creditDays}d</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          {expanded === p._id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit2 size={14}/></button>
                        <button onClick={() => handleDeactivate(p._id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><X size={14}/></button>
                      </div>
                    </td>
                  </tr>
                  {expanded === p._id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Address</p>
                            <p className="text-gray-600">{[p.address?.line1, p.address?.city, p.address?.state, p.address?.pincode].filter(Boolean).join(', ') || '—'}</p>
                            {p.pan && <p className="text-gray-600 mt-1">PAN: <span className="font-mono">{p.pan}</span></p>}
                            {p.notes && <p className="text-gray-500 mt-1 italic">{p.notes}</p>}
                          </div>
                          {p.bankDetails?.accountNo && (
                            <div>
                              <p className="font-semibold text-gray-700 mb-2">Bank Details</p>
                              <p className="text-gray-600">{p.bankDetails.bank} — {p.bankDetails.branch}</p>
                              <p className="text-gray-600 font-mono">{p.bankDetails.accountNo}</p>
                              <p className="text-gray-600">IFSC: {p.bankDetails.ifsc}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editParty ? 'Edit Party' : 'Add New Party'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Supplier</option><option>Customer</option><option>Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                  <input type="number" min="0" value={form.creditDays} onChange={e => setForm({...form, creditDays: Number(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})}
                    placeholder="e.g. 03AABCU9603R1ZX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input value={form.pan} onChange={e => setForm({...form, pan: e.target.value.toUpperCase()})}
                    placeholder="AABCU9603R"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input value={form.address.line1} onChange={e => setAddr('line1', e.target.value)}
                      placeholder="Street / Area"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <input value={form.address.city} onChange={e => setAddr('city', e.target.value)}
                    placeholder="City"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={form.address.state} onChange={e => handleStateChange(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {INDIA_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                  <input value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)}
                    placeholder="Pincode"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Bank Details (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.bankDetails.accountName} onChange={e => setBank('accountName', e.target.value)}
                    placeholder="Account name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.bankDetails.accountNo} onChange={e => setBank('accountNo', e.target.value)}
                    placeholder="Account number"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.bankDetails.ifsc} onChange={e => setBank('ifsc', e.target.value.toUpperCase())}
                    placeholder="IFSC code"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.bankDetails.bank} onChange={e => setBank('bank', e.target.value)}
                    placeholder="Bank name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.bankDetails.branch} onChange={e => setBank('branch', e.target.value)}
                    placeholder="Branch"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving…' : editParty ? 'Update Party' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
