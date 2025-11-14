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
global.io = io;

// Hacer io accesible globalmente
app.set('io', io);

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('dev'));
// Aumentar límite para soportar imágenes/videos en base64 (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos (uploads)
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_ACCESS)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB');
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Socket.IO - Manejo de conexiones
const connectedUsers = new Map(); // Map de userId -> socketId

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Autenticación del socket
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data;

      if (!token) {
        socket.emit('error', { message: 'Token no proporcionado' });
        return;
      }

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Guardar relación userId <-> socketId
      socket.userId = userId;
      connectedUsers.set(userId.toString(), socket.id);

      console.log(`✅ Usuario autenticado: ${userId} -> Socket: ${socket.id}`);
      socket.emit('authenticated', { userId, message: 'Autenticado correctamente' });
    } catch (error) {
      console.error('❌ Error al autenticar socket:', error.message);
      socket.emit('error', { message: 'Token inválido' });
    }
  });

  // Suscripción a notificaciones
  socket.on('subscribeNotifications', ({ userId }) => {
    if (socket.userId) {
      socket.join(`notifications:${userId}`);
      console.log(`📬 Usuario ${userId} suscrito a notificaciones`);
    }
  });

  // Suscripción a conversaciones
  socket.on('subscribeConversation', ({ conversationId }) => {
    if (socket.userId) {
      socket.join(`conversation:${conversationId}`);
      console.log(`💬 Usuario ${socket.userId} se unió a conversación ${conversationId}`);
    }
  });

  // Suscripción a grupos (para mensajes del grupo)
  socket.on('subscribeGroup', ({ groupId }) => {
    if (socket.userId) {
      socket.join(`group:${groupId}`);
      console.log(`👥 Usuario ${socket.userId} se unió al grupo ${groupId}`);
      // Confirmar suscripción al cliente
      socket.emit('subscribedToGroup', { groupId });
    }
  });

  // Desuscripción de grupos
  socket.on('unsubscribeGroup', ({ groupId }) => {
    if (socket.userId) {
      socket.leave(`group:${groupId}`);
      console.log(`👥 Usuario ${socket.userId} salió del grupo ${groupId}`);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId.toString());
      console.log(`❌ Usuario ${socket.userId} desconectado`);
    }
    console.log('🔌 Cliente desconectado:', socket.id);
  });

  // Errores
  socket.on('error', (error) => {
    console.error('❌ Error en socket:', error);
  });
});

// Función helper para emitir notificaciones
global.emitNotification = (userId, notification) => {
  io.to(`notifications:${userId}`).emit('newNotification', notification);
  console.log(`📨 Notificación emitida a usuario ${userId}:`, notification);
};

// Función helper para emitir mensajes
global.emitMessage = (conversationId, message) => {
  io.to(`conversation:${conversationId}`).emit('newMessage', message);
  console.log(`💬 Mensaje emitido a conversación ${conversationId}`);
};

// Función helper para emitir mensajes de grupo
global.emitGroupMessage = (groupId, message) => {
  io.to(`group:${groupId}`).emit('newGroupMessage', message);
  console.log(`👥 Mensaje emitido al grupo ${groupId}`);
};

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

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a Degader Social Backend V2',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    socketio: 'enabled',
    endpoints: {
      auth: '/api/auth',
      users: '/api/usuarios',
      posts: '/api/publicaciones',
      friendships: '/api/amistades',
      groups: '/api/grupos',
      notifications: '/api/notificaciones',
      conversations: '/api/conversaciones',
      search: '/api/buscar',
      folders: '/api/folders'
    }
  });
});

// Ruta para verificar salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    socketio: {
      enabled: true,
      connectedClients: io.engine.clientsCount,
      authenticatedUsers: connectedUsers.size
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/publicaciones', postRoutes);
app.use('/api/amistades', amistadCompatRoutes); // Rutas compatibles con frontend
app.use('/api/friendships', friendshipRoutes); // Rutas REST originales
app.use('/api/grupos', groupRoutes);
app.use('/api/notificaciones', notificationRoutes);
app.use('/api/conversaciones', conversationRoutes);
app.use('/api/buscar', searchRoutes);
app.use('/api/folders', folderRoutes);

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

// Inicio del servidor con Socket.IO
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO habilitado`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
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
