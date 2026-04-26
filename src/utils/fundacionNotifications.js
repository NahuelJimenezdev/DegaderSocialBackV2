const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { NIVELES_ORDENADOS_ASC } = require('../constants/fundacionConstants');

const enviarNotificacionesJerarquicas = async ({ userId, user, nivel, area, cargo, territorio, io }) => {
    try {
        const nivelesOrdenados = NIVELES_ORDENADOS_ASC;

        const nivelSolicitante = nivel?.toLowerCase();
        const indexNivelSolicitante = nivelesOrdenados.indexOf(nivelSolicitante);

        let notificacionEnviada = false;
        const territorioSolicitante = territorio || {};

        const startLoop = indexNivelSolicitante >= 0 ? indexNivelSolicitante + 1 : nivelesOrdenados.length;

        for (let i = startLoop; i < nivelesOrdenados.length; i++) {
            const nivelObjetivo = nivelesOrdenados[i];

            const query = {
                esMiembroFundacion: true,
                'fundacion.estadoAprobacion': 'aprobado',
                'fundacion.nivel': nivelObjetivo,
            };

            if (territorioSolicitante.pais) {
                query['fundacion.territorio.pais'] = territorioSolicitante.pais;
            }

            if (nivelObjetivo === 'regional') {
                const regionSolicitante = territorioSolicitante.region || '';
                if (regionSolicitante) {
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
            }
            if (nivelObjetivo === 'departamental' && territorioSolicitante.departamento) {
                query['fundacion.territorio.departamento'] = territorioSolicitante.departamento;
            }
            if (nivelObjetivo === 'municipal' && territorioSolicitante.municipio) {
                query['fundacion.territorio.municipio'] = territorioSolicitante.municipio;
            }

            if (nivelObjetivo === 'nacional' || nivelObjetivo === 'directivo_general' || nivelObjetivo === 'organo_control' || nivelObjetivo === 'organismo_internacional') {
                if (!query['$and']) query['$and'] = [];
                query['$and'].push({
                    $or: [
                        { 'seguridad.rolSistema': 'Founder' },
                        { 'fundacion.nivel': { $in: ['organismo_internacional', 'organo_control', 'directivo_general', 'nacional'] } }
                    ]
                });
            }

            const superiores = await User.find(query).select('_id nombres apellidos fundacion');

            if (superiores.length > 0) {
                const contenido = `${user.nombres?.primero} ${user.apellidos?.primero} solicita unirse a la fundación como ${cargo} en ${area || 'Dirección General / Sin área'}`;
                
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
                            territorio,
                            eventId: `solicitud_fundacion:${user._id}:${Date.now()}`
                        }
                    }).catch(err => console.error(`   ⚠️ Error notificando a superior ${superior._id}:`, err.message))
                );

                await Promise.all(notificationPromises);
                notificacionEnviada = true;
                break;
            }
        }

        if (!notificacionEnviada) {
            const founders = await User.find({ 'seguridad.rolSistema': 'Founder' }).select('_id nombres apellidos');

            if (founders.length > 0) {
                const founderPromises = founders.map(founder => 
                    notificationService.notify({
                        receptorId: founder._id,
                        emisorId: userId,
                        tipo: 'solicitud_fundacion',
                        contenido: `[ESCALADA] Solicitud de ${user.nombres?.primero || ''} (${cargo} - ${nivel}) sin superior inmediato.`,
                        referencia: { tipo: 'UserV2', id: user._id },
                        metadata: {
                            nivel,
                            area,
                            cargo,
                            territorio,
                            esEscalada: true,
                            eventId: `solicitud_fundacion:${user._id}:${Date.now()}`
                        }
                    }).catch(err => console.error(`   ⚠️ Error notificando a founder ${founder._id}:`, err.message))
                );

                await Promise.all(founderPromises);
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
