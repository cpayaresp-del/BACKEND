const CategoryConfig = require('../models/categoryConfig');

const calculateLevel = async (parentId) => {
  if (!parentId) return 0;
  const parent = await CategoryConfig.findById(parentId);
  if (!parent) return 0;
  const parentLevel = parent.level || 0;
  return parentLevel + 1;
};

const buildPath = async (name, parentId) => {
  if (!parentId) return `/${name}`;
  const parent = await CategoryConfig.findById(parentId);
  if (!parent) return `/${name}`;
  return `${parent.path}/${name}`;
};

const getCategories = async (req, res) => {
  try {
    const categories = await CategoryConfig.find({ isVisible: true })
      .sort({ order: 1 })
      .populate('parentCategory', 'name');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await CategoryConfig.find()
      .sort({ order: 1 })
      .populate('parentCategory', 'name');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, order, isVisible, parentCategory, carouselImages } = req.body;

    const existing = await CategoryConfig.findOne({ 
      name, 
      parentCategory: parentCategory || null 
    });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Si se especifica parentCategory, verificar que existe
    if (parentCategory) {
      const parent = await CategoryConfig.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    const maxOrder = await CategoryConfig.findOne().sort({ order: -1 });
    const nextOrder = order !== undefined ? order : (maxOrder ? maxOrder.order + 1 : 0);

    const level = await calculateLevel(parentCategory);
    const path = await buildPath(name, parentCategory);

    const category = await CategoryConfig.create({
      name,
      order: nextOrder,
      isVisible: isVisible !== undefined ? isVisible : true,
      parentCategory: parentCategory || null,
      level,
      path,
      carouselImages: Array.isArray(carouselImages) ? carouselImages : [],
    });

    res.status(201).json({ category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await CategoryConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await CategoryConfig.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array' });
    }

    const updates = orderedIds.map((id, index) =>
      CategoryConfig.findByIdAndUpdate(id, { order: index }, { new: true })
    );

    await Promise.all(updates);

    const categories = await CategoryConfig.find().sort({ order: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
