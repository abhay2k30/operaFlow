# OperaFlow ERP - Technical Documentation

## Project Overview

**OperaFlow** is a MERN-stack inventory and procurement management system designed for small to medium manufacturing enterprises (SMEs). It handles the complete lifecycle of stock from purchase orders to receiving, storage, issuance, with integrated financial tracking, quality control, and industrial engineering-based inventory optimization.

### Key Capabilities
- **Inventory Management**: Multi-location stock tracking, batch management with expiry dates, atomic stock transactions
- **Procurement**: Purchase orders with GST/HSN support, partial receiving, supplier management
- **Production**: Production orders, Bill of Materials (BOM), material consumption tracking
- **Sales**: Sales orders, customer management, shipment tracking
- **Finance**: GST invoices, ledger entries, accounts payable/receivable
- **Quality Control**: Rejection tracking, inspection workflows
- **Analytics**: Dashboard KPIs, inventory planning, demand forecasting
- **Inventory Optimization**: EOQ calculation, ABC analysis, dynamic safety stock, reorder points

---

## Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19 (Vite), Tailwind CSS, Lucide React, Recharts |
| Backend | Node.js 18+, Express 5, MongoDB (Mongoose 8) |
| Auth | JWT with Role-Based Access Control |
| Database | MongoDB (local or Atlas) |

### Multi-Tenancy
The system uses **organization-scoped multi-tenancy** via `orgId` on all core models. Every document belongs to exactly one organization, and all queries MUST filter by `orgId` from `req.user.orgId`.

### Folder Structure
```
operaflow/
├── server/                    # Express.js backend
│   ├── index.js              # App entry point, route registration
│   ├── middleware/
│   │   └── auth.js           # JWT verification, role authorization
│   ├── models/               # Mongoose schemas (18 models)
│   │   ├── User.js           # User with role-based access
│   │   ├── Organization.js   # Tenant/org with planning defaults
│   │   ├── Product.js        # Products with IE optimization fields
│   │   ├── Batch.js          # Stock batches per location
│   │   ├── StockTransaction.js # Inventory ledger entries
│   │   ├── PurchaseOrder.js  # POs with line items
│   │   ├── SalesOrder.js     # SOs with line items
│   │   ├── ProductionOrder.js # Production with material consumption
│   │   ├── Party.js           # Suppliers/customers master
│   │   ├── BillOfMaterials.js # BOM definitions
│   │   ├── Invoice.js        # GST invoices
│   │   ├── LedgerEntry.js    # Financial entries
│   │   ├── Alert.js          # System alerts
│   │   └── ...               # Other models
│   ├── controllers/          # Request handlers (14 controllers)
│   ├── routes/               # API route definitions (21 route files)
│   ├── services/             # Business logic (5 services)
│   │   ├── stockService.js   # Atomic stock operations
│   │   ├── alertService.js   # Periodic alert checks (hourly cron)
│   │   ├── auditService.js   # Action logging
│   │   ├── pendingActionsService.js
│   │   └── inventoryOptimizationService.js # IE optimization (EOQ, ABC, ROP)
│   └── package.json
├── client/                   # React frontend
│   ├── src/
│   │   ├── App.jsx           # Router with role-based protected routes
│   │   ├── main.jsx          # React entry
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state + JWT handling
│   │   ├── config/
│   │   │   └── permissions.js # Role permissions (single source of truth)
│   │   ├── components/       # Reusable components
│   │   │   ├── layout/       # Layout, Sidebar, TopBar, ProtectedRoute
│   │   │   └── dashboard/    # Dashboard widgets
│   │   ├── pages/            # 30+ page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx, InventoryPlanning.jsx, InventoryDashboard.jsx
│   │   │   ├── PurchaseOrders.jsx, PurchaseOrderDetail.jsx, PurchaseDashboard.jsx
│   │   │   ├── SalesDashboard.jsx
│   │   │   ├── ProductionDashboard.jsx
│   │   │   ├── QualityControl.jsx
│   │   │   ├── Parties.jsx
│   │   │   ├── BillOfMaterials.jsx
│   │   │   ├── Invoices.jsx, Ledger.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── ...other pages
│   │   └── utils/
│   │       └── api.js        # Axios instance with JWT interceptor
│   └── package.json
├── README.md
└── CLAUDE.md                 # This file
```

