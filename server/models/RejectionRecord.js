const mongoose = require('mongoose');

const rejectionRecordSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Optional, if rejecting specific batch
  qty: { type: Number, required: true },
  reason: { type: String, required: true },
  stage: { 
    type: String, 
    enum: ['Receiving', 'Production', 'QualityCheck'], 
    required: true 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('RejectionRecord', rejectionRecordSchema);
