
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User.model');

async function checkHijosData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ 'fundacion.documentacionFHSYL.hijos': { $exists: true, $not: { $size: 0 } } })
      .select('nombres fundacion.documentacionFHSYL.hijos')
      .limit(10);

    console.log(`Found ${users.length} users with children data.`);

    users.forEach(u => {
      console.log(`\n👤 User: ${u.nombres.primero} ${u.nombres.segundo || ''}`);
      console.log('📋 Hijos:', JSON.stringify(u.fundacion.documentacionFHSYL.hijos, null, 2));
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkHijosData();
