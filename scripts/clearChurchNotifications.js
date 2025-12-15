const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('../src/models/Notification');

const clearChurchNotifications = async () => {
  try {
    // Construir URI igual que en src/index.js
    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

    console.log('Conectando a MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');

    console.log('🧹 Eliminando todas las notificaciones de iglesia...');

    // Eliminar notificaciones relacionadas con iglesia
    const result = await Notification.deleteMany({
      tipo: {
        $in: [
          'solicitud_iglesia',
          'solicitud_iglesia_aprobada',
          'solicitud_iglesia_rechazada',
          'nuevo_miembro_iglesia'
        ]
      }
    });

    console.log(`✅ Se eliminaron ${result.deletedCount} notificaciones de iglesia.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado');
    process.exit(0);
  }
};

clearChurchNotifications();
