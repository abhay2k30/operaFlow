const express      = require('express');
const Organization = require('../models/Organization');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// GET org settings (planning defaults etc.)
router.get('/', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId)
      .select('name gstin phone email address industry planningDefaults plan trialEndsAt');
    if (!org) return res.status(404).json({ error: 'Organisation not found' });
    res.json(org);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH org settings — Admin only
router.patch('/', auth, authorize(['Admin']), async (req, res) => {
  try {
    const allowed = ['name','gstin','phone','email','address','industry','planningDefaults'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const org = await Organization.findByIdAndUpdate(
      req.user.orgId, updates, { new: true, runValidators: true }
    );
    if (!org) return res.status(404).json({ error: 'Organisation not found' });
    res.json(org);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
