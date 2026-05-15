const express = require('express');
const { createSearchQuery, getSearchQueries } = require('../controllers/searchController');
const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', createSearchQuery);
router.get('/', protect, authorize('admin'), getSearchQueries);

module.exports = router;