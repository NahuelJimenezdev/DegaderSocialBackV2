/**
 * Script para limpiar índices duplicados en MongoDB
 * Ejecutar con: node scripts/fix-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_ACCESS);
    console.log('✅ Conectado a MongoDB');

    // Obtener la colección de usuarios
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Listar todos los índices actuales
    console.log('\n📋 Índices actuales:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (name: ${index.name})`);
    });

    // Buscar índices duplicados en email
    const emailIndexes = indexes.filter(idx => idx.key.email === 1);
    console.log(`\n🔍 Encontrados ${emailIndexes.length} índices en el campo 'email'`);

    if (emailIndexes.length > 1) {
      console.log('\n🗑️  Eliminando índices duplicados...');

      // Mantener solo el índice con unique: true
      // Eliminar los demás
      for (const index of emailIndexes) {
        // No eliminar el índice automático de unique: true (usualmente se llama "email_1")
        // Solo eliminar si hay más de un índice y no es el principal
        if (!index.unique && emailIndexes.length > 1) {
          console.log(`  Eliminando índice: ${index.name}`);
          await usersCollection.dropIndex(index.name);
        }
      }

      console.log('✅ Índices duplicados eliminados');
    } else {
      console.log('✅ No se encontraron índices duplicados');
    }

    // Listar índices finales
    console.log('\n📋 Índices finales:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (name: ${index.name})`);
    });

    console.log('\n✅ Proceso completado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixIndexes();
