const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const realDataAudit = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const DeviceToken = require('../src/models/DeviceToken.model');
    const User = require('../src/models/User.model');
    
    const count = await DeviceToken.countDocuments();
    console.log(`\n📊 [DATABASE CHECK]`);
    console.log(`- Total DeviceTokens: ${count}`);
    
    if (count > 0) {
      const tokens = await DeviceToken.find().sort({ lastUsedAt: -1 }).limit(3).populate('userId', 'nombres apellidos email');
      console.log(`\n📜 [ÚLTIMOS 3 TOKENS]`);
      tokens.forEach((t, i) => {
        console.log(`--- Registro #${i+1} ---`);
        console.log(`User: ${t.userId?.nombres?.primero || 'N/A'} ${t.userId?.apellidos?.primero || 'N/A'} (${t.userId?._id || t.userId})`);
        console.log(`Token (parcial): ${t.token.substring(0, 30)}...`);
        console.log(`Fecha: ${t.lastUsedAt}`);
        console.log(`Platform: ${t.platform}`);
      });
    } else {
      console.log('🚨 ALERTA: La base de datos sigue con 0 tokens registrados.');
    }

    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
};

realDataAudit();
