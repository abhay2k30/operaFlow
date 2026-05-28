import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  TrendingUp, TrendingDown, AlertTriangle, Package,
  RefreshCw, Info, ChevronDown, ChevronUp, ShoppingCart
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtN = (n, dec = 1) => n == null ? '—' : Number(n).toFixed(dec);
const fmtD = (d) => d == null ? 'No usage' : `${d}d`;

function TrendBadge({ trend }) {
  if (trend == null || trend === 0) return <span className="text-xs text-gray-400">Flat</span>;
  const up = trend > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
      {Math.abs(trend)}%
    </span>
  );
}

function StatusPill({ item }) {
  if (item.needsReorder) {
    return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium flex items-center gap-1 w-fit"><AlertTriangle size={10}/>Reorder now</span>;
  }
  if (item.daysRemaining != null && item.daysRemaining <= 14) {
    return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium w-fit">Low ({item.daysRemaining}d left)</span>;
  }
  return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium w-fit">OK</span>;
}

// Horizontal bar — stock vs reorder point
function StockBar({ stock, reorderPoint, max }) {
  const safeMax = max || Math.max(stock, reorderPoint, 1);
  const stockPct   = Math.min(100, (stock / safeMax) * 100);
  const reorderPct = Math.min(100, (reorderPoint / safeMax) * 100);
  return (
    <div className="relative h-2 bg-gray-100 rounded-full w-full mt-1.5">
      <div className="absolute top-0 left-0 h-2 rounded-full transition-all"
        style={{ width: `${stockPct}%`, background: stock <= reorderPoint ? '#ef4444' : '#22c55e' }}/>
      {/* Reorder marker */}
      <div className="absolute top-[-3px] h-[14px] w-0.5 bg-amber-400 rounded"
        style={{ left: `${reorderPct}%` }}
        title={`Reorder point: ${reorderPoint}`}/>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function InventoryPlanning() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');     // All | Reorder | Low | OK
  const [abcFilter, setAbcFilter] = useState('All');   // All | A | B | C
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort]         = useState('status');  // status | days | eoq | demand

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data: d } = await api.get('/analytics/inventory-planning');
      setData(d);
    } catch (e) {
      setError('Could not load planning data. Make sure the server is running.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
      <RefreshCw size={18} className="animate-spin"/> Loading planning data…
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex items-center gap-3">
        <AlertTriangle size={16}/> {error}
      </div>
    </div>
  );

  const items = data?.items || [];

  // Filter + search + sort
  const visible = items
    .filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All'
        || (filter === 'Reorder' && i.needsReorder)
        || (filter === 'Low'     && !i.needsReorder && i.daysRemaining != null && i.daysRemaining <= 14)
        || (filter === 'OK'      && !i.needsReorder && (i.daysRemaining == null || i.daysRemaining > 14));
      const matchAbc = abcFilter === 'All' || (i.abcCategory || 'C') === abcFilter;
      return matchSearch && matchFilter && matchAbc;
    })
    .sort((a, b) => {
      if (sort === 'status')  return (b.needsReorder ? 1 : 0) - (a.needsReorder ? 1 : 0) || (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999);
      if (sort === 'days')    return (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999);
      if (sort === 'demand')  return b.avgDailyDemand - a.avgDailyDemand;
      if (sort === 'eoq')     return b.eoq - a.eoq;
      return 0;
    });

  const reorderCount = items.filter(i => i.needsReorder).length;
  const noUsageCount = items.filter(i => i.avgDailyDemand === 0).length;
  const assumptions  = data?.assumptions || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Planning</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            EOQ · Reorder points · Demand forecasting — based on last 90 days of transactions
          </p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* Assumption banner */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <Info size={15} className="mt-0.5 shrink-0"/>
        <span>
          Dynamic safety stock: <strong>SS = Z × σ × √L</strong> where Z is based on supplier reliability.
          Demand from SALE + CONSUMPTION transactions. Demand weighted 60/30/10 (30d/60d/90d).
        </span>
      </div>

      {/* KPI pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
          <p className="text-red-500 font-semibold text-lg">{reorderCount}</p>
          <p className="text-red-400 text-xs">Items need reorder</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
          <p className="text-gray-800 font-semibold text-lg">{items.length - reorderCount - noUsageCount}</p>
          <p className="text-gray-400 text-xs">Stock levels OK</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
          <p className="text-gray-800 font-semibold text-lg">{noUsageCount}</p>
          <p className="text-gray-400 text-xs">No usage recorded</p>
        </div>
      </div>

      {/* Filters & sort */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product or SKU…"
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        <div className="flex gap-1">
          {['All','Reorder','Low','OK'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === f ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {f} {f === 'Reorder' && reorderCount > 0 ? `(${reorderCount})` : ''}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="status">Sort: by status</option>
          <option value="days">Sort: days remaining</option>
          <option value="demand">Sort: demand (high→low)</option>
          <option value="eoq">Sort: EOQ size</option>
        </select>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No items match your filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">In Stock</th>
                <th className="text-right px-4 py-3">Reorder Pt</th>
                <th className="text-right px-4 py-3">EOQ</th>
                <th className="text-right px-4 py-3">Avg Daily Demand</th>
                <th className="text-right px-4 py-3">Trend</th>
                <th className="text-right px-4 py-3">Days Left</th>
                <th className="text-right px-4 py-3">30d Forecast</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {visible.map(item => (
                <React.Fragment key={item._id}>
                  <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${item.needsReorder ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3"><StatusPill item={item}/></td>
                    <td className="px-4 py-3 text-right">
                      <p className={`font-mono font-semibold ${item.needsReorder ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.currentStock}
                      </p>
                      <StockBar stock={item.currentStock} reorderPoint={item.reorderPoint}
                        max={Math.max(item.currentStock, item.reorderPoint) * 1.5}/>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{item.reorderPoint || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold text-blue-600">{item.eoq || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {item.avgDailyDemand > 0 ? fmtN(item.avgDailyDemand, 2) : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right"><TrendBadge trend={item.trend}/></td>
                    <td className="px-4 py-3 text-right">
                      <span className={item.daysRemaining != null && item.daysRemaining <= 7 ? 'text-red-600 font-semibold' :
                        item.daysRemaining != null && item.daysRemaining <= 14 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                        {fmtD(item.daysRemaining)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {item.forecast30 || <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setExpanded(expanded === item._id ? null : item._id)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400">
                        {expanded === item._id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expanded === item._id && (
                    <tr className="bg-blue-50/40 border-b border-gray-100">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">EOQ Breakdown</p>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>Annual demand</span><span className="font-mono">{Math.round(item.avgDailyDemand * 365)}</span></div>
                              <div className="flex justify-between"><span>Unit price</span><span className="font-mono">₹{item.price}</span></div>
                              <div className="flex justify-between font-semibold text-blue-700 border-t border-blue-100 pt-1 mt-1">
                                <span>Optimal order qty (EOQ)</span><span className="font-mono">{item.eoq || '—'}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reorder Point</p>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>Demand σ (std dev)</span><span className="font-mono">{item.demandSigma ?? 0}</span></div>
                              <div className="flex justify-between"><span>Z-value (from supplier)</span><span className="font-mono">{item.zValue ?? 1.65}</span></div>
                              <div className="flex justify-between"><span>Safety stock (Z×σ×√L)</span><span className="font-mono">{item.safetyStock}</span></div>
                              <div className="flex justify-between font-semibold text-amber-700 border-t border-amber-100 pt-1 mt-1">
                                <span>Reorder when stock ≤</span><span className="font-mono">{item.reorderPoint}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Supplier Reliability</p>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>Reliability score</span>
                                <span className={`font-mono font-semibold ${(item.supplierReliability ?? 75) >= 90 ? 'text-green-600' : (item.supplierReliability ?? 75) >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {item.supplierReliability ?? 75}/100
                                </span>
                              </div>
                              <div className="flex justify-between"><span>Service level</span><span className="font-mono">{item.serviceLevel ?? 95}%</span></div>
                              <div className="flex justify-between"><span>Z-factor</span><span className="font-mono">{item.zValue ?? 1.65}</span></div>
                              <div className="text-xs text-gray-400 mt-1">
                                {(item.supplierReliability ?? 75) > 90 ? 'High reliability → lower safety stock' :
                                  (item.supplierReliability ?? 75) < 75 ? 'Low reliability → higher safety stock' :
                                  'Medium reliability → standard safety stock'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Demand Forecast</p>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>Next 30 days</span><span className="font-mono font-semibold">{item.forecast30}</span></div>
                              <div className="flex justify-between"><span>MoM trend</span><span><TrendBadge trend={item.trend}/></span></div>
                              <div className="flex justify-between"><span>Stockout date</span>
                                <span className={`font-mono text-xs ${item.stockoutDate ? 'text-red-600' : 'text-gray-400'}`}>
                                  {item.stockoutDate || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recommendation</p>
                            {item.needsReorder ? (
                              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                                <p className="font-semibold mb-1">Order required now</p>
                                <p>Place a PO for <strong>{item.eoq || item.reorderPoint}</strong> units.</p>
                                <p className="mt-1 text-red-400">Stock ({item.currentStock}) is at or below reorder point ({item.reorderPoint}).</p>
                                <a href="/purchase-orders"
                                  className="mt-2 flex items-center gap-1 text-red-600 hover:underline font-medium">
                                  <ShoppingCart size={11}/> Create Purchase Order
                                </a>
                              </div>
                            ) : (
                              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
                                <p className="font-semibold">Stock levels OK</p>
                                {item.daysRemaining && (
                                  <p className="mt-1 text-green-500">Approx. {item.daysRemaining} days of supply remaining.</p>
                                )}
                              </div>
                            )}
                          </div>
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
    </div>
  );
}
