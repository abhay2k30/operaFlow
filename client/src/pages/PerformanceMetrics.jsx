import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Star, TrendingUp, TrendingDown, RefreshCw, Users,
  Truck, AlertTriangle, CheckCircle, IndianRupee, Award
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function ScoreBadge({ score, grade, confidenceLevel }) {
  if (score == null) return <span className="text-xs text-gray-400">No data</span>;
  const config = {
    A: { bg: 'bg-green-100',  text: 'text-green-700',  bar: '#22c55e', label: 'Excellent' },
    B: { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: '#3b82f6', label: 'Good' },
    C: { bg: 'bg-amber-100',  text: 'text-amber-700',  bar: '#f59e0b', label: 'Average' },
    D: { bg: 'bg-red-100',    text: 'text-red-700',    bar: '#ef4444', label: 'Poor' },
  }[grade] || { bg: 'bg-gray-100', text: 'text-gray-500', bar: '#d1d5db', label: 'Unknown' };

  const confidenceConfig = {
    HIGH: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    LOW: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  }[confidenceLevel] || { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, score)}%`, background: config.bar }}/>
      </div>
      <div className="flex items-center gap-1.5 min-w-[120px]">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`} title={`${config.label} (${grade})`}>{grade}</span>
        <span className="text-sm font-mono font-semibold text-gray-700">{score}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceConfig.bg} ${confidenceConfig.text} border ${confidenceConfig.border}`} title="Confidence based on order count">
          {confidenceLevel}
        </span>
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <Icon size={40} className="mx-auto mb-3 opacity-25"/>
      <p>{message}</p>
    </div>
  );
}

// ── Supplier table ────────────────────────────────────────────────────────────

function SupplierTable({ data }) {
  const [search, setSearch] = useState('');
  const filtered = data.filter(s => s.supplier?.toLowerCase().includes(search.toLowerCase()));

  if (data.length === 0) return <EmptyState icon={Truck} message="No supplier data yet. Create purchase orders to see performance."/>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search supplier…"
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        <span className="text-xs text-gray-400" title="Scored using NS Narayanan Vendor Rating Method — Quality 57%, Delivery 43%">
          ℹ️ NS Narayanan Method
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left px-5 py-3">Supplier</th>
              <th className="text-right px-4 py-3">Orders</th>
              <th className="text-right px-4 py-3">Quality</th>
              <th className="text-right px-4 py-3">OTIF</th>
              <th className="text-right px-4 py-3">Fill Rate</th>
              <th className="text-right px-4 py-3">Avg Delay</th>
              <th className="px-5 py-3 min-w-[220px]">NS Narayanan Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{s.supplier}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-mono text-gray-800">{s.totalOrders}</p>
                  <p className="text-xs text-gray-400">{s.fulfilledOrders} fulfilled</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-semibold ${s.qualityScore >= 90 ? 'text-green-600' : s.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.qualityScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-semibold ${s.otifRate >= 80 ? 'text-green-600' : s.otifRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.otifRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-semibold ${s.fillRate >= 80 ? 'text-green-600' : s.fillRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.fillRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {s.avgDelayDays > 0 ? (
                    <span className={s.avgDelayDays > 5 ? 'text-red-500' : 'text-amber-500'}>{s.avgDelayDays}d</span>
                  ) : <span className="text-green-500">—</span>}
                </td>
                <td className="px-5 py-3">
                  <ScoreBadge score={s.finalScore} grade={s.grade} confidenceLevel={s.confidenceLevel}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top / bottom performers */}
      {data.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award size={14} className="text-green-600"/>
              <p className="text-xs font-semibold text-green-700 uppercase">
                {data[0].grade === 'A' || data[0].grade === 'B' ? 'Best Performer' : 'Highest Ranked'}
              </p>
            </div>
            <p className="font-semibold text-green-800">{data[0].supplier}</p>
            <p className="text-xs text-green-600 mt-0.5">Score: {data[0].finalScore} · Grade {data[0].grade}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-red-500"/>
              <p className="text-xs font-semibold text-red-600 uppercase">Needs Attention</p>
            </div>
            <p className="font-semibold text-red-800">{data[data.length - 1].supplier}</p>
            <p className="text-xs text-red-500 mt-0.5">Score: {data[data.length - 1].finalScore ?? '—'} · Grade {data[data.length - 1].grade}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Customer table ────────────────────────────────────────────────────────────

function CustomerTable({ data }) {
  const [search, setSearch] = useState('');
  const filtered = data.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  if (data.length === 0) return <EmptyState icon={Users} message="No customer data yet. Create sales orders to see performance."/>;

  const totalRevenue = data.reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search customer…"
        className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-right px-4 py-3">Orders</th>
              <th className="text-right px-4 py-3">Fulfilment Rate</th>
              <th className="text-right px-4 py-3">Cancellation Rate</th>
              <th className="text-right px-4 py-3">Revenue</th>
              <th className="text-right px-4 py-3">Revenue Share</th>
              <th className="text-right px-4 py-3">Pending</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const share = totalRevenue > 0 ? ((c.totalRevenue / totalRevenue) * 100).toFixed(1) : 0;
              return (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.gstin && <p className="text-xs text-gray-400 font-mono">{c.gstin}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono text-gray-800">{c.totalOrders}</p>
                    <p className="text-xs text-gray-400">{c.shippedOrders} shipped</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold ${c.fulfillmentRate >= 80 ? 'text-green-600' : c.fulfillmentRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {c.fulfillmentRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${c.cancellationRate > 20 ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                      {c.cancellationRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmt(c.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${share}%` }}/>
                      </div>
                      <span className="text-xs font-mono text-gray-600">{share}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-600">{fmt(c.pendingRevenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {data.length >= 1 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Top Customer</p>
            <p className="font-semibold text-gray-900">{data[0].name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmt(data[0].totalRevenue)} revenue</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Revenue (12m)</p>
            <p className="font-semibold text-gray-900">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Across {data.length} customers</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Fulfilment Rate</p>
            <p className="font-semibold text-gray-900">
              {(data.reduce((s, c) => s + c.fulfillmentRate, 0) / data.length).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-0.5">All customers</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function PerformanceMetrics() {
  const [tab, setTab]         = useState('supplier');
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/analytics/supplier-performance'),
        api.get('/analytics/customer-performance'),
      ]);
      setSuppliers(sRes.data);
      setCustomers(cRes.data);
    } catch (e) {
      setError('Could not load performance data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Metrics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Supplier and customer scorecards — last 12 months</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* Scoring methodology */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
        <Star size={13} className="mt-0.5 shrink-0 text-amber-400"/>
        <span>
          <strong>NS Narayanan Vendor Rating:</strong> Quality Score × 57% + Delivery Score × 43%.
          Delivery = OTIF×60% + Fill Rate×40%.
          &nbsp;<strong>Grades:</strong> A ≥85 · B ≥70 · C ≥55 · D &lt;55.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'supplier', label: 'Supplier Performance', icon: Truck, count: suppliers.length },
          { id: 'customer', label: 'Customer Performance', icon: Users, count: customers.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15}/>
            {t.label}
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
          <RefreshCw size={18} className="animate-spin"/> Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={16}/> {error}
        </div>
      ) : tab === 'supplier' ? (
        <SupplierTable data={suppliers}/>
      ) : (
        <CustomerTable data={customers}/>
      )}
    </div>
  );
}
