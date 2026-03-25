require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 5 }).then(async () => {
  const User = require('./src/models/User.model');
  const q = { esMiembroFundacion: true, 'fundacion.estadoAprobacion': 'aprobado' };
  
  console.log('Testing FIXED query with narrow .select() + .lean()...');
  const t = Date.now();
  const users = await User.find(q)
    .select('nombres apellidos email social.fotoPerfil fundacion.nivel fundacion.area fundacion.cargo fundacion.territorio fundacion.estadoAprobacion fundacion.activo fundacion.fechaAprobacion createdAt')
    .sort({ 'nombres.primero': 1 })
    .limit(10)
    .lean();
  console.log('FIXED find() took', Date.now() - t, 'ms. Found:', users.length);
  
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
