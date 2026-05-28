const { getPendingActions } = require('../services/pendingActionsService');

const getPendingActionsHandler = async (req, res) => {
  try {
    const actions = await getPendingActions(req.user.orgId, req.user.role);
    res.send(actions);
  } catch (e) { res.status(500).send({ error: e.message }); }
};

module.exports = { getPendingActions: getPendingActionsHandler };
