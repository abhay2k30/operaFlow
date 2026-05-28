const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  batchNo: { type: String, required: true },
  qty: { type: Number, required: true, default: 0 },
  reservedQty: { type: Number, default: 0 },
  receivedDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
}, { timestamps: true });

// Index for quick lookup of stock by product and location
batchSchema.index({ productId: 1, locationId: 1 });

module.exports = mongoose.model('Batch', batchSchema);
