const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  gstin:       { type: String, trim: true, uppercase: true },
  pan:         { type: String, trim: true, uppercase: true },
  phone:       { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  address: {
    line1:    String, city: String, state: String, pincode: String,
  },
  industry:    { type: String, default: 'Manufacturing' },
  isActive:    { type: Boolean, default: true },
  plan:        { type: String, enum: ['trial', 'starter', 'pro'], default: 'trial' },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },

  // ── Inventory planning defaults (configurable by Admin) ───────────────────
  planningDefaults: {
    orderingCost:     { type: Number, default: 500  },  // ₹ per order
    holdingRatePercent:{ type: Number, default: 20  },  // % of unit price per year
    leadTimeDays:     { type: Number, default: 7   },   // days from PO to receipt
    safetyStockDays:  { type: Number, default: 3   },   // days of buffer stock
  },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
