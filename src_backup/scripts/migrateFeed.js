/**
 * Script de Migración: Pre-computar feeds en Redis
 * Ejecución: node src/scripts/migrateFeed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const feedService = require('../services/feed.service');
const redisService = require('../services/redis.service');
const logger = require('../config/logger');

const migrateAllFeeds = async () => {
    try {
        console.log('🚀 Iniciando migración masiva de Feeds a Redis...');
        
        // Conectar DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');
        
        // Conectar Redis
        redisService.connect();
        // Esperar un momento a que Redis conecte
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!redisService.isConnected) {
            throw new Error('No se pudo conectar a Redis. Abortando migración.');
        }

        // Obtener todos los usuarios activos
        const users = await User.find({ status: 'active' }).select('_id username').lean();
        console.log(`👥 Total usuarios a procesar: ${users.length}`);

        let count = 0;
        for (const user of users) {
            count++;
            console.log(`⏳ [${count}/${users.length}] Migrando feed de: @${user.username}...`);
            await feedService.migrateUserFeed(user._id.toString());
        }

        console.log('✨ Migración completada exitosamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal en migración:', error);
        process.exit(1);
    }
};

migrateAllFeeds();
