const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  qty:         { type: Number, required: true, min: 0 },
  unit:        { type: String, required: true },
  scrapFactor: { type: Number, default: 0, min: 0, max: 100 }, // % scrap allowance
  notes:       { type: String }
}, { _id: false });

const bomSchema = new mongoose.Schema({
  finishedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  outputQty:     { type: Number, required: true, default: 1 }, // qty produced per BoM run
  version:       { type: String, default: '1.0' },
  isActive:      { type: Boolean, default: true },
  yieldPercent:  { type: Number, default: 100, min: 1, max: 100 }, // expected yield
  components:    { type: [componentSchema], required: true },
  instructions:  { type: String },
  notes:         { type: String },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Only one active BoM per finished product
bomSchema.index({ finishedProduct: 1, isActive: 1 });

module.exports = mongoose.model('BillOfMaterials', bomSchema);
