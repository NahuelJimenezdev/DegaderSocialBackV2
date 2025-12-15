/**
 * Script para ELIMINAR el anuncio de PRUEBA
 * 
 * Para ejecutar:
 * node src/scripts/deleteTestAd.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ad = require('../models/Ad');
const AdImpression = require('../models/AdImpression');

const deleteTestAd = async () => {
  try {
    // Conectar a MongoDB usando las mismas variables de entorno que index.js
    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');

    // Buscar el anuncio de prueba
    const testAd = await Ad.findOne({ nombreCliente: '[PRUEBA] Anuncio de Demostración' });

    if (!testAd) {
      console.log('ℹ️  No se encontró ningún anuncio de prueba para eliminar');
      return;
    }

    console.log(`📝 Anuncio de prueba encontrado: ${testAd._id}`);
    console.log(`   Impresiones: ${testAd.metricas?.impresiones || 0}`);
    console.log(`   Clicks: ${testAd.metricas?.clicks || 0}`);
    console.log(`   CTR: ${testAd.metricas?.ctr?.toFixed(2) || 0}%`);

    // Eliminar impresiones asociadas
    const impressionsDeleted = await AdImpression.deleteMany({ anuncioId: testAd._id });
    console.log(`✅ ${impressionsDeleted.deletedCount} impresiones eliminadas`);

    // Eliminar el anuncio
    await Ad.deleteOne({ _id: testAd._id });
    console.log('✅ Anuncio de prueba eliminado exitosamente');

  } catch (error) {
    console.error('❌ Error eliminando anuncio de prueba:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexión cerrada');
  }
};

// Ejecutar el script
deleteTestAd();