---

## Database Models & Relationships

### Core Entity Relationships

```
Organization (1) ────* User
Organization (1) ────* Product
Organization (1) ────* Location
Organization (1) ────* Party

Product (1) ────* Batch                     # Stock by location
Product (1) ────* StockTransaction          # Inventory ledger
Product (1) ────* PurchaseOrderItem
Product (1) ────* SalesOrderItem

Location (1) ────* Batch
Location (1) ────* Shipment

Party (1) ────* PurchaseOrder               # As supplier
Party (1) ────* SalesOrder                 # As customer
Party (1) ────* Invoice

User (1) ────* PurchaseOrder                # createdBy
User (1) ────* SalesOrder
User (1) ────* ProductionOrder
User (1) ────* StockTransaction
```

### Key Models

#### User
```javascript
{
  orgId: ObjectId (ref: Organization, required, indexed),
  name: String (required),
  email: String (required, unique),
  passwordHash: String (required),
  role: Enum ['Admin','InventoryManager','Procurement','Finance','Production','Sales','QualityControl'],
  isActive: Boolean,
  lastLogin: Date
}
```

#### Organization
```javascript
{
  name: String (required),
  slug: String (required, unique, lowercase),
  gstin: String (uppercase),
  pan: String (uppercase),
  address: { line1, city, state, pincode },
  industry: String (default: 'Manufacturing'),
  plan: Enum ['trial','starter','pro'],
  trialEndsAt: Date,
  planningDefaults: {
    orderingCost: Number (default: 500),        // ₹ per order
    holdingRatePercent: Number (default: 20),  // % of unit price/year
    leadTimeDays: Number (default: 7),          // days
    safetyStockDays: Number (default: 3)         // days
  }
}
```

#### Product (with IE optimization fields)
```javascript
{
  orgId: ObjectId (indexed),
  sku: String (unique per org),
  name: String,
  unit: String,
  price: Number,
  category: Enum ['Raw Material','Finished Goods','Work In Progress','Packaging','Spare Parts','Consumables','Other'],
  // IE Optimization fields
  annualDemand: Number,           // calculated from transactions
  annualConsumptionValue: Number, // annualDemand × price
  orderingCostPerOrder: Number,   // null = use org default
  holdingCostRate: Number,        // null = use org default
  leadTimeDays: Number,          // null = use org default
  safetyStock: Number,           // calculated
  reorderPoint: Number,          // calculated
  eoq: Number,                  // calculated
  abcCategory: Enum ['A','B','C',null],
  criticalityLevel: Enum ['Critical','High','Medium','Low',null],
  defaultSupplier: ObjectId (ref: Party),
  lastOptimizationDate: Date,
  abcCalculatedAt: Date,
  isActive: Boolean
}
```

#### Batch (stock per location)
```javascript
{
  orgId: ObjectId (indexed),
  productId: ObjectId (ref: Product),
  locationId: ObjectId (ref: Location),
  batchNo: String (required),
  qty: Number (default: 0),
  reservedQty: Number (default: 0),
  receivedDate: Date,
  expiryDate: Date
}
// Index: { productId: 1, locationId: 1 }
```

#### StockTransaction (inventory ledger)
```javascript
{
  orgId: ObjectId (indexed),
  type: Enum ['PURCHASE','SALE','CONSUMPTION','ADJUSTMENT','TRANSFER','PRODUCTION_CONSUMPTION','PRODUCTION_OUTPUT'],
  productId: ObjectId (ref: Product),
  batchId: ObjectId (ref: Batch),
  qty: Number,
  fromLocation: ObjectId (ref: Location),
  toLocation: ObjectId (ref: Location),
  createdBy: ObjectId (ref: User),
  referenceDocument: String,  // e.g., 'PurchaseOrder:abc123'
  beforeStock: Number,
  afterStock: Number,
  createdAt: Date
}
```

