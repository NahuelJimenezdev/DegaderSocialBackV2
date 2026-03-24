const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ports = [3001, 3002, 3003];
const latency = 300; // 300ms de lag en cada nodo

console.log(`🚀 Iniciando Clúster Distribuido (3 nodos) con ${latency}ms de lag...`);

const pids = {};

const instances = ports.map(port => {
    const child = spawn('node', ['src/index.js'], {
        cwd: path.resolve(__dirname, '../../'),
        env: { ...process.env, PORT: port, CHAOS_LATENCY: latency, NODE_ENV: 'development' },
        stdio: 'inherit'
    });

    pids[port] = child.pid;
    console.log(`✅ Nodo en Puerto ${port} iniciado (PID: ${child.pid}).`);
    return child;
});

// Guardar PIDs para que el attack script pueda matarlos
fs.writeFileSync(path.resolve(__dirname, 'cluster-pids.json'), JSON.stringify(pids));

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando Clúster...');
    instances.forEach(p => p.kill());
    fs.unlinkSync(path.resolve(__dirname, 'cluster-pids.json'));
    process.exit();
});

// Mantener el script vivo
setInterval(() => {}, 1000);
