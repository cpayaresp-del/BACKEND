const Product = require('../models/product');
const User = require('../models/user');
const CategoryConfig = require('../models/categoryConfig');
const admin = require('../config/firebase');

// Función helper para obtener todos los IDs de categorías descendientes
const getDescendantCategoryIds = async (parentId) => {
  const descendants = [];
  const queue = [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await CategoryConfig.find({ parentCategory: currentId }, '_id');
    const childIds = children.map(child => child._id);
    descendants.push(...childIds);
    queue.push(...childIds);
  }

  return descendants;
};

const getProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;
    const query = { isActive: true };

    if (category) {
      // Asumir que category puede ser una lista separada por comas si es jerárquico
      const categories = category
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0);

      if (categories.length > 0) {
        query.$or = [
          { category: { $in: categories } },
          { subcategory: { $in: categories } },
        ];
      } else {
        query.$or = [
          { category: { $in: [''] } },
          { subcategory: { $in: [''] } },
        ];
      }
    }
    if (search) query.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query).collation({ locale: 'es', strength: 1 }).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(query).collation({ locale: 'es', strength: 1 }),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { images, availableSizes, discountDurationDays, ...productData } = req.body;

    // Validar que el descuento esté entre 1% y 100%
    if (productData.discountPercent != null && (productData.discountPercent < 1 || productData.discountPercent > 100)) {
      return res.status(400).json({ message: 'El descuento debe estar entre 1% y 100%' });
    }

    // Calcular la fecha de fin del descuento si se proporciona duración
    if (productData.discountPercent != null && productData.discountPercent > 0 && discountDurationDays && discountDurationDays > 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(discountDurationDays));
      productData.discountEndDate = endDate;
      console.log(`Descuento vigente hasta: ${endDate}`);
    }

    const product = await Product.create({
      ...productData,
      images: Array.isArray(images) ? images : [],
      availableSizes: Array.isArray(availableSizes) ? availableSizes : [],
    });

    
    if (productData.discountPercent && productData.discountPercent > 0) {
      await _sendDiscountNotification(product);
    }

    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { images, availableSizes, discountDurationDays, ...updateData } = req.body;

    // Validar que el descuento esté entre 1% y 100%
    if (updateData.discountPercent != null && (updateData.discountPercent < 1 || updateData.discountPercent > 100)) {
      return res.status(400).json({ message: 'El descuento debe estar entre 1% y 100%' });
    }

    // Calcular la fecha de fin del descuento si se proporciona duración
    if (updateData.discountPercent != null && updateData.discountPercent > 0 && discountDurationDays && discountDurationDays > 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(discountDurationDays));
      updateData.discountEndDate = endDate;
      console.log(`Descuento actualizado, vigente hasta: ${endDate}`);
    }

    // Obtener producto anterior para comparar descuentos
    const previousProduct = await Product.findById(req.params.id);

    const updatePayload = {
      ...updateData,
    };

    if (images !== undefined) {
      updatePayload.images = Array.isArray(images) ? images : [];
    }

    if (availableSizes !== undefined) {
      updatePayload.availableSizes = Array.isArray(availableSizes) ? availableSizes : [];
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Enviar notificación si se agregó o aumentó el descuento
    const previousDiscount = previousProduct?.discountPercent || 0;
    const currentDiscount = product.discountPercent || 0;
    
    if (currentDiscount > previousDiscount && currentDiscount > 0) {
      console.log(`Enviando notificación de descuento para ${product.name}`);
      await _sendDiscountNotification(product);
    }

    res.json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Función auxiliar para enviar notificaciones de descuento
const _sendDiscountNotification = async (product) => {
  try {
    // Si Firebase no está disponible, simplemente retornar
    if (!admin) {
      console.warn('Firebase no disponible, omitiendo notificación de descuento');
      return;
    }

    const users = await User.find({
      fcmToken: { $exists: true, $ne: null },
      role: { $ne: 'admin' }
    });

    if (users.length === 0) {
      console.log('No hay usuarios para notificar');
      return;
    }

    const title = '¡Producto en Descuento!';
    const body = `${product.name} tiene un descuento del ${product.discountPercent}%`;
    const data = {
      type: 'discount',
      productId: product._id.toString(),
      productName: product.name,
      discountPercent: String(product.discountPercent),
      discountEndDate: product.discountEndDate ? product.discountEndDate.toISOString() : '',
    };

    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          data,
          token: user.fcmToken,
        };

        await admin.messaging().send(message);
        sentCount++;
      } catch (error) {
        console.error(`Error enviando notificación a ${user.email}:`, error);
        if (error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/invalid-argument') {
          await User.findByIdAndUpdate(user._id, { fcmToken: null });
          console.log(`Token inválido removido para ${user.email}`);
        }
        failedCount++;
      }
    }

    console.log(`Notificaciones enviadas: ${sentCount}/${users.length} (${failedCount} fallidas)`);
  } catch (error) {
    console.error('Error en _sendDiscountNotification:', error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
