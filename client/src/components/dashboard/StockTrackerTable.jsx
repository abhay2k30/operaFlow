import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StockTrackerTable = ({ data = [] }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <h3 className="text-blue-500 font-medium text-sm mb-6">Low Stock Tracker</h3>

            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs font-bold text-gray-800 border-b border-gray-50">
                            <th className="pb-3 pl-2">Product</th>
                            <th className="pb-3 text-center">SKU</th>
                            <th className="pb-3 text-center">Current Stock</th>
                            <th className="pb-3 text-center">Reorder Level</th>
                            <th className="pb-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {data.length === 0 ? (
                            <tr><td colSpan="5" className="py-4 text-center text-gray-500">No low stock items</td></tr>
                        ) : (
                            data.map((item, index) => (
                                <tr key={index} className="border-b border-gray-50 last:border-0">
                                    <td className="py-4 pl-2">
                                        <div className="font-medium text-gray-700">{item.name}</div>
                                    </td>
                                    <td className="py-4 text-center text-gray-500">{item.sku}</td>
                                    <td className="py-4 text-center font-medium text-gray-800">{item.totalQty}</td>
                                    <td className="py-4 text-center font-medium text-gray-500">{item.reorderLevel}</td>
                                    <td className="py-4 text-center">
                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                            Low Stock
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockTrackerTable;
