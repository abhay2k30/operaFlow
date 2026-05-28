/**
 * Seed Script: SME Manufacturing (Wrenches)
 *
 * Creates realistic data for a wrench manufacturing company:
 * - Organization with planning defaults
 * - Users with different roles
 * - Locations (warehouses)
 * - Products (various wrench types/sizes)
 * - Stock batches
 * - Historical transactions (for demand calculation)
 * - Purchase orders (some fulfilled, some pending)
 * - Sales orders
 * - Production orders
 * - Alerts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Organization = require('./models/Organization');
const User = require('./models/User');
const Location = require('./models/Location');
const Product = require('./models/Product');
const Batch = require('./models/Batch');
const StockTransaction = require('./models/StockTransaction');
const Party = require('./models/Party');
const PurchaseOrder = require('./models/PurchaseOrder');
const SalesOrder = require('./models/SalesOrder');
const ProductionOrder = require('./models/ProductionOrder');
const Alert = require('./models/Alert');

// FIXED_ORG_ID - use existing organization created via register-company
// This is the org we created: Wrench Manufacturing Co (6a08f18c87a2e42af952cd53)
const FIXED_ORG_ID = '6a08f18c87a2e42af952cd53';

const MONGODB_URI = 'mongodb+srv://admin:operaflow@operaerp.itfe3ua.mongodb.net/?appName=operaERP';

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  // Use fixed orgId
  const orgId = new mongoose.Types.ObjectId(FIXED_ORG_ID);

  // Clear existing data for this org only (keep org and users)
  console.log('🧹 Clearing existing data for org...');
  await Promise.all([
    Alert.deleteMany({ orgId }),
    ProductionOrder.deleteMany({ orgId }),
    SalesOrder.deleteMany({ orgId }),
    PurchaseOrder.deleteMany({ orgId }),
    StockTransaction.deleteMany({ orgId }),
    Batch.deleteMany({ orgId }),
    Product.deleteMany({ orgId }),
    Party.deleteMany({ orgId }),
    Location.deleteMany({ orgId })
  ]);
  console.log('✅ Data cleared\n');

  // Get existing admin user from the org
  const adminUser = await User.findOne({ orgId, role: 'Admin' });
  if (!adminUser) {
    console.error('❌ No admin user found for org. Please register first.');
    process.exit(1);
  }
  console.log(`   Using admin user: ${adminUser.email}\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 3. Locations
  // ─────────────────────────────────────────────────────────────────────
  console.log('🏭 Creating locations...');
  const locations = {
    main: await Location.create({
      orgId,
      name: 'Main Warehouse',
      type: 'Warehouse',
      address: 'Plot No. 45, Industrial Estate, Pune',
      isActive: true
    }),
    store: await Location.create({
      orgId,
      name: 'Store Room A',
      type: 'Store',
      address: 'Building A, Ground Floor',
      isActive: true
    }),
    production: await Location.create({
      orgId,
      name: 'Production Floor',
      type: 'Production',
      address: 'Building B',
      isActive: true
    })
  };
  console.log(`   Created ${Object.keys(locations).length} locations\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 4. Products (Wrenches)
  // ─────────────────────────────────────────────────────────────────────
  console.log('🔧 Creating products (wrenches)...');

  const products = [
    // Combination Spanners (most popular)
    { name: 'Combination Spanner 8mm', sku: 'SPN-CMB-008', category: 'Finished Goods', unit: 'pcs', price: 85, annualDemand: 15000 },
    { name: 'Combination Spanner 10mm', sku: 'SPN-CMB-010', category: 'Finished Goods', unit: 'pcs', price: 95, annualDemand: 18000 },
    { name: 'Combination Spanner 12mm', sku: 'SPN-CMB-012', category: 'Finished Goods', unit: 'pcs', price: 110, annualDemand: 16000 },
    { name: 'Combination Spanner 14mm', sku: 'SPN-CMB-014', category: 'Finished Goods', unit: 'pcs', price: 125, annualDemand: 14000 },
    { name: 'Combination Spanner 16mm', sku: 'SPN-CMB-016', category: 'Finished Goods', unit: 'pcs', price: 145, annualDemand: 12000 },
    { name: 'Combination Spanner 18mm', sku: 'SPN-CMB-018', category: 'Finished Goods', unit: 'pcs', price: 165, annualDemand: 10000 },
    { name: 'Combination Spanner 21mm', sku: 'SPN-CMB-021', category: 'Finished Goods', unit: 'pcs', price: 195, annualDemand: 8000 },
    { name: 'Combination Spanner 24mm', sku: 'SPN-CMB-024', category: 'Finished Goods', unit: 'pcs', price: 225, annualDemand: 6000 },

    // Ring Spanners
    { name: 'Ring Spanner 10mm', sku: 'SPN-RNG-010', category: 'Finished Goods', unit: 'pcs', price: 120, annualDemand: 5000 },
    { name: 'Ring Spanner 12mm', sku: 'SPN-RNG-012', category: 'Finished Goods', unit: 'pcs', price: 140, annualDemand: 4500 },
    { name: 'Ring Spanner 14mm', sku: 'SPN-RNG-014', category: 'Finished Goods', unit: 'pcs', price: 160, annualDemand: 4000 },

    // Open Ended Spanners
    { name: 'Open Ended Spanner 8mm', sku: 'SPN-OPE-008', category: 'Finished Goods', unit: 'pcs', price: 75, annualDemand: 8000 },
    { name: 'Open Ended Spanner 10mm', sku: 'SPN-OPE-010', category: 'Finished Goods', unit: 'pcs', price: 85, annualDemand: 7500 },
    { name: 'Open Ended Spanner 12mm', sku: 'SPN-OPE-012', category: 'Finished Goods', unit: 'pcs', price: 100, annualDemand: 7000 },

    // Adjustable Wrenches
    { name: 'Adjustable Wrench 6"', sku: 'ADJ-WRN-006', category: 'Finished Goods', unit: 'pcs', price: 250, annualDemand: 3000 },
    { name: 'Adjustable Wrench 8"', sku: 'ADJ-WRN-008', category: 'Finished Goods', unit: 'pcs', price: 320, annualDemand: 2500 },
    { name: 'Adjustable Wrench 10"', sku: 'ADJ-WRN-010', category: 'Finished Goods', unit: 'pcs', price: 450, annualDemand: 1500 },

    // Socket Sets
    { name: 'Socket Set 40pcs', sku: 'SOC-SET-040', category: 'Finished Goods', unit: 'set', price: 850, annualDemand: 1200 },
    { name: 'Socket Set 60pcs', sku: 'SOC-SET-060', category: 'Finished Goods', unit: 'set', price: 1250, annualDemand: 800 },

    // Raw Materials
    { name: 'Steel Round Bar 10mm', sku: 'RM-STL-010', category: 'Raw Material', unit: 'kg', price: 85, annualDemand: 25000 },
    { name: 'Steel Round Bar 12mm', sku: 'RM-STL-012', category: 'Raw Material', unit: 'kg', price: 95, annualDemand: 22000 },
    { name: 'Steel Round Bar 16mm', sku: 'RM-STL-016', category: 'Raw Material', unit: 'kg', price: 120, annualDemand: 18000 },
    { name: 'Chrome Vanadium Alloy', sku: 'RM-CRV-000', category: 'Raw Material', unit: 'kg', price: 350, annualDemand: 5000 },
    { name: 'Handle Grip Rubber', sku: 'RM-RUB-000', category: 'Raw Material', unit: 'pcs', price: 15, annualDemand: 50000 },
    { name: 'Anti-corrosion Oil', sku: 'RM-OIL-000', category: 'Consumables', unit: 'liter', price: 180, annualDemand: 500 },

    // Packaging
    { name: 'Box - Small', sku: 'PKG-BOX-S', category: 'Packaging', unit: 'pcs', price: 12, annualDemand: 40000 },
    { name: 'Box - Medium', sku: 'PKG-BOX-M', category: 'Packaging', unit: 'pcs', price: 18, annualDemand: 30000 },
    { name: 'Box - Large', sku: 'PKG-BOX-L', category: 'Packaging', unit: 'pcs', price: 25, annualDemand: 20000 },
  ];

  const createdProducts = {};
  for (const p of products) {
    const product = await Product.create({
      orgId: orgId,
      ...p,
      isActive: true
    });
    createdProducts[p.sku] = product;
  }
  console.log(`   Created ${products.length} products\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 5. Parties (Suppliers & Customers)
  // ─────────────────────────────────────────────────────────────────────
  console.log('🏢 Creating parties...');

  const suppliers = await Party.insertMany([
    { orgId: orgId, name: 'Sharma Steel Works', type: 'Supplier', gstin: '27AABFS1234M1ZT', phone: '+91 98765 11111', email: 'orders@sharmasteel.com', address: { line1: '12, Steel Market', city: 'Mumbai', state: 'Maharashtra' }, creditDays: 30 },
    { orgId: orgId, name: 'Alloy Metals India', type: 'Supplier', gstin: '27AABCU5678M1ZT', phone: '+91 98765 22222', email: 'sales@alloymetals.com', address: { line1: '45, Industrial Area', city: 'Nagpur', state: 'Maharashtra' }, creditDays: 45 },
    { orgId: orgId, name: 'Precision Steel Co', type: 'Supplier', gstin: '29AAFPQ1234M1ZT', phone: '+91 98765 33333', email: 'info@precisionsteel.co', address: { line1: '78, Steel Nagar', city: 'Nashik', state: 'Maharashtra' }, creditDays: 30 },
    { orgId: orgId, name: 'GripTech Handle Industries', type: 'Supplier', gstin: '27AADCG9876M1ZT', phone: '+91 98765 44444', email: 'orders@griptech.com', address: { line1: '23, Industrial Estate', city: 'Kolhapur', state: 'Maharashtra' }, creditDays: 15 },
    { orgId: orgId, name: 'PackRight Solutions', type: 'Supplier', gstin: '27AABCP4567M1ZT', phone: '+91 98765 55555', email: 'sales@packright.in', address: { line1: '56, Warehouse Area', city: 'Pune', state: 'Maharashtra' }, creditDays: 15 }
  ]);

  const customers = await Party.insertMany([
    { orgId: orgId, name: 'AutoTech Workshops', type: 'Customer', gstin: '27AAFCI8765M1ZT', phone: '+91 98770 11111', email: 'purchase@autotech.co', address: { line1: 'Shop 12, Auto Market', city: 'Pune', state: 'Maharashtra' }, creditDays: 30 },
    { orgId: orgId, name: 'Industrial Machinery Corp', type: 'Customer', gstin: '29AABCF5432M1ZT', phone: '+91 98770 22222', email: 'procurement@imc.co', address: { line1: 'Plot 89, MIDC', city: 'Aurangabad', state: 'Maharashtra' }, creditDays: 45 },
    { orgId: orgId, name: 'Workshop Supply Co', type: 'Customer', gstin: '27AADCH3456M1ZT', phone: '+91 98770 33333', email: 'orders@workshopsupply.com', address: { line1: '34, Tool Market', city: 'Mumbai', state: 'Maharashtra' }, creditDays: 15 },
    { orgId: orgId, name: 'Construction Tools Ltd', type: 'Customer', gstin: '27AAFCK7890M1ZT', phone: '+91 98770 44444', email: 'purchase@constructiontools.in', address: { line1: '67, Commercial Complex', city: 'Nagpur', state: 'Maharashtra' }, creditDays: 30 },
    { orgId: orgId, name: 'Garage Masters India', type: 'Customer', gstin: '27AABCM2345M1ZT', phone: '+91 98770 55555', email: 'info@garagemasters.co', address: { line1: 'Shop 5, Auto Lane', city: 'Kolhapur', state: 'Maharashtra' }, creditDays: 15 }
  ]);

  console.log(`   Created ${suppliers.length} suppliers, ${customers.length} customers\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 6. Stock Batches (Current Inventory)
  // ─────────────────────────────────────────────────────────────────────
  console.log('📦 Creating stock batches...');

  const finishedGoods = products.filter(p => p.category === 'Finished Goods');
  const rawMaterials = products.filter(p => p.category === 'Raw Material');

  // Higher stock for A-items (popular wrenches)
  const stockLevels = {
    'SPN-CMB-008': 2500, 'SPN-CMB-010': 3000, 'SPN-CMB-012': 2800,
    'SPN-CMB-014': 2000, 'SPN-CMB-016': 1800, 'SPN-CMB-018': 1500,
    'SPN-CMB-021': 1000, 'SPN-CMB-024': 800,
    'SPN-RNG-010': 600, 'SPN-RNG-012': 550, 'SPN-RNG-014': 500,
    'SPN-OPE-008': 1000, 'SPN-OPE-010': 900, 'SPN-OPE-012': 800,
    'ADJ-WRN-006': 350, 'ADJ-WRN-008': 300, 'ADJ-WRN-010': 200,
    'SOC-SET-040': 150, 'SOC-SET-060': 80,
    'RM-STL-010': 5000, 'RM-STL-012': 4500, 'RM-STL-016': 3500,
    'RM-CRV-000': 800, 'RM-RUB-000': 10000, 'RM-OIL-000': 100,
    'PKG-BOX-S': 8000, 'PKG-BOX-M': 6000, 'PKG-BOX-L': 4000
  };

  const batchDate = new Date();
  for (const [sku, qty] of Object.entries(stockLevels)) {
    if (createdProducts[sku]) {
      await Batch.create({
        orgId: orgId,
        productId: createdProducts[sku]._id,
        locationId: locations.main._id,
        batchNo: `BATCH-${sku}-${Math.floor(Math.random() * 100)}`,
        qty: qty,
        receivedDate: new Date(batchDate - Math.random() * 30 * 24 * 60 * 60 * 1000),
        expiryDate: null
      });
    }
  }
  console.log(`   Created ${Object.keys(stockLevels).length} batches\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 7. Historical Stock Transactions (90 days for demand calculation)
  // ─────────────────────────────────────────────────────────────────────
  console.log('📊 Creating historical transactions...');

  const transactionTypes = ['SALE', 'CONSUMPTION', 'PRODUCTION_CONSUMPTION', 'PURCHASE'];
  const transactions = [];
  const now = new Date();

  // Generate 90 days of transactions
  for (let day = 0; day < 90; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Sales (higher on weekdays)
    for (const p of finishedGoods) {
      // Random number of sales transactions per day
      const numSales = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numSales; i++) {
        const qty = Math.floor(p.annualDemand / 365 * (0.5 + Math.random()));
        if (qty > 0) {
          transactions.push({
            orgId: orgId,
            type: 'SALE',
            productId: createdProducts[p.sku]._id,
            qty: qty,
            fromLocation: locations.main._id,
            createdBy: adminUser._id,
            referenceDocument: `SO-DOM-${day}-${i}`,
            createdAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000)
          });
        }
      }
    }

    // Production consumption (raw materials)
    for (const p of rawMaterials) {
      const numConsume = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numConsume; i++) {
        const qty = Math.floor(p.annualDemand / 365 * (0.5 + Math.random()));
        if (qty > 0) {
          transactions.push({
            orgId: orgId,
            type: 'PRODUCTION_CONSUMPTION',
            productId: createdProducts[p.sku]._id,
            qty: qty,
            fromLocation: locations.main._id,
            createdBy: adminUser._id,
            referenceDocument: `PROD-${day}-${i}`,
            createdAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000)
          });
        }
      }
    }

    // Purchases (weekly)
    if (day % 7 === 0) {
      for (const p of rawMaterials) {
        const qty = Math.floor(p.annualDemand / 52);
        if (qty > 0) {
          transactions.push({
            orgId: orgId,
            type: 'PURCHASE',
            productId: createdProducts[p.sku]._id,
            qty: qty,
            toLocation: locations.main._id,
            createdBy: adminUser._id,
            referenceDocument: `PO-SUP-${day}`,
            createdAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000)
          });
        }
      }
    }
  }

  await StockTransaction.insertMany(transactions);
  console.log(`   Created ${transactions.length} historical transactions\n`);

  // ─────────────────────────────────────────────────────────────────────
  // 8. Purchase Orders (some fulfilled, some pending)
  // ─────────────────────────────────────────────────────────────────────
  console.log('📋 Creating purchase orders...');

  const rawMatProducts = products.filter(p => p.category === 'Raw Material');
  const poStatuses = ['Fulfilled', 'Fulfilled', 'Fulfilled', 'Partial', 'Pending'];

  for (let i = 0; i < 15; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const items = [];
    const numItems = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numItems; j++) {
      const product = rawMatProducts[Math.floor(Math.random() * rawMatProducts.length)];
      const qty = Math.floor(product.annualDemand / 10 * (0.8 + Math.random() * 0.4));
      const price = product.price * (0.95 + Math.random() * 0.1);
      items.push({
        productId: createdProducts[product.sku]._id,
        qty: qty,
        price: Math.round(price),
        receivedQty: 0,
        hsnCode: '7213',
        gstRate: 18
      });
    }

    const status = poStatuses[Math.floor(Math.random() * poStatuses.length)];
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - Math.floor(Math.random() * 30));

    const po = await PurchaseOrder.create({
      orgId: orgId,
      supplier: supplier._id,
      items: items,
      status: status,
      expectedDate: expectedDate,
      paymentStatus: status === 'Fulfilled' ? 'Paid' : 'Unpaid',
      createdBy: adminUser._id
    });

    // If fulfilled, add actualDeliveryDate and receivedQty
    if (status === 'Fulfilled') {
      const actualDate = new Date(expectedDate);
      actualDate.setDate(actualDate.getDate() + Math.floor(Math.random() * 3) - 1);
      await PurchaseOrder.findByIdAndUpdate(po._id, {
        actualDeliveryDate: actualDate,
        items: items.map(item => ({
          ...item,
          receivedQty: item.qty
        }))
      });
    }
  }
  console.log('   Created 15 purchase orders\n');

  // ─────────────────────────────────────────────────────────────────────
  // 9. Sales Orders
  // ─────────────────────────────────────────────────────────────────────
  console.log('🛒 Creating sales orders...');

  for (let i = 0; i < 20; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const items = [];
    const numItems = Math.floor(Math.random() * 5) + 1;

    for (let j = 0; j < numItems; j++) {
      const product = finishedGoods[Math.floor(Math.random() * finishedGoods.length)];
      const qty = Math.floor(product.annualDemand / 100 * (0.5 + Math.random()));
      items.push({
        productId: createdProducts[product.sku]._id,
        qty: qty,
        price: product.price,
        hsnCode: '8204',
        gstRate: 18
      });
    }

    const statuses = ['Pending', 'Picking', 'Shipped', 'Invoiced'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await SalesOrder.create({
      orgId: orgId,
      customer: customer._id,
      items: items,
      status: status,
      shippingAddress: customer.address,
      createdBy: adminUser._id
    });
  }
  console.log('   Created 20 sales orders\n');

  // ─────────────────────────────────────────────────────────────────────
  // 10. Production Orders
  // ─────────────────────────────────────────────────────────────────────
  console.log('🏗️ Creating production orders...');

  const bomProducts = finishedGoods.filter(p => p.sku.startsWith('SPN-CMB'));
  const prodStatuses = ['Completed', 'Completed', 'In-Progress', 'Pending'];

  for (let i = 0; i < 10; i++) {
    const product = bomProducts[Math.floor(Math.random() * bomProducts.length)];
    const qty = Math.floor(product.annualDemand / 20 * (0.8 + Math.random() * 0.4));

    const prodStatuses = ['Planned', 'In-Progress', 'Completed', 'Cancelled'];
    const status = prodStatuses[Math.floor(Math.random() * prodStatuses.length)];

    // Raw material requirements
    const materials = rawMatProducts.slice(0, 4).map(rm => ({
      productId: createdProducts[rm.sku]._id,
      qty: Math.floor(qty * (rm.annualDemand / product.annualDemand) * 1.1)
    }));

    const prod = await ProductionOrder.create({
      orgId: orgId,
      productToProduce: createdProducts[product.sku]._id,
      qty: qty,
      materials: materials,
      status: status,
      createdBy: adminUser._id
    });

    if (status === 'Completed') {
      await ProductionOrder.findByIdAndUpdate(prod._id, {
        startDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        status: 'Completed'
      });
    }
  }
  console.log('   Created 10 production orders\n');

  // ─────────────────────────────────────────────────────────────────────
  // 11. Alerts
  // ─────────────────────────────────────────────────────────────────────
  console.log('⚠️ Creating alerts...');

  await Alert.insertMany([
    {
      orgId: orgId,
      type: 'LOW_STOCK',
      severity: 'HIGH',
      message: 'Combination Spanner 24mm is below reorder point (current: 800, ROP: 1200)',
      entityId: createdProducts['SPN-CMB-024']._id,
      entityModel: 'Product',
      status: 'Unread'
    },
    {
      orgId: orgId,
      type: 'DELAYED_PO',
      severity: 'HIGH',
      message: 'Purchase order from Sharma Steel Works is overdue',
      entityId: suppliers[0]._id,
      entityModel: 'Party',
      status: 'Unread'
    },
    {
      orgId: orgId,
      type: 'PAYMENT_PENDING',
      severity: 'MEDIUM',
      message: 'Payment due for purchase order from Alloy Metals India',
      entityId: suppliers[1]._id,
      entityModel: 'Party',
      status: 'Unread'
    }
  ]);
  console.log('   Created 3 alerts\n');

  // ─────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE - SME Manufacturing Data Created');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📧 Login credentials (use these to access):');
  console.log('   Email: admin@wrenchco.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('📊 Data created for org ' + FIXED_ORG_ID + ':');
  console.log(`   - ${Object.keys(locations).length} locations`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${suppliers.length + customers.length} parties`);
  console.log(`   - ${Object.keys(stockLevels).length} stock batches`);
  console.log(`   - ${transactions.length} historical transactions`);
  console.log('   - 15 purchase orders');
  console.log('   - 20 sales orders');
  console.log('   - 10 production orders');
  console.log('   - 3 alerts');
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});