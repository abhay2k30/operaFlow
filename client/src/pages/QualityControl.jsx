import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, AlertTriangle, CheckCircle, XCircle, Package, Factory } from 'lucide-react';
import api from '../utils/api';

const QualityControl = () => {
    const [activeTab, setActiveTab] = useState('rejections');
    const [rejections, setRejections] = useState([]);
    const [productionOrders, setProductionOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQCModal, setShowQCModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [qcData, setQcData] = useState({ acceptedQty: 0, rejectedQty: 0, rejectionReason: '' });
    const [formData, setFormData] = useState({
        purchaseOrderId: '',
        productId: '',
        rejectedQty: '',
        reason: '',
        actionTaken: 'Returned'
    });
    const [products, setProducts] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);

    useEffect(() => {
        fetchRejections();
        fetchProductionOrders();
        fetchProducts();
        fetchPurchaseOrders();
    }, []);

    const fetchRejections = async () => {
        try {
            const { data } = await api.get('/rejections');
            setRejections(data);
        } catch (error) {
            console.error('Error fetching rejections:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductionOrders = async () => {
        try {
            const { data } = await api.get('/production-orders?status=Quality Check');
            setProductionOrders(data);
        } catch (error) {
            console.error('Error fetching production orders:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchPurchaseOrders = async () => {
        try {
            const { data } = await api.get('/purchase-orders');
            setPurchaseOrders(data);
        } catch (error) {
            console.error('Error fetching POs:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/rejections', formData);
            setShowModal(false);
            setFormData({
                purchaseOrderId: '',
                productId: '',
                rejectedQty: '',
                reason: '',
                actionTaken: 'Returned'
            });
            fetchRejections();
        } catch (error) {
            console.error('Error creating rejection:', error);
            alert('Failed to create rejection record');
        }
    };

    const handleQCSubmit = async () => {
        try {
            await api.post(`/production-orders/${selectedOrder._id}/quality-check`, {
                acceptedQty: parseInt(qcData.acceptedQty),
                rejectedQty: parseInt(qcData.rejectedQty),
                rejectionReason: qcData.rejectionReason
            });
            setShowQCModal(false);
            setSelectedOrder(null);
            setQcData({ acceptedQty: 0, rejectedQty: 0, rejectionReason: '' });
            fetchProductionOrders();
            alert('Quality check completed successfully!');
        } catch (error) {
            console.error('Error submitting quality check:', error);
            alert(error.response?.data?.error || 'Failed to submit quality check');
        }
    };

    const openQCModal = (order) => {
        setSelectedOrder(order);
        setQcData({ acceptedQty: order.qty, rejectedQty: 0, rejectionReason: '' });
        setShowQCModal(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quality Control</h1>
                {activeTab === 'rejections' && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
                    >
                        <Plus size={20} />
                        Record Rejection
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('rejections')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'rejections'
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                    }`}
                >
                    <AlertTriangle size={16} className="inline mr-2" />
                    Purchase Rejections
                </button>
                <button
                    onClick={() => setActiveTab('production')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'production'
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                    }`}
                >
                    <Factory size={16} className="inline mr-2" />
                    Production Inspections
                    {productionOrders.length > 0 && (
                        <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                            {productionOrders.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'rejections' ? (
                <>
                    {/* Filters & Search */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search rejections..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            />
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50">
                            <Filter size={20} />
                            Filter
                        </button>
                    </div>

                    {/* Rejections Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">PO Reference</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Product</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Action Taken</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading...</td></tr>
                                ) : rejections.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-8 text-gray-500">No rejection records found</td></tr>
                                ) : (
                                    rejections.map((rejection) => (
                                        <tr key={rejection._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                {new Date(rejection.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 text-sm font-medium text-blue-600">
                                                {rejection.purchaseOrderId?.poNumber || 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                                                {rejection.productId?.name || 'Unknown Product'}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-red-600 font-bold">
                                                {rejection.rejectedQty}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                {rejection.reason}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                    {rejection.actionTaken}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle size={12} />
                                                    Rejected
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Production Inspections */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {productionOrders.length === 0 ? (
                            <div className="text-center py-12">
                                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">No production orders pending inspection</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Product</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Created</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {productionOrders.map((order) => (
                                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm font-medium text-gray-900">
                                                #{order._id.slice(-6)}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                                                {order.productToProduce?.name || 'Unknown Product'}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                {order.qty}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <AlertTriangle size={12} />
                                                    Quality Check
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <button
                                                    onClick={() => openQCModal(order)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Record Rejection</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    value={formData.purchaseOrderId}
                                    onChange={(e) => setFormData({ ...formData, purchaseOrderId: e.target.value })}
                                    required
                                >
                                    <option value="">Select PO</option>
                                    {purchaseOrders.map(po => (
                                        <option key={po._id} value={po._id}>{po.poNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map(product => (
                                        <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Quantity</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    value={formData.rejectedQty}
                                    onChange={(e) => setFormData({ ...formData, rejectedQty: e.target.value })}
                                    required
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                    placeholder="e.g., Damaged in transit, Expired, Wrong Item"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    value={formData.actionTaken}
                                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                                >
                                    <option value="Returned">Returned to Supplier</option>
                                    <option value="Disposed">Disposed</option>
                                    <option value="Quarantined">Quarantined</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                                >
                                    Record Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QC Inspection Modal */}
            {showQCModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Production Quality Check</h2>
                            <button onClick={() => setShowQCModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Package className="text-gray-400" size={20} />
                                <div>
                                    <p className="font-medium text-gray-800">{selectedOrder.productToProduce?.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">Order #{selectedOrder._id.slice(-6)}</p>
                                </div>
                            </div>
                            <p className="text-lg font-semibold text-gray-700">
                                Total Quantity: <span className="text-blue-600">{selectedOrder.qty}</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Accepted Quantity</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                    value={qcData.acceptedQty}
                                    onChange={(e) => setQcData({ ...qcData, acceptedQty: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    max={selectedOrder.qty}
                                />
                                <p className="text-xs text-gray-500 mt-1">Quantity that passed inspection</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Quantity</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    value={qcData.rejectedQty}
                                    onChange={(e) => setQcData({ ...qcData, rejectedQty: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    max={selectedOrder.qty}
                                />
                                <p className="text-xs text-gray-500 mt-1">Quantity that failed inspection</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <p className="text-sm text-blue-700">
                                    <strong>Total:</strong> {qcData.acceptedQty + qcData.rejectedQty} / {selectedOrder.qty}
                                    {qcData.acceptedQty + qcData.rejectedQty !== selectedOrder.qty && (
                                        <span className="text-red-600 ml-2">(Must equal {selectedOrder.qty})</span>
                                    )}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if any)</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    rows="2"
                                    value={qcData.rejectionReason}
                                    onChange={(e) => setQcData({ ...qcData, rejectionReason: e.target.value })}
                                    placeholder="Describe any defects or issues found..."
                                ></textarea>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowQCModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleQCSubmit}
                                    disabled={qcData.acceptedQty + qcData.rejectedQty !== selectedOrder.qty}
                                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Submit QC Result
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityControl;
