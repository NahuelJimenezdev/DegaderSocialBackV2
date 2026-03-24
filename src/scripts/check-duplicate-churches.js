require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkDuplicates() {
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.\n');

    const searchName = "Guillermo";
    console.log(`\n🔍 Buscando iglesias que CONTENGAN: "${searchName}"...`);
    
    const results = await Iglesia.find({ 
      nombre: { $regex: new RegExp(searchName, 'i') } 
    }).select('nombre _id activo pastorPrincipal');

    if (results.length === 0) {
      console.log('❌ No se encontraron iglesias con ese nombre.');
    } else {
      console.log(`✅ Se encontraron ${results.length} iglesias:`);
      results.forEach((iglesia, index) => {
        console.log(`${index + 1}. ID: ${iglesia._id} | Nombre: "${iglesia.nombre}"`);
      });
    }

    console.log('\n📊 Auditando TODAS las iglesias por nombre duplicado...');
    
    const duplicateAggregation = await Iglesia.aggregate([
      {
        $group: {
          _id: "$nombre",
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicateAggregation.length === 0) {
      console.log('✅ No se encontraron nombres de iglesias duplicados en la base de datos.');
    } else {
      console.log(`⚠️ Se encontraron ${duplicateAggregation.length} grupos de nombres duplicados:`);
      duplicateAggregation.forEach((group, index) => {
        console.log(`${index + 1}. Nombre: "${group._id}" | Cantidad: ${group.count}`);
        console.log(`   IDs: ${group.ids.join(', ')}`);
      });
    }

    console.log('\n👤 Auditando pastores con múltiples iglesias...');
    
    const pastorAggregation = await Iglesia.aggregate([
      {
        $group: {
          _id: "$pastorPrincipal",
          count: { $sum: 1 },
          churchNames: { $push: "$nombre" },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (pastorAggregation.length === 0) {
      console.log('✅ No se encontraron pastores con múltiples iglesias.');
    } else {
      console.log(`⚠️ Se encontraron ${pastorAggregation.length} pastores con múltiples iglesias:`);
      pastorAggregation.forEach((group, index) => {
        console.log(`${index + 1}. Pastor ID: ${group._id} | Cantidad: ${group.count}`);
        console.log(`   Iglesias: ${group.churchNames.join(', ')}`);
        console.log(`   IDs: ${group.ids.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Error ejecutando el script:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✨ Proceso finalizado.');
    process.exit(0);
  }
}

checkDuplicates();
