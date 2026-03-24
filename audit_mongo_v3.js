const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function auditMongo() {
    try {
        console.log('📡 Iniciando Auditoría MONGODB (V3)...');
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI no definida en el env');
            process.exit(1);
        }

        const start = Date.now();
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        console.log(`✅ Conectado en ${Date.now() - start}ms`);

        // Obtener nombres de colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📦 Colecciones:', collections.map(c => c.name).join(', '));

        const collectionName = 'usersv2';
        const collection = mongoose.connection.db.collection(collectionName);

        const total = await collection.countDocuments();
        console.log(`👥 Total Usuarios en '${collectionName}': ${total}`);

        console.log('🔍 Verificando Índices...');
        const indexes = await collection.indexes();
        console.log('📌 Índices:', JSON.stringify(indexes, null, 2));

        console.log('⚡ Probando consulta simple...');
        const sStart = Date.now();
        const sample = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
        console.log(`✅ Consulta simple (sort createdAt) en ${Date.now() - sStart}ms`);

        console.log('🔥 Probando Agregación Completa...');
        const aggStart = Date.now();
        // Simulamos la consulta que falla
        const result = await collection.aggregate([
            { $match: {} },
            {
                $facet: {
                    users: [{ $sort: { createdAt: -1 } }, { $limit: 20 }],
                    totalCount: [{ $count: 'count' }]
                }
            }
        ]).toArray();
        console.log(`✅ Agregación completada en ${Date.now() - aggStart}ms`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ ERROR:', error);
    }
}

auditMongo();
