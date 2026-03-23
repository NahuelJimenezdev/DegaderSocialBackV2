const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust if needed
require('dotenv').config();

const auditPush = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado a MongoDB');

    const DeviceToken = require('../src/models/DeviceToken.model');
    const User = require('../src/models/User.model');
    
    // 1. Obtener todos los tokens
    const tokens = await DeviceToken.find().populate('userId', 'nombres apellidos email');
    console.log(`\n🔎 [TOKEN AUDIT] Total de tokens registrados en la DB: ${tokens.length}`);
    
    if (tokens.length === 0) {
      console.log('🚨 FALLO CRÍTICO: No hay NI UN SOLO token registrado en la base de datos. El frontend no está enviando el token al backend.');
      process.exit(1);
    }

    tokens.forEach(t => {
      console.log(`- Token de: ${t.userId?.nombres?.primero || t.userId} (${t.platform}) | Útilizado: ${t.lastUsedAt}`);
    });

    // 2. Intentar enviar Push con Firebase Admin
    const admin = require('firebase-admin');
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('\n🚨 FALLO CRÍTICO: No existe la variable FIREBASE_SERVICE_ACCOUNT. Admin SDK inactivo.');
      process.exit(1);
    }
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('\n🔥 Firebase Admin SDK inicializado.');

    const testToken = tokens[0].token;
    console.log(`\n🚀 Intentando enviar Push de prueba al token (${testToken.substring(0,20)}...)...`);
    
    const message = {
      notification: { title: 'Auditoría Push', body: 'Este es un mensaje de prueba de la auditoría E2E del backend.' },
      tokens: [testToken]
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`📊 Respuesta DIRECTA de Firebase:`);
    console.log(`- Success: ${response.successCount}`);
    console.log(`- Failure: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      console.log(`❌ Detalles del fallo:`, JSON.stringify(response.responses[0].error));
      console.log(`🔍 Diagnóstico: Firebase rechaza el token. Podría estar mal formado, vencido o el service-worker no lo regeneró correctamente.`);
    } else {
      console.log(`✅ Push devuelto como EXITOSO por FCM para el token provisto.`);
      console.log(`🔍 Diagnóstico: Firebase Admin SDK está enviándolo correctamente. El problema debe estar en la capa de recepción Frontend (Service Worker no reacciona) o el dispositivo local tiene las notificaciones bloqueadas por OS.`);
    }

    process.exit(0);

  } catch(e) {
    console.error('Error general:', e);
    process.exit(1);
  }
};

auditPush();
