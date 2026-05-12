const express = require('express');

const {
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');

const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', getCategories);

router.get('/admin', protect, authorize('admin'), getAllCategories);

router.post('/', protect, authorize('admin'), createCategory);
router.post('/reorder', protect, authorize('admin'), reorderCategories);

router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
