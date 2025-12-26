const User = require('../models/User.model');
const Notification = require('../models/Notification');

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

        const nivelSolicitante = nivel;
        const indexNivelSolicitante = nivelesOrdenados.indexOf(nivelSolicitante);

        // 2. Algoritmo de Escalada (Buscar superior inmediato)
        let notificacionEnviada = false;
        const territorioSolicitante = territorio || {};

        console.log('🔍 [Fundación] Iniciando búsqueda de superior inmediato...');
        console.log(`   Solicitante: ${user.nombres?.primero} ${user.apellidos?.primero}`);
        console.log(`   Nivel: ${nivelSolicitante}, Cargo: ${cargo}`);
        console.log(`   Territorio:`, territorioSolicitante);

        // Iterar hacia arriba buscando el primer nivel que tenga usuarios
        for (let i = indexNivelSolicitante + 1; i < nivelesOrdenados.length; i++) {
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
            if (nivelObjetivo === 'regional' && territorioSolicitante.region) {
                query['fundacion.territorio.region'] = territorioSolicitante.region;
            }
            if (nivelObjetivo === 'departamental' && territorioSolicitante.departamento) {
                query['fundacion.territorio.departamento'] = territorioSolicitante.departamento;
            }
            if (nivelObjetivo === 'municipal' && territorioSolicitante.municipio) {
                query['fundacion.territorio.municipio'] = territorioSolicitante.municipio;
            }

            // Buscar usuarios en este nivel
            const superiores = await User.find(query).select('_id nombres apellidos');

            if (superiores.length > 0) {
                console.log(`✅ [Fundación] Superior encontrado en nivel ${nivelObjetivo}: ${superiores.length} usuarios.`);

                // Crear contenido de notificación
                const areaTexto = area || 'sin área específica';
                const contenido = `${user.nombres?.primero || ''} ${user.apellidos?.primero || ''} solicita unirse a la fundación como ${cargo} en ${areaTexto}`;

                // Crear notificaciones
                const notificaciones = superiores.map(superior => ({
                    receptor: superior._id,
                    emisor: userId,
                    tipo: 'solicitud_fundacion',
                    contenido,
                    metadata: {
                        nivel,
                        area,
                        cargo,
                        territorio
                    }
                }));

                await Notification.insertMany(notificaciones);
                notificacionEnviada = true;

                // Emitir eventos Socket.IO
                if (io) {
                    for (const superior of superiores) {
                        const notifCompleta = await Notification.findOne({
                            receptor: superior._id,
                            emisor: userId,
                            tipo: 'solicitud_fundacion'
                        }).populate('emisor', 'nombres apellidos social.fotoPerfil').sort({ createdAt: -1 });

                        if (notifCompleta) {
                            io.to(`notifications:${superior._id}`).emit('newNotification', notifCompleta);
                            console.log(`   📤 Notificación enviada a: ${superior.nombres?.primero} ${superior.apellidos?.primero}`);
                        }
                    }
                }

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
                const areaTexto = area || 'sin área específica';
                const notificacionesFounder = founders.map(founder => ({
                    receptor: founder._id,
                    emisor: userId,
                    tipo: 'solicitud_fundacion',
                    contenido: `[ESCALADA] Solicitud de ${user.nombres?.primero || ''} (${cargo} - ${nivel}) sin superior inmediato. Requiere atención.`,
                    metadata: {
                        nivel,
                        area,
                        cargo,
                        territorio,
                        esEscalada: true
                    }
                }));

                await Notification.insertMany(notificacionesFounder);

                // Socket IO para Founder
                if (io) {
                    for (const founder of founders) {
                        const notif = await Notification.findOne({
                            receptor: founder._id,
                            emisor: userId,
                            tipo: 'solicitud_fundacion'
                        })
                            .populate('emisor', 'nombres apellidos social.fotoPerfil')
                            .sort({ createdAt: -1 });

                        if (notif) {
                            io.to(`notifications:${founder._id}`).emit('newNotification', notif);
                            console.log(`   📤 Notificación escalada a Founder: ${founder.nombres?.primero} ${founder.apellidos?.primero}`);
                        }
                    }
                }
                console.log('✅ Notificación escalada al Founder exitosamente.');
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
