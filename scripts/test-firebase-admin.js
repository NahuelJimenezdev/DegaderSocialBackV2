const admin = require('firebase-admin');
require('dotenv').config();

const testAdminSDK = async () => {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT no encontrada en .env');
            process.exit(1);
        }

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        console.log('✅ Firebase Admin SDK inicializado correctamente.');
        console.log('Project ID:', serviceAccount.project_id);
        
        // Intentar una operación básica (ej: listar un mensaje vacío para ver si hay error de auth)
        // No hay una forma directa de "ping" sin token, pero si no tira error el init, las credenciales son válidas estructuralmente.
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal en Firebase Admin SDK:', error.message);
        process.exit(1);
    }
};

testAdminSDK();
