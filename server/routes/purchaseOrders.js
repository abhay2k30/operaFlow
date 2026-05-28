const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const purchaseController = require('../controllers/purchaseController');
const router = express.Router();

router.post('/', auth, authorize(['Admin', 'Procurement']), purchaseController.createPO);
router.get('/stats', auth, purchaseController.getStats);
router.get('/', auth, purchaseController.getPOs);
router.get('/:id', auth, purchaseController.getPO);
router.put('/:id', auth, authorize(['Admin', 'Procurement']), purchaseController.updatePO);
router.post('/:id/receive', auth, authorize(['Admin', 'InventoryManager']), purchaseController.receivePO);

module.exports = router;
