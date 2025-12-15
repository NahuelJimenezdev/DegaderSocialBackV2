require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvdlva0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkUser(userId) {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await UserV2.findById(userId).select('nombres seguridad email');

    console.log('------------------------------------------------');
    console.log('DATOS DEL USUARIO EN BASE DE DATOS:');
    console.log('ID:', user._id);
    console.log('Nombre:', user.nombres.primero);
    console.log('Email:', user.email);
    console.log('------------------------------------------------');
    console.log('OBJETO DE SEGURIDAD (Donde está el rol):');
    console.log(JSON.stringify(user.seguridad, null, 2));
    console.log('------------------------------------------------');
    console.log('Rol de Sistema:', user.seguridad.rolSistema);
    console.log('Acceso Panel Admin:', user.seguridad.permisos.accesoPanelAdmin);
    console.log('------------------------------------------------');

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

checkUser(process.argv[2]);
