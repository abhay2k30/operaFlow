/**
 * Inventory Controller
 *
 * Uses centralized InventoryService for all stock operations.
 * Business logic has been moved to the service layer.
 */

const Product = require('../models/Product');
const Location = require('../models/Location');
const { InventoryService, TRANSACTION_TYPES } = require('../services/inventory');

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CRUD
// ─────────────────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ orgId: req.user.orgId, isActive: { $ne: false } });
    res.send(products);
  } catch (e) { res.status(500).send(e); }
};

const getProduct = async (req, res) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!p) return res.status(404).send();
    res.send(p);
  } catch (e) { res.status(500).send(e); }
};

const createProduct = async (req, res) => {
  const { currentStock, ...productData } = req.body;
  const product = new Product({ ...productData, orgId: req.user.orgId });

  try {
    await product.save();

    // If initial stock provided, use centralized service
    if (currentStock && currentStock > 0) {
      const location = await Location.findOne({ orgId: req.user.orgId, name: 'Warehouse A' })
        || await Location.findOne({ orgId: req.user.orgId });

      if (location) {
        await InventoryService.increaseStock({
          orgId: req.user.orgId,
          productId: product._id,
          locationId: location._id,
          quantity: currentStock,
          transactionType: TRANSACTION_TYPES.ADJUSTMENT,
          referenceDocument: 'Initial Stock',
          batchNo: `INIT-${Date.now()}`,
          performedBy: req.user._id,
          remarks: 'Initial inventory setup'
        });
      }
    }

    res.status(201).send(product);
  } catch (e) { res.status(400).send(e); }
};

const updateProduct = async (req, res) => {
  try {
    const p = await Product.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      req.body, { new: true, runValidators: true }
    );
    if (!p) return res.status(404).send();
    res.send(p);
  } catch (e) { res.status(400).send(e); }
};

const deleteProduct = async (req, res) => {
  try {
    // Soft delete — preserve history
    const p = await Product.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { isActive: false }, { new: true }
    );
    if (!p) return res.status(404).send();
    res.send({ message: 'Product deactivated', product: p });
  } catch (e) { res.status(500).send(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK QUERIES
// ─────────────────────────────────────────────────────────────────────────────

const getStock = async (req, res) => {
  try {
    const { productId, locationId } = req.query;
    const mongoose = require('mongoose');
    const match = { orgId: new mongoose.Types.ObjectId(req.user.orgId), qty: { $gt: 0 } };
    if (productId) match.productId = new mongoose.Types.ObjectId(productId);
    if (locationId) match.locationId = new mongoose.Types.ObjectId(locationId);

    const stock = await require('../models/Batch').aggregate([
      { $match: match },
      { $group: {
        _id: { productId: '$productId', locationId: '$locationId' },
        totalQty: { $sum: '$qty' },
        reservedQty: { $sum: '$reservedQty' },
        batches: { $push: { batchNo:'$batchNo', qty:'$qty', reservedQty:'$reservedQty', expiryDate:'$expiryDate' } }
      }},
      { $lookup: { from:'products', localField:'_id.productId', foreignField:'_id', as:'product' } },
      { $lookup: { from:'locations', localField:'_id.locationId', foreignField:'_id', as:'location' } },
      { $unwind: '$product' },
      { $unwind: '$location' }
    ]);

    res.send(stock);
  } catch (e) { res.status(500).send(e); }
};

const getStockByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await InventoryService.getStockByLocation(req.user.orgId, productId);
    res.send(result);
  } catch (e) { res.status(500).send(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK OPERATIONS (via InventoryService)
// ─────────────────────────────────────────────────────────────────────────────

const transferStock = async (req, res) => {
  try {
    const { batchId, toLocationId, qty, reason } = req.body;

    // Find the batch to get product info
    const Batch = require('../models/Batch');
    const batch = await Batch.findOne({ _id: batchId, orgId: req.user.orgId });
    if (!batch) return res.status(404).send({ error: 'Batch not found' });

    // Use centralized InventoryService
    const result = await InventoryService.transferStock({
      orgId: req.user.orgId,
      productId: batch.productId,
      fromLocationId: batch.locationId,
      toLocationId,
      quantity: qty,
      referenceDocument: `StockTransfer:${batchId}`,
      performedBy: req.user._id,
      remarks: reason
    });

    res.send(result);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
};

const issueStock = async (req, res) => {
  try {
    const { batchId, qty, reason, transactionType } = req.body;

    const Batch = require('../models/Batch');
    const batch = await Batch.findOne({ _id: batchId, orgId: req.user.orgId });
    if (!batch) return res.status(404).send({ error: 'Batch not found' });

    // Map to proper transaction type (default to CONSUMPTION)
    const txType = transactionType || TRANSACTION_TYPES.CONSUMPTION;

    const result = await InventoryService.decreaseStock({
      orgId: req.user.orgId,
      productId: batch.productId,
      locationId: batch.locationId,
      quantity: qty,
      transactionType: txType,
      referenceDocument: `Issue:${batchId}`,
      batchId,
      performedBy: req.user._id,
      remarks: reason
    });

    res.send(result);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStock,
  getStockByProduct,
  transferStock,
  issueStock
};