#### PurchaseOrder
```javascript
{
  orgId: ObjectId (indexed),
  supplier: ObjectId (ref: Party, required),
  items: [{
    productId: ObjectId (ref: Product),
    qty: Number,
    price: Number,
    receivedQty: Number (default: 0),
    hsnCode: String,
    gstRate: Number (default: 18)
  }],
  status: Enum ['Draft','Pending','Partial','Fulfilled','Rejected','Cancelled'],
  expectedDate: Date,
  actualDeliveryDate: Date,
  paymentDueDate: Date,
  paymentStatus: Enum ['Unpaid','PartiallyPaid','Paid'],
  paidAmount: Number,
  invoiceRef: ObjectId (ref: Invoice),
  notes: String,
  createdBy: ObjectId (ref: User)
}
```

---

## API Patterns

### Route Organization
All routes are prefixed with `/api/` and follow RESTful conventions:

| Resource | Routes |
|----------|--------|
| `/api/auth` | POST register, POST login, GET me |
| `/api/products` | GET, POST, GET /:id, PUT /:id, DELETE /:id |
| `/api/stock` | GET, POST /issue, POST /transfer, POST /reject-batch |
| `/api/purchase-orders` | GET, POST, GET /:id, PUT /:id, POST /:id/receive |
| `/api/sales-orders` | GET, POST, POST /:id/reserve, POST /:id/ship |
| `/api/production-orders` | GET, POST, POST /:id/reserve-materials, POST /:id/consume-materials, POST /:id/complete |
| `/api/parties` | GET, POST, GET /:id, PUT /:id |
| `/api/bom` | GET, POST, GET /:id, PUT /:id, DELETE /:id |
| `/api/invoices` | GET, POST, GET /:id |
| `/api/ledger` | GET, POST |
| `/api/analytics` | GET /inventory, /procurement, /production, /sales, /kpi, /inventory-planning, /supplier-performance |
| `/api/optimization` | POST /run, GET /status, GET /product/:id, PATCH /product/:id/criticality, POST /auto-criticality |
| `/api/settings` | GET, PATCH |
| `/api/users` | GET, POST, DELETE /:id |
| `/api/alerts` | GET, PATCH /:id/resolve |
| `/api/pending-actions` | GET, PATCH /:id/approve, PATCH /:id/reject |

### Authentication Pattern
```javascript
// Middleware chain: auth -> authorize([roles])
router.post('/resource', auth, authorize(['Admin', 'InventoryManager']), controller.create);

// auth middleware extracts: req.user = { _id, role, orgId }
// authorize middleware checks role against allowed list
```

### Response Format
- Success: `res.json(data)` or `res.status(201).json(createdDoc)`
- Errors: `res.status(400).json({ error: message })` or `res.status(500).json({ error: message })`

