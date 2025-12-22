const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User.model');
const AdCredit = require('./src/models/AdCredit');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function addCoins() {
  try {
    await mongoose.connect(uri);
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
