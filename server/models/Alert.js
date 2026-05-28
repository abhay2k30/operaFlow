const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  type: {
    type: String,
    enum: ['LOW_STOCK', 'CRITICAL_STOCK', 'EXPIRY_WARNING', 'DELAYED_PO', 'PRODUCTION_DELAY', 'SHIPMENT_DELAY', 'OVERSTOCK', 'DEAD_STOCK', 'PAYMENT_PENDING'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityModel: {
    type: String, // e.g., 'Product', 'PurchaseOrder', 'Shipment'
    required: true
  },
  status: {
    type: String,
    enum: ['Unread', 'Read', 'Resolved'],
    default: 'Unread'
  }
}, { timestamps: true });

// Index to quickly find unread alerts for specific entities
alertSchema.index({ status: 1, entityId: 1, type: 1 });

module.exports = mongoose.model('Alert', alertSchema);
