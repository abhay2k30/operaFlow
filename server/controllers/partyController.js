const Party = require('../models/Party');
const { logAction } = require('../services/auditService');

const createParty = async (req, res) => {
  try {
    const party = new Party({ ...req.body, orgId: req.user.orgId });
    await party.save();
    logAction(req.user._id, 'CREATE_PARTY', 'Party', party._id, { name: party.name }, req.user.orgId);
    res.status(201).json(party);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
const getParties = async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = { orgId: req.user.orgId, isActive: true };
    if (type) filter.type = { $in: [type,'Both'] };
    if (search) filter.$text = { $search: search };
    res.json(await Party.find(filter).sort({ name: 1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const getParty = async (req, res) => {
  try {
    const p = await Party.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!p) return res.status(404).json({ error: 'Party not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const updateParty = async (req, res) => {
  try {
    const p = await Party.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, req.body, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ error: 'Party not found' });
    logAction(req.user._id, 'UPDATE_PARTY', 'Party', p._id, {}, req.user.orgId);
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
const deleteParty = async (req, res) => {
  try {
    const p = await Party.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, { isActive: false }, { new: true });
    if (!p) return res.status(404).json({ error: 'Party not found' });
    res.json({ message: 'Party deactivated', party: p });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const getPartyStatement = async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.find({ party: req.params.id, orgId: req.user.orgId }).sort({ createdAt: -1 }).limit(50);
    const totals = invoices.reduce((a, inv) => {
      a.totalBusiness += inv.grandTotal;
      if (['Issued','PartiallyPaid'].includes(inv.status)) a.outstanding += (inv.grandTotal - inv.paidAmount);
      return a;
    }, { totalBusiness:0, outstanding:0 });
    res.json({ party: req.params.id, ...totals, invoices });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
module.exports = { createParty, getParties, getParty, updateParty, deleteParty, getPartyStatement };
