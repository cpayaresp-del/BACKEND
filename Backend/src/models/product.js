const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryConfig',
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryConfig',
      default: null,
    },
    subcategoryName: {
      type: String,
      trim: true,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    availableSizes: [
      {
        type: String,
        trim: true,
      },
    ],
    colorVariants: [
      {
        name: {
          type: String,
          trim: true,
          required: true,
        },
        price: {
          type: Number,
          min: 0,
          default: null,
        },
      },
    ],
    discountPercent: {
      type: Number,
      min: 1,
      max: 100,
      default: null,
    },
    discountEndDate: {
      type: Date,
      default: null,
    },
    rootCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryConfig',
      required: true,
      description: 'La categoría principal (sin padre). Se usa para separar productos por "carpeta" principal.',
    },
  },
  { timestamps: true }
);

// Índice compuesto para buscar productos por categoría principal y estado activo
productSchema.index({ rootCategory: 1, isActive: 1 });
// Índice para buscar productos por categoría principal y subcategoría
productSchema.index({ rootCategory: 1, category: 1, subcategory: 1 });
// Índice para búsqueda de productos con nombre dentro de una categoría
productSchema.index({ rootCategory: 1, name: 'text', isActive: 1 });

module.exports = mongoose.model('Product', productSchema);

