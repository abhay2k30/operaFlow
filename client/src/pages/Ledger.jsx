import React, { useEffect, useState } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, IndianRupee, Plus, X } from 'lucide-react';
import api from '../utils/api';

const TYPE_META = {
  Payable:    { label: 'Payable',    color: 'bg-red-100 text-red-700',    dir: 'out' },
  Receivable: { label: 'Receivable', color: 'bg-green-100 text-green-700', dir: 'in'  },
  Expense:    { label: 'Expense',    color: 'bg-orange-100 text-orange-700', dir: 'out' },
  Income:     { label: 'Income',     color: 'bg-teal-100 text-teal-700',   dir: 'in'  },
  Journal:    { label: 'Journal',    color: 'bg-gray-100 text-gray-600',   dir: 'n'   },
};

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Ledger = () => {
    const [entries, setEntries]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [showModal, setShowModal]   = useState(false);
    const [form, setForm]             = useState({ type: 'Payable', amount: '', description: '' });
    const [saving, setSaving]         = useState(false);

    useEffect(() => { fetchLedger(); }, []);

    const fetchLedger = async () => {
        try {
            const { data } = await api.get('/ledger');
            setEntries(data);
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/ledger', form);
            setShowModal(false);
            setForm({ type: 'Payable', amount: '', description: '' });
            fetchLedger();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create entry');
        } finally { setSaving(false); }
    };

    const totalReceivable = entries.filter(e => ['Receivable','Income'].includes(e.type)).reduce((s,e)=>s+e.amount,0);
    const totalPayable    = entries.filter(e => ['Payable','Expense'].includes(e.type)).reduce((s,e)=>s+e.amount,0);
    const outstanding     = entries.filter(e => e.status === 'Open').length;

    const filtered = entries.filter(e =>
        !search || (e.description||'').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">General Ledger</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track all financial entries in INR</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                    <Plus size={15}/> Add Entry
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><ArrowDownLeft size={20}/></div>
                        <div>
                            <p className="text-xs text-gray-500">Total Receivable / Income</p>
                            <p className="text-xl font-bold text-gray-800">{fmt(totalReceivable)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><ArrowUpRight size={20}/></div>
                        <div>
                            <p className="text-xs text-gray-500">Total Payable / Expense</p>
                            <p className="text-xl font-bold text-gray-800">{fmt(totalPayable)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${totalReceivable - totalPayable >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            <IndianRupee size={20}/>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Net Balance</p>
                            <p className={`text-xl font-bold ${totalReceivable - totalPayable >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {fmt(totalReceivable - totalPayable)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search entries…"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            <th className="text-left px-5 py-3">Date</th>
                            <th className="text-left px-4 py-3">Type</th>
                            <th className="text-left px-4 py-3">Description</th>
                            <th className="text-right px-5 py-3">Amount</th>
                            <th className="text-left px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">No entries found.</td></tr>
                        ) : filtered.map((entry, i) => {
                            const meta = TYPE_META[entry.type] || TYPE_META.Journal;
                            return (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                                        {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                                            {meta.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{entry.description || '—'}</td>
                                    <td className="px-5 py-3 text-right font-mono font-semibold">
                                        <span className={meta.dir === 'in' ? 'text-green-600' : meta.dir === 'out' ? 'text-red-600' : 'text-gray-700'}>
                                            {meta.dir === 'in' ? '+' : meta.dir === 'out' ? '−' : ''}{fmt(entry.amount)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            entry.status === 'Settled' ? 'bg-green-100 text-green-700' :
                                            entry.status === 'Voided'  ? 'bg-gray-100 text-gray-500' :
                                            'bg-amber-100 text-amber-700'}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add Entry Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Add Ledger Entry</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                <input type="number" min="0" step="0.01" required value={form.amount}
                                    onChange={e => setForm({...form, amount: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Add Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ledger;
