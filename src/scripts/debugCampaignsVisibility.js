require('dotenv').config();
const mongoose = require('mongoose');
const Ad = require('../models/Ad');

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
const TARGET_USER_ID = '693a2e8f40e350a3be43291e';

async function verifyCampaigns() {
  try {
    console.log('🚀 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);

    console.log(`\n🔍 Buscando campañas creadas por usuario: ${TARGET_USER_ID}`);
    const campaigns = await Ad.find({ clienteId: TARGET_USER_ID });

    console.log(`📊 Total encontradas: ${campaigns.length}`);

    if (campaigns.length === 0) {
      console.log('⚠️ No se encontraron campañas para este usuario.');
    } else {
      campaigns.forEach((c, index) => {
        console.log(`\n📄 Campaña #${index + 1}:`);
        console.log(`- ID: ${c._id}`);
        console.log(`- Nombre: ${c.nombreCliente}`);
        console.log(`- Estado: ${c.estado}`);
        console.log(`- Fecha Inicio: ${c.fechaInicio}`);
        console.log(`- Fecha Fin: ${c.fechaFin}`);
        console.log(`- Es Global: ${c.segmentacion?.ubicacion?.esGlobal}`);
        console.log(`- Creditos Gastados: ${c.creditosGastados}`);
        console.log('-----------------------------------');
      });
    }

    // Checking globally
    console.log('\n🔍 Verificando visibilidad global (sin filtros de usuario)...');
    const allAds = await Ad.find({}).select('nombreCliente clienteId estado');
    console.log(`📊 Total en la colección Ad: ${allAds.length}`);
    allAds.forEach(c => {
      console.log(`- [${c.estado}] ${c.nombreCliente} (Owner: ${c.clienteId})`);
    });

  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado.');
  }
}

verifyCampaigns();
