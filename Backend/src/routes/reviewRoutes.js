const express = require('express');
const {
  createReview,
  getReviewsForProduct,
  canReviewProduct,
  getUserReviews,
} = require('../controllers/reviewController');

const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas
router.get('/:productId', getReviewsForProduct);

// Rutas protegidas
router.get('/can-review/:productId', protect, canReviewProduct);
router.post('/', protect, createReview);
router.get('/', protect, getUserReviews);

module.exports = router;
