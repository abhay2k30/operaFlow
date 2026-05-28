const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const optimizationController = require('../controllers/optimizationController');

// Run full optimization (EOQ + ABC + ROP)
router.post('/run', auth, authorize(['Admin', 'InventoryManager']), optimizationController.runFullOptimization);

// Get optimization status and summary
router.get('/status', auth, optimizationController.getOptimizationStatus);

// Get ABC summary
router.get('/abc', auth, optimizationController.getABCSummary);

// Get reorder alerts
router.get('/reorder-alerts', auth, optimizationController.getReorderAlerts);

// Get single product optimization (EOQ + ROP)
router.get('/product/:id', auth, async (req, res) => {
  try {
    const { EOQService, ReorderService } = require('../services/optimization');
    const eoq = await EOQService.calculateEOQ(req.user.orgId, req.params.id);
    const rop = await ReorderService.calculateROP(req.user.orgId, req.params.id);
    res.json({ ...eoq, ...rop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update criticality level
router.patch('/product/:id/criticality', auth, authorize(['Admin', 'InventoryManager']), optimizationController.updateCriticality);

// Auto-assign criticality based on ABC
router.post('/auto-criticality', auth, authorize(['Admin', 'InventoryManager']), optimizationController.autoAssignCriticality);

module.exports = router;