const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    comment: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false, // Opcional
    },
  },
  { timestamps: true }
);

// Índice único para evitar múltiples reseñas por usuario y producto
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);