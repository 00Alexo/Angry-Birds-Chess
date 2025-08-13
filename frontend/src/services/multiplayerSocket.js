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

      // Set up event listeners for debugging
      this.socket.on('multiplayer:queue-error', (error) => {
        console.error('[MultiplayerSocket] Queue error:', error);
      });
      
      this.socket.on('multiplayer:error', (error) => {
        console.error('[MultiplayerSocket] Multiplayer error:', error);
      });

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

  // Queue management
  joinQueue(gameMode) {
    console.log('[MultiplayerSocket] Joining queue:', gameMode);
    if (!this.socket || !this.connected) {
      console.log('[MultiplayerSocket] Cannot join queue - not connected');
      return;
    }
    this.socket.emit('multiplayer:join-queue', { gameMode });
  }

  leaveQueue() {
    console.log('[MultiplayerSocket] Leaving queue');
    if (!this.socket || !this.connected) {
      console.log('[MultiplayerSocket] Cannot leave queue - not connected');
      return;
    }
    this.socket.emit('multiplayer:leave-queue');
  }

  requestQueueStats() {
    console.log('[MultiplayerSocket] Requesting queue stats');
    if (!this.socket || !this.connected) {
      console.log('[MultiplayerSocket] Cannot request queue stats - not connected');
      return;
    }
    this.socket.emit('multiplayer:get-queue-stats');
  }

  onQueueStats(cb) {
    console.log('[MultiplayerSocket] Setting up queue stats listener');
    if (!this.socket) return () => {};
    const handler = (stats) => {
      console.log('[MultiplayerSocket] Received queue stats:', stats);
      cb(stats || { competitive: 0, unranked: 0 });
    };
    this.socket.on('multiplayer:queue-stats', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing queue stats listener');
      this.socket.off('multiplayer:queue-stats', handler);
    };
  }

  onMatchFound(cb) {
    console.log('[MultiplayerSocket] Setting up match found listener');
    if (!this.socket) return () => {};
    const handler = (matchData) => {
      console.log('[MultiplayerSocket] Match found:', matchData);
      cb(matchData);
    };
    this.socket.on('multiplayer:match-found', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing match found listener');
      this.socket.off('multiplayer:match-found', handler);
    };
  }

  // Send move to opponent in multiplayer game
  sendMove(moveData) {
    console.log('[MultiplayerSocket] ===== SENDING MOVE TO BACKEND =====');
    console.log('[MultiplayerSocket] Move data:', JSON.stringify(moveData, null, 2));
    console.log('[MultiplayerSocket] Socket connected:', this.connected);
    console.log('[MultiplayerSocket] Socket ID:', this.socket?.id);
    
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] ❌ Cannot send move - not connected');
      return false;
    }
    
    if (!moveData?.matchId || !moveData?.move || !moveData?.player) {
      console.error('[MultiplayerSocket] ❌ Invalid move data - missing required fields');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:move', moveData);
      console.log('[MultiplayerSocket] ✅ Move emitted to backend successfully');
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] ❌ Error emitting move:', error);
      return false;
    }
  }

  // Listen for opponent moves
  onOpponentMove(cb) {
    console.log('[MultiplayerSocket] ===== SETTING UP OPPONENT MOVE LISTENER =====');
    console.log('[MultiplayerSocket] Socket exists:', !!this.socket);
    console.log('[MultiplayerSocket] Socket connected:', this.connected);
    
    if (!this.socket) return () => {};
    
    const handler = (moveData) => {
      console.log('[MultiplayerSocket] 🎯 ===== OPPONENT MOVE RECEIVED FROM BACKEND =====');
      console.log('[MultiplayerSocket] Raw move data from backend:', JSON.stringify(moveData, null, 2));
      cb(moveData);
    };
    
    this.socket.on('multiplayer:opponent-move', handler);
    console.log('[MultiplayerSocket] ✅ Opponent move listener registered');
    
    return () => {
      console.log('[MultiplayerSocket] Removing opponent move listener');
      this.socket.off('multiplayer:opponent-move', handler);
    };
  }

  // Listen for game end events
  onGameEnd(cb) {
    console.log('[MultiplayerSocket] Setting up game end listener');
    if (!this.socket) return () => {};
    const handler = (data) => {
      console.log('[MultiplayerSocket] Game ended:', data);
      cb(data.result, data.reason || '');
    };
    this.socket.on('multiplayer:game-end', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing game end listener');
      this.socket.off('multiplayer:game-end', handler);
    };
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
