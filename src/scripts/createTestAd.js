/**
 * Script para crear un anuncio de PRUEBA
 * 
 * IMPORTANTE: Este anuncio está marcado como "PRUEBA" para facilitar su identificación
 * y eliminación posterior. NO usar en producción.
 * 
 * Para ejecutar:
 * node src/scripts/createTestAd.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ad = require('../models/Ad');
const AdCredit = require('../models/AdCredit');
const User = require('../models/User.model');

const createTestAd = async () => {
  try {
    // Conectar a MongoDB usando las mismas variables de entorno que index.js
    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');

    // Buscar un usuario para asignar como cliente (usaremos el primero que encontremos)
    const testUser = await User.findOne();
    if (!testUser) {
      console.error('❌ No se encontró ningún usuario en la base de datos');
      console.log('💡 Crea un usuario primero antes de ejecutar este script');
      process.exit(1);
    }

    console.log(`📝 Usuario de prueba encontrado: ${testUser.nombres?.primero || 'Usuario'} ${testUser.apellidos?.primero || 'Test'}`);

    // Verificar si ya existe un anuncio de prueba
    const existingTestAd = await Ad.findOne({ nombreCliente: '[PRUEBA] Anuncio de Demostración' });
    if (existingTestAd) {
      console.log('⚠️  Ya existe un anuncio de prueba. Eliminando...');
      await Ad.deleteOne({ _id: existingTestAd._id });
      console.log('✅ Anuncio de prueba anterior eliminado');
    }

    // Crear o actualizar balance de créditos para el usuario
    let creditBalance = await AdCredit.obtenerOCrear(testUser._id);

    // Agregar 1000 créditos de prueba si no tiene suficientes
    if (creditBalance.balance < 100) {
      await creditBalance.agregarCreditos(1000, 'bono', {
        motivoBono: 'Créditos de prueba para testing del sistema de publicidad'
      });
      console.log('✅ Se agregaron 1000 DegaCoins de prueba al usuario');
    }

    // Crear anuncio de prueba
    const testAd = new Ad({
      clienteId: testUser._id,
      nombreCliente: '[PRUEBA] Anuncio de Demostración',
      imagenUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop',
      linkDestino: 'https://www.example.com/demo',
      textoAlternativo: 'Anuncio de prueba del sistema de publicidad',
      callToAction: '¡Prueba Ahora!',

      // Estado activo para que se muestre inmediatamente
      estado: 'activo',

      // Fechas (30 días de campaña)
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

      // Segmentación amplia para que todos los usuarios lo vean
      segmentacion: {
        edadMin: 13,
        edadMax: 99,
        genero: 'todos',
        intereses: ['tecnología', 'redes sociales', 'entretenimiento'],
        ubicacion: {
          type: 'Point',
          coordinates: [0, 0], // [longitud, latitud]
          radioKm: 50,
          esGlobal: true // Anuncio global, ignora ubicación
        }
      },

      // Prioridad básica
      prioridad: 'basica',

      // Control de frecuencia
      maxImpresionesUsuario: 10,

      // Costo por impresión
      costoPorImpresion: 1
    });

    await testAd.save();
    console.log('✅ Anuncio de prueba creado exitosamente');
    console.log('\n📊 Detalles del anuncio:');
    console.log(`   ID: ${testAd._id}`);
    console.log(`   Nombre: ${testAd.nombreCliente}`);
    console.log(`   Estado: ${testAd.estado}`);
    console.log(`   Cliente: ${testUser.nombres?.primero || 'Usuario'} ${testUser.apellidos?.primero || 'Test'}`);
    console.log(`   Fecha inicio: ${testAd.fechaInicio.toLocaleDateString()}`);
    console.log(`   Fecha fin: ${testAd.fechaFin.toLocaleDateString()}`);
    console.log(`   Créditos disponibles: ${creditBalance.balance} DegaCoins`);

    console.log('\n✨ ¡Listo! Ahora puedes:');
    console.log('   1. Ir a http://localhost:5173/ y ver el anuncio en el sidebar');
    console.log('   2. Hacer click en el anuncio para probar el tracking');
    console.log('   3. Ir a /publicidad para ver el dashboard de cliente');
    console.log('   4. Ir a /admin/publicidad para ver el dashboard de founder (si eres founder)');

    console.log('\n🗑️  Para eliminar este anuncio de prueba:');
    console.log('   node src/scripts/deleteTestAd.js');

  } catch (error) {
    console.error('❌ Error creando anuncio de prueba:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexión cerrada');
  }
};

// Ejecutar el script
createTestAd();
