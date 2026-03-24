require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function sanitizeUsers() {
    try {
        console.log('🔄 Conectando a MongoDB para sanitizar datos...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Eliminar el campo 'iglesia' del root de todos los documentos UserV2
        // El campo correcto actualmente es 'eclesiastico.iglesia'
        const db = mongoose.connection.db;
        const result = await db.collection('userv2').updateMany(
            { iglesia: { $exists: true } },
            { $unset: { iglesia: "" } }
        );

        console.log(`✅ Sanitización completada.`);
        console.log(`🗑️ Se eliminó el campo root 'iglesia' de ${result.modifiedCount} usuarios.`);

        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en sanitización:', error);
        process.exit(1);
    }
}

sanitizeUsers();
