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
// Store chat messages (in-memory for now, could move to database later)
const chatMessages = {
  lobby: [], // Lobby chat messages
  matches: new Map() // matchId -> array of messages
};

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
  socket.on('multiplayer:join-queue', async (payload = {}) => {
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

      // Get player's competitive rating
      let playerRating = 1200; // Default rating
      try {
        const user = await User.findById(player.userId);
        if (user) {
          playerRating = user.getCompetitiveRating();
          console.log(`📊 [Queue] Retrieved rating for ${player.username}: ${playerRating}`);
        }
      } catch (error) {
        console.warn(`⚠️ [Queue] Could not fetch rating for ${player.username}, using default: ${error.message}`);
      }

      // Add to requested queue
      const queueEntry = {
        socketId: socket.id,
        player: { 
          ...player, 
          rating: playerRating // Include rating in player data
        },
        queueTime: Date.now(),
        gameMode,
        ratingRange: gameMode === 'competitive' ? 200 : 999999 // Wider range for unranked
      };

      matchmakingQueues[gameMode].set(socket.id, queueEntry);
      console.log(`✅ [Queue] ${player.username} joined ${gameMode} queue with rating ${playerRating} (${matchmakingQueues[gameMode].size} players total)`);

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
      console.log('🎯 [Multiplayer] ===== MOVE RECEIVED FROM CLIENT =====');
      console.log('[Multiplayer] Move data:', JSON.stringify(moveData, null, 2));
      const { matchId, move, player } = moveData;
      
      console.log('[Multiplayer] Parsed move object:', JSON.stringify(move, null, 2));
      console.log('[Multiplayer] Move properties:', {
        from: move?.from,
        to: move?.to,
        piece: move?.piece,
        color: move?.color,
        team: move?.team,
        captured: move?.captured,
        special: move?.special,
        classification: move?.classification
      });
      
      if (!matchId || !move || !player) {
        console.error('[Multiplayer] Invalid move data - missing required fields');
        socket.emit('multiplayer:error', { message: 'Invalid move data' });
        return;
      }
      
      // Find the active match
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Multiplayer] Match ${matchId} not found in activeMatches`);
        console.log(`[Multiplayer] Available matches:`, Array.from(activeMatches.keys()));
        socket.emit('multiplayer:error', { message: 'Match not found' });
        return;
      }
      
      console.log(`[Multiplayer] Match found: ${matchId}`);
      console.log(`[Multiplayer] Player1: ${match.player1.username} (${match.player1.socketId})`);
      console.log(`[Multiplayer] Player2: ${match.player2.username} (${match.player2.socketId})`);
      console.log(`[Multiplayer] Current socket: ${socket.id}`);
      
      // Determine which player is the opponent and update socket IDs if needed
      let opponentSocketId = null;
      let playerUpdated = false;
      
      if (match.player1.socketId === socket.id) {
        opponentSocketId = match.player2.socketId;
        console.log(`[Multiplayer] Player1 making move, opponent is Player2: ${opponentSocketId}`);
      } else if (match.player2.socketId === socket.id) {
        opponentSocketId = match.player1.socketId;
        console.log(`[Multiplayer] Player2 making move, opponent is Player1: ${opponentSocketId}`);
      } else {
        // Socket ID doesn't match - player might have reconnected
        // Try to match by userId
        if (match.player1.userId === player.userId) {
          console.log(`[Multiplayer] Updating player1 socket ID from ${match.player1.socketId} to ${socket.id}`);
          match.player1.socketId = socket.id;
          opponentSocketId = match.player2.socketId;
          playerUpdated = true;
        } else if (match.player2.userId === player.userId) {
          console.log(`[Multiplayer] Updating player2 socket ID from ${match.player2.socketId} to ${socket.id}`);
          match.player2.socketId = socket.id;
          opponentSocketId = match.player1.socketId;
          playerUpdated = true;
        } else {
          console.warn(`[Multiplayer] Socket ${socket.id} (userId: ${player.userId}) not part of match ${matchId}`);
          console.warn(`[Multiplayer] Expected userIds: ${match.player1.userId}, ${match.player2.userId}`);
          return;
        }
      }
      
      if (!opponentSocketId) {
        console.error('[Multiplayer] Could not determine opponent socket ID');
        return;
      }
      
      console.log(`🚀 [Multiplayer] Broadcasting move from ${socket.id} to opponent ${opponentSocketId}`);
      
      // Increment move count and store move details for game history
      match.moveCount = (match.moveCount || 0) + 1;
      
      // Initialize moveHistory array if it doesn't exist
      if (!match.moveHistory) {
        match.moveHistory = [];
      }
      
      console.log(`🎯 [Multiplayer] Received move with classification: ${move.classification}`);
      console.log(`🎯 [Multiplayer] Full move object:`, JSON.stringify(move, null, 2));
      
      // Store detailed move information for later game history saving
      const moveDetails = {
        from: move.from,
        to: move.to,
        piece: move.piece,
        team: move.team || move.color, // Use team if available, fallback to color
        actor: move.actor || 'player', // Default to player if not specified
        captured: move.captured,
        special: move.special,
        isCheck: !!move.isCheck,
        classification: move.classification || null, // May not be available from frontend
        evalBefore: move.evalBefore || null,
        evalAfter: move.evalAfter || null,
        sacrifice: move.sacrifice || null,
        index: match.moveHistory.length,
        timestamp: Date.now()
      };
      
      match.moveHistory.push(moveDetails);
      
      console.log(`📊 [Multiplayer] Move count for match ${matchId}: ${match.moveCount}`);
      console.log(`🎯 [Multiplayer] Stored move details:`, JSON.stringify(moveDetails, null, 2));
      
      // Send move to opponent
      const moveMessage = {
        matchId,
        move,
        player
      };
      
      io.to(opponentSocketId).emit('multiplayer:opponent-move', moveMessage);
      console.log('✅ [Multiplayer] Move broadcast successful');
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error handling move:', err);
      socket.emit('multiplayer:error', { message: 'Failed to process move' });
    }
  });

  // Multiplayer resign/abandon handling
  socket.on('multiplayer:resign', async (data) => {
    try {
      console.log('🏳️ [Multiplayer] ===== PLAYER RESIGNED =====');
      console.log('[Multiplayer] Resign data:', JSON.stringify(data, null, 2));
      
      const { matchId } = data;
      if (!matchId) {
        console.error('[Multiplayer] No matchId provided for resignation');
        return;
      }
      
      await handleMultiplayerGameEnd(matchId, socket.id, 'resign');
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error handling resignation:', err);
    }
  });

  // Handle player timeout events
  socket.on('playerTimeout', async (data) => {
    try {
      console.log('⏰ [Multiplayer] ===== PLAYER TIMEOUT =====');
      console.log('⏰ [Multiplayer] Timeout data:', JSON.stringify(data, null, 2));
      
      const { gameId, player, winner } = data;
      
      // gameId should be the matchId
      const match = activeMatches.get(gameId);
      
      if (match) {
        console.log('⏰ [Multiplayer] Found match for timeout:', match.matchId);
        
        // The player who timed out is the "leaving" player
        await handleMultiplayerGameEnd(match.matchId, socket.id, 'timeout');
        
      } else {
        console.warn('⏰ [Multiplayer] Match not found for timeout:', gameId);
        console.log('⏰ [Multiplayer] Active matches:', Array.from(activeMatches.keys()));
      }
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error handling timeout:', err);
    }
  });

  // Handle natural multiplayer game endings (checkmate, draw, stalemate)
  socket.on('multiplayer:game-ended', async (data) => {
    try {
      console.log('🏁 [Multiplayer] ===== NATURAL GAME END =====');
      console.log('[Multiplayer] Game end data:', JSON.stringify(data, null, 2));
      
      const { matchId, result, winnerColor, reason } = data;
      if (!matchId || !result || !reason) {
        console.error('[Multiplayer] Invalid game end data - missing required fields');
        return;
      }
      
      await handleMultiplayerNaturalGameEnd(matchId, result, winnerColor, reason);
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error handling natural game end:', err);
    }
  });

  // Chat functionality
  // Lobby chat message
  socket.on('multiplayer:lobby-chat', (messageData) => {
    try {
      console.log('[Chat] Lobby message received:', messageData);
      
      const { message, sender, timestamp } = messageData;
      if (!message || !sender) {
        console.error('[Chat] Invalid lobby message data');
        return;
      }
      
      // Store message with server timestamp
      const chatMessage = {
        id: `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: message.trim().substring(0, 200), // Limit message length
        sender,
        timestamp: timestamp || new Date().toISOString(),
        serverTimestamp: new Date().toISOString()
      };
      
      // Add to lobby messages (keep last 100 messages)
      chatMessages.lobby.push(chatMessage);
      if (chatMessages.lobby.length > 100) {
        chatMessages.lobby = chatMessages.lobby.slice(-100);
      }
      
      console.log(`[Chat] Broadcasting lobby message to all players: ${sender.username}: ${message}`);
      
      // Broadcast to all connected players in multiplayer
      io.emit('multiplayer:lobby-chat', chatMessage);
      
    } catch (err) {
      console.error('❌ [Chat] Error handling lobby chat:', err);
    }
  });

  // Get recent lobby messages
  socket.on('multiplayer:get-lobby-messages', () => {
    try {
      console.log('[Chat] Sending recent lobby messages to', socket.id);
      
      // Send last 50 messages to the requesting client
      const recentMessages = chatMessages.lobby.slice(-50);
      socket.emit('multiplayer:lobby-messages', recentMessages);
      
    } catch (err) {
      console.error('❌ [Chat] Error sending lobby messages:', err);
    }
  });

  // Match chat message
  socket.on('multiplayer:chat-message', (messageData) => {
    try {
      console.log('[Chat] Match message received:', messageData);
      
      const { matchId, message, sender, timestamp } = messageData;
      if (!matchId || !message || !sender) {
        console.error('[Chat] Invalid match message data');
        return;
      }
      
      // Verify the match exists
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Chat] Match ${matchId} not found for chat message`);
        return;
      }
      
      // Verify sender is part of this match
      const isValidSender = match.player1.userId === sender.userId || 
                           match.player2.userId === sender.userId;
      
      if (!isValidSender) {
        console.warn(`[Chat] Invalid sender for match ${matchId}: ${sender.userId}`);
        return;
      }
      
      // Store message with server timestamp
      const chatMessage = {
        id: `match_${matchId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        matchId,
        message: message.trim().substring(0, 200), // Limit message length
        sender,
        timestamp: timestamp || new Date().toISOString(),
        serverTimestamp: new Date().toISOString()
      };
      
      // Initialize match chat if doesn't exist
      if (!chatMessages.matches.has(matchId)) {
        chatMessages.matches.set(matchId, []);
      }
      
      // Add to match messages (keep last 50 messages per match)
      const matchMessages = chatMessages.matches.get(matchId);
      matchMessages.push(chatMessage);
      if (matchMessages.length > 50) {
        chatMessages.matches.set(matchId, matchMessages.slice(-50));
      }
      
      console.log(`[Chat] Broadcasting match message to players in ${matchId}: ${sender.username}: ${message}`);
      
      // Send to both players in the match
      io.to(match.player1.socketId).emit('multiplayer:chat-message', chatMessage);
      io.to(match.player2.socketId).emit('multiplayer:chat-message', chatMessage);
      
    } catch (err) {
      console.error('❌ [Chat] Error handling match chat:', err);
    }
  });

  // Typing indicator for match chat
  socket.on('multiplayer:typing', (data) => {
    try {
      console.log('[Chat] Typing indicator received:', data);
      
      const { matchId, sender, isTyping } = data;
      if (!matchId || !sender) {
        console.error('[Chat] Invalid typing indicator data');
        return;
      }
      
      // Verify the match exists
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Chat] Match ${matchId} not found for typing indicator`);
        return;
      }
      
      // Verify sender is part of this match
      const isValidSender = match.player1.userId === sender.userId || 
                           match.player2.userId === sender.userId;
      
      if (!isValidSender) {
        console.warn(`[Chat] Invalid sender for typing in match ${matchId}: ${sender.userId}`);
        return;
      }
      
      // Determine opponent's socket ID
      let opponentSocketId;
      if (match.player1.userId === sender.userId) {
        opponentSocketId = match.player2.socketId;
      } else {
        opponentSocketId = match.player1.socketId;
      }
      
      console.log(`[Chat] Sending typing indicator to opponent ${opponentSocketId}: ${isTyping}`);
      
      // Send typing indicator to opponent only
      io.to(opponentSocketId).emit('multiplayer:typing', {
        matchId,
        sender,
        isTyping,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('❌ [Chat] Error handling typing indicator:', err);
    }
  });

  // Handle natural multiplayer game endings (checkmate, draw, stalemate)
  const handleMultiplayerNaturalGameEnd = async (matchId, result, winnerColor, reason) => {
    try {
      console.log(`🎯 [Multiplayer] ===== NATURAL GAME END HANDLER =====`);
      console.log(`🎯 [Multiplayer] matchId: ${matchId}, result: ${result}, winnerColor: ${winnerColor}, reason: ${reason}`);
      
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Multiplayer] Match ${matchId} not found for natural game end - may have already ended`);
        console.log(`[Multiplayer] Available matches:`, Array.from(activeMatches.keys()));
        return;
      }
      
      // Check if game was already ended (prevent duplicate processing)
      if (match.gameEnded) {
        console.log(`⚠️ [Multiplayer] Match ${matchId} already ended, ignoring duplicate game end event`);
        return;
      }
      
      // Mark game as ended to prevent duplicate processing
      match.gameEnded = true;
      
      console.log(`🎯 [Multiplayer] Processing natural game end for match ${matchId}: ${reason}`);
      console.log(`🎯 [Multiplayer] Match details:`, {
        matchId: match.matchId,
        startTime: match.startTime,
        moveCount: match.moveCount,
        player1: match.player1?.username,
        player2: match.player2?.username
      });
      
      let winner, loser;
      
      if (result === 'draw') {
        // For draws, both players get a draw result
        winner = null;
        loser = null;
      } else if (result === 'win') {
        // Determine winner based on color
        if (winnerColor === 'white') {
          winner = match.player1; // White is always player1
          loser = match.player2;
        } else {
          winner = match.player2; // Black is always player2  
          loser = match.player1;
        }
        console.log(`👑 [Multiplayer] Winner: ${winner.username} (${winnerColor})`);
        console.log(`💔 [Multiplayer] Loser: ${loser.username} (${winnerColor === 'white' ? 'black' : 'white'}) - ${reason}`);
      } else {
        console.error(`❌ [Multiplayer] Invalid result type: ${result}`);
        return;
      }
      
      // Save match results to database - handle cases where some players might not have userId
      if (match.player1.userId || match.player2.userId) {
        try {
          console.log(`🔧 [DEBUG] About to require User and multiplayerRatingService...`);
          const User = require('./models/User');
          const multiplayerRatingService = require('./services/multiplayerRatingService');
          console.log(`✅ [DEBUG] Successfully imported User and multiplayerRatingService`);
          
          // Create detailed game history entries for both players
          const gameId = `multiplayer_${matchId}_${Date.now()}`;
          const matchDuration = match.startTime ? Date.now() - match.startTime : 0;
          
          console.log(`⏱️ [Multiplayer] Match duration calculation: ${Date.now()} - ${match.startTime} = ${matchDuration}ms`);
          console.log(`🔧 [DEBUG] About to prepare player data...`);
          
          // Prepare player data for rating service
          const player1Data = {
            userId: match.player1.userId,
            username: match.player1.username,
            rating: match.player1.rating || 1200 // Use stored rating or default
          };
          
          const player2Data = {
            userId: match.player2.userId,
            username: match.player2.username,
            rating: match.player2.rating || 1200 // Use stored rating or default
          };
          
          // Prepare game data
          const gameData = {
            gameId,
            duration: matchDuration,
            movesPlayed: match.moveCount || 0,
            moves: match.moveHistory || [],
            coinsEarned: result === 'draw' ? 50 : 250, // Draw: 50 coins, Win: 250 coins
            energySpent: 1,
            endReason: reason,
            player1Color: 'white', // Player1 is always white
            player2Color: 'black'  // Player2 is always black
          };
          
          // Determine result format for rating service
          let ratingServiceResult;
          if (result === 'draw') {
            ratingServiceResult = 'draw';
          } else if (winnerColor === 'white') {
            ratingServiceResult = 'player1_win'; // Player1 (white) wins
          } else {
            ratingServiceResult = 'player2_win'; // Player2 (black) wins
          }
          
          console.log(`🎯 [Multiplayer] Processing ${match.gameMode} game with rating service:`);
          console.log(`🎯 [Multiplayer] Players: ${player1Data.username} (${player1Data.rating}) vs ${player2Data.username} (${player2Data.rating})`);
          console.log(`🎯 [Multiplayer] Result: ${ratingServiceResult}`);
          console.log(`🔧 [DEBUG] About to call rating service method...`);
          
          // Process game result based on game mode
          let ratingResult;
          if (match.gameMode === 'competitive') {
            console.log(`🔧 [DEBUG] Calling processCompetitiveGameResult...`);
            ratingResult = await multiplayerRatingService.processCompetitiveGameResult(
              player1Data,
              player2Data,
              ratingServiceResult,
              gameData
            );
            console.log(`✅ [Multiplayer] Competitive game processed with rating changes:`, ratingResult);
          } else {
            console.log(`🔧 [DEBUG] Calling processUnrankedGameResult...`);
            ratingResult = await multiplayerRatingService.processUnrankedGameResult(
              player1Data,
              player2Data,
              ratingServiceResult,
              gameData
            );
            console.log(`✅ [Multiplayer] Unranked game processed (no rating changes):`, ratingResult);
          }
          
          // Log final results
          console.log(`📊 [Multiplayer] Game processing completed successfully!`);
          if (ratingResult.isUpset) {
            console.log(`🎉 [Multiplayer] UPSET VICTORY! Rating changes were doubled!`);
          }
          
        } catch (error) {
          console.error('❌ [Multiplayer] Error processing game with rating service:', error);
          console.error('❌ [DEBUG] Error stack trace:', error.stack);
          console.error('❌ [DEBUG] Error name:', error.name);
          console.error('❌ [DEBUG] Error message:', error.message);
          console.log('⚠️ [DEBUG] Falling back to manual system...');
          // Fallback to old manual system if rating service fails
          await handleMultiplayerGameFallback(match, result, winnerColor, reason, matchDuration);
        }
      } else {
        console.warn('⚠️ [Multiplayer] No user IDs available - game results will not be saved');
      }
      
      // Notify both players of game end
      const gameEndData = {
        matchId,
        reason,
        winner: winner ? {
          username: winner.username,
          userId: winner.userId
        } : null,
        loser: loser ? {
          username: loser.username,
          userId: loser.userId,
          reason
        } : null
      };
      
      if (result === 'draw') {
        // Send draw message to both players
        io.to(match.player1.socketId).emit('multiplayer:game-end', {
          ...gameEndData,
          result: 'draw'
        });
        
        io.to(match.player2.socketId).emit('multiplayer:game-end', {
          ...gameEndData,
          result: 'draw'
        });
      } else {
        // Send win/loss messages
        io.to(winner.socketId).emit('multiplayer:game-end', {
          ...gameEndData,
          result: 'win'
        });
        
        io.to(loser.socketId).emit('multiplayer:game-end', {
          ...gameEndData,
          result: 'loss'
        });
      }
      
      console.log(`📤 [Multiplayer] Natural game end notifications sent to both players`);
      
      // Update player statuses back to online
      const player1Online = onlinePlayers.get(match.player1.socketId);
      const player2Online = onlinePlayers.get(match.player2.socketId);
      
      if (player1Online) {
        player1Online.status = 'online';
        onlinePlayers.set(match.player1.socketId, player1Online);
      }
      if (player2Online) {
        player2Online.status = 'online';  
        onlinePlayers.set(match.player2.socketId, player2Online);
      }
      
      // Broadcast updated presence
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
      
      // Clean up match
      activeMatches.delete(matchId);
      
      // Clean up match chat messages after some time (optional - keep for history)
      setTimeout(() => {
        if (chatMessages.matches.has(matchId)) {
          chatMessages.matches.delete(matchId);
          console.log(`🧹 [Chat] Cleaned up chat messages for match ${matchId}`);
        }
      }, 60000); // Keep messages for 1 minute after match ends
      
      console.log(`🧹 [Multiplayer] Match ${matchId} cleaned up after natural game end`);
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error in handleMultiplayerNaturalGameEnd:', err);
    }
  };

  // Handle multiplayer game abandonment (when player disconnects during active game)
  const handleMultiplayerAbandon = async (socketId) => {
    try {
      // Find any active matches where this player is participating
      for (const [matchId, match] of activeMatches.entries()) {
        if (match.player1.socketId === socketId || match.player2.socketId === socketId) {
          console.log(`🚪 [Multiplayer] Player ${socketId} abandoned match ${matchId}`);
          await handleMultiplayerGameEnd(matchId, socketId, 'abandon');
          break; // Player can only be in one match at a time
        }
      }
    } catch (err) {
      console.error('❌ [Multiplayer] Error handling abandonment:', err);
    }
  };

  // Common function to handle multiplayer game endings
  const handleMultiplayerGameEnd = async (matchId, leavingPlayerSocketId, reason) => {
    try {
      console.log(`🏁 [Multiplayer] ===== GAME END HANDLER TRIGGERED =====`);
      console.log(`🏁 [Multiplayer] matchId: ${matchId}, leavingPlayer: ${leavingPlayerSocketId}, reason: ${reason}`);
      
      const match = activeMatches.get(matchId);
      if (!match) {
        console.warn(`[Multiplayer] Match ${matchId} not found for game end - may have already ended`);
        console.log(`[Multiplayer] Available matches:`, Array.from(activeMatches.keys()));
        return;
      }
      
      // Check if game was already ended (prevent duplicate processing)
      if (match.gameEnded) {
        console.log(`⚠️ [Multiplayer] Match ${matchId} already ended, ignoring duplicate game end event`);
        return;
      }
      
      // Mark game as ended to prevent duplicate processing
      match.gameEnded = true;
      
      console.log(`🏁 [Multiplayer] Ending match ${matchId} due to ${reason}`);
      console.log(`🏁 [Multiplayer] Match details:`, {
        matchId: match.matchId,
        startTime: match.startTime,
        moveCount: match.moveCount,
        player1: match.player1?.username,
        player2: match.player2?.username
      });
      
      // Determine winner and loser
      const isPlayer1Leaving = match.player1.socketId === leavingPlayerSocketId;
      const winner = isPlayer1Leaving ? match.player2 : match.player1;
      const loser = isPlayer1Leaving ? match.player1 : match.player2;
      const winnerColor = isPlayer1Leaving ? 'black' : 'white'; // Player1 is always white
      const result = 'win'; // The leaving player loses
      
      console.log(`👑 [Multiplayer] Winner: ${winner.username} (${winner.userId})`);
      console.log(`💔 [Multiplayer] Loser: ${loser.username} (${loser.userId}) - ${reason}`);
      
      // Declare rating result outside the scope for later use
      let ratingResult = null;
      
      // *** USE THE RATING SERVICE INSTEAD OF OLD MANUAL SYSTEM ***
      // Save match results to database - handle cases where some players might not have userId
      if (match.player1.userId || match.player2.userId) {
        try {
          console.log(`🔧 [DEBUG] About to require User and multiplayerRatingService...`);
          const User = require('./models/User');
          const multiplayerRatingService = require('./services/multiplayerRatingService');
          console.log(`✅ [DEBUG] Successfully imported User and multiplayerRatingService`);
          
          // Create detailed game history entries for both players
          const gameId = `multiplayer_${matchId}_${Date.now()}`;
          const matchDuration = match.startTime ? Date.now() - match.startTime : 0;
          
          console.log(`⏱️ [Multiplayer] Match duration calculation: ${Date.now()} - ${match.startTime} = ${matchDuration}ms`);
          console.log(`🔧 [DEBUG] About to prepare player data...`);
          
          // Prepare player data for rating service
          const player1Data = {
            userId: match.player1.userId,
            username: match.player1.username,
            rating: match.player1.rating || 1200 // Use stored rating or default
          };
          
          const player2Data = {
            userId: match.player2.userId,
            username: match.player2.username,
            rating: match.player2.rating || 1200 // Use stored rating or default
          };
          
          // Prepare game data
          const gameData = {
            gameId,
            duration: matchDuration,
            movesPlayed: match.moveCount || 0,
            moves: match.moveHistory || [],
            coinsEarned: result === 'draw' ? 50 : 250, // Draw: 50 coins, Win: 250 coins
            energySpent: 1,
            endReason: reason,
            player1Color: 'white', // Player1 is always white
            player2Color: 'black'  // Player2 is always black
          };
          
          // Determine result format for rating service
          let ratingServiceResult;
          if (result === 'draw') {
            ratingServiceResult = 'draw';
          } else if (winnerColor === 'white') {
            ratingServiceResult = 'player1_win'; // Player1 (white) wins
          } else {
            ratingServiceResult = 'player2_win'; // Player2 (black) wins
          }
          
          console.log(`🎯 [Multiplayer] Processing ${match.gameMode} game with rating service:`);
          console.log(`🎯 [Multiplayer] Players: ${player1Data.username} (${player1Data.rating}) vs ${player2Data.username} (${player2Data.rating})`);
          console.log(`🎯 [Multiplayer] Result: ${ratingServiceResult}`);
          console.log(`🔧 [DEBUG] About to call rating service method...`);
          
          // Process game result based on game mode
          let ratingResult;
          if (match.gameMode === 'competitive') {
            console.log(`🔧 [DEBUG] Calling processCompetitiveGameResult...`);
            ratingResult = await multiplayerRatingService.processCompetitiveGameResult(
              player1Data,
              player2Data,
              ratingServiceResult,
              gameData
            );
            console.log(`✅ [Multiplayer] Competitive game processed with rating changes:`, ratingResult);
          } else {
            console.log(`🔧 [DEBUG] Calling processUnrankedGameResult...`);
            ratingResult = await multiplayerRatingService.processUnrankedGameResult(
              player1Data,
              player2Data,
              ratingServiceResult,
              gameData
            );
            console.log(`✅ [Multiplayer] Unranked game processed (no rating changes):`, ratingResult);
          }
          
          // Log final results
          console.log(`📊 [Multiplayer] Game processing completed successfully!`);
          if (ratingResult.isUpset) {
            console.log(`🎉 [Multiplayer] UPSET VICTORY! Rating changes were doubled!`);
          }
          
        } catch (error) {
          console.error('❌ [Multiplayer] Error processing game with rating service:', error);
          console.error('❌ [DEBUG] Error stack trace:', error.stack);
          console.error('❌ [DEBUG] Error name:', error.name);
          console.error('❌ [DEBUG] Error message:', error.message);
          console.log('⚠️ [DEBUG] Falling back to manual system...');
          // Fallback to old manual system if rating service fails
          await handleMultiplayerGameFallback(match, result, winnerColor, reason, matchDuration);
        }
      } else {
        console.warn('⚠️ [Multiplayer] No user IDs available - game results will not be saved');
      }
      
      // Notify both players of game end
      console.log(`🔍 [DEBUG] About to send game-end notifications. ratingResult:`, JSON.stringify(ratingResult, null, 2));
      const gameEndData = {
        matchId,
        reason,
        winner: {
          username: winner.username,
          userId: winner.userId
        },
        loser: {
          username: loser.username,  
          userId: loser.userId,
          reason
        },
        // Include rating information if available
        ratingData: ratingResult || null
      };
      
      // Send win message to winner
      io.to(winner.socketId).emit('multiplayer:game-end', {
        ...gameEndData,
        result: 'win'
      });
      
      // Send loss message to loser (if still connected)
      io.to(loser.socketId).emit('multiplayer:game-end', {
        ...gameEndData,
        result: 'loss'
      });
      
      console.log(`📤 [Multiplayer] Game end notifications sent to both players`);
      
      // Update player statuses back to online
      const winnerOnline = onlinePlayers.get(winner.socketId);
      const loserOnline = onlinePlayers.get(loser.socketId);
      
      if (winnerOnline) {
        winnerOnline.status = 'online';
        onlinePlayers.set(winner.socketId, winnerOnline);
      }
      if (loserOnline) {
        loserOnline.status = 'online';  
        onlinePlayers.set(loser.socketId, loserOnline);
      }
      
      // Broadcast updated presence
      io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
      
      // Clean up match
      activeMatches.delete(matchId);
      
      // Clean up match chat messages after some time (optional - keep for history)
      setTimeout(() => {
        if (chatMessages.matches.has(matchId)) {
          chatMessages.matches.delete(matchId);
          console.log(`🧹 [Chat] Cleaned up chat messages for match ${matchId}`);
        }
      }, 60000); // Keep messages for 1 minute after match ends
      
      console.log(`🧹 [Multiplayer] Match ${matchId} cleaned up`);
      
    } catch (err) {
      console.error('❌ [Multiplayer] Error in handleMultiplayerGameEnd:', err);
    }
  };

  socket.on('disconnect', async () => {
    console.log('🔌 [WebSocket] Disconnected:', socket.id);
    
    // Handle multiplayer abandonment first
    await handleMultiplayerAbandon(socket.id);
    
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
  console.log(`🎮 [Matchmaking] Available players:`, players.map(p => `${p.player.username} (${p.player.rating || 'no rating'})`));
  
  let bestMatch = null;
  let bestRatingDifference = Infinity;
  
  if (gameMode === 'competitive') {
    // Rating-based matchmaking for competitive games
    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        
        const rating1 = player1.player.rating || 1200;
        const rating2 = player2.player.rating || 1200;
        const ratingDifference = Math.abs(rating1 - rating2);
        
        console.log(`🎯 [Matchmaking] Checking match: ${player1.player.username} (${rating1}) vs ${player2.player.username} (${rating2}), diff: ${ratingDifference}`);
        
        // Check if both players are still online
        if (!onlinePlayers.has(player1.socketId) || !onlinePlayers.has(player2.socketId)) {
          console.warn(`⚠️ [Matchmaking] One or both players not online anymore`);
          continue;
        }
        
        // Find the closest rating match within acceptable range
        const maxDifference = player1.ratingRange || 200;
        if (ratingDifference <= maxDifference && ratingDifference < bestRatingDifference) {
          bestMatch = { player1, player2 };
          bestRatingDifference = ratingDifference;
        }
      }
    }
    
    if (!bestMatch) {
      console.log(`⏳ [Matchmaking] No suitable rating matches found in competitive queue`);
      return;
    }
    
    console.log(`🎯 [Matchmaking] Best match found: ${bestMatch.player1.player.username} (${bestMatch.player1.player.rating}) vs ${bestMatch.player2.player.username} (${bestMatch.player2.player.rating}), diff: ${bestRatingDifference}`);
    
  } else {
    // Simple FIFO matchmaking for unranked games
    const player1 = players[0];
    const player2 = players[1];
    
    // Check if both players are still online
    if (!onlinePlayers.has(player1.socketId) || !onlinePlayers.has(player2.socketId)) {
      console.warn(`⚠️ [Matchmaking] One or both players not online anymore`);
      return;
    }
    
    bestMatch = { player1, player2 };
    console.log(`🤝 [Matchmaking] FIFO match: ${player1.player.username} vs ${player2.player.username}`);
  }
  
  const { player1, player2 } = bestMatch;

  // Create match
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const match = {
    matchId,
    gameMode,
    player1: { ...player1.player, socketId: player1.socketId },
    player2: { ...player2.player, socketId: player2.socketId },
    startTime: new Date(),
    moveCount: 0,
    moveHistory: [],
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

  // Notify players with rating information
  const matchData1 = {
    matchId,
    opponent: player2.player,
    gameMode,
    playerColor: 'white',
    yourRating: player1.player.rating || 1200,
    opponentRating: player2.player.rating || 1200,
    // Add more game setup info
    birdPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true },
    pigPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true }
  };
  const matchData2 = {
    matchId,
    opponent: player1.player,
    gameMode,
    playerColor: 'black',
    yourRating: player2.player.rating || 1200,
    opponentRating: player1.player.rating || 1200,
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
    activeMatches: activeMatches.size,
    chatStats: {
      lobbyMessages: chatMessages.lobby.length,
      activeMatchChats: chatMessages.matches.size,
      totalMatchMessages: Array.from(chatMessages.matches.values())
        .reduce((total, messages) => total + messages.length, 0)
    }
  });
});

