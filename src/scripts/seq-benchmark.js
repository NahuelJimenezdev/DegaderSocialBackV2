// Quick sequential benchmark - no concurrency, pure latency measurement
const http = require('http');
const fs = require('fs');
const path = require('path');

const pool = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'load-user-pool.json')));

function request(token) {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.get({
            hostname: 'localhost', port: 3001,
            path: '/api/iglesias?q=Iglesia&pais=Colombia',
            headers: { 'Authorization': `Bearer ${token}`, 'Connection': 'close' }
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - start }));
        });
        req.on('error', e => resolve({ status: 0, ms: Date.now() - start, err: e.message }));
        req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, ms: 3000, err: 'timeout' }); });
        req.end();
    });
}

async function run(count, label) {
    const results = [];
    console.log(`\n⚡ ${label} (${count} sequential requests)`);
    for (let i = 0; i < count; i++) {
        const t = pool[i % pool.length].token;
        const r = await request(t);
        results.push(r);
    }
    const ok = results.filter(r => r.status >= 200 && r.status < 400).length;
    const lats = results.map(r => r.ms).sort((a,b) => a-b);
    const n = lats.length;
    return {
        total: n, ok, errors: n-ok,
        p50: lats[Math.floor(n*0.5)],
        p95: lats[Math.floor(n*0.95)],
        p99: lats[Math.floor(n*0.99)],
        avg: Math.round(lats.reduce((s,x) => s+x, 0)/n)
    };
}

async function main() {
    const m1 = await run(50, 'Sequential Baseline');
    console.log('Result:', JSON.stringify(m1, null, 2));
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
