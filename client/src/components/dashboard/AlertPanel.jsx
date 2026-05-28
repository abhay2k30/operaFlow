import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const AlertPanel = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const { data } = await api.get('/alerts', { params: { status: 'Unread' } });
                setAlerts(data);
            } catch (error) {
                console.error('Error fetching alerts:', error);
            }
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/alerts/${id}/read`);
            setAlerts(alerts.filter(a => a._id !== id));
        } catch (error) {
            console.error('Error marking alert as read:', error);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-red-500">
            <h3 className="font-bold text-lg mb-3 text-red-600">Active Alerts</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map(alert => (
                    <div key={alert._id} className="flex justify-between items-center bg-red-50 p-3 rounded">
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">{alert.type.replace(/_/g, ' ')}</span>
                            <span className="text-sm text-gray-700">{alert.message}</span>
                        </div>
                        <button
                            onClick={() => markAsRead(alert._id)}
                            className="text-xs bg-white border border-red-300 px-2 py-1 rounded text-red-600 hover:bg-red-50"
                        >
                            Acknowledge
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertPanel;
