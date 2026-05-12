const Review = require('../models/Review');
const Order = require('../models/order');
const Product = require('../models/product');

// @desc    Crear una reseña para un producto
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { productId, comment, rating } = req.body;
    const userId = req.user._id;

    if ((!comment || comment.trim().length === 0) && (rating == null)) {
      return res.status(400).json({ message: 'Debes enviar un comentario o una calificación.' });
    }

    if (rating != null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5.' });
    }

    // Verificar si el usuario ha comprado el producto
    const hasPurchased = await Order.findOne({
      user: userId,
      status: 'delivered',
      'items.product': productId,
    });

    if (!hasPurchased) {
      return res.status(403).json({ message: 'Solo puedes reseñar productos que has comprado' });
    }

    // Verificar si ya existe una reseña del usuario para este producto
    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: 'Ya has reseñado este producto' });
    }

    // Crear la reseña
    const review = await Review.create({
      user: userId,
      product: productId,
      comment,
      rating,
    });

    // Poblar los datos para la respuesta
    await review.populate('user', 'name');
    await review.populate('product', 'name');

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener reseñas de un producto
// @route   GET /api/reviews/:productId
// @access  Public
const getReviewsForProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener reseñas del usuario actual
// @route   GET /api/reviews
// @access  Private
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    const reviews = await Review.find({ user: userId })
      .populate('product', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getReviewsForProduct,
  getUserReviews,
};
