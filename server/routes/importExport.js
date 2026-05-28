const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { auth, authorize } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// Import Products (CSV)
router.post('/products', auth, authorize(['Admin', 'InventoryManager']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        // Expected CSV headers: name, sku, unit, category, reorderLevel, description, price
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const row of results) {
          try {
            // Basic validation
            if (!row.name || !row.sku || !row.unit || !row.category) {
              throw new Error(`Missing required fields for SKU: ${row.sku || 'Unknown'}`);
            }

            // Check if product exists
            let product = await Product.findOne({ sku: row.sku });
            if (product) {
              // Update existing
              product.name = row.name;
              product.unit = row.unit;
              product.category = row.category;
              product.reorderLevel = row.reorderLevel ? parseInt(row.reorderLevel) : product.reorderLevel;
              product.description = row.description || product.description;
              product.price = row.price ? parseFloat(row.price) : product.price;
              await product.save();
            } else {
              // Create new
              product = new Product({
                name: row.name,
                sku: row.sku,
                unit: row.unit,
                category: row.category,
                reorderLevel: row.reorderLevel ? parseInt(row.reorderLevel) : 10,
                description: row.description,
                price: row.price ? parseFloat(row.price) : 0
              });
              await product.save();
            }
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push({ sku: row.sku, error: err.message });
          }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          message: 'Import processing complete',
          successCount,
          errorCount,
          errors
        });
      } catch (error) {
        console.error('Import error:', error);
        res.status(500).send('Error processing CSV file');
      }
    });
});

// Export Products (CSV)
router.get('/products', auth, async (req, res) => {
  try {
    const products = await Product.find().lean();
    
    const fields = ['name', 'sku', 'unit', 'category', 'reorderLevel', 'description', 'price'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csvData = parser.parse(products);

    res.header('Content-Type', 'text/csv');
    res.attachment('products.csv');
    return res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Error exporting products');
  }
});

// Export Stock (CSV)
router.get('/stock', auth, async (req, res) => {
  try {
    const batches = await Batch.aggregate([
      { $match: { qty: { $gt: 0 } } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location'
        }
      },
      { $unwind: '$location' },
      {
        $project: {
          sku: '$product.sku',
          productName: '$product.name',
          location: '$location.name',
          batchNo: '$batchNo',
          qty: '$qty',
          expiryDate: { $dateToString: { format: "%Y-%m-%d", date: "$expiryDate" } }
        }
      }
    ]);

    const fields = ['sku', 'productName', 'location', 'batchNo', 'qty', 'expiryDate'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csvData = parser.parse(batches);

    res.header('Content-Type', 'text/csv');
    res.attachment('stock_levels.csv');
    return res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Error exporting stock');
  }
});

module.exports = router;
