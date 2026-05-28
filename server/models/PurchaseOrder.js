const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  // Supplier is now a proper Party reference.
  // supplierRef keeps the old string value during migration.
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  supplierRef: { type: String }, // legacy string — keep for backward compat

  items: [{
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:         { type: Number, required: true },
    price:       { type: Number, required: true },
    receivedQty: { type: Number, default: 0 },
    hsnCode:     { type: String },
    gstRate:     { type: Number, default: 18 }
  }],

  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Partial', 'Fulfilled', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },

  expectedDate:     { type: Date },
  actualDeliveryDate: { type: Date },
  paymentDueDate: { type: Date },
  paymentStatus:  { type: String, enum: ['Unpaid', 'PartiallyPaid', 'Paid'], default: 'Unpaid' },
  paidAmount:     { type: Number, default: 0 },
  invoiceRef:     { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  notes:          { type: String },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
