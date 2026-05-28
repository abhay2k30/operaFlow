/**
 * Reorder Point (ROP) Service
 *
 * Calculates when to reorder based on demand and lead time.
 *
 * Formula:
 * ROP = (dailyDemand × leadTimeDays) + safetyStock
 *
 * Safety Stock (Statistical):
 * SS = Z × σ × √L
 * Where:
 *   Z = Service level factor (1.28=90%, 1.65=95%, 2.33=99%)
 *   σ = Standard deviation of daily demand
 *   L = Lead time in days
 */

const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Organization = require('../../models/Organization');
const Batch = require('../../models/Batch');
const StockTransaction = require('../../models/StockTransaction');
const PurchaseOrder = require('../../models/PurchaseOrder');

/**
 * Calculate reorder point for a product
 * @param {string} orgId - Organization ID
 * @param {string} productId - Product ID
 * @param {object} options - Override options
 */
async function calculateROP(orgId, productId, options = {}) {
  const product = await Product.findOne({ _id: productId, orgId });
  if (!product) throw new Error('Product not found');

  const org = await Organization.findById(orgId).lean();
  const defaults = org?.planningDefaults || {};

  // Get parameters
  const leadTimeDays = product.leadTimeDays ?? defaults.leadTimeDays ?? 7;
  const safetyStockDays = product.safetyStockDays ?? defaults.safetyStockDays ?? 3;

  // Calculate daily demand
  const dailyDemand = await getAverageDailyDemand(orgId, productId);
  const demandSigma = await getDemandStandardDeviation(orgId, productId);

  // Get supplier reliability for dynamic Z (if supplier exists)
  let zValue = 1.65; // default 95%
  if (product.defaultSupplier) {
    const reliability = await getSupplierReliability(orgId, product.defaultSupplier);
    zValue = reliability.zValue;
  }

  // Calculate safety stock (statistical or simplified)
  const safetyStock = calculateSafetyStock(demandSigma, leadTimeDays, zValue, dailyDemand, safetyStockDays);

  // Calculate ROP
  const reorderPoint = Math.ceil(dailyDemand * leadTimeDays) + safetyStock;

  return {
    isValid: true,
    reorderPoint,
    safetyStock,
    dailyDemand: parseFloat(dailyDemand.toFixed(3)),
    demandSigma: parseFloat(demandSigma.toFixed(3)),
    leadTimeDays,
    zValue,
    details: {
      leadTimeDemand: Math.ceil(dailyDemand * leadTimeDays),
      safetyStockFormula: `Z × σ × √L = ${zValue} × ${demandSigma.toFixed(2)} × √${leadTimeDays}`,
      formula: `(${dailyDemand.toFixed(2)} × ${leadTimeDays}) + ${safetyStock}`
    }
  };
}

/**
 * Calculate safety stock
 */
function calculateSafetyStock(demandSigma, leadTimeDays, zValue, dailyDemand, safetyStockDays) {
  // If we have demand sigma and lead time, use statistical formula
  if (demandSigma > 0 && leadTimeDays > 0) {
    return Math.ceil(zValue * demandSigma * Math.sqrt(leadTimeDays));
  }
  // Fallback to simple days-based method
  if (dailyDemand > 0 && safetyStockDays > 0) {
    return Math.ceil(dailyDemand * safetyStockDays);
  }
  return 0;
}

/**
 * Get average daily demand from transactions
 */
async function getAverageDailyDemand(orgId, productId, daysBack = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const result = await StockTransaction.aggregate([
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(orgId),
        productId: new mongoose.Types.ObjectId(productId),
        type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] },
        createdAt: { $gte: startDate }
      }
    },
    { $group: { _id: null, total: { $sum: '$qty' } } }
  ]);

  const total = result[0]?.total || 0;
  return total / daysBack;
}

/**
 * Get standard deviation of daily demand
 */
async function getDemandStandardDeviation(orgId, productId, daysBack = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const dailyDemands = await StockTransaction.aggregate([
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(orgId),
        productId: new mongoose.Types.ObjectId(productId),
        type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$qty' }
      }
    }
  ]);

  if (dailyDemands.length < 2) return 0;

  const values = dailyDemands.map(d => d.total);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Get supplier reliability and Z value
 */
async function getSupplierReliability(orgId, supplierId) {
  if (!supplierId) return { score: 75, zValue: 1.65 };

  const fulfilledPos = await PurchaseOrder.find({
    orgId,
    supplier: supplierId,
    status: 'Fulfilled',
    actualDeliveryDate: { $exists: true }
  }).lean();

  if (fulfilledPos.length === 0) return { score: 75, zValue: 1.65 };

  // Calculate on-time %
  let onTimeCount = 0;
  for (const po of fulfilledPos) {
    if (po.expectedDate && po.actualDeliveryDate) {
      if (new Date(po.actualDeliveryDate) <= new Date(po.expectedDate)) {
        onTimeCount++;
      }
    }
  }

  const onTimePct = (onTimeCount / fulfilledPos.length) * 100;

  // Map to Z value
  let zValue;
  let score;
  if (onTimePct > 90) {
    score = 90 + (onTimePct - 90); // Could go to 100
    zValue = 1.28; // 90% service level
  } else if (onTimePct >= 75) {
    score = onTimePct;
    zValue = 1.65; // 95% service level
  } else {
    score = onTimePct;
    zValue = 2.33; // 99% service level
  }

  return { score: Math.round(score), zValue };
}

/**
 * Calculate ROP for all products and get reorder alerts
 */
async function getReorderAlerts(orgId) {
  const products = await Product.find({ orgId, isActive: true }).lean();

  // Get current stock levels
  const stockAgg = await Batch.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
    { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }
  ]);
  const stockMap = {};
  stockAgg.forEach(i => stockMap[i._id.toString()] = i.totalStock);

  const alerts = [];

  for (const product of products) {
    try {
      const ropResult = await calculateROP(orgId, product._id.toString());
      const currentStock = stockMap[product._id.toString()] || 0;
      const needsReorder = currentStock <= ropResult.reorderPoint;

      if (needsReorder) {
        alerts.push({
          productId: product._id,
          sku: product.sku,
          name: product.name,
          currentStock,
          reorderPoint: ropResult.reorderPoint,
          safetyStock: ropResult.safetyStock,
          dailyDemand: ropResult.dailyDemand,
          abcCategory: product.abcCategory || 'C',
          criticalityLevel: product.criticalityLevel || 'Medium',
          priority: product.abcCategory === 'A' ? 1 : product.abcCategory === 'B' ? 2 : 3
        });
      }
    } catch (error) {
      // Skip products with errors
    }
  }

  // Sort by priority (A items first)
  alerts.sort((a, b) => a.priority - b.priority || a.currentStock - b.currentStock);

  return {
    totalProducts: products.length,
    itemsNeedingReorder: alerts.length,
    alerts
  };
}

module.exports = {
  calculateROP,
  calculateSafetyStock,
  getAverageDailyDemand,
  getDemandStandardDeviation,
  getSupplierReliability,
  getReorderAlerts
};