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
const redisService = require('./services/redis.service');
const metrics = require('./infrastructure/metrics/metrics.service');
const distributedRateLimit = require('./middlewares/distributedRateLimit.middleware');
const { initializeEventHandlers } = require('./infrastructure/events/eventHandlers');
const { startWorker } = require('./workers/ranking.worker');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for rate-limit behind Nginx/Cloudflare)
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

// 🕵️ Monitoring & Metrics (Protected Access)
app.get('/metrics', async (req, res) => {
  if (!metrics.validateAccess(req)) {
    return res.status(403).json({ error: 'Acceso denegado a métricas' });
  }
  res.set('Content-Type', metrics.contentType);
  res.end(await metrics.getMetrics());
});

// Middleware para trackear tiempo de respuesta de la API
app.use((req, res, next) => {
  const end = metrics.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  next();
});

// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://3.144.132.207'  // Servidor AWS en producción
    ],
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
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://3.144.132.207'  // Servidor AWS en producción
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200 // Para navegadores legacy
}));

// Log de CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    console.log('🔓 CORS request from:', origin);
  }
  next();
});

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`\n🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('📍 Origin:', req.headers.origin || 'No origin header');
  console.log('🔑 Authorization:', req.headers.authorization ? 'Present' : 'Not present');
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyLog = { ...req.body };
    if (bodyLog.password) bodyLog.password = '***';
    console.log('📦 Body:', bodyLog);
  }
  next();
});

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
const favoritosRoutes = require('./routes/favoritos.routes');
const reportRoutes = require('./routes/report.routes');
const ticketRoutes = require('./routes/ticket.routes');
const adminRoutes = require('./routes/admin.routes');
const founderRoutes = require('./routes/founder.routes');
const ministerioRoutes = require('./routes/ministerio.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const arenaRoutes = require('./modules/arena/routes/arena.routes');
const economyRoutes = require('./modules/economy/economy.routes');

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
app.use('/api/favoritos', favoritosRoutes);
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
app.use('/api/ministerios', ministerioRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/founder', founderRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/arena', arenaRoutes);
app.use('/api/economy', distributedRateLimit({ maxPerMinute: 30 }), economyRoutes);

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
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

// Debug: Mostrar la URI (sin la contraseña por seguridad)
console.log('🔍 Intentando conectar a MongoDB...');
console.log(`   Usuario: ${process.env.DB_USER}`);
console.log(`   Cluster: ${DB_CLUSTER}`);
console.log(`   Base de datos: ${process.env.DB_NAME}`);

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Conectado a MongoDB');

    // Conectar a Redis
    redisService.connect();

    // Inicializar Infraestructura de Arena
    initializeEventHandlers();

    // Iniciar Worker (Si esta instancia debe actuar como worker)
    if (process.env.RUN_WORKER === 'true' || process.env.NODE_ENV === 'development') {
      startWorker();
    }

    // Inicio del servidor con Socket.IO (solo después de conectar a DB)
    httpServer.listen(PORT, '0.0.0.0', () => {
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