### Transaction Patterns
All stock-modifying operations MUST use MongoDB sessions for atomicity:
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Operations
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}
```

---

## Business Logic Rules

### Stock Transaction Types
| Type | Effect on Stock | Use Case |
|------|-----------------|----------|
| PURCHASE | + | Receiving against PO |
| SALE | - | Shipping sales order |
| CONSUMPTION | - | General material usage |
| ADJUSTMENT | +/- | Manual adjustments, QC rejections |
| TRANSFER | ± (location change) | Moving stock between warehouses |
| PRODUCTION_CONSUMPTION | - | Materials consumed in production |
| PRODUCTION_OUTPUT | + | Finished goods from production |

### Demand Calculation
Demand for inventory planning is calculated from: `SALE`, `CONSUMPTION`, `PRODUCTION_CONSUMPTION` transactions.

### Industrial Engineering Formulas

**EOQ (Economic Order Quantity):**
```
EOQ = √((2 × annualDemand × orderingCost) / holdingCostPerUnit)
holdingCostPerUnit = unitCost × holdingCostRate
```
- Validate divide-by-zero (annualDemand > 0, orderingCost > 0, unitCost > 0, holdingCostRate > 0)

**ABC Analysis:**
- Sort products by annual consumption value (annualDemand × price) descending
- A: Cumulative ≤ 80% of total value
- B: Cumulative ≤ 95% of total value
- C: Remaining items

**Safety Stock (Statistical):**
```
SS = Z × σ × √L
```
- Z = service level factor (1.28=90%, 1.65=95%, 2.33=99%)
- σ = standard deviation of daily demand
- L = lead time in days

**Safety Stock (Simplified fallback):**
```
SS = dailyDemand × safetyStockDays
```

**Reorder Point (ROP):**
```
ROP = (dailyDemand × leadTime) + safetyStock
```

### Supplier Reliability & Dynamic Z
- Reliability Score = 0.5 × On-Time% + 0.3 × Quality% + 0.2 × LeadTimeConsistency%
- Z mapped to reliability: >90 → 1.28, 75-90 → 1.65, <75 → 2.33
- Products can reference a `defaultSupplier` Party for lead time and reliability

### Alert Logic
- **CRITICAL_STOCK**: stock ≤ safetyStock
- **LOW_STOCK**: stock ≤ reorderPoint
- **DEAD_STOCK**: no movement in 90 days
- **DELAYED_PO**: PO expectedDate < today and status not closed
- **SHIPMENT_DELAY**: shipment expectedDeliveryDate < today and not delivered

### Role Permissions
See `client/src/config/permissions.js` as single source of truth. Key mappings:

| Role | Access |
|------|--------|
| Admin | All routes |
| InventoryManager | Inventory, logistics, import/export |
| Procurement | Purchase orders, suppliers (parties) |
| Production | Production orders, BOM |
| Sales | Sales orders, customers |
| Finance | Invoices, ledger, performance metrics |
| QualityControl | Quality control, rejections |

---

## Important Workflows

### Creating a Purchase Order
1. POST `/api/purchase-orders` with supplier, items, expectedDate
2. PO created with status "Pending"
3. When goods arrive: POST `/api/purchase-orders/:id/receive`
   - Creates Batch records
   - Creates StockTransaction (type: PURCHASE)
   - Updates receivedQty on line items
   - Updates PO status: Partial → Fulfilled
   - Sets actualDeliveryDate on PO

### Fulfilling a Sales Order
1. POST `/api/sales-orders` with customer, items
2. Optional: POST `/api/sales-orders/:id/reserve` to reserve stock
3. POST `/api/sales-orders/:id/ship`
   - Calls `stockService.issueStock()` for each item (type: SALE)
   - Updates SO status to Shipped
   - Auto-creates Invoice and LedgerEntry

### Production Order Flow
1. POST `/api/production-orders` with productToProduce, qty, materials (or auto-fetch from BOM)
2. POST `/api/production-orders/:id/reserve-materials` to reserve input materials
3. POST `/api/production-orders/:id/consume-materials` (type: PRODUCTION_CONSUMPTION)
4. POST `/api/production-orders/:id/complete` (type: PRODUCTION_OUTPUT)
   - Creates output Batch
   - Creates StockTransaction (type: PRODUCTION_OUTPUT)

### Running Inventory Optimization
1. POST `/api/optimization/run`
   - Calculates annualDemand from SALE/CONSUMPTION/PRODUCTION_CONSUMPTION transactions
   - Calculates annualConsumptionValue = annualDemand × price
   - Calculates EOQ for each product
   - Calculates safetyStock using statistical or simplified formula
   - Calculates reorderPoint = dailyDemand × leadTime + safetyStock
   - Performs ABC analysis
   - Updates all fields on Product documents

### Stock Transfer Between Locations
1. POST `/api/stock/transfer` with batchId, toLocationId, qty
2. Uses MongoDB transaction to:
   - Reduce qty from source batch
   - Increase qty on target batch (or create new)
   - Create StockTransaction (type: TRANSFER)

---

## Commands

### Backend
```bash
cd server
npm install           # Install dependencies
npm start             # Run production (port 5000)
npm run dev           # Run with nodemon (auto-reload)
```

### Frontend
```bash
cd client
npm install           # Install dependencies
npm run dev           # Run dev server (port 5173)
npm run build         # Production build
```

### Environment Variables (server/.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/operaflow
JWT_SECRET=your_jwt_secret_key_here
```

