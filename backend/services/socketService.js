const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.activeGames = new Map(); // gameId -> { userId, socketId, gameData, startTime }
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Simple authentication middleware
    this.io.use(async (socket, next) => {
      try {
        console.log('🔐 [Socket] New connection attempt from:', socket.handshake.address);
        
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error('❌ [Socket] No token provided');
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          console.error('❌ [Socket] User not found:', decoded.userId);
          return next(new Error('User not found'));
        }

        console.log('✅ [Socket] User authenticated:', user.username);
        socket.userId = user._id.toString();
        socket.username = user.username;
        next();
      } catch (error) {
        console.error('❌ [Socket] Auth error:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 [Socket] ${socket.username} connected (ID: ${socket.id})`);

      // Handle game start
      socket.on('start-game', async (gameData) => {
        try {
          console.log(`🎮 [Socket] ${socket.username} starting game:`, gameData);
          
          // Generate unique game ID
          const gameId = `game_${socket.userId}_${Date.now()}`;
          
          // Store game session
          this.activeGames.set(gameId, {
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id,
            gameData: gameData,
            startTime: new Date(),
            moves: 0
          });

          console.log(`✅ [Socket] Game ${gameId} started for ${socket.username}`);
          console.log(`� [Socket] Active games: ${this.activeGames.size}`);

          // Send game ID back to client
          socket.emit('game-started', { gameId });

        } catch (error) {
          console.error('❌ [Socket] Start game error:', error);
          socket.emit('game-error', { message: 'Failed to start game' });
        }
      });

      // Handle game end
      socket.on('end-game', async (data) => {
        try {
          const { gameId, result, moves, duration, coinsEarned } = data;
          console.log(`🏁 [Socket] ${socket.username} ending game ${gameId}:`, { result, moves, duration });

          const gameSession = this.activeGames.get(gameId);
          if (!gameSession) {
            console.warn(`⚠️ [Socket] Game ${gameId} not found in active games`);
            socket.emit('game-error', { message: 'Game session not found' });
            return;
          }

          // Update database with game results
          await this.saveGameToDatabase(gameSession, { result, moves, duration, coinsEarned });

          // Remove from active games
          this.activeGames.delete(gameId);
          console.log(`✅ [Socket] Game ${gameId} saved to database and removed from active games`);
          console.log(`📊 [Socket] Active games: ${this.activeGames.size}`);

          socket.emit('game-ended', { success: true });

        } catch (error) {
          console.error('❌ [Socket] End game error:', error);
          socket.emit('game-error', { message: 'Failed to end game' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`🔌 [Socket] ${socket.username} disconnected (ID: ${socket.id})`);
        
        // Find and handle any active games for this socket
        for (const [gameId, gameSession] of this.activeGames.entries()) {
          if (gameSession.socketId === socket.id) {
            console.log(`💀 [Socket] Marking abandoned game ${gameId} as loss`);
            
            // Save as loss due to disconnect
            await this.saveGameToDatabase(gameSession, {
              result: 'loss',
              moves: gameSession.moves,
              duration: Date.now() - gameSession.startTime.getTime(),
              coinsEarned: 0,
              endReason: 'disconnected'
            });

            this.activeGames.delete(gameId);
          }
        }
        console.log(`📊 [Socket] Active games after disconnect: ${this.activeGames.size}`);
      });
    });

    console.log('🚀 [Socket] WebSocket service initialized');
  }

  async saveGameToDatabase(gameSession, gameResult) {
    try {
      console.log(`💾 [Socket] Saving game to database for ${gameSession.username}:`, gameResult);

      const user = await User.findById(gameSession.userId);
      if (!user) {
        console.error('❌ [Socket] User not found during save:', gameSession.userId);
        return;
      }

      // Create game history entry
      const gameEntry = {
        gameId: gameSession.gameData.gameId || `game_${gameSession.userId}_${gameSession.startTime.getTime()}`,
        gameType: gameSession.gameData.gameType || 'vs-ai',
        opponent: gameSession.gameData.opponent || 'AI',
        result: gameResult.result,
        duration: gameResult.duration,
        movesPlayed: gameResult.moves || 0,
        coinsEarned: gameResult.coinsEarned || 0,
        energySpent: gameSession.gameData.energySpent || 1,
        levelId: gameSession.gameData.levelId || null,
        stars: gameResult.stars || null,
        playerColor: 'white',
        endReason: gameResult.endReason || null,
        createdAt: gameSession.startTime
      };

      user.gameHistory.push(gameEntry);

      // Update player stats
      if (gameResult.result === 'win') {
        user.playerData.gamesWon++;
        user.playerData.currentWinStreak++;
        user.playerData.longestWinStreak = Math.max(user.playerData.longestWinStreak, user.playerData.currentWinStreak);
      } else if (gameResult.result === 'loss') {
        user.playerData.gamesLost++;
        user.playerData.currentWinStreak = 0;
      } else if (gameResult.result === 'draw') {
        user.playerData.gamesDrawn++;
        user.playerData.currentWinStreak = 0;
      }

      // Add coins and play time
      if (gameResult.duration) user.playerData.totalPlayTime += gameResult.duration;
      if (gameResult.coinsEarned > 0) {
        user.playerData.coins += gameResult.coinsEarned;
        user.playerData.totalCoinsEarned += gameResult.coinsEarned;
      }

      // Save to database
      user.markModified('gameHistory');
      user.markModified('playerData');
      await user.save();

      console.log(`✅ [Socket] Game saved successfully for ${gameSession.username}. Total games: ${user.gameHistory.length}`);

    } catch (error) {
      console.error('❌ [Socket] Database save error:', error);
    }
  }

  getActiveGameCount() {
    return this.activeGames.size;
  }
}

module.exports = new SocketService();