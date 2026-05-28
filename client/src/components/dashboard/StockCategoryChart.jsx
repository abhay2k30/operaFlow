import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const StockCategoryChart = ({ data = [] }) => {
    // Map API data to chart format if needed, or use directly if matches
    // API returns: [{ name, value, color }]
    // Component expects: [{ title, value, color, data: [{value: X}, {value: Y}] }]

    const charts = data.map(item => ({
        title: item.name,
        value: item.value,
        color: item.color,
        // Mocking the pie split for visual consistency as we only have total count
        data: [{ value: 100 }, { value: 0 }]
    }));

    if (charts.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                <h3 className="text-gray-700 font-semibold mb-6">Stock Value by Category</h3>
                <div className="text-center text-gray-500">No data available</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-gray-700 font-semibold mb-6">Stock Value by Category</h3>

            <div className="flex flex-col justify-between h-[calc(100%-2rem)] gap-4">
                {charts.map((chart, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className="relative w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chart.data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={55}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill={chart.color} />
                                        <Cell fill="#F3F4F6" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-700">{chart.value}</span>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">{chart.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockCategoryChart;