---

## Dependencies

### Server
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.1.0 | Web framework |
| mongoose | ^8.20.0 | MongoDB ODM |
| jsonwebtoken | ^9.0.2 | JWT auth |
| bcryptjs | ^3.0.3 | Password hashing |
| cors | ^2.8.5 | Cross-origin requests |
| dotenv | ^17.2.3 | Environment variables |
| multer | ^2.0.2 | File uploads |
| csv-parser | ^3.2.0 | CSV parsing |
| json2csv | ^6.0.0 | CSV export |
| pdfkit | ^0.15.0 | PDF generation |

### Client
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI library |
| react-router-dom | ^7.9.6 | Routing |
| axios | ^1.13.2 | HTTP client |
| recharts | ^3.4.1 | Charts |
| lucide-react | ^0.554.0 | Icons |
| tailwindcss | ^3.4.17 | Styling |
| vite | ^7.2.2 | Build tool |

---

## AI Instructions for Future Development

### Must Follow
1. **Always filter by orgId**: Every MongoDB query MUST include `orgId: req.user.orgId` unless explicitly documented otherwise
2. **Use transactions for stock operations**: Any operation modifying Batch qty MUST use MongoDB sessions
3. **Use existing transaction types**: When creating StockTransaction, use: PURCHASE, SALE, CONSUMPTION, ADJUSTMENT, TRANSFER, PRODUCTION_CONSUMPTION, PRODUCTION_OUTPUT — never use IN/OUT
4. **Follow role authorization pattern**: Use `auth` middleware followed by `authorize([roles])` for protected routes
5. **Use service layer for business logic**: Complex logic (stock calculations, optimization) belongs in services, not controllers
6. **Keep permissions in permissions.js**: All role-based access control definitions must be in `client/src/config/permissions.js`
7. **Use org-level defaults wisely**: Product fields can override org defaults — check for null/undefined before falling back

### Adding New Features
1. Create model in `server/models/`
2. Create route in `server/routes/`
3. Add controller in `server/controllers/`
4. Add frontend page in `client/src/pages/`
5. Add route to App.jsx with proper role protection
6. Add nav item to permissions.js NAV_GROUPS
7. Register route in server/index.js

### Testing Approach
- Always verify orgId filtering works correctly
- Test stock transactions with multiple concurrent operations
- Test optimization calculations with edge cases (zero demand, zero price)
- Verify role-based access blocks unauthorized users

---

## Things That Should NOT Be Refactored Casually

### 1. Transaction Type System
The StockTransaction types (PURCHASE, SALE, CONSUMPTION, etc.) are fundamental to demand calculations, analytics, and optimization. Changing them requires updating:
- All controllers that create transactions
- analyticsController.js demand aggregations
- alertService.js
- inventoryOptimizationService.js

### 2. orgId Multi-Tenancy
All queries must include orgId. Removing this would break multi-tenant isolation and is a security-critical change.

### 3. MongoDB Transaction Patterns
The stockService uses sessions for atomic operations. Changing this pattern risks data inconsistency during concurrent operations.

### 4. Optimization Calculations
The EOQ, ABC analysis, safety stock, and ROP formulas in inventoryOptimizationService.js are derived from Industrial Engineering principles. Modifying them requires validation against the mathematical models.

