const ProductionOrder= require('../models/ProductionOrder');
const stockService   = require('../services/stockService');
const { logAction }  = require('../services/auditService');

const createProductionOrder = async (req, res) => {
  try {
    let { productToProduce, qty, materials, ...rest } = req.body;
    if (!materials || !materials.length) {
      const BOM = require('../models/BillOfMaterials');
      const bom = await BOM.findOne({ finishedProduct: productToProduce, isActive: true, orgId: req.user.orgId });
      if (bom) {
        const mult = qty / (bom.outputQty||1);
        materials = bom.components.map(c => ({
          productId: c.productId,
          qty: parseFloat((c.qty * mult * (1+(c.scrapFactor||0)/100)).toFixed(4))
        }));
      }
    }
    const po = new ProductionOrder({ ...rest, productToProduce, qty, materials: materials||[], orgId: req.user.orgId, createdBy: req.user._id });
    await po.save();
    logAction(req.user._id, 'CREATE_PRODUCTION_ORDER', 'ProductionOrder', po._id, {}, req.user.orgId);
    res.status(201).send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const getProductionOrders = async (req, res) => {
  try {
    const filter = { orgId: req.user.orgId };
    if (req.query.status) filter.status = req.query.status;
    const pos = await ProductionOrder.find(filter)
      .populate('productToProduce','name sku')
      .populate('materials.productId','name sku')
      .populate('createdBy','name')
      .sort({ createdAt: -1 });
    res.send(pos);
  } catch (e) { res.status(500).send(e); }
};

const reserveMaterials = async (req, res) => {
  try {
    const { materials } = req.body;
    const po = await ProductionOrder.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!po) return res.status(404).send();
    for (const mat of materials) {
      await stockService.reserveStock(mat.productId, mat.batchId, mat.qty, req.user._id, 'ProductionOrder', po._id, req.user.orgId);
    }
    po.status = 'In-Progress'; po.startDate = new Date();
    await po.save();
    logAction(req.user._id, 'RESERVE_MATERIALS', 'ProductionOrder', po._id, {}, req.user.orgId);
    res.send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const consumeMaterials = async (req, res) => {
  try {
    const { materials } = req.body;
    const po = await ProductionOrder.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!po) return res.status(404).send();
    for (const mat of materials) {
      await stockService.issueStock(mat.productId, mat.batchId, null, mat.qty, req.user._id, `Production Order #${po._id}`, req.user.orgId, 'PRODUCTION_CONSUMPTION');
      po.consumedMaterials.push({ productId: mat.productId, batchId: mat.batchId, qty: mat.qty });
    }
    await po.save();
    logAction(req.user._id, 'CONSUME_MATERIALS', 'ProductionOrder', po._id, {}, req.user.orgId);
    res.send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const completeProduction = async (req, res) => {
  try {
    const po = await ProductionOrder.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!po) return res.status(404).send();
    po.status = 'Quality Check';
    await po.save();
    logAction(req.user._id, 'COMPLETE_PRODUCTION', 'ProductionOrder', po._id, {}, req.user.orgId);
    res.send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const submitQualityCheck = async (req, res) => {
  try {
    const { acceptedQty, rejectedQty, rejectionReason } = req.body;
    const { locationId, batchNo, expiryDate } = req.query;
    const po = await ProductionOrder.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!po) return res.status(404).send();
    if (po.status !== 'Quality Check') {
      return res.status(400).send({ error: 'Production order is not in Quality Check status' });
    }

    const totalQty = acceptedQty + rejectedQty;
    if (totalQty !== po.qty) {
      return res.status(400).send({ error: `Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal order quantity (${po.qty})` });
    }

    const RejectionRecord = require('../models/RejectionRecord');
    const InventoryService = require('../services/inventory').InventoryService;
    const TRANSACTION_TYPES = require('../services/inventory').TRANSACTION_TYPES;

    if (acceptedQty > 0) {
      const location = locationId || (await require('../models/Location').findOne({ orgId: req.user.orgId })?._id);
      if (!location) return res.status(400).send({ error: 'No location available for output' });

      const batch = new (require('../models/Batch'))({
        orgId: req.user.orgId,
        productId: po.productToProduce,
        locationId: location,
        batchNo: batchNo || `PROD-${Date.now().toString().slice(-6)}`,
        qty: acceptedQty,
        expiryDate
      });
      await batch.save();

      await new (require('../models/StockTransaction'))({
        orgId: req.user.orgId,
        type: 'PRODUCTION_OUTPUT',
        productId: po.productToProduce,
        batchId: batch._id,
        qty: acceptedQty,
        toLocation: location,
        createdBy: req.user._id,
        referenceDocument: `ProductionOrder:${po._id}`
      }).save();
    }

    if (rejectedQty > 0) {
      const location = locationId || (await require('../models/Location').findOne({ orgId: req.user.orgId })?._id);
      if (location) {
        await InventoryService.decreaseStock({
          orgId: req.user.orgId,
          productId: po.productToProduce,
          locationId: location,
          quantity: rejectedQty,
          transactionType: TRANSACTION_TYPES.ADJUSTMENT,
          referenceDocument: `ProductionQC:${po._id}`,
          performedBy: req.user._id,
          remarks: `PRODUCTION REJECTION — ${rejectionReason || 'No reason provided'}`
        });
      }

      await RejectionRecord.create({
        orgId: req.user.orgId,
        productId: po.productToProduce,
        qty: rejectedQty,
        reason: rejectionReason || 'Production rejection during QC',
        actionTaken: 'Rejected',
        stage: 'Production',
        createdBy: req.user._id
      });
    }

    po.status = 'Completed';
    po.endDate = new Date();
    await po.save();
    logAction(req.user._id, 'QUALITY_CHECK_COMPLETE', 'ProductionOrder', po._id, { acceptedQty, rejectedQty }, req.user.orgId);
    res.send(po);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const getWipValuation = async (req, res) => {
  try {
    const BOM = require('../models/BillOfMaterials');
    const Product = require('../models/Product');

    const orders = await ProductionOrder.find({ orgId: req.user.orgId, status: 'In-Progress' })
      .populate('productToProduce', 'name sku price');

    if (!orders.length) {
      return res.json({ totalWipValue: 0, orderCount: 0, totalUnits: 0, orders: [] });
    }

    let totalWipValue = 0;
    const orderBreakdowns = [];

    for (const order of orders) {
      const bom = await BOM.findOne({ finishedProduct: order.productToProduce._id, isActive: true, orgId: req.user.orgId })
        .populate('components.productId', 'price');

      let orderValue = 0;
      let materialCost = 0;

      if (bom && bom.outputQtyPerRun) {
        const multiplier = order.qty / bom.outputQtyPerRun;
        for (const comp of bom.components) {
          const materialPrice = comp.productId?.price || 0;
          materialCost += comp.qty * materialPrice;
          orderValue += (comp.qty * multiplier * materialPrice);
        }
      } else if (order.materials?.length) {
        for (const mat of order.materials) {
          const product = await Product.findById(mat.productId);
          const materialPrice = product?.price || 0;
          materialCost += mat.qty * materialPrice;
          orderValue += mat.qty * materialPrice;
        }
      }

      totalWipValue += orderValue;
      orderBreakdowns.push({
        orderId: order._id,
        productName: order.productToProduce?.name || 'Unknown',
        qty: order.qty,
        materialCost: materialCost,
        estimatedValue: orderValue
      });
    }

    res.json({
      totalWipValue: Math.round(totalWipValue * 100) / 100,
      orderCount: orders.length,
      totalUnits: orders.reduce((sum, o) => sum + o.qty, 0),
      orders: orderBreakdowns
    });
  } catch (e) { res.status(500).send({ error: e.message }); }
};

module.exports = { createProductionOrder, getProductionOrders, reserveMaterials, consumeMaterials, completeProduction, submitQualityCheck, getWipValuation };
