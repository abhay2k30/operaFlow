/**
 * Centralized Inventory Service
 *
 * ERP-style inventory management with ledger tracking.
 * ALL stock operations MUST go through this service.
 *
 * Responsibilities:
 * - Stock validation & negative stock prevention
 * - Transaction consistency with MongoDB sessions
 * - Inventory ledger creation
 * - Stock recalculation
 * - Trigger optimization updates
 */

const mongoose = require('mongoose');
const Batch = require('../../models/Batch');
const StockTransaction = require('../../models/StockTransaction');
const Product = require('../../models/Product');
const Organization = require('../../models/Organization');

// Transaction type constants
const TRANSACTION_TYPES = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  CONSUMPTION: 'CONSUMPTION',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  PRODUCTION_CONSUMPTION: 'PRODUCTION_CONSUMPTION',
  PRODUCTION_OUTPUT: 'PRODUCTION_OUTPUT'
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK INCREASE (Purchase, Production Output, Adjustment+)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Increase stock - used for purchases, production output, returns
 * @param {object} params
 * @param {string} params.orgId - Organization ID
 * @param {string} params.productId - Product ID
 * @param {string} params.locationId - Location/Warehouse ID
 * @param {number} params.quantity - Quantity to add
 * @param {string} params.transactionType - Type from TRANSACTION_TYPES
 * @param {string} params.referenceDocument - Reference (e.g., PO:123)
 * @param {string} params.batchNo - Batch number
 * @param {Date} params.expiryDate - Expiry date for new batch
 * @param {string} params.performedBy - User ID who performed action
 * @param {string} params.remarks - Additional notes
 * @param {mongoose.ClientSession} params.session - Optional existing session
 */
