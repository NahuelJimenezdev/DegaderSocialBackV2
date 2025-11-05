const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadPostImage, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Middleware condicional: usa multer solo si es multipart/form-data
const conditionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Si es FormData, usar multer
    uploadPostImage(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  } else {
    // Si es JSON, pasar directo
    next();
  }
};

// Rutas de publicaciones
router.post('/', conditionalUpload, postController.createPost);
router.get('/feed', postController.getFeed);
router.get('/user/:userId', postController.getUserPosts);
router.get('/:id', postController.getPostById);
router.delete('/:id', postController.deletePost);

// Interacciones con publicaciones
router.post('/:id/like', postController.toggleLike);
router.post('/:id/comment', postController.addComment);
router.post('/:id/share', postController.sharePost);

module.exports = router;
