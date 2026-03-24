require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ports = [3001, 3002, 3003];
const TEST_TOKEN = jwt.sign({ userId: '69c1986f1878ee2411b235bb' }, process.env.JWT_SECRET || 'ibrahimJimenez123');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runDistributedChaos() {
    console.log('🌪️ Iniciando DISTRIBUTED CHAOS REAL...');

    const pids = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'cluster-pids.json')));
    
    const payload = {
        nombre: 'Iglesia Distribuida Chaos',
        ubicacion: { ciudad: 'Chaos Net', domicilio: 'Internet 1.0', pais: 'Cloud' },
        pastorPrincipal: '69c1986f1878ee2411b235bb',
        email: 'dist-chaos@test.com'
    };

    const idempotencyKey = `dist-chaos-${Date.now()}`;

    try {
        // --- ESCENARIO 1: LATENCIA + CONCURRENCIA CROSS-NODE ---
        console.log('\n--- 🌪️ SCENARIO 1: Latency + Cross-Node Concurrency ---');
        console.log('Enviando mismo request a 3 puertos DIFERENTES simultáneamente...');
        
        const requests = ports.map(port => 
            axios.post(`http://localhost:${port}/api/iglesias`, payload, {
                headers: { 
                    'Authorization': `Bearer ${TEST_TOKEN}`,
                    'Idempotency-Key': idempotencyKey,
                    'X-Correlation-Id': `chaos-cross-${port}`
                }
            }).catch(err => ({ status: err.response?.status, data: err.response?.data, port }))
        );

        const results = await Promise.all(requests);
        results.forEach(res => {
            console.log(`Port ${res.port} -> Status: ${res.status} (${res.data?.message || 'OK'})`);
        });

        const successes = results.filter(r => r.status === 201).length;
        if (successes > 1) {
            console.error('❌ FALLO: Se crearon duplicados en diferentes nodos (Inconsistencia de Idempotencia)!');
        } else {
            console.log('✅ ÉXITO: El cluster mantuvo la idempotencia distributed-wide.');
        }

        // --- ESCENARIO 2: ATOMIC CRASH (Instancia muere tras escribir) ---
        console.log('\n--- 🌪️ SCENARIO 2: Atomic Crash (Kill node mid-write) ---');
        const crashKey = `crash-key-${Date.now()}`;

        // Enviamos con Delay al puerto 3001
        console.log('Petición (Nodo 3001) con artificial DELAY de 3 segundos...');
        const promise1 = axios.post(`http://localhost:3001/api/iglesias`, { ...payload, nombre: 'Iglesia Survivorship' }, {
            headers: { 
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Idempotency-Key': crashKey,
                'X-Chaos-Delay': 3000
            }
        }).catch(err => ({ status: "CRASHED", port: 3001 }));

        await sleep(1000); // Esperamos a que esté procesando
        console.log(`⚠️ MATANDO NODO 3001 (PID: ${pids[3001]}) mientras procesa...`);
        exec(`taskkill /F /PID ${pids[3001]}`);

        console.log('Simulando reintento del cliente a NODO 3002...');
        const res2 = await axios.post(`http://localhost:3002/api/iglesias`, { ...payload, nombre: 'Iglesia Survivorship' }, {
            headers: { 
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Idempotency-Key': crashKey
            }
        }).catch(err => err.response);

        console.log(`Nodo 3002 Respuesta reintento -> Status: ${res2.status} (${res2.data?.message || ''})`);

        // Verificación final en DB
        const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
        const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
        await mongoose.connect(uri);
        const collection = mongoose.connection.db.collection('iglesias');
        
        const count = await collection.countDocuments({ nombre: 'Iglesia Survivorship' });
        console.log(`\n🔍 Auditoría DB física: Iglesias 'Survivorship' encontradas: ${count}`);
        
        if (count > 1) {
            console.error('❌ FALLO CRÍTICO: El crash causó duplicación por pérdida de lock/contexto.');
        } else {
            console.log('✅ ÉXITO: El sistema resistió la caída distribuida sin duplicados.');
        }

        await collection.deleteMany({ "ubicacion.ciudad": 'Chaos Net' });
        console.log('🧹 Cleanup finalizado.');

    } catch (error) {
        console.error('❌ Error en Chaos Engine:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🌪️ Chaos Engine Finalizado.');
    }
}

runDistributedChaos();
