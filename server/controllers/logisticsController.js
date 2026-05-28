const Shipment = require('../models/Shipment');
const generateTrackingId = () => 'TRK-' + Math.random().toString(36).substr(2, 9).toUpperCase();

const createShipment = async (req, res) => {
  try {
    const { origin, destination, weight, expectedDeliveryDate, items, type, soRef, poRef, carrier } = req.body;
    const shipment = new Shipment({
      orgId: req.user.orgId,
      trackingId: generateTrackingId(),
      type: type || 'Outbound',
      origin, destination, weight, expectedDeliveryDate,
      items: items || [], soRef, poRef, carrier,
      status: 'Draft',
      timeline: [{ status: 'Draft', note: 'Shipment created' }]
    });
    await shipment.save();
    res.status(201).send(shipment);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({ orgId: req.user.orgId })
      .populate('items.productId', 'name sku unit')
      .populate('soRef', 'status')
      .populate('poRef', 'status')
      .sort({ createdAt: -1 });
    res.send(shipments);
  } catch (e) { res.status(500).send(e); }
};

const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const shipment = await Shipment.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!shipment) return res.status(404).send({ error: 'Shipment not found' });
    shipment.status = status;
    shipment.timeline.push({ status, note: note || `Status updated to ${status}` });
    await shipment.save();
    res.send(shipment);
  } catch (e) { res.status(400).send(e); }
};

const assignCarrier = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!shipment) return res.status(404).send({ error: 'Shipment not found' });
    shipment.carrier = req.body;
    await shipment.save();
    res.send(shipment);
  } catch (e) { res.status(400).send(e); }
};

const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!shipment) return res.status(404).send({ error: 'Shipment not found' });
    if (shipment.status !== 'Draft') {
      return res.status(400).send({ error: 'Only draft shipments can be deleted' });
    }
    await Shipment.deleteOne({ _id: req.params.id });
    res.send({ message: 'Shipment deleted' });
  } catch (e) { res.status(400).send(e); }
};

const rejectShipment = async (req, res) => {
  try {
    const { reason } = req.body;
    const shipment = await Shipment.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!shipment) return res.status(404).send({ error: 'Shipment not found' });
    shipment.status = 'Rejected';
    shipment.rejectionReason = reason;
    shipment.timeline.push({ status: 'Rejected', note: reason || 'Shipment rejected' });
    await shipment.save();
    res.send(shipment);
  } catch (e) { res.status(400).send(e); }
};

module.exports = { createShipment, getShipments, updateStatus, assignCarrier, deleteShipment, rejectShipment };
