const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const productionController = require('../controllers/productionController');
const router = express.Router();

router.post('/', auth, authorize(['Admin', 'Production']), productionController.createProductionOrder);
router.get('/', auth, productionController.getProductionOrders);
router.get('/wip-valuation', auth, authorize(['Admin', 'Production', 'Finance']), productionController.getWipValuation);
router.post('/:id/reserve', auth, authorize(['Admin', 'Production']), productionController.reserveMaterials);
router.post('/:id/consume', auth, authorize(['Admin', 'Production']), productionController.consumeMaterials);
router.post('/:id/complete', auth, authorize(['Admin', 'Production']), productionController.completeProduction);
router.post('/:id/quality-check', auth, authorize(['Admin', 'QualityControl', 'Production']), productionController.submitQualityCheck);

module.exports = router;
