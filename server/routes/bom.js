const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/bomController');
const router = express.Router();

router.post('/',   auth, authorize(['Admin', 'Production']), c.createBoM);
router.get('/',    auth, c.getBoMs);
router.get('/product/:productId/active', auth, c.getActiveBoMForProduct);
router.get('/:id', auth, c.getBoM);
router.put('/:id', auth, authorize(['Admin', 'Production']), c.updateBoM);
router.get('/:id/explode', auth, c.explodeBoM);

module.exports = router;
