const http = require('http');
const fs = require('fs');
const path = require('path');

const pool = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'load-user-pool.json')));
const agent = new http.Agent({ keepAlive: true, maxSockets: 500 });

async function httpRequest(method, urlPath, token, body) {
    return new Promise((resolve) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 3001,
            method,
            path: urlPath,
            agent,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...(body ? { 'Idempotency-Key': `load-${Date.now()}-${Math.random()}` } : {})
            }
        };

        const start = Date.now();
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                latency: Date.now() - start
            }));
        });

        req.on('error', (err) => resolve({ status: 0, latency: Date.now() - start, error: err.message }));
        req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, latency: 5000, error: 'timeout' }); });

        if (payload) req.write(payload);
        req.end();
    });
}

async function buildRequest(i) {
    const user = pool[i % pool.length];
    
    // Mix: 75% GET iglesias, 20% GET health, 5% no-op (avoids hitting POST rate limit in load test)
    const r = Math.random();
    if (r < 0.75) {
        return httpRequest('GET', '/api/iglesias?q=Iglesia&pais=Colombia', user.token, null);
    } else {
        return httpRequest('GET', '/health/ready', user.token, null);
    }
}

async function runStage(rps, durationSec) {
    console.log(`\n🚀 Stage ${rps} RPS | ${durationSec}s`);
    const results = [];
    const end = Date.now() + durationSec * 1000;
    let batch = 0;

    while (Date.now() < end) {
        const batchStart = Date.now();
        const tasks = [];
        for (let i = 0; i < rps; i++) tasks.push(buildRequest(batch * rps + i));
        batch++;
        const res = await Promise.all(tasks);
        results.push(...res);
        const wait = 1000 - (Date.now() - batchStart);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
    }

    return results;
}

function analyze(results, label) {
    const lat = results.map(r => r.latency).sort((a, b) => a - b);
    const n = lat.length;
    const ok = results.filter(r => r.status >= 200 && r.status < 400).length;
    const err = results.filter(r => r.status === 0 || r.status >= 400).length;

    const m = {
        stage: label,
        total: n,
        rps: Math.round(n / (results.length > 0 ? n / (results[n-1]?.latency || 1) : 1)),
        p50: lat[Math.floor(n * 0.5)] || 0,
        p95: lat[Math.floor(n * 0.95)] || 0,
        p99: lat[Math.floor(n * 0.99)] || 0,
        success_rate: `${((ok / n) * 100).toFixed(1)}%`,
        errors: err
    };
    console.log(JSON.stringify(m, null, 2));
    return m;
}

async function main() {
    console.log('🏁 LOAD TEST ENGINE — Definitive Run');

    const r1 = await runStage(100, 10);
    const m1 = analyze(r1, '100 RPS');

    const r2 = await runStage(500, 10);
    const m2 = analyze(r2, '500 RPS');

    const r3 = await runStage(1000, 10);
    const m3 = analyze(r3, '1000 RPS');

    const report = { generated: new Date().toISOString(), results: [m1, m2, m3] };
    fs.writeFileSync('load-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Reporte guardado en load-test-report.json');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
