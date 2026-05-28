import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Plus, Search, Truck, DollarSign, CheckCircle,
  Clock, Package, X, AlertTriangle, IndianRupee
} from 'lucide-react';

const STATUS_COLORS = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Picking:   'bg-blue-100 text-blue-800',
  Shipped:   'bg-green-100 text-green-800',
  Invoiced:  'bg-teal-100 text-teal-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0})}`;

export default function SalesDashboard() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [products, setProducts]       = useState([]);
  const [parties, setParties]         = useState([]);
  const [createError, setCreateError] = useState('');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [newOrder, setNewOrder] = useState({
    customer: '',
    shippingAddress: '',
    expectedDeliveryDate: '',
    items: [{ productId: '', qty: 1, price: 0, gstRate: 18 }],
  });

  useEffect(() => {
    fetchOrders();
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
    api.get('/parties', { params: { type: 'Customer' } }).then(r => setParties(r.data)).catch(() => {});
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/sales-orders');
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addItem    = () => setNewOrder(o => ({ ...o, items: [...o.items, { productId:'', qty:1, price:0, gstRate:18 }] }));
  const removeItem = (i) => setNewOrder(o => ({ ...o, items: o.items.filter((_,idx)=>idx!==i) }));
  const updateItem = (i, field, val) => setNewOrder(o => {
    const items = [...o.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'productId') {
      const p = products.find(p => p._id === val);
      if (p) items[i].price = p.price || 0;
    }
    return { ...o, items };
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newOrder.customer)         { setCreateError('Select a customer'); return; }
    if (!newOrder.shippingAddress)  { setCreateError('Enter shipping address'); return; }
    if (newOrder.items.some(i => !i.productId)) { setCreateError('Select product for all items'); return; }
    try {
      await api.post('/sales-orders', newOrder);
      setShowModal(false);
      setNewOrder({ customer:'', shippingAddress:'', expectedDeliveryDate:'', items:[{ productId:'', qty:1, price:0, gstRate:18 }] });
      fetchOrders();
    } catch (err) {
      setCreateError(err.response?.data?.error || err.response?.data?.message || 'Failed to create order');
    }
  };

  const handleStatusUpdate = async (id, action) => {
    try {
      if (action === 'reserve') await api.post(`/sales-orders/${id}/reserve`, { items: [] });
      if (action === 'ship')    await api.post(`/sales-orders/${id}/ship`,    { items: [] });
      fetchOrders();
    } catch (e) { alert(e.response?.data?.error || 'Action failed'); }
  };

  // KPIs
  const totalRevenue  = orders.filter(o => ['Shipped','Invoiced'].includes(o.status)).reduce((s,o) => s + o.items.reduce((t,i)=>t+i.qty*i.price,0), 0);
  const pending       = orders.filter(o => o.status === 'Pending').length;
  const shipped       = orders.filter(o => ['Shipped','Invoiced'].includes(o.status)).length;

  const filtered = orders.filter(o => {
    const name = o.customer?.name || '';
    const matchS = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || o.status === filterStatus;
    return matchS && matchF;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer orders from creation to shipment</p>
        </div>
        <button onClick={() => { setCreateError(''); setShowModal(true); }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus size={15}/> New Order
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',   value: orders.length,   icon: Package,    color: 'text-gray-900' },
          { label: 'Pending',        value: pending,         icon: Clock,      color: 'text-amber-600' },
          { label: 'Shipped',        value: shipped,         icon: Truck,      color: 'text-green-600' },
          { label: 'Revenue (shipped)', value: fmt(totalRevenue), icon: IndianRupee, color: 'text-blue-600' },
        ].map((k,i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg"><k.icon size={16} className="text-gray-400"/></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-1">
          {['All','Pending','Picking','Shipped','Invoiced','Cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                ${filterStatus === s ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={36} className="mx-auto mb-3 opacity-25"/>
          <p>No orders found. Create your first sales order.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const value = order.items.reduce((t,i)=>t+i.qty*i.price,0);
                return (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-gray-500">#{order._id.slice(-6)}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer?.name || order.customerRef || '—'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{order.shippingAddress}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(value)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        {order.status === 'Pending' && (
                          <button onClick={() => handleStatusUpdate(order._id, 'reserve')}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Pick</button>
                        )}
                        {order.status === 'Picking' && (
                          <button onClick={() => handleStatusUpdate(order._id, 'ship')}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Ship</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Sales Order</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  <AlertTriangle size={14}/>{createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  {parties.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No customers found. <a href="/parties" className="underline font-medium">Add a customer</a> first.
                    </p>
                  ) : (
                    <select required value={newOrder.customer} onChange={e => setNewOrder({...newOrder, customer: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select customer —</option>
                      {parties.map(p => <option key={p._id} value={p._id}>{p.name}{p.gstin ? ` (${p.gstin})` : ''}</option>)}
                    </select>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address *</label>
                  <input required value={newOrder.shippingAddress} onChange={e => setNewOrder({...newOrder, shippingAddress: e.target.value})}
                    placeholder="Full delivery address"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                  <input type="date" value={newOrder.expectedDeliveryDate} onChange={e => setNewOrder({...newOrder, expectedDeliveryDate: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Items *</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={12} className="inline"/> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {newOrder.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">— Product —</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))}
                          placeholder="Price"
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-2">
                        <select value={item.gstRate} onChange={e => updateItem(i, 'gstRate', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}% GST</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => removeItem(i)}
                        className="col-span-1 flex justify-center text-gray-300 hover:text-red-500">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total preview */}
              <div className="flex justify-end">
                <p className="text-sm font-semibold text-gray-700">
                  Subtotal: <span className="font-mono text-gray-900">
                    {fmt(newOrder.items.reduce((s,i) => s + (Number(i.qty)||0)*(Number(i.price)||0), 0))}
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
