import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, CheckCircle, Package, X, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  Fulfilled: 'bg-green-100 text-green-800',
  Partial:   'bg-blue-100 text-blue-800',
  Rejected:  'bg-red-100 text-red-800',
  Pending:   'bg-yellow-100 text-yellow-800',
  Draft:     'bg-gray-100 text-gray-600',
  Cancelled: 'bg-gray-100 text-gray-500',
};

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PurchaseOrderDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [po, setPo]               = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveError, setReceiveError] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [locations, setLocations] = useState([]);

  // Receive form state — one entry per item
  const [receiveForm, setReceiveForm] = useState({
    locationId: '',
    batchNo: '',
    expiryDate: '',
    items: [],
  });

  useEffect(() => { fetchPO(); fetchLocations(); }, [id]);

  const fetchPO = async () => {
    try {
      const { data } = await api.get(`/purchase-orders/${id}`);
      setPo(data);
      // Pre-fill receive qty as remaining per item
      setReceiveForm(f => ({
        ...f,
        items: data.items.map(i => ({
          productId: i.productId?._id || i.productId,
          qty: Math.max(0, i.qty - (i.receivedQty || 0)),
        }))
      }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/locations');
      setLocations(data);
      if (data.length > 0) setReceiveForm(f => ({ ...f, locationId: data[0]._id }));
    } catch (e) { console.error(e); }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    setReceiveError('');
    if (!receiveForm.locationId) { setReceiveError('Select a storage location'); return; }
    if (!receiveForm.batchNo.trim()) { setReceiveError('Enter a batch number'); return; }
    const itemsToReceive = receiveForm.items.filter(i => i.qty > 0);
    if (itemsToReceive.length === 0) { setReceiveError('Enter qty > 0 for at least one item'); return; }
    setReceiving(true);
    try {
      await api.post(`/purchase-orders/${id}/receive`, {
        locationId:  receiveForm.locationId,
        batchNo:     receiveForm.batchNo,
        expiryDate:  receiveForm.expiryDate || undefined,
        items:       itemsToReceive,
      });
      setShowReceive(false);
      fetchPO();
    } catch (err) {
      setReceiveError(err.response?.data?.error || 'Receive failed');
    } finally { setReceiving(false); }
  };

  const updateReceiveQty = (idx, qty) => {
    setReceiveForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], qty: Number(qty) };
      return { ...f, items };
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if (!po)     return <div className="text-center py-12 text-gray-500">PO not found</div>;

  const totalOrdered  = po.items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalReceived = po.items.reduce((s, i) => s + (i.receivedQty || 0) * i.price, 0);
  const remaining     = po.items.reduce((s, i) => s + Math.max(0, i.qty - (i.receivedQty || 0)), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-orders')}
          className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600"/>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Purchase Order #{po._id.slice(-6)}</h1>
          <p className="text-gray-500 text-sm">Created {new Date(po.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100'}`}>
          {po.status}
        </span>
        {!['Fulfilled','Rejected','Cancelled'].includes(po.status) && (
          <button onClick={() => setShowReceive(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Package size={15}/> Receive Items
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Items table */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Order Items</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ordered</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pending</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {po.items.map((item, i) => {
                const pending = Math.max(0, item.qty - (item.receivedQty || 0));
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.productId?.name || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.productId?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.qty}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={item.receivedQty > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                        {item.receivedQty || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={pending > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                        {pending}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(item.price)}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-gray-900">{fmt(item.qty * item.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-8 text-sm">
            <div className="text-right">
              <p className="text-gray-400 text-xs">Order Total</p>
              <p className="font-bold text-gray-900 text-lg">{fmt(totalOrdered)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Received Value</p>
              <p className="font-bold text-green-600 text-lg">{fmt(totalReceived)}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Supplier</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="font-medium text-gray-900">{po.supplier?.name || po.supplierRef || '—'}</p>
              </div>
              {po.supplier?.gstin && (
                <div>
                  <p className="text-xs text-gray-400">GSTIN</p>
                  <p className="font-mono text-gray-700">{po.supplier.gstin}</p>
                </div>
              )}
              {po.supplier?.phone && (
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-gray-700">{po.supplier.phone}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Order Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</span>
              </div>
              {po.expectedDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-gray-700">{new Date(po.expectedDate).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Items pending</span>
                <span className={remaining > 0 ? 'text-amber-600 font-semibold' : 'text-green-600'}>{remaining}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="text-gray-700">{po.paymentStatus || 'Unpaid'}</span>
              </div>
            </div>
          </div>

          {po.notes && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{po.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Receive Items Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Receive Items</h2>
              <button onClick={() => setShowReceive(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18}/>
              </button>
            </div>
            <form onSubmit={handleReceive} className="p-5 space-y-4">
              {receiveError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  <AlertTriangle size={14}/> {receiveError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location *</label>
                  <select value={receiveForm.locationId}
                    onChange={e => setReceiveForm(f => ({ ...f, locationId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select location —</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch No *</label>
                  <input value={receiveForm.batchNo}
                    onChange={e => setReceiveForm(f => ({ ...f, batchNo: e.target.value }))}
                    placeholder={`BATCH-${Date.now().toString().slice(-6)}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
                  <input type="date" value={receiveForm.expiryDate}
                    onChange={e => setReceiveForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Quantities to receive</p>
                <div className="space-y-2">
                  {po.items.map((item, idx) => {
                    const max = Math.max(0, item.qty - (item.receivedQty || 0));
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.productId?.name}</p>
                          <p className="text-xs text-gray-400">
                            Ordered: {item.qty} · Received: {item.receivedQty || 0} · Remaining: {max}
                          </p>
                        </div>
                        <input type="number" min="0" max={max}
                          value={receiveForm.items[idx]?.qty ?? 0}
                          onChange={e => updateReceiveQty(idx, e.target.value)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={max === 0}/>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowReceive(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={receiving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  <CheckCircle size={15}/> {receiving ? 'Receiving…' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
