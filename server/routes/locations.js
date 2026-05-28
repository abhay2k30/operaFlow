const express  = require('express');
const Location = require('../models/Location');
const { auth, authorize } = require('../middleware/auth');
const router   = express.Router();

router.get('/', auth, async (req, res) => {
  try { res.send(await Location.find({ orgId: req.user.orgId })); }
  catch (e) { res.status(500).send(e); }
});

router.post('/', auth, authorize(['Admin','InventoryManager']), async (req, res) => {
  try {
    const loc = new Location({ ...req.body, orgId: req.user.orgId });
    await loc.save();
    res.status(201).send(loc);
  } catch (e) { res.status(400).send(e); }
});

router.delete('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    const loc = await Location.findOneAndDelete({ _id: req.params.id, orgId: req.user.orgId });
    if (!loc) return res.status(404).send();
    res.send(loc);
  } catch (e) { res.status(500).send(e); }
});

module.exports = router;
