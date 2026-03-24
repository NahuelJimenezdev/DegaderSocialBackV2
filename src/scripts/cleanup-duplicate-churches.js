require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function cleanupDuplicates() {
  try {
    console.log('📡 Conectando a MongoDB para LIMPIEZA...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión establecida.\n');

    const pastorId = "69c1da3cb27ea87efdf09828";
    const nombreDuplicado = "Iglesia Emanuel";

    console.log(`🔍 Buscando duplicados de "${nombreDuplicado}" para el pastor ${pastorId}...`);
    
    // Obtenemos todas las iglesias del pastor con ese nombre, ordenadas por fecha (más antigua primero)
    const churches = await Iglesia.find({ 
      pastorPrincipal: pastorId,
      nombre: nombreDuplicado 
    }).sort({ createdAt: 1 });

    if (churches.length <= 1) {
      console.log('✅ No hay duplicados excedentes para limpiar.');
    } else {
      const aMantener = churches[0];
      const aBorrar = churches.slice(1);
      
      console.log(`📌 Mantendremos la iglesia ID: ${aMantener._id} (Creada: ${aMantener.createdAt})`);
      console.log(`🗑 Se borrarán ${aBorrar.length} iglesias duplicadas...`);
      
      for (const iglesia of aBorrar) {
        console.log(`   Eliminando ID: ${iglesia._id} (${iglesia.nombre})...`);
        await Iglesia.findByIdAndDelete(iglesia._id);
      }
      
      console.log('\n✅ Limpieza completada exitosamente.');
    }

    // También limpiar la iglesia "Emanuel" si es redundante (el pastor ya tiene "Iglesia Emanuel")
    const emanuelRedundante = await Iglesia.findOne({ 
      pastorPrincipal: pastorId,
      nombre: "Emanuel"
    });
    
    if (emanuelRedundante) {
       console.log(`🗑 Eliminando iglesia redundante "Emanuel" ID: ${emanuelRedundante._id}...`);
       await Iglesia.findByIdAndDelete(emanuelRedundante._id);
       console.log('✅ Eliminada.');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✨ Proceso finalizado.');
    process.exit(0);
  }
}

cleanupDuplicates();
