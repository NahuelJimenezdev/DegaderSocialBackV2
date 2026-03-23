const mongoose = require('mongoose');
require('dotenv').config();

const checkUserTokens = async () => {
  const identifier = process.argv[2];
  
  if (!identifier) {
    console.log('❌ Usage: node src/scripts/check-user-tokens.js <email_or_name>');
    process.exit(1);
  }

  try {
    const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const User = require('../models/User.model');
    const DeviceToken = require('../models/DeviceToken.model');

    const user = await User.findOne({ 
      $or: [
        { email: new RegExp(identifier, 'i') },
        { 'nombres.primero': new RegExp(identifier, 'i') },
        { 'apellidos.primero': new RegExp(identifier, 'i') }
      ]
    });

    if (!user) {
      console.log(`❌ No user found matching: ${identifier}`);
      process.exit(0);
    }

    console.log(`👤 Found User: ${user.nombres.primero} ${user.apellidos.primero} (${user.email})`);
    console.log(`🆔 ID: ${user._id}`);
    console.log(`📋 Foundation Status: ${user.esMiembroFundacion ? 'Member' : 'Not Member'}`);
    if (user.fundacion) {
        console.log(`   Level: ${user.fundacion.nivel}`);
        console.log(`   Area: ${user.fundacion.area}`);
        console.log(`   Cargo: ${user.fundacion.cargo}`);
        console.log(`   Approval: ${user.fundacion.estadoAprobacion}`);
    }

    const tokens = await DeviceToken.find({ userId: user._id });
    if (tokens.length === 0) {
      console.log('❌ No device tokens found for this user. Push notifications WILL NOT WORK.');
      console.log('👉 Tip: The user must log in and grant notification permissions.');
    } else {
      console.log(`✅ Found ${tokens.length} token(s):`);
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

checkUserTokens();
