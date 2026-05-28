const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/invoiceController');
const router = express.Router();

router.post('/',   auth, authorize(['Admin', 'Finance', 'Sales']), c.createInvoice);
router.get('/',    auth, c.getInvoices);
router.get('/gst-summary', auth, authorize(['Admin', 'Finance']), c.getGstSummary);
router.get('/:id', auth, c.getInvoice);
router.patch('/:id/status', auth, authorize(['Admin', 'Finance']), c.updateInvoiceStatus);
router.get('/:id/pdf', auth, c.downloadInvoicePdf);

module.exports = router;
