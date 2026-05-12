const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryConfig',
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
    path: {
      type: String,
      default: '',
    },
    carouselImages: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound unique index on name and parentCategory
categorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

module.exports = mongoose.model('CategoryConfig', categorySchema);
