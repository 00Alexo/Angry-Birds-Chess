require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple WebSocket setup - no authentication for now, just test connection
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing
    methods: ["GET", "POST"]
  }
});

// Verbose Socket.IO engine diagnostics for debugging WS issues
io.engine.on('connection_error', (err) => {
  try {
    console.error('❌ [WS][Engine] connection_error', {
      code: err.code,
      message: err.message,
      context: err.context
    });
  } catch (_) {
    console.error('❌ [WS][Engine] connection_error');
  }
});

// Observe raw HTTP upgrade attempts (useful if a proxy blocks upgrades)
server.on('upgrade', (req, socket) => {
  try {
    const ua = req.headers['user-agent'];
    const origin = req.headers['origin'] || req.headers['referer'];
    console.log(`⬆️  [HTTP] upgrade attempt url=${req.url} origin=${origin || 'n/a'} ua=${ua || 'n/a'}`);
  } catch (_) {}
});

// Store active games
const activeGames = new Map();
// Track online multiplayer presence by socket id
const onlinePlayers = new Map();
// Track matchmaking queues
const matchmakingQueues = {
  competitive: new Map(), // socketId -> { player, queueTime, ratingRange }
  unranked: new Map()
};
// Store active matches
const activeMatches = new Map(); // matchId -> { player1, player2, gameState, startTime }

