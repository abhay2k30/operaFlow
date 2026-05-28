/**
 * EOQ (Economic Order Quantity) Service
 *
 * Calculates optimal order quantity to minimize total inventory costs.
 *
 * Formula:
 * EOQ = √((2 × D × S) / H)
 * Where:
 *   D = Annual demand (units/year)
 *   S = Ordering cost per order (₹)
 *   H = Holding cost per unit per year (₹) = unitCost × holdingCostRate
 */

const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Organization = require('../../models/Organization');
const StockTransaction = require('../../models/StockTransaction');

/**
 * Calculate EOQ for a single product
 * @param {string} orgId - Organization ID
 * @param {string} productId - Product ID
 * @returns {object} EOQ calculation result
 */
async function calculateEOQ(orgId, productId) {
  const product = await Product.findOne({ _id: productId, orgId });
  if (!product) throw new Error('Product not found');

  const org = await Organization.findById(orgId).lean();
  const defaults = org?.planningDefaults || {};

  // Get parameters (product override or org default)
  const annualDemand = await getAnnualDemand(orgId, productId);
  const orderingCost = product.orderingCostPerOrder ?? defaults.orderingCost ?? 500;
  const unitCost = product.price || 1;
  const holdingRate = product.holdingCostRate ?? (defaults.holdingRatePercent ?? 20) / 100;

  // Calculate
  const holdingCostPerUnit = unitCost * holdingRate;

  // Validate
  if (annualDemand <= 0) {
    return { eoq: 0, isValid: false, error: 'No demand data available' };
  }
  if (orderingCost <= 0) {
    return { eoq: 0, isValid: false, error: 'Invalid ordering cost' };
  }
  if (unitCost <= 0) {
    return { eoq: 0, isValid: false, error: 'Invalid unit cost' };
  }
  if (holdingCostPerUnit <= 0) {
    return { eoq: 0, isValid: false, error: 'Invalid holding cost' };
  }

  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);

  // Calculate additional metrics
  const ordersPerYear = annualDemand / eoq;
  const annualOrderingCost = ordersPerYear * orderingCost;
  const averageInventory = eoq / 2;
  const annualHoldingCost = averageInventory * holdingCostPerUnit;
  const totalAnnualCost = annualOrderingCost + annualHoldingCost;

  return {
    isValid: true,
    eoq: Math.ceil(eoq),
    details: {
      annualDemand,
      orderingCost,
      unitCost,
      holdingCostRate: holdingRate * 100,
      holdingCostPerUnit: parseFloat(holdingCostPerUnit.toFixed(2)),
      ordersPerYear: parseFloat(ordersPerYear.toFixed(2)),
      annualOrderingCost: parseFloat(annualOrderingCost.toFixed(2)),
      averageInventory: parseFloat(averageInventory.toFixed(2)),
      annualHoldingCost: parseFloat(annualHoldingCost.toFixed(2)),
      totalAnnualCost: parseFloat(totalAnnualCost.toFixed(2))
    }
  };
}

/**
 * Calculate annual demand from transactions
 */
async function getAnnualDemand(orgId, productId, daysBack = 365) {
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

  return result[0]?.total || 0;
}

/**
 * Run EOQ calculation for all products
 */
async function calculateAllEOQ(orgId) {
  const products = await Product.find({ orgId, isActive: true }).lean();
  const results = [];

  for (const product of products) {
    try {
      const eoqResult = await calculateEOQ(orgId, product._id.toString());
      results.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        ...eoqResult
      });
    } catch (error) {
      results.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        isValid: false,
        eoq: 0,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  calculateEOQ,
  calculateAllEOQ,
  getAnnualDemand
};