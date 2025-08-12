import io from 'socket.io-client';

class MultiplayerSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect({ username, userId, rating } = {}) {
    return new Promise((resolve, reject) => {
      console.log('[MultiplayerSocket] connect() called', { username, userId, rating, alreadyConnected: this.connected });
      
      if (this.socket && this.connected) {
        // Re-announce presence in case server restarted
        console.log('[MultiplayerSocket] Already connected, re-announcing presence');
        try { 
          this.socket.emit('multiplayer:join', { username, userId, rating }); 
          this.socket.emit('multiplayer:get-online-players');
        } catch (e) {
          console.error('[MultiplayerSocket] Failed to re-announce:', e);
        }
        resolve();
        return;
      }

      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Remove /api suffix if present since socket.io is on the root
      const socketUrl = baseUrl.replace(/\/api$/, '');
      console.log('[MultiplayerSocket] Connecting to:', socketUrl);
      
      // Use polling-only to avoid WS upgrade issues in dev environments
      const opts = {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
        withCredentials: false,
      };

      this.socket = io(socketUrl, opts);

      this.socket.on('connect', () => {
        console.log('[MultiplayerSocket] Connected! Socket ID:', this.socket.id);
        this.connected = true;
        // Join multiplayer presence on connect
        console.log('[MultiplayerSocket] Emitting multiplayer:join with:', { username, userId, rating });
        this.socket.emit('multiplayer:join', { username, userId, rating });
        // Immediately request list to avoid missing initial broadcast
        console.log('[MultiplayerSocket] Requesting online players list');
        this.socket.emit('multiplayer:get-online-players');
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('[MultiplayerSocket] Connection error:', err);
        this.connected = false;
        // With polling-only, connect_error indicates server unreachable
        reject(err);
      });

      this.socket.on('disconnect', () => {
        console.log('[MultiplayerSocket] Disconnected');
        this.connected = false;
      });
    });
  }  onOnlinePlayers(cb) {
    console.log('[MultiplayerSocket] Setting up onOnlinePlayers listener');
    if (!this.socket) return () => {};
    const handler = (list) => {
      console.log('[MultiplayerSocket] Received online players update:', list);
      cb(Array.isArray(list) ? list : []);
    };
    this.socket.on('multiplayer:online-players', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing online players listener');
      this.socket.off('multiplayer:online-players', handler);
    };
  }

  requestOnlinePlayers() {
    console.log('[MultiplayerSocket] Requesting online players list');
    if (!this.socket || !this.connected) {
      console.log('[MultiplayerSocket] Cannot request - not connected');
      return;
    }
    this.socket.emit('multiplayer:get-online-players');
  }

  setStatus(status) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('multiplayer:status', { status });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

export default new MultiplayerSocket();
