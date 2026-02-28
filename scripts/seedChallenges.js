require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('../src/models/challenge.model');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGODB_URI;

async function seedChallenges() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGODB_URI no está definido en el archivo .env');
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const filePath = path.join(__dirname, 'challenges.json');
    if (!fs.existsSync(filePath)) {
      console.error('❌ No se encontró el archivo scripts/challenges.json');
      process.exit(1);
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const challenges = JSON.parse(data);

    console.log(`📝 Procesando ${challenges.length} desafíos...`);

    for (const item of challenges) {
      // Usar updateOne con upsert para evitar duplicados si se corre varias veces
      // Basado en la pregunta y el nivel
      await Challenge.updateOne(
        { question: item.question, level: item.level },
        { $set: item },
        { upsert: true }
      );
    }

    console.log('✨ ¡Sifonado de desafíos completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Desconectado de MongoDB');
  }
}

seedChallenges();
