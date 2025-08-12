import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  IoArrowBack, IoPerson, IoStatsChart, IoCash, IoTime, IoFlame, IoGameController, IoList, 
  IoCube, IoConstruct, IoLayers, IoAnalytics, IoAlbums, IoEye
} from 'react-icons/io5';
import apiService from '../services/apiService';
import MovePreview from './MovePreview';

const ProfilePage = ({ onBack, playerInventory, userName, userStats, anyProfile }) => {
  // Removed edit name feature
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedGame, setExpandedGame] = useState(null); // For showing detailed moves
  const [showMovePreview, setShowMovePreview] = useState(false);
  const [previewMoves, setPreviewMoves] = useState([]);
  const [previewGameId, setPreviewGameId] = useState(null);
  const { user } = useAuth();
  const isOwnProfile = user && (user.username === userName);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch user profile from backend
  useEffect(() => {
    if (!userName) return;
    setLoading(true);
    setNotFound(false);
    const apiBase = process.env.REACT_APP_API_URL || '';
    fetch(`${apiBase}/auth/profile/${encodeURIComponent(userName)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          setProfileData(null);
        } else if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          // If authenticated and viewing own profile (match by username), fetch extended game history
          if (isOwnProfile) {
            try {
              setHistoryLoading(true);
              const historyData = await apiService.getGameHistory(historyLimit);
              setGameHistory(historyData.gameHistory || []);
            } catch (error) {
              console.error('Failed to fetch game history:', error);
              setGameHistory([]);
            } finally {
              setHistoryLoading(false);
            }
          }
        } else {
          setNotFound(true);
          setProfileData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setProfileData(null);
        setLoading(false);
      });
  }, [userName, historyLimit, isOwnProfile]);

  // Use backend data if available
  const stats = profileData?.playerData || userStats || {};
  const gameStats = profileData?.gameStats || {};
  
  // Derived analytics on games (excluding campaign games)
  const gameAnalytics = useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) return null;
    
    // Filter out campaign games for match history
    const matchHistory = gameHistory.filter(game => game.gameType !== 'campaign');
    if (matchHistory.length === 0) return null;
    
    const byResult = { win: 0, loss: 0, draw: 0, 'in-progress': 0 };
    const byType = { 'vs-ai': 0, campaign: 0, 'vs-player': 0 };
    const byEndReason = {}; // dynamic
    const difficultyWins = {}; // for vs-ai / campaign opponent field
    let fastestWin = null;
    let longestGame = null;
    let totalMoves = 0;
    let totalDuration = 0;
    matchHistory.forEach(g => {
      if (g.result && byResult[g.result] !== undefined) byResult[g.result]++;
      if (g.gameType && byType[g.gameType] !== undefined) byType[g.gameType]++;
      if (g.endReason) byEndReason[g.endReason] = (byEndReason[g.endReason] || 0) + 1;
      if (g.result === 'win') {
        const key = g.opponent || (g.gameType === 'campaign' ? `Level-${g.levelId}` : 'Unknown');
        difficultyWins[key] = (difficultyWins[key] || 0) + 1;
      }
      if (typeof g.movesPlayed === 'number') totalMoves += g.movesPlayed;
      if (typeof g.duration === 'number') {
        totalDuration += g.duration;
        if (g.result === 'win') {
          if (!fastestWin || g.duration < fastestWin.duration) fastestWin = g;
        }
        if (!longestGame || g.duration > longestGame.duration) longestGame = g;
      }
    });
    const avgMoves = totalMoves > 0 ? Math.round(totalMoves / matchHistory.length) : 0;
    const avgDurationMs = totalDuration > 0 ? totalDuration / matchHistory.length : 0;
    return { byResult, byType, byEndReason, difficultyWins, fastestWin, longestGame, avgMoves, avgDurationMs, matchHistory };
  }, [gameHistory]);

  // Calculate match-only stats (excluding campaign games)  
  const matchOnlyStats = useMemo(() => {
    if (!gameAnalytics || !gameAnalytics.matchHistory) return null;
    const matches = gameAnalytics.matchHistory;
    const totalMatches = matches.length;
    const wins = gameAnalytics.byResult.win || 0;
    const losses = gameAnalytics.byResult.loss || 0;
    const draws = gameAnalytics.byResult.draw || 0;
    const winRate = totalMatches > 0 ? Math.round(100 * wins / totalMatches) : 0;
    
    return {
      gamesPlayed: totalMatches,
      gamesWon: wins,
      gamesLost: losses,
      gamesDrawn: draws,
      winRate: winRate
    };
  }, [gameAnalytics]);

  // Calculate campaign-only stats
  const campaignStats = useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) return null;
    
    const campaignGames = gameHistory.filter(game => game.gameType === 'campaign');
    if (campaignGames.length === 0) return null;
    
    const totalCampaignGames = campaignGames.length;
    const campaignWins = campaignGames.filter(game => game.result === 'win').length;
    const campaignLosses = campaignGames.filter(game => game.result === 'loss').length;
    const campaignDraws = campaignGames.filter(game => game.result === 'draw').length;
    const campaignWinRate = totalCampaignGames > 0 ? Math.round(100 * campaignWins / totalCampaignGames) : 0;
    
    return {
      gamesPlayed: totalCampaignGames,
      gamesWon: campaignWins,
      gamesLost: campaignLosses,
      gamesDrawn: campaignDraws,
      winRate: campaignWinRate
    };
  }, [gameHistory]);
  
  const currentStats = {
    gamesPlayed: matchOnlyStats?.gamesPlayed || gameStats.gamesPlayed || stats.gamesPlayed || 0,
    gamesWon: matchOnlyStats?.gamesWon || gameStats.gamesWon || stats.gamesWon || 0,
    gamesLost: matchOnlyStats?.gamesLost || gameStats.gamesLost || stats.gamesLost || 0,
    gamesDrawn: matchOnlyStats?.gamesDrawn || gameStats.gamesDrawn || stats.gamesDrawn || 0,
    winRate: matchOnlyStats?.winRate || gameStats.winRate || (stats.gamesPlayed ? Math.round(100 * (stats.gamesWon || 0) / stats.gamesPlayed) : 0),
    totalPlayTime: gameStats.totalPlayTime || stats.totalPlayTime || 'N/A',
    favoriteOpening: gameStats.favoriteOpening || stats.favoriteOpening || 'N/A',
    longestWinStreak: gameStats.longestWinStreak || stats.longestWinStreak || 0,
    currentWinStreak: gameStats.currentWinStreak || stats.currentWinStreak || 0,
    totalCoinsEarned: gameStats.totalCoinsEarned || stats.totalCoinsEarned || 0,
    levelsCompleted: gameStats.levelsCompleted || stats.levelsCompleted || 0,
    averageGameLength: gameStats.averageGameLength || stats.averageGameLength || 'N/A',
  };

  const formatPlayTimeMs = (ms) => {
    if (!ms || ms <= 0) return 'N/A';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Helper function to get classification colors and icons
  const getClassificationDisplay = (classification) => {
    const displays = {
      'Brilliant': { color: 'text-cyan-400', bg: 'bg-cyan-900/30', icon: '🔷', symbol: '!!' },
      'Best': { color: 'text-green-400', bg: 'bg-green-900/30', icon: '✅', symbol: '' },
      'Excellent': { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '💎', symbol: '' },
      'Great': { color: 'text-purple-400', bg: 'bg-purple-900/30', icon: '⭐', symbol: '' },
      'Good': { color: 'text-gray-400', bg: 'bg-gray-900/30', icon: '👍', symbol: '' },
      'Inaccuracy': { color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: '⚠️', symbol: '?!' },
      'Mistake': { color: 'text-orange-400', bg: 'bg-orange-900/30', icon: '❗', symbol: '?' },
      'Blunder': { color: 'text-red-400', bg: 'bg-red-900/30', icon: '💥', symbol: '??' },
      'Missed Win': { color: 'text-pink-400', bg: 'bg-pink-900/30', icon: '❌', symbol: '??!' }
    };
    return displays[classification] || { color: 'text-gray-400', bg: 'bg-gray-900/30', icon: '', symbol: '' };
  };

  // Calculate move statistics for a game
  const calculateMoveStats = (moves) => {
    if (!Array.isArray(moves) || moves.length === 0) return null;
    
    // Only analyze player moves, ignore AI moves
    const playerMoves = moves.filter(move => move.actor === 'player');
    if (playerMoves.length === 0) return null;
    
    const stats = {};
    
    playerMoves.forEach(move => {
      if (!move.classification) return;
      stats[move.classification] = (stats[move.classification] || 0) + 1;
    });
    
    return { player: stats, totalPlayerMoves: playerMoves.length };
  };



  const renderOverview = () => (
    <div className="space-y-6">
      {/* Player Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <IoPerson size={32} className="text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">{userName || 'Anonymous Player'}</h2>
              </div>
              <p className="text-white/90">Chess Master in Training</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{currentStats.winRate}%</div>
            <div className="text-sm text-white/90">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-center border border-white/30">
          <IoGameController size={32} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {currentStats.gamesPlayed}
            {campaignStats && <span className="text-sm text-white/60 ml-1">({campaignStats.gamesPlayed})</span>}
          </div>
          <div className="text-sm text-white/90">
            Games Played
            {campaignStats && <div className="text-xs text-white/60">(Campaign in parentheses)</div>}
          </div>
        </div>
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-center border border-white/30">
          <IoStatsChart size={32} className="text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {currentStats.gamesWon}
            {campaignStats && <span className="text-sm text-white/60 ml-1">({campaignStats.gamesWon})</span>}
          </div>
          <div className="text-sm text-white/90">
            Victories
            {campaignStats && <div className="text-xs text-white/60">(Campaign in parentheses)</div>}
          </div>
        </div>
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-center border border-white/30">
          <IoFlame size={32} className="text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{currentStats.currentWinStreak}</div>
          <div className="text-sm text-white/90">Win Streak</div>
        </div>
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-center border border-white/30">
          <IoCash size={32} className="text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{playerInventory?.coins || 0}</div>
          <div className="text-sm text-white/90">Coins</div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game Stats */}
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <IoStatsChart className="mr-2 text-blue-400" />
            Game Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/90">Games Played</span>
              <span className="text-white font-bold">{currentStats.gamesPlayed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Wins</span>
              <span className="text-green-400 font-bold">{currentStats.gamesWon}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Losses</span>
              <span className="text-red-400 font-bold">{currentStats.gamesLost}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Draws</span>
              <span className="text-yellow-400 font-bold">{currentStats.gamesDrawn}</span>
            </div>
            <div className="border-t border-white/30 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-white/90">Win Rate</span>
                <span className="text-blue-400 font-bold text-lg">{currentStats.winRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <IoTime className="mr-2 text-purple-400" />
            Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/90">Total Play Time</span>
              <span className="text-white font-bold">{currentStats.totalPlayTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Average Game</span>
              <span className="text-white font-bold">{currentStats.averageGameLength}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Longest Win Streak</span>
              <span className="text-orange-400 font-bold">{currentStats.longestWinStreak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90">Current Streak</span>
              <span className="text-yellow-400 font-bold">{currentStats.currentWinStreak}</span>
            </div>
            <div className="border-t border-white/30 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-white/90">Levels Completed</span>
                <span className="text-green-400 font-bold text-lg">{currentStats.levelsCompleted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGameHistory = () => {
    // Sort all games by creation date (newest first)
    const allGames = (gameHistory || []).slice().sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    return (
      <div className="space-y-6">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <IoList className="mr-2 text-blue-400" />
            Game History ({allGames.length}{historyLoading ? '...' : ''})
          </h3>
          
          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>[Campaign] levels</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>vs AI matches</span>
            </div>
            <div className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>vs Player matches</span>
            </div>
          </div>
          
          {allGames.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/70">No games played yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
            {allGames.map((game, index) => (
              <div key={game.gameId || index} className={`p-4 rounded-lg border transition-all ${
                game.result === 'win' 
                  ? 'bg-green-900/20 border-green-400/30' 
                  : game.result === 'loss' 
                    ? 'bg-red-900/20 border-red-400/30'
                    : game.result === 'draw'
                      ? 'bg-yellow-900/20 border-yellow-400/30'
                      : 'bg-blue-900/20 border-blue-400/30' // in-progress
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        game.result === 'win' 
                          ? 'bg-green-500 text-white' 
                          : game.result === 'loss' 
                            ? 'bg-red-500 text-white'
                            : game.result === 'draw'
                              ? 'bg-yellow-500 text-black'
                              : 'bg-blue-500 text-white' // in-progress
                      }`}>
                        {game.result === 'in-progress' ? 'ONGOING' : game.result.toUpperCase()}
                      </span>
                      <span className="text-white/80 text-sm">
                        {game.gameType === 'campaign' ? (
                          <>
                            <span className="text-purple-400">[Campaign]</span> Level {game.levelId}
                          </>
                        ) : game.gameType === 'vs-ai' ? (
                          `vs ${game.opponent || 'AI'}`
                        ) : (
                          `vs ${game.opponent || 'Player'}`
                        )}
                      </span>
                      {game.gameType === 'campaign' && game.stars && (
                        <span className="text-yellow-400 text-sm">
                          {'⭐'.repeat(game.stars)}
                        </span>
                      )}
                      {game.endReason === 'abandoned' && (
                        <span className="text-xs text-red-300 bg-red-800/40 px-2 py-0.5 rounded">Abandoned</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-white/70">
                      <div>
                        <span className="block text-xs">Duration</span>
                        <span className="text-white">{formatDuration(game.duration)}</span>
                      </div>
                      <div>
                        <span className="block text-xs">Moves</span>
                        <span className="text-white">
                          {(() => {
                            if (Array.isArray(game.moves) && game.moves.length > 0) {
                              const playerMoves = game.moves.filter(move => move.actor === 'player').length;
                              const totalMoves = game.moves.length;
                              return `${playerMoves} (${totalMoves})`;
                            }
                            // Fallback to movesPlayed if moves array not available
                            return game.movesPlayed || 0;
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs">Coins</span>
                        <span className="text-green-400">+{game.coinsEarned || 0}</span>
                      </div>
                      <div>
                        <span className="block text-xs">Date</span>
                        <span className="text-white">{new Date(game.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {game.gameType === 'campaign' && game.stars !== null && game.stars !== undefined && (
                      <div className="mt-2">
                        <span className="text-xs text-white/70">Stars: </span>
                        <span className="text-yellow-400">{'★'.repeat(game.stars)}{'☆'.repeat(3 - game.stars)}</span>
                      </div>
                    )}
                    
                    {game.endReason && game.endReason !== 'normal' && (
                      <div className="mt-2">
                        <span className="text-xs text-white/70">End reason: </span>
                        <span className="text-white/90">{game.endReason}</span>
                      </div>
                    )}

                    {/* Move Analysis Summary */}
                    {Array.isArray(game.moves) && game.moves.length > 0 && (() => {
                      const moveStats = calculateMoveStats(game.moves);
                      if (!moveStats) return null;

                      return (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {Object.entries(moveStats.player).map(([classification, count]) => {
                              const display = getClassificationDisplay(classification);
                              return (
                                <div key={classification} className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${display.bg} ${display.color}`}>
                                  <span>{display.icon}</span>
                                  <span>{classification}</span>
                                  <span className="font-bold">x{count}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedGame(expandedGame === game.gameId ? null : game.gameId)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {expandedGame === game.gameId ? 'Hide Player Moves ▲' : 'Show Player Moves ▼'} ({moveStats.totalPlayerMoves})
                            </button>
                            <button
                              onClick={() => {
                                setPreviewMoves(game.moves); // Pass all moves for accurate board state
                                setPreviewGameId(game.gameId);
                                setShowMovePreview(true);
                              }}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                              <IoEye className="text-xs" />
                              Preview Moves
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Expanded Move List */}
                    {expandedGame === game.gameId && Array.isArray(game.moves) && (
                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                        <div className="text-xs text-white/70 mb-2">Player Move Details:</div>
                        {game.moves
                          .filter(move => move.actor === 'player') // Only show player moves
                          .map((move, moveIndex) => {
                          const display = move.classification ? getClassificationDisplay(move.classification) : null;
                          return (
                            <div key={moveIndex} className="flex items-center justify-between p-2 bg-black/20 rounded text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-white/80">
                                  {moveIndex + 1}. {move.from}→{move.to}
                                </span>
                                <span className="capitalize text-white/60">{move.piece}</span>
                                {move.captured && (
                                  <span className="text-red-400">x{move.captured}</span>
                                )}
                                <span className="text-blue-400">🐦</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {move.special && (
                                  <span className="text-purple-400">{move.special}</span>
                                )}
                                {move.isCheck && (
                                  <span className="text-orange-400">+</span>
                                )}
                                {display && (
                                  <div className={`px-1 py-0.5 rounded flex items-center gap-1 ${display.bg} ${display.color}`}>
                                    <span>{display.icon}</span>
                                    <span>{move.classification}</span>
                                    {display.symbol && <span className="font-bold">{display.symbol}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {gameHistory.length >= historyLimit && (
              <div className="pt-2 text-center">
                <button
                  disabled={historyLoading}
                  onClick={() => setHistoryLimit(prev => prev + 50)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm border border-white/30 disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  };

  const renderInventory = () => {
    let ownedRaw = stats.ownedItems || profileData?.playerData?.ownedItems || {};
    // Support Map or plain object
    if (ownedRaw instanceof Map) {
      ownedRaw = Object.fromEntries(ownedRaw.entries());
    }
    const entries = Object.entries(ownedRaw || {});
    return (
      <div className="space-y-6">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <IoCube className="mr-2 text-purple-400" />
            Owned Items ({entries.length})
          </h3>
          {entries.length === 0 ? (
            <div className="text-white/70 text-sm">No items owned yet.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map(([key, value]) => {
                const isObject = value && typeof value === 'object';
                // Try to pick out meaningful fields
                const quantity = value?.quantity ?? value?.count ?? (typeof value === 'number' ? value : null);
                const level = value?.level ?? value?.tier;
                const active = value?.active;
                const displayDetails = [];
                if (quantity !== null && quantity !== undefined) displayDetails.push(`${quantity} owned`);
                if (level !== undefined) displayDetails.push(`Level ${level}`);
                if (active !== undefined) displayDetails.push(active ? 'Active' : 'Inactive');
                // Fallback: number of properties
                if (displayDetails.length === 0 && isObject) {
                  const propCount = Object.keys(value).length;
                  displayDetails.push(`${propCount} attribute${propCount === 1 ? '' : 's'}`);
                }
                if (displayDetails.length === 0) displayDetails.push('Item');
                return (
                  <div key={key} className="p-4 rounded-lg bg-white/10 border border-white/20 hover:border-white/40 transition-colors flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white truncate pr-2" title={key}>{key}</span>
                      <IoAlbums className="text-white/40" />
                    </div>
                    <ul className="text-xs text-white/70 space-y-1 mb-3">
                      {displayDetails.map((d,i)=>(<li key={i}>{d}</li>))}
                    </ul>
                    {isObject && (
                      <details className="mt-auto text-[10px] text-white/50">
                        <summary className="cursor-pointer hover:text-white/70">More details</summary>
                        <div className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                          {Object.entries(value).slice(0,8).map(([k,v]) => (
                            <div key={k}><span className="text-white/40">{k}:</span> {String(v)}</div>
                          ))}
                          {Object.entries(value).length > 8 && <div>…</div>}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPlayerData = () => (
    <div className="space-y-6">
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoConstruct className="mr-2 text-amber-400" />
          Player Data
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[['coins','Coins'],['energy','Energy'],['maxEnergy','Max Energy'],['gamesPlayed','Games'],['gamesWon','Wins'],['gamesLost','Losses'],['gamesDrawn','Draws'],['currentWinStreak','Current Streak'],['longestWinStreak','Longest Streak'],['totalCoinsEarned','Total Coins Earned'],['levelsCompleted','Levels Completed']]
            .filter(([key]) => stats[key] !== undefined)
            .map(([key,label]) => (
              <div key={key} className="bg-white/10 rounded-lg p-3 border border-white/10">
                <div className="text-white/60 text-[10px] uppercase tracking-wider">{label}</div>
                <div className="text-white font-semibold mt-0.5 break-all">{String(stats[key])}</div>
              </div>
            ))}
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Coin Multiplier */}
          <div className="bg-white/5 rounded-lg p-5 border border-white/10">
            <h4 className="text-white font-semibold flex items-center mb-3"><IoFlame className="mr-2 text-orange-400" /> Coin Multiplier</h4>
            {stats.coinMultiplier ? (
              <div className="text-sm text-white/80 space-y-1">
                <div>Status: <span className={stats.coinMultiplier.active ? 'text-green-400' : 'text-white/50'}>{stats.coinMultiplier.active ? 'Active' : 'Inactive'}</span></div>
                <div>Multiplier: <span className="text-yellow-300">x{stats.coinMultiplier.multiplier || 1}</span></div>
                <div>Uses Remaining: {stats.coinMultiplier.usesRemaining ?? 0}</div>
              </div>
            ) : <div className="text-white/50 text-sm">No multiplier data.</div>}
          </div>
          {/* Energy Regen Boost */}
          <div className="bg-white/5 rounded-lg p-5 border border-white/10">
            <h4 className="text-white font-semibold flex items-center mb-3"><IoTime className="mr-2 text-purple-400" /> Energy Regen Boost</h4>
            {stats.energyRegenBoost ? (
              <div className="text-sm text-white/80 space-y-1">
                <div>Status: <span className={stats.energyRegenBoost.active ? 'text-green-400' : 'text-white/50'}>{stats.energyRegenBoost.active ? 'Active' : 'Inactive'}</span></div>
                {stats.energyRegenBoost.expiresAt && (
                  <div>Expires: {new Date(stats.energyRegenBoost.expiresAt).toLocaleString()}</div>
                )}
                <div>Regen Rate: {(stats.energyRegenBoost.regenRate / 1000) || 300} s per energy</div>
              </div>
            ) : <div className="text-white/50 text-sm">No boost data.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <IoAnalytics className="mr-2 text-green-400" />
          Game Analytics
        </h3>
        {!gameAnalytics ? (
          <div className="text-white/70 text-sm">Not enough data yet.</div>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-2">Results</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  {Object.entries(gameAnalytics.byResult).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span className="capitalize">{k.replace('-',' ')}</span><span className="font-mono">{v}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Game Types</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  {Object.entries(gameAnalytics.byType).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{v}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">End Reasons</h4>
                <ul className="text-sm text-white/80 space-y-1 max-h-40 overflow-auto pr-1">
                  {Object.entries(gameAnalytics.byEndReason).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span className="truncate pr-2" title={k}>{k}</span><span className="font-mono">{v}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-3">Fastest Win</h4>
                {gameAnalytics.fastestWin ? (
                  <div className="text-sm text-white/80 space-y-1">
                    <div><span className="text-white/60">Duration:</span> {formatPlayTimeMs(gameAnalytics.fastestWin.duration)}</div>
                    <div><span className="text-white/60">Moves:</span> {gameAnalytics.fastestWin.movesPlayed || 0}</div>
                    <div><span className="text-white/60">Type:</span> {gameAnalytics.fastestWin.gameType}</div>
                    {gameAnalytics.fastestWin.gameType === 'campaign' && (
                      <div><span className="text-white/60">Level:</span> {gameAnalytics.fastestWin.levelId}</div>
                    )}
                  </div>
                ) : <div className="text-white/50 text-sm">No wins yet.</div>}
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-3">Longest Game</h4>
                {gameAnalytics.longestGame ? (
                  <div className="text-sm text-white/80 space-y-1">
                    <div><span className="text-white/60">Duration:</span> {formatPlayTimeMs(gameAnalytics.longestGame.duration)}</div>
                    <div><span className="text-white/60">Moves:</span> {gameAnalytics.longestGame.movesPlayed || 0}</div>
                    <div><span className="text-white/60">Result:</span> {gameAnalytics.longestGame.result}</div>
                  </div>
                ) : <div className="text-white/50 text-sm">No games yet.</div>}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-2">Average Moves</h4>
                <div className="text-3xl font-bold text-white">{gameAnalytics.avgMoves}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-2">Avg Duration</h4>
                <div className="text-3xl font-bold text-white">{formatPlayTimeMs(gameAnalytics.avgDurationMs)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-2">Top Win Targets</h4>
                <ul className="text-xs text-white/70 space-y-1 max-h-28 overflow-auto">
                  {Object.entries(gameAnalytics.difficultyWins).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span className="truncate pr-2" title={k}>{k}</span><span className="font-mono">{v}</span></li>
                  ))}
                  {Object.keys(gameAnalytics.difficultyWins).length === 0 && <li>No wins yet.</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return 'N/A';
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-green-300 to-blue-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-green-300 to-blue-500 flex items-center justify-center">
        <div className="bg-black/70 p-8 rounded-2xl text-center">
          <h2 className="text-3xl font-bold text-red-400 mb-4">User Not Found</h2>
          <p className="text-white/80 mb-4">The user <span className="text-yellow-300">{userName}</span> does not exist.</p>
          <button
            onClick={onBack}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-green-300 to-blue-500 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/40 hover:border-white/60 transition-all duration-200"
        >
          <IoArrowBack size={20} />
          <span>Back</span>
        </button>
        
        <h1 className="text-3xl font-bold text-white text-center flex-1">
          Profile: <span className="text-yellow-300">{userName}</span>
        </h1>
        
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-black/40 backdrop-blur-md rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: IoPerson },
          { id: 'stats', label: 'Statistics', icon: IoStatsChart },
          { id: 'history', label: 'History', icon: IoList },
          // Sensitive tabs only if own profile
          ...(isOwnProfile ? [
            { id: 'inventory', label: 'Inventory', icon: IoCube },
            { id: 'playerData', label: 'Player Data', icon: IoConstruct },
            { id: 'analytics', label: 'Analytics', icon: IoAnalytics }
          ] : [])
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
  {activeTab === 'overview' && renderOverview()}
  {activeTab === 'stats' && renderStats()}
  {activeTab === 'history' && renderGameHistory()}
  {isOwnProfile && activeTab === 'inventory' && renderInventory()}
  {isOwnProfile && activeTab === 'playerData' && renderPlayerData()}
  {isOwnProfile && activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Move Preview Modal */}
      {showMovePreview && previewMoves.length > 0 && (
        <MovePreview
          moves={previewMoves}
          gameId={previewGameId}
          onClose={() => {
            setShowMovePreview(false);
            setPreviewMoves([]);
            setPreviewGameId(null);
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
