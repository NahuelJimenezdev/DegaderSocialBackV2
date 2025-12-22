const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User.model');
const AdCredit = require('./src/models/AdCredit');

async function addCoins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' Conectado a MongoDB');
    
    const user = await User.findOne({ email: 'daniela@gmail.com' });
    if (!user) {
      console.log(' Usuario no encontrado');
      process.exit(1);
    }
    
    console.log(' Usuario:', user.nombres, user.apellidos);
    
    const balance = await AdCredit.obtenerOCrear(user._id);
    const antes = balance.balance;
    
    await balance.agregarCreditos(3000, true);
    
    console.log(' Balance anterior:', antes, 'DegaCoins');
    console.log(' Balance nuevo:', balance.balance, 'DegaCoins');
    console.log(' Agregados: 3000 DegaCoins');
    
    await mongoose.connection.close();
    console.log(' Conexión cerrada');
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  }
}

addCoins();
