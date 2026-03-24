const mongoose = require('mongoose');
const path = require('path');
const User = require('../src/models/User.model');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/debug-login-query.js <email>');
  process.exit(1);
}

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
// Use the simplified connection string for testing
const uri = process.env.MONGODB_URI;

async function debugQuery() {
  try {
    console.log(`📡 [DEBUG] Conectando a MongoDB para probar query de email: ${email}...`);
    const startConn = Date.now();
    await mongoose.connect(uri);
    console.log(`✅ [DEBUG] Conectado en ${Date.now() - startConn}ms`);

    console.log(`🔍 [DEBUG] Buscando usuario (con .select('+password'))...`);
    const startQuery = Date.now();
    
    // Simular exactamente la query del authController
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').lean();
    
    const duration = Date.now() - startQuery;
    console.log(`⏱️ [DEBUG] Query finalizada en ${duration}ms`);

    if (!user) {
      console.log('❌ [DEBUG] Usuario NO encontrado.');
    } else {
      console.log('✅ [DEBUG] Usuario encontrado:', {
        id: user._id,
        email: user.email,
        username: user.username,
        hasPassword: !!user.password
      });
    }

    console.log(`🔍 [DEBUG] Buscando usuario (SIN .select('+password'))...`);
    const startQuery2 = Date.now();
    const user2 = await User.findOne({ email: email.toLowerCase() }).lean();
    console.log(`⏱️ [DEBUG] Query 2 finalizada en ${Date.now() - startQuery2}ms`);

    process.exit(0);
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    process.exit(1);
  }
}

debugQuery();
