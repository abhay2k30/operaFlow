/**
 * Unified Optimization Controller
 *
 * Uses modular optimization services:
 * - EOQService
 * - ABCAnalysisService
 * - ReorderService
 */

const { EOQService, ABCAnalysisService, ReorderService } = require('../services/optimization');
const Product = require('../models/Product');
const Batch = require('../models/Batch');

/**
 * Run full optimization (EOQ + ABC + ROP)
 */
exports.runFullOptimization = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    // 1. Update ABC categories
    const abcResult = await ABCAnalysisService.updateABCCategories(orgId);

    // 2. Calculate EOQ for all products
    const eoqResults = await EOQService.calculateAllEOQ(orgId);

    // 3. Update products with EOQ values
    for (const item of eoqResults) {
      if (item.isValid) {
        await Product.findByIdAndUpdate(item.productId, {
          eoq: item.eoq,
          annualDemand: item.details.annualDemand
        });
      }
    }

    // 4. Calculate ROP for all products
    const reorderAlerts = await ReorderService.getReorderAlerts(orgId);

    // 5. Update reorder points
    for (const alert of reorderAlerts.alerts) {
      await Product.findByIdAndUpdate(alert.productId, {
        reorderPoint: alert.reorderPoint,
        safetyStock: alert.safetyStock,
        lastOptimizationDate: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Optimization complete',
      results: {
        abcUpdated: abcResult.updated,
        eoqCalculated: eoqResults.filter(e => e.isValid).length,
        reorderCalculated: reorderAlerts.itemsNeedingReorder
      }
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get optimization status and summary
 */
exports.getOptimizationStatus = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    // Get ABC summary
    const abcSummary = await ABCAnalysisService.getABCSummary(orgId);

    // Get stock levels
    const stockAgg = await Batch.aggregate([
      { $match: { orgId: new require('mongoose').Types.ObjectId(orgId) } },
      { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }
    ]);
    const stockMap = {};
    stockAgg.forEach(i => stockMap[i._id.toString()] = i.totalStock);

    // Get reorder alerts
    const reorderAlerts = await ReorderService.getReorderAlerts(orgId);

    // Build product list with current stock
    const products = await Product.find({ orgId, isActive: true })
      .select('sku name eoq reorderPoint safetyStock abcCategory criticalityLevel annualDemand annualConsumptionValue')
      .lean();

    const items = products.map(p => ({
      ...p,
      currentStock: stockMap[p._id.toString()] || 0,
      needsReorder: (stockMap[p._id.toString()] || 0) <= (p.reorderPoint || 0)
    }));

    res.json({
      abcSummary,
      reorderAlerts,
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get EOQ for single product
 */
exports.getProductEOQ = async (req, res) => {
  try {
    const result = await EOQService.calculateEOQ(req.user.orgId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get ROP for single product
 */
exports.getProductROP = async (req, res) => {
  try {
    const result = await ReorderService.calculateROP(req.user.orgId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update criticality level
 */
exports.updateCriticality = async (req, res) => {
  try {
    const { criticalityLevel } = req.body;
    const validLevels = ['Critical', 'High', 'Medium', 'Low', null];

    if (!validLevels.includes(criticalityLevel)) {
      return res.status(400).json({ error: 'Invalid criticality level' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { criticalityLevel },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Auto-assign criticality based on ABC
 */
exports.autoAssignCriticality = async (req, res) => {
  try {
    const products = await Product.find({ orgId: req.user.orgId, abcCategory: { $ne: null } });

    let updated = 0;
    for (const product of products) {
      let criticality;
      if (product.abcCategory === 'A') criticality = 'Critical';
      else if (product.abcCategory === 'B') criticality = 'High';
      else criticality = 'Medium';

      if (product.criticalityLevel !== criticality) {
        await Product.findByIdAndUpdate(product._id, { criticalityLevel: criticality });
        updated++;
      }
    }

    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get ABC summary
 */
exports.getABCSummary = async (req, res) => {
  try {
    const result = await ABCAnalysisService.getABCSummary(req.user.orgId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get reorder alerts
 */
exports.getReorderAlerts = async (req, res) => {
  try {
    const result = await ReorderService.getReorderAlerts(req.user.orgId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};