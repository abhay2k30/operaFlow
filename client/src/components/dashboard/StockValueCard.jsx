import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StockValueCard = ({ data }) => {
    const totalValue = data?.total || 0;
    const locations = data?.byLocation || [];

    // Calculate total batches and products count for display (mocking logic or using real if available)
    const totalBatches = locations.reduce((acc, loc) => acc + (loc.count || 0), 0);

    // Format currency
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-gray-500 font-medium text-sm mb-1">Stock Value</h3>
                    <div className="text-3xl font-bold text-gray-800">{formatCurrency(totalValue)}</div>
                </div>
                <div className="text-right text-xs text-gray-500">
                    <div className="font-medium text-gray-700">{totalBatches} Batches</div>
                    <div>In Stock</div>
                </div>
            </div>

            {/* Progress Bar - Mock visual for now as we don't have split data easily available without more processing */}
            <div className="w-full h-3 bg-gray-100 rounded-full mb-6 overflow-hidden flex">
                {locations.map((loc, idx) => (
                    <div
                        key={idx}
                        className={`h-full ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-green-500'}`}
                        style={{ width: `${loc.percentage}%` }}
                        title={loc.name}
                    ></div>
                ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                            <th className="pb-3">Location</th>
                            <th className="pb-3">Stock Value</th>
                            <th className="pb-3">Batches</th>
                            <th className="pb-3">Share</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {locations.length === 0 ? (
                            <tr><td colSpan="4" className="py-4 text-center text-gray-500">No stock data</td></tr>
                        ) : (
                            locations.map((row, index) => (
                                <tr key={index} className="border-b border-gray-50 last:border-0">
                                    <td className="py-4 font-medium text-gray-700">{row.name}</td>
                                    <td className="py-4 text-gray-600">{formatCurrency(row.value)}</td>
                                    <td className="py-4 text-gray-500 text-xs">{row.count}</td>
                                    <td className="py-4 w-24">
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${row.percentage > 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                                style={{ width: `${row.percentage}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Hidden for MVP as we show all locations or top 5 */}
        </div>
    );
};

export default StockValueCard;
