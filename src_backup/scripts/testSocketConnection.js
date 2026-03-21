// Script para probar conexión Socket.IO desde Node.js
const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3001';

console.log('🔍 Intentando conectar a Socket.IO en:', SOCKET_URL);

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 3
});

socket.on('connect', () => {
  console.log('✅ Socket conectado exitosamente!');
  console.log('   Socket ID:', socket.id);
  console.log('   Transporte:', socket.io.engine.transport.name);

  // Intentar autenticar (necesitarás un token válido)
  console.log('\n⚠️  Para autenticar, necesitas un token JWT válido');
  console.log('   Puedes obtenerlo desde el navegador (localStorage)');

  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  console.error('   Tipo:', error.type);
  console.error('   Descripción:', error.description);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Desconectado. Razón:', reason);
});

// Timeout de seguridad
setTimeout(() => {
  console.log('\n⏱️  Timeout - No se pudo conectar en 10 segundos');
  process.exit(1);
}, 10000);
