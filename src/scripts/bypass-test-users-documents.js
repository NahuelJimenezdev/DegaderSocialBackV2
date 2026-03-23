require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

/**
 * SCRIPT TEMPORAL PARA PRUEBAS: Bypass de Documentos Prerrequisito (V3 - Hard Reset)
 * Grant access to 'Solicitud de Ingreso' to specific test users bypassing validation.
 */

const TEST_EMAILS = [
  'secretariamunicipal@gmail.com',
  'secretariadepartamental@gmail.com',
  'secretariaregional@gmail.com',
  'psicosocialregional@gmail.com',
  'psicosocialmunicipal@gmail.com',
  'psicosocialdepartamental@gmail.com',
  'planificacionregional@gmail.com',
  'planificacionmunicipal@gmail.com',
  'planificaciondepartamental@gmail.com'
  // 💡 Para agregar más correos, simplemente escríbelos aquí separados por comas.
];

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function bypassDocuments() {
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.');

    for (const email of TEST_EMAILS) {
      console.log(`\n🔍 Procesando usuario: ${email}`);
      
      // Usamos updateOne para saltarnos TODA la validación del modelo
      // Esto permite guardar los campos de documentos sin tener cargo/nivel todavía
      const result = await UserV2.updateOne(
        { email: email.toLowerCase() },
        { 
          $set: {
            esMiembroFundacion: true,
            'fundacion.activo': false, // Importante: false para no disparar lógica de aprobación
            'fundacion.documentacionFHSYL.ultimaActualizacion': new Date(),
            'fundacion.entrevista.completado': true,
            'fundacion.entrevista.fechaCompletado': new Date(),
            'fundacion.hojaDeVida.completado': true,
            'fundacion.hojaDeVida.fechaCompletado': new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Usuario no encontrado en la DB: ${email}`);
      } else {
        console.log(`✅ Bypass aplicado con éxito para ${email}`);
      }
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
