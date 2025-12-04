const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Configuración del puerto
const PORT = process.env.PORT || 3001;

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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/meetings', meetingRoutes);
app.use('/api/fundacion', fundacionRoutes);
app.use('/api/iglesias', iglesiaRoutes);

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

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/degader', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
