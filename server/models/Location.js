const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true },
  address: { type: String },
}, { timestamps: true });

// Compound unique index: name must be unique per organization
locationSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
