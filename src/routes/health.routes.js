const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redisService = require('../services/redis.service');
const Iglesia = require('../models/Iglesia.model');

/**
 * Endpoint de Salud (Autonomous Health Check)
 */
router.get('/', async (req, res) => {
    const healthInfo = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        status: 'ok',
        services: {
            database: 'down',
            redis: 'down',
            indexes: 'unknown'
        }
    };

    try {
        // 1. Verificar MongoDB
        if (mongoose.connection.readyState === 1) {
            healthInfo.services.database = 'ok';
        }

        // 2. Verificar Redis
        healthInfo.services.redis = redisService.isConnected ? 'ok' : 'down';

        // 3. Verificar Índices Críticos
        const collection = mongoose.connection.db.collection('iglesias');
        const indexes = await collection.indexes();
        const hasPastorIndex = indexes.some(idx => idx.name === 'idx_church_unique_pastor');
        const hasNameCityIndex = indexes.some(idx => idx.name === 'idx_church_unique_name_city');
        
        healthInfo.services.indexes = (hasPastorIndex && hasNameCityIndex) ? 'ok' : 'missing';

        // Determinar status global
        if (healthInfo.services.database !== 'ok' || healthInfo.services.indexes !== 'ok') {
            healthInfo.status = 'critical';
            return res.status(500).json(healthInfo);
        }

        if (healthInfo.services.redis !== 'ok') {
            healthInfo.status = 'degraded';
        }

        res.json(healthInfo);
    } catch (error) {
        healthInfo.status = 'error';
        healthInfo.error = error.message;
        res.status(500).json(healthInfo);
    }
});

module.exports = router;
