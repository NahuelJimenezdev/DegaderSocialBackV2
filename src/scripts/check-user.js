require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkUser() {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await UserV2.findById('69c1da3cb27ea87efdf09828');
    if (user) {
      console.log('User found:');
      console.log('Nombres:', JSON.stringify(user.nombres));
      console.log('Apellidos:', JSON.stringify(user.apellidos));
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkUser();
