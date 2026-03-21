const UserV2 = require('../models/User.model');

/**
 * Obtener estado de onboarding del usuario autenticado
 */
exports.getOnboardingStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const user = await UserV2.findById(userId).select('onboarding');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            hasCompleted: user.onboarding?.hasCompleted || false,
            currentStep: user.onboarding?.currentStep || null,
            lastUpdated: user.onboarding?.lastUpdated || null
        });
    } catch (error) {
        console.error('Error al obtener estado de onboarding:', error);
        res.status(500).json({ message: 'Error al obtener estado de onboarding' });
    }
};

/**
 * Actualizar progreso de onboarding
 */
exports.updateOnboardingProgress = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { currentStep, hasCompleted } = req.body;

        const updateData = {
            'onboarding.lastUpdated': new Date()
        };

        if (typeof currentStep === 'number') {
            updateData['onboarding.currentStep'] = currentStep;
        }

        if (typeof hasCompleted === 'boolean') {
            updateData['onboarding.hasCompleted'] = hasCompleted;
            if (hasCompleted) {
                updateData['onboarding.currentStep'] = null;
            }
        }

        const user = await UserV2.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, select: 'onboarding' }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            hasCompleted: user.onboarding.hasCompleted,
            currentStep: user.onboarding.currentStep,
            lastUpdated: user.onboarding.lastUpdated
        });
    } catch (error) {
        console.error('Error al actualizar progreso de onboarding:', error);
        res.status(500).json({ message: 'Error al actualizar progreso' });
    }
};

/**
 * Marcar onboarding como completado
 */
exports.completeOnboarding = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const user = await UserV2.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'onboarding.hasCompleted': true,
                    'onboarding.currentStep': null,
                    'onboarding.lastUpdated': new Date()
                }
            },
            { new: true, select: 'onboarding' }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Onboarding completado exitosamente',
            hasCompleted: true
        });
    } catch (error) {
        console.error('Error al completar onboarding:', error);
        res.status(500).json({ message: 'Error al completar onboarding' });
    }
};
