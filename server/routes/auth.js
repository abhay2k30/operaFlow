const express = require('express');
const { auth } = require('../middleware/auth');
const { registerCompany, login, getMe } = require('../controllers/authController');
const router = express.Router();

// Public: company signup (creates org + admin in one step)
router.post('/register-company', registerCompany);

// Public: login
router.post('/login', login);

// Protected: get current user
router.get('/me', auth, getMe);

module.exports = router;
