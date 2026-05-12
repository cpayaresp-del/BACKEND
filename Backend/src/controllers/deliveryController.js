const DeliveryAssignment = require('../models/delivery');
const Order = require('../models/order');
const admin = require('../config/firebase');
let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
  // Configurar Cloudinary
  if (process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  }
} catch (e) {
  console.log('Cloudinary not available');
}
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
    const { evidence } = req.body; // Array of base64 images

    const delivery = await DeliveryAssignment.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Verify that the user is the assigned repartidor
    if (delivery.repartidorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(evidence) || evidence.length === 0) {
      return res.status(400).json({ message: 'Evidence must be a non-empty array' });
    }

    // Upload images to Cloudinary if configured
    for (const base64Img of evidence) {
      try {
        if (cloudinary && cloudinary.config().api_key) {
          // Upload to Cloudinary
          const uploadResponse = await cloudinary.uploader.upload(base64Img, {
            folder: 'daylishop/delivery-evidence',
            resource_type: 'auto',
          });
          delivery.evidenceImages.push({
            url: uploadResponse.secure_url,
            uploadedAt: new Date(),
          });
        } else {
          // Fallback: store base64 (not recommended for production)
          console.warn('⚠️ Cloudinary not configured, storing evidence as base64');
          delivery.evidenceImages.push({
            url: base64Img,
            uploadedAt: new Date(),
          });
        }
      } catch (uploadError) {
        console.error('Error uploading evidence image:', uploadError);
        // Continue with next image but log error
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
