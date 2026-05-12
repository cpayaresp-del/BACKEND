const express = require('express');

const {
  createOrder,
  getOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  getBodegaOrders,
  assignRepartidor,
  getRepartidores,
} = require('../controllers/orderController');

const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware'); // ✅ CORREGIDO

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/bodega', getBodegaOrders);
router.get('/repartidores', getRepartidores);
router.get('/', getOrders);
router.get('/admin', authorize('admin'), getAllOrders);
router.post('/:orderId/assign', authorize(['admin', 'bodega']), assignRepartidor);

router.get('/:id', getOrder);
router.put('/:id/status', authorize(['admin', 'bodega']), updateOrderStatus);

module.exports = router;
