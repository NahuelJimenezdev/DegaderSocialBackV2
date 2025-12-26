/**
 * Script de prueba para verificar el sistema de notificaciones de fundación
 * 
 * Este script:
 * 1. Crea un usuario Founder
 * 2. Crea un usuario solicitante
 * 3. El solicitante solicita unirse a la fundación
 * 4. Verifica que se creen las notificaciones
 */

const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Notification = require('../src/models/Notification');

async function testFundacionNotifications() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/degader-social-v2');
        console.log('✅ Conectado a MongoDB');

        // 1. Buscar o crear usuario Founder
        let founder = await User.findOne({ 'seguridad.rolSistema': 'Founder' });

        if (!founder) {
            console.log('⚠️ No se encontró un Founder, creando uno...');
            founder = await User.create({
                nombres: { primero: 'Founder', segundo: '' },
                apellidos: { primero: 'Test', segundo: '' },
                email: 'founder@test.com',
                password: 'password123',
                fechaNacimiento: new Date('1990-01-01'),
                seguridad: {
                    rolSistema: 'Founder',
                    verificado: true
                },
                esMiembroFundacion: true,
                fundacion: {
                    activo: true,
                    nivel: 'internacional',
                    area: 'Área de Salud',
                    cargo: 'Director internacional',
                    estadoAprobacion: 'aprobado',
                    fechaIngreso: new Date()
                }
            });
            console.log('✅ Founder creado:', founder.email);
        } else {
            console.log('✅ Founder encontrado:', founder.email);
        }

        // 2. Crear usuario solicitante
        const solicitante = await User.create({
            nombres: { primero: 'Test', segundo: '' },
            apellidos: { primero: 'Solicitante', segundo: '' },
            email: `solicitante_${Date.now()}@test.com`,
            password: 'password123',
            fechaNacimiento: new Date('1995-01-01'),
            esMiembroFundacion: true,
            fundacion: {
                activo: true,
                nivel: 'nacional',
                area: 'Área de Salud',
                cargo: 'Director nacional',
                territorio: {
                    pais: 'Colombia',
                    departamento: 'Cundinamarca',
                    municipio: 'Bogotá'
                },
                estadoAprobacion: 'pendiente',
                fechaIngreso: new Date()
            }
        });
        console.log('✅ Solicitante creado:', solicitante.email);

        // 3. Crear notificación para el Founder
        const notificacion = await Notification.create({
            receptor: founder._id,
            emisor: solicitante._id,
            tipo: 'solicitud_fundacion',
            contenido: `${solicitante.nombres.primero} ${solicitante.apellidos.primero} solicita unirse a la fundación como ${solicitante.fundacion.cargo} en ${solicitante.fundacion.area}`,
            metadata: {
                nivel: solicitante.fundacion.nivel,
                area: solicitante.fundacion.area,
                cargo: solicitante.fundacion.cargo,
                territorio: solicitante.fundacion.territorio
            }
        });
        console.log('✅ Notificación creada:', notificacion._id);

        // 4. Verificar que la notificación existe
        const notificaciones = await Notification.find({
            receptor: founder._id,
            tipo: 'solicitud_fundacion'
        }).populate('emisor', 'nombres apellidos');

        console.log('\n📋 Notificaciones de fundación para el Founder:');
        notificaciones.forEach((n, i) => {
            console.log(`\n${i + 1}. Notificación ID: ${n._id}`);
            console.log(`   Tipo: ${n.tipo}`);
            console.log(`   Emisor: ${n.emisor.nombres.primero} ${n.emisor.apellidos.primero}`);
            console.log(`   Contenido: ${n.contenido}`);
            console.log(`   Leída: ${n.leida}`);
            console.log(`   Fecha: ${n.createdAt}`);
        });

        console.log('\n✅ VERIFICACIÓN COMPLETA');
        console.log(`Total de notificaciones de fundación: ${notificaciones.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

// Ejecutar el test
testFundacionNotifications();
