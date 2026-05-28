import React, { useEffect, useState } from 'react';
import { Plus, Edit2, X, Shield, User, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'InventoryManager', label: 'Inventory Manager', color: 'bg-blue-100 text-blue-700' },
  { value: 'Procurement',      label: 'Procurement',       color: 'bg-amber-100 text-amber-700' },
  { value: 'Production',       label: 'Production',        color: 'bg-purple-100 text-purple-700' },
  { value: 'Sales',            label: 'Sales',             color: 'bg-green-100 text-green-700' },
  { value: 'Finance',          label: 'Finance',           color: 'bg-teal-100 text-teal-700' },
  { value: 'QualityControl',   label: 'Quality Control',   color: 'bg-orange-100 text-orange-700' },
];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'InventoryManager' };

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Admin</span>;
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.color}`}>{r.label}</span>;
}

export default function AdminUsers() {
  const { user: me }          = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowPass(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setError('');
    setShowPass(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editing && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, email: form.email, role: form.role };
        if (form.password.trim()) body.password = form.password;
        await api.put(`/users/${editing._id}`, body);
      } else {
        await api.post('/users', form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save user');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (u._id === me?._id) return;
    try {
      if (u.isActive) {
        await api.delete(`/users/${u._id}`);
      } else {
        await api.put(`/users/${u._id}`, { isActive: true });
      }
      fetchUsers();
    } catch (e) { alert(e.response?.data?.error || 'Failed to update user'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage staff accounts for your organisation.
            All accounts are scoped to your company only.
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus size={15}/> Add user
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
        <Shield size={15} className="mt-0.5 shrink-0"/>
        <span>
          Users you create here can only see data belonging to <strong>your company</strong>.
          They cannot sign up themselves — you distribute their credentials after creating the account.
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Last login</th>
                <th className="px-5 py-3"/>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <User size={13}/>
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                      {u._id === me?._id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">You</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={u.role}/></td>
                  <td className="px-5 py-3">
                    {u.isActive
                      ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={12}/>Active</span>
                      : <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><XCircle size={12}/>Inactive</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(u)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                        <Edit2 size={13}/>
                      </button>
                      {u._id !== me?._id && (
                        <button onClick={() => toggleActive(u)}
                          className={`p-1.5 rounded text-gray-400 ${u.isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-500'}`}
                          title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                          {u.isActive ? <X size={13}/> : <CheckCircle size={13}/>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit user' : 'Add new user'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ravi Kumar"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="ravi@yourcompany.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password {editing && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'}
                    required={!editing}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder={editing ? 'Enter new password to change' : 'Min. 6 characters'}
                    className="w-full pr-10 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Update user' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
