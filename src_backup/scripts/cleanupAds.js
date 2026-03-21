require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Ad = require(path.join(__dirname, '../models/Ad'));
const AdCredit = require(path.join(__dirname, '../models/AdCredit'));
const AdImpression = require(path.join(__dirname, '../models/AdImpression'));
const CreditTransaction = require(path.join(__dirname, '../models/CreditTransaction'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

/**
 * Script de limpieza completa del sistema de publicidad
 * Elimina todos los anuncios de prueba y resetea datos
 */
async function cleanupAdvertisingSystem() {
  try {
    console.log('🧹 Iniciando limpieza del sistema de publicidad...\n');
    await mongoose.connect(MONGO_URI);

    // 1. Eliminar anuncios de prueba
    const adsDeleted = await Ad.deleteMany({
      nombreCliente: { $regex: /\[PRUEBA\]/i }
    });
    console.log(`✅ Eliminados ${adsDeleted.deletedCount} anuncios de prueba`);

    // 2. Eliminar impresiones de anuncios de prueba
    const impressionsDeleted = await AdImpression.deleteMany({
      anuncioId: { $in: [] } // Se eliminarán automáticamente por cascade
    });
    console.log(`✅ Eliminadas ${impressionsDeleted.deletedCount} impresiones`);

    // 3. Opcional: Resetear balances de prueba
    // Descomenta si quieres resetear balances
    // const balanceReset = await AdCredit.updateMany(
    //   { totalBonos: 1000 }, // Solo balances de prueba con bono inicial
    //   { balance: 1000, totalGastado: 0 }
    // );
    // console.log(`✅ Reseteados ${balanceReset.modifiedCount} balances`);

    // 4. Opcional: Eliminar transacciones de prueba
    // Descomenta si quieres limpiar transacciones
    // const transactionsDeleted = await CreditTransaction.deleteMany({
    //   descripcion: { $regex: /PRUEBA/i }
    // });
    // console.log(`✅ Eliminadas ${transactionsDeleted.deletedCount} transacciones`);

    console.log('\n✅ Limpieza completada exitosamente');
    console.log('\n📊 Estado actual:');
    const totalAds = await Ad.countDocuments();
    const totalImpressions = await AdImpression.countDocuments();
    console.log(`   - Anuncios activos: ${totalAds}`);
    console.log(`   - Impresiones totales: ${totalImpressions}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

cleanupAdvertisingSystem();
