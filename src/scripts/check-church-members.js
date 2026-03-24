require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkMembers() {
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.\n');

    const pastorId = "69c1da3cb27ea87efdf09828";
    console.log(`🔍 Buscando iglesias del pastor: ${pastorId}...`);
    
    const churches = await Iglesia.find({ pastorPrincipal: pastorId }).select('nombre _id miembros fechaCreacion');

    console.log(`📊 Se encontraron ${churches.length} iglesias:`);
    for (const iglesia of churches) {
      console.log(`\n------------------------------------------------`);
      console.log(`ID: ${iglesia._id}`);
      console.log(`Nombre: ${iglesia.nombre}`);
      console.log(`Fecha Creación: ${iglesia.fechaCreacion}`);
      console.log(`Cantidad de Miembros: ${iglesia.miembros.length}`);
      console.log(`Miembros IDs: ${iglesia.miembros.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkMembers();
