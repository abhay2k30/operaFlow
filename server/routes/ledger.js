const express      = require('express');
const LedgerEntry  = require('../models/LedgerEntry');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize(['Admin','Finance']), async (req, res) => {
  try {
    const entry = new LedgerEntry({ ...req.body, orgId: req.user.orgId, createdBy: req.user._id });
    await entry.save(); res.status(201).send(entry);
  } catch (e) { res.status(400).send(e); }
});

router.get('/', auth, authorize(['Admin','Finance']), async (req, res) => {
  try {
    const entries = await LedgerEntry.find({ orgId: req.user.orgId })
      .populate('partyRef','name')
      .populate('createdBy','name')
      .sort({ createdAt:-1 });
    res.send(entries);
  } catch (e) { res.status(500).send(e); }
});

module.exports = router;
