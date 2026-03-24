const mongoose = require('mongoose');
require('dotenv').config();

const verifyNotificationSaved = async () => {
  try {
    const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const Notification = require('../models/Notification.model');
    const luciaId = '69c199de1878ee2411b237bd';

    const latestNotif = await Notification.findOne({ receptor: luciaId })
      .sort({ createdAt: -1 })
      .populate('emisor', 'nombres apellidos');

    if (!latestNotif) {
      console.log('❌ No notification found for Lucia.');
    } else {
      console.log('✅ Latest Notification for Lucia:');
      console.log(`   From: ${latestNotif.emisor?.nombres?.primero} ${latestNotif.emisor?.apellidos?.primero}`);
      console.log(`   Type: ${latestNotif.tipo}`);
      console.log(`   Content: ${latestNotif.contenido}`);
      console.log(`   Created: ${latestNotif.createdAt}`);
      console.log(`   Read: ${latestNotif.leida ? 'Yes' : 'No'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyNotificationSaved();
