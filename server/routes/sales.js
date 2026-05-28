const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const salesController = require('../controllers/salesController');
const router = express.Router();

router.post('/', auth, authorize(['Admin', 'Sales']), salesController.createSO);
router.get('/', auth, salesController.getSOs);
router.post('/:id/reserve', auth, authorize(['Admin', 'Sales']), salesController.reserveStockForSO);
router.post('/:id/ship', auth, authorize(['Admin', 'InventoryManager']), salesController.shipSO);

module.exports = router;
