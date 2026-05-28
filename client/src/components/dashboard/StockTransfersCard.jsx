import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StockTransfersCard = ({ data = [] }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <h3 className="text-blue-500 font-medium text-sm mb-1">Recent Stock Transfers</h3>
            <div className="text-3xl font-bold text-gray-800 mb-4">{data.length}</div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500">
                            <th className="pb-2">Product</th>
                            <th className="pb-2">From</th>
                            <th className="pb-2">To</th>
                            <th className="pb-2">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {data.length === 0 ? (
                            <tr><td colSpan="4" className="py-3 text-gray-500 text-center">No recent transfers</td></tr>
                        ) : (
                            data.map((transfer, index) => (
                                <tr key={index} className="border-b border-gray-50 last:border-0">
                                    <td className="py-3 text-gray-700 font-medium">{transfer.productId?.name || 'Unknown'}</td>
                                    <td className="py-3 text-gray-600">{transfer.fromLocation?.name || '-'}</td>
                                    <td className="py-3 text-gray-600">{transfer.toLocation?.name || '-'}</td>
                                    <td className="py-3 text-gray-800 font-bold">{transfer.qty}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockTransfersCard;
