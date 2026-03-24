require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3001'; 
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWMxOTg2ZjE4NzhlZTI0MTFiMjM1YmIiLCJpYXQiOjE3NDI4MDEwNzIsImV4cCI6MTc0MjgwNDY3Mn0.QY38AdOyUdVHERdNTb39EeIF47nZL96YGOwJVKT-MtJQ'; 

async function runAudit() {
    console.log('🕵️ Iniciando AUDITORÍA PARANOICA TOTAL...');

    try {
        // 1. Verificar HEALTH & READY
        console.log('\n--- 🧪 TEST 1: Health & Ready ---');
        const health = await axios.get(`${BASE_URL}/health/`);
        const ready = await axios.get(`${BASE_URL}/health/ready`);
        console.log('Liveness (/health):', health.data.status);
        console.log('Readiness (/ready):', ready.data.status, ready.data.checks);

        // 2. Ataque 1: Double Submit Extremo (20 concurrent)
        const payload = {
            nombre: 'Iglesia Prueba Paranoica',
            ubicacion: {
                ciudad: 'Ciudad Test',
                domicilio: 'Calle Test 123'
            },
            pastorPrincipal: '69c1986f1878ee2411b235bb', // ID de usuario test
            email: 'paranoia@test.com'
        };

        /*
        console.log('\n--- ⚠️ TEST 2: Double Submit Extremo (20 Reqs) ---');
        ...
        */

        // 3. Ataque 3: Unicode & Case Normalization
        console.log('\n--- ⚠️ TEST 3: Unicode & Case Bypass ---');
        const variations = [
            'IGLESIA PRUEBA PARANOICA',
            ' iglesia prueba paranoica ',
            'Iglesia Pruéba Paranoica'
        ];

        for (const variant of variations) {
            console.log(`Probando variante: "${variant}"`);
            console.log(`Usando Token: ${TEST_TOKEN.substring(0, 10)}...`);
            const res = await axios.post(`${BASE_URL}/api/iglesias`, { ...payload, nombre: variant }, {
                headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
            }).catch(err => err.response);
            console.log(`Status para "${variant}":`, res.status, res.data.message || '');
        }

        // 4. Verificación en DB Real
        console.log('\n--- 🔍 TEST 4: Verificación DB Física ---');
        const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
        const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
        
        await mongoose.connect(uri);
        const collection = mongoose.connection.db.collection('iglesias');
        
        const count = await collection.countDocuments({ "ubicacion.ciudad": 'Ciudad Test' });
        console.log(`Iglesias reales en DB para 'Ciudad Test': ${count}`);

        if (count > 1) {
            console.error('❌ FALLO: La DB permitió duplicados físicos!');
        } else {
            console.log('✅ ÉXITO: DB física mantiene integridad.');
        }

        // Cleanup
        await collection.deleteMany({ "ubicacion.ciudad": 'Ciudad Test' });
        console.log('🧹 Cleanup finalizado.');

    } catch (error) {
        console.error('❌ Error en ejecución de auditoría:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🕵️ Auditoría Finalizada.');
    }
}

runAudit();
