const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  industry:    { type: String, default: 'Manufacturing' },
  gstin:       { type: String, trim: true, uppercase: true },
  phone:       { type: String },
  email:       { type: String, lowercase: true },
  address:     {
    line1:    String,
    city:     String,
    state:    String,
    pincode:  String,
  },
  plan:        { type: String, enum: ['Free', 'Pro', 'Enterprise'], default: 'Free' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
