const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkLegacyMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const conversations = await db.collection('conversations').find({ 
      mensajes: { $exists: true, $not: { $size: 0 } } 
    }).limit(5).toArray();

    if (conversations.length === 0) {
      console.log('❓ No se encontraron conversaciones con el campo legacy "mensajes".');
      
      // Verificamos si la colección Message tiene datos
      const messageCount = await db.collection('messages').countDocuments();
      console.log(`📊 Total de documentos en la nueva colección "messages": ${messageCount}`);
    } else {
      console.log(`✅ Se encontraron ${conversations.length} conversaciones con mensajes legacy.`);
      conversations.forEach(c => {
        console.log(`- Conv ID: ${c._id}, Mensajes legacy: ${c.mensajes.length}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLegacyMessages();