async function increaseStock({ orgId, productId, locationId, quantity, transactionType, referenceDocument, batchNo, expiryDate, performedBy, remarks, session }) {
  const useSession = session || await mongoose.startSession();
  const isNewSession = !session;
  const shouldCommit = isNewSession;

  if (isNewSession) useSession.startTransaction();

  try {
    if (!Object.values(TRANSACTION_TYPES).includes(transactionType)) {
      throw new Error(`Invalid transaction type: ${transactionType}`);
    }
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (!orgId || !productId || !locationId) throw new Error('Missing required parameters');

    // Get current stock before
    const currentStock = await getProductStock(orgId, productId, locationId, useSession);

    // Check if batch with same batchNo exists at location
    let batch = await Batch.findOne({
      orgId, productId, locationId, batchNo: batchNo || `BATCH-${Date.now()}`
    }).session(useSession);

    if (batch) {
      // Add to existing batch
      batch.qty += quantity;
      await batch.save({ session: useSession });
    } else {
      // Create new batch
      [batch] = await Batch.create([{
        orgId,
        productId,
        locationId,
        batchNo: batchNo || `BATCH-${Date.now()}`,
        qty: quantity,
        receivedDate: new Date(),
        expiryDate
      }], { session: useSession });
    }

    // Create ledger entry
    await StockTransaction.create([{
      orgId,
      type: transactionType,
      productId,
      batchId: batch._id,
      qty: quantity,
      toLocation: locationId,
      createdBy: performedBy,
      referenceDocument,
      beforeStock: currentStock,
      afterStock: currentStock + quantity,
      remarks
    }], { session: useSession });

    if (shouldCommit) await useSession.commitTransaction();

    return {
      success: true,
      batch: batch,
      beforeStock: currentStock,
      afterStock: currentStock + quantity,
      transactionType
    };

  } catch (error) {
    if (shouldCommit && isNewSession) await useSession.abortTransaction();
    throw error;
  } finally {
    if (isNewSession) useSession.endSession();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK DECREASE (Sale, Consumption, Adjustment-)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decrease stock - used for sales, consumption, adjustments
 */
async function decreaseStock({ orgId, productId, locationId, quantity, transactionType, referenceDocument, batchId, performedBy, remarks, session }) {
  const useSession = session || await mongoose.startSession();
  const isNewSession = !session;
  const shouldCommit = isNewSession;

  if (isNewSession) useSession.startTransaction();

  try {
    if (!Object.values(TRANSACTION_TYPES).includes(transactionType)) {
      throw new Error(`Invalid transaction type: ${transactionType}`);
    }
    if (quantity <= 0) throw new Error('Quantity must be positive');

    // Get current stock
    const currentStock = await getProductStock(orgId, productId, locationId, useSession);
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, requested: ${quantity}`);
    }

    // Find batch to use (FIFO - oldest first)
    let batch;
    if (batchId) {
      batch = await Batch.findOne({ _id: batchId, orgId, locationId }).session(useSession);
    } else {
      // Get oldest batch with stock (FIFO)
      const batches = await Batch.find({
        orgId, productId, locationId, qty: { $gt: 0 }
      }).sort({ receivedDate: 1 }).session(useSession);
      batch = batches[0];
    }

    if (!batch || batch.qty < quantity) {
      throw new Error('Insufficient stock in batch');
    }

    // Decrease batch qty
    batch.qty -= quantity;
    await batch.save({ session: useSession });

    // Create ledger entry
    await StockTransaction.create([{
      orgId,
      type: transactionType,
      productId,
      batchId: batch._id,
      qty: quantity,
      fromLocation: locationId,
      createdBy: performedBy,
      referenceDocument,
      beforeStock: currentStock,
      afterStock: currentStock - quantity,
      remarks
    }], { session: useSession });

    if (shouldCommit) await useSession.commitTransaction();

    return {
      success: true,
      batch: batch,
      beforeStock: currentStock,
      afterStock: currentStock - quantity,
      transactionType
    };

  } catch (error) {
    if (shouldCommit && isNewSession) await useSession.abortTransaction();
    throw error;
  } finally {
    if (isNewSession) useSession.endSession();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK TRANSFER (Between Locations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transfer stock between locations
 */
async function transferStock({ orgId, productId, fromLocationId, toLocationId, quantity, referenceDocument, performedBy, remarks, session }) {
  const useSession = session || await mongoose.startSession();
  const isNewSession = !session;
  const shouldCommit = isNewSession;

  if (isNewSession) useSession.startTransaction();

  try {
    if (quantity <= 0) throw new Error('Quantity must be positive');

    // Get source stock before
    const sourceStockBefore = await getProductStock(orgId, productId, fromLocationId, useSession);
    if (sourceStockBefore < quantity) {
      throw new Error(`Insufficient stock at source. Available: ${sourceStockBefore}, requested: ${quantity}`);
    }

    // Find source batch (FIFO)
    const sourceBatches = await Batch.find({
      orgId, productId, locationId: fromLocationId, qty: { $gt: 0 }
    }).sort({ receivedDate: 1 }).session(useSession);

    if (!sourceBatches.length) throw new Error('No stock to transfer');

    let remainingQty = quantity;
    let sourceBatch;

    for (const batch of sourceBatches) {
      if (remainingQty <= 0) break;
      const qtyFromThis = Math.min(batch.qty, remainingQty);

      // Decrease source batch
      batch.qty -= qtyFromThis;
      await batch.save({ session: useSession });

      // Find or create target batch
      let targetBatch = await Batch.findOne({
        orgId, productId, locationId: toLocationId, batchNo: batch.batchNo
      }).session(useSession);

      if (targetBatch) {
        targetBatch.qty += qtyFromThis;
        await targetBatch.save({ session: useSession });
      } else {
        [targetBatch] = await Batch.create([{
          orgId, productId, locationId: toLocationId, batchNo: batch.batchNo,
          qty: qtyFromThis, receivedDate: batch.receivedDate, expiryDate: batch.expiryDate
        }], { session: useSession });
      }

      sourceBatch = batch;
      remainingQty -= qtyFromThis;
    }

    // Get destination stock after
    const destStockAfter = await getProductStock(orgId, productId, toLocationId, useSession);

    // Create ledger entry
    await StockTransaction.create([{
      orgId,
      type: TRANSACTION_TYPES.TRANSFER,
      productId,
      batchId: sourceBatch._id,
      qty: quantity,
      fromLocation: fromLocationId,
      toLocation: toLocationId,
      createdBy: performedBy,
      referenceDocument,
      beforeStock: sourceStockBefore,
      afterStock: sourceStockBefore - quantity,
      remarks
    }], { session: useSession });

    if (shouldCommit) await useSession.commitTransaction();

    return {
      success: true,
      quantity,
      fromLocation: fromLocationId,
      toLocation: toLocationId,
      beforeStock: sourceStockBefore,
      afterStock: sourceStockBefore - quantity
    };

  } catch (error) {
    if (shouldCommit && isNewSession) await useSession.abortTransaction();
    throw error;
  } finally {
    if (isNewSession) useSession.endSession();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate if stock is available for a given quantity
 */
async function validateStock(orgId, productId, locationId, quantity) {
  const stock = await getProductStock(orgId, productId, locationId);
  return {
    available: stock >= quantity,
    availableQty: stock,
    requestedQty: quantity
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get total stock for a product at a location
 */
async function getProductStock(orgId, productId, locationId, session = null) {
  const agg = await Batch.aggregate([
    { $match: { orgId, productId, locationId: locationId ? new mongoose.Types.ObjectId(locationId) : { $exists: true } } },
    { $group: { _id: null, total: { $sum: '$qty' } } }
  ], session ? { session } : {});
  return agg[0]?.total || 0;
}

/**
 * Get stock by location for a product
 */
async function getStockByLocation(orgId, productId) {
  const agg = await Batch.aggregate([
    { $match: { orgId, productId } },
    { $group: { _id: '$locationId', totalQty: { $sum: '$qty' } } },
    { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'location' } },
    { $unwind: '$location' },
    { $project: { locationId: '$_id', locationName: '$location.name', totalQty: 1 } }
  ]);
  return agg;
}

/**
 * Get total stock across all locations
 */
async function getTotalStock(orgId, productId) {
  const agg = await Batch.aggregate([
    { $match: { orgId, productId } },
    { $group: { _id: null, totalStock: { $sum: '$qty' } } }
  ]);
  return agg[0]?.totalStock || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  TRANSACTION_TYPES,
  increaseStock,
  decreaseStock,
  transferStock,
  validateStock,
  getProductStock,
  getStockByLocation,
  getTotalStock
};