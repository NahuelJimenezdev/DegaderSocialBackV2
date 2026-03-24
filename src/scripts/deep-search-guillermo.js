require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function deepSearchGuillermo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Searching for users related to "Guillermo"...');
    const users = await UserV2.find({ 
      $or: [
        { 'nombres.primero': /Guillermo/i },
        { 'nombres.segundo': /Guillermo/i },
        { 'apellidos.primero': /Guillermo/i },
        { 'apellidos.segundo': /Guillermo/i },
        { 'username': /Guillermo/i }
      ]
    }).select('nombres apellidos email');
    
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`ID: ${u._id} | Nombre: ${u.nombres?.primero} ${u.nombres?.segundo || ''} ${u.apellidos?.primero} ${u.apellidos?.segundo || ''} | Email: ${u.email}`);
      const churches = await Iglesia.find({ pastorPrincipal: u._id }).select('nombre');
      console.log(`   Churches as pastor: ${churches.length} (${churches.map(c => c.nombre).join(', ')})`);
    }

    console.log('\nChecking pastor 69c1da3cb27ea87efdf09828 specifically...');
    const p = await UserV2.findById('69c1da3cb27ea87efdf09828').select('nombres apellidos email');
    if (p) {
      console.log(`ID: ${p._id} | Nombre: ${p.nombres?.primero} ${p.nombres?.segundo || ''} ${p.apellidos?.primero} ${p.apellidos?.segundo || ''} | Email: ${p.email}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

deepSearchGuillermo();
