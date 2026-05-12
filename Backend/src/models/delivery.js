const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    repartidorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    repartidorName: {
      type: String,
      default: '',
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: '',
    },
    customerAddress: {
      type: String,
      required: true,
    },
    items: [
      {
        productId: String,
        productName: String,
        productImage: String,
        quantity: Number,
        price: Number,
        size: String,
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['assigned', 'in_transit', 'delivered'],
      default: 'assigned',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    inTransitAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    evidenceImages: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
