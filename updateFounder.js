/**
 * Script para crear o actualizar el usuario Founder
 * Ejecutar con: node updateFounder.js
 */

const mongoose = require('mongoose');
const argon2 = require('argon2');

async function updateFounder() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/degader-social-v2';
        await mongoose.connect(dbUri);
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('userv2s');

        // Buscar si ya existe el usuario
        const existingUser = await usersCollection.findOne({ email: 'founderdegader@degader.org' });

        const hashedPassword = await argon2.hash('Degader2024!');

        const founderData = {
            nombres: {
                primero: 'Founder',
                segundo: 'Degader'
            },
            apellidos: {
                primero: 'Degader',
                segundo: 'Org'
            },
            email: 'founderdegader@degader.org',
            password: hashedPassword,
            fechaNacimiento: new Date('1990-01-01'),
            genero: 'otro',

            // Seguridad y permisos - TODOS LOS PERMISOS
            seguridad: {
                rolSistema: 'Founder',
                verificado: true,
                verificadoEn: new Date(),
                intentosFallidos: 0,
                bloqueadoHasta: null
            },

            // Perfil de fundación - NIVEL MÁXIMO
            esMiembroFundacion: true,
            fundacion: {
                activo: true,
                nivel: 'internacional',
                area: 'Área de Salud',
                cargo: 'Director internacional',
                territorio: {
                    pais: 'Colombia',
                    departamento: 'Nacional',
                    municipio: 'Nacional'
                },
                estadoAprobacion: 'aprobado',
                fechaIngreso: new Date(),
                fechaAprobacion: new Date()
            },

            // Perfil social
            social: {
                biografia: 'Fundador de Degader Social - Plataforma de conexión y colaboración',
                fotoPerfil: '/avatars/default-avatar.png',
                fotoBanner: '/banners/default-banner.jpg',
                privacidad: 'publico'
            },

            // Ubicación
            ubicacion: {
                pais: 'Colombia',
                ciudad: 'Bogotá'
            },

            // Listas
            amigos: [],
            solicitudesAmistad: [],
            solicitudesEnviadas: [],
            grupos: [],

            // Configuración
            configuracion: {
                notificaciones: {
                    email: true,
                    push: true,
                    mensajes: true,
                    solicitudesAmistad: true,
                    comentarios: true,
                    menciones: true
                },
                privacidad: {
                    perfilPublico: true,
                    mostrarEmail: false,
                    mostrarUbicacion: true,
                    permitirMensajes: 'todos'
                }
            },

            // Timestamps
            updatedAt: new Date()
        };

        let result;
        if (existingUser) {
            console.log('⚠️  Usuario Founder ya existe, actualizando...');
            result = await usersCollection.updateOne(
                { email: 'founderdegader@degader.org' },
                { $set: founderData }
            );
            console.log('✅ Usuario Founder actualizado exitosamente\n');
        } else {
            console.log('👤 Creando nuevo usuario Founder...');
            founderData.createdAt = new Date();
            result = await usersCollection.insertOne(founderData);
            console.log('✅ Usuario Founder creado exitosamente\n');
        }

        console.log('📋 Detalles del Founder:');
        console.log(`   📧 Email: founderdegader@degader.org`);
        console.log(`   🔑 Contraseña: Degader2024!`);
        console.log(`   👑 Rol: Founder (Máximo nivel)`);
        console.log(`   🏢 Nivel Fundación: internacional`);
        console.log(`   💼 Cargo: Director internacional`);
        console.log(`   ✅ Estado: aprobado`);
        console.log(`   🆔 ID: ${existingUser?._id || result.insertedId}\n`);

        console.log('🎉 ¡Usuario Founder configurado exitosamente!');
        console.log('\n📝 Credenciales de acceso:');
        console.log('   📧 Email: founderdegader@degader.org');
        console.log('   🔑 Contraseña: Degader2024!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        try {
            await mongoose.disconnect();
            console.log('🔌 Desconectado de MongoDB');
        } catch (err) {
            console.error('Error al desconectar:', err.message);
        }
    }
}

// Ejecutar el script
updateFounder()
    .then(() => {
        console.log('\n✅ Script completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error ejecutando script:', error.message);
        process.exit(1);
    });
