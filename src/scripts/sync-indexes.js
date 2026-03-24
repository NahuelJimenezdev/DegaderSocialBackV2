require('dotenv').config();
const mongoose = require('mongoose');
const Iglesia = require('../models/Iglesia.model');

async function syncAllIndexes() {
    try {
        console.log('🚀 Iniciando sincronización forzada de índices...');
        const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
        await mongoose.connect(uri);

        console.log('🔄 Sincronizando índices del modelo Iglesia...');
        const result = await Iglesia.syncIndexes();
        
        console.log('✅ Resultado de sincronización:', result);

        // Verificar de nuevo
        const collection = mongoose.connection.db.collection('iglesias');
        const indexes = await collection.indexes();
        console.log('\n📊 Índices finales en DB:', indexes.map(i => i.name));

    } catch (error) {
        console.error('❌ Error crítico durante la sincronización:', error);
        if (error.code === 11000) {
            console.error('🛑 No se pueden crear índices únicos porque existen datos DUPLICADOS en la DB.');
            console.error('   Ejecuta el script de limpieza primero.');
        }
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

syncAllIndexes();
