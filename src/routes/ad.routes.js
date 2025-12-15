const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * ==========================================
 * RUTAS PÚBLICAS/USUARIOS (VER ANUNCIOS)
 * ==========================================
 */

// Obtener anuncios recomendados para el usuario actual
router.post('/recommendations', authenticate, adController.getRecommendations);

// Registrar impresión (vista) de un anuncio
router.post('/impression/:adId', authenticate, adController.registerImpression);

// Registrar click en un anuncio
router.post('/click/:adId', authenticate, adController.registerClick);

/**
 * ==========================================
 * RUTAS PARA CLIENTES (GESTIONAR CAMPAÑAS)
 * ==========================================
 */

// Obtener campañas del cliente actual
router.get('/my-campaigns', authenticate, adController.getMyCampaigns);

// Crear nueva campaña
router.post('/create', authenticate, adController.createCampaign);

// Actualizar campaña
router.put('/:id', authenticate, adController.updateCampaign);

// Pausar/Reanudar campaña
router.patch('/:id/toggle', authenticate, adController.toggleCampaign);

// Eliminar campaña
router.delete('/:id', authenticate, adController.deleteCampaign);

// Obtener estadísticas de una campaña
router.get('/:id/stats', authenticate, adController.getCampaignStats);

/**
 * ==========================================
 * RUTAS DE CRÉDITOS
 * ==========================================
 */

// Obtener balance de créditos
router.get('/credits/balance', authenticate, adController.getBalance);

// Comprar créditos
router.post('/credits/purchase', authenticate, adController.purchaseCredits);

// Obtener historial de transacciones
router.get('/credits/transactions', authenticate, adController.getTransactions);

/**
 * ==========================================
 * RUTAS PARA FOUNDER (ADMIN)
 * ==========================================
 */

// Obtener todas las campañas (admin)
router.get('/admin/all-campaigns', authenticate, adController.getAllCampaigns);

// Aprobar/Rechazar campaña (admin)
router.put('/admin/approve/:adId', authenticate, adController.approveCampaign);

// Obtener ingresos totales (admin)
router.get('/admin/revenue', authenticate, adController.getRevenue);

module.exports = router;
