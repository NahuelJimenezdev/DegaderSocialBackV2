
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User.model');
const DeviceToken = require('../src/models/DeviceToken.model');

async function auditUser(userId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado a MongoDB para Auditoría.');

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return;
    }

    console.log('\n👤 AUDITORÍA DE USUARIO:', user.nombreCompleto || user.username);
    console.log('ID:', user._id);
    console.log('Email:', user.email);
    console.log('Preferencias de Notificación:', JSON.stringify(user.preferencias?.notificaciones, null, 2));
    
    const tokens = await DeviceToken.find({ userId: user._id });
    console.log(`\n📱 TOKENS REGISTRADOS (${tokens.length}):`);
    
    tokens.forEach((t, i) => {
      console.log(`--- Token ${i + 1} ---`);
      console.log('Plataforma:', t.platform);
      console.log('Token:', t.token.substring(0, 20) + '...');
      console.log('Última vez usado:', t.lastUsedAt);
      console.log('Creado:', t.createdAt);
    });

    // Verificar si hay tokens duplicados entre usuarios?
    const allTokens = tokens.map(t => t.token);
    const duplicates = await DeviceToken.find({ token: { $in: allTokens }, userId: { $ne: user._id } });
    if (duplicates.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Se encontraron tokens que pertenecen a OTROS usuarios también:');
      duplicates.forEach(d => {
        console.log(`Token: ${d.token.substring(0, 20)}... | Otro User: ${d.userId}`);
      });
    } else {
      console.log('\n✅ Tokens exclusivos de este usuario.');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error en auditoría:', error.message);
    mongoose.disconnect();
  }
}

// Cambiar por el ID de Lucia detectado en logs
const LUCIA_ID = '69c198861878ee2411b235d8';
auditUser(LUCIA_ID);
