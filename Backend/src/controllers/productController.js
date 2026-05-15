const Product = require('../models/product');
const User = require('../models/user');
const CategoryConfig = require('../models/categoryConfig');
const admin = require('../config/firebase');
const aiService = require('../services/aiService');

// Función helper para obtener la categoría raíz (principal/padre más arriba en la jerarquía)
const getRootCategory = async (categoryId) => {
  let category = await CategoryConfig.findById(categoryId);
  while (category && category.parentCategory) {
    category = await CategoryConfig.findById(category.parentCategory);
  }
  return category ? category._id : categoryId;
};

const normalizeColorVariants = (colorVariants) => {
  if (!Array.isArray(colorVariants)) return [];
  return colorVariants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const name = String(variant.name || '').trim();
      if (!name) return null;
      const price = variant.price != null && variant.price !== ''
        ? Number(variant.price)
        : null;
      const images = Array.isArray(variant.images)
        ? variant.images
            .filter((img) => typeof img === 'string' && img.trim().length > 0)
            .map((img) => img.trim())
        : [];
      return { name, price, images };
    })
    .filter((variant) => variant !== null);
};

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

const formatProductForResponse = (product) => {
  const obj = product.toObject();
  return {
    ...obj,
    category: obj.categoryName || (product.category?.name ?? ''),
    categoryId:
      obj.category?.toString?.() ||
      (product.category?._id?.toString?.() ?? null) ||
      null,
    subcategory: obj.subcategoryName || (product.subcategory?.name ?? ''),
    subcategoryId:
      obj.subcategory?.toString?.() ||
      (product.subcategory?._id?.toString?.() ?? null) ||
      null,
  };
};

const generateDescriptionWithAI = async (data) => {
  try {
    const description = await aiService.generateProductDescription(data);
    return description || `Producto ${data.name} listo para agregar a tu tienda.`;
  } catch (error) {
    console.error('Error generando descripción AI:', error);
    return `Producto ${data.name} en la categoría ${data.categoryName}.`;
  }
};

const getProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;
    const query = { isActive: true };

    let categoryFilters = null;
    let searchFilters = null;

    if (category) {
      const categoryIds = category
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0);

      if (categoryIds.length > 0) {
        // Buscar productos que tengan la categoría en: rootCategory, category, o subcategory
        // Esto permite filtrar tanto categorías principales como subcategorías
        categoryFilters = [
          { rootCategory: { $in: categoryIds } },
          { category: { $in: categoryIds } },
          { subcategory: { $in: categoryIds } },
        ];
      }
    }

    if (search) {
      searchFilters = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { categoryName: { $regex: search, $options: 'i' } },
        { subcategoryName: { $regex: search, $options: 'i' } },
      ];
    }

    if (categoryFilters && searchFilters) {
      query.$and = [
        { $or: categoryFilters },
        { $or: searchFilters },
      ];
    } else if (categoryFilters) {
      query.$or = categoryFilters;
    } else if (searchFilters) {
      query.$or = searchFilters;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .collation({ locale: 'es', strength: 1 })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .populate('category', 'name')
        .populate('subcategory', 'name'),
      Product.countDocuments(query).collation({ locale: 'es', strength: 1 }),
    ]);

    const formattedProducts = products.map(formatProductForResponse);

    res.json({ products: formattedProducts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name');
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product: formatProductForResponse(product) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { images, availableSizes, discountDurationDays, category, subcategory, colorVariants, ...productData } = req.body;

    if (!category) {
      return res.status(400).json({ message: 'La categoría es requerida' });
    }

    const categoryConfig = await CategoryConfig.findById(category);
    if (!categoryConfig) {
      return res.status(400).json({ message: 'Categoría no encontrada' });
    }

    // Calcular rootCategory (la categoría principal sin padre)
    const rootCategory = await getRootCategory(category);

    let subcategoryConfig = null;
    if (subcategory) {
      subcategoryConfig = await CategoryConfig.findById(subcategory);
      if (!subcategoryConfig) {
        return res.status(400).json({ message: 'Subcategoría no encontrada' });
      }
      if (!subcategoryConfig.parentCategory || subcategoryConfig.parentCategory.toString() !== categoryConfig._id.toString()) {
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría seleccionada' });
      }
    }

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

    const normalizedVariants = normalizeColorVariants(colorVariants);
    const sizes = Array.isArray(availableSizes) ? availableSizes : [];

    if (!productData.description || !productData.description.trim()) {
      productData.description = await generateDescriptionWithAI({
        name: productData.name,
        categoryName: categoryConfig.name,
        subcategoryName: subcategoryConfig ? subcategoryConfig.name : '',
        availableSizes: sizes,
        colorVariants: normalizedVariants,
        discountPercent: productData.discountPercent,
      });
    }

    const product = await Product.create({
      ...productData,
      category: categoryConfig._id,
      categoryName: categoryConfig.name,
      subcategory: subcategoryConfig?._id ?? null,
      subcategoryName: subcategoryConfig ? subcategoryConfig.name : '',
      rootCategory: rootCategory,
      images: Array.isArray(images) ? images : [],
      availableSizes: sizes,
      colorVariants: normalizedVariants,
    });

    if (productData.discountPercent && productData.discountPercent > 0) {
      await _sendDiscountNotification(product);
    }

    res.status(201).json({ product: formatProductForResponse(product) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { images, availableSizes, discountDurationDays, category, subcategory, colorVariants, ...updateData } = req.body;

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

    const previousProduct = await Product.findById(req.params.id);
    if (!previousProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const normalizedVariants = colorVariants !== undefined ? normalizeColorVariants(colorVariants) : previousProduct.colorVariants;
    const sizes = availableSizes !== undefined
      ? (Array.isArray(availableSizes) ? availableSizes : previousProduct.availableSizes)
      : previousProduct.availableSizes;

    const updatePayload = {
      ...updateData,
      availableSizes: sizes,
      colorVariants: normalizedVariants,
    };

    const categoryId = category || previousProduct.category;
    const categoryConfig = await CategoryConfig.findById(categoryId);
    if (!categoryConfig) {
      return res.status(400).json({ message: 'Categoría no encontrada' });
    }
    updatePayload.category = categoryConfig._id;
    updatePayload.categoryName = categoryConfig.name;
    
    // Calcular rootCategory (la categoría principal sin padre)
    const rootCategory = await getRootCategory(categoryId);
    updatePayload.rootCategory = rootCategory;

    let subcategoryConfig = null;
    if (subcategory) {
      subcategoryConfig = await CategoryConfig.findById(subcategory);
      if (!subcategoryConfig) {
        return res.status(400).json({ message: 'Subcategoría no encontrada' });
      }
      if (!subcategoryConfig.parentCategory || subcategoryConfig.parentCategory.toString() !== categoryConfig._id.toString()) {
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría seleccionada' });
      }
      updatePayload.subcategory = subcategoryConfig._id;
      updatePayload.subcategoryName = subcategoryConfig.name;
    } else if (subcategory === null || subcategory === undefined) {
      updatePayload.subcategory = previousProduct.subcategory;
      updatePayload.subcategoryName = previousProduct.subcategoryName;
    }

    if (images !== undefined) {
      updatePayload.images = Array.isArray(images) ? images : [];
    }

    if (!updatePayload.description || !updatePayload.description.trim()) {
      const finalName = updatePayload.name || previousProduct.name;
      const finalCategoryName = categoryConfig.name;
      const finalSubcategoryName = subcategoryConfig
        ? subcategoryConfig.name
        : previousProduct.subcategoryName || '';
      updatePayload.description = await generateDescriptionWithAI({
        name: finalName,
        categoryName: finalCategoryName,
        subcategoryName: finalSubcategoryName,
        availableSizes: updatePayload.availableSizes,
        colorVariants: updatePayload.colorVariants,
        discountPercent: updatePayload.discountPercent || previousProduct.discountPercent,
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('subcategory', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const previousDiscount = previousProduct.discountPercent || 0;
    const currentDiscount = product.discountPercent || 0;
    
    if (currentDiscount > previousDiscount && currentDiscount > 0) {
      console.log(`Enviando notificación de descuento para ${product.name}`);
      await _sendDiscountNotification(product);
    }

    res.json({ product: formatProductForResponse(product) });
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

const generateProductDescription = async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      availableSizes,
      colorVariants,
      discountPercent,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Nombre y categoría son requeridos para generar la descripción' });
    }

    const categoryConfig = await CategoryConfig.findById(category);
    if (!categoryConfig) {
      return res.status(400).json({ message: 'Categoría no encontrada' });
    }

    let subcategoryName = '';
    if (subcategory) {
      const subcategoryConfig = await CategoryConfig.findById(subcategory);
      if (subcategoryConfig) {
        subcategoryName = subcategoryConfig.name;
      }
    }

    const description = await generateDescriptionWithAI({
      name,
      categoryName: categoryConfig.name,
      subcategoryName,
      availableSizes: Array.isArray(availableSizes) ? availableSizes : [],
      colorVariants: Array.isArray(colorVariants) ? normalizeColorVariants(colorVariants) : [],
      discountPercent,
    });

    res.json({ description });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSimilarProducts = async (req, res) => {
  try {
    const { limit = 4 } = req.query;
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let query = {
      isActive: true,
      _id: { $ne: product._id },
      rootCategory: product.rootCategory,
    };

    if (product.subcategory) {
      query.subcategory = product.subcategory;
    } else {
      query.category = product.category;
    }

    let similar = await Product.find(query)
      .limit(Number(limit))
      .populate('category', 'name')
      .populate('subcategory', 'name');

    if (similar.length === 0) {
      similar = await Product.find({
        isActive: true,
        _id: { $ne: product._id },
        rootCategory: product.rootCategory,
      })
        .limit(Number(limit))
        .populate('category', 'name')
        .populate('subcategory', 'name');
    }

    res.json({ products: similar.map(formatProductForResponse) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getSimilarProducts, generateProductDescription };
