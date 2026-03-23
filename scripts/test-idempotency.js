const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // or just .env if cwd is root, but let's be safe
require('dotenv').config();

const testIdempotency = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado a MongoDB');

    const Message = require('../src/models/Message.model');
    const Conversation = require('../src/models/Conversation.model');
    
    // Obtener una conversación válida
    const conv = await Conversation.findOne();
    if (!conv) {
      console.log('❌ No hay conversaciones para probar');
      process.exit(1);
    }
    
    // Preparar payload simulado
    const mockUserId = conv.participantes[0];
    const clientMessageId = 'test-idempotency-' + Date.now();
    
    console.log(`🚀 Iniciando ráfaga de 20 peticiones concurrentes para clientMessageId: ${clientMessageId}`);
    
    // Simular 20 peticiones simultáneas Exactas
    const promesas = [];
    for (let i = 0; i < 20; i++) {
      const p = Message.findOneAndUpdate(
        { 
          conversationId: conv._id,
          clientMessageId: clientMessageId 
        },
        {
          $setOnInsert: {
            conversationId: conv._id,
            emisor: mockUserId,
            tipo: 'texto',
            contenido: 'Mensaje de prueba concurrente ' + i, // Debería guardar el primero que entre
            clientMessageId: clientMessageId,
            leido: false,
            estado: 'enviado'
          }
        },
        { upsert: true, new: true, runValidators: true }
      ).catch(e => ({ error: true, msg: e.message }));
      
      promesas.push(p);
    }

    const resultados = await Promise.all(promesas);
    
    const fallos = resultados.filter(r => r && r.error);
    const exitosos = resultados.filter(r => r && !r.error);
    
    console.log('📊 Resultados de la ráfaga:');
    console.log(`✅ Consultas completadas sin error fatal: ${exitosos.length}`);
    console.log(`❌ Errores en consulta (ej. Duplicate Key Error): ${fallos.length}`);
    
    if (fallos.length > 0) {
      console.log('Detalle de primer fallo:', fallos[0].msg);
    }

    // Verificación real en DB
    const creados = await Message.find({ clientMessageId });
    console.log(`\n🔎 Mensajes reales guardados en MongoDB con ese ID: ${creados.length}`);
    
    if (creados.length === 1) {
      console.log('🎉 ÉXITO TOTAL: La idempotencia MongoDB protegió la BD. Cero duplicados.');
      console.log('Contenido salvado:', creados[0].contenido);
    } else {
      console.log('🚨 FALLO CRÍTICO: Se crearon duplicados en DB.');
      console.log(creados.map(c => c._id));
    }
    
    // Limpiar
    await Message.deleteMany({ clientMessageId });
    console.log('🧹 Limpieza completada.');
    process.exit(0);
  } catch(e) {
    console.error('Error general:', e);
    process.exit(1);
  }
};

testIdempotency();
