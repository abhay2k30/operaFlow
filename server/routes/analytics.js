const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');

router.get('/inventory',            auth, analyticsController.getInventoryAnalytics);
router.get('/procurement',          auth, analyticsController.getProcurementAnalytics);
router.get('/production',           auth, analyticsController.getProductionAnalytics);
router.get('/sales',                auth, analyticsController.getSalesAnalytics);
router.get('/logistics',            auth, analyticsController.getLogisticsAnalytics);
router.get('/finance',              auth, analyticsController.getFinanceAnalytics);
router.get('/kpi',                  auth, analyticsController.getDashboardKPIs);
router.get('/inventory-planning',   auth, analyticsController.getInventoryPlanning);
router.get('/supplier-performance', auth, analyticsController.getSupplierPerformance);
router.get('/customer-performance', auth, analyticsController.getCustomerPerformance);

module.exports = router;
