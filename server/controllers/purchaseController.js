const mongoose = require('mongoose');
const PurchaseOrder   = require('../models/PurchaseOrder');
const Batch           = require('../models/Batch');
const StockTransaction= require('../models/StockTransaction');
const { logAction }   = require('../services/auditService');

const createPO = async (req, res) => {
  try {
    const po = new PurchaseOrder({ ...req.body, orgId: req.user.orgId, createdBy: req.user._id });
    await po.save();
    logAction(req.user._id, 'CREATE_PO', 'PurchaseOrder', po._id, {}, req.user.orgId);
    res.status(201).send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const getPOs = async (req, res) => {
  try {
    const filter = { orgId: req.user.orgId };
    if (req.query.status) filter.status = req.query.status;
    const pos = await PurchaseOrder.find(filter)
      .populate('supplier', 'name gstin phone email')
      .populate('items.productId', 'name sku unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.send(pos);
  } catch (e) { res.status(500).send(e); }
};

const getPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('supplier', 'name gstin phone email address')
      .populate('items.productId', 'name sku unit')
      .populate('createdBy', 'name');
    if (!po) return res.status(404).send();
    res.send(po);
  } catch (e) { res.status(500).send(e); }
};

const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId }, req.body, { new: true }
    );
    if (!po) return res.status(404).send();
    logAction(req.user._id, 'UPDATE_PO', 'PurchaseOrder', po._id, req.body, req.user.orgId);
    res.send(po);
  } catch (e) { res.status(400).send(e); }
};

const receivePO = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, locationId, batchNo, expiryDate } = req.body;
    const po = await PurchaseOrder.findOne({ _id: req.params.id, orgId: req.user.orgId }).session(session);
    if (!po) throw new Error('PO not found');
    if (['Fulfilled','Rejected'].includes(po.status)) throw new Error('PO is already closed');

    for (const item of items) {
      const poItem = po.items.find(i => i.productId.toString() === item.productId);
      if (!poItem) throw new Error(`Product ${item.productId} not in PO`);
      if (poItem.receivedQty + item.qty > poItem.qty) throw new Error(`Cannot receive more than ordered`);

      await new Batch({ orgId: req.user.orgId, productId: item.productId, locationId, batchNo, qty: item.qty, expiryDate }).save({ session });
      await new StockTransaction({ orgId: req.user.orgId, type: 'PURCHASE', productId: item.productId, qty: item.qty, toLocation: locationId, createdBy: req.user._id }).save({ session });
      poItem.receivedQty += item.qty;
    }

    const allFulfilled = po.items.every(i => i.receivedQty >= i.qty);
    const anyReceived  = po.items.some(i => i.receivedQty > 0);
    if (allFulfilled) { po.status = 'Fulfilled'; po.actualDeliveryDate = new Date(); }
    else if (anyReceived) po.status = 'Partial';
    await po.save({ session });
    await session.commitTransaction();
    logAction(req.user._id, 'RECEIVE_PO', 'PurchaseOrder', po._id, { batchNo, locationId }, req.user.orgId);
    res.send(po);
  } catch (e) { await session.abortTransaction(); res.status(400).send({ error: e.message }); }
  finally { session.endSession(); }
};

const getStats = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const now = new Date();
    const openPOs    = await PurchaseOrder.countDocuments({ orgId, status: { $in: ['Pending','Partial'] } });
    const delayedPOs = await PurchaseOrder.countDocuments({ orgId, status: { $nin: ['Fulfilled','Rejected'] }, expectedDate: { $lt: now } });
    const totalValueAgg = await PurchaseOrder.aggregate([
      { $match: { orgId } }, { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: { $multiply: ['$items.qty','$items.price'] } } } }
    ]);
    const supplierStats = await PurchaseOrder.aggregate([
      { $match: { orgId } },
      { $group: { _id:'$supplier', count:{ $sum:1 }, totalValue:{ $sum:{ $sum:{ $map:{ input:'$items', as:'i', in:{ $multiply:['$$i.qty','$$i.price'] } } } } } } },
      { $lookup: { from: 'parties', localField: '_id', foreignField: '_id', as: 'supplier' } },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      { $project: { _id: '$supplier.name', count:1, totalValue:1 } },
      { $sort: { totalValue: -1 } }, { $limit: 5 }
    ]);
    const ageingBuckets = await PurchaseOrder.aggregate([
      { $match: { orgId, status: { $nin: ['Fulfilled','Rejected'] } } },
      { $project: { ageInDays: { $divide: [{ $subtract:[new Date(),'$createdAt'] }, 86400000] } } },
      { $bucket: { groupBy:'$ageInDays', boundaries:[0,30,60,90,Infinity], default:'90+', output:{ count:{ $sum:1 } } } }
    ]);
    res.send({
      kpis: { openPOs, totalPOValue: totalValueAgg[0]?.total || 0, delayedPOs },
      ageing: ageingBuckets, supplierStats
    });
  } catch (e) { res.status(500).send(e); }
};

module.exports = { createPO, getPOs, getPO, updatePO, receivePO, getStats };
