require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Ad = require(path.join(__dirname, '../models/Ad'));
const AdImpression = require(path.join(__dirname, '../models/AdImpression'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function resetImpressionsAndIncreaseLimits() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // 1. Encontrar el anuncio de prueba
    const ad = await Ad.findOne({ nombreCliente: '[PRUEBA] Anuncio de Demostración' });

    if (!ad) {
      console.log('❌ No se encontró el anuncio de prueba');
      return;
    }

    console.log('📊 Anuncio encontrado:', ad.nombreCliente);
    console.log('   - ID:', ad._id);
    console.log('   - Límite actual:', ad.maxImpresionesUsuario);
    console.log('   - Impresiones totales:', ad.metricas.impresiones);

    // 2. Contar impresiones del usuario actual
    const userId = '6930dbc5d78b11c2d6d6d683'; // Tu userId
    const impressionCount = await AdImpression.countDocuments({
      anuncioId: ad._id,
      usuarioId: userId,
      tipo: 'vista'
    });

    console.log('\n👤 Impresiones del usuario actual:', impressionCount);

    // 3. Actualizar límite a 999
    await Ad.updateOne(
      { _id: ad._id },
      { maxImpresionesUsuario: 999 }
    );

    console.log('✅ Límite actualizado a 999 impresiones por usuario');

    // 4. Opcional: Eliminar impresiones del usuario para resetear
    const deleteResult = await AdImpression.deleteMany({
      anuncioId: ad._id,
      usuarioId: userId
    });

    console.log(`🗑️  Eliminadas ${deleteResult.deletedCount} impresiones del usuario`);

    console.log('\n✅ Proceso completado. El anuncio debería aparecer ahora.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

resetImpressionsAndIncreaseLimits();
