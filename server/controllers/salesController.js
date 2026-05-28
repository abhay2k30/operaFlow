const SalesOrder   = require('../models/SalesOrder');
const stockService = require('../services/stockService');
const { logAction }= require('../services/auditService');

const createSO = async (req, res) => {
  try {
    const so = new SalesOrder({ ...req.body, orgId: req.user.orgId, createdBy: req.user._id });
    await so.save();
    logAction(req.user._id, 'CREATE_SO', 'SalesOrder', so._id, {}, req.user.orgId);
    res.status(201).send(so);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const getSOs = async (req, res) => {
  try {
    const filter = { orgId: req.user.orgId };
    if (req.query.status) filter.status = req.query.status;
    const sos = await SalesOrder.find(filter)
      .populate('customer','name gstin phone email')
      .populate('items.productId','name sku unit')
      .populate('createdBy','name')
      .sort({ createdAt: -1 });
    res.send(sos);
  } catch (e) { res.status(500).send(e); }
};

const reserveStockForSO = async (req, res) => {
  try {
    const { items } = req.body;
    const so = await SalesOrder.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!so) return res.status(404).send();
    for (const item of items) {
      await stockService.reserveStock(item.productId, item.batchId, item.qty, req.user._id, 'SalesOrder', so._id, req.user.orgId);
    }
    so.status = 'Picking';
    await so.save();
    logAction(req.user._id, 'RESERVE_STOCK_SO', 'SalesOrder', so._id, {}, req.user.orgId);
    res.send(so);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const shipSO = async (req, res) => {
  try {
    const { items } = req.body;
    const so = await SalesOrder.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('customer')
      .populate('items.productId','name sku unit');
    if (!so) return res.status(404).send();

    for (const item of items) {
      await stockService.issueStock(item.productId, item.batchId, null, item.qty, req.user._id, `Shipment for SO #${so._id}`, req.user.orgId, 'SALE');
    }
    so.status = 'Shipped';
    await so.save();

    // Auto-create invoice
    try {
      const Invoice     = require('../models/Invoice');
      const LedgerEntry = require('../models/LedgerEntry');
      const party = so.customer;
      if (party?._id) {
        const supplyType = 'Intra-State';
        const lineItems  = so.items.map(i => {
          const taxableAmt = parseFloat(((i.qty * i.price) - (i.discount||0)).toFixed(2));
          const cgst = parseFloat((taxableAmt * (i.gstRate||18)/2/100).toFixed(2));
          return { productId: i.productId._id, description:`${i.productId.name} (${i.productId.sku})`,
            hsnCode: i.hsnCode||'', qty: i.qty, unit: i.productId.unit||'nos',
            unitPrice: i.price, discount: i.discount||0, taxableAmt, gstRate: i.gstRate||18,
            cgst, sgst: cgst, igst: 0, totalAmt: parseFloat((taxableAmt+cgst*2).toFixed(2)) };
        });
        const subtotal   = parseFloat(lineItems.reduce((s,l)=>s+l.taxableAmt,0).toFixed(2));
        const totalCgst  = parseFloat(lineItems.reduce((s,l)=>s+l.cgst,0).toFixed(2));
        const grandTotal = parseFloat((subtotal + totalCgst*2).toFixed(2));
        const invoice = new Invoice({
          orgId: req.user.orgId, type:'Sales', party: party._id, soRef: so._id,
          supplyType, lineItems, subtotal, totalCgst, totalSgst: totalCgst,
          totalIgst:0, totalTax: totalCgst*2, grandTotal, status:'Issued', createdBy: req.user._id,
          dueDate: new Date(Date.now()+(party.creditDays||30)*86400000)
        });
        await invoice.save();
        so.invoiceRef = invoice._id; so.status = 'Invoiced';
        await so.save();
        await LedgerEntry.create({ orgId: req.user.orgId, type:'Receivable', amount: grandTotal, currency:'INR',
          invoiceRef: invoice._id, soRef: so._id, partyRef: party._id,
          description:`Sales Invoice ${invoice.invoiceNo}`, createdBy: req.user._id });
      }
    } catch (invoiceErr) { console.error('Auto-invoice error:', invoiceErr.message); }

    logAction(req.user._id, 'SHIP_SO', 'SalesOrder', so._id, {}, req.user.orgId);
    res.send(so);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

module.exports = { createSO, getSOs, reserveStockForSO, shipSO };
