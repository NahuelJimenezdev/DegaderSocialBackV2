require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const UserV2 = require('../models/User.model');

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function listFounders() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('🔍 Buscando usuarios con rol "founder"...');
    const founders = await UserV2.find({ rol: 'founder' }).select('_id nombres apellidos email rol');

    if (founders.length === 0) {
      console.log('❌ No hay usuarios con rol "founder".');
    } else {
      console.log('✅ Founders encontrados:');
      founders.forEach(f => {
        console.log(`- ${f.nombres.primero} ${f.apellidos.primero} (${f.email}) -> ID: ${f._id}`);
      });
    }

    // Listar también un par de usuarios normales para ver sus roles
    console.log('\n🔍 Verificando otros usuarios aleatorios:');
    const randomUsers = await UserV2.find().limit(5).select('_id nombres apellidos rol');
    randomUsers.forEach(u => {
      console.log(`- ${u.nombres.primero} ${u.apellidos.primero} -> Rol: ${u.rol || 'undefined'} (ID: ${u._id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

listFounders();
