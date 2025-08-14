import React, { useState, useEffect } from 'react';
import { 
  IoArrowBack, IoPeople, IoGameController, IoTime, IoTrophy, 
  IoSearch, IoClose, IoPlay, IoStop, IoSettings,
  IoCheckmark, IoEllipsisHorizontal, IoFlash, IoShield,
  IoStar, IoSkull, IoPerson, IoGlobe, IoEyeOff
} from 'react-icons/io5';
import multiplayerSocket from '../services/multiplayerSocket';

const MultiplayerPage = ({ onBack, onStartGame, userName, userId, playerInventory }) => {
  const [activeTab, setActiveTab] = useState('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQueuing, setIsQueuing] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [selectedGameMode, setSelectedGameMode] = useState('competitive');
  const [queueStats, setQueueStats] = useState({ competitive: 0, unranked: 0 });
  const [matchFound, setMatchFound] = useState(null);
  const [matchCountdown, setMatchCountdown] = useState(0);
  const [isMatchStarting, setIsMatchStarting] = useState(false);

  const [onlinePlayers, setOnlinePlayers] = useState([]);

  const [matchHistory] = useState([
    {
      id: 1,
      opponent: 'ChessMaster92',
      opponentRating: 2450,
      result: 'win',
      gameMode: 'competitive',
      duration: 1800000,
      movesPlayed: 45,
      ratingChange: +25,
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: 2,
      opponent: 'PigDestroyer',
      opponentRating: 2180,
      result: 'loss',
      gameMode: 'competitive',
      duration: 2400000,
      movesPlayed: 62,
      ratingChange: -18,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: 3,
      opponent: 'AngryBirdFan',
      opponentRating: 1890,
      result: 'draw',
      gameMode: 'unranked',
      duration: 3600000,
      movesPlayed: 78,
      ratingChange: 0,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: 4,
      opponent: 'RedBirdWarrior',
      opponentRating: 1650,
      result: 'in-progress',
      gameMode: 'competitive',
      duration: 900000,
      movesPlayed: 24,
      ratingChange: 0,
      date: new Date(Date.now() - 15 * 60 * 1000),
      status: 'active'
    }
  ]);

  // Function to start the multiplayer game
  const startMultiplayerGame = (matchData) => {
    console.log('[MultiplayerPage] Match countdown finished, starting multiplayer game:', matchData);
    
    // Reset state
    setMatchFound(null);
    setMatchCountdown(0);
    setIsMatchStarting(false);
    
    // Prepare level data for ChessBoardPage
    const levelData = {
      isMultiplayer: true,
      matchId: matchData.matchId,
      gameMode: matchData.gameMode,
      playerColor: matchData.playerColor, // 'white' or 'black'
      opponent: matchData.opponent,
      name: `Multiplayer vs ${matchData.opponent.username}`,
      terrain: 'Multiplayer Arena',
      birdPieces: matchData.birdPieces || { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true },
      pigPieces: matchData.pigPieces || { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true }
    };
    
    console.log('[MultiplayerPage] Starting game with levelData:', levelData);
    
    // Call the onStartGame callback with multiplayer level data
    if (onStartGame) {
      onStartGame(levelData);
    }
  };

  // Queue timer effect
  useEffect(() => {
    let interval;
    if (isQueuing) {
      interval = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    } else {
      setQueueTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isQueuing]);

  // Match countdown timer effect
  useEffect(() => {
    let interval;
    if (isMatchStarting && matchCountdown > 0) {
      interval = setInterval(() => {
        setMatchCountdown(prev => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            // Countdown finished - start the game!
            console.log('[MultiplayerPage] Countdown finished, starting multiplayer game:', matchFound);
            setIsMatchStarting(false);
            startMultiplayerGame(matchFound);
            return 0;
          }
          return newCount;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMatchStarting, matchCountdown, matchFound]);

  // Multiplayer socket presence lifecycle
  useEffect(() => {
    console.log('[MultiplayerPage] Setting up multiplayer socket for user:', userName, 'userId:', userId);
    let unsubscribeOnlinePlayers = () => {};
    let unsubscribeQueueStats = () => {};
    let unsubscribeMatchFound = () => {};
    let queueStatsInterval;
    
    // Connect and announce presence
    multiplayerSocket.connect({ username: userName, userId: userId }).then(() => {
      console.log('[MultiplayerPage] Successfully connected to multiplayer socket');
      
      // Set up online players listener
      unsubscribeOnlinePlayers = multiplayerSocket.onOnlinePlayers((list) => {
        console.log('[MultiplayerPage] Processing online players list:', list);
        // Normalize fields to align UI needs
        const normalized = list.map((p, idx) => ({
          id: p.userId || p.socketId || idx,
          username: p.username || 'Player',
          rating: p.rating || 0,
          status: p.status || 'online',
          rank: p.rating >= 2400 ? 'Grandmaster' : p.rating >= 2100 ? 'Master' : p.rating >= 1800 ? 'Expert' : p.rating >= 1600 ? 'Advanced' : 'Intermediate',
          avatar: '🐦',
          isPlaying: p.status === 'in-game',
          winRate: 0
        }));
        console.log('[MultiplayerPage] Setting normalized players:', normalized);
        setOnlinePlayers(normalized);
      });

      // Set up queue stats listener
      unsubscribeQueueStats = multiplayerSocket.onQueueStats((stats) => {
        console.log('[MultiplayerPage] Queue stats updated:', stats);
        setQueueStats(stats);
      });

      // Set up match found listener
      unsubscribeMatchFound = multiplayerSocket.onMatchFound((matchData) => {
        console.log('[MultiplayerPage] Match found!', matchData);
        setMatchFound(matchData);
        setIsQueuing(false);
        setIsMatchStarting(true);
        setMatchCountdown(3); // Start 3-second countdown
      });
      
      // Proactively request the current lists
      console.log('[MultiplayerPage] Requesting initial data');
      multiplayerSocket.requestOnlinePlayers();
      multiplayerSocket.requestQueueStats();

      // Set up periodic queue stats refresh
      queueStatsInterval = setInterval(() => {
        multiplayerSocket.requestQueueStats();
      }, 2000);
      
    }).catch((error) => {
      console.error('[MultiplayerPage] Failed to connect to multiplayer socket:', error);
    });

    return () => {
      console.log('[MultiplayerPage] Cleaning up multiplayer socket listeners');
      if (queueStatsInterval) clearInterval(queueStatsInterval);
      unsubscribeOnlinePlayers();
      unsubscribeQueueStats();
      unsubscribeMatchFound();
      // DON'T disconnect the socket - it needs to persist for the game
      console.log('[MultiplayerPage] Socket listeners cleaned up but connection preserved for game');
    };
  }, [userName, userId]);

  // Helper functions
  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return 'N/A';
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatQueueTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'in-game': return 'text-blue-400';
      case 'away': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '🟢';
      case 'in-game': return '🎮';
      case 'away': return '🟡';
      default: return '⚫';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 'Grandmaster': return 'text-purple-400 bg-purple-900/30';
      case 'Master': return 'text-blue-400 bg-blue-900/30';
      case 'Expert': return 'text-green-400 bg-green-900/30';
      case 'Advanced': return 'text-yellow-400 bg-yellow-900/30';
      case 'Intermediate': return 'text-orange-400 bg-orange-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const filteredPlayers = onlinePlayers.filter(player =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartQueue = () => {
    console.log('[MultiplayerPage] Starting queue for mode:', selectedGameMode);
    setIsQueuing(true);
    multiplayerSocket.joinQueue(selectedGameMode);
  };

  const handleStopQueue = () => {
    console.log('[MultiplayerPage] Stopping queue');
    setIsQueuing(false);
    multiplayerSocket.leaveQueue();
  };

  // Render Queue Tab
  const renderQueueTab = () => (
    <div className="space-y-6">
      {/* Game Mode Selection */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoGameController className="mr-2 text-blue-400" />
          Game Mode
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Competitive Mode */}
          <button
            onClick={() => setSelectedGameMode('competitive')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedGameMode === 'competitive'
                ? 'border-yellow-400 bg-yellow-900/30'
                : 'border-white/30 bg-black/20 hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <IoTrophy className="text-4xl text-yellow-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Competitive</h4>
              <p className="text-white/80 text-sm mb-3">Ranked matches that affect your rating</p>
              <div className="flex justify-center items-center space-x-2">
                <IoFlash className="text-yellow-400" />
                <span className="text-yellow-300 text-sm font-medium">Rating Changes</span>
              </div>
            </div>
          </button>

          {/* Unranked Mode */}
          <button
            onClick={() => setSelectedGameMode('unranked')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedGameMode === 'unranked'
                ? 'border-blue-400 bg-blue-900/30'
                : 'border-white/30 bg-black/20 hover:border-white/50'
            }`}
          >
            <div className="text-center">
              <IoShield className="text-4xl text-blue-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Unranked</h4>
              <p className="text-white/80 text-sm mb-3">Casual matches for fun and practice</p>
              <div className="flex justify-center items-center space-x-2">
                <IoEyeOff className="text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">No Rating Risk</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Queue Section */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <IoPlay className="mr-2 text-green-400" />
            Find Match
          </div>
          <div className="text-sm text-white/60">
            🎯 {queueStats[selectedGameMode] || 0} in {selectedGameMode} queue
          </div>
        </h3>

        {!isQueuing ? (
          <div className="text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h4 className="text-lg font-bold text-white mb-2">
                Ready to play {selectedGameMode === 'competitive' ? 'Ranked' : 'Casual'}?
              </h4>
              <p className="text-white/80 mb-2">
                {selectedGameMode === 'competitive' 
                  ? 'Your rating will be affected by the match result' 
                  : 'Practice your skills in a relaxed environment'}
              </p>
              <p className="text-sm text-white/60">
                {queueStats[selectedGameMode] > 0 
                  ? `${queueStats[selectedGameMode]} player${queueStats[selectedGameMode] === 1 ? '' : 's'} currently in queue`
                  : 'Be the first in queue!'}
              </p>
            </div>
            
            <button
              onClick={handleStartQueue}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                         text-white font-bold text-xl px-8 py-4 rounded-full shadow-xl 
                         transform hover:scale-105 transition-all duration-300 flex items-center justify-center mx-auto"
            >
              <IoPlay className="mr-3" size={24} />
              START QUEUE
            </button>
            
            <div className="mt-4 text-sm text-white/60">
              {queueStats[selectedGameMode] > 0 
                ? 'Expected match time: < 1 minute'
                : 'Average queue time: ~2-3 minutes'}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="animate-spin text-6xl mb-4">⚡</div>
              <h4 className="text-lg font-bold text-white mb-2">Finding Opponent...</h4>
              <p className="text-white/80 mb-4">
                Looking for a {selectedGameMode === 'competitive' ? 'ranked' : 'casual'} match
              </p>
              <p className="text-sm text-white/60 mb-2">
                Position in queue: {queueStats[selectedGameMode] > 0 ? `~${Math.ceil(queueStats[selectedGameMode] / 2)}` : '1'}
              </p>
              
              <div className="text-3xl font-mono text-yellow-400 mb-4">
                {formatQueueTime(queueTime)}
              </div>
            </div>
            
            <button
              onClick={handleStopQueue}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                         text-white font-bold text-lg px-6 py-3 rounded-full shadow-lg 
                         transform hover:scale-105 transition-all duration-300 flex items-center justify-center mx-auto"
            >
              <IoStop className="mr-2" size={20} />
              CANCEL QUEUE
            </button>
          </div>
        )}
      </div>

      {/* Current Stats Summary */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoStar className="mr-2 text-purple-400" />
          Your Stats
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">1650</div>
            <div className="text-sm text-white/80">Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">73%</div>
            <div className="text-sm text-white/80">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">127</div>
            <div className="text-sm text-white/80">Games Played</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">Advanced</div>
            <div className="text-sm text-white/80">Rank</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Online Players Tab
  const renderOnlinePlayersTab = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/30">
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/30 rounded-lg text-white placeholder-white/50 focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Players List */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <IoPeople className="mr-2 text-green-400" />
            Online Players ({filteredPlayers.length})
          </div>
          <div className="text-sm text-white/60">
            🟢 {onlinePlayers.filter(p => p.status === 'online').length} Online
          </div>
        </h3>

        <div className="space-y-3">
          {filteredPlayers.map((player) => (
            <div key={player.id} className="bg-black/40 rounded-lg p-4 border border-white/20 hover:border-white/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{player.avatar}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{player.username}</span>
                      <span className="text-sm">{getStatusIcon(player.status)}</span>
                      <span className={`text-xs ${getStatusColor(player.status)}`}>
                        {player.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`text-xs px-2 py-1 rounded ${getRankColor(player.rank)}`}>
                        {player.rank}
                      </span>
                      <span className="text-sm text-white/70">
                        Rating: <span className="text-yellow-400 font-medium">{player.rating}</span>
                      </span>
                      <span className="text-sm text-white/70">
                        Win Rate: <span className="text-green-400 font-medium">{player.winRate}%</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {player.status === 'online' && !player.isPlaying && (
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-1 transition-colors">
                      <IoGameController size={16} />
                      <span>Challenge</span>
                    </button>
                  )}
                  {player.isPlaying && (
                    <div className="bg-yellow-900/30 text-yellow-400 px-3 py-2 rounded-lg text-sm flex items-center space-x-1">
                      <IoGameController size={16} />
                      <span>Playing</span>
                    </div>
                  )}
                  {player.status !== 'online' && (
                    <div className="bg-gray-900/30 text-gray-400 px-3 py-2 rounded-lg text-sm">
                      Unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-white/70">No players found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Match History Tab
  const renderMatchHistoryTab = () => (
    <div className="space-y-6">
      {/* Active Matches */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoFlash className="mr-2 text-yellow-400" />
          Active Matches
        </h3>
        
        {matchHistory.filter(match => match.status === 'active').length > 0 ? (
          <div className="space-y-3">
            {matchHistory.filter(match => match.status === 'active').map((match) => (
              <div key={match.id} className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-white">vs {match.opponent}</span>
                      <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                        IN PROGRESS
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        match.gameMode === 'competitive' 
                          ? 'bg-yellow-900/30 text-yellow-400' 
                          : 'bg-blue-900/30 text-blue-400'
                      }`}>
                        {match.gameMode}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-white/80">
                      <span>Duration: {formatDuration(match.duration)}</span>
                      <span>Moves: {match.movesPlayed}</span>
                      <span>Started: {match.date.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-1 transition-colors">
                      <IoPlay size={16} />
                      <span>Resume</span>
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm">
                      <IoEllipsisHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/70">No active matches.</p>
          </div>
        )}
      </div>

      {/* Match History */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoTime className="mr-2 text-blue-400" />
          Recent Matches
        </h3>
        
        <div className="space-y-3">
          {matchHistory.filter(match => match.status === 'completed').map((match) => (
            <div key={match.id} className={`p-4 rounded-lg border transition-all ${
              match.result === 'win' 
                ? 'bg-green-900/20 border-green-400/30' 
                : match.result === 'loss' 
                  ? 'bg-red-900/20 border-red-400/30'
                  : 'bg-yellow-900/20 border-yellow-400/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                      match.result === 'win' 
                        ? 'bg-green-500 text-white' 
                        : match.result === 'loss' 
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-black'
                    }`}>
                      {match.result.toUpperCase()}
                    </span>
                    <span className="font-bold text-white">vs {match.opponent}</span>
                    <span className="text-white/60 text-sm">({match.opponentRating})</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      match.gameMode === 'competitive' 
                        ? 'bg-yellow-900/30 text-yellow-400' 
                        : 'bg-blue-900/30 text-blue-400'
                    }`}>
                      {match.gameMode}
                    </span>
                    {match.gameMode === 'competitive' && match.ratingChange !== 0 && (
                      <span className={`text-sm font-bold ${
                        match.ratingChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {match.ratingChange > 0 ? '+' : ''}{match.ratingChange}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-white/70">
                    <div>
                      <span className="block text-xs">Duration</span>
                      <span className="text-white">{formatDuration(match.duration)}</span>
                    </div>
                    <div>
                      <span className="block text-xs">Moves</span>
                      <span className="text-white">{match.movesPlayed}</span>
                    </div>
                    <div>
                      <span className="block text-xs">Date</span>
                      <span className="text-white">{match.date.toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="block text-xs">Time</span>
                      <span className="text-white">{match.date.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-1 transition-colors">
                    <IoEllipsisHorizontal size={16} />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match Statistics */}
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoStar className="mr-2 text-purple-400" />
          Match Statistics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {matchHistory.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-sm text-white/80">Total Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {matchHistory.filter(m => m.result === 'win').length}
            </div>
            <div className="text-sm text-white/80">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {matchHistory.filter(m => m.result === 'loss').length}
            </div>
            <div className="text-sm text-white/80">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {matchHistory.filter(m => m.result === 'draw').length}
            </div>
            <div className="text-sm text-white/80">Draws</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-green-300 to-blue-500 p-4">
      {/* Match countdown overlay */}
      {matchFound && isMatchStarting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blur overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/50"></div>
          
          {/* Countdown content */}
          <div className="relative z-10 text-center">
            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-white/30 max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-6xl mb-4">⚔️</div>
                <h4 className="text-2xl font-bold text-white mb-2">Match Found!</h4>
                <p className="text-white/80 mb-4">
                  vs <span className="text-yellow-400 font-bold">{matchFound.opponent.username}</span>
                </p>
                <p className="text-sm text-white/60 mb-6">
                  {matchFound.gameMode} • You play as {matchFound.playerColor}
                </p>
              </div>
              
              {/* Countdown circle */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-yellow-400">{matchCountdown}</span>
                </div>
              </div>
              
              <p className="text-white/80 text-lg font-medium">
                Starting game...
              </p>
              <p className="text-white/60 text-sm mt-2">
                Get ready for battle!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/40 hover:border-white/60 transition-all duration-200"
        >
          <IoArrowBack size={20} />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-3xl font-bold text-white text-center flex-1">
          Multiplayer Arena
        </h1>
        
        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-white/40">
          <IoPerson className="text-white w-4 h-4" />
          <span className="text-white font-medium text-sm">{userName || 'Player'}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-black/40 backdrop-blur-md rounded-lg p-1">
        {[
          { id: 'queue', label: 'Find Match', icon: IoPlay },
          { id: 'players', label: 'Online Players', icon: IoPeople },
          { id: 'history', label: 'Match History', icon: IoTime }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon size={20} />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'queue' && renderQueueTab()}
        {activeTab === 'players' && renderOnlinePlayersTab()}
        {activeTab === 'history' && renderMatchHistoryTab()}
      </div>
    </div>
  );
};

export default MultiplayerPage;
