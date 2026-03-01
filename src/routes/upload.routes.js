const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { uploadOptimized } = require('../middleware/upload.middleware');
const { uploadOptimizedImage } = require('../controllers/uploadController');
const { handleUploadError } = require('../middleware/upload.middleware');

// POST /api/upload/optimized
router.post(
    '/optimized',
    verifyToken,
    uploadOptimized,
    handleUploadError,
    uploadOptimizedImage
);

module.exports = router;
