const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_ACCESS)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB');
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a Degader Social Backend V2',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Ruta para verificar salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});
