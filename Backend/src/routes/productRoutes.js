const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware'); // ✅ CORREGIDO

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProduct);

router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
