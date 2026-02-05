const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const onboardingController = require('../controllers/onboarding.controller');

/**
 * @route   GET /api/onboarding
 * @desc    Obtener estado de onboarding del usuario
 * @access  Private
 */
router.get('/', authenticate, onboardingController.getOnboardingStatus);

/**
 * @route   PATCH /api/onboarding
 * @desc    Actualizar progreso de onboarding
 * @access  Private
 */
router.patch('/', authenticate, onboardingController.updateOnboardingProgress);

/**
 * @route   POST /api/onboarding/complete
 * @desc    Marcar onboarding como completado
 * @access  Private
 */
router.post('/complete', authenticate, onboardingController.completeOnboarding);

module.exports = router;
