const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const { auth, authorize } = require('../middleware/auth');

// Allow Admin, Logistics, and Inventory Manager to manage shipments
router.post('/shipments', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.createShipment);
router.get('/shipments', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.getShipments);
router.patch('/shipments/:id/status', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.updateStatus);
router.patch('/shipments/:id/carrier', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.assignCarrier);
router.delete('/shipments/:id', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.deleteShipment);
router.post('/shipments/:id/reject', auth, authorize('Admin', 'Logistics', 'InventoryManager'), logisticsController.rejectShipment);

module.exports = router;
