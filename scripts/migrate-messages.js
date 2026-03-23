const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateMessages() {
  try {
    console.log('🔄 Iniciando migración de mensajes...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const conversations = await db.collection('conversations').find({ 
      mensajes: { $exists: true, $not: { $size: 0 } } 
    }).toArray();

    console.log(`📊 Se encontraron ${conversations.length} conversaciones para migrar.`);

    for (const conv of conversations) {
      console.log(`\n📦 Migrando conversación: ${conv._id}`);
      let lastMessageId = null;

      const messagesToInsert = conv.mensajes.map(m => {
        const msgId = new mongoose.Types.ObjectId();
        
        return {
          _id: msgId,
          conversationId: conv._id,
          sender: m.emisor,
          contenido: m.contenido,
          tipo: m.tipo || 'texto',
          archivo: m.archivo || null,
          clientMessageId: `migrated-${msgId}`,
          replyTo: null, // Legacy no suele tener replyTo persistido así
          estado: m.visto ? 'leido' : 'enviado',
          createdAt: m.createdAt || conv.createdAt,
          updatedAt: m.createdAt || conv.createdAt
        };
      });

      if (messagesToInsert.length > 0) {
        // Insertar mensajes en la nueva colección
        const result = await db.collection('messages').insertMany(messagesToInsert);
        console.log(`   ✅ ${result.insertedCount} mensajes migrados.`);
        
        lastMessageId = messagesToInsert[messagesToInsert.length - 1]._id;
      }

      // Actualizar la conversación: poner ultimoMensaje y QUITAR el array mensajes legacy
      await db.collection('conversations').updateOne(
        { _id: conv._id },
        { 
          $set: { ultimoMensaje: lastMessageId },
          $unset: { mensajes: "" } 
        }
      );
      console.log(`   ✅ Conversación actualizada y limpia.`);
    }

    console.log('\n🚀 MIGRACIÓN FINALIZADA CON ÉXITO.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error crítico en la migración:', error);
  }
}

migrateMessages();
