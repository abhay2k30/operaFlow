const express   = require('express');
const { auth, authorize } = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');
const { InventoryService, TRANSACTION_TYPES } = require('../services/inventory');
const Batch     = require('../models/Batch');
const RejectionRecord  = require('../models/RejectionRecord');
const router    = express.Router();

router.get('/',        auth, inventoryController.getStock);
router.post('/issue',  auth, authorize(['Admin','InventoryManager']), inventoryController.issueStock);
router.post('/transfer', auth, authorize(['Admin','InventoryManager']), inventoryController.transferStock);

// ── Reject a batch (reduce qty + create rejection record) ─────────────────────
// Uses centralized InventoryService for stock decrease
router.post('/reject-batch', auth, authorize(['Admin','InventoryManager','QualityControl']), async (req, res) => {
  try {
    const { batchId, qty, reason, actionTaken = 'Quarantined' } = req.body;
    if (!batchId || !qty || !reason) {
      return res.status(400).json({ error: 'batchId, qty and reason are required' });
    }

    const batch = await Batch.findOne({ _id: batchId, orgId: req.user.orgId });
    if (!batch) throw new Error('Batch not found');
    if (qty > batch.qty) throw new Error(`Cannot reject more than available (${batch.qty})`);

    // Use centralized service for stock decrease
    const result = await InventoryService.decreaseStock({
      orgId: req.user.orgId,
      productId: batch.productId,
      locationId: batch.locationId,
      quantity: qty,
      transactionType: TRANSACTION_TYPES.ADJUSTMENT,
      referenceDocument: `Rejection:${batchId}`,
      batchId,
      performedBy: req.user._id,
      remarks: `REJECTED — ${reason}`
    });

    // Create rejection record
    const rejection = await RejectionRecord.create({
      orgId: req.user.orgId,
      productId: batch.productId,
      batchId: batch._id,
      qty,
      reason,
      actionTaken,
      stage: 'Receiving',
      createdBy: req.user._id
    });

    res.status(201).json({ result, rejection });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;