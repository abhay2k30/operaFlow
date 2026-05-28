const mongoose = require('mongoose');

// Counter for sequential invoice numbers
const counterSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  _id:  { type: String, required: true },
  seq:  { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

const lineItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  hsnCode:     { type: String }, // HSN/SAC code for GST
  qty:         { type: Number, required: true },
  unit:        { type: String, required: true },
  unitPrice:   { type: Number, required: true },
  discount:    { type: Number, default: 0 },       // flat discount on line
  taxableAmt:  { type: Number, required: true },   // after discount
  gstRate:     { type: Number, required: true },   // total GST % (e.g. 18)
  cgst:        { type: Number, default: 0 },
  sgst:        { type: Number, default: 0 },
  igst:        { type: Number, default: 0 },
  totalAmt:    { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNo:   { type: String, unique: true },
  type:        { type: String, enum: ['Sales', 'Purchase'], required: true },
  party:       { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  soRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  poRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  invoiceDate: { type: Date, default: Date.now },
  dueDate:     { type: Date },
  supplyType:  { type: String, enum: ['Intra-State', 'Inter-State'], required: true },
  placeOfSupply: { type: String }, // state name or code
  lineItems:   { type: [lineItemSchema], required: true },
  subtotal:    { type: Number, required: true }, // sum of taxableAmt
  totalDiscount: { type: Number, default: 0 },
  totalCgst:   { type: Number, default: 0 },
  totalSgst:   { type: Number, default: 0 },
  totalIgst:   { type: Number, default: 0 },
  totalTax:    { type: Number, default: 0 },
  roundOff:    { type: Number, default: 0 },
  grandTotal:  { type: Number, required: true },
  amountInWords: { type: String },
  status:      {
    type: String,
    enum: ['Draft', 'Issued', 'Paid', 'PartiallyPaid', 'Cancelled'],
    default: 'Draft'
  },
  paidAmount:  { type: Number, default: 0 },
  notes:       { type: String },
  termsAndConditions: { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate invoice number before save
invoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = this.type === 'Sales' ? 'SI' : 'PI';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const counterId = `invoice_${prefix}_${year}${month}`;
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.invoiceNo = `${prefix}/${year}-${month}/${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
