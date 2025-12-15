require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();
const httpServer = createServer(app);

// Configuración del puerto
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Permitir carga de recursos cross-origin (imágenes, etc.)
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Relaxed limit for development: 1000 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all requests
app.use('/api/', limiter);

// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Inicializar servicio de Socket.IO
const socketService = require('./services/socketService');
socketService.initialize(io);

// Hacer io accesible globalmente
app.set('io', io);

// Configurar CORS para Express (peticiones HTTP)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200 // Para navegadores legacy
}));

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// Servir archivos estáticos (uploads) con CORS
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const friendshipRoutes = require('./routes/friendship.routes');
const amistadCompatRoutes = require('./routes/amistad-compat.routes');
const groupRoutes = require('./routes/group.routes');
const notificationRoutes = require('./routes/notification.routes');
const conversationRoutes = require('./routes/conversation.routes');
const searchRoutes = require('./routes/search.routes');
const folderRoutes = require('./routes/folder.routes');
const meetingRoutes = require('./routes/meeting.routes.js');
const fundacionRoutes = require('./routes/fundacion.routes');
const iglesiaRoutes = require('./routes/iglesia.routes');
const adRoutes = require('./routes/ad.routes');

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a Degader Social Backend V2',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    socketio: 'enabled'
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/publicaciones', postRoutes);
app.use('/api/amistades', amistadCompatRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/grupos', groupRoutes);
app.use('/api/notificaciones', notificationRoutes);
app.use('/api/conversaciones', conversationRoutes);
app.use('/api/buscar', searchRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/reuniones', meetingRoutes);
app.use('/api/fundacion', fundacionRoutes);
app.use('/api/iglesias', iglesiaRoutes);
app.use('/api/ads', adRoutes); // Sistema de publicidad

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Conexión a MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pcisms7.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Conectado a MongoDB');

    // Inicio del servidor con Socket.IO (solo después de conectar a DB)
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO habilitado`);
      console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  io.close(() => {
    console.log('🔌 Socket.IO cerrado');
  });
  await mongoose.connection.close();
  httpServer.close(() => {
    console.log('🚀 Servidor HTTP cerrado');
    process.exit(0);
  });
});

module.exports = { app, io, httpServer };
