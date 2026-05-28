import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const StockAgeingCard = ({ data = [] }) => {
    // Fallback if data is empty or not provided
    const chartData = data.length > 0 ? data : [
        { range: '0-30 Days', value: 0 },
        { range: '31-60 Days', value: 0 },
        { range: '61-90 Days', value: 0 },
        { range: '90+ Days', value: 0 },
    ];

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-gray-700 font-semibold mb-4">Stock Ageing</h3>

            <div className="space-y-4">
                {chartData.map((item, index) => (
                    <div key={index} className="flex items-center text-xs">
                        <div className="w-24 font-medium text-gray-600 text-right pr-3">{item.range}</div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${item.value > 100 ? 100 : item.value}%` }}
                            ></div>
                        </div>
                        <div className="w-12 text-right text-gray-500 pl-2">{item.value}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockAgeingCard;
