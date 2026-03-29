/**
 * SCRIPT PARA CREAR ÍNDICES MANUALMENTE DESDE EL CONTENEDOR
 * Uso: docker compose exec backend node src/scripts/createIndexes.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  console.log('🌐 Conectando a MongoDB Atlas...');
  
  const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
  const uri = process.env.MONGODB_URI || `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

  try {
    await mongoose.connect(uri);
    console.log('✅ Conexión establecida.');

    const collection = mongoose.connection.db.collection('userv2');
    
    console.log('⏳ Creando índice de Jerarquías (Nivel + País)...');
    await collection.createIndex(
      { "fundacion.nivel": 1, "fundacion.territorio.pais": 1 },
      { name: "idx_fundacion_nivel_pais" }
    );

    console.log('⏳ Creando índice de Miembros Activos...');
    await collection.createIndex(
      { "esMiembroFundacion": 1, "seguridad.estadoCuenta": 1 },
      { name: "idx_miembro_activo" }
    );
    
    console.log('✅ Todos los índices han sido creados exitosamente.');
    
    // Listar índices para confirmar
    const indexes = await collection.indexes();
    console.log('📋 Índices actuales en userv2:', indexes.map(i => i.name));

  } catch (err) {
    console.error('❌ Error creando índices:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
