const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  productToProduce: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  qty: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Planned', 'In-Progress', 'Quality Check', 'Completed', 'Cancelled'],
    default: 'Planned'
  },
  // Planned materials required
  materials: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    qty: {
      type: Number,
      required: true
    }
  }],
  // Actual materials consumed (with batch tracking)
  consumedMaterials: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    qty: {
      type: Number
    }
  }],
  startDate: Date,
  endDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
