const PurchaseOrder = require('../../models/PurchaseOrder');
const RejectionRecord = require('../../models/RejectionRecord');
const mongoose = require('mongoose');

/**
 * NS Narayanan Vendor Rating Method
 * 
 * Final Score = (Quality Score × 0.57) + (Delivery Score × 0.43)
 * 
 * Since we only have data for Quality and Delivery, normalize to available data:
 * - Quality Score weight: 0.57 (40% normalized to 57% when delivery is excluded)
 * - Delivery Score weight: 0.43 (30% normalized to 43% when delivery is excluded)
 * 
 * Quality Score (0-100):
 * qualityScore = ((totalReceived - totalRejected) / totalReceived) * 100
 * If no rejection data exists → qualityScore = 100 (benefit of doubt)
 * 
 * Delivery Score (0-100):
 * Delivery Score = (OTIF × 0.60) + (Fill Rate × 0.40)
 * 
 * OTIF (On Time In Full):
 * OTIF = (orders delivered on time AND fully fulfilled / total fulfilled orders) * 100
 * Grace window: ≤2 days late still counts as on time
 * Exclude orders with null actualDeliveryDate from OTIF calculation
 * 
 * Fill Rate (quantity based):
 * Fill Rate = (totalReceivedQty / totalOrderedQty) * 100
 * 
 * Grade Thresholds (NS Narayanan):
 * A (Excellent) → >= 85
 * B (Good) → 70–84
 * C (Average) → 55–69
 * D (Poor) → < 55
 * 
 * Confidence Level:
 * HIGH → > 15 orders
 * MEDIUM → 5–15 orders
 * LOW → < 5 orders
 */

const calculateSupplierPerformance = async (orgId) => {
  const pos = await PurchaseOrder.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    status: { $in: ['Fulfilled', 'Partial', 'Pending'] }
  }).populate('supplier', 'name').lean();

  const rejections = await RejectionRecord.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    stage: 'Receiving'
  }).lean();

  const rejectionByPO = {};
  rejections.forEach(r => {
    if (r.purchaseOrderId) {
      const poId = r.purchaseOrderId.toString();
      rejectionByPO[poId] = (rejectionByPO[poId] || 0) + (r.qty || 0);
    }
  });

  const supplierStats = {};

  pos.forEach(po => {
    // Get supplier name from populated data or fallback to string representation
    let supplierName = 'Unknown';
    if (po.supplier) {
      if (typeof po.supplier === 'object' && po.supplier.name) {
        supplierName = po.supplier.name;
      } else if (typeof po.supplier === 'string') {
        supplierName = po.supplier;
      }
    }
    
    if (!supplierStats[supplierName]) {
      supplierStats[supplierName] = {
        supplier: supplierName,
        totalOrders: 0,
        fulfilledOrders: 0,
        onTimeOrders: 0,
        totalOrderedQty: 0,
        totalReceivedQty: 0,
        totalRejected: 0,
        totalDelayDays: 0,
        delayedOrders: 0,
        orders: []
      };
    }

    const stats = supplierStats[supplierName];
    stats.totalOrders += 1;

    let orderedQty = 0;
    let receivedQty = 0;
    if (po.items) {
      po.items.forEach(item => {
        orderedQty += item.qty || 0;
        receivedQty += item.receivedQty || 0;
      });
    }

    stats.totalOrderedQty += orderedQty;
    stats.totalReceivedQty += receivedQty;

    const rejectionQty = rejectionByPO[po._id.toString()] || 0;
    stats.totalRejected += rejectionQty;

    if (po.status === 'Fulfilled') {
      stats.fulfilledOrders += 1;

      if (po.actualDeliveryDate && po.expectedDate) {
        const expected = new Date(po.expectedDate);
        const actual = new Date(po.actualDeliveryDate);
        const diffDays = Math.floor((actual - expected) / (1000 * 60 * 60 * 24));

        if (diffDays <= 2) {
          stats.onTimeOrders += 1;
        } else {
          stats.totalDelayDays += diffDays;
          stats.delayedOrders += 1;
        }
      }
    }

    stats.orders.push({
      poId: po._id,
      status: po.status,
      orderedQty,
      receivedQty,
      rejectionQty,
      expectedDate: po.expectedDate,
      actualDeliveryDate: po.actualDeliveryDate
    });
  });

  const results = Object.values(supplierStats).map(stats => {
    // Quality Score (0-100)
    // NS Narayanan: qualityScore = ((totalReceived - totalRejected) / totalReceived) * 100
    let qualityScore;
    if (stats.totalReceivedQty > 0) {
      qualityScore = ((stats.totalReceivedQty - stats.totalRejected) / stats.totalReceivedQty) * 100;
    } else {
      qualityScore = 100; // Benefit of doubt if no data
    }
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Delivery Score (0-100)
    // NS Narayanan: Delivery Score = (OTIF × 0.60) + (Fill Rate × 0.40)
    let otifRate = 0;
    if (stats.fulfilledOrders > 0) {
      otifRate = (stats.onTimeOrders / stats.fulfilledOrders) * 100;
    }

    let fillRate = 0;
    if (stats.totalOrderedQty > 0) {
      fillRate = (stats.totalReceivedQty / stats.totalOrderedQty) * 100;
    }

    const deliveryScore = (otifRate * 0.60) + (fillRate * 0.40);

    // Final Score
    // NS Narayanan: Final Score = (Quality Score × 0.57) + (Delivery Score × 0.43)
    const finalScore = (qualityScore * 0.57) + (deliveryScore * 0.43);

    // Grade
    let grade;
    if (finalScore >= 85) grade = 'A';
    else if (finalScore >= 70) grade = 'B';
    else if (finalScore >= 55) grade = 'C';
    else grade = 'D';

    // Confidence Level
    let confidenceLevel;
    if (stats.totalOrders > 15) confidenceLevel = 'HIGH';
    else if (stats.totalOrders >= 5) confidenceLevel = 'MEDIUM';
    else confidenceLevel = 'LOW';

    const avgDelayDays = stats.delayedOrders > 0 
      ? (stats.totalDelayDays / stats.delayedOrders).toFixed(1) 
      : 0;

    return {
      supplier: stats.supplier,
      qualityScore: Math.round(qualityScore * 100) / 100,
      deliveryScore: Math.round(deliveryScore * 100) / 100,
      otifRate: Math.round(otifRate * 100) / 100,
      fillRate: Math.round(fillRate * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
      grade,
      confidenceLevel,
      totalOrders: stats.totalOrders,
      fulfilledOrders: stats.fulfilledOrders,
      totalRejected: stats.totalRejected,
      totalReceived: stats.totalReceivedQty,
      avgDelayDays
    };
  });

  // Sort by final score descending
  results.sort((a, b) => b.finalScore - a.finalScore);

  return results;
};

module.exports = { calculateSupplierPerformance };