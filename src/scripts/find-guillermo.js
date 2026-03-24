require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function findGuillermo() {
  try {
    await mongoose.connect(MONGO_URI);
    const users = await UserV2.find({ 
      $or: [
        { 'nombres.primero': /Guillermo/i },
        { 'apellidos.primero': /Guillermo/i },
        { 'social.username': /Guillermo/i }
      ]
    }).select('nombres apellidos email');
    
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`ID: ${u._id} | Nombre: ${u.nombres?.primero} ${u.apellidos?.primero} | Email: ${u.email}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

findGuillermo();
