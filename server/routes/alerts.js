const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Define alert routes
router.get('/', alertController.getAlerts);
router.patch('/:id/read', alertController.markAsRead);
router.patch('/:id/resolve', alertController.markAsResolved);
router.get('/unread-count', alertController.getUnreadCount);

module.exports = router;
