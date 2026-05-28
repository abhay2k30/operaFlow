const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');
const router = express.Router();

router.get('/', auth, inventoryController.getProducts);
router.get('/:id', auth, inventoryController.getProduct);
router.post('/', auth, authorize(['Admin', 'InventoryManager', 'Procurement']), inventoryController.createProduct);
router.put('/:id', auth, authorize(['Admin', 'InventoryManager', 'Procurement']), inventoryController.updateProduct);
router.delete('/:id', auth, authorize(['Admin']), inventoryController.deleteProduct);

module.exports = router;
