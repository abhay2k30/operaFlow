const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  type: {
    type: String,
    enum: ['PURCHASE', 'SALE', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT'],
    required: true
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  qty: { type: Number, required: true },
  fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referenceDocument: { type: String },  // PO/SO/Production order reference
  beforeStock: { type: Number },
  afterStock: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
