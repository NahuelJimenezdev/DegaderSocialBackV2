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
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('./config/logger');
const redisService = require('./services/redis.service');
const metrics = require('./infrastructure/metrics/metrics.service');
const distributedRateLimit = require('./middlewares/distributedRateLimit.middleware');
const { initializeEventHandlers } = require('./infrastructure/events/eventHandlers');
const { startWorker } = require('./workers/ranking.worker');

const socketService = require('./services/socketService');
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
  keyGenerator: (req) => ipKeyGenerator(req),
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


// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://degadersocial.com',
      'http://degadersocial.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});


// Hacer io accesible globalmente
app.set('io', io);

// Configurar CORS para Express (peticiones HTTP)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://degadersocial.com',
    'http://degadersocial.com'
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
const healthRoutes = require('./routes/health.routes');
const Iglesia = require('./models/Iglesia.model');
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
const uploadRoutes = require('./routes/upload.routes');

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/publicaciones', postRoutes);
app.use('/api/amistades', amistadCompatRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/grupos', groupRoutes);
app.use('/api/notificaciones', notificationRoutes);
app.use('/health', healthRoutes);
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
app.use('/api/upload', uploadRoutes);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejador de errores global
const globalErrorHandler = require('./middlewares/errorHandler.middleware');
app.use(globalErrorHandler);

// Conexión a MongoDB
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = process.env.MONGODB_URI || `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

// Configuración de conexión con opciones de robustez y alto rendimiento mejorada (v2.2)
const options = {
  autoIndex: false,             // DESACTIVADO: Evita bloqueos y 502 en el arranque con colecciones grandes. Los índices deben crearse manualmente.
  connectTimeoutMS: 30000,      // Aumentado a 30s para soportar picos de latencia
  socketTimeoutMS: 60000,       // Aumentado a 60s para operaciones pesadas
  serverSelectionTimeoutMS: 30000, // Tiempo máximo de espera para seleccionar el servidor de Atlas
  heartbeatFrequencyMS: 10000,   // Verificar salud del servidor cada 10s
  maxPoolSize: 50,              // Soportar alta concurrencia
  minPoolSize: 10,              // Pool caliente siempre listo
};

/**
 * Inicialización Autónoma de Infraestructura (Safe for Distributed Environments)
 */
let isReady = false;

const initializeInfrastructure = async () => {
    try {
        logger.info('🌐 Iniciando Verificación de Infraestructura Distribuida...');

        const collection = mongoose.connection.db.collection('iglesias');
        const indexes = await collection.indexes();
        const requiredIndexes = ['idx_church_unique_pastor', 'idx_church_unique_name_city'];
        const missing = requiredIndexes.filter(name => !indexes.some(idx => idx.name === name));

        if (missing.length > 0) {
            if (process.env.NODE_ENV === 'production') {
                logger.error(`❌ CRITICAL: Faltan índices obligatorios en DB: ${missing.join(', ')}`);
                logger.error('🛑 En modo producción, los índices deben crearse mediante scripts de migración, no automáticamente en caliente.');
                isReady = false;
            } else {
                logger.warn(`🔄 Faltan índices: ${missing.join(', ')}. Sincronizando automáticamente (Modo Dev)...`);
                await Iglesia.syncIndexes();
                logger.info('✅ Índices sincronizados automáticamente.');
                isReady = true;
            }
        } else {
            logger.info('✅ Todos los índices críticos están presentes en la DB.');
            isReady = true;
        }

        // 2. Verificación de Salud Inicial
        if (redisService.isConnected) {
            logger.info('✅ Redis está operativo para Idempotencia Distribuida.');
        } else {
            logger.warn('⚠️ Redis no disponible. Idempotencia en MODO DEGRADADO (Memoria Local).');
        }

    } catch (error) {
        logger.error('❌ Error crítico en inicialización autónoma:', error.message);
        isReady = false;
    }
};

// Exponer estado de readiness para el health check
app.set('isReady', () => isReady);

console.log('🔌 Intentando conectar a MongoDB...');

// Heartbeat de diagnóstico para evitar logs vacíos en cuelgues
const connectionHeartbeat = setInterval(() => {
    const state = mongoose.connection.readyState;
    console.log(`⏳ ...esperando respuesta de MongoDB (Estado: ${state})`);
    
    // Si después de 20s sigue en conectando, mostrar info de topología si está disponible
    if (state === 2 && mongoose.connection.client && mongoose.connection.client.topology) {
        const topology = mongoose.connection.client.topology.description;
        console.log(`🔍 Topología: ${topology.type} - Shards detectados: ${topology.servers.size}`);
        
        topology.servers.forEach((server, address) => {
            console.log(`📍 Nodo [${address}]: ${server.type} ${server.error ? '- ERROR: ' + server.error.message : '- OK'}`);
        });
    }
}, 5000);

mongoose.connect(uri, options)
  .then(async () => {
    clearInterval(connectionHeartbeat);
    console.log('✅ Conectado a MongoDB');

    // Conectar a Redis
    redisService.connect();

    // Inicializar Infraestructura Autónoma
    await initializeInfrastructure();

    // Inicializar Socket.IO después de la DB para evitar MongoNotConnectedError
    socketService.initialize(io);

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
    console.error('❌ Error crítico al conectar a MongoDB:', error);
    process.exit(1);
  });

// Eventos de conexión para monitoreo detallado
mongoose.connection.on('connected', () => console.log('❇️ [DB] Conexión establecida con MongoDB Atlas'));
mongoose.connection.on('disconnected', () => console.warn('⚠️ [DB] MongoDB desconectado. Intentando reconexión automática...'));
mongoose.connection.on('reconnected', () => console.log('✅ [DB] MongoDB reconectado exitosamente'));
mongoose.connection.on('error', (err) => {
  console.error('🔴 [DB ERROR] Error en conexión MongoDB:', err);
  if (err.name === 'MongoNetworkTimeoutError') {
    console.error('🚨 [DB CRITICAL] Se detectó un timeout de red. Verificando latencia con Atlas...');
  }
});

// Monitoreo de comandos lentos (opcional, útil para debugging)
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();
  return (err, result) => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Loguear solo si tarda más de 1s
      console.warn(`🐢 [DB SLOW] ${collectionName}.${method} tardó ${duration}ms`);
    }
  };
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
