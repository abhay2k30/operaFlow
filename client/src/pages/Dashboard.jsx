import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle, Package, TrendingDown, TrendingUp, Clock,
  ShoppingCart, Factory, IndianRupee, RefreshCw, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function KPI({ label, value, sub, color = 'text-gray-900', icon: Icon, iconColor = 'text-gray-400' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}><Icon size={18}/></div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis]       = useState(null);
  const [prod, setProd]       = useState(null);
  const [inv, setInv]         = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors]   = useState([]);

  const load = async () => {
    setLoading(true);
    const errs = [];
    const safe = async (fn, label) => { try { return await fn(); } catch(e) { errs.push(label); return null; } };

    const [k, p, i, a] = await Promise.all([
      safe(() => api.get('/analytics/kpi').then(r => r.data),        'KPIs'),
      safe(() => api.get('/analytics/production').then(r => r.data), 'Production'),
      safe(() => api.get('/analytics/inventory').then(r => r.data),  'Inventory'),
      safe(() => api.get('/pending-actions').then(r => r.data),      'Actions'),
    ]);

    setKpis(k); setProd(p); setInv(i);
    setActions(Array.isArray(a) ? a.slice(0, 6) : []);
    setErrors(errs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={20} className="animate-spin text-gray-400 mr-2"/>
      <span className="text-gray-500">Loading dashboard…</span>
    </div>
  );

  const criticalActions = actions.filter(a => a.priority === 'Critical').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome, <span className="font-medium text-gray-700">{user?.name}</span>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{user?.role}</span>
          </p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
          <RefreshCw size={16}/>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle size={16}/>
          Some data could not load ({errors.join(', ')}). Check that the server is running.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Low Stock Items"    value={kpis?.lowStockCount ?? '—'}
             color={kpis?.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}
             sub="Below reorder level" icon={Package} iconColor="text-red-400" />
        <KPI label="Overstock Items"    value={kpis?.overstockCount ?? '—'}
             sub="2x reorder level"    icon={TrendingUp} iconColor="text-yellow-500" />
        <KPI label="Dead Stock"         value={inv?.summary?.deadStockCount ?? '—'}
             sub="No movement 30 days" icon={Package} iconColor="text-gray-400" />
        <KPI label="Avg Supplier Delay" value={kpis ? `${kpis.avgSupplierDelay}d` : '—'}
             color={Number(kpis?.avgSupplierDelay) > 3 ? 'text-orange-600' : 'text-gray-900'}
             sub="Days late on avg"    icon={Clock} iconColor="text-orange-400" />
        {['Admin','Finance'].includes(user?.role) && (
          <KPI label="Outstanding Payable" value={kpis ? fmt(kpis.outstandingPayments) : '—'}
               color="text-blue-600" sub="Unpaid to suppliers" icon={IndianRupee} iconColor="text-blue-400"/>
        )}
        {['Admin','Production'].includes(user?.role) && prod && (
          <>
            <KPI label="Production Efficiency" value={`${prod.efficiency}%`}
                 color={Number(prod.efficiency) >= 90 ? 'text-green-600' : 'text-amber-600'}
                 sub="Material utilisation" icon={Factory} iconColor="text-green-400"/>
            <KPI label="Rejection Rate" value={`${prod.rejectionRate}%`}
                 color={Number(prod.rejectionRate) > 5 ? 'text-red-600' : 'text-gray-900'}
                 sub="Of units produced" icon={TrendingDown} iconColor="text-red-400"/>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Pending Actions</h2>
              {criticalActions > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {criticalActions} critical
                </span>
              )}
            </div>
            <Link to="/pending-actions" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              See all <ChevronRight size={12}/>
            </Link>
          </div>
          {actions.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No pending actions</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {actions.map((a, i) => {
                const pc = { Critical:'bg-red-500', High:'bg-orange-400', Medium:'bg-blue-400', Low:'bg-gray-300' };
                const linkMap = { 'Purchase Order':'/purchase-orders', 'Sales Order':'/sales', 'Production Order':'/production', 'Low Stock':'/inventory' };
                return (
                  <li key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${pc[a.priority] || 'bg-gray-300'}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{a.description}</p>
                      <p className="text-xs text-gray-400">{a.type} · {a.actionRequired}</p>
                    </div>
                    <Link to={linkMap[a.type] || '/'} className="shrink-0 text-xs text-blue-600 hover:underline">Go →</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Low Stock Alert</h2>
            <Link to="/inventory" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              Inventory <ChevronRight size={12}/>
            </Link>
          </div>
          {!inv || inv.details?.filter(p => p.isReorderNeeded).length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">All stock levels healthy</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {inv.details.filter(p => p.isReorderNeeded).slice(0, 6).map((p, i) => (
                <li key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{p.stock} <span className="text-xs font-normal text-gray-400">in stock</span></p>
                    <p className="text-xs text-gray-400">Reorder: {p.reorderLevel}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Purchase Order', to: '/purchase-orders', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
          { label: 'New Sales Order',    to: '/sales',           icon: TrendingUp,   color: 'text-green-600 bg-green-50' },
          { label: 'Production Orders',  to: '/production',      icon: Factory,      color: 'text-purple-600 bg-purple-50' },
          { label: 'Inventory Planning', to: '/inventory',       icon: Package,      color: 'text-amber-600 bg-amber-50' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className={`p-2 rounded-lg ${item.color}`}><item.icon size={16}/></div>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
