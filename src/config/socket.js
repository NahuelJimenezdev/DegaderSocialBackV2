const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

/**
 * Inicializar Socket.IO
 */
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware de autenticación
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.activo) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.userEmail = user.email;
      socket.userName = `${user.nombre} ${user.apellido}`;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Manejo de conexiones
  io.on('connection', (socket) => {
    console.log(`✅ Usuario conectado: ${socket.userName} (${socket.userId})`);

    // Unirse a sala personal (para notificaciones privadas)
    socket.join(`user:${socket.userId}`);

    // Notificar al usuario que está online
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      userName: socket.userName
    });

    // Unirse a una conversación
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`📨 ${socket.userName} se unió a conversación: ${conversationId}`);
    });

    // Salir de una conversación
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`📭 ${socket.userName} salió de conversación: ${conversationId}`);
    });

    // Usuario está escribiendo
    socket.on('conversation:typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.userName,
        conversationId
      });
    });

    // Usuario dejó de escribir
    socket.on('conversation:stop-typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user:stop-typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Mensaje leído
    socket.on('message:read', ({ conversationId, messageId }) => {
      socket.to(`conversation:${conversationId}`).emit('message:read', {
        userId: socket.userId,
        conversationId,
        messageId
      });
    });

    // Unirse a un grupo
    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`👥 ${socket.userName} se unió al grupo: ${groupId}`);
    });

    // Salir de un grupo
    socket.on('group:leave', (groupId) => {
      socket.leave(`group:${groupId}`);
      console.log(`👋 ${socket.userName} salió del grupo: ${groupId}`);
    });

    // Desconexión
    socket.on('disconnect', (reason) => {
      console.log(`❌ Usuario desconectado: ${socket.userName} - Razón: ${reason}`);

      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    // Error en el socket
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.IO inicializado correctamente');
  return io;
};

/**
 * Obtener instancia de Socket.IO
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado');
  }
  return io;
};

/**
 * Emitir notificación a un usuario específico
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emitir mensaje a una conversación
 */
const emitToConversation = (conversationId, event, data) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};

/**
 * Emitir evento a un grupo
 */
const emitToGroup = (groupId, event, data) => {
  if (io) {
    io.to(`group:${groupId}`).emit(event, data);
  }
};

/**
 * Obtener usuarios conectados
 */
const getConnectedUsers = async () => {
  if (!io) return [];

  const sockets = await io.fetchSockets();
  return sockets.map(socket => ({
    userId: socket.userId,
    userName: socket.userName,
    socketId: socket.id
  }));
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToConversation,
  emitToGroup,
  getConnectedUsers
};
