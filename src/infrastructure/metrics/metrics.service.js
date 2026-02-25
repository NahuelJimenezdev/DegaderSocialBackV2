const client = require('prom-client');

class MetricsService {
    constructor() {
        this.register = new client.Registry();
        client.collectDefaultMetrics({ register: this.register });

        // 🏆 Métricas de Negocio (Mejoradas)
        this.gamesPerLevel = new client.Counter({
            name: 'arena_games_per_level_total',
            help: 'Número de partidas por nivel',
            labelNames: ['level'],
            registers: [this.register]
        });

        this.rankUpdates = new client.Counter({
            name: 'arena_rank_updates_total',
            help: 'Total de actualizaciones de ranking procesadas',
            registers: [this.register]
        });

        this.shadowBans = new client.Counter({
            name: 'arena_shadow_bans_total',
            help: 'Total de usuarios marcados con shadow-ban',
            registers: [this.register]
        });

        this.totalXpEarned = new client.Counter({
            name: 'la_senda_del_reino_total_xp_earned',
            help: 'Total de XP ganada por todos los jugadores',
            registers: [this.register]
        });

        this.suspiciousAttempts = new client.Counter({
            name: 'la_senda_del_reino_suspicious_attempts_total',
            help: 'Total de intentos sospechosos detectados',
            labelNames: ['reason'],
            registers: [this.register]
        });

        // ⚡ Métricas de Infraestructura
        this.redisLatency = new client.Histogram({
            name: 'redis_latency_seconds',
            help: 'Latencia detectada en operaciones de Redis',
            labelNames: ['operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
            registers: [this.register]
        });

        this.apiResponseTime = new client.Histogram({
            name: 'la_senda_del_reino_api_response_time_seconds',
            help: 'Tiempo de respuesta de la API',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.5, 1, 3, 5],
            registers: [this.register]
        });
    }

    // Helpers
    incGames(level) { this.gamesPerLevel.inc({ level }); }
    incRankUpdate() { this.rankUpdates.inc(); }
    incShadowBan() { this.shadowBans.inc(); }
    incSuspicious(reason) { this.suspiciousAttempts.inc({ reason }); }
    observeRedis(op, duration) { this.redisLatency.observe({ operation: op }, duration); }

    startTimer() {
        return this.apiResponseTime.startTimer();
    }

    // Validación de Seguridad para /metrics
    validateAccess(req) {
        const internalApiKey = process.env.INTERNAL_METRICS_KEY;
        const providedKey = req.headers['x-internal-key'];

        if (!internalApiKey) return true; // Si no hay key configurada, permitimos (dev)
        return internalApiKey === providedKey;
    }

    async getMetrics() {
        return await this.register.metrics();
    }

    get contentType() {
        return this.register.contentType;
    }
}

module.exports = new MetricsService();
