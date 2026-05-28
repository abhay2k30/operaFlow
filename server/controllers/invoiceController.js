const Invoice = require('../models/Invoice');
const Party = require('../models/Party');
const { logAction } = require('../services/auditService');

// ─── GST helpers ─────────────────────────────────────────────────────────────

function numberToWords(num) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
    'Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);

  let str = '';
  if (Math.floor(num / 10000000) > 0) {
    str += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    str += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    str += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    str += numberToWords(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (str !== '') str += 'and ';
    if (num < 20) {
      str += ones[num];
    } else {
      str += tens[Math.floor(num / 10)];
      if (num % 10 > 0) str += ' ' + ones[num % 10];
    }
  }
  return str.trim();
}

function computeAmountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result   = 'Indian Rupees ' + numberToWords(rupees);
  if (paise > 0) result += ' and ' + numberToWords(paise) + ' Paise';
  return result + ' Only';
}

function computeLineItem(item, supplyType) {
  const taxableAmt = parseFloat(((item.qty * item.unitPrice) - (item.discount || 0)).toFixed(2));
  const gstRate    = item.gstRate || 0;
  let cgst = 0, sgst = 0, igst = 0;

  if (supplyType === 'Inter-State') {
    igst = parseFloat((taxableAmt * gstRate / 100).toFixed(2));
  } else {
    cgst = parseFloat((taxableAmt * (gstRate / 2) / 100).toFixed(2));
    sgst = cgst;
  }

  const totalAmt = parseFloat((taxableAmt + cgst + sgst + igst).toFixed(2));
  return { ...item, taxableAmt, cgst, sgst, igst, totalAmt };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const createInvoice = async (req, res) => {
  try {
    const { supplyType, lineItems: rawItems, ...rest } = req.body;

    const lineItems = rawItems.map(item => computeLineItem(item, supplyType));

    const subtotal      = parseFloat(lineItems.reduce((s, i) => s + i.taxableAmt, 0).toFixed(2));
    const totalDiscount = parseFloat(lineItems.reduce((s, i) => s + (i.discount || 0), 0).toFixed(2));
    const totalCgst     = parseFloat(lineItems.reduce((s, i) => s + i.cgst, 0).toFixed(2));
    const totalSgst     = parseFloat(lineItems.reduce((s, i) => s + i.sgst, 0).toFixed(2));
    const totalIgst     = parseFloat(lineItems.reduce((s, i) => s + i.igst, 0).toFixed(2));
    const totalTax      = parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2));
    const rawTotal      = subtotal + totalTax;
    const roundOff      = parseFloat((Math.round(rawTotal) - rawTotal).toFixed(2));
    const grandTotal    = parseFloat((rawTotal + roundOff).toFixed(2));

    const invoice = new Invoice({
      ...rest,
      orgId: req.user.orgId,
      supplyType,
      lineItems,
      subtotal,
      totalDiscount,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundOff,
      grandTotal,
      amountInWords: computeAmountInWords(grandTotal),
      createdBy: req.user._id
    });

    await invoice.save();
    logAction(req.user._id, 'CREATE_INVOICE', 'Invoice', invoice._id, {
      invoiceNo: invoice.invoiceNo,
      type: invoice.type,
      grandTotal
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { type, status, party, from, to } = req.query;
    const filter = { orgId: req.user.orgId };
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (party)  filter.party  = party;
    if (from || to) {
      filter.invoiceDate = {};
      if (from) filter.invoiceDate.$gte = new Date(from);
      if (to)   filter.invoiceDate.$lte = new Date(to);
    }

    const invoices = await Invoice.find(filter)
      .populate('party', 'name gstin type')
      .populate('soRef', 'createdAt status')
      .populate('poRef', 'createdAt status')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('party')
      .populate('soRef')
      .populate('poRef')
      .populate('lineItems.productId', 'name sku')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateInvoiceStatus = async (req, res) => {
  try {
    const { status, paidAmount } = req.body;
    const update = { status };
    if (paidAmount !== undefined) update.paidAmount = paidAmount;

    const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, update, { new: true });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    logAction(req.user._id, 'UPDATE_INVOICE_STATUS', 'Invoice', invoice._id, { status, paidAmount });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GST summary report for a date range (GSTR-1 style breakdown)
const getGstSummary = async (req, res) => {
  try {
    const { from, to, type = 'Sales' } = req.query;
    const match = { orgId: new (require('mongoose').Types.ObjectId)(req.user.orgId), type, status: { $nin: ['Draft', 'Cancelled'] } };
    if (from || to) {
      match.invoiceDate = {};
      if (from) match.invoiceDate.$gte = new Date(from);
      if (to)   match.invoiceDate.$lte = new Date(to);
    }

    const summary = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$supplyType',
          count:      { $sum: 1 },
          subtotal:   { $sum: '$subtotal' },
          totalCgst:  { $sum: '$totalCgst' },
          totalSgst:  { $sum: '$totalSgst' },
          totalIgst:  { $sum: '$totalIgst' },
          grandTotal: { $sum: '$grandTotal' }
        }
      }
    ]);

    const rateWise = await Invoice.aggregate([
      { $match: match },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id:         '$lineItems.gstRate',
          taxableAmt:  { $sum: '$lineItems.taxableAmt' },
          cgst:        { $sum: '$lineItems.cgst' },
          sgst:        { $sum: '$lineItems.sgst' },
          igst:        { $sum: '$lineItems.igst' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ supplyTypeSummary: summary, rateWiseSummary: rateWise });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate a plain-text invoice representation
// (Use pdfkit if available, otherwise return structured JSON for client-side PDF)
const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('party')
      .populate('lineItems.productId', 'name sku')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Try to use pdfkit if installed, otherwise return JSON for client rendering
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo.replace('/', '-')}.pdf"`);
      doc.pipe(res);

      // ── Header ──
      doc.fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      // Invoice meta
      doc.text(`Invoice No : ${invoice.invoiceNo}`, { continued: true });
      doc.text(`   Date : ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      if (invoice.dueDate) {
        doc.text(`Due Date : ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      }
      doc.moveDown(0.5);

      // Party
      const p = invoice.party;
      doc.font('Helvetica-Bold').text('Bill To:');
      doc.font('Helvetica').text(p.name);
      if (p.address) {
        const addr = [p.address.line1, p.address.city, p.address.state, p.address.pincode].filter(Boolean).join(', ');
        if (addr) doc.text(addr);
      }
      if (p.gstin) doc.text(`GSTIN: ${p.gstin}`);
      doc.moveDown(0.5);

      // Line items table header
      doc.font('Helvetica-Bold');
      const colX = { no: 50, desc: 80, hsn: 240, qty: 300, rate: 345, taxable: 395, gst: 445, total: 500 };
      doc.text('#',           colX.no,   doc.y);
      doc.text('Description', colX.desc, doc.y - 12);
      doc.text('HSN',         colX.hsn,  doc.y - 12);
      doc.text('Qty',         colX.qty,  doc.y - 12);
      doc.text('Rate',        colX.rate, doc.y - 12);
      doc.text('Taxable',     colX.taxable, doc.y - 12);
      doc.text('GST%',        colX.gst,  doc.y - 12);
      doc.text('Total',       colX.total,doc.y - 12);
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // Line items
      doc.font('Helvetica').fontSize(9);
      invoice.lineItems.forEach((item, i) => {
        const y = doc.y;
        doc.text(String(i + 1),         colX.no,   y);
        doc.text(item.description,       colX.desc, y, { width: 155 });
        doc.text(item.hsnCode || '-',    colX.hsn,  y);
        doc.text(`${item.qty} ${item.unit}`, colX.qty, y);
        doc.text(item.unitPrice.toFixed(2), colX.rate, y);
        doc.text(item.taxableAmt.toFixed(2), colX.taxable, y);
        doc.text(`${item.gstRate}%`,     colX.gst,  y);
        doc.text(item.totalAmt.toFixed(2), colX.total, y);
        doc.moveDown(1.2);
      });

      doc.moveTo(50, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // Totals
      doc.font('Helvetica').fontSize(10);
      const totY = doc.y;
      doc.text('Subtotal:',   350, totY);  doc.text(`₹ ${invoice.subtotal.toFixed(2)}`, 480, totY, { align: 'right', width: 70 });
      if (invoice.totalCgst > 0) {
        doc.text('CGST:',     350, doc.y); doc.text(`₹ ${invoice.totalCgst.toFixed(2)}`, 480, doc.y - 12, { align: 'right', width: 70 });
        doc.text('SGST:',     350, doc.y); doc.text(`₹ ${invoice.totalSgst.toFixed(2)}`, 480, doc.y - 12, { align: 'right', width: 70 });
      }
      if (invoice.totalIgst > 0) {
        doc.text('IGST:',     350, doc.y); doc.text(`₹ ${invoice.totalIgst.toFixed(2)}`, 480, doc.y - 12, { align: 'right', width: 70 });
      }
      if (invoice.roundOff !== 0) {
        doc.text('Round Off:', 350, doc.y); doc.text(`₹ ${invoice.roundOff.toFixed(2)}`, 480, doc.y - 12, { align: 'right', width: 70 });
      }
      doc.font('Helvetica-Bold');
      doc.text('Grand Total:', 350, doc.y); doc.text(`₹ ${invoice.grandTotal.toFixed(2)}`, 480, doc.y - 12, { align: 'right', width: 70 });
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9).text(`Amount in Words: ${invoice.amountInWords}`, 50);
      if (invoice.notes) doc.moveDown(0.5).text(`Notes: ${invoice.notes}`);

      doc.end();
    } catch (pdfErr) {
      // pdfkit not installed — return JSON for client-side rendering
      res.json({ invoice, message: 'pdfkit not installed; use this JSON to render on client' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoiceStatus,
  getGstSummary,
  downloadInvoicePdf
};
