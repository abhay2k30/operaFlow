const PurchaseOrder   = require('../models/PurchaseOrder');
const ProductionOrder = require('../models/ProductionOrder');
const SalesOrder      = require('../models/SalesOrder');
const Product         = require('../models/Product');
const Batch           = require('../models/Batch');

const getPendingActions = async (orgId, role) => {
  const actions = [];

  const roleFilters = {
    Admin: ['Purchase Order', 'Production Order', 'Sales Order', 'Low Stock', 'Stock Transfer', 'Payment'],
    Procurement: ['Purchase Order', 'Supplier'],
    InventoryManager: ['Low Stock', 'Stock Transfer', 'Stock Adjustment'],
    Production: ['Production Order', 'Material Consumption'],
    Sales: ['Sales Order', 'Shipment'],
    Finance: ['Payment', 'Invoice', 'Ledger'],
    QualityControl: ['Rejection Record', 'Quality Inspection']
  };

  const allowedTypes = roleFilters[role] || roleFilters.Admin;

  const pendingPOs = await PurchaseOrder.find({ orgId, status: { $in: ['Pending','Partial'] } })
    .populate('supplier', 'name').populate('createdBy', 'name');
  if (allowedTypes.includes('Purchase Order')) {
    pendingPOs.forEach(po => {
      const supplierName = po.supplier?.name || po.supplierRef || 'Unknown supplier';
      actions.push({ id: po._id, type: 'Purchase Order',
        description: `PO #${po._id.toString().slice(-6)} from ${supplierName}`,
        status: po.status, date: po.createdAt, priority: 'High', actionRequired: 'Receive / Approve' });
    });
  }

  const plannedProduction = await ProductionOrder.find({ orgId, status: 'Planned' })
    .populate('productToProduce', 'name');
  if (allowedTypes.includes('Production Order')) {
    plannedProduction.forEach(po => {
      actions.push({ id: po._id, type: 'Production Order',
        description: `Produce ${po.qty} × ${po.productToProduce?.name || '?'}`,
        status: po.status, date: po.createdAt, priority: 'Medium', actionRequired: 'Start Production' });
    });
  }

  const pendingSOs = await SalesOrder.find({ orgId, status: 'Pending' })
    .populate('customer', 'name');
  if (allowedTypes.includes('Sales Order')) {
    pendingSOs.forEach(so => {
      const customerName = so.customer?.name || so.customerRef || 'Unknown customer';
      actions.push({ id: so._id, type: 'Sales Order',
        description: `Order #${so._id.toString().slice(-6)} for ${customerName}`,
        status: so.status, date: so.createdAt, priority: 'High', actionRequired: 'Approve / Ship' });
    });
  }

  const lowStockItems = await Product.aggregate([
    { $match: { orgId } },
    { $lookup: { from: 'batches', localField: '_id', foreignField: 'productId', as: 'batches' } },
    { $project: { name:1, reorderLevel:1, reorderPoint:1, totalQty:{ $sum:'$batches.qty' } } },
    { $match: { $expr: { $lte: ['$totalQty', { $ifNull: ['$reorderPoint', '$reorderLevel'] }] } } }
  ]);
  if (allowedTypes.includes('Low Stock')) {
    lowStockItems.forEach(item => {
      const reorderLvl = item.reorderPoint || item.reorderLevel;
      actions.push({ id: item._id, type: 'Low Stock',
        description: `${item.name} is below reorder level (${item.totalQty}/${reorderLvl})`,
        status: 'Critical', date: new Date(), priority: 'Critical', actionRequired: 'Reorder' });
    });
  }

  return actions;
};

module.exports = { getPendingActions };
