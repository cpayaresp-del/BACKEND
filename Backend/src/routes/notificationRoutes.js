const express = require('express');
const router = express.Router();
const {
  saveFCMToken,
  saveFCMTokenAnonymous,
  sendNotificationToAll,
  sendDiscountNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Guardar FCM token anónimo (SIN autenticación) - Público
router.post('/save-token-anonymous', saveFCMTokenAnonymous);

// Guardar FCM token (autenticado)
router.post('/save-token', protect, saveFCMToken);

// Enviar notificación a todos (solo admin)
router.post(
  '/send-to-all',
  protect,
  roleMiddleware(['admin']),
  sendNotificationToAll
);

// Enviar notificación de descuento (solo admin)
router.post(
  '/send-discount',
  protect,
  roleMiddleware(['admin']),
  sendDiscountNotification
);

module.exports = router;
