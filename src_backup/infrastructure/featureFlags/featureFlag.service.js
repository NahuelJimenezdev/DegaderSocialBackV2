class FeatureFlagService {
    constructor() {
        this.flags = {
            enableNewRankingFormula: process.env.FF_ARENA_NEW_RANKING === 'true',
            enableXPBoost: process.env.FF_ARENA_XP_BOOST === 'true',
            enableSeasonRewards: process.env.FF_ARENA_SEASON_REWARDS === 'true',
            enableShadowBan: process.env.FF_ARENA_SHADOW_BAN === 'true',
            enableSlidingWindowRateLimit: process.env.FF_ARENA_SLIDING_WINDOW === 'true'
        };
    }

    isEnabled(flagName) {
        if (!(flagName in this.flags)) {
            console.warn(`⚠️ Intento de acceder a Feature Flag inexistente: ${flagName}`);
            return false;
        }
        return this.flags[flagName];
    }

    // Permitir activar/desactivar en caliente si fuera necesario (ej: desde Redis)
    updateFlag(flagName, value) {
        if (flagName in this.flags) {
            this.flags[flagName] = value;
        }
    }
}

module.exports = new FeatureFlagService();
