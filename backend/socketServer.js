const { Server } = require('socket.io');
const http = require('http');

// Create a separate HTTP server for WebSocket on port 5001
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now
    methods: ["GET", "POST"]
  }
});

// Store active games
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('🔌 [WebSocket] New connection:', socket.id);

  // Test connection
  socket.emit('connected', { message: 'Connected to WebSocket server', socketId: socket.id });

  // Handle player timeout events
  socket.on('playerTimeout', (data) => {
    console.log('⏰ [WebSocket] Player timeout event received:', data);
    console.log('⏰ [WebSocket] Broadcasting to all other clients...');
    
    const { gameId, player, winner } = data;
    
    const timeoutEvent = {
      gameId,
      player,
      winner,
      timestamp: Date.now()
    };
    
    // Broadcast timeout event to all OTHER connected clients
    socket.broadcast.emit('playerTimeout', timeoutEvent);
    console.log('⏰ [WebSocket] Timeout event broadcasted:', timeoutEvent);
    console.log('⏰ [WebSocket] Number of connected clients:', io.sockets.sockets.size);
  });

  // Handle game start
  socket.on('start-game', (data) => {
    console.log('🎮 [WebSocket] Game start request:', data);
    
    const gameId = `game_${socket.id}_${Date.now()}`;
    activeGames.set(gameId, {
      socketId: socket.id,
      ...data,
      startTime: new Date()
    });

    console.log(`✅ [WebSocket] Game ${gameId} started`);
    console.log(`📊 [WebSocket] Active games: ${activeGames.size}`);
    
    socket.emit('game-started', { gameId, success: true });
  });

  // Handle game end
  socket.on('end-game', (data) => {
    console.log('🏁 [WebSocket] Game end request:', data);
    
    const { gameId } = data;
    if (activeGames.has(gameId)) {
      const gameSession = activeGames.get(gameId);
      console.log(`💾 [WebSocket] Saving game ${gameId} to database:`, data);
      
      // TODO: Save to MongoDB here
      
      activeGames.delete(gameId);
      console.log(`✅ [WebSocket] Game ${gameId} ended and saved`);
      console.log(`📊 [WebSocket] Active games: ${activeGames.size}`);
      
      socket.emit('game-ended', { success: true });
    } else {
      console.warn(`⚠️ [WebSocket] Game ${gameId} not found`);
      socket.emit('game-error', { message: 'Game not found' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 [WebSocket] Disconnected:', socket.id);
    
    // Clean up any games for this socket
    for (const [gameId, gameData] of activeGames.entries()) {
      if (gameData.socketId === socket.id) {
        console.log(`💀 [WebSocket] Cleaning up abandoned game: ${gameId}`);
        activeGames.delete(gameId);
      }
    }
    console.log(`📊 [WebSocket] Active games after cleanup: ${activeGames.size}`);
  });
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`🚀 [WebSocket] Server running on http://localhost:${PORT}`);
});
