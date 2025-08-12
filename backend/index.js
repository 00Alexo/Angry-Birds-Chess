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
    activeGames.set(gameId, {
      socketId: socket.id,
      ...data,
      startTime: new Date(),
      moves: 0,       // move count
      moveList: []    // detailed moves for fallback (abandoned games)
    });

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
    const { gameId, move, userId } = data || {};
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
    }
    // Occasionally log (every 5 moves)
    if (gameSession.moves === 1 || gameSession.moves % 5 === 0) {
      console.log(`♟️ [WebSocket] Move recorded for ${gameId}. Total moves: ${gameSession.moves}`);
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
  onlinePlayers: onlinePlayers.size
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 WebSocket server ready`);
});