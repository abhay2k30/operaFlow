/**
 * migrate-parties.js
 * Run ONCE after deploying to convert legacy plain-string supplier/customer
 * fields in PurchaseOrders and SalesOrders to proper Party ObjectId refs.
 *
 * Usage:
 *   cd server
 *   node migrate-parties.js
 *
 * Safe to run multiple times — uses upsert and skips already-migrated docs.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Party = require('./models/Party');
const PurchaseOrder = require('./models/PurchaseOrder');
const SalesOrder    = require('./models/SalesOrder');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // ── Purchase Orders ───────────────────────────────────────────────────────
  // Find POs where supplier is still a plain string (not an ObjectId)
  const rawPOs = await mongoose.connection.collection('purchaseorders')
    .find({ supplier: { $type: 'string' } }).toArray();

  console.log(`\nFound ${rawPOs.length} POs with string supplier`);

  for (const po of rawPOs) {
    const name = po.supplier;
    // Upsert a Supplier party with this name
    let party = await Party.findOneAndUpdate(
      { name, type: { $in: ['Supplier', 'Both'] } },
      { $setOnInsert: { name, type: 'Supplier', isActive: true } },
      { upsert: true, new: true }
    );
    await mongoose.connection.collection('purchaseorders').updateOne(
      { _id: po._id },
      { $set: { supplier: party._id, supplierRef: name } }
    );
    console.log(`  PO ${po._id}: "${name}" → Party ${party._id}`);
  }

  // ── Sales Orders ──────────────────────────────────────────────────────────
  const rawSOs = await mongoose.connection.collection('salesorders')
    .find({ customer: { $type: 'string' } }).toArray();

  console.log(`\nFound ${rawSOs.length} SOs with string customer`);

  for (const so of rawSOs) {
    const name = so.customer;
    let party = await Party.findOneAndUpdate(
      { name, type: { $in: ['Customer', 'Both'] } },
      { $setOnInsert: { name, type: 'Customer', isActive: true } },
      { upsert: true, new: true }
    );
    await mongoose.connection.collection('salesorders').updateOne(
      { _id: so._id },
      { $set: { customer: party._id, customerRef: name } }
    );
    console.log(`  SO ${so._id}: "${name}" → Party ${party._id}`);
  }

  console.log('\n✅ Migration complete');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
