const ArenaMatch = require('../models/ArenaMatch.model');
const UserV2 = require('../models/User.model');

class ArenaSocketService {
  constructor() {
    this.io = null;
    this.connectedUsersMap = null;

    // Cola simple de Matchmaking en memoria (Opcionalmente Redis si hay varios Workers)
    this.matchmakingQueue = [];
  }

  initialize(io, socket, connectedUsersMap) {
    this.io = io;
    this.connectedUsersMap = connectedUsersMap;

    // Escuchar eventos desde el cliente de Arena
    socket.on('arena:findMatch', (data) => this.handleFindMatch(socket, data));
    socket.on('arena:cancelSearch', () => this.handleCancelSearch(socket));
    socket.on('arena:submitAnswer', (data) => this.handleSubmitAnswer(socket, data));

    // Desconexion manejada por socketService.js principal, 
    // pero si el user se desconecta limpiar de la cola
    socket.on('disconnect', () => this.handleCancelSearch(socket));
  }

  async handleFindMatch(socket, data) {
    if (!socket.userId) return;
    console.log(`🎮 [ARENA] Usuario ${socket.userId} buscando partida - Modo: ${data.mode || 'arena'}`);

    // Prevenir duplicados en cola
    const isAlreadyInQueue = this.matchmakingQueue.find(p => p.userId === socket.userId);
    if (!isAlreadyInQueue) {
      this.matchmakingQueue.push({
        userId: socket.userId,
        socketId: socket.id,
        rating: data.rating || 0
      });
    }

    // Intentar emparejar (Lógica muy básica: los primeros 2 en cola)
    if (this.matchmakingQueue.length >= 2) {
      const p1 = this.matchmakingQueue.shift();
      const p2 = this.matchmakingQueue.shift(); // Saca el siguiente de la cola

      try {
        // 1. Crear Match en DB
        const newMatch = new ArenaMatch({
          mode: 'arena',
          status: 'active',
          player1: p1.userId,
          player2: p2.userId,
          gameState: {
            dominationTotal: 100,
            currentDomination: 50, // Comienza en el centro
            player1Health: 3,
            player2Health: 3,
            player1Streak: 0,
            player2Streak: 0,
            currentRoundNum: 1
          }
        });
        await newMatch.save();

        const roomId = `match:${newMatch._id}`;

        // 2. Unir sockets a la Room y notificar
        this.joinToRoom(p1.socketId, roomId);
        this.joinToRoom(p2.socketId, roomId);

        // Fetch User Data for Avatars
        const user1 = await UserV2.findById(p1.userId).select('nombres apellidos social arena');
        const user2 = await UserV2.findById(p2.userId).select('nombres apellidos social arena');

        // Notificar al Jugador 1 con datos del Oponente 2
        this.io.to(p1.socketId).emit('arena:matchFound', {
          matchId: newMatch._id,
          player1Id: p1.userId,
          player2Id: p2.userId,
          opponent: user2
        });

        // Notificar al Jugador 2 con datos del Oponente 1
        this.io.to(p2.socketId).emit('arena:matchFound', {
          matchId: newMatch._id,
          player1Id: p1.userId,
          player2Id: p2.userId,
          opponent: user1
        });

        console.log(`⚔️ [ARENA] Partida Creada: ${newMatch._id} (${p1.userId} vs ${p2.userId})`);

        // 3. Empezar primera ronda luego de 7 segundos visuales (MOCK de carga)
        setTimeout(() => {
          console.log(`🚀 [ARENA] Enviando roundStart para partida ${newMatch._id}`);
          this.io.to(roomId).emit('arena:roundStart', {
            roundNum: 1,
            // MOCK: Generar un ID de pregunta aleatorio que los clientes usen para buscar el JSON local
            questionId: Math.floor(Math.random() * 10).toString()
          });
        }, 7000);

      } catch (error) {
        console.error('❌ [ARENA] Error creando partida:', error);
      }
    }
  }

  handleCancelSearch(socket) {
    const queueLengthBefore = this.matchmakingQueue.length;
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.userId !== socket.userId);

