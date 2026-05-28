/**
 * ABC Analysis Service
 *
 * Implements Pareto-based inventory classification.
 *
 * Logic:
 * 1. Calculate annual consumption value = annualDemand × unitCost
 * 2. Sort products by value descending
 * 3. Calculate cumulative percentage
 * 4. Classify:
 *    - A: Top 70-80% (cumulative <= 80%)
 *    - B: Next 15-20% (cumulative <= 95%)
 *    - C: Remaining items
 */

const mongoose = require('mongoose');
const Product = require('../../models/Product');
const StockTransaction = require('../../models/StockTransaction');

/**
 * Perform ABC Analysis on all products
 * @param {string} orgId - Organization ID
 * @param {object} options - Configuration options
 * @param {number} options.aThreshold - Top % for A category (default 80)
 * @param {number} options.bThreshold - Cumulative % for B category (default 95)
 */
async function performABCAnalysis(orgId, options = {}) {
  const { aThreshold = 80, bThreshold = 95 } = options;

  // Get all active products
  const products = await Product.find({ orgId, isActive: true }).lean();

  // Calculate annual demand and value for each product
  const itemsWithValue = await Promise.all(
    products.map(async (product) => {
      const annualDemand = await getAnnualDemand(orgId, product._id.toString());
      const annualValue = annualDemand * (product.price || 0);

      return {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price || 0,
        annualDemand,
        annualConsumptionValue: annualValue
      };
    })
  );

  // Sort by annual consumption value descending
  itemsWithValue.sort((a, b) => b.annualConsumptionValue - a.annualConsumptionValue);

  // Calculate total
  const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualConsumptionValue, 0);

  if (totalValue === 0) {
    // No consumption data - all C
    return itemsWithValue.map(item => ({
      ...item,
      abcCategory: 'C',
      cumulativePercent: 100,
      percentOfTotal: 0
    }));
  }

  // Assign categories
  let cumulativeValue = 0;
  const result = itemsWithValue.map(item => {
    cumulativeValue += item.annualConsumptionValue;
    const cumulativePercent = (cumulativeValue / totalValue) * 100;
    const percentOfTotal = (item.annualConsumptionValue / totalValue) * 100;

    let abcCategory;
    if (cumulativePercent <= aThreshold) {
      abcCategory = 'A';
    } else if (cumulativePercent <= bThreshold) {
      abcCategory = 'B';
    } else {
      abcCategory = 'C';
    }

    return {
      ...item,
      abcCategory,
      annualConsumptionValue: parseFloat(item.annualConsumptionValue.toFixed(2)),
      cumulativePercent: parseFloat(cumulativePercent.toFixed(2)),
      percentOfTotal: parseFloat(percentOfTotal.toFixed(2))
    };
  });

  return result;
}

/**
 * Get annual demand from transactions
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
 * Get ABC summary statistics
 */
async function getABCSummary(orgId) {
  const classified = await performABCAnalysis(orgId);

  const aItems = classified.filter(i => i.abcCategory === 'A');
  const bItems = classified.filter(i => i.abcCategory === 'B');
  const cItems = classified.filter(i => i.abcCategory === 'C');

  const totalValue = classified.reduce((sum, i) => sum + i.annualConsumptionValue, 0);
  const aValue = aItems.reduce((sum, i) => sum + i.annualConsumptionValue, 0);
  const bValue = bItems.reduce((sum, i) => sum + i.annualConsumptionValue, 0);
  const cValue = cItems.reduce((sum, i) => sum + i.annualConsumptionValue, 0);

  return {
    totalProducts: classified.length,
    categories: {
      A: {
        count: aItems.length,
        value: parseFloat(aValue.toFixed(2)),
        percent: totalValue > 0 ? parseFloat(((aValue / totalValue) * 100).toFixed(1)) : 0,
        items: aItems
      },
      B: {
        count: bItems.length,
        value: parseFloat(bValue.toFixed(2)),
        percent: totalValue > 0 ? parseFloat(((bValue / totalValue) * 100).toFixed(1)) : 0,
        items: bItems
      },
      C: {
        count: cItems.length,
        value: parseFloat(cValue.toFixed(2)),
        percent: totalValue > 0 ? parseFloat(((cValue / totalValue) * 100).toFixed(1)) : 0,
        items: cItems
      }
    },
    totalValue: parseFloat(totalValue.toFixed(2))
  };
}

/**
 * Update ABC categories in database
 */
async function updateABCCategories(orgId) {
  const classified = await performABCAnalysis(orgId);
  let updated = 0;

  for (const item of classified) {
    await Product.findByIdAndUpdate(item.productId, {
      abcCategory: item.abcCategory,
      annualDemand: item.annualDemand,
      annualConsumptionValue: item.annualConsumptionValue,
      abcCalculatedAt: new Date()
    });
    updated++;
  }

  return { success: true, updated };
}

module.exports = {
  performABCAnalysis,
  getABCSummary,
  updateABCCategories
};