const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const { apiLimiter } = require('./middlewares/rateLimiter');
app.use('/api', apiLimiter);

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_ACCESS)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB');
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a Degader Social Backend V2',
    status: 'OK',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Documentación Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Degader Social API Docs"
}));

// Inicializar Socket.IO
const { initializeSocket } = require('./config/socket');
const io = initializeSocket(server);

// Hacer io disponible en las rutas
app.set('io', io);

// Importar y usar rutas de la API
const apiRoutes = require('./routes/index.routes');
app.use('/api', apiRoutes);

// Importar middlewares de manejo de errores
const { notFound, errorHandler } = require('./middlewares/errorHandler');

// Manejador de rutas no encontradas
app.use(notFound);

// Manejador de errores global
app.use(errorHandler);

// Inicio del servidor
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Servidor Degader Social Backend V2');
  console.log('='.repeat(50));
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de datos: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
  console.log('='.repeat(50));
});

// Manejo de cierre graceful
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  Señal ${signal} recibida`);
  console.log('👋 Cerrando servidor de forma ordenada...');

  server.close(async () => {
    console.log('🔌 Servidor HTTP cerrado');

    try {
      await mongoose.connection.close();
      console.log('🗄️  Conexión a base de datos cerrada');
      console.log('✅ Cierre completado exitosamente');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error al cerrar conexiones:', error);
      process.exit(1);
    }
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('⚠️  Forzando cierre después de timeout');
    process.exit(1);
  }, 10000);
};

// Escuchar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
