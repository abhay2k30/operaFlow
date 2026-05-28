import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import {
  Search, MapPin, Clock, ArrowRightLeft, Package,
  AlertTriangle, Plus, XCircle, CheckCircle, Edit2,
  Trash2, X, Filter, ShieldAlert, ChevronDown, ChevronUp
} from 'lucide-react';

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['All','Raw Material','Finished Goods','Work In Progress','Packaging','Spare Parts','Consumables','Other'];

const CATEGORY_UNITS = {
  'Raw Material': 'kg', 'Finished Goods': 'pcs', 'Work In Progress': 'pcs',
  'Packaging': 'box', 'Spare Parts': 'pcs', 'Consumables': 'pcs', 'Other': 'pcs',
};

const CATEGORY_COLORS = {
  'Raw Material':    'bg-blue-100 text-blue-700',
  'Finished Goods':  'bg-green-100 text-green-700',
  'Work In Progress':'bg-purple-100 text-purple-700',
  'Packaging':       'bg-amber-100 text-amber-700',
  'Spare Parts':     'bg-orange-100 text-orange-700',
  'Consumables':     'bg-teal-100 text-teal-700',
  'Other':           'bg-gray-100 text-gray-600',
};

const REJECTION_REASONS = [
  'Damaged', 'Expired / Near Expiry', 'Wrong Specification',
  'Contaminated', 'Quantity Mismatch', 'Supplier Error', 'Other',
];

const REJECTION_ACTIONS = ['Quarantined', 'Returned to Supplier', 'Disposed', 'Reworked'];

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TABS = [
  { id: 'products',  label: 'Products',           icon: Package },
  { id: 'location',  label: 'Stock by Location',  icon: MapPin },
  { id: 'ageing',    label: 'Ageing Analysis',    icon: Clock },
  { id: 'transfers', label: 'Transfer History',   icon: ArrowRightLeft },
];

// ── EditProductModal ──────────────────────────────────────────────────────────

function EditProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         product.name,
    sku:          product.sku,
    category:     product.category,
    unit:         product.unit,
    price:        product.price ?? 0,
    reorderLevel: product.reorderLevel ?? 10,
    description:  product.description ?? '',
    // Per-product planning overrides
    leadTimeDays:        product.leadTimeDays ?? '',
    orderingCostPerOrder:product.orderingCostPerOrder ?? '',
    safetyStockDays:     product.safetyStockDays ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      // Convert empty strings to null (use org defaults)
      const body = { ...form };
      ['leadTimeDays','orderingCostPerOrder','safetyStockDays'].forEach(k => {
        body[k] = body[k] === '' ? null : Number(body[k]);
      });
      await api.put(`/products/${product._id}`, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update product');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Edit Product</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input required value={form.sku} onChange={e => set('sku', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => { set('category', e.target.value); set('unit', CATEGORY_UNITS[e.target.value] || 'pcs'); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input type="number" min="0" value={form.reorderLevel} onChange={e => set('reorderLevel', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          {/* Planning overrides */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Planning Overrides <span className="text-gray-400 font-normal normal-case">(leave blank to use org defaults)</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lead time (days)</label>
                <input type="number" min="0" placeholder="Org default" value={form.leadTimeDays}
                  onChange={e => set('leadTimeDays', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordering cost (₹)</label>
                <input type="number" min="0" placeholder="Org default" value={form.orderingCostPerOrder}
                  onChange={e => set('orderingCostPerOrder', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Safety stock (days)</label>
                <input type="number" min="0" placeholder="Org default" value={form.safetyStockDays}
                  onChange={e => set('safetyStockDays', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── RejectBatchModal ──────────────────────────────────────────────────────────

function RejectBatchModal({ batch, productName, onClose, onSaved }) {
  const [form, setForm] = useState({ qty: 1, reason: REJECTION_REASONS[0], actionTaken: REJECTION_ACTIONS[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.qty > batch.qty) { setError(`Max available is ${batch.qty}`); return; }
    setSaving(true); setError('');
    try {
      await api.post('/stock/reject-batch', { batchId: batch._id, qty: Number(form.qty), reason: form.reason, actionTaken: form.actionTaken });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Rejection failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500"/>
            <h2 className="font-semibold text-gray-900">Reject Batch</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
            <p className="font-medium">{productName}</p>
            <p className="text-xs mt-0.5">Batch: <span className="font-mono">{batch.batchNo}</span> · Available: {batch.qty}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to reject *</label>
            <input type="number" required min="1" max={batch.qty} value={form.qty}
              onChange={e => setForm({...form, qty: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
              {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action taken</label>
            <select value={form.actionTaken} onChange={e => setForm({...form, actionTaken: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
              {REJECTION_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Rejecting…' : `Reject ${form.qty} units`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const [activeTab, setActiveTab]     = useState('products');
  const [stats, setStats]             = useState(null);
  const [transfers, setTransfers]     = useState([]);
  const [products, setProducts]       = useState([]);
  const [stock, setStock]             = useState([]);
  const [loading, setLoading]         = useState(true);

  // Filters
  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct]   = useState(null);
  const [rejectBatch, setRejectBatch]   = useState(null);  // { batch, productName }
  const [expandedStock, setExpandedStock] = useState(null);

  // Add product form
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', unit: 'kg', category: 'Raw Material',
    price: 0, reorderLevel: 10, currentStock: 0, description: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, productsRes, stockRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/products'),
        api.get('/stock'),
      ]);
      setStats(statsRes.data);
      setProducts(productsRes.data);
      setTransfers(statsRes.data.recentTransfers || []);
      setStock(stockRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', newProduct);
      setShowAddModal(false);
      setNewProduct({ name:'', sku:'', unit:'kg', category:'Raw Material', price:0, reorderLevel:10, currentStock:0, description:'' });
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add product'); }
  };

  const handleDeactivate = async (product) => {
    if (!confirm(`Deactivate "${product.name}"? It won't appear in new orders but all history is preserved.`)) return;
    try {
      await api.delete(`/products/${product._id}`);
      fetchData();
    } catch (e) { alert(e.response?.data?.error || 'Failed to deactivate product'); }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  // Category counts for filter badges
  const catCounts = products.reduce((m, p) => { m[p.category] = (m[p.category] || 0) + 1; return m; }, {});

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Products, stock levels and movements</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 text-sm font-medium">
          <Plus size={15}/> Add Product
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <tab.icon size={15}/> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Products Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search + category filter */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or SKU…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    catFilter === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  {cat}
                  {cat !== 'All' && catCounts[cat] ? <span className="ml-1 opacity-60">({catCounts[cat]})</span> : null}
                  {cat === 'All' && <span className="ml-1 opacity-60">({products.length})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Products table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Unit</th>
                  <th className="text-right px-5 py-3">Price</th>
                  <th className="text-right px-5 py-3">Reorder Pt</th>
                  <th className="text-center px-5 py-3">ABC</th>
                  <th className="text-right px-5 py-3">Lead Time</th>
                  <th className="px-5 py-3"/>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-10 text-gray-400">
                    {search || catFilter !== 'All' ? 'No products match your filter.' : 'No products yet — add your first product.'}
                  </td></tr>
                ) : filteredProducts.map(p => (
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[p.category] || 'bg-gray-100 text-gray-600'}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.unit}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(p.price)}</td>
                    <td className="px-5 py-3 text-right">
                      {p.reorderPoint != null ? (
                        <div>
                          <span className="font-medium text-gray-900">{p.reorderPoint}</span>
                          <span className="block text-[10px] text-green-600 bg-green-50 px-1 rounded mt-0.5 w-fit ml-auto">Calc</span>
                        </div>
                      ) : p.reorderLevel != null ? (
                        <div>
                          <span className="font-medium text-gray-700">{p.reorderLevel}</span>
                          <span className="block text-[10px] text-gray-500 bg-gray-100 px-1 rounded mt-0.5 w-fit ml-auto">Manual</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {p.abcCategory ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.abcCategory === 'A' ? 'bg-red-100 text-red-700' :
                          p.abcCategory === 'B' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{p.abcCategory}</span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {p.leadTimeDays != null ? `${p.leadTimeDays}d` : <span className="text-gray-400">Org default</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditProduct(p)} title="Edit"
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400 transition-colors">
                          <Edit2 size={13}/>
                        </button>
                        <button onClick={() => handleDeactivate(p)} title="Deactivate"
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 transition-colors">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Stock by Location Tab ────────────────────────────────────────────── */}
      {activeTab === 'location' && (
        <div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <strong>Stock by Location</strong> — value and quantity of stock in each warehouse or area.
            Expand any row to see individual batches and reject damaged stock directly.
          </div>
          {stock.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MapPin size={36} className="mx-auto mb-3 opacity-25"/>
              <p>No stock data yet. Receive stock via Purchase Orders.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-left px-5 py-3">Category</th>
                    <th className="text-left px-5 py-3">Location</th>
                    <th className="text-right px-5 py-3">Total Qty</th>
                    <th className="text-right px-5 py-3">Reserved</th>
                    <th className="text-right px-5 py-3">Available</th>
                    <th className="px-5 py-3"/>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s, i) => {
                    const available = s.totalQty - s.reservedQty;
                    const key = `${s._id?.productId}-${s._id?.locationId}`;
                    const isExpanded = expandedStock === key;
                    return (
                      <React.Fragment key={i}>
                        <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{s.product?.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{s.product?.sku}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[s.product?.category] || 'bg-gray-100 text-gray-600'}`}>
                              {s.product?.category || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{s.location?.name}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-gray-800">{s.totalQty}</td>
                          <td className="px-5 py-3 text-right font-mono text-amber-600">{s.reservedQty || 0}</td>
                          <td className="px-5 py-3 text-right font-mono text-green-600 font-semibold">{available}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => setExpandedStock(isExpanded ? null : key)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400">
                              {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-6 py-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Batches</p>
                              <div className="space-y-1">
                                {s.batches?.map((b, bi) => (
                                  <div key={bi} className="flex items-center gap-4 bg-white border border-gray-100 rounded-lg px-4 py-2 text-sm">
                                    <span className="font-mono text-gray-700 font-medium">{b.batchNo}</span>
                                    <span className="text-gray-500">Qty: <strong>{b.qty}</strong></span>
                                    {b.expiryDate && (
                                      <span className={`text-xs ${new Date(b.expiryDate) < new Date() ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                        Exp: {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => setRejectBatch({ batch: { _id: b._id || `${s._id?.productId}_${b.batchNo}`, batchNo: b.batchNo, qty: b.qty }, productName: s.product?.name })}
                                      className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                      <ShieldAlert size={11}/> Reject
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Ageing Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'ageing' && (
        <div className="space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            <strong>Stock Ageing</strong> — how long batches have been sitting in the warehouse since received.
            <strong> 0–30 days = healthy.</strong> 31–90 days = watch it. <strong>90+ days = dead stock risk</strong> — ties up working capital, risk of expiry.
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Ageing Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(stats?.stockAgeing || []).map((bucket, i) => {
                const colors = [
                  'bg-green-100 text-green-800 border-green-200',
                  'bg-yellow-100 text-yellow-800 border-yellow-200',
                  'bg-orange-100 text-orange-800 border-orange-200',
                  'bg-red-100 text-red-800 border-red-200',
                ];
                return (
                  <div key={i} className={`p-4 rounded-xl border ${colors[i]}`}>
                    <p className="text-xs font-medium mb-1 opacity-75">{bucket.range}</p>
                    <p className="text-3xl font-bold">{bucket.value}%</p>
                    <p className="text-xs opacity-60 mt-0.5">of stock batches</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3">Expiry Alerts</h4>
            {stats?.stockCategories?.find(c => c.name === 'Near Expiry')?.value > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 mb-2">
                <AlertTriangle size={18}/><span className="text-sm font-medium">{stats.stockCategories.find(c=>c.name==='Near Expiry').value} batches expiring within 30 days</span>
              </div>
            ) : null}
            {stats?.stockCategories?.find(c => c.name === 'Expired')?.value > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                <AlertTriangle size={18}/><span className="text-sm font-medium">{stats.stockCategories.find(c=>c.name==='Expired').value} batches already expired — action required</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-800">
                <CheckCircle size={18}/><span className="text-sm font-medium">No expired batches</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transfers Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">Internal Stock Transfers</p>
            <p className="text-xs text-gray-500 mt-1">
              A <strong>transfer</strong> moves stock between two storage locations inside your facility.
              This is <em>not</em> a customer shipment — those are managed under <strong>Sales Orders → Ship</strong>.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-5 py-3">From</th>
                <th className="text-left px-5 py-3">To</th>
                <th className="text-right px-5 py-3">Qty</th>
                <th className="text-left px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.length > 0 ? transfers.map(t => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{t.productId?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{t.fromLocation?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{t.toLocation?.name || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-gray-800">{t.qty}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.reason || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400">
                    <ArrowRightLeft size={28} className="mx-auto mb-2 opacity-20"/>
                    No internal transfers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Product Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" required value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input type="text" required value={newProduct.sku}
                    onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select required value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value, unit: CATEGORY_UNITS[e.target.value] || 'pcs'})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input type="number" min="0" value={newProduct.reorderLevel}
                    onChange={e => setNewProduct({...newProduct, reorderLevel: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock (optional)</label>
                  <input type="number" min="0" value={newProduct.currentStock}
                    onChange={e => setNewProduct({...newProduct, currentStock: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={fetchData}
        />
      )}

      {/* Reject Batch Modal */}
      {rejectBatch && (
        <RejectBatchModal
          batch={rejectBatch.batch}
          productName={rejectBatch.productName}
          onClose={() => setRejectBatch(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
