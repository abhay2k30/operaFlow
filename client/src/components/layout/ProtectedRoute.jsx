import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Two modes:
 *  1. Route wrapper (no props):  <Route element={<ProtectedRoute />}>
 *  2. Component wrap:            <ProtectedRoute allowedRoles={['Admin']}><Comp/></ProtectedRoute>
 */
const ProtectedRoute = ({ allowedRoles = [], roles = [], children }) => {
  const { user, loading } = useAuth();
  const effectiveRoles = allowedRoles.length ? allowedRoles : roles;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Not logged in → login page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but wrong role → unauthorized page
  if (effectiveRoles.length > 0 && !effectiveRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
