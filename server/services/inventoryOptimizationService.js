/**
 * Industrial Engineering Inventory Optimization Service
 *
 * DEPRECATED: Use services/optimization/ instead
 * This file is kept for backward compatibility.
 *
 * @deprecated Use:
 *   - require('./optimization/EOQService')
 *   - require('./optimization/ABCAnalysisService')
 *   - require('./optimization/ReorderService')
 */

const Product = require('../models/Product');
const { EOQService, ABCAnalysisService, ReorderService } = require('./optimization');

// Legacy synchronous EOQ (for backward compatibility)
function calculateEOQ(annualDemand, orderingCost, unitCost, holdingCostRate) {
  if (annualDemand <= 0 || orderingCost <= 0 || unitCost <= 0 || holdingCostRate <= 0) {
    return { eoq: 0, isValid: false, error: 'Invalid parameters' };
  }
  const holdingCostPerUnit = unitCost * holdingCostRate;
  if (holdingCostPerUnit <= 0) {
    return { eoq: 0, isValid: false, error: 'Invalid holding cost' };
  }
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  return { eoq: Math.ceil(eoq), isValid: true };
}

// Legacy ROP calculation (for backward compatibility)
function calculateROP(dailyDemandAverage, leadTimeDays, safetyStock) {
  if (dailyDemandAverage <= 0 || leadTimeDays <= 0) return safetyStock;
  return Math.ceil(dailyDemandAverage * leadTimeDays) + safetyStock;
}

// Legacy safety stock (for backward compatibility)
function calculateSafetyStock(demandSigma, leadTimeDays, zValue = 1.65, dailyDemandAverage = 0, safetyStockDays = 0) {
  if (demandSigma > 0 && leadTimeDays > 0) {
    return Math.ceil(zValue * demandSigma * Math.sqrt(leadTimeDays));
  }
  if (dailyDemandAverage > 0 && safetyStockDays > 0) {
    return Math.ceil(dailyDemandAverage * safetyStockDays);
  }
  return 0;
}

// Legacy ABC (for backward compatibility)
function performABCAnalysis(products, options = {}) {
  // This is sync version - for full async use ABCAnalysisService
  const { aThreshold = 80, bThreshold = 95 } = options;
  const itemsWithValue = products.map(p => ({
    ...p,
    annualConsumptionValue: (p.annualDemand || 0) * (p.price || 0)
  }));
  itemsWithValue.sort((a, b) => b.annualConsumptionValue - a.annualConsumptionValue);
  const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualConsumptionValue, 0);
  if (totalValue === 0) return itemsWithValue.map(item => ({ ...item, abcCategory: 'C', cumulativePercent: 100 }));

  let cumulativeValue = 0;
  return itemsWithValue.map(item => {
    cumulativeValue += item.annualConsumptionValue;
    const cumulativePercent = (cumulativeValue / totalValue) * 100;
    let abcCategory;
    if (cumulativePercent <= aThreshold) abcCategory = 'A';
    else if (cumulativePercent <= bThreshold) abcCategory = 'B';
    else abcCategory = 'C';
    return { ...item, abcCategory, cumulativePercent: parseFloat(cumulativePercent.toFixed(2)) };
  });
}

// Full optimization run - delegates to modular services
exports.runOptimization = async (orgId) => {
  try {
    // 1. Update ABC categories
    await ABCAnalysisService.updateABCCategories(orgId);

    // 2. Calculate EOQ for all products
    const products = await Product.find({ orgId, isActive: true });
    for (const product of products) {
      try {
        const eoqResult = await EOQService.calculateEOQ(orgId, product._id.toString());
        if (eoqResult.isValid) {
          await Product.findByIdAndUpdate(product._id, {
            eoq: eoqResult.eoq,
            annualDemand: eoqResult.details?.annualDemand
          });
        }
      } catch (e) { /* Skip errors */ }
    }

    // 3. Calculate reorder points
    const alerts = await ReorderService.getReorderAlerts(orgId);
    for (const alert of alerts.alerts) {
      await Product.findByIdAndUpdate(alert.productId, {
        reorderPoint: alert.reorderPoint,
        safetyStock: alert.safetyStock,
        lastOptimizationDate: new Date()
      });
    }

    const aCount = products.filter(p => p.abcCategory === 'A').length;
    const bCount = products.filter(p => p.abcCategory === 'B').length;
    const cCount = products.filter(p => p.abcCategory === 'C').length;

    return {
      success: true,
      totalProducts: products.length,
      aItems: aCount,
      bItems: bCount,
      cItems: cCount,
      itemsNeedingReorder: alerts.itemsNeedingReorder,
      optimizedAt: new Date()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Single product optimization
exports.optimizeProduct = async (orgId, productId) => {
  const eoq = await EOQService.calculateEOQ(orgId, productId);
  const rop = await ReorderService.calculateROP(orgId, productId);
  return { ...eoq, ...rop };
};

// Legacy exports
exports.calculateEOQ = calculateEOQ;
exports.calculateROP = calculateROP;
exports.calculateSafetyStock = calculateSafetyStock;
exports.performABCAnalysis = performABCAnalysis;