### 5. Role-Based Access Control
The permissions system in `client/src/config/permissions.js` is the single source of truth. All route protection and navigation filtering depends on it.

### 6. Alert Cron Job
The alertService runs hourly (`setInterval(alertService.runAlertChecks, 1000 * 60 * 60)`). Changes to alert logic must maintain compatibility with existing alert types (LOW_STOCK, CRITICAL_STOCK, DEAD_STOCK, DELAYED_PO, SHIPMENT_DELAY).

### 7. JWT Auth Flow
The auth middleware extracts `req.user = { _id, role, orgId }`. This structure is used everywhere — changing it requires updating all protected routes.

---

## Current Development State - Centralized Inventory Architecture

### NEW ARCHITECTURE (Modular Services)

#### Directory Structure
```
server/services/
├── inventory/
│   ├── index.js              # Exports
│   └── InventoryService.js   # Centralized stock operations
├── optimization/
│   ├── index.js              # Exports
│   ├── EOQService.js         # Economic Order Quantity
│   ├── ABCAnalysisService.js # Pareto classification
│   └── ReorderService.js      # Reorder point calculations
├── alertService.js           # Alert cron (unchanged)
├── auditService.js           # Audit logging (unchanged)
└── stockService.js           # DEPRECATED - use InventoryService
```

#### Centralized InventoryService
All stock operations MUST go through InventoryService:
- `increaseStock()` - for purchases, production output, adjustments
- `decreaseStock()` - for sales, consumption, adjustments
- `transferStock()` - for location transfers
- `validateStock()` - for stock validation
- `getProductStock()`, `getStockByLocation()`, `getTotalStock()` - queries

**Transaction types:** PURCHASE, SALE, CONSUMPTION, ADJUSTMENT, TRANSFER, PRODUCTION_CONSUMPTION, PRODUCTION_OUTPUT

#### Modular Optimization Services
- **EOQService**: `calculateEOQ()`, `calculateAllEOQ()`, `getAnnualDemand()`
- **ABCAnalysisService**: `performABCAnalysis()`, `getABCSummary()`, `updateABCCategories()`
- **ReorderService**: `calculateROP()`, `calculateSafetyStock()`, `getReorderAlerts()`, `getSupplierReliability()`

#### Controllers Updated
- `inventoryController.js` - Now uses InventoryService
- `optimizationController.js` - NEW - Uses modular optimization services
- `productionController.js` - Uses InventoryService for consume/complete

#### Key Changes
1. Controllers no longer directly mutate Batch or StockTransaction
2. All stock operations go through centralized service with MongoDB transactions
3. Optimization logic is separated into distinct services
4. Old stockService.js is deprecated but kept for backward compatibility

---

## Current Development State (as of last session)

### Most Recent Implementation: Industrial Engineering Inventory Optimization

This section documents what was implemented in the most recent development session.

#### Transaction Types (Refactored)
Changed from generic `IN/OUT/TRANSFER` to business-meaningful types:
- `PURCHASE` — Stock received from suppliers
- `SALE` — Stock shipped to customers
- `CONSUMPTION` — General material usage
- `ADJUSTMENT` — Manual stock adjustments (e.g., QC rejections)
- `TRANSFER` — Movement between locations
- `PRODUCTION_CONSUMPTION` — Materials used in production
- `PRODUCTION_OUTPUT` — Finished goods from production

#### Dynamic Safety Stock (Supplier-Based)
- Added `actualDeliveryDate` to PurchaseOrder model
- Supplier reliability calculated from: on-time delivery %, quality score (rejection rate), lead time consistency
- Z-values dynamically assigned: >90 reliability → Z=1.28, 75-90 → Z=1.65, <75 → Z=2.33
- Safety stock formula: `SS = Z × σ × √L` (Z from supplier reliability, σ = demand std dev, L = lead time)
- Referenced in `server/controllers/analyticsController.js` and `server/services/alertService.js`

