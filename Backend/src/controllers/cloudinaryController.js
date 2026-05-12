const imagekit = require('../config/imagekit');

const uploadImages = async (req, res) => {

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      const result = await imagekit.upload({
        file: file.buffer, // Buffer
        fileName: file.originalname,
        folder: '/ecommerce/products',
      });

      uploadedUrls.push(result.url);
    }

    return res.status(200).json({
      urls: uploadedUrls,
      success: true
    });

  } catch (error) {
    console.log("UPLOAD ERROR:", error);

    return res.status(500).json({
      message: error.message,
      success: false
    });
  }
};

module.exports = { uploadImages };