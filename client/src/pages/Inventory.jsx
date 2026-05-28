import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Search, Filter, Package } from 'lucide-react';

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stockFilter, setStockFilter] = useState('All');
    const [stockData, setStockData] = useState({});

    useEffect(() => {
        fetchProducts();
        fetchStockData();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStockData = async () => {
        try {
            const { data } = await api.get('/stock');
            const stockMap = {};
            data.forEach(item => {
                const productId = item._id?.productId || item.productId?._id || item.productId;
                stockMap[productId] = item.totalQty || 0;
            });
            setStockData(stockMap);
        } catch (error) {
            console.error('Error fetching stock data:', error);
        }
    };

    const getStockStatus = (product) => {
        const currentStock = stockData[product._id] || 0;
        if (currentStock === 0) return 'no-stock';
        if (product.category === 'Finished Goods') return 'finished-goods';
        return 'has-stock';
    };

    const filteredProducts = products.filter(product => {
        const status = getStockStatus(product);
        if (stockFilter === 'All') return true;
        if (stockFilter === 'No Stock') return status === 'no-stock';
        if (stockFilter === 'In Stock') return status === 'has-stock' || status === 'finished-goods';
        return true;
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                    <Plus size={20} />
                    Add Product
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['All', 'In Stock', 'No Stock'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStockFilter(f)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    stockFilter === f
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">In Stock</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No products found</td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const currentStock = stockData[product._id] || 0;
                                    const isFinishedGoods = product.category === 'Finished Goods';
                                    const needsReorder = !isFinishedGoods && currentStock <= (product.reorderPoint || 0);
                                    return (
                                        <tr key={product._id} className={`hover:bg-gray-50 ${currentStock === 0 ? 'bg-red-50' : needsReorder ? 'bg-amber-50' : ''}`}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {currentStock === 0 && <span className="w-2 h-2 bg-red-500 rounded-full" title="Out of stock"></span>}
                                                    {product.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                                            <td className={`px-6 py-4 text-sm font-medium ${currentStock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {currentStock}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {isFinishedGoods ? (
                                                    <span className="text-gray-400">—</span>
                                                ) : product.reorderPoint != null ? (
                                                    <div className="text-right">
                                                        <span className="font-medium text-gray-900">{product.reorderPoint}</span>
                                                        <span className="block text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-0.5 w-fit ml-auto">Calculated</span>
                                                    </div>
                                                ) : product.reorderLevel != null ? (
                                                    <div className="text-right">
                                                        <span className="font-medium text-gray-700">{product.reorderLevel}</span>
                                                        <span className="block text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 w-fit ml-auto">Manual</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-right">
                                                        <span className="text-gray-400">—</span>
                                                        <span className="block text-[10px] text-gray-400 mt-0.5">No data</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">Edit</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
