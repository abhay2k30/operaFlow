const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  trackingId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Outbound', 'Inbound'], default: 'Outbound' },
  // Link to source document
  soRef: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  poRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  // What is being shipped
  items: [{
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: { type: String },
    qty:         { type: Number, required: true },
    unit:        { type: String, default: 'nos' }
  }],
  origin:      { type: String, required: true },
  destination: { type: String, required: true },
  weight:      { type: Number },
  status: {
    type: String,
    enum: ['Draft', 'Shipped', 'In Transit', 'Delivered', 'Rejected'],
    default: 'Draft'
  },
  rejectionReason: { type: String },
  expectedDeliveryDate: { type: Date },
  carrier: {
    type:               { type: String, enum: ['Internal', 'External'], default: 'External' },
    name:               String,
    externalTrackingId: String,
    driverId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  timeline: [{
    status:    String,
    timestamp: { type: Date, default: Date.now },
    note:      String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);

