const BillOfMaterials = require('../models/BillOfMaterials');
const { logAction }   = require('../services/auditService');

const createBoM = async (req, res) => {
  try {
    await BillOfMaterials.updateMany({ finishedProduct: req.body.finishedProduct, isActive: true, orgId: req.user.orgId }, { $set: { isActive: false } });
    const bom = new BillOfMaterials({ ...req.body, orgId: req.user.orgId, createdBy: req.user._id });
    await bom.save();
    logAction(req.user._id, 'CREATE_BOM', 'BillOfMaterials', bom._id, {}, req.user.orgId);
    res.status(201).json(bom);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
const getBoMs = async (req, res) => {
  try {
    const filter = { orgId: req.user.orgId };
    if (req.query.finishedProduct) filter.finishedProduct = req.query.finishedProduct;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const boms = await BillOfMaterials.find(filter).populate('finishedProduct','name sku unit').populate('components.productId','name sku unit').populate('createdBy','name').sort({ createdAt:-1 });
    res.json(boms);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const getBoM = async (req, res) => {
  try {
    const bom = await BillOfMaterials.findOne({ _id: req.params.id, orgId: req.user.orgId }).populate('finishedProduct','name sku unit category').populate('components.productId','name sku unit price').populate('createdBy','name');
    if (!bom) return res.status(404).json({ error: 'BoM not found' });
    res.json(bom);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const getActiveBoMForProduct = async (req, res) => {
  try {
    const bom = await BillOfMaterials.findOne({ finishedProduct: req.params.productId, isActive: true, orgId: req.user.orgId }).populate('finishedProduct','name sku unit').populate('components.productId','name sku unit price');
    if (!bom) return res.status(404).json({ error: 'No active BoM for this product' });
    res.json(bom);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
const updateBoM = async (req, res) => {
  try {
    const bom = await BillOfMaterials.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, req.body, { new: true, runValidators: true });
    if (!bom) return res.status(404).json({ error: 'BoM not found' });
    res.json(bom);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
const explodeBoM = async (req, res) => {
  try {
    const { qty = 1 } = req.query;
    const bom = await BillOfMaterials.findOne({ _id: req.params.id, orgId: req.user.orgId }).populate('components.productId');
    if (!bom) return res.status(404).json({ error: 'BoM not found' });
    const mult = Number(qty) / (bom.outputQty||1);
    const explosion = bom.components.map(c => ({
      productId: c.productId._id, name: c.productId.name, sku: c.productId.sku, unit: c.unit,
      baseQty: c.qty, requiredQty: parseFloat((c.qty*mult*(1+(c.scrapFactor||0)/100)).toFixed(4))
    }));
    res.json({ bomId: bom._id, product: bom.finishedProduct, productionQty: Number(qty), components: explosion });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
module.exports = { createBoM, getBoMs, getBoM, getActiveBoMForProduct, updateBoM, explodeBoM };
