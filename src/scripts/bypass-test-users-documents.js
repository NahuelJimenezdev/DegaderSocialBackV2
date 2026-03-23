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
];

// Obtener correos adicionales por parámetro
const argEmails = process.argv.slice(2).filter(e => e.includes('@'));
const finalEmails = [...new Set([...TEST_EMAILS, ...argEmails])];

// Construir URI de MongoDB (Igual que en index.js)
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function bypassDocuments() {
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.');

    if (finalEmails.length === 0) {
        console.warn('⚠️ No se especificaron correos para procesar.');
        return;
    }

    for (const email of finalEmails) {
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
