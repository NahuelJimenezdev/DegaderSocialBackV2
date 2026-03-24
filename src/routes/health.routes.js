const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redisService = require('../services/redis.service');
const Iglesia = require('../models/Iglesia.model');

/**
 * Endpoint de Salud (Autonomous Health Check)
 */
/**
 * GET /health
 * Liveness Check: ¿El proceso está vivo?
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * GET /ready
 * Readiness Check: ¿La instancia está lista para recibir tráfico?
 */
router.get('/ready', async (req, res) => {
    const isReady = req.app.get('isReady') ? req.app.get('isReady')() : false;

    const readinessInfo = {
        timestamp: new Date().toISOString(),
        status: isReady ? 'ok' : 'not_ready',
        checks: {
            database: mongoose.connection.readyState === 1 ? 'ok' : 'down',
            redis: redisService.isConnected ? 'ok' : 'down',
            indexes: 'pending'
        }
    };

    try {
        // Verificar índices rápidamente
        const collection = mongoose.connection.db.collection('iglesias');
        const indexes = await collection.indexes();
        const hasPastorIndex = indexes.some(idx => idx.name === 'idx_church_unique_pastor');
        const hasNameCityIndex = indexes.some(idx => idx.name === 'idx_church_unique_name_city');
        
        readinessInfo.checks.indexes = (hasPastorIndex && hasNameCityIndex) ? 'ok' : 'missing';

        if (isReady && readinessInfo.checks.database === 'ok' && readinessInfo.checks.indexes === 'ok') {
            return res.json(readinessInfo);
        }

        res.status(503).json(readinessInfo);
    } catch (error) {
        readinessInfo.status = 'error';
        readinessInfo.error = error.message;
        res.status(500).json(readinessInfo);
    }
});

module.exports = router;
