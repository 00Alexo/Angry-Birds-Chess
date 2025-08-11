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

// Store active games
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('🔌 [WebSocket] New connection:', socket.id);

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
  moves: 0 // track moves to decide abandoned losses
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
      // Fallback: if userId not provided in end-game payload, try from stored game session
      if (!userId && gameSession.userId) {
        userId = gameSession.userId;
        console.log(`🔄 [WebSocket] Fallback userId from activeGames: ${userId}`);
      }
      console.log(`💾 [WebSocket] Saving game ${gameId} to database:`, data);
      
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
            movesPlayed: data.moves || 0,
            coinsEarned: data.coinsEarned || 0,
            energySpent: 1,
            levelId: gameSession.levelId || null,
            stars: data.stars || null,
            playerColor: 'white',
            endReason: data.endReason || 'completed',
            createdAt: gameSession.startTime
          };

          console.log(`📝 [WebSocket] Creating game entry:`, gameEntry);

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
    const { gameId } = data || {};
    if (!gameId) return;
    const gameSession = activeGames.get(gameId);
    if (!gameSession) return;
    gameSession.moves = (gameSession.moves || 0) + 1;
    // Occasionally log (every 5 moves)
    if (gameSession.moves === 1 || gameSession.moves % 5 === 0) {
      console.log(`♟️ [WebSocket] Move recorded for ${gameId}. Total moves: ${gameSession.moves}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 [WebSocket] Disconnected:', socket.id);
    
    // Clean up any games for this socket
    const abandonPromises = [];
    for (const [gameId, gameData] of activeGames.entries()) {
      if (gameData.socketId === socket.id) {
        // If at least one move was made count as loss
        if ((gameData.moves || 0) > 0 && gameData.userId) {
          console.log(`💀 [WebSocket] Abandoned game detected with moves (${gameData.moves}) - recording loss: ${gameId}`);
          const duration = Date.now() - gameData.startTime.getTime();
          const lossEntry = {
            gameId,
            gameType: gameData.gameType || 'vs-ai',
            opponent: gameData.opponent || 'AI',
            result: 'loss',
            duration,
            movesPlayed: gameData.moves || 0,
            coinsEarned: 0,
            energySpent: 1,
            levelId: gameData.levelId || null,
            stars: 0,
            playerColor: 'white',
            endReason: 'abandoned',
            createdAt: gameData.startTime
          };
          abandonPromises.push((async () => {
            try {
              const user = await User.findById(gameData.userId);
              if (user) {
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
              } else {
                console.warn(`⚠️ [WebSocket] Could not find user ${gameData.userId} to record abandoned loss`);
              }
            } catch (err) {
              console.error(`❌ [WebSocket] Failed to record abandoned loss for game ${gameId}:`, err);
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
    status: 'Simple WebSocket service running'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 WebSocket server ready`);
});