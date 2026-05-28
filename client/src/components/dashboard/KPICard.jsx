import React from 'react';

const KPICard = ({ title, value, subtitle, colorClass = "text-blue-600" }) => {
    return (
        <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-gray-500 text-sm font-medium">{title}</h4>
            <div className={`text-2xl font-bold mt-2 ${colorClass}`}>{value}</div>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );
};

export default KPICard;
