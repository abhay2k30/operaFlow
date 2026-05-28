import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  Admin:            '/',
  InventoryManager: '/inventory',
  Procurement:      '/purchase-orders',
  Production:       '/production',
  Sales:            '/sales',
  Finance:          '/invoices',
  QualityControl:   '/quality',
};

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const home = ROLE_HOME[user?.role] || '/';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff size={28} className="text-red-500"/>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-1">
          Your role <span className="font-medium text-gray-700">({user?.role})</span> doesn't have permission to view this page.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Contact your Admin if you need access.
        </p>
        <button
          onClick={() => navigate(home)}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={15}/> Go to my dashboard
        </button>
      </div>
    </div>
  );
}
