import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import Login            from './pages/Login';
import Register         from './pages/Register';
import Dashboard        from './pages/Dashboard';
import InventoryDashboard from './pages/InventoryDashboard';
import Inventory        from './pages/Inventory';
import Logistics        from './pages/Logistics';
import PurchaseDashboard from './pages/PurchaseDashboard';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import SalesDashboard   from './pages/SalesDashboard';
import ProductionDashboard from './pages/ProductionDashboard';
import QualityControl   from './pages/QualityControl';
import Parties          from './pages/Parties';
import BillOfMaterials  from './pages/BillOfMaterials';
import InventoryPlanning from './pages/InventoryPlanning';
import PerformanceMetrics from './pages/PerformanceMetrics';
import Invoices         from './pages/Invoices';
import Ledger           from './pages/Ledger';
import ImportExport     from './pages/ImportExport';
import AdminUsers       from './pages/AdminUsers';
import PendingActions   from './pages/PendingActions';
import PurchaseOrders   from './pages/PurchaseOrders';
import Unauthorized     from './pages/Unauthorized';
import CompanySignup    from './pages/CompanySignup';
import Settings         from './pages/Settings';

// Role groups (keep in sync with permissions.js)
const INV   = ['Admin', 'InventoryManager', 'Procurement', 'Production', 'QualityControl'];
const LOG   = ['Admin', 'InventoryManager'];
const PO    = ['Admin', 'Procurement'];
const SO    = ['Admin', 'Sales'];
const PROD  = ['Admin', 'Production'];
const QC    = ['Admin', 'QualityControl'];
const PAR   = ['Admin', 'Procurement', 'Sales'];
const BOM   = ['Admin', 'Production'];
const PLAN  = ['Admin', 'InventoryManager', 'Production', 'Procurement'];
const PERF  = ['Admin', 'Finance', 'Procurement', 'Sales'];
const INV_F = ['Admin', 'Finance', 'Sales'];
const LED   = ['Admin', 'Finance'];
const IMP   = ['Admin', 'InventoryManager'];
const ADM   = ['Admin'];

// Wrap a page with Layout + role protection in one line
const P = ({ roles, children }) => (
  <ProtectedRoute allowedRoles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register-company" element={<CompanySignup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected — outer guard: must be logged in */}
          <Route element={<ProtectedRoute />}>

            {/* Dashboard + Pending — everyone */}
            <Route path="/"                element={<Layout><Dashboard /></Layout>} />
            <Route path="/pending-actions" element={<Layout><PendingActions /></Layout>} />

            {/* Inventory */}
            <Route path="/inventory"       element={<P roles={INV}><InventoryDashboard /></P>} />
            <Route path="/inventory/list"  element={<P roles={INV}><Inventory /></P>} />

            {/* Logistics */}
            <Route path="/logistics"       element={<P roles={LOG}><Logistics /></P>} />

            {/* Procurement */}
            <Route path="/purchase-orders"     element={<P roles={PO}><PurchaseDashboard /></P>} />
            <Route path="/purchase-orders/:id" element={<P roles={PO}><PurchaseOrderDetail /></P>} />

            {/* Sales */}
            <Route path="/sales"           element={<P roles={SO}><SalesDashboard /></P>} />

            {/* Production */}
            <Route path="/production"      element={<P roles={PROD}><ProductionDashboard /></P>} />

            {/* Quality */}
            <Route path="/quality"         element={<P roles={QC}><QualityControl /></P>} />

            {/* Master Data */}
            <Route path="/parties"         element={<P roles={PAR}><Parties /></P>} />
            <Route path="/bom"             element={<P roles={BOM}><BillOfMaterials /></P>} />

            {/* Analytics */}
            <Route path="/planning"        element={<P roles={PLAN}><InventoryPlanning /></P>} />
            <Route path="/performance"     element={<P roles={PERF}><PerformanceMetrics /></P>} />

            {/* Finance */}
            <Route path="/invoices"        element={<P roles={INV_F}><Invoices /></P>} />
            <Route path="/accounting"      element={<P roles={LED}><Ledger /></P>} />

            {/* Admin */}
            <Route path="/import-export"   element={<P roles={IMP}><ImportExport /></P>} />
            <Route path="/settings"          element={<Layout><Settings /></Layout>} />
            <Route path="/users"           element={<P roles={ADM}><AdminUsers /></P>} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
