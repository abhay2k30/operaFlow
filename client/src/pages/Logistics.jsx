import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Truck, Package, MapPin, Calendar, Plus, Search, Filter, XCircle, Trash2, X } from 'lucide-react';

const Logistics = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingShipment, setRejectingShipment] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [newShipment, setNewShipment] = useState({
        type: 'Outbound',
        origin: '',
        destination: '',
        weight: '',
        expectedDeliveryDate: '',
        items: [],
    });
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchShipments();
        api.get('/products').then(r => setProducts(r.data)).catch(() => {});
    }, []);

    const fetchShipments = async () => {
        try {
            const { data } = await api.get('/logistics/shipments');
            setShipments(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch shipments', error);
            setLoading(false);
        }
    };

    const handleCreateShipment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/logistics/shipments', newShipment);
            setShowCreateModal(false);
            setNewShipment({ type: 'Outbound', origin: '', destination: '', weight: '', expectedDeliveryDate: '', items: [] });
            fetchShipments();
            alert('Shipment created successfully!');
        } catch (error) {
            console.error('Failed to create shipment', error);
            alert('Failed to create shipment');
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await api.patch(`/logistics/shipments/${id}/status`, { status: newStatus, note: `Status updated to ${newStatus}` });
            fetchShipments();
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update status');
        }
    };

    const handleDeleteShipment = async (id) => {
        if (!confirm('Are you sure you want to delete this shipment?')) return;
        try {
            await api.delete(`/logistics/shipments/${id}`);
            fetchShipments();
            alert('Shipment deleted');
        } catch (error) {
            console.error('Failed to delete shipment', error);
            alert(error.response?.data?.error || 'Failed to delete shipment');
        }
    };

    const openRejectModal = (shipment) => {
        setRejectingShipment(shipment);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectShipment = async () => {
        try {
            await api.post(`/logistics/shipments/${rejectingShipment._id}/reject`, { reason: rejectReason });
            setShowRejectModal(false);
            setRejectingShipment(null);
            fetchShipments();
            alert('Shipment rejected');
        } catch (error) {
            console.error('Failed to reject shipment', error);
            alert(error.response?.data?.error || 'Failed to reject shipment');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Logistics Management</h1>
                    <p className="text-gray-500">Track and manage your shipments</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" /> Create Shipment
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search shipments..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50">
                        <Filter size={20} />
                        Filters
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Origin → Destination</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Carrier</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : shipments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No shipments found.</td>
                                </tr>
                            ) : (
                                shipments.map((shipment) => (
                                    <tr key={shipment._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{shipment.trackingId}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                    shipment.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                                                        shipment.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {shipment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{shipment.origin}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{shipment.destination}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {shipment.carrier?.name || 'Unassigned'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <select
                                                className="border rounded px-2 py-1 text-xs"
                                                value={shipment.status}
                                                onChange={(e) => handleStatusUpdate(shipment._id, e.target.value)}
                                                disabled={shipment.status === 'Rejected'}
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="In Transit">In Transit</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {shipment.status === 'Draft' && (
                                                    <button
                                                        onClick={() => handleDeleteShipment(shipment._id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                                {shipment.status !== 'Rejected' && shipment.status !== 'Delivered' && (
                                                    <button
                                                        onClick={() => openRejectModal(shipment)}
                                                        className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                                                        title="Reject"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Shipment Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Create New Shipment</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateShipment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select value={newShipment.type}
                                        onChange={e => setNewShipment({...newShipment, type: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                                        <option value="Outbound">Outbound (to customer)</option>
                                        <option value="Inbound">Inbound (from supplier)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                                    <input type="date" value={newShipment.expectedDeliveryDate}
                                        onChange={e => setNewShipment({...newShipment, expectedDeliveryDate: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="text" required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newShipment.origin}
                                        onChange={e => setNewShipment({...newShipment, origin: e.target.value})}
                                        placeholder="Warehouse A"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="text" required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newShipment.destination}
                                        onChange={e => setNewShipment({...newShipment, destination: e.target.value})}
                                        placeholder="Client Address"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="number" min="0" step="0.1"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newShipment.weight}
                                        onChange={e => setNewShipment({...newShipment, weight: parseFloat(e.target.value)})}/>
                                </div>
                            </div>

                            {/* Items being shipped */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Items being shipped</label>
                                    <button type="button"
                                        onClick={() => setNewShipment(s => ({...s, items: [...s.items, {productId:'', description:'', qty:1, unit:'nos'}]}))}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add item</button>
                                </div>
                                {newShipment.items.length === 0 && (
                                    <p className="text-xs text-gray-400 py-2 text-center border border-dashed border-gray-200 rounded-lg">
                                        No items added — optional but recommended
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {newShipment.items.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                                            <select value={item.productId}
                                                onChange={e => {
                                                    const p = products.find(p => p._id === e.target.value);
                                                    const items = [...newShipment.items];
                                                    items[idx] = {...items[idx], productId: e.target.value, description: p?.name || '', unit: p?.unit || 'nos'};
                                                    setNewShipment(s => ({...s, items}));
                                                }}
                                                className="col-span-5 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                <option value="">— Product —</option>
                                                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                            </select>
                                            <input placeholder="Desc" value={item.description}
                                                onChange={e => { const items=[...newShipment.items]; items[idx]={...items[idx],description:e.target.value}; setNewShipment(s=>({...s,items})); }}
                                                className="col-span-3 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                                            <input type="number" min="1" value={item.qty}
                                                onChange={e => { const items=[...newShipment.items]; items[idx]={...items[idx],qty:Number(e.target.value)}; setNewShipment(s=>({...s,items})); }}
                                                className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                                            <input placeholder="nos" value={item.unit}
                                                onChange={e => { const items=[...newShipment.items]; items[idx]={...items[idx],unit:e.target.value}; setNewShipment(s=>({...s,items})); }}
                                                className="col-span-1 border border-gray-200 rounded px-1 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                                            <button type="button"
                                                onClick={() => setNewShipment(s => ({...s, items: s.items.filter((_,i)=>i!==idx)}))}
                                                className="col-span-1 flex justify-center text-gray-300 hover:text-red-400">
                                                <XCircle size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                >
                                    Create Shipment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Shipment Modal */}
            {showRejectModal && rejectingShipment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Reject Shipment</h2>
                            <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-800">
                                <strong>Shipment:</strong> {rejectingShipment.trackingId}<br/>
                                <strong>Route:</strong> {rejectingShipment.origin} → {rejectingShipment.destination}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                            <textarea
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                rows="3"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g., Damaged in transit, Delivery refused, Address issue..."
                            ></textarea>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectShipment}
                                className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
                            >
                                Reject Shipment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logistics;
