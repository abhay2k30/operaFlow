const express = require('express');
const router = express.Router();

// Mock Data
const stockValueData = [
  { location: 'Austin', value: '$1,214,479.00', products: '1234 batches / 319 SKU', validity: 70 },
  { location: 'Phoenix', value: '$1,163,862', products: '1653 batches / 935 SKU', validity: 40 },
];

const stockAgeingData = [
  { name: '0-30 days', value: 0.00 },
  { name: '30-60 days', value: 99.51 },
  { name: '60-90 days', value: 0.00 },
  { name: '90-120 days', value: 0.16 },
  { name: '120-150 days', value: 0.00 },
  { name: '150-180 days', value: 0.01 },
  { name: 'Over 180 days', value: 0.33 },
];

// Get Stock Value
router.get('/value', (req, res) => {
  res.json(stockValueData);
});

// Get Stock Ageing
router.get('/ageing', (req, res) => {
  res.json(stockAgeingData);
});

module.exports = router;