io.on('connection', (socket) => {
  try {
    const transport = socket.conn.transport.name;
    const origin = socket.handshake.headers?.origin || socket.handshake.headers?.referer;
    console.log(`🔌 [WebSocket] New connection id=${socket.id} transport=${transport} origin=${origin || 'n/a'}`);
  } catch (_) {
    console.log('🔌 [WebSocket] New connection:', socket.id);
  }

  // Log transport upgrades
  try {
    socket.conn.on('upgrade', (t) => {
      console.log(`⤴️  [WebSocket] Transport upgraded id=${socket.id} -> ${t?.name || t}`);
    });
    socket.conn.on('close', (reason) => {
      console.log(`🔒 [WebSocket] Conn closed id=${socket.id} reason=${reason}`);
    });
  } catch (_) {}

  // Test connection
  socket.emit('connected', { message: 'Connected to WebSocket server', socketId: socket.id });

  // Handle game start
  socket.on('start-game', (data) => {
    console.log('🎮 [WebSocket] Game start request:', data);
    
    const gameId = `game_${socket.id}_${Date.now()}`;
    const gameSession = {
      socketId: socket.id,
      ...data,
      startTime: new Date(),
      moves: 0,       // move count
      moveList: []    // detailed moves for fallback (abandoned games)
    };
    
    // Store multiplayer-specific data if this is a multiplayer game
    if (data.isMultiplayer && data.matchId) {
      gameSession.isMultiplayer = true;
      gameSession.matchId = data.matchId;
      console.log(`🎮 [Multiplayer] Storing multiplayer game session for match ${data.matchId}`);
    }
    
    activeGames.set(gameId, gameSession);

    if (data.userId) {
      console.log(`🆔 [WebSocket] Stored userId ${data.userId} for game ${gameId}`);
    } else {
      console.log(`⚠️ [WebSocket] No userId provided on start for game ${gameId}`);
    }

    console.log(`✅ [WebSocket] Game ${gameId} started`);
    console.log(`📊 [WebSocket] Active games: ${activeGames.size}`);
    
    socket.emit('game-started', { gameId, success: true });
  });

  // Multiplayer presence: user joins multiplayer page
  socket.on('multiplayer:join', (payload = {}) => {
    try {
      const username = (payload.username || 'Player').toString();
      const userId = payload.userId || null;
      const rating = payload.rating || null;
      const status = 'online';
      const player = { socketId: socket.id, username, userId, rating, status, joinedAt: new Date() };
      onlinePlayers.set(socket.id, player);
      console.log(`🟢 [Presence] ${username} joined multiplayer (${socket.id})`);
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    } catch (err) {
      console.error('❌ [Presence] Failed to handle multiplayer:join', err);
    }
  });

  // Multiplayer presence: user status update (online | in-game)
  socket.on('multiplayer:status', (payload = {}) => {
    const status = payload.status === 'in-game' ? 'in-game' : 'online';
    const player = onlinePlayers.get(socket.id);
    if (player) {
      player.status = status;
      onlinePlayers.set(socket.id, player);
      console.log(`🔄 [Presence] ${player.username} status -> ${status}`);
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    }
  });

  // Multiplayer presence: client requests the current list explicitly (avoids race on initial join)
  socket.on('multiplayer:get-online-players', () => {
    try {
      socket.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    } catch (err) {
      console.error('❌ [Presence] Failed to send online players to requester:', err);
    }
  });

  // Matchmaking: Join queue
  socket.on('multiplayer:join-queue', (payload = {}) => {
    try {
      const gameMode = payload.gameMode === 'unranked' ? 'unranked' : 'competitive';
      const player = onlinePlayers.get(socket.id);
      if (!player) {
        console.warn(`⚠️ [Queue] Player not found in presence for ${socket.id}`);
        socket.emit('multiplayer:queue-error', { message: 'Player not found in presence' });
        return;
      }

      console.log(`🎯 [Queue] Processing join request: ${player.username} -> ${gameMode}`);

      // Remove from any existing queue first
      const wasInComp = matchmakingQueues.competitive.delete(socket.id);
      const wasInUnr = matchmakingQueues.unranked.delete(socket.id);
      if (wasInComp || wasInUnr) {
        console.log(`🔄 [Queue] Removed ${player.username} from previous queue`);
      }

      // Add to requested queue
      const queueEntry = {
        socketId: socket.id,
        player: { ...player },
        queueTime: Date.now(),
        gameMode,
        ratingRange: gameMode === 'competitive' ? 200 : 999999 // Wider range for unranked
      };

      matchmakingQueues[gameMode].set(socket.id, queueEntry);
      console.log(`✅ [Queue] ${player.username} joined ${gameMode} queue (${matchmakingQueues[gameMode].size} players total)`);

      // Update player status
      player.status = 'in-queue';
      onlinePlayers.set(socket.id, player);
      console.log(`🔄 [Queue] Updated ${player.username} status to in-queue`);

      // Broadcast updated presence and queue stats
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
      broadcastQueueStats();

      // Try to find a match immediately
      console.log(`🔍 [Queue] Attempting matchmaking for ${gameMode}...`);
      tryMatchmaking(gameMode);

    } catch (err) {
      console.error('❌ [Queue] Failed to join queue:', err);
      socket.emit('multiplayer:queue-error', { message: 'Failed to join queue' });
    }
  });

  // Matchmaking: Leave queue
  socket.on('multiplayer:leave-queue', () => {
    try {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;

      // Remove from all queues
      const wasInCompetitive = matchmakingQueues.competitive.delete(socket.id);
      const wasInUnranked = matchmakingQueues.unranked.delete(socket.id);

      if (wasInCompetitive || wasInUnranked) {
        console.log(`🚫 [Queue] ${player.username} left queue`);
        
        // Update player status
        player.status = 'online';
        onlinePlayers.set(socket.id, player);

        // Broadcast updated presence and queue stats
        io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
        broadcastQueueStats();
      }

    } catch (err) {
      console.error('❌ [Queue] Failed to leave queue:', err);
    }
  });

  // Matchmaking: Get queue stats
  socket.on('multiplayer:get-queue-stats', () => {
    try {
      socket.emit('multiplayer:queue-stats', {
        competitive: matchmakingQueues.competitive.size,
        unranked: matchmakingQueues.unranked.size
      });
    } catch (err) {
      console.error('❌ [Queue] Failed to send queue stats:', err);
    }
  });

  // Handle game end
  socket.on('end-game', async (data) => {
    console.log('🏁 [WebSocket] Game end request:', data);
    
    const { gameId, result } = data;
    let { userId } = data;
    console.log(`🔍 [WebSocket] Debug - gameId: ${gameId}, result: ${result}, userId: ${userId}`);
    
    if (!activeGames.has(gameId)) {
      console.warn(`⚠️ [WebSocket] Game ${gameId} not found`);
      socket.emit('game-error', { message: 'Game not found' });
      return;
    }

    try {
      const gameSession = activeGames.get(gameId);
      // Update moves if client provided explicit count (keep max)
      if (typeof data.moves === 'number') {
        gameSession.moves = Math.max(gameSession.moves || 0, data.moves);
      }
      // Merge provided movesList into session moveList if present
      if (Array.isArray(data.movesList) && data.movesList.length) {
        gameSession.moveList = data.movesList; // trust client final authoritative list
      }
      // Fallback: if userId not provided in end-game payload, try from stored game session
      if (!userId && gameSession.userId) {
        userId = gameSession.userId;
        console.log(`🔄 [WebSocket] Fallback userId from activeGames: ${userId}`);
      }
      console.log(`💾 [WebSocket] Saving game ${gameId} to database:`, { ...data, movesList: Array.isArray(data.movesList) ? `len=${data.movesList.length}` : undefined });
      
      // If userId is provided, save to database
      if (userId) {
        console.log(`🔍 [WebSocket] Looking for user: ${userId}`);
        const user = await User.findById(userId);
        if (user) {
          console.log(`✅ [WebSocket] Found user: ${user.username}`);
          
          // Create game history entry
          const gameEntry = {
            gameId,
            gameType: gameSession.gameType || 'vs-ai',
            opponent: gameSession.opponent || 'AI',
            result: result || 'draw',
            duration: Date.now() - gameSession.startTime.getTime(),
            movesPlayed: data.moves || gameSession.moves || 0,
            moves: (gameSession.moveList && gameSession.moveList.length ? gameSession.moveList : undefined),
            coinsEarned: data.coinsEarned || 0,
            energySpent: 1,
            levelId: gameSession.levelId || null,
            stars: data.stars || null,
            playerColor: 'white',
            endReason: data.endReason || 'completed',
            createdAt: gameSession.startTime
          };

          console.log(`📝 [WebSocket] Creating game entry: movesStored=${gameEntry.moves ? gameEntry.moves.length : 0}`);

          // Add to game history
          user.gameHistory.push(gameEntry);

          // Update player stats
          user.playerData.gamesPlayed = (user.playerData.gamesPlayed || 0) + 1;
          
          if (result === 'win') {
            user.playerData.gamesWon = (user.playerData.gamesWon || 0) + 1;
            user.playerData.currentWinStreak = (user.playerData.currentWinStreak || 0) + 1;
            user.playerData.longestWinStreak = Math.max(
              user.playerData.longestWinStreak || 0,
              user.playerData.currentWinStreak
            );
          } else if (result === 'loss') {
            user.playerData.gamesLost = (user.playerData.gamesLost || 0) + 1;
            user.playerData.currentWinStreak = 0;
          } else if (result === 'draw') {
            user.playerData.gamesDrawn = (user.playerData.gamesDrawn || 0) + 1;
            user.playerData.currentWinStreak = 0;
          }

          // Add play time
          if (gameEntry.duration) {
            user.playerData.totalPlayTime = (user.playerData.totalPlayTime || 0) + gameEntry.duration;
          }

            // Add coins
          if (data.coinsEarned > 0) {
            user.playerData.coins = (user.playerData.coins || 0) + data.coinsEarned;
            user.playerData.totalCoinsEarned = (user.playerData.totalCoinsEarned || 0) + data.coinsEarned;
          }

          console.log(`💰 [WebSocket] Updated stats - Games: ${user.playerData.gamesPlayed}, Wins: ${user.playerData.gamesWon}, Coins: ${user.playerData.coins}`);

          // Save to database
          user.markModified('gameHistory');
          user.markModified('playerData');
          await user.save();

          console.log(`✅ [WebSocket] Game ${gameId} saved to database for user ${user.username}`);
          console.log(`📊 [WebSocket] User now has ${user.gameHistory.length} games, ${user.playerData.gamesWon} wins`);
        } else {
          console.error(`❌ [WebSocket] User ${userId} not found in database`);
        }
      } else {
        console.warn(`⚠️ [WebSocket] No userId provided - game will not be saved to database`);
      }
      
      activeGames.delete(gameId);
      console.log(`✅ [WebSocket] Game ${gameId} ended and cleaned up`);
      console.log(`📊 [WebSocket] Active games: ${activeGames.size}`);
      
      socket.emit('game-ended', { success: true });
    } catch (error) {
      console.error('❌ [WebSocket] Error saving game:', error);
      socket.emit('game-error', { message: 'Failed to save game' });
    }
  });

  // Track moves (lightweight notification from client)
  socket.on('game-move', (data) => {
    const { gameId, move, userId, username } = data || {};
    if (!gameId) return;
    const gameSession = activeGames.get(gameId);
    if (!gameSession) return;
    
    // If client provided userId late, attach it to the session for proper attribution on disconnect
    if (userId && !gameSession.userId) {
      gameSession.userId = userId;
    }
    gameSession.moves = (gameSession.moves || 0) + 1;
    
    if (move) {
      if (!Array.isArray(gameSession.moveList)) gameSession.moveList = [];
      if (gameSession.moveList.length < 500) {
        gameSession.moveList.push({
          from: move.from,
          to: move.to,
          piece: move.piece,
          team: move.team,
          actor: move.actor,
          captured: move.captured,
          special: move.special,
          isCheck: !!move.isCheck,
          classification: move.classification,
          evalBefore: move.evalBefore,
          evalAfter: move.evalAfter,
          sacrifice: move.sacrifice,
          index: gameSession.moveList.length
        });
      }
      
      // Occasionally log (every 5 moves)
      if (gameSession.moves === 1 || gameSession.moves % 5 === 0) {
        console.log(`♟️ [WebSocket] Move recorded for ${gameId}. Total moves: ${gameSession.moves}`);
      }
    }
  });

  // Multiplayer move handling
  socket.on('multiplayer:move', (moveData) => {
    try {
      console.log('[Multiplayer] Received move:', moveData);
      const { matchId, move, player } = moveData;
      
      // Find the active match
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Multiplayer] Match ${matchId} not found`);
        socket.emit('multiplayer:error', { message: 'Match not found' });
        return;
      }
      
      // Determine which player is the opponent
      let opponentSocketId = null;
      if (match.player1.socketId === socket.id) {
        opponentSocketId = match.player2.socketId;
      } else if (match.player2.socketId === socket.id) {
        opponentSocketId = match.player1.socketId;
      } else {
        console.warn(`[Multiplayer] Socket ${socket.id} not part of match ${matchId}`);
        return;
      }
      
      console.log(`[Multiplayer] Broadcasting move from ${socket.id} to ${opponentSocketId}`);
      
      // Send move to opponent
      io.to(opponentSocketId).emit('multiplayer:opponent-move', {
        matchId,
        move,
        player
      });
      
    } catch (err) {
      console.error('[Multiplayer] Error handling move:', err);
      socket.emit('multiplayer:error', { message: 'Failed to process move' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 [WebSocket] Disconnected:', socket.id);
    
    // Remove from presence and broadcast
    if (onlinePlayers.has(socket.id)) {
      const p = onlinePlayers.get(socket.id);
      onlinePlayers.delete(socket.id);
      console.log(`⚫ [Presence] ${p.username} left multiplayer (${socket.id})`);
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    }

    // Remove from matchmaking queues
    const wasInCompetitive = matchmakingQueues.competitive.delete(socket.id);
    const wasInUnranked = matchmakingQueues.unranked.delete(socket.id);
    if (wasInCompetitive || wasInUnranked) {
      console.log(`🚫 [Queue] Player ${socket.id} removed from queue on disconnect`);
      broadcastQueueStats();
    }
    
    // Clean up any games for this socket
    const abandonPromises = [];
    for (const [gameId, gameData] of activeGames.entries()) {
      if (gameData.socketId === socket.id) {
        // For campaign games, record abandoned even with 0 moves; for others require at least 1 move
        const shouldRecordAbandoned = (((gameData.moves || 0) > 0) || gameData.gameType === 'campaign');
        if (shouldRecordAbandoned) {
          console.log(`💀 [WebSocket] Abandoned game detected (moves=${gameData.moves || 0}) - evaluating loss record: ${gameId}`);
          const duration = Date.now() - gameData.startTime.getTime();
          abandonPromises.push((async () => {
            try {
              // Resolve user either by stored userId or by username fallback
              let user = null;
              if (gameData.userId) {
                user = await User.findById(gameData.userId);
              }
              if (!user && gameData.username) {
                user = await User.findOne({ username: gameData.username });
              }
              if (user) {
                // If this is a campaign game and the level was completed during this session,
                // skip recording an abandoned loss to avoid duplicate entries.
                let skipAbandoned = false;
                if ((gameData.gameType === 'campaign') && (gameData.levelId !== undefined && gameData.levelId !== null)) {
                  const startTs = gameData.startTime ? gameData.startTime.getTime() : 0;
                  const hasCampaignWin = user.gameHistory.some(e => {
                    try {
                      const sameLevel = e.gameType === 'campaign' && String(e.levelId) === String(gameData.levelId);
                      const completed = e.result && e.result !== 'in-progress' && e.endReason !== 'abandoned';
                      const createdTs = e.createdAt ? new Date(e.createdAt).getTime() : 0;
                      // Consider wins created during or shortly after session start (±60s window)
                      return sameLevel && completed && createdTs >= (startTs - 60000);
                    } catch (_) { return false; }
                  });
                  if (hasCampaignWin) {
                    skipAbandoned = true;
                    console.log(`🛑 [WebSocket] Skipping abandoned loss for ${gameId} — campaign level ${gameData.levelId} already completed during session.`);
                  }
                }

                if (!skipAbandoned) {
                  const lossEntry = {
                    gameId,
                    gameType: gameData.gameType || 'vs-ai',
                    opponent: gameData.opponent || 'AI',
                    result: 'loss',
                    duration,
                    movesPlayed: gameData.moves || 0,
                    moves: (gameData.moveList && gameData.moveList.length ? gameData.moveList : undefined),
                    coinsEarned: 0,
                    energySpent: 1,
                    levelId: gameData.levelId || null,
                    stars: 0,
                    playerColor: 'white',
                    endReason: 'abandoned',
                    createdAt: gameData.startTime
                  };
                  user.gameHistory.push(lossEntry);
                  user.playerData.gamesPlayed = (user.playerData.gamesPlayed || 0) + 1;
                  user.playerData.gamesLost = (user.playerData.gamesLost || 0) + 1;
                  user.playerData.currentWinStreak = 0;
                  if (duration) {
                    user.playerData.totalPlayTime = (user.playerData.totalPlayTime || 0) + duration;
                  }
                  user.markModified('gameHistory');
                  user.markModified('playerData');
                  await user.save();
                  console.log(`📉 [WebSocket] Abandoned loss saved for user ${user.username}, total games: ${user.gameHistory.length}`);
                }
              } else {
                console.warn(`⚠️ [WebSocket] Could not find user ${gameData.userId} to record abandoned loss`);
              }
            } catch (err) {
              console.error(`❌ [WebSocket] Failed to handle abandoned loss for game ${gameId}:`, err);
            }
          })());
        } else {
          console.log(`🧹 [WebSocket] Cleaning up game without recording loss (moves=${gameData.moves || 0}): ${gameId}`);
        }
        activeGames.delete(gameId);
      }
    }
    if (abandonPromises.length > 0) {
      Promise.allSettled(abandonPromises).then(() => {
        console.log('🧾 [WebSocket] Finished processing abandoned games for socket', socket.id);
      });
    }
    console.log(`📊 [WebSocket] Active games after cleanup: ${activeGames.size}`);
  });
});

// Matchmaking helper functions
function broadcastQueueStats() {
  const stats = {
    competitive: matchmakingQueues.competitive.size,
    unranked: matchmakingQueues.unranked.size
  };
  io.emit('multiplayer:queue-stats', stats);
  console.log(`📊 [Queue] Broadcasting stats: competitive=${stats.competitive}, unranked=${stats.unranked}`);
}

function tryMatchmaking(gameMode) {
  const queue = matchmakingQueues[gameMode];
  console.log(`🔍 [Matchmaking] Checking ${gameMode} queue: ${queue.size} players`);
  
  if (queue.size < 2) {
    console.log(`⏳ [Matchmaking] Not enough players in ${gameMode} queue (need 2, have ${queue.size})`);
    return;
  }

  const players = Array.from(queue.values());
  console.log(`🎮 [Matchmaking] Available players:`, players.map(p => p.player.username));
  
  // Simple FIFO matchmaking (can be enhanced with rating-based matching later)
  for (let i = 0; i < players.length - 1; i++) {
    const player1 = players[i];
    const player2 = players[i + 1];
    
    console.log(`🤝 [Matchmaking] Attempting to match ${player1.player.username} vs ${player2.player.username}`);
    
    // Check if both players are still online
    if (!onlinePlayers.has(player1.socketId) || !onlinePlayers.has(player2.socketId)) {
      console.warn(`⚠️ [Matchmaking] One or both players not online anymore`);
      continue;
    }

    // Create match
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const match = {
      matchId,
      gameMode,
      player1: { ...player1.player, socketId: player1.socketId },
      player2: { ...player2.player, socketId: player2.socketId },
      startTime: Date.now(),
      status: 'starting'
    };

    activeMatches.set(matchId, match);
    console.log(`✨ [Matchmaking] Created match ${matchId}`);

    // Remove players from queue
    const removed1 = queue.delete(player1.socketId);
    const removed2 = queue.delete(player2.socketId);
    console.log(`🗑️ [Matchmaking] Removed players from queue: ${removed1 && removed2}`);

    // Update player statuses
    const p1 = onlinePlayers.get(player1.socketId);
    const p2 = onlinePlayers.get(player2.socketId);
    if (p1) {
      p1.status = 'in-game';
      onlinePlayers.set(player1.socketId, p1);
      console.log(`🔄 [Matchmaking] Updated ${p1.username} status to in-game`);
    }
    if (p2) {
      p2.status = 'in-game';
      onlinePlayers.set(player2.socketId, p2);
      console.log(`🔄 [Matchmaking] Updated ${p2.username} status to in-game`);
    }

    console.log(`🎮 [Matchmaking] Match created: ${matchId} - ${player1.player.username} vs ${player2.player.username} (${gameMode})`);

    // Notify players
    const matchData1 = {
      matchId,
      opponent: player2.player,
      gameMode,
      playerColor: 'white',
      // Add more game setup info
      birdPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true },
      pigPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true }
    };
    const matchData2 = {
      matchId,
      opponent: player1.player,
      gameMode,
      playerColor: 'black',
      // Add more game setup info
      birdPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true },
      pigPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true }
    };

    console.log(`📤 [Matchmaking] Sending match-found to ${player1.player.username} (white):`, matchData1);
    console.log(`📤 [Matchmaking] Sending match-found to ${player2.player.username} (black):`, matchData2);

    io.to(player1.socketId).emit('multiplayer:match-found', matchData1);
    io.to(player2.socketId).emit('multiplayer:match-found', matchData2);

    // Broadcast updated presence and queue stats
    io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    broadcastQueueStats();

    console.log(`✅ [Matchmaking] Match ${matchId} setup complete`);
    break; // Only create one match per call
  }
}

// Connect to MongoDB
mongoose.connect(process.env.mongoDB)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));

// Add WebSocket status endpoint
app.get('/api/socket/status', (req, res) => {
  res.json({
    activeGames: activeGames.size,
    connectedSockets: io.sockets.sockets.size,
  status: 'Simple WebSocket service running',
  onlinePlayers: onlinePlayers.size,
    queueStats: {
      competitive: matchmakingQueues.competitive.size,
      unranked: matchmakingQueues.unranked.size
    },
    activeMatches: activeMatches.size
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 WebSocket server ready`);
});