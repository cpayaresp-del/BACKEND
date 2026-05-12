const express = require('express');
const {
  createPreference,
  handleWebhook,
  getPaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/webhook', handleWebhook);
router.post('/preference', protect, createPreference);
router.get('/status/:orderId', protect, getPaymentStatus);

module.exports = router;
