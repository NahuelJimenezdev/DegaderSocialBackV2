const mongoose = require('mongoose');
const path = require('path');
const User = require('../src/models/User.model');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;

async function fixIndexes() {
  try {
    console.log(`📡 [INDEX] Conectando a MongoDB...`);
    // Limpiar URI si tiene opciones duplicadas (bug común con Mongoose options)
    const sanitizedUri = uri.split('?')[0] + '?' + [...new Set(uri.split('?')[1]?.split('&') || [])].join('&');
    await mongoose.connect(sanitizedUri);
    console.log(`✅ [INDEX] Conectado.`);

    console.log(`🔍 [INDEX] Listando índices actuales de la colección 'users'...`);
    const indexes = await mongoose.connection.db.collection('users').indexes();
    console.log(`📄 [INDEX] Índices encontrados:`, JSON.stringify(indexes, null, 2));

    const hasEmailIndex = indexes.some(idx => idx.key && idx.key.email);

    if (!hasEmailIndex) {
      console.warn(`⚠️ [INDEX] ¡ATENCIÓN! No se encontró un índice para el campo 'email'.`);
      console.log(`🛠️ [INDEX] Intentando crear índice único para 'email' manualmente...`);
      const start = Date.now();
      await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
      console.log(`✅ [INDEX] Índice creado con éxito en ${Date.now() - start}ms`);
    } else {
      console.log(`✅ [INDEX] El índice de 'email' ya existe.`);
    }

    console.log(`🛠️ [INDEX] Sincronizando todos los índices del modelo User...`);
    await User.syncIndexes();
    console.log(`✅ [INDEX] Sincronización completada.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ [INDEX ERROR] Error:', error);
    process.exit(1);
  }
}

fixIndexes();