// Fallback handler for multiplayer games when rating service fails
async function handleMultiplayerGameFallback(match, result, winnerColor, reason, matchDuration) {
  console.log('⚠️ [Multiplayer] Using fallback game processing...');
  
  try {
    const User = require('./models/User');
    const gameId = `multiplayer_fallback_${match.matchId}_${Date.now()}`;
    
    let winner, loser;
    
    if (result === 'draw') {
      // Both players get draw results
      const [player1User, player2User] = await Promise.all([
        User.findById(match.player1.userId),
        User.findById(match.player2.userId)
      ]);
      
      if (player1User) {
        const player1GameData = {
          gameId,
          gameType: match.gameMode === 'competitive' ? 'multiplayer_competitive' : 'multiplayer_unranked',
          opponent: match.player2.username,
          result: 'draw',
          duration: matchDuration,
          movesPlayed: match.moveCount || 0,
          moves: match.moveHistory || [],
          coinsEarned: 50,
          energySpent: 1,
          playerColor: 'white',
          endReason: reason
        };
        
        player1User.recordGameResult(player1GameData);
        await player1User.save();
      }
      
      if (player2User) {
        const player2GameData = {
          gameId,
          gameType: match.gameMode === 'competitive' ? 'multiplayer_competitive' : 'multiplayer_unranked',
          opponent: match.player1.username,
          result: 'draw',
          duration: matchDuration,
          movesPlayed: match.moveCount || 0,
          moves: match.moveHistory || [],
          coinsEarned: 50,
          energySpent: 1,
          playerColor: 'black',
          endReason: reason
        };
        
        player2User.recordGameResult(player2GameData);
        await player2User.save();
      }
      
    } else {
      // Win/loss scenario
      if (winnerColor === 'white') {
        winner = match.player1;
        loser = match.player2;
      } else {
        winner = match.player2;
        loser = match.player1;
      }
      
      const [winnerUser, loserUser] = await Promise.all([
        User.findById(winner.userId),
        User.findById(loser.userId)
      ]);
      
      if (winnerUser) {
        const winnerGameData = {
          gameId,
          gameType: match.gameMode === 'competitive' ? 'multiplayer_competitive' : 'multiplayer_unranked',
          opponent: loser.username,
          result: 'win',
          duration: matchDuration,
          movesPlayed: match.moveCount || 0,
          moves: match.moveHistory || [],
          coinsEarned: 250,
          energySpent: 1,
          playerColor: (match.player1.userId === winner.userId) ? 'white' : 'black',
          endReason: reason
        };
        
        winnerUser.recordGameResult(winnerGameData);
        await winnerUser.save();
      }
      
      if (loserUser) {
        const loserGameData = {
          gameId,
          gameType: match.gameMode === 'competitive' ? 'multiplayer_competitive' : 'multiplayer_unranked',
          opponent: winner.username,
          result: 'loss',
          duration: matchDuration,
          movesPlayed: match.moveCount || 0,
          moves: match.moveHistory || [],
          coinsEarned: 0,
          energySpent: 1,
          playerColor: (match.player1.userId === loser.userId) ? 'white' : 'black',
          endReason: reason
        };
        
        loserUser.recordGameResult(loserGameData);
        await loserUser.save();
      }
    }
    
    console.log('✅ [Multiplayer] Fallback game processing completed');
  } catch (error) {
    console.error('❌ [Multiplayer] Fallback game processing failed:', error);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 WebSocket server ready`);
});