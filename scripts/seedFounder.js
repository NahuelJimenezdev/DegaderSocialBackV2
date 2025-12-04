const mongoose = require('mongoose');
require('dotenv').config();
const UserV2 = require('../src/models/User.model');

const seedFounder = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error('Por favor proporciona un email: node scripts/seedFounder.js <email>');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/degader');
    console.log('✅ Conectado a MongoDB');

    const user = await UserV2.findOne({ email });

    if (!user) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    user.esMiembroFundacion = true;
    user.fundacion = {
      activo: true,
      nivel: 'internacional',
      area: 'Dirección Ejecutiva',
      cargo: 'Director Ejecutivo',
      estadoAprobacion: 'aprobado',
      fechaAprobacion: new Date(),
      territorio: {
        pais: 'Global'
      }
    };

    // Asignar rol de sistema también
    if (!user.seguridad) user.seguridad = {};
    user.seguridad.rolSistema = 'Founder';

    await user.save();

    console.log(`✅ Usuario ${user.email} promovido a FUNDADOR exitosamente.`);
    console.log('Ahora tiene permisos para aprobar otras solicitudes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedFounder();
