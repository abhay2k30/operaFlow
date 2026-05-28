const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  orgId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:          { type: String, required: true },
  name:         { type: String, required: true },
  unit:         { type: String, required: true },
  price:        { type: Number, default: 0 },
  category: {
    type: String,
    required: true,
    enum: ['Raw Material', 'Finished Goods', 'Work In Progress', 'Packaging', 'Spare Parts', 'Consumables', 'Other'],
    default: 'Raw Material'
  },

  // ── Industrial Engineering Inventory Optimization ───────────────────────────

  // Demand & Consumption
  annualDemand:           { type: Number, default: 0 },         // units/year (calculated from transactions)
  annualConsumptionValue: { type: Number, default: 0 },        // ₹/year (annualDemand × unitCost)

  // Cost Parameters
  orderingCostPerOrder:  { type: Number, default: null },     // ₹ per order (null = use org default)
  holdingCostRate:        { type: Number, default: null },     // % per year (null = use org default)

  // Planning Parameters
  leadTimeDays:          { type: Number, default: null },     // days (null = use org default)
  safetyStock:           { type: Number, default: 0 },         // units (calculated)
  reorderPoint:          { type: Number, default: 0 },        // units (calculated)
  eoq:                  { type: Number, default: 0 },         // economic order quantity (calculated)

  // ABC Analysis
  abcCategory: {
    type: String,
    enum: ['A', 'B', 'C', null],
    default: null
  },

  // Criticality
  criticalityLevel: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', null],
    default: null
  },

  // Legacy - kept for backward compatibility
  reorderLevel:    { type: Number, default: 10 },
  safetyStockDays: { type: Number, default: null },

  defaultSupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  description:  { type: String },
  isActive:     { type: Boolean, default: true },

  // Optimization timestamps
  lastOptimizationDate: { type: Date },
  abcCalculatedAt:      { type: Date }
}, { timestamps: true });

// Org-scoped unique SKU
productSchema.index({ orgId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
