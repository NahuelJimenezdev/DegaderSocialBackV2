/**
 * Configuración de Planes SaaS para La Senda del Reino
 */
export const PLANS_CONFIG = {
    FREE: {
        id: 'free',
        label: 'Gracia (Free)',
        dailyLimit: 20,
        xpMultiplier: 1,
        specialLeagues: false
    },
    PRO: {
        id: 'pro',
        label: 'Discípulo (Pro)',
        dailyLimit: 100,
        xpMultiplier: 1.5,
        specialLeagues: true
    },
    ELITE: {
        id: 'elite',
        label: 'Siervo Fiel (Elite)',
        dailyLimit: Infinity,
        xpMultiplier: 2.5,
        specialLeagues: true
    }
};
