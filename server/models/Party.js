const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Supplier', 'Customer', 'Both'],
    required: true
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
  },
  pan: { type: String, trim: true, uppercase: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: {
    line1: { type: String },
    city:  { type: String },
    state: { type: String },    // e.g. "Punjab"
    stateCode: { type: String }, // 2-digit GST state code e.g. "03"
    pincode: { type: String }
  },
  creditDays: { type: Number, default: 30 },
  paymentTerms: { type: String, default: 'Net 30' },
  bankDetails: {
    accountName: String,
    accountNo:   String,
    ifsc:        String,
    bank:        String,
    branch:      String
  },
  isActive: { type: Boolean, default: true },
  notes:    { type: String }
}, { timestamps: true });

partySchema.index({ name: 'text', gstin: 1 });

module.exports = mongoose.model('Party', partySchema);
