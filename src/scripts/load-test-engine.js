const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const poolPath = path.resolve(__dirname, 'load-user-pool.json');
const pool = JSON.parse(fs.readFileSync(poolPath));
const target = 'http://localhost:3001';

async function runStage(rps, duration = 15, connections = 50) {
    console.log(`\n🚀 Stage: Target ${rps} req/s | Duration: ${duration}s | Connections: ${connections}`);
    
    return new Promise((resolve, reject) => {
        const instance = autocannon({
            url: target,
            connections,
            duration,
            connectionRate: rps,
            workers: 0, // CRÍTICO: workers: 0 permite pasar funciones en setupRequest
            requests: [
                {
                    method: 'GET',
                    path: '/api/iglesias?q=Iglesia&pais=Colombia',
                    setupRequest: (req) => {
                        const user = pool[Math.floor(Math.random() * pool.length)];
                        req.headers['Authorization'] = `Bearer ${user.token}`;
                        return req;
                    }
                },
                {
                    method: 'GET',
                    path: '/health/ready'
                },
                {
                    method: 'POST',
                    path: '/api/iglesias',
                    body: JSON.stringify({
                        nombre: `Load Church`,
                        ubicacion: { ciudad: 'Cali', pais: 'Colombia' }
                    }),
                    headers: { 'Content-Type': 'application/json' },
                    setupRequest: (req) => {
                        const user = pool[Math.floor(Math.random() * pool.length)];
                        req.headers['Authorization'] = `Bearer ${user.token}`;
                        req.headers['Idempotency-Key'] = `load-${Date.now()}-${Math.random()}`;
                        const body = JSON.parse(req.body);
                        body.nombre = `Load ${Math.random().toString(36).substring(7)}`;
                        req.body = JSON.stringify(body);
                        return req;
                    }
                }
            ]
        }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function saveMetrics(name, res) {
    const data = {
        stage: name,
        rps_average: res.requests.average,
        latency_p50: res.latency.p50,
        latency_p95: res.latency.p95,
        latency_p99: res.latency.p99,
        non2xx: res.non2xx,
        errors: res.errors,
        timeouts: res.timeouts
    };
    fs.appendFileSync('load-test-results.json', JSON.stringify(data, null, 2) + ',\n');
}

async function startLoadTest() {
    try {
        if (fs.existsSync('load-test-results.json')) fs.unlinkSync('load-test-results.json');
        
        console.log('🏁 Iniciando Batería de Load Tests (Logging to file)...');

        const stage1 = await runStage(100, 10, 20); 
        saveMetrics('100 RPS', stage1);
        console.log('✅ Stage 1 OK');

        const stage2 = await runStage(500, 10, 50);
        saveMetrics('500 RPS', stage2);
        console.log('✅ Stage 2 OK');

        const stage3 = await runStage(1000, 10, 100); 
        saveMetrics('1000 RPS', stage3);
        console.log('✅ Stage 3 OK');

        console.log('\n📊 Resultados finales guardados en load-test-results.json');
        process.exit(0);
    } catch (error) {
        fs.appendFileSync('load-test-errors.log', `❌ Error fatal: ${error.stack}\n`);
        process.exit(1);
    }
}

startLoadTest();
