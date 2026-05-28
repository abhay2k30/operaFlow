require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── Core routes (original) ───────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/products',         require('./routes/products'));
app.use('/api/locations',        require('./routes/locations'));
app.use('/api/logistics',        require('./routes/logistics'));
app.use('/api/stock',            require('./routes/stock'));
app.use('/api/purchase-orders',  require('./routes/purchaseOrders'));
app.use('/api/sales-orders',     require('./routes/sales'));
app.use('/api/production-orders',require('./routes/production'));
app.use('/api/dashboard',        require('./routes/dashboard'));
app.use('/api/pending-actions',  require('./routes/pendingActions'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/rejections',       require('./routes/rejections'));
app.use('/api/ledger',           require('./routes/ledger'));
app.use('/api/import-export',    require('./routes/importExport'));
app.use('/api/alerts',           require('./routes/alerts'));
app.use('/api/analytics',        require('./routes/analytics'));

// ── New routes (Phase 2: SME manufacturing additions) ────────────────────────
app.use('/api/parties',          require('./routes/parties'));   // Supplier/Customer master
app.use('/api/bom',              require('./routes/bom'));       // Bill of Materials
app.use('/api/invoices',         require('./routes/invoices'));  // GST Invoices
app.use('/api/settings',         require('./routes/settings'));  // Org settings

// ── Inventory Optimization ────────────────────────────────────────────────────
app.use('/api/optimization',     require('./routes/optimization'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  status: 'ok',
  app: 'OperaFlow ERP API',
  version: '2.0.0'
}));

// ── Alert cron ────────────────────────────────────────────────────────────────
const alertService = require('./services/alertService');
alertService.runAlertChecks();
setInterval(alertService.runAlertChecks, 1000 * 60 * 60);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
