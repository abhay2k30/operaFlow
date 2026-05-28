const express = require('express');
const { auth } = require('../middleware/auth');
const pendingActionsController = require('../controllers/pendingActionsController');
const router = express.Router();

router.get('/', auth, pendingActionsController.getPendingActions);

module.exports = router;
