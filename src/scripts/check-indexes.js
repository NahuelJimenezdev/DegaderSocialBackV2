require('dotenv').config();
const mongoose = require('mongoose');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    const indexes = await mongoose.connection.db.collection('iglesias').indexes();
    console.log('Indexes for "iglesias" collection:');
    console.log(JSON.stringify(indexes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkIndexes();
