const Batch          = require('../models/Batch');
const StockTransaction = require('../models/StockTransaction');
const { logAction }  = require('./auditService');

const transferStock = async (productId, batchId, fromLocationId, toLocationId, qty, userId, reason, orgId) => {
  const session = await Batch.startSession();
  session.startTransaction();
  try {
    const sourceBatch = await Batch.findOne({ _id: batchId, locationId: fromLocationId, orgId }).session(session);
    if (!sourceBatch || sourceBatch.qty < qty) throw new Error('Insufficient stock in source location');
    sourceBatch.qty -= qty;
    await sourceBatch.save();

    let targetBatch = await Batch.findOne({ productId, locationId: toLocationId, batchNo: sourceBatch.batchNo, orgId }).session(session);
    if (targetBatch) { targetBatch.qty += qty; await targetBatch.save(); }
    else {
      [targetBatch] = await Batch.create([{
        orgId, productId, locationId: toLocationId, batchNo: sourceBatch.batchNo,
        qty, receivedDate: sourceBatch.receivedDate, expiryDate: sourceBatch.expiryDate
      }], { session });
    }

    await StockTransaction.create([{
      orgId, type: 'TRANSFER', productId, batchId: sourceBatch._id,
      qty, fromLocation: fromLocationId, toLocation: toLocationId, createdBy: userId
    }], { session });

    await session.commitTransaction();
    logAction(userId, 'TRANSFER_STOCK', 'Product', productId, { qty }, orgId);
    return { success: true };
  } catch (e) { await session.abortTransaction(); throw e; }
  finally { session.endSession(); }
};

const issueStock = async (productId, batchId, locationId, qty, userId, reason, orgId, transactionType = 'CONSUMPTION') => {
  const session = await Batch.startSession();
  session.startTransaction();
  try {
    const batch = await Batch.findOne({ _id: batchId, locationId, orgId }).session(session);
    if (!batch || batch.qty < qty) throw new Error('Insufficient stock');
    batch.qty -= qty;
    await batch.save();

    await StockTransaction.create([{
      orgId, type: transactionType, productId, batchId, qty,
      fromLocation: locationId, createdBy: userId
    }], { session });

    await session.commitTransaction();
    logAction(userId, 'ISSUE_STOCK', 'Product', productId, { qty, reason }, orgId);
    return { success: true };
  } catch (e) { await session.abortTransaction(); throw e; }
  finally { session.endSession(); }
};

const reserveStock = async (productId, batchId, qty, userId, refType, refId, orgId) => {
  const batch = await Batch.findOne({ _id: batchId, orgId });
  if (!batch || (batch.qty - batch.reservedQty) < qty) throw new Error('Insufficient available stock to reserve');
  batch.reservedQty += qty;
  await batch.save();
  logAction(userId, 'RESERVE_STOCK', refType, refId, { batchId, qty }, orgId);
  return batch;
};

module.exports = { transferStock, issueStock, reserveStock, logAction: require('./auditService').logAction };
