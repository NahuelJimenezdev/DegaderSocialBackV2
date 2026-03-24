require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function deepSearchChurch() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Searching for churches related to "Guillermo" in ANY field...');
    
    // Búsqueda exhaustiva en varios campos
    const churches = await Iglesia.find({
      $or: [
        { nombre: /Guillermo/i },
        { descripcion: /Guillermo/i },
        { denominacion: /Guillermo/i },
        { 'ubicacion.direccion': /Guillermo/i },
        { 'ubicacion.ciudad': /Guillermo/i },
        { 'contacto.email': /Guillermo/i },
        { mision: /Guillermo/i },
        { vision: /Guillermo/i },
        { valores: /Guillermo/i }
      ]
    });
    
    console.log(`Found ${churches.length} churches:`);
    churches.forEach(c => {
      console.log(`ID: ${c._id} | Nombre: "${c.nombre}" | Direccion: "${c.ubicacion?.direccion}"`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

deepSearchChurch();
