const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const DeliveryAssignment = require('../models/delivery');
const User = require('../models/user');

const createOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${item.product.name}`,
        });
      }
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      total: cart.total,
      shippingAddress: req.user.address,
      neighborhood: req.user.neighborhood,
      city: req.user.city,
    });

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.status(201).json({ order });

    // Emitir evento de nuevo pedido a bodega
    const io = req.app.get('io');
    io.to('bodega').emit('nuevo_pedido', { order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('user', 'name phone')
      .populate({
        path: 'items.product',
        select: 'name images price stock'
      })
      .sort({ createdAt: -1 });

    const orderIds = orders.map((order) => order._id);
    const deliveries = await DeliveryAssignment.find({ orderId: { $in: orderIds } });
    const deliveryMap = new Map(
      deliveries.map((delivery) => [delivery.orderId.toString(), delivery])
    );

    const formattedOrders = orders.map((order) => {
      const delivery = deliveryMap.get(order._id.toString());
      return {
        _id: order._id,
        id: order._id,
        userId: order.user?._id?.toString() || order.user?.toString() || '',
        userName: order.user?.name || '',
        userPhone: order.user?.phone || '',
        items: order.items.map((item) => ({
          productId: item.product?._id?.toString() ?? '',
          productName: item.product?.name || item.name || '',
          productImage: (item.product?.images && item.product?.images.length > 0) 
            ? item.product?.images[0] 
            : '',
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.total * 0.9,
        tax: order.total * 0.1,
        total: order.total,
        address: order.shippingAddress || '',
        neighborhood: order.neighborhood || '',
        city: order.city || '',
        paymentMethod: order.paymentId ? 'mercado_pago' : 'cash',
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        repartidorName: delivery?.repartidorName || '',
        evidenceImages: delivery?.evidenceImages?.map((img) => img.url) || [],
      };
    });

    res.json({ orders: formattedOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (status === 'delivered' && req.user.role === 'bodega') {
      return res.status(403).json({
        message:
          'Solo el repartidor puede marcar el pedido como entregado con evidencia.',
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBodegaOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: { $in: ['paid', 'assigned', 'shipped', 'delivered'] } },
        { paymentStatus: { $in: ['approved', 'paid'] } },
      ],
    })
      .populate('user', 'name email phone address neighborhood city')
      .populate({
        path: 'items.product',
        select: 'name images price stock size'
      })
      .sort({ createdAt: -1 });

    const orderIds = orders.map((order) => order._id);
    const deliveries = await DeliveryAssignment.find({ orderId: { $in: orderIds } });
    const deliveryMap = new Map(
      deliveries.map((delivery) => [delivery.orderId.toString(), delivery])
    );

    const formattedOrders = orders.map((order) => {
      const delivery = deliveryMap.get(order._id.toString());
      
      // Usar datos del usuario o de la orden (shippingAddress prioridad)
      const userCity = order.city || order.user?.city || '';
      const userNeighborhood = order.neighborhood || order.user?.neighborhood || '';
      const userAddress = order.shippingAddress || order.user?.address || '';
      
      return {
        _id: order._id,
        id: order._id,
        userName: order.user?.name || '',
        userEmail: order.user?.email || '',
        userPhone: order.user?.phone || '',
        userAddress: userAddress,
        items: order.items.map((item) => ({
          productId: item.product?._id || '',
          productName: item.product?.name || item.name || '',
          productImage: (item.product?.images && item.product?.images.length > 0) 
            ? item.product?.images[0] 
            : '',
          quantity: item.quantity,
          price: item.price,
          size: item.product?.size || '',
        })),
        subtotal: order.total * 0.9,
        tax: order.total * 0.1,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        paymentMethod: order.paymentId ? 'mercado_pago' : 'cash',
        createdAt: order.createdAt,
        shippingAddress: userAddress,
        neighborhood: userNeighborhood,
        city: userCity,
        repartidorId: delivery?.repartidorId || null,
        repartidorName: delivery?.repartidorName || '',
        evidenceImages: delivery?.evidenceImages?.map((img) => img.url) || [],
      };
    });

    res.json({ orders: formattedOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignRepartidor = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { repartidorId } = req.body;

    // Get order with user info and fully populated items
    const order = await Order.findById(orderId)
      .populate('user', 'name phone address neighborhood city')
      .populate({
        path: 'items.product',
        select: 'name images price stock'
      });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get repartidor info
    const repartidor = await User.findById(repartidorId);
    if (!repartidor) {
      return res.status(404).json({ message: 'Repartidor not found' });
    }

    // Update order status to 'shipped' (en camino)
    order.status = 'shipped';
    await order.save();

    // Format items for delivery - ensure images are included
    const items = order.items.map(item => ({
      productId: item.product?._id?.toString() || item.product?.toString() || '',
      productName: item.product?.name || item.name || '',
      productImage: (item.product?.images && item.product?.images.length > 0) 
        ? item.product?.images[0] 
        : '',
      quantity: item.quantity,
      price: item.price,
      size: '',
    }));

    const addressParts = [
      order.shippingAddress || order.user?.address,
      order.neighborhood || order.user?.neighborhood,
      order.city || order.user?.city,
    ]
      .filter(part => part && part.toString().trim() !== '')
      .map(part => part.toString().trim());

    const customerAddress = addressParts.join(', ').trim() ||
      [order.user?.address, order.user?.neighborhood, order.user?.city]
        .filter(part => part && part.toString().trim() !== '')
        .map(part => part.toString().trim())
        .join(', ')
        .trim() ||
      order.shippingAddress ||
      order.user?.address ||
      'Sin dirección';

    // Create delivery assignment
    const delivery = await DeliveryAssignment.create({
      orderId: order._id,
      repartidorId: repartidorId,
      repartidorName: repartidor.name,
      customerName: order.user?.name || '',
      customerPhone: order.user?.phone || '',
      customerAddress,
      items: items,
      total: order.total,
      status: 'assigned',
    });

    res.json({
      message: 'Repartidor assigned successfully',
      order: order,
      delivery: delivery,
    });

    // Emitir evento de pedido asignado al repartidor específico
    const io = req.app.get('io');
    io.to(`repartidor_${repartidorId}`).emit('pedido_asignado', { order, delivery });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getRepartidores = async (req, res) => {
  try {
    const repartidores = await User.find({ role: 'repartidor' })
      .select('_id name email phone')
      .lean();
    
    res.json({ repartidores });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getOrders, getOrder, getAllOrders, updateOrderStatus, getBodegaOrders, assignRepartidor, getRepartidores };