#### Inventory Optimization Service (NEW)
Created `server/services/inventoryOptimizationService.js` with:
- `calculateEOQ(annualDemand, orderingCost, unitCost, holdingCostRate)` — with divide-by-zero validation
- `performABCAnalysis(products, options)` — A=80%, B=15%, C=remaining by value
- `calculateSafetyStock(demandSigma, leadTime, zValue, ...)` — statistical or fallback
- `calculateROP(dailyDemand, leadTime, safetyStock)` — ROP = demand × leadTime + SS
- `runOptimization(orgId)` — Full optimization: calculates demand from transactions, EOQ, SS, ROP, assigns ABC
- `optimizeProduct(orgId, productId)` — Single product optimization

#### Product Model New Fields
```javascript
annualDemand,           // calculated from SALE+CONSUMPTION+PRODUCTION_CONSUMPTION transactions
annualConsumptionValue, // annualDemand × price
orderingCostPerOrder,   // null = use org default
holdingCostRate,        // null = use org default
leadTimeDays,           // null = use org default
safetyStock,            // calculated
reorderPoint,           // calculated
eoq,                    // calculated
abcCategory,            // A/B/C (auto-generated)
criticalityLevel,      // Critical/High/Medium/Low
defaultSupplier,        // reference to Party
lastOptimizationDate,
abcCalculatedAt
```

#### New API Routes
- `POST /api/optimization/run` — Run full optimization for org
- `GET /api/optimization/status` — Get ABC summary + reorder priorities (A items first)
- `GET /api/optimization/product/:id` — Single product optimization details
- `PATCH /api/optimization/product/:id/criticality` — Set criticality level
- `POST /api/optimization/auto-criticality` — Auto-assign: A→Critical, B→High, C→Medium

#### Frontend Updates
- **Settings.jsx**: Added holding cost rate presets dropdown (Low Risk 15%, Standard 20%, High Risk 30%, Custom), "Run Optimization" button, "Auto-assign criticality" button
- **InventoryPlanning.jsx**: Shows demandSigma, Z-value, supplier reliability, service level

#### Stock Service Updates
- `issueStock()` now accepts optional `transactionType` parameter (defaults to CONSUMPTION)
- Used by: sales (SALE), production consume (PRODUCTION_CONSUMPTION)

#### Production Controller Updates
- Material consumption now uses `PRODUCTION_CONSUMPTION` type
- Production completion now uses `PRODUCTION_OUTPUT` type

#### Demand Calculation (All Places)
All demand/usage calculations now use: `SALE + CONSUMPTION + PRODUCTION_CONSUMPTION`
- `analyticsController.js` — inventory analytics and planning
- `alertService.js` — low stock and dead stock alerts
- `inventoryOptimizationService.js` — annual demand calculation

---

## API Quick Reference

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user

### Core CRUD
- `GET/POST /api/products` — List/create products
- `GET/PUT/DELETE /api/products/:id` — Single product
- `GET /api/stock` — Get stock levels by product/location

### Stock Operations
- `POST /api/stock/transfer` — Transfer between locations
- `POST /api/stock/issue` — Issue stock (for consumption/sales)
- `POST /api/stock/reject-batch` — Reject stock (creates RejectionRecord)

### Orders
- `GET/POST /api/purchase-orders` — List/create PO
- `POST /api/purchase-orders/:id/receive` — Receive goods
- `GET/POST /api/sales-orders` — List/create SO
- `POST /api/sales-orders/:id/ship` — Ship order
- `GET/POST /api/production-orders` — List/create production order
- `POST /api/production-orders/:id/complete` — Complete production

### Analytics & Optimization
- `GET /api/analytics/inventory-planning` — EOQ, ROP, safety stock, ABC
- `GET /api/analytics/supplier-performance` — Supplier metrics
- `POST /api/optimization/run` — Run full IE optimization
- `GET /api/optimization/status` — Get optimization summary

### Settings
- `GET /api/settings` — Get organization settings
- `PATCH /api/settings` — Update settings including planning defaults