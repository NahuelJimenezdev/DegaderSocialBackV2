require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Notification = require('../models/Notification');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function verifyEscalation() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        // Eliminar al Director Departamental para probar escala a Regional
        await User.deleteOne({ email: 'departamental@gmail.com' });
        console.log('🗑️ Director Departamental eliminado para prueba de escala.');

        // Limpiar notificaciones previas
        await Notification.deleteMany({ tipo: 'solicitud_fundacion' });

        const applicant = await User.findOne({ email: 'psicosocial@gmail.com' });
        const regional = await User.findOne({ email: 'regional@gmail.com' });

        if (!applicant || !regional) {
            console.error('❌ No se encontraron los usuarios necesarios.');
            process.exit(1);
        }

        console.log(`🔍 Probando escala: ${applicant.email} (Municipal) -> ${regional.email} (Regional)`);

        // Simulamos la lógica de fundacionController.js
        const nivel = applicant.fundacion.nivel;
        const area = applicant.fundacion.area;
        const cargo = applicant.fundacion.cargo;
        const territorio = applicant.fundacion.territorio;

        const nivelesOrdenados = [
            "local", "barrial", "municipal",
            "departamental", "regional", "nacional",
            "organismo_internacional", "organo_control", "directivo_general"
        ];

        const indexNivelSolicitante = nivelesOrdenados.indexOf(nivel);
        const areaCore = area.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();
        const areaRegex = new RegExp(areaCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        for (let i = indexNivelSolicitante + 1; i < nivelesOrdenados.length; i++) {
            const nivelObjetivo = nivelesOrdenados[i];
            const query = {
                esMiembroFundacion: true,
                'fundacion.estadoAprobacion': 'aprobado',
                'fundacion.nivel': nivelObjetivo,
                'fundacion.territorio.pais': territorio.pais
            };

            if (nivelObjetivo === 'regional' && territorio.region) query['fundacion.territorio.region'] = territorio.region;
            if (nivelObjetivo === 'departamental' && territorio.departamento) query['fundacion.territorio.departamento'] = territorio.departamento;
            if (nivelObjetivo === 'municipal' && territorio.municipio) query['fundacion.territorio.municipio'] = territorio.municipio;

            query.$or = [
                { 'fundacion.area': { $regex: areaRegex } },
                { 'fundacion.cargo': 'Director General (Pastor)' },
                { 'seguridad.rolSistema': 'Founder' },
                { 'fundacion.nivel': { $in: ['organismo_internacional', 'organo_control', 'directivo_general'] } }
            ];

            const superiores = await User.find(query);
            console.log(`🔎 Nivel ${nivelObjetivo}: Encontrados ${superiores.length} superiores.`);

            if (superiores.length > 0) {
                const notificaciones = superiores.map(s => ({
                    receptor: s._id,
                    emisor: applicant._id,
                    tipo: 'solicitud_fundacion',
                    contenido: `${applicant.nombres.primero} solicita unirse como ${cargo} en ${area}`,
                    metadata: { nivel, area, cargo, territorio }
                }));

                await Notification.insertMany(notificaciones);
                console.log(`✅ Notificaciones enviadas al nivel ${nivelObjetivo}`);
                break;
            }
        }

        // Verificar en DB
        const finalNotif = await Notification.findOne({ receptor: regional._id, emisor: applicant._id });
        if (finalNotif) {
            console.log('✅ VERIFICACIÓN EXITOSA: La notificación escaló al Director Regional.');
        } else {
            console.log('❌ VERIFICACIÓN FALLIDA: La notificación no escaló al Director Regional.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyEscalation();
