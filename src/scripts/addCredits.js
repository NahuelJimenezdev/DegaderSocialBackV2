require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const AdCredit = require(path.join(__dirname, '../models/AdCredit'));
const CreditTransaction = require(path.join(__dirname, '../models/CreditTransaction'));

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

/**
 * Script para agregar créditos a un usuario
 * Uso: node src/scripts/addCredits.js <userId> <cantidad>
 */
async function addCredits() {
  try {
    // Obtener argumentos de línea de comandos
    const userId = process.argv[2];
    const cantidad = parseInt(process.argv[3]);

    if (!userId || !cantidad) {
      console.log('❌ Uso: node src/scripts/addCredits.js <userId> <cantidad>');
      console.log('   Ejemplo: node src/scripts/addCredits.js 69627230f6fd262be9eeb2ad 1000');
      process.exit(1);
    }

    console.log(`💰 Agregando ${cantidad} DegaCoins al usuario ${userId}...\n`);
    await mongoose.connect(MONGO_URI);

    // Buscar o crear balance del usuario
    let balance = await AdCredit.findOne({ clienteId: userId });

    if (!balance) {
      console.log('📝 Creando nuevo balance para el usuario...');
      balance = new AdCredit({
        clienteId: userId,
        balance: 0,
        totalComprado: 0,
        totalGastado: 0
      });
    }

    const balanceAnterior = balance.balance;

    // Agregar créditos
    await balance.agregarCreditos(cantidad);

    // Registrar transacción
    await CreditTransaction.create({
      clienteId: userId,
      tipo: 'bono',
      cantidad: cantidad,
      balanceAnterior: balanceAnterior,
      balanceNuevo: balance.balance,
      descripcion: 'Créditos iniciales de prueba'
    });

    console.log('✅ Créditos agregados exitosamente!');
    console.log(`   Balance anterior: ${balanceAnterior} DegaCoins`);
    console.log(`   Créditos agregados: ${cantidad} DegaCoins`);
    console.log(`   Balance nuevo: ${balance.balance} DegaCoins`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

addCredits();
