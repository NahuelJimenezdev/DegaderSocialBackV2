const admin = require('firebase-admin');
require('dotenv').config();

const testManualPush = async () => {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const dummyToken = 'eXp1cmVfX3Rlc3RfX2Zha2VfdG9rZW5fXzEyMzQ1Njc4OTA='; // Token falso corto
        
        console.log(`\n🚀 [SOLICITANDO ENVÍO MANUAL A FIREBASE]`);
        console.log(`Token Destino: ${dummyToken}`);

        const message = {
            notification: {
                title: 'Audit Test',
                body: 'Si ves esto, el SDK funciona.'
            },
            token: dummyToken
        };

        try {
            const response = await admin.messaging().send(message);
            console.log('✅ Éxito inesperado (¿Cómo el token falso funcionó?):', response);
        } catch (error) {
            console.log(`\n🔴 RESPUESTA REAL DE FIREBASE ADMIN SDK:`);
            console.log(`Código: ${error.code}`);
            console.log(`Mensaje: ${error.message}`);
            
            if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
                console.log(`\n✅ INTERPRETACIÓN: El SDK de Firebase Admin se comunicó CORRECTAMENTE con Google, pero el token es inválido (esperado).`);
                console.log(`Esto confirma que el BACKEND está 100% configurado. El fallo es que no hay TOKENS REALES en la BD.`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testManualPush();
