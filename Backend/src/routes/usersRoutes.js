const express = require('express');
const { createUser, getUsers, updateUser, deleteUser } = require('../controllers/usersController');
const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.post('/', createUser);
router.get('/', getUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
