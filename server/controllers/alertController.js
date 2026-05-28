const Alert = require('../models/Alert');

exports.getAlerts = async (req, res) => {
  try {
    const { status, severity } = req.query;
    const filter = { orgId: req.user.orgId };
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(alerts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId }, { status: 'Read' }, { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markAsResolved = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId }, { status: 'Resolved' }, { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ orgId: req.user.orgId, status: 'Unread' });
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
