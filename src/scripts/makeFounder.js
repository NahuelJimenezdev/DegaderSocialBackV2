require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const UserV2 = require('../models/User.model');

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function promoteToFounder() {
  try {
    const userId = process.argv[2];

    if (!userId) {
      console.log('❌ Debes proporcionar un ID de usuario.');
      process.exit(1);
    }

    console.log(`🚀 Conectando a MongoDB para ascender usuario ${userId}...`);
    await mongoose.connect(MONGO_URI);

    const user = await UserV2.findById(userId);

    if (!user) {
      console.log('❌ Usuario no encontrado.');
      process.exit(1);
    }

    // Actualizar rol y permisos
    if (!user.seguridad) user.seguridad = {};
    if (!user.seguridad.permisos) user.seguridad.permisos = {};

    user.seguridad.rolSistema = 'Founder';
    user.seguridad.permisos.accesoPanelAdmin = true;
    user.seguridad.permisos.crearEventos = true;
    user.seguridad.permisos.gestionarUsuarios = true;
    user.seguridad.permisos.gestionarFinanzas = true;
    user.seguridad.permisos.publicarNoticias = true;
    user.seguridad.permisos.moderarContenido = true;

    // Necesitamos marcar 'seguridad' como modificado si es un subdocumento
    user.markModified('seguridad');

    await user.save();

    console.log('\n✅ ¡ÉXITO! Usuario ascendido a FOUNDER.');
    console.log(`👤 Nombre: ${user.nombres.primero} ${user.apellidos.primero}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👑 Nuevo Rol: ${user.seguridad.rolSistema}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

promoteToFounder();
