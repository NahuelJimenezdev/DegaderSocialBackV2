const { Router } = require('express');
const postController = require('../controllers/post.controller');
const { verifyToken } = require('../middlewares/auth');
const { validatePost } = require('../middlewares/validators');
const { uploadPostImages } = require('../middlewares/upload');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.post('/', validatePost, uploadPostImages, postController.create);
router.get('/feed', postController.getFeed);
router.get('/user/:userId', postController.getUserPosts);
router.get('/:id', postController.getById);
router.post('/:id/like', postController.toggleLike);
router.post('/:id/comment', postController.addComment);
router.post('/:id/share', postController.share);
router.delete('/:id', postController.delete);

module.exports = router;
