const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');

/**
 * Envía notificaciones jerárquicas para solicitudes de fundación
 * Solo notifica al superior jerárquico inmediato
 * Si no hay superior, escala al Founder
 * 
 * @param {Object} params - Parámetros de la notificación
 * @param {String} params.userId - ID del usuario solicitante
 * @param {Object} params.user - Objeto del usuario solicitante
 * @param {String} params.nivel - Nivel solicitado
 * @param {String} params.area - Área solicitada
 * @param {String} params.cargo - Cargo solicitado
 * @param {Object} params.territorio - Territorio del solicitante
 * @param {Object} params.io - Instancia de Socket.IO (opcional)
 */
const enviarNotificacionesJerarquicas = async ({ userId, user, nivel, area, cargo, territorio, io }) => {
    try {
        // 1. Jerarquía Ordenada (de abajo hacia arriba)
        const nivelesOrdenados = [
            "local", "barrial", "municipal",
            "departamental", "regional", "nacional",
            "organismo_internacional", "organo_control", "directivo_general"
        ];

        const nivelSolicitante = nivel?.toLowerCase();
        const indexNivelSolicitante = nivelesOrdenados.indexOf(nivelSolicitante);

        // 2. Algoritmo de Escalada (Buscar superior inmediato)
        let notificacionEnviada = false;
        const territorioSolicitante = territorio || {};

        console.log('🔍 [Fundación Util] Iniciando búsqueda de superior inmediato...');
        console.log(`   Solicitante: ${user.nombres?.primero} ${user.apellidos?.primero}`);
        console.log(`   Nivel: ${nivelSolicitante}, Cargo: ${cargo}`);

        // Iterar hacia arriba buscando el primer nivel que tenga usuarios
        const startLoop = indexNivelSolicitante >= 0 ? indexNivelSolicitante + 1 : nivelesOrdenados.length;

        for (let i = startLoop; i < nivelesOrdenados.length; i++) {
            const nivelObjetivo = nivelesOrdenados[i];

            // Construir Query Base (Filtro Territorial Estricto + Nivel)
            const query = {
                esMiembroFundacion: true,
                'fundacion.estadoAprobacion': 'aprobado',
                'fundacion.nivel': nivelObjetivo,
            };

            // 🔒 REGLA DE ORO: SIEMPRE coincide el PAÍS
            if (territorioSolicitante.pais) {
                query['fundacion.territorio.pais'] = territorioSolicitante.pais;
            }

            // Filtros adicionales según el nivel objetivo
            if (nivelObjetivo === 'regional') {
                const regionSolicitante = territorioSolicitante.region || '';
                
                if (regionSolicitante) {
                    // El solicitante de un nivel inferior podría no tener la región especificada explícitamente.
                    // Permitir escalar al Regional si comparten el país y no hay conflicto de región.
                    if (!query['$and']) query['$and'] = [];
                    query['$and'].push({
                        $or: [
                            { 'fundacion.territorio.region': regionSolicitante },
                            { 'fundacion.territorio.region': { $exists: false } },
                            { 'fundacion.territorio.region': '' },
                            { 'fundacion.territorio.region': null }
                        ]
                    });
                }
                // Si la región del solicitante es "", que escale a CUALQUIER regional de su país.
            }
            if (nivelObjetivo === 'departamental' && territorioSolicitante.departamento) {
                query['fundacion.territorio.departamento'] = territorioSolicitante.departamento;
            }
            if (nivelObjetivo === 'municipal' && territorioSolicitante.municipio) {
                query['fundacion.territorio.municipio'] = territorioSolicitante.municipio;
            }

            // 🔒 REGLA DE NIVEL + TERRITORIO + ÁREA (Smart Match)
            const safeArea = area || '';
            const areaCore = safeArea.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();
            const areaRegex = new RegExp(areaCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

            if (!query['$and']) query['$and'] = [];
            query['$and'].push({
                $or: [
                    { 'fundacion.area': { $regex: areaRegex } },
                    { 'fundacion.cargo': { $in: ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'] } },
                    { 'seguridad.rolSistema': 'Founder' },
                    { 'fundacion.nivel': { $in: ['organismo_internacional', 'organo_control', 'directivo_general'] } }
                ]
            });

            // Buscar usuarios en este nivel
            const superiores = await User.find(query).select('_id nombres apellidos');

            if (superiores.length > 0) {
                console.log(`✅ [Fundación] Superior encontrado en nivel ${nivelObjetivo}: ${superiores.length} usuarios.`);

                // Crear contenido de notificación
                const areaTexto = area || 'Dirección General / Sin área';
                const contenido = `${user.nombres?.primero || ''} ${user.apellidos?.primero || ''} solicita unirse a la fundación como ${cargo} en ${areaTexto}`;

                // 🏆 Enviar notificaciones usando el servicio unificado (Push + Socket + DB)
                const notificationPromises = superiores.map(superior => 
                    notificationService.notify({
                        receptorId: superior._id,
                        emisorId: userId,
                        tipo: 'solicitud_fundacion',
                        contenido,
                        referencia: { tipo: 'UserV2', id: user._id },
                        metadata: {
                            nivel,
                            area,
                            cargo,
                            territorio
                        }
                    }).catch(err => console.error(`   ⚠️ Error notificando a superior ${superior._id}:`, err.message))
                );

                await Promise.all(notificationPromises);
                notificacionEnviada = true;

                // ✋ DETENER ESCALADA (Ya se notificó al nivel inmediato superior)
                break;
            }
        }

        // 3. Fallback: Notificar al Founder si nadie más recibió
        if (!notificacionEnviada) {
            console.warn('⚠️ [Fundación] No se encontraron superiores jerárquicos en la cadena.');
            console.log('🚨 Escalando notificación directamente al Founder.');

            const founders = await User.find({ 'seguridad.rolSistema': 'Founder' }).select('_id nombres apellidos');

            if (founders.length > 0) {
                const areaTexto = area || 'Dirección General / Sin área';
                const founderPromises = founders.map(founder => 
                    notificationService.notify({
                        receptorId: founder._id,
                        emisorId: userId,
                        tipo: 'solicitud_fundacion',
                        contenido: `[ESCALADA] Solicitud de ${user.nombres?.primero || ''} (${cargo} - ${nivel}) sin superior inmediato. Requiere atención.`,
                        referencia: { tipo: 'UserV2', id: user._id },
                        metadata: {
                            nivel,
                            area,
                            cargo,
                            territorio,
                            esEscalada: true
                        }
                    }).catch(err => console.error(`   ⚠️ Error notificando a founder ${founder._id}:`, err.message))
                );

                await Promise.all(founderPromises);
                console.log('✅ Notificación escalada al Founder exitosamente (Push + Socket).');
            }
        }

        return { success: true, notificacionEnviada };

    } catch (error) {
        console.error('❌ Error creando notificaciones jerárquicas:', error);
        throw error;
    }
};

module.exports = {
    enviarNotificacionesJerarquicas
};
