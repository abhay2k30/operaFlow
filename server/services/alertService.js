const mongoose = require('mongoose');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shipment = require('../models/Shipment');
const Alert = require('../models/Alert');
const Organization = require('../models/Organization');
const StockTransaction = require('../models/StockTransaction');
const Party = require('../models/Party');

async function createAlertIfNotExists(alertData) {
  const existing = await Alert.findOne({
    orgId: alertData.orgId,
    type: alertData.type,
    entityId: alertData.entityId,
    status: { $ne: 'Resolved' }
  });
  if (!existing) await Alert.create(alertData);
}

// Helper: calculate supplier reliability (simplified version)
async function getSupplierReliability(orgId, supplierId) {
  if (!supplierId) return { z: 1.65, leadTime: 7 };

  const fulfilledPos = await PurchaseOrder.find({
    orgId,
    supplier: supplierId,
    status: 'Fulfilled',
    actualDeliveryDate: { $exists: true }
  }).lean();

  if (fulfilledPos.length === 0) return { z: 1.65, leadTime: 7 };

  // On-time %
  let onTime = 0;
  const leadTimes = [];
  for (const po of fulfilledPos) {
    if (po.expectedDate && po.actualDeliveryDate) {
      if (new Date(po.actualDeliveryDate) <= new Date(po.expectedDate)) onTime++;
      const lt = (new Date(po.actualDeliveryDate) - new Date(po.createdAt)) / (1000 * 60 * 60 * 24);
      if (lt > 0) leadTimes.push(lt);
    }
  }

  const onTimePct = (onTime / fulfilledPos.length) * 100;
  let z = 1.65;
  if (onTimePct > 90) z = 1.28;
  else if (onTimePct < 75) z = 2.33;

  // Avg lead time
  const avgLeadTime = leadTimes.length > 0
    ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
    : 7;

  return { z, leadTime: avgLeadTime };
}

// Helper: calculate demand sigma
async function getDemandSigma(orgId, productId) {
  const now = new Date();
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  const dailyDemand = await StockTransaction.aggregate([
    { $match: { orgId, productId, type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] }, createdAt: { $gte: d90 } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$qty' } } }
  ]);

  if (dailyDemand.length < 2) return 0;

  const values = dailyDemand.map(d => d.total);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Run checks for ALL active orgs
exports.runAlertChecks = async () => {
  try {
    const orgs = await Organization.find({ isActive: true }).select('_id').lean();
    for (const org of orgs) {
      await runForOrg(org._id);
    }
  } catch (e) {
    console.error('Alert check error:', e.message);
  }
};

async function runForOrg(orgId) {
  const org = await Organization.findById(orgId).lean();
  const defaultLeadTime = org?.planningDefaults?.leadTimeDays || 7;

  const products = await Product.find({ orgId }).populate('defaultSupplier', '_id').lean();
  const stockAgg = await Batch.aggregate([{ $match: { orgId } }, { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }]);
  const stockMap = {};
  stockAgg.forEach(i => stockMap[i._id.toString()] = i.totalStock);

  // Get supplier reliability for all suppliers
  const supplierRelMap = {};
  const suppliers = new Set(products.filter(p => p.defaultSupplier).map(p => p.defaultSupplier._id.toString()));
  for (const supId of suppliers) {
    supplierRelMap[supId] = await getSupplierReliability(orgId, supId);
  }

  for (const p of products) {
    const stock = stockMap[p._id.toString()] || 0;
    const supplierId = p.defaultSupplier?._id?.toString();
    const supplierRel = supplierRelMap[supplierId] || { z: 1.65, leadTime: defaultLeadTime };
    const leadTime = p.leadTimeDays ?? supplierRel.leadTime;
    const z = supplierRel.z;

    // Get demand sigma
    const demandSigma = await getDemandSigma(orgId, p._id);

    // Calculate dynamic reorder point and safety stock
    const safetyStock = Math.ceil(z * demandSigma * Math.sqrt(leadTime));

    // For alert, we need average daily demand - calculate quickly from last 30 days
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const recentDemand = await StockTransaction.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId), productId: p._id, type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] }, createdAt: { $gte: d30 } } },
      { $group: { _id: null, total: { $sum: '$qty' } } }
    ]);
    const avgDailyDemand = recentDemand.length > 0 ? recentDemand[0].total / 30 : 0;
    const reorderPoint = Math.ceil(avgDailyDemand * leadTime) + safetyStock;

    // Alerts
    if (stock <= safetyStock) {
      await createAlertIfNotExists({
        orgId, type: 'CRITICAL_STOCK', severity: 'HIGH', entityId: p._id, entityModel: 'Product',
        message: `${p.sku} critical: stock (${stock}) at or below safety stock (${safetyStock})`
      });
    } else if (stock <= reorderPoint) {
      await createAlertIfNotExists({
        orgId, type: 'LOW_STOCK', severity: 'HIGH', entityId: p._id, entityModel: 'Product',
        message: `${p.sku} needs reorder: stock ${stock} ≤ reorder point ${reorderPoint}`
      });
    }

    // Dead stock check - no movement in 90 days
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);
    const hasMovement = await StockTransaction.countDocuments({
      orgId, productId: p._id, createdAt: { $gte: d90 }
    });
    if (stock > 0 && hasMovement === 0) {
      await createAlertIfNotExists({
        orgId, type: 'DEAD_STOCK', severity: 'LOW', entityId: p._id, entityModel: 'Product',
        message: `${p.sku} no movement in 90 days (${stock} units)`
      });
    }
  }

  // PO delays
  const today = new Date();
  const delayedPOs = await PurchaseOrder.find({
    orgId, status: { $nin: ['Fulfilled', 'Rejected'] }, expectedDate: { $lt: today }
  }).lean();
  for (const po of delayedPOs) {
    await createAlertIfNotExists({
      orgId, type: 'DELAYED_PO', severity: 'HIGH', entityId: po._id, entityModel: 'PurchaseOrder',
      message: `PO #${po._id.toString().slice(-6)} is overdue`
    });
  }

  // Shipment delays
  const delayedShipments = await Shipment.find({
    orgId, status: { $nin: ['Delivered'] }, expectedDeliveryDate: { $lt: today }
  }).lean();
  for (const sh of delayedShipments) {
    await createAlertIfNotExists({
      orgId, type: 'SHIPMENT_DELAY', severity: 'MEDIUM', entityId: sh._id, entityModel: 'Shipment',
      message: `Shipment ${sh.trackingId} to ${sh.destination} is delayed`
    });
  }
}
