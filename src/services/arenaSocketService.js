const ArenaMatch = require('../models/ArenaMatch.model');
const UserV2 = require('../models/User.model');
const Challenge = require('../models/Challenge.model');
const eventBus = require('../infrastructure/events/eventBus');

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
    // pero si el user se desconecta limpiar de la cola o declarar derrota
    socket.on('disconnect', async () => {
      this.handleCancelSearch(socket);
      if (socket.activeMatchId) {
        await this.handlePlayerDisconnection(socket.activeMatchId, socket.userId);
      }
    });
  }

  async handlePlayerDisconnection(matchId, disconnectedUserId) {
    try {
      const match = await ArenaMatch.findById(matchId);
      if (!match || match.status !== 'active') return;

      console.log(`🔌 [ARENA] Abandono detectado: Player ${disconnectedUserId} huyó de la partida ${matchId}.`);
      
      const winnerId = match.player1.toString() === disconnectedUserId ? match.player2 : match.player1;

      match.status = 'completed';
      match.winner = winnerId;
      await match.save();

      const roomId = `match:${match._id}`;
      this.io.to(roomId).emit('arena:matchEnded', {
        winnerId: winnerId,
        reason: 'opponent_abandoned'
      });

      await this.awardPGRewards(match, winnerId);
      this.io.in(roomId).socketsLeave(roomId);
    } catch (e) {
      console.error('Error al manejar desconexion en partida', e);
    }
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
        // 0. Extraer 10 preguntas reales de la Base de Datos (Tolera creadas a mano sin metadata)
        const questionsDB = await Challenge.aggregate([
          { $match: { $or: [{ 'metadata.active': true }, { metadata: { $exists: false } }] } },
          { $sample: { size: 10 } }
        ]);

        const questionsArray = questionsDB.map(q => ({
            _id: q._id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            xpReward: q.xpReward
        }));

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
            currentRoundNum: 1,
            questions: questionsArray,
            currentQuestionId: questionsArray.length > 0 ? questionsArray[0]._id : null
          }
        });
        await newMatch.save();

        const roomId = `match:${newMatch._id}`;

        // 2. Unir sockets a la Room y notificar
        this.joinToRoom(p1.socketId, roomId);
        this.joinToRoom(p2.socketId, roomId);
        
        // Atar socket local al partido para el evento Disconnect
        const s1 = this.io.sockets.sockets.get(p1.socketId);
        if (s1) s1.activeMatchId = newMatch._id;
        const s2 = this.io.sockets.sockets.get(p2.socketId);
        if (s2) s2.activeMatchId = newMatch._id;

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

        // 3. Empezar primera ronda luego de 10 segundos visuales (MOCK de carga en UI)
        // Esto previene Race Conditions (asegura que el componente React ya se haya montado al emitir)
        setTimeout(() => {
          console.log(`🚀 [ARENA] Enviando roundStart a sala ${roomId} para partida ${newMatch._id}`);
          if (questionsArray.length === 0) {
            console.log('⚠️ [ARENA] ¡ATENCIÓN! questionsArray vino VACÍO de MongoDB.');
          }
          const q = questionsArray[0];
          
          const payload = {
            roundNum: 1,
            questionId: q ? q._id.toString() : null,
            question: q ? {
              _id: q._id,
              question: q.question,
              options: q.options,
              xpReward: q.xpReward
            } : null
          };

          // Disparo redundante por seguridad: Si la Room falla, lo forzamos a ambos sockets
          this.io.to(roomId).emit('arena:roundStart', payload);
          this.io.to(p1.socketId).emit('arena:roundStart', payload);
          this.io.to(p2.socketId).emit('arena:roundStart', payload);

        }, 10000);

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
      // data = { matchId, questionId, selectedOptionId, correct: boolean (legacy), timeMs: number }
      const match = await ArenaMatch.findById(data.matchId);
      if (!match || match.status !== 'active') return;

      const roomId = `match:${match._id}`;
      const isPlayer1 = match.player1.toString() === socket.userId;

      // === VALIDACIÓN DEL SERVER (ANTI-CHEAT) ===
      let isCorrect = false;
      const currentQuestion = match.gameState.questions[match.gameState.currentRoundNum - 1];
      
      // === MECÁNICA ULTRA-HARDCORE (ROBO DE PREGUNTA) ===
      // Si el cliente envía una respuesta a una pregunta que ya no es la activa (porque el rival fue más rápido)
      if (data.questionId && currentQuestion && data.questionId.toString() !== currentQuestion._id.toString()) {
          console.log(`⏱️ [ARENA] ¡Robo de Pregunta! Jugador ${socket.userId} respondió tarde. Su respuesta a ${data.questionId} fue descartada.`);
          return; 
      }

      if (currentQuestion && data.selectedOptionId) {
          isCorrect = data.selectedOptionId === currentQuestion.correctAnswer;
      } else {
          // Exploit de Legacy cerrado. Cualquier peticion mal formulada se declara trampa / error.
          isCorrect = false;
      }

      // === LOGICA TUG-OF-WAR (DOMINACION) ===
      let pushValue = 0;
      let basePush = 10;

      if (isCorrect) {
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
      if (isCorrect) {
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
        wasCorrect: isCorrect
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
        // Pasar a siguiente ronda
        match.gameState.currentRoundNum += 1;

        // Si la ronda actual excede la sumatoria de preguntas, se termina el pleito por muerte súbita
        if (match.gameState.currentRoundNum > match.gameState.questions.length) {
            console.log(`⚠️ [ARENA] Fin Secreto: Sin preguntas restantes. Partida ${match._id} finalizada por Muerte Súbita.`);
            winnerId = match.gameState.currentDomination >= 50 ? match.player1 : match.player2;
            
            match.status = 'completed';
            match.winner = winnerId;
            await match.save();

            this.io.to(roomId).emit('arena:matchEnded', {
              winnerId: winnerId,
              reason: 'questions_depleted'
            });

            await this.awardPGRewards(match, winnerId);
            this.io.in(roomId).socketsLeave(roomId);
            return;
        }

        await match.save();

        setTimeout(() => {
          const nextQ = match.gameState.questions[match.gameState.currentRoundNum - 1];
          const payload = {
            roundNum: match.gameState.currentRoundNum,
            questionId: nextQ ? nextQ._id.toString() : null,
            question: nextQ ? {
              _id: nextQ._id,
              question: nextQ.question,
              options: nextQ.options,
              xpReward: nextQ.xpReward
            } : null
          };

          this.io.to(roomId).emit('arena:roundStart', payload);
          // Redundancia por seguridad a ambos jugadores
          this.io.to(match.player1.toString()).emit('arena:roundStart', payload); // Podría no funcionar si emitimos a userId sin auth rooms.
        }, 4000); // 4 segs pa procesar animacion y ver resultado anterior
      }
    } catch (e) {
      console.error('❌ [ARENA] Error procesando answer:', e);
    }
  }

  joinToRoom(socketId, roomId) {
    if (!this.io) return;
    try {
      // Método universal y moderno de Socket.IO para inscribir sockets cruzados a salas
      this.io.in(socketId).socketsJoin(roomId);
      console.log(`🔗 [ARENA] Socket ${socketId} emparejado forzosamente a la sala: ${roomId}`);
    } catch (error) {
      console.error(`❌ [ARENA] Error uniendo socket ${socketId} a room ${roomId}:`, error);
    }
  }

  async awardPGRewards(match, winnerId) {
    try {
      const isPlayer1Winner = match.player1.toString() === winnerId.toString();
      const loserId = isPlayer1Winner ? match.player2 : match.player1;

      // Sumar PG Winner +30, Restar PG Loser -10, y popular info para Redis Event Bus
      const winnerDoc = await UserV2.findByIdAndUpdate(winnerId, {
        $inc: { 'arena.rankPoints': 30, 'arena.wins': 1, 'arena.statsByMode.arena.wins': 1, 'arena.statsByMode.arena.gamesPlayed': 1 }
      }, { new: true });

      const loserDoc = await UserV2.findByIdAndUpdate(loserId, {
        $inc: { 'arena.rankPoints': -10, 'arena.losses': 1, 'arena.statsByMode.arena.gamesPlayed': 1 }
      }, { new: true });

      console.log(`🏆 [ARENA] PG Awards Emitidos: Vencedor(${winnerId}) +30 PG, Perdedor(${loserId}) -10 PG`);

      // 🏆 Disparar evento para actualizar el Leaderboard (Redis Rank Cache)
      if (winnerDoc) {
        eventBus.emit(eventBus.constructor.Events.ARENA_GAME_COMPLETED, {
            userId: winnerId,
            rankPoints: winnerDoc.arena.rankPoints,
            country: winnerDoc.arena.country || winnerDoc.personal?.ubicacion?.pais,
            state: winnerDoc.personal?.ubicacion?.estado
        });
      }
      if (loserDoc) {
        eventBus.emit(eventBus.constructor.Events.ARENA_GAME_COMPLETED, {
            userId: loserId,
            rankPoints: loserDoc.arena.rankPoints,
            country: loserDoc.arena.country || loserDoc.personal?.ubicacion?.pais,
            state: loserDoc.personal?.ubicacion?.estado
        });
      }

    } catch (err) {
      console.error("Error al dar rank points:", err);
    }
  }
}

module.exports = new ArenaSocketService();
