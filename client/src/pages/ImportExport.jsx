import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const ImportExport = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage(null);
        setError(null);
    };

    const handleImport = async () => {
        if (!file) {
            setError('Please select a CSV file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await api.post('/import-export/products', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(`Import successful! Processed: ${response.data.successCount}, Errors: ${response.data.errorCount}`);
            setFile(null);
            // Reset file input manually if needed, or just let user see success
        } catch (err) {
            console.error('Import failed:', err);
            setError(err.response?.data || 'Import failed. Please check the file format.');
        } finally {
            setUploading(false);
        }
    };

    const handleExportProducts = async () => {
        try {
            const response = await api.get('/import-export/products', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'products.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to export products.');
        }
    };

    const handleExportStock = async () => {
        try {
            const response = await api.get('/import-export/stock', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'stock_levels.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to export stock.');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Data Import & Export</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Import Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Upload size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Import Products</h2>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Upload a CSV file to bulk create or update products.
                        Required columns: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">name, sku, unit, category</code>.
                    </p>

                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <FileText size={32} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">
                                    {file ? file.name : 'Click to select CSV file'}
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={!file || uploading}
                            className={`w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors ${!file || uploading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {uploading ? 'Importing...' : 'Start Import'}
                        </button>

                        {message && (
                            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                <CheckCircle size={16} />
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Export Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Download size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Export Data</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Products Catalog</h3>
                            <p className="text-xs text-gray-500 mb-3">Download a CSV of all products and their details.</p>
                            <button
                                onClick={handleExportProducts}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                <Download size={16} />
                                Export Products
                            </button>
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Stock Levels</h3>
                            <p className="text-xs text-gray-500 mb-3">Download a CSV of current stock quantities by batch and location.</p>
                            <button
                                onClick={handleExportStock}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                <Download size={16} />
                                Export Stock Levels
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportExport;
