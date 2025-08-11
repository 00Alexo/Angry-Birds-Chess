import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // Connect to WebSocket for a specific game
  connectForGame() {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ [Socket] No token found');
        reject(new Error('No authentication token'));
        return;
      }

      console.log('🔌 [Socket] Connecting for game...', {
        url: process.env.REACT_APP_API_URL || 'http://localhost:5000',
        hasToken: !!token,
        tokenLength: token.length
      });
      
      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: { token },
        forceNew: true, // Always create a new connection for each game
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log('✅ [Socket] Connected successfully, socket ID:', this.socket.id);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ [Socket] Connection failed:', error.message);
        console.error('❌ [Socket] Full error details:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [Socket] Disconnected, reason:', reason);
        this.isConnected = false;
      });

      // Set up timeout
      setTimeout(() => {
        if (!this.isConnected) {
          console.error('❌ [Socket] Connection timeout after 5 seconds');
          console.error('❌ [Socket] Socket state:', {
            exists: !!this.socket,
            connected: this.socket?.connected,
            disconnected: this.socket?.disconnected
          });
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  // Start a game via WebSocket
  startGame(gameData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🎮 [Socket] Starting game:', gameData);

      this.socket.emit('start-game', gameData);

      this.socket.once('game-started', (response) => {
        console.log('✅ [Socket] Game started:', response);
        resolve(response);
      });

      this.socket.once('game-error', (error) => {
        console.error('❌ [Socket] Game start error:', error);
        reject(new Error(error.message || 'Failed to start game'));
      });

      // Timeout
      setTimeout(() => {
        reject(new Error('Start game timeout'));
      }, 10000);
    });
  }

  // End a game via WebSocket
  endGame(gameId, result, moves = 0, duration = 0, coinsEarned = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('� [Socket] Ending game:', { gameId, result, moves, duration });

      this.socket.emit('end-game', {
        gameId,
        result,
        moves,
        duration,
        coinsEarned
      });

      this.socket.once('game-ended', (response) => {
        console.log('✅ [Socket] Game ended successfully');
        resolve(response);
      });

      this.socket.once('game-error', (error) => {
        console.error('❌ [Socket] Game end error:', error);
        reject(new Error(error.message || 'Failed to end game'));
      });

      // Timeout
      setTimeout(() => {
        reject(new Error('End game timeout'));
      }, 10000);
    });
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.socket) {
      console.log('🔌 [Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id
    };
  }
}

export default new SocketService();
