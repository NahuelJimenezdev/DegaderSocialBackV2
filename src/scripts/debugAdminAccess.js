require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');
const Ad = require('../models/Ad');

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
const USER_ID = '6930dbc5d78b11c2d6d6d683'; // Tu usuario

async function debugAdminAccess() {
  try {
    console.log('🚀 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);

    // 1. Simular autencitación y verificación de rol
    console.log('\n🔍 ----- PASO 1: Verificación de Rol -----');
    const user = await UserV2.findById(USER_ID).select('seguridad.rolSistema nombres');

    console.log(`Usuario encontrado: ${user.nombres.primero}`);
    console.log(`Rol en DB: '${user.seguridad.rolSistema}'`);

    // Lógica exacta del controlador
    if (user?.seguridad?.rolSistema !== 'Founder') {
      console.log('❌ ACCESO DENEGADO (Simulación de controlador)');
      console.log(`Motivo: '${user?.seguridad?.rolSistema}' !== 'Founder'`);
    } else {
      console.log('✅ ACCESO APTO (Simulación de controlador)');
    }

    // 2. Simular consulta de campañas
    console.log('\n🔍 ----- PASO 2: Consulta de Campañas -----');
    const query = {}; // Sin filtros, busca todas
    const campaigns = await Ad.find(query)
      .populate('clienteId', 'nombres apellidos email')
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`📊 Total campañas encontradas: ${campaigns.length}`);

    if (campaigns.length === 0) {
      console.log('⚠️ No se encontraron campañas. Verificando conteo total...');
      const total = await Ad.countDocuments();
      console.log(`Total real en colección Ad: ${total}`);
    } else {
      campaigns.forEach(c => {
        console.log(`- [${c.estado}] ${c.nombreCliente} (ID: ${c._id}) - Creado por: ${c.clienteId?.nombres?.primero || 'Desconocido'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Fin del diagnóstico');
  }
}

debugAdminAccess();
