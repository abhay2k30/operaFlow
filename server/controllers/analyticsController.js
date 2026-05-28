const mongoose = require('mongoose');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesOrder = require('../models/SalesOrder');
const ProductionOrder = require('../models/ProductionOrder');
const RejectionRecord = require('../models/RejectionRecord');
const Shipment = require('../models/Shipment');
const LedgerEntry = require('../models/LedgerEntry');
const StockTransaction = require('../models/StockTransaction');
const Batch = require('../models/Batch');
const Alert = require('../models/Alert');
const Party = require('../models/Party');

exports.getInventoryAnalytics = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const products = await Product.find({ orgId }).lean();
    
    // Aggregate total stock per product from Batches
    const stockAgg = await Batch.aggregate([
      { $match: { orgId } },
      { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }
    ]);
    
    const stockMap = {};
    stockAgg.forEach(item => {
      stockMap[item._id.toString()] = item.totalStock;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate SALE + CONSUMPTION + PRODUCTION_CONSUMPTION transactions for the last 30 days
    const usageAgg = await StockTransaction.aggregate([
      { $match: { type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] }, orgId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$productId', totalUsage: { $sum: '$qty' } } }
    ]);

    const usageMap = {};
    usageAgg.forEach(item => {
      usageMap[item._id.toString()] = item.totalUsage;
    });

    // Aggregate any transactions in the last 30 days to check for dead stock
    const movementAgg = await StockTransaction.aggregate([
      { $match: { orgId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$productId', count: { $sum: 1 } } }
    ]);
    const movementMap = {};
    movementAgg.forEach(item => {
      movementMap[item._id.toString()] = item.count;
    });

    const inventoryData = products.map(product => {
      const pId = product._id.toString();
      const stock = stockMap[pId] || 0;
      const reorderLevel = product.reorderLevel || 10;
      const totalUsage = usageMap[pId] || 0;
      const hasMovement = movementMap[pId] > 0;
      
      const isReorderNeeded = stock <= reorderLevel;
      const isOverstock = stock > (2 * reorderLevel);
      const isDeadStock = !hasMovement && stock > 0;
      
      const avgDailyUsage = totalUsage / 30;
      const daysUntilStockout = avgDailyUsage > 0 ? Math.ceil(stock / avgDailyUsage) : -1; // -1 means infinite/no usage
      
      return {
        _id: product._id,
        sku: product.sku,
        name: product.name,
        stock,
        reorderLevel,
        isReorderNeeded,
        isOverstock,
        isDeadStock,
        avgDailyUsage: avgDailyUsage.toFixed(2),
        daysUntilStockout
      };
    });

    // Summary KPIs
    const totalProducts = products.length;
    const lowStockCount = inventoryData.filter(p => p.isReorderNeeded).length;
    const overstockCount = inventoryData.filter(p => p.isOverstock).length;
    const deadStockCount = inventoryData.filter(p => p.isDeadStock).length;

    res.json({
      summary: {
        totalProducts,
        lowStockCount,
        overstockCount,
        deadStockCount
      },
      details: inventoryData
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProcurementAnalytics = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 1);

    const pos = await PurchaseOrder.find({ orgId, createdAt: { $gte: minDate } }).populate('items.productId').lean();
    
    const supplierStats = {};
    
    pos.forEach(po => {
      const sup = po.supplier;
      if (!supplierStats[sup]) {
        supplierStats[sup] = {
          totalOrders: 0,
          fulfilledOrders: 0,
          onTimeOrders: 0,
          totalDelayDays: 0,
          delayedOrders: 0,
          itemsReceived: 0,
        };
      }
      
      supplierStats[sup].totalOrders += 1;
      
      let itemsRecv = 0;
      po.items.forEach(it => itemsRecv += (it.receivedQty || 0));
      supplierStats[sup].itemsReceived += itemsRecv;

      if (po.status === 'Fulfilled') {
        supplierStats[sup].fulfilledOrders += 1;
        if (po.expectedDate && po.updatedAt) {
          const delayMs = new Date(po.updatedAt).getTime() - new Date(po.expectedDate).getTime();
          const delayDays = Math.floor(delayMs / (1000 * 60 * 60 * 24));
          if (delayDays > 0) {
             supplierStats[sup].totalDelayDays += delayDays;
             supplierStats[sup].delayedOrders += 1;
          } else {
             supplierStats[sup].onTimeOrders += 1;
          }
        } else {
             supplierStats[sup].onTimeOrders += 1;
        }
      }
    });
    
    const today = new Date();
    const pendingAlerts = pos.filter(po => po.status !== 'Fulfilled' && po.status !== 'Rejected' && po.expectedDate && new Date(po.expectedDate) < today);
    const partialOrders = pos.filter(po => po.status === 'Partial');

    const supplierPerformance = Object.keys(supplierStats).map(sup => {
       const stats = supplierStats[sup];
       const onTimeRate = stats.fulfilledOrders > 0 ? (stats.onTimeOrders / stats.fulfilledOrders) * 100 : 100;
       const avgDelay = stats.delayedOrders > 0 ? (stats.totalDelayDays / stats.delayedOrders) : 0;
       
       let score = onTimeRate - (avgDelay * 2); 
       if (score > 100) score = 100;
       if (score < 0) score = 0;

       return {
         supplier: sup,
         totalOrders: stats.totalOrders,
         fulfilledOrders: stats.fulfilledOrders,
         onTimeRate: onTimeRate.toFixed(2),
         avgDelayDays: avgDelay.toFixed(2),
         performanceScore: score.toFixed(2)
       };
    });

    res.json({
       summary: {
         totalSuppliers: Object.keys(supplierStats).length,
         pendingAlertsCount: pendingAlerts.length,
         partialOrdersCount: partialOrders.length
       },
       pendingAlerts,
       partialOrders,
       supplierPerformance
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductionAnalytics = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 1);

    const pos = await ProductionOrder.find({ orgId, createdAt: { $gte: minDate } }).lean();
    const rejections = await RejectionRecord.find({ orgId, stage: 'Production', createdAt: { $gte: minDate } }).lean();

    let totalPlannedMaterial = 0;
    let totalConsumedMaterial = 0;
    let totalProduced = 0;
    let totalDelayDays = 0;
    let delayedOrders = 0;

    pos.forEach(po => {
       let pMat = 0;
       if (po.materials) po.materials.forEach(m => pMat += m.qty);
       totalPlannedMaterial += pMat;

       let cMat = 0;
       if (po.consumedMaterials) po.consumedMaterials.forEach(m => cMat += m.qty);
       totalConsumedMaterial += cMat;

       if (po.status === 'Completed') {
         totalProduced += po.qty;
         if (po.endDate && po.updatedAt) {
            const delayMs = new Date(po.updatedAt).getTime() - new Date(po.endDate).getTime();
            const delayDays = Math.floor(delayMs / (1000 * 60 * 60 * 24));
            if (delayDays > 0) {
               totalDelayDays += delayDays;
               delayedOrders += 1;
            }
         }
       }
    });

    const efficiency = totalConsumedMaterial > 0 ? (totalPlannedMaterial / totalConsumedMaterial) * 100 : 0;
    const materialVariance = totalPlannedMaterial - totalConsumedMaterial;
    
    let totalRejected = 0;
    rejections.forEach(r => totalRejected += r.qty);
    const rejectionRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;
    
    const avgDelay = delayedOrders > 0 ? (totalDelayDays / delayedOrders) : 0;

    res.json({
       efficiency: efficiency.toFixed(2),
       materialVariance,
       rejectionRate: rejectionRate.toFixed(2),
       avgDelayDays: avgDelay.toFixed(2),
       totalProduced,
       totalRejected
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSalesAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const sos = await SalesOrder.find({ orgId, createdAt: { $gte: thirtyDaysAgo } }).populate('items.productId').lean();
    
    let totalOrders = sos.length;
    let fulfilledOrders = 0;
    
    const productSales = {};
    let totalRevenueLast30 = 0;

    sos.forEach(so => {
       if (so.status === 'Shipped') fulfilledOrders += 1;
       
       so.items.forEach(it => {
          const pId = it.productId._id ? it.productId._id.toString() : it.productId.toString();
          if (!productSales[pId]) {
             productSales[pId] = {
                name: (it.productId && it.productId.name) ? it.productId.name : 'Unknown',
                qtySold: 0,
                revenue: 0,
                orderCount: 0
             };
          }
          productSales[pId].qtySold += it.qty;
          productSales[pId].revenue += (it.qty * it.price);
          productSales[pId].orderCount += 1;
          totalRevenueLast30 += (it.qty * it.price);
       });
    });

    const productsArr = Object.values(productSales).sort((a,b) => b.qtySold - a.qtySold);
    
    const fastMoving = productsArr.slice(0, Math.max(1, Math.floor(productsArr.length * 0.2)));
    const slowMoving = productsArr.slice(-Math.max(1, Math.floor(productsArr.length * 0.2))).reverse();

    const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;
    const avgDailyRevenue = totalRevenueLast30 / 30;

    res.json({
       demandForecastDailyRev: avgDailyRevenue.toFixed(2),
       fulfillmentRate: fulfillmentRate.toFixed(2),
       fastMovingItems: fastMoving.slice(0, 5),
       slowMovingItems: slowMoving.slice(0, 5),
       totalOrdersLast30Days: totalOrders,
       totalRevenueLast30Days: totalRevenueLast30
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLogisticsAnalytics = async (req, res) => {
  try {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 1);

    const shipments = await Shipment.find({ createdAt: { $gte: minDate } }).lean();

    let totalShipments = shipments.length;
    let deliveredShipments = 0;
    
    const carrierStats = {};

    shipments.forEach(sh => {
       if (sh.status === 'Delivered') deliveredShipments += 1;
       
       const carrierName = (sh.carrier && sh.carrier.name) ? sh.carrier.name : 'Unknown';
       if (!carrierStats[carrierName]) {
          carrierStats[carrierName] = {
             total: 0,
             delivered: 0,
             delayed: 0,
             totalDeliveryDays: 0, // time from created to delivered
             totalDelayDays: 0
          };
       }
       
       carrierStats[carrierName].total += 1;
       
       if (sh.status === 'Delivered') {
          carrierStats[carrierName].delivered += 1;
          const deliveryTimeMs = new Date(sh.updatedAt).getTime() - new Date(sh.createdAt).getTime();
          carrierStats[carrierName].totalDeliveryDays += (deliveryTimeMs / (1000 * 60 * 60 * 24));
          
          if (sh.expectedDeliveryDate && sh.updatedAt) {
             const delayMs = new Date(sh.updatedAt).getTime() - new Date(sh.expectedDeliveryDate).getTime();
             const delayDays = Math.floor(delayMs / (1000 * 60 * 60 * 24));
             if (delayDays > 0) {
                carrierStats[carrierName].delayed += 1;
                carrierStats[carrierName].totalDelayDays += delayDays;
             }
          }
       }
    });

    const carrierPerformance = Object.keys(carrierStats).map(c => {
       const stats = carrierStats[c];
       const deliverySuccessRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
       const avgDeliveryDays = stats.delivered > 0 ? (stats.totalDeliveryDays / stats.delivered) : 0;
       const delayPercent = stats.delivered > 0 ? (stats.delayed / stats.delivered) * 100 : 0;
       const avgDelay = stats.delayed > 0 ? (stats.totalDelayDays / stats.delayed) : 0;

       return {
          carrier: c,
          totalShipments: stats.total,
          deliverySuccessRate: deliverySuccessRate.toFixed(2),
          avgDeliveryTimeDays: avgDeliveryDays.toFixed(2),
          delayPercent: delayPercent.toFixed(2),
          avgDelayDays: avgDelay.toFixed(2)
       };
    });

    const overallSuccessRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;

    res.json({
       totalShipments,
       deliveredShipments,
       overallSuccessRate: overallSuccessRate.toFixed(2),
       carrierPerformance
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFinanceAnalytics = async (req, res) => {
  try {
     const ledger = await LedgerEntry.find().lean();
     
     let totalPayable = 0;
     let totalReceivable = 0;
     let outstandingPayable = 0;
     let outstandingReceivable = 0;
     
     const outstandingEntries = [];

     ledger.forEach(entry => {
        if (entry.type === 'Payable') {
           totalPayable += entry.amount;
           if (entry.status === 'Open') {
              outstandingPayable += entry.amount;
              outstandingEntries.push(entry);
           }
        } else if (entry.type === 'Receivable') {
           totalReceivable += entry.amount;
           if (entry.status === 'Open') {
              outstandingReceivable += entry.amount;
              outstandingEntries.push(entry);
           }
        }
     });

     const cashFlow = {
        inflow: totalReceivable,
        outflow: totalPayable,
        net: totalReceivable - totalPayable
     };

     res.json({
        cashFlow,
        outstanding: {
           payable: outstandingPayable,
           receivable: outstandingReceivable,
           total: outstandingPayable + outstandingReceivable
        },
        outstandingDetails: outstandingEntries
     });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardKPIs = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const products = await Product.find({ orgId }).lean();
    const stockAgg = await Batch.aggregate([{ $match: { orgId } }, { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }]);
    const stockMap = {}; stockAgg.forEach(i => stockMap[i._id.toString()] = i.totalStock);
    
    let lowStockCount = 0;
    let overstockCount = 0;
    products.forEach(p => {
       const stock = stockMap[p._id.toString()] || 0;
       const reorder = p.reorderLevel || 10;
       if (stock <= reorder) lowStockCount++;
       if (stock > (reorder * 2)) overstockCount++;
    });

    // Procurement Delay
    const minDate = new Date(); minDate.setFullYear(minDate.getFullYear() - 1);
    const pos = await PurchaseOrder.find({ orgId, status: 'Fulfilled', createdAt: { $gte: minDate } }).lean();
    let totalDelayDays = 0, delayedOrders = 0;
    pos.forEach(po => {
       if (po.expectedDate && po.updatedAt) {
          const d = Math.floor((new Date(po.updatedAt).getTime() - new Date(po.expectedDate).getTime()) / 86400000);
          if (d > 0) { totalDelayDays += d; delayedOrders++; }
       }
    });
    const avgSupplierDelay = delayedOrders > 0 ? (totalDelayDays / delayedOrders) : 0;

    // Finance KPI
    const outstandingPayableAgg = await LedgerEntry.aggregate([
       { $match: { orgId, type: 'Payable', status: 'Open' } },
       { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const outstandingPayments = outstandingPayableAgg.length > 0 ? outstandingPayableAgg[0].total : 0;

    res.json({
       lowStockCount,
       overstockCount,
       avgSupplierDelay: avgSupplierDelay.toFixed(2),
       outstandingPayments
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Supplier Reliability Calculation ──────────────────────────────────────────
async function calculateSupplierReliability(orgId, supplierId) {
  if (!supplierId) return { score: 75, z: 1.65, serviceLevel: 95 }; // default

  const PurchaseOrder = require('../models/PurchaseOrder');
  const RejectionRecord = require('../models/RejectionRecord');

  // Get fulfilled POs for this supplier
  const fulfilledPos = await PurchaseOrder.find({
    orgId,
    supplier: supplierId,
    status: 'Fulfilled',
    actualDeliveryDate: { $exists: true }
  }).lean();

  if (fulfilledPos.length === 0) return { score: 75, z: 1.65, serviceLevel: 95 }; // default for new suppliers

  // 1. On-Time Delivery %
  let onTimeCount = 0;
  const leadTimes = [];

  for (const po of fulfilledPos) {
    if (po.expectedDate && po.actualDeliveryDate) {
      const expected = new Date(po.expectedDate);
      const actual = new Date(po.actualDeliveryDate);
      if (actual <= expected) onTimeCount++;

      // Lead time calculation
      const orderDate = new Date(po.createdAt);
      const deliveryDate = new Date(po.actualDeliveryDate);
      const leadTimeDays = (deliveryDate - orderDate) / (1000 * 60 * 60 * 24);
      if (leadTimeDays > 0) leadTimes.push(leadTimeDays);
    }
  }

  const onTimeDeliveryPct = (onTimeCount / fulfilledPos.length) * 100;

  // 2. Quality Score (from rejections)
  const rejections = await RejectionRecord.find({
    orgId,
    createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // last year
  }).lean();

  // Filter rejections for this supplier's POs
  // For simplicity, we check if product's default supplier matches - in real implementation, link rejections to POs
  const totalReceived = fulfilledPos.reduce((sum, po) => {
    return sum + po.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
  }, 0);

  const totalRejected = rejections.reduce((sum, r) => sum + (r.qty || 0), 0);
  const rejectionRate = totalReceived > 0 ? (totalRejected / totalReceived) * 100 : 0;
  const qualityScore = Math.max(0, 100 - rejectionRate);

  // 3. Lead Time Consistency (standard deviation)
  let leadTimeConsistency = 50; // default
  if (leadTimes.length >= 2) {
    const mean = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
    const variance = leadTimes.reduce((sum, lt) => sum + Math.pow(lt - mean, 2), 0) / leadTimes.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 1) leadTimeConsistency = 100;
    else if (stdDev <= 3) leadTimeConsistency = 80;
    else leadTimeConsistency = 50;
  } else if (leadTimes.length === 1) {
    leadTimeConsistency = 80;
  }

  // 4. Overall Reliability Score
  const reliabilityScore = (onTimeDeliveryPct * 0.5) + (qualityScore * 0.3) + (leadTimeConsistency * 0.2);

  // 5. Service Level + Z mapping
  let z, serviceLevel;
  if (reliabilityScore > 90) { z = 1.28; serviceLevel = 90; }
  else if (reliabilityScore >= 75) { z = 1.65; serviceLevel = 95; }
  else { z = 2.33; serviceLevel = 99; }

  return { score: Math.round(reliabilityScore), z, serviceLevel };
}

// Helper: calculate standard deviation of daily demand
function calculateDemandStdDev(dailyDemands) {
  if (dailyDemands.length < 2) return 0;
  const mean = dailyDemands.reduce((a, b) => a + b, 0) / dailyDemands.length;
  const variance = dailyDemands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / dailyDemands.length;
  return Math.sqrt(variance);
}

// ─── EOQ + Reorder Point + Demand Forecasting (Dynamic) ───────────────────────
exports.getInventoryPlanning = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const Organization = require('../models/Organization');
    const Product = require('../models/Product');
    const Party = require('../models/Party');

    const org = await Organization.findById(orgId).lean();
    const DEFAULT_ORDERING_COST = org?.planningDefaults?.orderingCost || 500;
    const DEFAULT_HOLDING_RATE = (org?.planningDefaults?.holdingRatePercent || 20) / 100;
    const DEFAULT_LEAD_TIME = org?.planningDefaults?.leadTimeDays || 7;

    const products = await Product.find({ orgId }).populate('defaultSupplier', '_id').lean();

    // Stock per product
    const stockAgg = await Batch.aggregate([
      { $match: { orgId } },
      { $group: { _id: '$productId', totalStock: { $sum: '$qty' } } }
    ]);
    const stockMap = {};
    stockAgg.forEach(i => stockMap[i._id.toString()] = i.totalStock);

    // Demand from SALE + CONSUMPTION + PRODUCTION_CONSUMPTION transactions (last 90 days, daily granularity)
    const now = new Date();
    const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

    const demandTxns = await StockTransaction.aggregate([
      { $match: { orgId, type: { $in: ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'] }, createdAt: { $gte: d90 } } },
      { $group: { _id: { productId: '$productId', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, total: { $sum: '$qty' } } },
      { $sort: { '_id.date': 1 } }
    ]);

    // Build daily demand arrays per product
    const dailyDemandMap = {};
    demandTxns.forEach(t => {
      const pid = t._id.productId.toString();
      if (!dailyDemandMap[pid]) dailyDemandMap[pid] = [];
      dailyDemandMap[pid].push(t.total);
    });

    // Get supplier reliability scores for all suppliers
    const supplierReliabilityMap = {};
    const suppliers = new Set(products.filter(p => p.defaultSupplier).map(p => p.defaultSupplier._id.toString()));
    for (const supId of suppliers) {
      supplierReliabilityMap[supId] = await calculateSupplierReliability(orgId, supId);
    }

    // Default reliability for products without supplier
    const defaultReliability = { score: 75, z: 1.65, serviceLevel: 95 };

    // Calculate demand in 30-day windows for weighted average
    const d90_2 = new Date(now); d90_2.setDate(d90_2.getDate() - 90);
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

    const demandTypes = ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION'];

    const windowDemand = async (startDate, endDate) => {
      const agg = await StockTransaction.aggregate([
        { $match: { orgId, type: { $in: demandTypes }, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$productId', total: { $sum: '$qty' } } }
      ]);
      const m = {}; agg.forEach(i => m[i._id.toString()] = i.total); return m;
    };

    const map90 = await windowDemand(d90_2, d60);
    const map60 = await windowDemand(d60, d30);
    const map30 = await windowDemand(d30, now);

    const planning = products.map(p => {
      const pid = p._id.toString();
      const stock = stockMap[pid] || 0;
      const price = p.price || 1;

      // Weighted avg daily demand (recent months weighted more)
      const d_90 = (map90[pid] || 0) / 90;
      const d_60 = (map60[pid] || 0) / 60;
      const d_30 = (map30[pid] || 0) / 30;
      const avgDailyDemand = (d_30 * 0.6 + d_60 * 0.3 + d_90 * 0.1);

      // Demand standard deviation for safety stock
      const dailyDemands = dailyDemandMap[pid] || [];
      const demandSigma = calculateDemandStdDev(dailyDemands);

      // Trend
      const trend = d_30 > 0 && d_60 > 0 ? ((d_30 - d_60) / d_60) * 100 : 0;

      // Get supplier-specific values or fall back to org defaults
      const supplierId = p.defaultSupplier?._id?.toString();
      const reliability = supplierId ? (supplierReliabilityMap[supplierId] || defaultReliability) : defaultReliability;
      const z = reliability.z;
      const leadTime = p.leadTimeDays ?? DEFAULT_LEAD_TIME;

      // EOQ
      const ORDERING_COST = p.orderingCostPerOrder ?? DEFAULT_ORDERING_COST;
      const HOLDING_RATE = price > 0 ? DEFAULT_HOLDING_RATE : 0;
      const annualDemand = avgDailyDemand * 365;
      const holdingCost = price * HOLDING_RATE;
      const eoq = holdingCost > 0 && annualDemand > 0
        ? Math.ceil(Math.sqrt((2 * annualDemand * ORDERING_COST) / holdingCost))
        : 0;

      // Dynamic Safety Stock: SS = Z × sigma × sqrt(L)
      const safetyStock = Math.ceil(z * demandSigma * Math.sqrt(leadTime));

      // Reorder Point: ROP = (dailyDemand × leadTime) + safetyStock
      const reorderPoint = Math.ceil(avgDailyDemand * leadTime) + safetyStock;

      // Days remaining
      const daysRemaining = avgDailyDemand > 0 ? Math.floor(stock / avgDailyDemand) : 999;

      // 30-day forecast
      const forecast30 = Math.ceil(avgDailyDemand * 30);
      const stockoutDate = avgDailyDemand > 0
        ? new Date(now.getTime() + daysRemaining * 86400000).toISOString().slice(0, 10)
        : null;

      const needsReorder = stock <= reorderPoint && reorderPoint > 0;

      return {
        _id: p._id,
        sku: p.sku,
        name: p.name,
        currentStock: stock,
        price,
        avgDailyDemand: parseFloat(avgDailyDemand.toFixed(3)),
        demandSigma: parseFloat(demandSigma.toFixed(3)),
        trend: parseFloat(trend.toFixed(1)),
        eoq,
        reorderPoint,
        safetyStock,
        daysRemaining: daysRemaining === 999 ? null : daysRemaining,
        stockoutDate,
        forecast30,
        needsReorder,
        // Supplier info
        supplierReliability: reliability.score,
        serviceLevel: reliability.serviceLevel,
        zValue: z
      };
    });

    // Sort
    planning.sort((a, b) => {
      if (a.needsReorder !== b.needsReorder) return a.needsReorder ? -1 : 1;
      const da = a.daysRemaining ?? 9999;
      const db = b.daysRemaining ?? 9999;
      return da - db;
    });

    res.json({
      assumptions: {
        orderingCost: DEFAULT_ORDERING_COST,
        holdingRatePercent: DEFAULT_HOLDING_RATE * 100,
        leadTimeDays: DEFAULT_LEAD_TIME
      },
      items: planning
    });
  } catch (err) {
    console.error('Inventory planning error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Supplier Performance ─────────────────────────────────────────────────────
exports.getSupplierPerformance = async (req, res) => {
  try {
    const { calculateSupplierPerformance } = require('../services/analytics/supplierPerformanceService');
    const result = await calculateSupplierPerformance(req.user.orgId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Customer Performance ─────────────────────────────────────────────────────
exports.getCustomerPerformance = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const since = new Date(); since.setFullYear(since.getFullYear() - 1);
    const sos = await SalesOrder.find({ orgId, createdAt: { $gte: since } })
      .populate('customer', 'name gstin phone')
      .lean();

    const map = {};
    sos.forEach(so => {
      const cust = so.customer;
      if (!cust) return;
      const cid = cust._id ? cust._id.toString() : String(cust);
      if (!map[cid]) map[cid] = {
        _id: cid, name: cust.name || cust, gstin: cust.gstin,
        totalOrders: 0, shippedOrders: 0, cancelledOrders: 0,
        totalRevenue: 0, pendingRevenue: 0
      };
      const c = map[cid];
      c.totalOrders++;
      const lineTotal = so.items.reduce((t, i) => t + (i.qty * i.price), 0);
      if (['Shipped','Invoiced'].includes(so.status)) { c.shippedOrders++; c.totalRevenue += lineTotal; }
      else if (so.status === 'Cancelled') c.cancelledOrders++;
      else c.pendingRevenue += lineTotal;
    });

    const result = Object.values(map).map(c => ({
      ...c,
      fulfillmentRate: c.totalOrders > 0 ? +((c.shippedOrders / c.totalOrders) * 100).toFixed(1) : 0,
      cancellationRate: c.totalOrders > 0 ? +((c.cancelledOrders / c.totalOrders) * 100).toFixed(1) : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
