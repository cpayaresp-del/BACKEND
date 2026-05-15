const SearchQuery = require('../models/searchQuery');

const createSearchQuery = async (req, res) => {
  try {
    const { query, category } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ message: 'La búsqueda debe contener al menos 2 caracteres' });
    }

    await SearchQuery.create({
      query: query.trim(),
      category: category ? String(category).trim() : '',
      user: req.user ? req.user._id : null,
    });

    res.status(201).json({ message: 'Búsqueda guardada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSearchQueries = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);

    const queries = await SearchQuery.aggregate([
      {
        $group: {
          _id: {
            query: '$query',
            category: '$category',
          },
          count: { $sum: 1 },
          latest: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1, latest: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          query: '$_id.query',
          category: '$_id.category',
          count: 1,
          latest: 1,
        },
      },
    ]);

    res.json({ queries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSearchQuery, getSearchQueries };