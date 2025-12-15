require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const AdCredit = require(path.join(__dirname, '../models/AdCredit'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkAndCreateBalance() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    const userId = '6930dbc5d78b11c2d6d6d683'; // Tu userId

    // Verificar si existe balance
    let balance = await AdCredit.findOne({ clienteId: userId });

    if (!balance) {
      console.log('❌ No existe balance para el usuario');
      console.log('📝 Creando balance con 1000 DegaCoins...');

      balance = await AdCredit.create({
        clienteId: userId,
        balance: 1000,
        totalBonos: 1000
      });

      console.log('✅ Balance creado:', balance.balance, 'DegaCoins');
    } else {
      console.log('✅ Balance existente:', balance.balance, 'DegaCoins');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

checkAndCreateBalance();
