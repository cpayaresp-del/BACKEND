const DeliveryAssignment = require('../models/delivery');
const Order = require('../models/order');
const admin = require('../config/firebase');
const getMyDeliveries = async (req, res) => {
  try {
    const deliveries = await DeliveryAssignment.find({
      repartidorId: req.user._id,
    })
      .populate('orderId')
      .sort({ assignedAt: -1 });

    const formattedDeliveries = deliveries.map(delivery => ({
      _id: delivery._id,
      id: delivery._id,
      orderId: delivery.orderId?._id || delivery.orderId,
      repartidorId: delivery.repartidorId,
      repartidorName: delivery.repartidorName,
      customerName: delivery.customerName,
      customerPhone: delivery.customerPhone,
      customerAddress: delivery.customerAddress,
      items: delivery.items,
      total: delivery.total,
      status: delivery.status,
      assignedAt: delivery.assignedAt,
      inTransitAt: delivery.inTransitAt,
      deliveredAt: delivery.deliveredAt,
      evidenceImages: delivery.evidenceImages,
    }));

    res.json({ deliveries: formattedDeliveries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { deliveryId } = req.params;

    const delivery = await DeliveryAssignment.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Verify that the user is the assigned repartidor
    if (delivery.repartidorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    delivery.status = status;

    if (status === 'in_transit') {
      delivery.inTransitAt = new Date();
    } else if (status === 'delivered') {
      delivery.deliveredAt = new Date();
      // Also update the order status to delivered
      await Order.findByIdAndUpdate(delivery.orderId, { status: 'delivered' });
    }

    await delivery.save();

    // Emitir evento si entregado
    if (status === 'delivered') {
      const io = req.app.get('io');
      io.to('bodega').emit('pedido_entregado', { delivery });
    }

    res.json({
      _id: delivery._id,
      id: delivery._id,
      orderId: delivery.orderId,
      repartidorId: delivery.repartidorId,
      repartidorName: delivery.repartidorName,
      customerName: delivery.customerName,
      customerPhone: delivery.customerPhone,
      customerAddress: delivery.customerAddress,
      items: delivery.items,
      total: delivery.total,
      status: delivery.status,
      assignedAt: delivery.assignedAt,
      inTransitAt: delivery.inTransitAt,
      deliveredAt: delivery.deliveredAt,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const addDeliveryEvidence = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { evidenceUrls } = req.body; // Array of ImageKit URLs

    const delivery = await DeliveryAssignment.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Verify that the user is the assigned repartidor
    if (delivery.repartidorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
      return res.status(400).json({ message: 'Evidence URLs must be a non-empty array' });
    }

    // Add all evidence URLs to delivery
    for (const url of evidenceUrls) {
      if (url && url.trim()) {
        delivery.evidenceImages.push({
          url: url.trim(),
          uploadedAt: new Date(),
        });
      }
    }

    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();

    // Update order status
    await Order.findByIdAndUpdate(delivery.orderId, { status: 'delivered' });

    await delivery.save();

    // Emitir evento de pedido entregado a bodega
    const io = req.app.get('io');
    io.to('bodega').emit('pedido_entregado', { delivery });

    res.json({
      message: 'Evidence added successfully',
      delivery: {
        _id: delivery._id,
        id: delivery._id,
        status: delivery.status,
        deliveredAt: delivery.deliveredAt,
        evidenceImages: delivery.evidenceImages,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMyDeliveries,
  updateDeliveryStatus,
  addDeliveryEvidence,
};
