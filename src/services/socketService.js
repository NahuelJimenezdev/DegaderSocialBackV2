const jwt = require('jsonwebtoken');
const UserV2 = require('../models/User.model');
const Friendship = require('../models/Friendship');

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
    global.emitPostUpdate = this.emitPostUpdate.bind(this);
  }

  handleConnection(socket) {
    console.log('🔌 Cliente conectado:', socket.id);
    console.log('   Transporte:', socket.conn.transport.name);
    console.log('   IP:', socket.handshake.address);
    console.log('   Headers:', JSON.stringify(socket.handshake.headers, null, 2));

    // Autenticación
    socket.on('authenticate', (data) => this.handleAuthenticate(socket, data));

    // Suscripciones
    socket.on('subscribeNotifications', (data) => this.handleSubscribeNotifications(socket, data));
    socket.on('subscribeConversation', (data) => this.handleSubscribeConversation(socket, data));
    socket.on('unsubscribeConversation', (data) => this.handleUnsubscribeConversation(socket, data));
    socket.on('subscribeGroup', (data) => this.handleSubscribeGroup(socket, data));
    socket.on('unsubscribeGroup', (data) => this.handleUnsubscribeGroup(socket, data));
    socket.on('subscribeMeetings', (data) => this.handleSubscribeMeetings(socket, data));
    socket.on('unsubscribeMeetings', (data) => this.handleUnsubscribeMeetings(socket, data));

    // Indicador de escritura (Global Chat)
    socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
    socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));

    // Estado de mensajes
    socket.on('message_read', (data) => this.handleMessageRead(socket, data));

    // Generic room management (for Iglesias, etc.)
    socket.on('joinRoom', (room) => {
      if (typeof room === 'string') {
        socket.join(room);
        console.log(`🔌 [JOIN] Socket ${socket.id} (User: ${socket.userId}) joined room: ${room}`);
      }
    });

    socket.on('leaveRoom', (room) => {
      if (typeof room === 'string') {
        socket.leave(room);
        console.log(`🔌 [LEAVE] Socket ${socket.id} (User: ${socket.userId}) left room: ${room}`);
      }
    });

    // Desconexión
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('error', (error) => {
      console.error('❌ Error en socket:', socket.id, error);
    });
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

      console.log('🔐 [AUTH] Iniciando autenticación para usuario:', userId);

      // Guardar relación userId <-> socketId
      socket.userId = userId;
      this.connectedUsers.set(userId.toString(), socket.id);

      // Unirse a la sala personal del usuario (para eventos generales dirigidos al usuario)
      socket.join(`user:${userId}`);

      console.log('🔐 [AUTH] Usuario unido a sala:', `user:${userId}`);
      console.log('👀 [DEBUG] Salas actuales del socket:', Array.from(socket.rooms));

      // Actualizar ultimaConexion en la base de datos
      console.log('💾 [DB] Actualizando ultimaConexion para:', userId);
      await this.updateUserOnlineStatus(userId, true);

      // Notificar a amigos que el usuario se conectó
      console.log('📡 [NOTIFY] Notificando a amigos sobre conexión de:', userId);
      await this.notifyFriendsStatusChange(userId, true);

      // Enviar estado inicial de amigos online
      await this.sendInitialOnlineFriends(socket, userId);

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

  handleUnsubscribeConversation(socket, { conversationId }) {
    if (socket.userId) {
      socket.leave(`conversation:${conversationId}`);
      console.log(`💬 Usuario ${socket.userId} salió de conversación ${conversationId}`);
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

  handleTypingStart(socket, { recipientId, conversationId }) {
    if (socket.userId && recipientId) {
      console.log(`✍️ [SOCKET] Typing Start: User ${socket.userId} -> Recipient ${recipientId} (Conv: ${conversationId})`);
      // Emitir evento a la sala personal del receptor
      // Esto es más seguro que emitir a toda la conversación si no queremos broadcast masivo
      // O podemos emitir a la sala de conversación si ambos están suscritos
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing_start', {
          userId: socket.userId,
          conversationId
        });
      } else {
        // Fallback: emitir directo al usuario si no hay conversationId (nuevo chat)
        socket.to(`user:${recipientId}`).emit('user_typing_start', {
          userId: socket.userId
        });
      }
      // console.log(`✍️ Usuario ${socket.userId} escribiendo a ${recipientId}`);
    }
  }

  handleTypingStop(socket, { recipientId, conversationId }) {
    if (socket.userId && recipientId) {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing_stop', {
          userId: socket.userId,
          conversationId
        });
      } else {
        socket.to(`user:${recipientId}`).emit('user_typing_stop', {
          userId: socket.userId
        });
      }
    }
  }

  // Confirmación de lectura
  async handleMessageRead(socket, { conversationId, messageId, readerId }) {
    console.log(`👁️ [SOCKET] Message Read: User ${readerId} (Socket User: ${socket.userId}) in Conv ${conversationId}`);
    try {
      const Conversation = require('../models/Conversation');
      // Buscar conversación
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Si se pasa messageId, marcar ese y anteriores. Si no, marcar todos los no leídos de otros.
      // Simplificación: usaremos el método marcarComoLeido del modelo que ya maneja "todos"
      if (!messageId) {
        await conversation.marcarComoLeido(readerId);

        // Notificar a los OTROS participantes que sus mensajes fueron leídos
        conversation.participantes.forEach(p => {
          if (p.toString() !== readerId) {
            this.io.to(`user:${p}`).emit('messages_read_update', {
              conversationId,
              readerId,
              readAt: new Date()
            });
          }
        });
      }
    } catch (e) {
      console.error("Error en handleMessageRead", e);
    }
  }

  async handleDisconnect(socket) {
    if (socket.userId) {
      const userId = socket.userId;
      this.connectedUsers.delete(userId.toString());

      // Actualizar ultimaConexion en la base de datos
      await this.updateUserOnlineStatus(userId, false);

      // Notificar a amigos que el usuario se desconectó
      await this.notifyFriendsStatusChange(userId, false);

      console.log(`❌ Usuario ${userId} desconectado`);
    }
    console.log('🔌 Cliente desconectado:', socket.id);
  }

  // Helper methods (Globales)
  emitNotification(userId, notification) {
    if (!this.io) {
      console.error('❌ [SOCKET SERVICE] IO no inicializado');
      return;
    }
    const roomName = `user:${userId}`;
    const roomExists = this.io.sockets.adapter.rooms.has(roomName);

    console.log(`📨 [SOCKET SERVICE] Emitiendo notificación a ${userId}`);
    console.log(`   Sala ${roomName} existe? ${roomExists}`);
    console.log(`   Contenido: ${notification.tipo} - ${notification.contenido.substring(0, 30)}...`);

    // Usar la sala 'user' que es automática tras autenticación, más robusto que 'notifications' manual
    this.io.to(roomName).emit('newNotification', notification);
  }

  emitMessage(conversationId, message, participants = []) {
    if (!this.io) return;

    // 1. Emitir a la sala de la conversación (para quien la tiene abierta)
    this.io.to(`conversation:${conversationId}`).emit('newMessage', message);
    console.log(`💬 Mensaje emitido a conversación ${conversationId}`);

    // 2. Emitir a la sala personal de CADA participante (para notificaciones globales)
    if (participants && participants.length > 0) {
      participants.forEach(participant => {
        const userId = participant._id || participant; // Manejar objeto o ID
        // No emitir al emisor (opcional, pero el frontend suele manejar su propio mensaje optimista)
        // Aunque para contadores globales, es mejor emitir a todos y que el front decida
        this.io.to(`user:${userId}`).emit('newMessage', message);
      });
      console.log(`📨 Mensaje notificado a ${participants.length} usuarios`);
    }
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

  async emitPostUpdate(post) {
    if (!this.io) return;

    try {
      const authorId = post.usuario?._id || post.usuario;

      // Si el post es de un grupo, emitir a todos los miembros del grupo
      if (post.grupo) {
        this.io.to(`group:${post.grupo}`).emit('post_updated', post);
        console.log(`📢 Post de grupo emitido: ${post._id} -> Grupo: ${post.grupo}`);
        return;
      }

      // Buscar amigos del autor
      const friendships = await Friendship.find({
        $or: [
          { solicitante: authorId, estado: 'aceptada' },
          { receptor: authorId, estado: 'aceptada' }
        ]
      }).select('solicitante receptor');

      // Extraer IDs de amigos
      const friendIds = friendships.map(friendship => {
        if (friendship.solicitante.toString() === authorId.toString()) {
          return friendship.receptor.toString();
        } else {
          return friendship.solicitante.toString();
        }
      });

      // Emitir al autor mismo
      this.io.to(`user:${authorId}`).emit('post_updated', post);

      // Emitir a cada amigo
      friendIds.forEach(friendId => {
        this.io.to(`user:${friendId}`).emit('post_updated', post);
      });

      console.log(`📢 Post emitido: ${post._id} -> Autor + ${friendIds.length} amigos`);
    } catch (error) {
      console.error('❌ Error al emitir post update:', error);
      // Fallback: emitir solo al autor
      const authorId = post.usuario?._id || post.usuario;
      this.io.to(`user:${authorId}`).emit('post_updated', post);
    }
  }

  // Métodos para estado online/offline
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      console.log(`💾 [DB UPDATE] Actualizando estado para ${userId}:`, isOnline ? 'ONLINE' : 'OFFLINE');

      const result = await UserV2.findByIdAndUpdate(userId, {
        'seguridad.ultimaConexion': new Date()
      }, { new: true });

      if (result) {
        console.log(`✅ [DB UPDATE] Estado actualizado exitosamente:`, {
          userId,
          ultimaConexion: result.seguridad?.ultimaConexion,
          isOnline: isOnline ? 'ONLINE' : 'OFFLINE'
        });
      } else {
        console.error(`❌ [DB UPDATE] Usuario no encontrado:`, userId);
      }
    } catch (error) {
      console.error('❌ [DB UPDATE] Error actualizando estado online:', error);
    }
  }

  async notifyFriendsStatusChange(userId, isOnline) {
    try {
      console.log(`📡 [NOTIFY] Buscando amigos de usuario:`, userId);

      // Buscar amistades aceptadas donde el usuario es solicitante o receptor
      const friendships = await Friendship.find({
        $or: [
          { solicitante: userId, estado: 'aceptada' },
          { receptor: userId, estado: 'aceptada' }
        ]
      }).select('solicitante receptor');

      if (!friendships || friendships.length === 0) {
        console.log(`ℹ️ [NOTIFY] Usuario ${userId} no tiene amigos en Friendship collection`);
        return;
      }

      // Extraer IDs de amigos (el que NO es el usuario actual)
      const friendIds = friendships.map(friendship => {
        if (friendship.solicitante.toString() === userId.toString()) {
          return friendship.receptor.toString();
        } else {
          return friendship.solicitante.toString();
        }
      });

      console.log(`👥 [NOTIFY] Usuario tiene ${friendIds.length} amigos:`, friendIds);

      // Emitir evento a cada amigo
      const statusEvent = {
        userId: userId.toString(),
        isOnline,
        timestamp: new Date().toISOString()
      };

      console.log(`📤 [NOTIFY] Emitiendo evento:`, statusEvent);

      let notifiedCount = 0;
      friendIds.forEach(friendId => {
        const roomName = `user:${friendId}`;
        console.log(`📨 [NOTIFY] Enviando a sala:`, roomName);
        this.io.to(roomName).emit('friend_status_changed', statusEvent);
        notifiedCount++;
      });

      console.log(`✅ [NOTIFY] Estado emitido a ${notifiedCount} amigos: ${userId} -> ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
      console.error('❌ [NOTIFY] Error notificando cambio de estado:', error);
    }
  }

  async sendInitialOnlineFriends(socket, userId) {
    try {
      console.log(`🔄 [INITIAL] Enviando estado inicial de amigos para:`, userId);

      // Buscar amistades aceptadas
      const friendships = await Friendship.find({
        $or: [
          { solicitante: userId, estado: 'aceptada' },
          { receptor: userId, estado: 'aceptada' }
        ]
      }).select('solicitante receptor');

      if (!friendships || friendships.length === 0) {
        console.log(`ℹ️ [INITIAL] Usuario ${userId} no tiene amigos`);
        return;
      }

      // Extraer IDs de amigos
      const friendIds = friendships.map(friendship => {
        if (friendship.solicitante.toString() === userId.toString()) {
          return friendship.receptor.toString();
        } else {
          return friendship.solicitante.toString();
        }
      });

      console.log(`👥 [INITIAL] Verificando estado de ${friendIds.length} amigos`);

      // Verificar cuáles amigos están online
      const onlineFriends = friendIds.filter(friendId =>
        this.connectedUsers.has(friendId)
      );

      console.log(`✅ [INITIAL] ${onlineFriends.length} amigos online:`, onlineFriends);

      // Enviar evento para cada amigo online
      onlineFriends.forEach(friendId => {
        const statusEvent = {
          userId: friendId,
          isOnline: true,
          timestamp: new Date().toISOString()
        };
        socket.emit('friend_status_changed', statusEvent);
        console.log(`📤 [INITIAL] Enviado estado de ${friendId}: ONLINE`);
      });

    } catch (error) {
      console.error('❌ [INITIAL] Error enviando estado inicial:', error);
    }
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }
}

module.exports = new SocketService();
