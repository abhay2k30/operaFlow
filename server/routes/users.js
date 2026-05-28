const express  = require('express');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const router   = express.Router();

// List all users in THIS org only
router.get('/', auth, authorize(['Admin']), async (req, res) => {
  try {
    const users = await User.find({ orgId: req.user.orgId })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a user in THIS org (Admin only)
router.post('/', auth, authorize(['Admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      orgId: req.user.orgId,   // always same org as Admin
      name, email: email.toLowerCase(), passwordHash, role
    });
    const u = user.toObject(); delete u.passwordHash;
    res.status(201).json(u);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Update a user (must be in same org)
router.put('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    const { name, email, role, password, isActive } = req.body;
    const updates = {};
    if (name)     updates.name     = name;
    if (email)    updates.email    = email.toLowerCase();
    if (role)     updates.role     = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password?.trim()) updates.passwordHash = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      updates, { new: true, runValidators: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Deactivate user (soft delete — can't hard delete yourself)
router.delete('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    if (req.user._id === req.params.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { isActive: false }, { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated', user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
