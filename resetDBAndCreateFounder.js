/**
 * Script para resetear la base de datos y crear usuario Founder
 * Ejecutar con: node resetDB.js
 */

const mongoose = require('mongoose');
const argon2 = require('argon2');

async function resetDatabase() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        const dbUri = 'mongodb://localhost:27017/degader-social-v2';
        await mongoose.connect(dbUri);
        console.log('✅ Conectado a MongoDB\n');

        // Obtener todas las colecciones
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('🗑️  Eliminando todas las colecciones...');
        for (const collection of collections) {
            try {
                await db.collection(collection.name).drop();
                console.log(`   ✅ ${collection.name} eliminada`);
            } catch (error) {
                console.log(`   ⚠️  ${collection.name} - ${error.message}`);
            }
        }

        console.log('\n✅ Base de datos limpiada\n');

        // Crear usuario Founder directamente
        console.log('👤 Creando usuario Founder...');

        const hashedPassword = await argon2.hash('Degader2024!');

        const usersCollection = db.collection('userv2s');

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

            // Seguridad y permisos
            seguridad: {
                rolSistema: 'Founder',
                verificado: true,
                verificadoEn: new Date(),
                intentosFallidos: 0,
                bloqueadoHasta: null
            },

            // Perfil de fundación
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

            // Listas vacías
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
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(founderData);

        console.log('✅ Usuario Founder creado exitosamente\n');
        console.log('📋 Detalles del Founder:');
        console.log(`   Email: founderdegader@degader.org`);
        console.log(`   Contraseña: Degader2024!`);
        console.log(`   Rol: Founder`);
        console.log(`   Nivel Fundación: internacional`);
        console.log(`   Cargo: Director internacional`);
        console.log(`   Estado: aprobado`);
        console.log(`   ID: ${result.insertedId}\n`);

        console.log('🎉 ¡Base de datos reseteada y Founder creado exitosamente!');
        console.log('\n📝 Puedes iniciar sesión con:');
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
resetDatabase()
    .then(() => {
        console.log('\n✅ Script completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error ejecutando script:', error.message);
        process.exit(1);
    });
