const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  // Customer is now a proper Party reference.
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  customerRef: { type: String }, // legacy string — keep for backward compat

  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:       { type: Number, required: true },
    price:     { type: Number, required: true },
    hsnCode:   { type: String },
    gstRate:   { type: Number, default: 18 },
    discount:  { type: Number, default: 0 }
  }],

  status: {
    type: String,
    enum: ['Pending', 'Picking', 'Shipped', 'Invoiced', 'Cancelled'],
    default: 'Pending'
  },

  shippingAddress:     { type: String, required: true },
  expectedDeliveryDate:{ type: Date },

  paymentStatus:  { type: String, enum: ['Unpaid', 'PartiallyPaid', 'Paid'], default: 'Unpaid' },
  paidAmount:     { type: Number, default: 0 },
  invoiceRef:     { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  notes:          { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
