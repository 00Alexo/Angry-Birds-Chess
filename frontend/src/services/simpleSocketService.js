import io from 'socket.io-client';

class SimpleSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 [Socket] Connecting to WebSocket server on port 5000...');
      
      this.socket = io('http://localhost:5000');

      this.socket.on('connect', () => {
        console.log('✅ [Socket] Connected! Socket ID:', this.socket.id);
        this.connected = true;
        resolve();
      });

      this.socket.on('connected', (data) => {
        console.log('🎉 [Socket] Server confirmed connection:', data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ [Socket] Connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 [Socket] Disconnected');
        this.connected = false;
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!this.connected) {
          console.error('❌ [Socket] Connection timeout');
          reject(new Error('Connection timeout'));
        }
      }, 3000);
    });
  }

  startGame(gameData) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'));
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
        reject(new Error(error.message));
      });

      setTimeout(() => reject(new Error('Start game timeout')), 5000);
    });
  }

  endGame(gameId, result, additionalData = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'));
        return;
      }

      console.log('🏁 [Socket] Ending game:', { gameId, result, ...additionalData });
      this.socket.emit('end-game', { gameId, result, ...additionalData });

      this.socket.once('game-ended', (response) => {
        console.log('✅ [Socket] Game ended:', response);
        resolve(response);
      });

      this.socket.once('game-error', (error) => {
        console.error('❌ [Socket] Game end error:', error);
        reject(new Error(error.message));
      });

      setTimeout(() => reject(new Error('End game timeout')), 5000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 [Socket] Disconnected manually');
    }
  }
}

export default new SimpleSocketService();
