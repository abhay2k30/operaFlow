const express        = require('express');
const RejectionRecord= require('../models/RejectionRecord');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize(['Admin','InventoryManager','QualityControl']), async (req, res) => {
  try {
    const r = new RejectionRecord({ ...req.body, orgId: req.user.orgId, createdBy: req.user._id });
    await r.save(); res.status(201).send(r);
  } catch (e) { res.status(400).send(e); }
});

router.get('/', auth, async (req, res) => {
  try { res.send(await RejectionRecord.find({ orgId: req.user.orgId }).populate('productId','name sku').populate('createdBy','name').sort({ createdAt:-1 })); }
  catch (e) { res.status(500).send(e); }
});

module.exports = router;
