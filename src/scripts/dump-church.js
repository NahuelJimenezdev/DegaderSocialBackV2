require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function dumpChurch() {
  try {
    await mongoose.connect(MONGO_URI);
    const iglesia = await Iglesia.findById('69c20c664ce8c1f0587e6f9a');
    console.log(JSON.stringify(iglesia, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

dumpChurch();
