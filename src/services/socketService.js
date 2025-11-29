const jwt = require('jsonwebtoken');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map de userId -> socketId
  }

  initialize(io) {
    this.io = io;
    this.io.on('connection', (socket) => this.handleConnection(socket));

    // Hacer funciones helper globales (para compatibilidad con controladores existentes)
    global.io = io;
    global.emitNotification = this.emitNotification.bind(this);
    global.emitMessage = this.emitMessage.bind(this);
    global.emitGroupMessage = this.emitGroupMessage.bind(this);
    global.emitMeetingUpdate = this.emitMeetingUpdate.bind(this);
  }

  handleConnection(socket) {
    console.log('🔌 Cliente conectado:', socket.id);

    // Autenticación
    socket.on('authenticate', (data) => this.handleAuthenticate(socket, data));

    // Suscripciones
    socket.on('subscribeNotifications', (data) => this.handleSubscribeNotifications(socket, data));
    socket.on('subscribeConversation', (data) => this.handleSubscribeConversation(socket, data));
    socket.on('subscribeGroup', (data) => this.handleSubscribeGroup(socket, data));
    socket.on('unsubscribeGroup', (data) => this.handleUnsubscribeGroup(socket, data));
    socket.on('subscribeMeetings', (data) => this.handleSubscribeMeetings(socket, data));
    socket.on('unsubscribeMeetings', (data) => this.handleUnsubscribeMeetings(socket, data));

    // Desconexión
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('error', (error) => console.error('❌ Error en socket:', error));
  }

  async handleAuthenticate(socket, data) {
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
      this.connectedUsers.set(userId.toString(), socket.id);

      console.log(`✅ Usuario autenticado: ${userId} -> Socket: ${socket.id}`);
      socket.emit('authenticated', { userId, message: 'Autenticado correctamente' });
    } catch (error) {
      console.error('❌ Error al autenticar socket:', error.message);
      socket.emit('error', { message: 'Token inválido' });
    }
  }

  handleSubscribeNotifications(socket, { userId }) {
    if (socket.userId) {
      socket.join(`notifications:${userId}`);
      console.log(`📬 Usuario ${userId} suscrito a notificaciones`);
    }
  }

  handleSubscribeConversation(socket, { conversationId }) {
    if (socket.userId) {
      socket.join(`conversation:${conversationId}`);
      console.log(`💬 Usuario ${socket.userId} se unió a conversación ${conversationId}`);
    }
  }

  handleSubscribeGroup(socket, { groupId }) {
    if (socket.userId) {
      socket.join(`group:${groupId}`);
      console.log(`👥 Usuario ${socket.userId} se unió al grupo ${groupId}`);
      socket.emit('subscribedToGroup', { groupId });
    }
  }

  handleUnsubscribeGroup(socket, { groupId }) {
    if (socket.userId) {
      socket.leave(`group:${groupId}`);
      console.log(`👥 Usuario ${socket.userId} salió del grupo ${groupId}`);
    }
  }

  handleSubscribeMeetings(socket, { userId }) {
    if (socket.userId) {
      socket.join(`meetings:${userId}`);
      console.log(`📅 Usuario ${userId} suscrito a actualizaciones de reuniones`);
    }
  }

  handleUnsubscribeMeetings(socket, { userId }) {
    if (socket.userId) {
      socket.leave(`meetings:${userId}`);
      console.log(`📅 Usuario ${userId} desuscrito de reuniones`);
    }
  }

  handleDisconnect(socket) {
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId.toString());
      console.log(`❌ Usuario ${socket.userId} desconectado`);
    }
    console.log('🔌 Cliente desconectado:', socket.id);
  }

  // Helper methods (Globales)
  emitNotification(userId, notification) {
    if (!this.io) return;
    this.io.to(`notifications:${userId}`).emit('newNotification', notification);
    console.log(`📨 Notificación emitida a usuario ${userId}:`, notification);
  }

  emitMessage(conversationId, message) {
    if (!this.io) return;
    this.io.to(`conversation:${conversationId}`).emit('newMessage', message);
    console.log(`💬 Mensaje emitido a conversación ${conversationId}`);
  }

  emitGroupMessage(groupId, message) {
    if (!this.io) return;
    this.io.to(`group:${groupId}`).emit('newGroupMessage', message);
    console.log(`👥 Mensaje emitido al grupo ${groupId}`);
  }

  emitMeetingUpdate(attendeeIds, meeting, eventType = 'update') {
    if (!this.io) return;
    attendeeIds.forEach(userId => {
      this.io.to(`meetings:${userId}`).emit('meetingUpdate', {
        type: eventType,
        meeting: meeting
      });
    });
    console.log(`📅 Actualización de reunión emitida a ${attendeeIds.length} usuarios - Tipo: ${eventType}`);
  }
}

module.exports = new SocketService();
