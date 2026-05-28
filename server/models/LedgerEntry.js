const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  type: {
    type: String,
    enum: ['Payable', 'Receivable', 'Expense', 'Income', 'Journal'],
    required: true
  },
  amount:      { type: Number, required: true },
  currency:    { type: String, default: 'INR' },
  // References — at least one should be set
  invoiceRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  poRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  soRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  partyRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  description: { type: String },
  status: {
    type: String,
    enum: ['Open', 'Settled', 'Voided'],
    default: 'Open'
  },
  settledOn:  { type: Date },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
