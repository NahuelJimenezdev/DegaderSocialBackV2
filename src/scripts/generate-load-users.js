// Script to generate load-user-pool.json from real DB users
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado a MongoDB');

  // Obtener 10 usuarios reales existentes
  const users = await mongoose.connection.collection('userv2').find({}, {limit: 10, projection: { _id: 1, email: 1 }}).toArray();
  
  if (!users.length) {
    console.error('❌ No se encontraron usuarios en la colección userv2s');
    process.exit(1);
  }

  console.log(`✅ ${users.length} usuarios reales encontrados`);

  // Generar 100 tokens rotando entre los usuarios reales
  const pool = [];
  for (let i = 0; i < 100; i++) {
    const u = users[i % users.length];
    const token = jwt.sign(
      { userId: u._id.toString(), email: u.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    pool.push({ id: u._id.toString(), email: u.email, token });
  }

  fs.writeFileSync(
    path.join(__dirname, 'load-user-pool.json'),
    JSON.stringify(pool, null, 2)
  );

  console.log('✅ Pool de 100 tokens (usuarios reales) generado.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
