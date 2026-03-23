require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

/**
 * SCRIPT TEMPORAL PARA PRUEBAS: Bypass de Documentos Prerrequisito
 * Grant access to 'Solicitud de Ingreso' to specific test users.
 */

const TEST_EMAILS = [
  'secretariamunicipal@gmail.com',
  'secretariadepartamental@gmail.com',
  'secretariaregional@gmail.com'
  // 💡 Para agregar más correos, simplemente escríbelos aquí separados por comas.
];

// Construir URI de MongoDB (Igual que en index.js)
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function bypassDocuments() {
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.');

    for (const email of TEST_EMAILS) {
      console.log(`\n🔍 Procesando usuario: ${email}`);
      
      const user = await UserV2.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.warn(`⚠️ Usuario no encontrado: ${email}`);
        continue;
      }

      console.log(`👤 Usuario encontrado: ${user.nombres.primero} ${user.apellidos.primero} (${user._id})`);

      // 🛠️ Aplicar bypass de documentos
      user.esMiembroFundacion = true;
      
      // Asegurar que el objeto fundacion exista
      if (!user.fundacion) {
        user.fundacion = { activo: true };
      }

      // 1. Aplicativo República Argentina
      if (!user.fundacion.documentacionFHSYL) {
        user.fundacion.documentacionFHSYL = {};
      }
      user.fundacion.documentacionFHSYL.ultimaActualizacion = new Date();

      // 2. Entrevista Fundación
      if (!user.fundacion.entrevista) {
        user.fundacion.entrevista = { completado: false };
      }
      user.fundacion.entrevista.completado = true;
      user.fundacion.entrevista.fechaCompletado = new Date();

      // 3. Hoja de Vida
      if (!user.fundacion.hojaDeVida) {
        user.fundacion.hojaDeVida = { completado: false };
      }
      user.fundacion.hojaDeVida.completado = true;
      user.fundacion.hojaDeVida.fechaCompletado = new Date();

      // Marcar como modificado para Mongoose (importante por los Maps/Subdocs)
      user.markModified('fundacion');
      
      await user.save();
      console.log(`✅ Bypass aplicado con éxito para ${email}`);
    }

    console.log('\n✨ Proceso finalizado.');

  } catch (error) {
    console.error('❌ Error ejecuctando el script:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

bypassDocuments();
