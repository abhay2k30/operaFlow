import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Plus,
    Search,
    Filter,
    Eye,
    AlertCircle,
    Clock,
    DollarSign,
    ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PurchaseDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createError, setCreateError] = useState('');

    // Create PO Form State
    const [newPO, setNewPO] = useState({
        supplier: '',
        items: [{ productId: '', qty: 1, price: 0 }],
        expectedDate: ''
    });
    const [products, setProducts] = useState([]);
    const [parties, setParties] = useState([]);

    useEffect(() => {
        fetchData();
        fetchProducts();
        fetchParties();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, posRes] = await Promise.all([
                api.get('/purchase-orders/stats'),
                api.get('/purchase-orders')
            ]);
            setStats(statsRes.data);
            setPos(posRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch data', error);
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const fetchParties = async () => {
        try {
            const { data } = await api.get('/parties', { params: { type: 'Supplier' } });
            setParties(data);
        } catch (error) {
            console.error('Failed to fetch parties', error);
        }
    };

    const handleCreatePO = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!newPO.supplier) { setCreateError('Please select a supplier'); return; }
        if (newPO.items.some(i => !i.productId)) { setCreateError('All items need a product selected'); return; }
        try {
            await api.post('/purchase-orders', newPO);
            setShowCreateModal(false);
            setNewPO({ supplier: '', items: [{ productId: '', qty: 1, price: 0 }], expectedDate: '' });
            fetchData();
        } catch (error) {
            setCreateError(error.response?.data?.error || error.response?.data?.message || 'Failed to create PO');
        }
    };

    const addItem = () => {
        setNewPO({ ...newPO, items: [...newPO.items, { productId: '', qty: 1, price: 0 }] });
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...newPO.items];
        updatedItems[index][field] = value;
        setNewPO({ ...newPO, items: updatedItems });
    };

    const removeItem = (index) => {
        const updatedItems = newPO.items.filter((_, i) => i !== index);
        setNewPO({ ...newPO, items: updatedItems });
    };

    if (loading) return <div className="text-center py-12">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Purchase Dashboard</h1>
                    <p className="text-gray-500">Manage procurement and supplier performance</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" /> Create PO
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Open POs</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.kpis?.openPOs || 0}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Total Value (Open)</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">${stats?.kpis?.totalPOValue?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Delayed POs</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-1">{stats?.kpis?.delayedPOs || 0}</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Clock className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-4 text-sm font-medium transition-colors ${activeTab === 'overview'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`pb-4 text-sm font-medium transition-colors ${activeTab === 'orders'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        All Orders
                    </button>
                </nav>
            </div>

            {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Supplier Stats */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Suppliers</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                                        <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats?.supplierStats?.map((supplier, index) => (
                                        <tr key={index}>
                                            <td className="py-3 text-sm text-gray-800">{supplier._id}</td>
                                            <td className="py-3 text-sm text-gray-600">{supplier.count}</td>
                                            <td className="py-3 text-sm text-gray-600">${supplier.totalValue.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PO Ageing */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">PO Ageing</h3>
                        <div className="space-y-4">
                            {stats?.ageing?.map((bucket, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        {bucket._id === '90+' ? '90+ Days' : `${bucket._id}-${bucket._id + 30} Days`}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.min((bucket.count / pos.length) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">{bucket.count}</span>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.ageing || stats.ageing.length === 0) && (
                                <p className="text-sm text-gray-500 text-center py-4">No ageing data available</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Orders List */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pos.map((po) => (
                                    <tr key={po._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{po._id.slice(-6)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{po.supplier?.name || po.supplierRef || String(po.supplier).slice(-6)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(po.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${po.status === 'Fulfilled' ? 'bg-green-100 text-green-800' :
                                                po.status === 'Partial' ? 'bg-blue-100 text-blue-800' :
                                                    po.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            ${po.items.reduce((sum, item) => sum + (item.qty * item.price), 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/purchase-orders/${po._id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                            >
                                                <Eye className="w-4 h-4" /> View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create PO Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Create Purchase Order</h2>
                        {createError && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
                                {createError}
                            </div>
                        )}
                        <form onSubmit={handleCreatePO} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                                    {parties.length === 0 ? (
                                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                            No suppliers found. <a href="/parties" className="underline font-medium">Add a supplier</a> first.
                                        </p>
                                    ) : (
                                        <select
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={newPO.supplier}
                                            onChange={(e) => setNewPO({ ...newPO, supplier: e.target.value })}
                                        >
                                            <option value="">— Select supplier —</option>
                                            {parties.map(p => (
                                                <option key={p._id} value={p._id}>{p.name}{p.gstin ? ` (${p.gstin})` : ''}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newPO.expectedDate}
                                        onChange={(e) => setNewPO({ ...newPO, expectedDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                                {newPO.items.map((item, index) => (
                                    <div key={index} className="flex gap-4 mb-3 items-end">
                                        <div className="flex-1">
                                            <select
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.productId}
                                                onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => (
                                                    <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="Qty"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.qty}
                                                onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="Price"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        {newPO.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:text-red-700 px-2 py-2"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseDashboard;
