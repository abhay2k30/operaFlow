const AuditLog = require('../models/AuditLog');

const logAction = async (userId, action, resourceType, resourceId, details = {}, orgId) => {
  try {
    await AuditLog.create({ orgId, userId, action, resourceType, resourceId, details });
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
};

module.exports = { logAction };