    if (this.matchmakingQueue.length < queueLengthBefore) {
      console.log(`🛑 [ARENA] Usuario ${socket.userId} canceló búsqueda. Queue size: ${this.matchmakingQueue.length}`);
    }
  }

  async handleSubmitAnswer(socket, data) {
    try {
      // data = { matchId, questionId, correct: boolean, timeMs: number }
      const match = await ArenaMatch.findById(data.matchId);
      if (!match || match.status !== 'active') return;

      const roomId = `match:${match._id}`;
      const isPlayer1 = match.player1.toString() === socket.userId;

      // === LOGICA TUG-OF-WAR (DOMINACION) ===
      let pushValue = 0;
      let basePush = 10;

      if (data.correct) {
        // Calcula empuje adicional por rapidez (ej: si timeMs < 2000 => push extra)
        const timeBonus = Math.max(0, (5000 - (data.timeMs || 5000)) / 500); // Hasta +10 extra si fue muy veloz
        pushValue = basePush + timeBonus;

        // Modificar Streak
        if (isPlayer1) match.gameState.player1Streak += 1;
        else match.gameState.player2Streak += 1;

      } else {
        // Reducir vida por equivocarse
        if (isPlayer1) {
          match.gameState.player1Health -= 1;
          match.gameState.player1Streak = 0; // Rompe racha
        } else {
          match.gameState.player2Health -= 1;
          match.gameState.player2Streak = 0;
        }
      }

      // Aplicar empuje a la barra
      // Si Player 1 acierta suma a la barra. Si P2 acierta resta a la barra.
      if (data.correct) {
        if (isPlayer1) match.gameState.currentDomination += pushValue;
        else match.gameState.currentDomination -= pushValue;
      }

      // Guardar cambio
      await match.save();

      // Transmitir nuevo estado de la partida a ambos
      this.io.to(roomId).emit('arena:gameStateUpdate', {
        domination: match.gameState.currentDomination,
        health1: match.gameState.player1Health,
        health2: match.gameState.player2Health,
        streak1: match.gameState.player1Streak,
        streak2: match.gameState.player2Streak,
        lastActionBy: socket.userId,
        wasCorrect: data.correct
      });

      // === CHECKEAR VICTORIA O DERROTA ===
      const D = match.gameState.currentDomination;
      const H1 = match.gameState.player1Health;
      const H2 = match.gameState.player2Health;

      let winnerId = null;

      if (D >= 100 || H2 <= 0) {
        winnerId = match.player1;
      } else if (D <= 0 || H1 <= 0) {
        winnerId = match.player2;
      }

      if (winnerId) {
        // Terminar partida
        match.status = 'completed';
        match.winner = winnerId;
        await match.save();

        this.io.to(roomId).emit('arena:matchEnded', {
          winnerId: winnerId,
          reason: D >= 100 || D <= 0 ? 'domination' : 'health_depleted'
        });

        // Actualizar Puntos (PG) en los usuarios. Aprox +25 Gana, -10 Pierde.
        await this.awardPGRewards(match, winnerId);

        // Expulsar de la sala
        this.io.in(roomId).socketsLeave(roomId);
      } else {
        // Pasar a siguiente ronda (MOCK continuo para prototipo)
        setTimeout(() => {
          this.io.to(roomId).emit('arena:roundStart', {
            roundNum: match.gameState.currentRoundNum + 1,
            questionId: Math.floor(Math.random() * 10).toString()
          });
        }, 4000); // 4 segs pa procesar animacion y ver resultado anterior
      }
    } catch (e) {
      console.error('❌ [ARENA] Error procesando answer:', e);
    }
  }

  joinToRoom(socketId, roomId) {
    if (!this.io) return;
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) socket.join(roomId);
  }

  async awardPGRewards(match, winnerId) {
    try {
      const isPlayer1Winner = match.player1.toString() === winnerId.toString();
      const loserId = isPlayer1Winner ? match.player2 : match.player1;

      // Sumar PG Winner +30, Restar PG Loser -10
      await UserV2.findByIdAndUpdate(winnerId, {
        $inc: { 'arena.rankPoints': 30, 'arena.statsByMode.arena.wins': 1, 'arena.statsByMode.arena.gamesPlayed': 1 }
      });

      await UserV2.findByIdAndUpdate(loserId, {
        $inc: { 'arena.rankPoints': -10, 'arena.losses': 1, 'arena.statsByMode.arena.gamesPlayed': 1 }
      });

      console.log(`🏆 [ARENA] PG Awards Emitidos: Vencedor(${winnerId}) +30 PG, Perdedor(${loserId}) -10 PG`);
    } catch (err) {
      console.error("Error al dar rank points:", err);
    }
  }
}

module.exports = new ArenaSocketService();
