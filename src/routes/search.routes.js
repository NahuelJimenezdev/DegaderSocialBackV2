const { Router } = require('express');
const searchController = require('../controllers/search.controller');
const { verifyToken } = require('../middlewares/auth');

const router = Router();

// Requiere autenticación
router.use(verifyToken);

router.get('/', searchController.search);

module.exports = router;
