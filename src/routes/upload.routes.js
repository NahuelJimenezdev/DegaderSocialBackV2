const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { uploadOptimized } = require('../middleware/upload.middleware');
const { uploadOptimizedImage } = require('../controllers/uploadController');
const { handleUploadError } = require('../middleware/upload.middleware');

// POST /api/upload/optimized
router.post(
    '/optimized',
    authenticate,
    uploadOptimized,
    handleUploadError,
    uploadOptimizedImage
);

module.exports = router;
