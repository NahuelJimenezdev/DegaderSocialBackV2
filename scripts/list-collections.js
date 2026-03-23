const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const listCollections = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\n📦 [COLLECTIONS IN DB]:');
    collections.forEach(c => console.log(`- ${c.name}`));
    
    // Si existe devicetokens o similar, contar documentos
    for (let c of collections) {
        if (c.name.toLowerCase().includes('token')) {
            const count = await db.collection(c.name).countDocuments();
            console.log(`🔍 [ENCONTRADA]: ${c.name} - Documentos: ${count}`);
        }
    }

    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
};

listCollections();
