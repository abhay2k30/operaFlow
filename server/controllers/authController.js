const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Organization = require('../models/Organization');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeToken(user) {
  return jwt.sign(
    { _id: user._id.toString(), role: user.role, orgId: user.orgId._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.passwordHash;
  return u;
}

// ── POST /api/auth/register-company ──────────────────────────────────────────
// Creates an Organization + its first Admin user atomically.
// This is the ONLY public signup — individual users are created by the Admin.
const registerCompany = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      // Company details
      companyName, gstin, companyPhone, companyEmail,
      city, state, pincode, line1,
      // Admin user details
      adminName, adminEmail, adminPassword
    } = req.body;

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Company name, admin name, email and password are required' });
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check admin email not already taken
    const existing = await User.findOne({ email: adminEmail.toLowerCase() }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Generate a URL-safe slug from the company name
    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const count    = await Organization.countDocuments({ slug: new RegExp(`^${baseSlug}`) }).session(session);
    const slug     = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    // Create org
    const [org] = await Organization.create([{
      name: companyName.trim(),
      slug,
      gstin:   gstin?.toUpperCase()   || undefined,
      phone:   companyPhone           || undefined,
      email:   companyEmail?.toLowerCase() || undefined,
      address: { line1, city, state, pincode },
    }], { session });

    // Create Admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const [user] = await User.create([{
      orgId:        org._id,
      name:         adminName.trim(),
      email:        adminEmail.toLowerCase().trim(),
      passwordHash,
      role:         'Admin',
    }], { session });

    await session.commitTransaction();

    const token = makeToken(user);
    res.status(201).json({
      token,
      user:         safeUser(user),
      organization: org,
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase()?.trim() }).populate('orgId');

    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!user.orgId?.isActive) {
      return res.status(403).json({ message: 'Your organisation account is inactive. Contact your Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = makeToken(user);
    res.json({
      token,
      user:         safeUser(user),
      organization: user.orgId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('orgId', 'name slug gstin plan trialEndsAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerCompany, login, getMe };
