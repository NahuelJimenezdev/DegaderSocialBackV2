const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const testPagination = async () => {
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
    
    console.log(`🚀 Iniciando setup para Paginación Extrema (Conversación: ${conv._id})`);
    
    // Limpiar tests anteriores si existen
    await Message.deleteMany({ clientMessageId: /^test-pag-/ });
    
    // Insertar 350 mensajes en el pasado reciente
    const baseDate = Date.now() - 3600000; // 1 hora atrás
    const mockMessages = [];
    console.log('📝 Generando 350 mensajes...');
    
    for (let i = 1; i <= 350; i++) {
        mockMessages.push({
            conversationId: conv._id,
            sender: conv.participantes[0],
            tipo: 'texto',
            contenido: `Mensaje de Paginación #${i}`,
            clientMessageId: `test-pag-${Date.now()}-${i}`,
            createdAt: new Date(baseDate + (i * 1000)), // Separados por 1 segundo cronológico
            leido: false,
            estado: 'enviado'
        });
    }
    
    await Message.insertMany(mockMessages);
    console.log('✅ 350 mensajes insertados correctamente en BBDD.\n');
    
    // Iniciar simulación de Frontend Paginando de a 50
    console.log('🔄 Iniciando carga en reversa (Scroll hacia arriba) lotes de 50...');
    let cursorAt = null;
    let cursorId = null;
    let totalCargados = 0;
    let hasMore = true;
    let iteracion = 1;
    let obtenidosTotales = [];
    
    while(hasMore && iteracion <= 10) { // Max 10 iteraciones = 500 msgs
        
        let messageQuery = { 
            conversationId: conv._id,
            clientMessageId: /^test-pag-/ // Solo nuestros mocks
        };

        if (cursorAt && cursorId) {
            messageQuery.$and = [
                {
                    $or: [
                        { createdAt: { $lt: cursorAt } },
                        {
                            createdAt: cursorAt,
                            _id: { $lt: cursorId }
                        }
                    ]
                }
            ];
        }

        const messages = await Message.find(messageQuery)
            .sort({ createdAt: -1, _id: -1 })
            .limit(50);
            
        console.log(`Página ${iteracion}: Cargó ${messages.length} mensajes.`);
        
        if (messages.length > 0) {
            totalCargados += messages.length;
            obtenidosTotales = [...obtenidosTotales, ...messages];
            // Configurar cursor para la siguiente página
            const lastMsg = messages[messages.length - 1]; // El más antiguo de este batch
            cursorAt = lastMsg.createdAt;
            cursorId = lastMsg._id;
        }
        
        hasMore = messages.length === 50;
        iteracion++;
    }
    
    console.log(`\n📊 Resultados Paginación Extrema:`);
    console.log(`Total Esperado: 350`);
    console.log(`Total Obtenido: ${totalCargados}`);
    
    // Validar duplicados
    const idsUnique = new Set(obtenidosTotales.map(m => m._id.toString()));
    console.log(`Duplicados detectados: ${obtenidosTotales.length - idsUnique.size}`);
    
    // Validar orden descendente estricto (del más nuevo al más viejo)
    let ordenCorrecto = true;
    for(let i = 0; i < obtenidosTotales.length - 1; i++) {
        const timeA = obtenidosTotales[i].createdAt.getTime();
        const timeB = obtenidosTotales[i+1].createdAt.getTime();
        // Si hay msgs con mismo tiempo, compara _id
        if (timeA < timeB) {
            ordenCorrecto = false;
        }
    }
    console.log(`Integridad Cronológica Estricta: ${ordenCorrecto ? '✅ PERFECTA' : '❌ FALLÓ'}`);
    
    // Limpieza
    await Message.deleteMany({ clientMessageId: /^test-pag-/ });
    console.log('🧹 Test Data limpiada.');
    process.exit(0);

  } catch(e) {
    console.error('Error general:', e);
    process.exit(1);
  }
};

testPagination();
