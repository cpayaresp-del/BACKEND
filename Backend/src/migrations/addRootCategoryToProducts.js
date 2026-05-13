/**
 * Migración: Agregar rootCategory a todos los productos existentes
 * 
 * Este script actualiza todos los productos en la base de datos para incluir el campo rootCategory,
 * que representa la categoría principal (sin padre) a la que pertenece el producto.
 * 
 * Uso: node migrations/addRootCategoryToProducts.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Importar configuración de BD
const db = require('../src/config/db');
const Product = require('../src/models/product');
const CategoryConfig = require('../src/models/categoryConfig');

// Función para obtener la categoría raíz
const getRootCategory = async (categoryId) => {
  let category = await CategoryConfig.findById(categoryId);
  while (category && category.parentCategory) {
    category = await CategoryConfig.findById(category.parentCategory);
  }
  return category ? category._id : categoryId;
};

// Ejecutar migración
const migrateProducts = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await db.connect();
    console.log('Conectado a la base de datos.');

    console.log('Buscando productos sin rootCategory...');
    const productsWithoutRoot = await Product.find({ $or: [{ rootCategory: null }, { rootCategory: { $exists: false } }] });
    console.log(`Se encontraron ${productsWithoutRoot.length} productos para actualizar.`);

    let updated = 0;
    let errors = 0;

    for (const product of productsWithoutRoot) {
      try {
        const rootCategory = await getRootCategory(product.category);
        await Product.findByIdAndUpdate(product._id, { rootCategory: rootCategory });
        updated++;
        console.log(`[${updated}/${productsWithoutRoot.length}] Producto actualizado: ${product.name}`);
      } catch (err) {
        errors++;
        console.error(`Error actualizando producto ${product._id}:`, err.message);
      }
    }

    console.log(`\n✅ Migración completada: ${updated} productos actualizados, ${errors} errores.`);
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
};

migrateProducts();
