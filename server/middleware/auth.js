const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Verifies JWT, attaches decoded payload to req.user
// The payload contains: { _id, role, orgId }
const auth = (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token  = header.replace('Bearer ', '').trim();
    if (!token) throw new Error('No token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fix orgId - extract from stringified JSON or complex objects
    if (decoded.orgId) {
      let orgIdStr = decoded.orgId;

      // If it's already a valid 24-char hex string, use it
      if (typeof orgIdStr === 'string' && /^[a-f0-9]{24}$/i.test(orgIdStr)) {
        // Already valid
      }
      // If it's a string that looks like JSON, parse it
      else if (typeof orgIdStr === 'string' && orgIdStr.startsWith('{')) {
        try {
          const orgObj = JSON.parse(orgIdStr);
          orgIdStr = orgObj._id || orgObj.id || orgObj;
        } catch (e) {}
      }
      // If it's an object, extract _id
      else if (typeof orgIdStr === 'object' && orgIdStr !== null) {
        orgIdStr = orgIdStr._id || orgIdStr.id || '';
      }

      decoded.orgId = orgIdStr;
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

// Role gate
const authorize = (roles = []) => (req, res, next) => {
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = { auth, authorize };
