require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Ad = require(path.join(__dirname, '../models/Ad'));
const AdCredit = require(path.join(__dirname, '../models/AdCredit'));
const CreditTransaction = require(path.join(__dirname, '../models/CreditTransaction'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function syncEverything() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    const userId = '6930dbc5d78b11c2d6d6d683';

    // 1. Resetear métricas del anuncio
    const ad = await Ad.findOne({ nombreCliente: '[PRUEBA] Anuncio de Demostración' });
    if (ad) {
      ad.metricas.impresiones = 0;
      ad.metricas.clicks = 0;
      ad.metricas.ctr = 0;
      ad.creditosGastados = 0;
      await ad.save();
      console.log('✅ Métricas del anuncio reseteadas');
    }

    // 2. Resetear balance a 1000
    await AdCredit.updateOne(
      { clienteId: userId },
      {
        balance: 1000,
        totalGastado: 0,
        totalComprado: 0,
        totalBonos: 1000
      }
    );
    console.log('✅ Balance reseteado a 1000 DegaCoins');

    // 3. Eliminar transacciones
    const deleteResult = await CreditTransaction.deleteMany({ clienteId: userId });
    console.log(`✅ Eliminadas ${deleteResult.deletedCount} transacciones`);

    console.log('\n✅ Todo sincronizado. Sistema listo para usar.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

syncEverything();
