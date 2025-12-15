require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Ad = require(path.join(__dirname, '../models/Ad'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function updateTestAdLimit() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Actualizar límite del anuncio de prueba a 50 (razonable para testing)
    const result = await Ad.updateOne(
      { nombreCliente: '[PRUEBA] Anuncio de Demostración' },
      { maxImpresionesUsuario: 50 }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Límite del anuncio de prueba actualizado a 50 impresiones');
      console.log('   (Suficiente para testing sin ser excesivo)');
    } else {
      console.log('ℹ️  No se encontró el anuncio o ya tenía el valor correcto');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

updateTestAdLimit();
