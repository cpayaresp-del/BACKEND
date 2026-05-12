const express = require('express');
const multer = require('multer');
const { uploadImages } = require('../controllers/imagekitController');
const { protect } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.post(
  '/upload',
  protect,
  authorize('admin'),
  upload.any(), // 👈 único cambio
  uploadImages
);

module.exports = router;