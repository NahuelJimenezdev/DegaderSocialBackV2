const Redis = require('ioredis');
const logger = require('../config/logger');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    connect() {
        try {
            this.client = new Redis({
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || null,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.client.on('connect', () => {
                logger.info('🔌 Conectando a Redis...');
            });

            this.client.on('ready', () => {
                this.isConnected = true;
                logger.info('✅ Redis está LISTO');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                logger.error(`❌ Error en Redis: ${err.message}`);
            });

            this.client.on('reconnecting', () => {
                this.isConnected = false;
                logger.warn('🔄 Reconectando a Redis...');
            });

            this.client.on('end', () => {
                this.isConnected = false;
                logger.error('🛑 Conexión a Redis finalizada');
            });

        } catch (error) {
            console.error('❌ Fallo al inicializar Redis:', error.message);
        }
    }

    async get(key) {
        if (!this.isConnected) return null;
        return await this.client.get(key);
    }

    async set(key, value, expireSeconds = null) {
        if (!this.isConnected) return;
        if (expireSeconds) {
            await this.client.set(key, JSON.stringify(value), 'EX', expireSeconds);
        } else {
            await this.client.set(key, JSON.stringify(value));
        }
    }

    async zadd(key, score, member) {
        if (!this.isConnected) return;
        await this.client.zadd(key, score, member);
    }

    async zrevrange(key, start, stop, withScores = false) {
        if (!this.isConnected) return null;
        if (withScores) {
            return await this.client.zrevrange(key, start, stop, 'WITHSCORES');
        }
        return await this.client.zrevrange(key, start, stop);
    }

    async zrevrank(key, member) {
        if (!this.isConnected) return null;
        return await this.client.zrevrank(key, member);
    }

    async zscore(key, member) {
        if (!this.isConnected) return null;
        return await this.client.zscore(key, member);
    }
}

module.exports = new RedisService();
