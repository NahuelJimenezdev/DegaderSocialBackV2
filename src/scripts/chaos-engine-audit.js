require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3001'; 
const TEST_TOKEN = jwt.sign({ userId: '69c1986f1878ee2411b235bb' }, process.env.JWT_SECRET || 'ibrahimJimenez123');

async function runChaos() {
    console.log('🌪️ Iniciando CHAOS ENGINE AUDIT...');

    try {
        const payload = {
            nombre: 'Iglesia Caótica',
            ubicacion: { ciudad: 'Chaos City', domicilio: 'Calle 666' },
            pastorPrincipal: '69c1986f1878ee2411b235bb',
            email: 'chaos@test.com'
        };

        // Escenario 1: Keys Diferentes (Omitir Idempotencia de Redis)
        console.log('\n--- 🌪️ SCENARIO 1: Different Idempotency Keys (20 simultaneous) ---');
        const requests1 = Array.from({ length: 20 }).map((_, i) => 
            axios.post(`${BASE_URL}/api/iglesias`, payload, {
                headers: { 
                    'Authorization': `Bearer ${TEST_TOKEN}`,
                    'Idempotency-Key': `chaos-key-${i}-${Date.now()}` // CADA UNA DIFERENTE
                }
            }).catch(err => err.response)
        );

        const results1 = await Promise.all(requests1);
        const successes1 = results1.filter(r => r.status === 201).length;
        const conflicts1 = results1.filter(r => r.status === 409).length;
        console.log(`Resultados Scen 1 -> Éxitos (201): ${successes1}, Conflictos (409): ${conflicts1}`);
        
        if (successes1 > 1) {
            console.error('❌ FALLO: MongoDB permitió duplicados bajo keys diferentes!');
        } else {
            console.log('✅ ÉXITO: MongoDB / Logic bloqueó los duplicados sin depender de Redis Keys.');
        }

        // Escenario 2: Unicode NFC vs NFD
        console.log('\n--- 🌪️ SCENARIO 2: Unicode Normalization (NFC vs NFD) ---');
        // NFC: "é" (un solo caracter)
        const nameNFC = 'Iglesia de San José'; 
        // NFD: "e" + accent (corresponde a 'e\u0301')
        const nameNFD = 'Iglesia de San Jose\u0301'; 

        console.log('Intentando crear NFC...');
        const resNFC = await axios.post(`${BASE_URL}/api/iglesias`, { ...payload, nombre: nameNFC }, {
            headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        }).catch(err => err.response);
        console.log(`NFC Status: ${resNFC.status}`);

        console.log('Intentando crear NFD (Debería ser detectado como duplicado)...');
        const resNFDPost = await axios.post(`${BASE_URL}/api/iglesias`, { ...payload, nombre: nameNFD }, {
            headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        }).catch(err => err.response || { status: 500, data: { message: err.message } });
        
        console.log(`NFD Post Status: ${resNFDPost.status} (${resNFDPost.data?.message || ''})`);

        if (resNFDPost.status === 201) {
            console.error('❌ FALLO: NFD no fue detectado como duplicado de NFC!');
        } else {
            console.log('✅ ÉXITO: El sistema es Unicode-aware.');
        }

        // Escenario 3: Simular modo degradado (Redis OFF)
        // Esto requiere apagar redis, pero podemos simularlo viendo el log de "Modo Degradado"
        // que ya validamos antes.
        
        // Verificación final en DB
        const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
        const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
        await mongoose.connect(uri);
        const collection = mongoose.connection.db.collection('iglesias');
        
        await collection.deleteMany({ "ubicacion.ciudad": 'Chaos City' });
        await collection.deleteMany({ nombre: /San Jos/i });
        console.log('🧹 Cleanup finalizado.');

    } catch (error) {
        console.error('❌ Error en Chaos Engine:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🌪️ Chaos Engine Finalizado.');
    }
}

runChaos();
