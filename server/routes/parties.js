const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/partyController');
const router = express.Router();

router.post('/',   auth, authorize(['Admin', 'Procurement', 'Sales']), c.createParty);
router.get('/',    auth, c.getParties);
router.get('/:id', auth, c.getParty);
router.put('/:id', auth, authorize(['Admin', 'Procurement', 'Sales']), c.updateParty);
router.delete('/:id', auth, authorize(['Admin']), c.deleteParty);
router.get('/:id/statement', auth, c.getPartyStatement);

module.exports = router;
