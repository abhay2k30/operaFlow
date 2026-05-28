import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
    AlertCircle,
    Clock,
    Filter,
    ArrowRight,
    ShoppingCart,
    Factory,
    Truck,
    AlertTriangle
} from 'lucide-react';

const ACTION_ROUTES = {
  'Purchase Order':  (action) => `/purchase-orders/${action.id}`,
  'Production Order':() => `/production`,
  'Sales Order':     () => `/sales`,
  'Low Stock':       () => `/inventory`,
};

const PendingActions = () => {
    const navigate = useNavigate();
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('All');

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        try {
            const { data } = await api.get('/pending-actions');
            setActions(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch pending actions', error);
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Purchase Order': return <ShoppingCart className="w-5 h-5 text-blue-500" />;
            case 'Production Order': return <Factory className="w-5 h-5 text-purple-500" />;
            case 'Sales Order': return <Truck className="w-5 h-5 text-green-500" />;
            case 'Low Stock': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'bg-red-100 text-red-800';
            case 'High': return 'bg-orange-100 text-orange-800';
            case 'Medium': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredActions = filterType === 'All'
        ? actions
        : actions.filter(a => a.type === filterType);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pending Actions</h1>
                    <p className="text-gray-500">Tasks requiring your attention</p>
                </div>
                <div className="flex gap-2">
                    {['All', 'Purchase Order', 'Production Order', 'Sales Order', 'Low Stock'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredActions.length > 0 ? (
                                    filteredActions.map((action) => (
                                        <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-50 rounded-lg">
                                                        {getIcon(action.type)}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{action.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{action.description}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {action.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(action.priority)}`}>
                                                    {action.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {new Date(action.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => navigate(ACTION_ROUTES[action.type]?.(action) || '/')}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 hover:underline">
                                                    {action.actionRequired} <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            No pending actions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingActions;
