const express = require('express');
const {
  getMyDeliveries,
  updateDeliveryStatus,
  addDeliveryEvidence,
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// Get all deliveries for the current repartidor
router.get('/my', getMyDeliveries);

// Update delivery status
router.put('/:deliveryId/status', updateDeliveryStatus);

// Add delivery evidence
router.post('/:deliveryId/evidence', addDeliveryEvidence);

module.exports = router;
