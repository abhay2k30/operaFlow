import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Plus,
    Search,
    Filter,
    Factory,
    AlertTriangle,
    CheckCircle,
    Clock,
    Package,
    RefreshCw
} from 'lucide-react';

const ProductionDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [products, setProducts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [wipData, setWipData] = useState({ totalWipValue: 0, orderCount: 0 });
    const [statusFilter, setStatusFilter] = useState('All');

    // New Order State
    const [newOrder, setNewOrder] = useState({
        productToProduce: '',
        qty: 1,
        plannedDate: '',
        materials: [] // Will be auto-populated based on BOM (mocked for now)
    });

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        fetchWipValuation();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data } = await api.get('/production-orders');
            setOrders(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch production orders', error);
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
            setMaterials(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const fetchWipValuation = async () => {
        try {
            const { data } = await api.get('/production-orders/wip-valuation');
            setWipData(data);
        } catch (error) {
            console.error('Failed to fetch WIP valuation', error);
        }
    };

    const filteredOrders = statusFilter === 'All'
        ? orders
        : orders.filter(o => o.status === statusFilter);

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        try {
            // Send without materials — server will auto-populate from active BoM
            await api.post('/production-orders', {
                productToProduce: newOrder.productToProduce,
                qty: newOrder.qty,
                startDate: newOrder.plannedDate || undefined,
            });
            setShowCreateModal(false);
            setNewOrder({ productToProduce: '', qty: 1, plannedDate: '', materials: [] });
            fetchOrders();
        } catch (error) {
            console.error('Failed to create production order', error);
            alert(error.response?.data?.error || 'Failed to create production order');
        }
    };

    const handleStatusChange = async (id, action) => {
        try {
            if (action === 'reserve') await api.post(`/production-orders/${id}/reserve`, { materials: [] });
            if (action === 'consume') await api.post(`/production-orders/${id}/consume`, { materials: [] });
            if (action === 'complete') await api.post(`/production-orders/${id}/complete`, { locationId: '', batchNo: `PROD-${Date.now().toString().slice(-6)}` });
            fetchOrders();
        } catch (error) {
            console.error('Action failed:', error);
            alert(error.response?.data?.error || 'Action failed. Check batch/location details.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Planned': return 'bg-gray-100 text-gray-800';
            case 'In-Progress': return 'bg-blue-100 text-blue-800';
            case 'Quality Check': return 'bg-yellow-100 text-yellow-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="text-center py-12">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Production Dashboard</h1>
                    <p className="text-gray-500">Manage manufacturing and assembly</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" /> Create Order
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Planned</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                {orders.filter(o => o.status === 'Planned').length}
                            </h3>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <Clock className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">In Progress</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-1">
                                {orders.filter(o => o.status === 'In-Progress').length}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Factory className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Completed (This Month)</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-1">
                                {orders.filter(o => o.status === 'Completed').length}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">WIP Value</p>
                            <h3 className="text-2xl font-bold text-amber-600 mt-1">
                                ₹{wipData.totalWipValue?.toLocaleString() || 0}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{wipData.orderCount || 0} orders in progress</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Package className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2">
                    {['All', 'Planned', 'In-Progress', 'Quality Check', 'Completed', 'Cancelled'].map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                statusFilter === f
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Planned Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order._id.slice(-6)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{order.productToProduce?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{order.qty}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {order.startDate ? new Date(order.startDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {order.status === 'Planned' && (
                                                    <button
                                                        onClick={() => handleStatusChange(order._id, 'reserve')}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded"
                                                    >
                                                        Start
                                                    </button>
                                                )}
                                                {order.status === 'In-Progress' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(order._id, 'consume')}
                                                            className="text-orange-600 hover:text-orange-800 text-xs font-medium border border-orange-200 px-2 py-1 rounded"
                                                        >
                                                            Consume
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(order._id, 'complete')}
                                                            className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 px-2 py-1 rounded"
                                                        >
                                                            Complete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No production orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Order Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Create Production Order</h2>
                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product to Produce</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newOrder.productToProduce}
                                    onChange={(e) => setNewOrder({ ...newOrder, productToProduce: e.target.value })}
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newOrder.qty}
                                    onChange={(e) => setNewOrder({ ...newOrder, qty: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newOrder.plannedDate}
                                    onChange={(e) => setNewOrder({ ...newOrder, plannedDate: e.target.value })}
                                />
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

export default ProductionDashboard;
