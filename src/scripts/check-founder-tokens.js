const mongoose = require('mongoose');
require('dotenv').config();

const checkFounderTokens = async () => {
  try {
    const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User.model');
    const DeviceToken = require('./src/models/DeviceToken.model');

    const founder = await User.findOne({ 
      $or: [
        { email: 'founderdegader@degadersocial.com' },
        { 'seguridad.rolSistema': 'Founder' }
      ]
    });

    if (!founder) {
      console.log('❌ No Founder user found.');
      process.exit(0);
    }

    console.log(`👤 Found Founder: ${founder.nombres.primero} ${founder.apellidos.primero} (${founder.email})`);
    console.log(`🆔 ID: ${founder._id}`);

    const tokens = await DeviceToken.find({ userId: founder._id });
    if (tokens.length === 0) {
      console.log('❌ No device tokens found for this Founder. Push notifications WILL NOT WORK for them.');
      console.log('👉 Tip: The Founder must log in and grant notification permissions in their browser.');
    } else {
      console.log(`✅ Found ${tokens.length} token(s) for the Founder:`);
      tokens.forEach((t, i) => {
        console.log(`   [${i+1}] Platform: ${t.platform}, Last Used: ${t.lastUsedAt}, Token snippet: ${t.token.substring(0, 20)}...`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFounderTokens();
