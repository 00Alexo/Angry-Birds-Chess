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
      
      // Improved WebSocket configuration for better stability
      const opts = {
        path: '/socket.io',
        transports: ['polling', 'websocket'], // Allow both transports
        upgrade: true, // Allow upgrading to websocket
        reconnection: true,
        reconnectionAttempts: 10, // More attempts
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10,
        timeout: 20000, // Longer timeout
        forceNew: false,
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
        console.log('[MultiplayerSocket] ✅ Connected! Socket ID:', this.socket.id);
        console.log('[MultiplayerSocket] Transport:', this.socket.io.engine.transport.name);
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
        console.error('[MultiplayerSocket] ❌ Connection error:', err);
        this.connected = false;
        // With polling-only, connect_error indicates server unreachable
        reject(err);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[MultiplayerSocket] ⚠️  Disconnected. Reason:', reason);
        this.connected = false;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('[MultiplayerSocket] 🔄 Reconnected after', attemptNumber, 'attempts');
        this.connected = true;
        // Re-announce presence after reconnection
        this.socket.emit('multiplayer:join', { username, userId, rating });
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[MultiplayerSocket] 🔄 Reconnection attempt', attemptNumber);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('[MultiplayerSocket] ❌ Reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('[MultiplayerSocket] ❌ Reconnection failed - giving up');
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

  // Resign from multiplayer game
  resignGame(matchId) {
    console.log('[MultiplayerSocket] ===== RESIGNING FROM GAME =====');
    console.log('[MultiplayerSocket] Match ID:', matchId);
    
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] ❌ Cannot resign - not connected');
      return false;
    }
    
    if (!matchId) {
      console.error('[MultiplayerSocket] ❌ No matchId provided for resignation');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:resign', { matchId });
      console.log('[MultiplayerSocket] ✅ Resignation sent to backend successfully');
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] ❌ Error sending resignation:', error);
      return false;
    }
  }

  // Send natural game end (checkmate, draw, stalemate) to backend
  endGame(matchId, result, winnerColor, reason) {
    console.log('[MultiplayerSocket] ===== SENDING NATURAL GAME END =====');
    console.log('[MultiplayerSocket] Match ID:', matchId);
    console.log('[MultiplayerSocket] Result:', result);
    console.log('[MultiplayerSocket] Winner color:', winnerColor);
    console.log('[MultiplayerSocket] Reason:', reason);
    
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] ❌ Cannot send game end - not connected');
      return false;
    }
    
    if (!matchId || !result || !reason) {
      console.error('[MultiplayerSocket] ❌ Invalid game end data - missing required fields');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:game-ended', { 
        matchId, 
        result, 
        winnerColor, 
        reason 
      });
      console.log('[MultiplayerSocket] ✅ Natural game end sent to backend successfully');
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] ❌ Error sending natural game end:', error);
      return false;
    }
  }

  // Listen for opponent moves
  onOpponentMove(cb) {
    console.log('[MultiplayerSocket] ===== SETTING UP OPPONENT MOVE LISTENER =====');
    console.log('[MultiplayerSocket] Socket exists:', !!this.socket);
    console.log('[MultiplayerSocket] Socket connected:', this.connected);
    console.log('[MultiplayerSocket] Socket ID:', this.socket?.id);
    
    if (!this.socket) {
      console.error('[MultiplayerSocket] ❌ No socket available for opponent move listener!');
      return () => {};
    }
    
    // Remove any existing listeners to prevent duplicates
    this.socket.removeAllListeners('multiplayer:opponent-move');
    
    const handler = (moveData) => {
      console.log('[MultiplayerSocket] 🎯 ===== OPPONENT MOVE RECEIVED FROM BACKEND =====');
      console.log('[MultiplayerSocket] Socket ID that received:', this.socket.id);
      console.log('[MultiplayerSocket] Raw move data from backend:', JSON.stringify(moveData, null, 2));
      console.log('[MultiplayerSocket] Calling callback function...');
      cb(moveData);
      console.log('[MultiplayerSocket] ✅ Callback function called successfully');
    };
    
    this.socket.on('multiplayer:opponent-move', handler);
    console.log('[MultiplayerSocket] ✅ Opponent move listener registered successfully');
    
    return () => {
      console.log('[MultiplayerSocket] Removing opponent move listener');
      if (this.socket) {
        this.socket.off('multiplayer:opponent-move', handler);
      }
    };
  }

  // Listen for game end events
  onGameEnd(cb) {
    console.log('[MultiplayerSocket] Setting up game end listener');
    if (!this.socket) return () => {};
    const handler = (data) => {
      console.log('[MultiplayerSocket] Game ended:', data);
      cb(data.result, data.reason || '', data);
    };
    this.socket.on('multiplayer:game-end', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing game end listener');
      this.socket.off('multiplayer:game-end', handler);
    };
  }

  // Listen for player timeout events
  onPlayerTimeout(cb) {
    console.log('[MultiplayerSocket] Setting up player timeout listener');
    if (!this.socket) return () => {};
    const handler = (data) => {
      console.log('[MultiplayerSocket] Player timeout received:', data);
      cb(data);
    };
    this.socket.on('playerTimeout', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing player timeout listener');
      this.socket.off('playerTimeout', handler);
    };
  }

  // Chat functionality
  sendChatMessage(messageData) {
    console.log('[MultiplayerSocket] Sending chat message:', messageData);
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] Cannot send chat message - not connected');
      return false;
    }
    
    if (!messageData?.matchId || !messageData?.message || !messageData?.sender) {
      console.error('[MultiplayerSocket] Invalid chat message data - missing required fields');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:chat-message', messageData);
      console.log('[MultiplayerSocket] Chat message sent successfully');
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] Error sending chat message:', error);
      return false;
    }
  }

  sendTypingIndicator(data) {
    console.log('[MultiplayerSocket] Sending typing indicator:', data);
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] Cannot send typing indicator - not connected');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:typing', data);
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] Error sending typing indicator:', error);
      return false;
    }
  }

  onChatMessage(cb) {
    console.log('[MultiplayerSocket] Setting up chat message listener');
    if (!this.socket) return () => {};
    const handler = (messageData) => {
      console.log('[MultiplayerSocket] Received chat message:', messageData);
      cb(messageData);
    };
    this.socket.on('multiplayer:chat-message', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing chat message listener');
      this.socket.off('multiplayer:chat-message', handler);
    };
  }

  onTypingIndicator(cb) {
    console.log('[MultiplayerSocket] Setting up typing indicator listener');
    if (!this.socket) return () => {};
    const handler = (data) => {
      console.log('[MultiplayerSocket] Received typing indicator:', data);
      cb(data);
    };
    this.socket.on('multiplayer:typing', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing typing indicator listener');
      this.socket.off('multiplayer:typing', handler);
    };
  }

  // Lobby chat functionality
  sendLobbyChatMessage(messageData) {
    console.log('[MultiplayerSocket] Sending lobby chat message:', messageData);
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] Cannot send lobby chat message - not connected');
      return false;
    }
    
    if (!messageData?.message || !messageData?.sender) {
      console.error('[MultiplayerSocket] Invalid lobby chat message data - missing required fields');
      return false;
    }
    
    try {
      this.socket.emit('multiplayer:lobby-chat', messageData);
      console.log('[MultiplayerSocket] Lobby chat message sent successfully');
      return true;
    } catch (error) {
      console.error('[MultiplayerSocket] Error sending lobby chat message:', error);
      return false;
    }
  }

  onLobbyChatMessage(cb) {
    console.log('[MultiplayerSocket] Setting up lobby chat message listener');
    if (!this.socket) return () => {};
    const handler = (messageData) => {
      console.log('[MultiplayerSocket] Received lobby chat message:', messageData);
      cb(messageData);
    };
    this.socket.on('multiplayer:lobby-chat', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing lobby chat message listener');
      this.socket.off('multiplayer:lobby-chat', handler);
    };
  }

  onLobbyMessages(cb) {
    console.log('[MultiplayerSocket] Setting up lobby messages listener');
    if (!this.socket) return () => {};
    const handler = (messages) => {
      console.log('[MultiplayerSocket] Received lobby messages:', messages);
      cb(messages);
    };
    this.socket.on('multiplayer:lobby-messages', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing lobby messages listener');
      this.socket.off('multiplayer:lobby-messages', handler);
    };
  }

  requestLobbyMessages() {
    console.log('[MultiplayerSocket] Requesting recent lobby messages');
    if (!this.socket || !this.connected) {
      console.log('[MultiplayerSocket] Cannot request lobby messages - not connected');
      return;
    }
    this.socket.emit('multiplayer:get-lobby-messages');
  }

  onLobbyMessages(cb) {
    console.log('[MultiplayerSocket] Setting up lobby messages listener');
    if (!this.socket) return () => {};
    const handler = (messages) => {
      console.log('[MultiplayerSocket] Received lobby messages:', messages);
      cb(messages);
    };
    this.socket.on('multiplayer:lobby-messages', handler);
    return () => {
      console.log('[MultiplayerSocket] Removing lobby messages listener');
      this.socket.off('multiplayer:lobby-messages', handler);
    };
  }

  setStatus(status) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('multiplayer:status', { status });
  }

  // Generic emit method for custom events
  emit(event, data) {
    console.log(`[MultiplayerSocket] Emitting ${event}:`, data);
    if (!this.socket || !this.connected) {
      console.error('[MultiplayerSocket] Cannot emit - not connected');
      return false;
    }
    this.socket.emit(event, data);
    return true;
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
