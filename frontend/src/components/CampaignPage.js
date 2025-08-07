import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  IoArrowBack, IoStar, IoLockClosed, IoCheckmarkCircle, IoTrophy, 
  IoInformationCircle, IoGift, IoWarning, IoCash, IoBatteryHalf, IoFlash, 
  IoSettings, IoRefresh, IoAdd
} from 'react-icons/io5';
import { 
  RegularPig, CorporalPig, ForemanPig, QueenPig, KingPig, NinjaPig,
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird
} from './characters';
import EnergyPurchaseModal from './EnergyPurchaseModal';
import EnergyDisplay from './EnergyDisplay';

const CampaignPage = ({ 
  onBack, 
  onSelectLevel, 
  playerInventory, 
  isLevelCompleted, 
  getLevelStars,
  purchaseEnergy,
  resetProgress,
  timeUntilNextEnergy = 0
}) => {
  const [hoveredLevel, setHoveredLevel] = useState(null);
  const [showEnergyPurchase, setShowEnergyPurchase] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const campaignLevels = [
    {
      id: 1,
      name: "Grassland Outpost",
      difficulty: "easy",
      stars: 0,
      completed: false,
      unlocked: true,
      enemy: <RegularPig size={45} />,
      position: { x: 12, y: 88 },
      coinReward: 50,
      terrain: "Plains",
      // Starter level - you have advantage with rook
      birdPieces: {
        king: true,
        pawns: 6,
        rooks: 1, // You get 1 rook advantage
        knights: 0,
        bishops: 0,
        queen: false
      },
      pigPieces: {
        king: true,
        pawns: 4, // Enemy has fewer pawns
        rooks: 0,
        knights: 0,
        bishops: 0,
        queen: false
      }
    },
    {
      id: 2,
      name: "Timber Barricades",
      difficulty: "easy", 
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <CorporalPig size={45} />,
      position: { x: 25, y: 75 },
      coinReward: 75,
      terrain: "Forest",
      // You get knight advantage
      birdPieces: {
        king: true,
        pawns: 7,
        rooks: 1,
        knights: 1, // You get knight
        bishops: 0,
        queen: false
      },
      pigPieces: {
        king: true,
        pawns: 6,
        rooks: 1,
        knights: 0, // Enemy has no knight
        bishops: 0,
        queen: false
      }
    },
    {
      id: 3,
      name: "Iron Watchtower",
      difficulty: "easy",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <ForemanPig size={45} />,
      position: { x: 18, y: 62 },
      coinReward: 100,
      terrain: "Hills",
      // Both get bishops, you have advantage
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 1,
        bishops: 2, // You get both bishops
        queen: false
      },
      pigPieces: {
        king: true,
        pawns: 7,
        rooks: 1,
        knights: 1,
        bishops: 1, // Enemy gets 1 bishop
        queen: false
      }
    },
    {
      id: 4,
      name: "Stone Garrison",
      difficulty: "medium",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <CorporalPig size={45} />,
      position: { x: 35, y: 58 },
      coinReward: 150,
      terrain: "Mountains",
      // You get queen first!
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true // First queen advantage
      },
      pigPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 1,
        bishops: 1,
        queen: false // Enemy still no queen
      }
    },
    {
      id: 5,
      name: "Desert Stronghold",
      difficulty: "medium",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <NinjaPig size={45} />,
      position: { x: 52, y: 65 },
      coinReward: 200,
      terrain: "Desert",
      // Both have queens now, equal
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      },
      pigPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 1, // Enemy still 1 bishop less
        queen: true
      }
    },
    {
      id: 6,
      name: "Canyon Fortress",
      difficulty: "medium",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <ForemanPig size={45} />,
      position: { x: 68, y: 72 },
      coinReward: 250,
      terrain: "Canyon",
      // You keep full army, enemy still missing pieces
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      },
      pigPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 1, // Enemy missing 1 knight
        bishops: 2,
        queen: true
      }
    },
    {
      id: 7,
      name: "Ancient Ruins",
      difficulty: "medium",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <NinjaPig size={45} />,
      position: { x: 45, y: 48 },
      coinReward: 300,
      terrain: "Ruins",
      // You still have advantage - enemy missing rook
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      },
      pigPieces: {
        king: true,
        pawns: 8,
        rooks: 1, // Enemy missing 1 rook
        knights: 2,
        bishops: 2,
        queen: true
      }
    },
    {
      id: 8,
      name: "Volcanic Mines",
      difficulty: "hard",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <CorporalPig size={45} />,
      position: { x: 28, y: 45 },
      coinReward: 400,
      terrain: "Volcanic",
      // Last level with advantage - you have extra pawn
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      },
      pigPieces: {
        king: true,
        pawns: 7, // Enemy missing 1 pawn
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      }
    },
    {
      id: 9,
      name: "Frozen Citadel",
      difficulty: "hard",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <QueenPig size={45} />,
      position: { x: 58, y: 38 },
      coinReward: 500,
      terrain: "Ice",
      // Full armies from level 9 onwards - now equal
      birdPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      },
      pigPieces: {
        king: true,
        pawns: 8,
        rooks: 2,
        knights: 2,
        bishops: 2,
        queen: true
      }
    },
    {
      id: 10,
      name: "Crystal Caverns",
      difficulty: "hard",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <ForemanPig size={45} />,
      position: { x: 75, y: 45 },
      coinReward: 600,
      terrain: "Crystal"
    },
    {
      id: 11,
      name: "Shadow Spire",
      difficulty: "hard",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <NinjaPig size={45} />,
      position: { x: 42, y: 28 },
      coinReward: 700,
      terrain: "Shadow"
    },
    {
      id: 12,
      name: "King's Dominion",
      difficulty: "hard",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <KingPig size={45} />,
      position: { x: 62, y: 18 },
      coinReward: 800,
      terrain: "Royal"
    },
    {
      id: 13,
      name: "The Obsidian Throne",
      difficulty: "nightmare",
      stars: 0,
      completed: false,
      unlocked: false,
      enemy: <KingPig size={50} />,
      position: { x: 35, y: 12 },
      coinReward: 1000,
      terrain: "Throne"
    }
  ];

  // Default full chess setup for levels that don't specify piece configuration (levels 9-13)
  const getDefaultPieceConfig = () => ({
    birdPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    },
    pigPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    }
  });

  // Dynamic level unlocking logic
  const isLevelUnlocked = (level, allLevels) => {
    if (level.id === 1) return true; // First level always unlocked
    
    // Check if previous level is completed
    const prevLevel = allLevels.find(l => l.id === level.id - 1);
    if (!prevLevel) return false;
    
    return isLevelCompleted && isLevelCompleted(prevLevel.id);
  };

  // More complex path network
  const mapPaths = [
    { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 4, to: 7 },
    { from: 7, to: 8 }, { from: 8, to: 11 }, { from: 5, to: 9 },
    { from: 6, to: 10 }, { from: 9, to: 12 }, { from: 10, to: 12 },
    { from: 11, to: 13 }, { from: 12, to: 13 }, { from: 7, to: 9 }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'border-green-400 bg-green-500';
      case 'medium': return 'border-yellow-400 bg-yellow-500';
      case 'hard': return 'border-red-400 bg-red-500';
      case 'nightmare': return 'border-purple-400 bg-purple-600';
      default: return 'border-gray-400 bg-gray-500';
    }
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-300 border-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-300 border-red-400';
      case 'nightmare': return 'bg-purple-500/20 text-purple-300 border-purple-400';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400';
    }
  };

  const renderStars = (stars, maxStars = 3) => {
    return Array.from({ length: maxStars }, (_, i) => (
      <IoStar 
        key={i} 
        size={16} 
        className={i < stars ? 'text-yellow-400' : 'text-gray-600'} 
      />
    ));
  };

  const getPathCoordinates = (fromLevel, toLevel) => {
    const from = campaignLevels.find(l => l.id === fromLevel);
    const to = campaignLevels.find(l => l.id === toLevel);
    return {
      x1: from.position.x,
      y1: from.position.y,
      x2: to.position.x,
      y2: to.position.y
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-32 w-24 h-24 bg-red-500 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-28 h-28 bg-blue-500 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Header with advanced styling */}
      <header className="relative z-10 p-4 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="group flex items-center gap-3 px-6 py-3 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-600/50 transition-all duration-300 hover:scale-105"
          >
            <IoArrowBack className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-lg font-semibold text-slate-300 group-hover:text-white">Return to Base</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-1">
              PIG EMPIRE CONQUEST
            </h1>
            <p className="text-slate-400 text-base">Liberate the territories from pig control</p>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-800/40 px-6 py-3 rounded-xl border border-slate-600/30">
            <div className="flex items-center gap-2">
              <IoCash className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{playerInventory.coins.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <IoBatteryHalf className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold">{playerInventory.energy}/{playerInventory.maxEnergy}</span>
              {playerInventory.energy < playerInventory.maxEnergy && (
                <button
                  onClick={() => setShowEnergyPurchase(true)}
                  className="ml-2 p-1 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors"
                  title="Buy Energy"
                >
                  <IoAdd className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
            {timeUntilNextEnergy > 0 && playerInventory.energy < playerInventory.maxEnergy && (
              <div className="text-xs text-slate-400">
                Next: {Math.ceil(timeUntilNextEnergy / 1000 / 60)}m
              </div>
            )}
            <div className="w-px h-6 bg-slate-600"></div>
            <button
              onClick={() => setShowDevMenu(!showDevMenu)}
              className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
              title="Developer Menu"
            >
              <IoSettings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main campaign map area */}
      <div className="relative flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative h-[600px] bg-gradient-to-br from-green-900/30 via-amber-900/20 to-red-900/30 rounded-2xl border-2 border-slate-700/50 overflow-hidden shadow-2xl">
            
            {/* Map terrain background */}
            <div className="absolute inset-0 opacity-40">
              <div className="absolute top-0 left-0 w-1/3 h-1/2 bg-gradient-to-br from-green-600/30 to-green-800/30 rounded-br-full"></div>
              <div className="absolute top-1/4 right-0 w-1/2 h-1/3 bg-gradient-to-bl from-yellow-600/20 to-orange-700/30 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-1/4 w-1/2 h-1/3 bg-gradient-to-tr from-red-800/20 to-purple-800/30 rounded-tr-full"></div>
            </div>

            {/* SVG for paths - more complex network */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#facc15" stopOpacity="0.8"/>
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8"/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {mapPaths.map((path, index) => {
                const fromLevel = campaignLevels.find(l => l.id === path.from);
                const toLevel = campaignLevels.find(l => l.id === path.to);
                
                if (!fromLevel || !toLevel) return null;
                
                const x1 = (fromLevel.position.x / 100) * 100 + '%';
                const y1 = (fromLevel.position.y / 100) * 100 + '%';
                const x2 = (toLevel.position.x / 100) * 100 + '%';
                const y2 = (toLevel.position.y / 100) * 100 + '%';
                
                const isActive = fromLevel.completed || fromLevel.unlocked !== false;
                
                return (
                  <g key={index}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isActive ? "url(#pathGradient)" : "#475569"}
                      strokeWidth="4"
                      strokeDasharray={isActive ? "0" : "8,4"}
                      opacity={isActive ? 0.9 : 0.3}
                      filter={isActive ? "url(#glow)" : "none"}
                    />
                    {/* Path decorations */}
                    {isActive && (
                      <circle
                        cx={`${(parseFloat(x1) + parseFloat(x2)) / 2}%`}
                        cy={`${(parseFloat(y1) + parseFloat(y2)) / 2}%`}
                        r="3"
                        fill="#fbbf24"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Level nodes with enhanced design */}
            {campaignLevels.map((level) => {
              const levelUnlocked = isLevelUnlocked(level, campaignLevels);
              const levelCompleted = isLevelCompleted && isLevelCompleted(level.id);
              
              return (
              <div
                key={level.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${
                  hoveredLevel === level.id ? 'z-[9998]' : 'z-10'
                }`}
                style={{ 
                  left: `${level.position.x}%`, 
                  top: `${level.position.y}%`
                }}
                onClick={() => {
                  // Always show preview, even for locked levels
                  const enhancedLevel = {
                    ...level,
                    ...(level.birdPieces ? {} : getDefaultPieceConfig())
                  };
                  setPreviewLevel(enhancedLevel);
                  setShowPreview(true);
                }}
                onMouseEnter={(e) => {
                  setHoveredLevel(level.id);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top
                  });
                }}
                onMouseMove={(e) => {
                  if (hoveredLevel === level.id) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredLevel(null);
                }}
              >
                {/* Level platform with terrain-specific styling */}
                <div className={`
                  relative w-20 h-20 rounded-xl shadow-xl transition-all duration-300 border-2
                  ${levelCompleted
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400 shadow-emerald-500/50' 
                    : levelUnlocked 
                      ? playerInventory.energy >= 20
                        ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-500 shadow-slate-500/50 hover:from-slate-600 hover:to-slate-700'
                        : 'bg-gradient-to-br from-red-800 to-red-900 border-red-600 shadow-red-500/50 opacity-75'
                      : 'bg-gradient-to-br from-slate-900 to-black border-slate-800 opacity-60'
                  }
                  ${hoveredLevel === level.id ? 'scale-110 shadow-xl' : 'hover:scale-105'}
                `}>
                  
                  {/* Enemy character */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`transition-all duration-300 ${hoveredLevel === level.id ? 'scale-110' : ''}`}>
                      {level.enemy}
                    </div>
                  </div>

                  {/* Stars indicator */}
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    {[1, 2, 3].map(star => (
                      <IoStar 
                        key={star} 
                        className={`w-4 h-4 ${star <= (getLevelStars ? getLevelStars(level.id) : level.stars) ? 'text-yellow-400' : 'text-slate-600'}`}
                      />
                    ))}
                  </div>

                  {/* Energy cost indicator */}
                  {levelUnlocked && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-full">
                      <IoFlash className={`w-3 h-3 ${playerInventory.energy >= 20 ? 'text-yellow-400' : 'text-red-400'}`} />
                      <span className={`text-xs font-bold ${playerInventory.energy >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>20</span>
                    </div>
                  )}

                  {/* Level number badge */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white shadow-md">
                    {level.id}
                  </div>

                  {/* Difficulty indicator */}
                  <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold border ${getDifficultyStyle(level.difficulty)}`}>
                    {level.difficulty.toUpperCase()}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Legend Panel */}
      <div className="fixed bottom-4 right-4 bg-slate-800/90 backdrop-blur-md rounded-xl p-4 border border-slate-600/50 shadow-xl max-w-sm">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <IoInformationCircle className="w-5 h-5 text-cyan-400" />
          Campaign Intelligence
        </h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-2">
              <h4 className="text-cyan-400 font-semibold mb-2 text-xs">Mission Status</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded border border-emerald-400"></div>
                  <span className="text-slate-300">Liberated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-br from-slate-700 to-slate-800 rounded border border-slate-500"></div>
                  <span className="text-slate-300">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-br from-slate-900 to-black rounded border border-slate-800 opacity-60"></div>
                  <span className="text-slate-300">Locked</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-2">
              <h4 className="text-cyan-400 font-semibold mb-2 text-xs">Difficulty Levels</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded"></div>
                  <span className="text-slate-300">Rookie</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                  <span className="text-slate-300">Veteran</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded"></div>
                  <span className="text-slate-300">Elite</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded"></div>
                  <span className="text-slate-300">Legendary</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-2">
            <h4 className="text-cyan-400 font-semibold mb-2 text-xs">Progress Tracking</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">Territories Liberated:</span>
                <span className="text-emerald-400 font-bold">{campaignLevels.filter(l => l.completed).length}/13</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Stars Earned:</span>
                <span className="text-yellow-400 font-bold">{campaignLevels.reduce((sum, l) => sum + l.stars, 0)}/39</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Empire Control:</span>
                <span className="text-cyan-400 font-bold">{Math.round((campaignLevels.filter(l => l.completed).length / 13) * 100)}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-2 border border-blue-500/30">
            <p className="text-blue-300 text-xs leading-relaxed">
              <IoWarning className="w-3 h-3 inline mr-1 text-yellow-400" />
              Strategic Tip: Each battle costs 20 energy. Energy regenerates 1 point every 5 minutes automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Developer Menu */}
      {showDevMenu && (
        <div className="fixed top-20 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 z-50 shadow-2xl">
          <h3 className="text-white font-bold mb-3">Developer Menu</h3>
          <div className="space-y-2">
            <button
              onClick={async () => {
                if (window.confirm('Reset all progress? This cannot be undone.')) {
                  await resetProgress();
                  setShowDevMenu(false);
                }
              }}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              <IoRefresh className="inline mr-2" />
              Reset Progress
            </button>
            <button
              onClick={() => setShowEnergyPurchase(true)}
              className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              <IoFlash className="inline mr-2" />
              Buy Energy
            </button>
            <button
              onClick={() => setShowDevMenu(false)}
              className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Energy Purchase Modal */}
      <EnergyPurchaseModal
        isOpen={showEnergyPurchase}
        onClose={() => setShowEnergyPurchase(false)}
        onPurchase={async (energyAmount) => {
          const result = await purchaseEnergy(energyAmount);
          if (result.success) {
            console.log(result.message);
          } else {
            console.log(result.message);
          }
          setShowEnergyPurchase(false);
        }}
        playerCoins={playerInventory.coins}
        currentEnergy={playerInventory.energy}
        maxEnergy={playerInventory.maxEnergy}
      />

      {/* Tooltip Portal - renders outside the map container to avoid clipping */}
      {hoveredLevel && ReactDOM.createPortal(
        (() => {
          const currentLevel = campaignLevels.find(l => l.id === hoveredLevel);
          if (!currentLevel) return null;
          
          const levelCompleted = isLevelCompleted ? isLevelCompleted(currentLevel.id) : currentLevel.completed;
          const levelUnlocked = currentLevel.id === 1 || (isLevelCompleted ? isLevelCompleted(currentLevel.id - 1) : campaignLevels[currentLevel.id - 2]?.completed);
          
          // Smart positioning to keep tooltip in viewport
          const tooltipWidth = 320; // w-80 = 320px
          const tooltipHeight = 200; // approximate height
          const margin = 20;
          
          let x = tooltipPosition.x - tooltipWidth / 2; // Center by default
          let y = tooltipPosition.y - tooltipHeight - margin; // Above by default
          
          // Adjust horizontal position
          if (x < margin) x = margin;
          if (x + tooltipWidth > window.innerWidth - margin) x = window.innerWidth - tooltipWidth - margin;
          
          // Adjust vertical position  
          if (y < margin) y = tooltipPosition.y + margin; // Below if no room above
          
          return (
            <div 
              className="fixed w-80 p-4 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-600/50 z-[99999] pointer-events-none"
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white">{currentLevel.name}</h3>
                <p className="text-slate-300 text-sm">Terrain: <span className="text-cyan-400 font-semibold">{currentLevel.terrain}</span></p>
                
                <div className="flex justify-center gap-1 my-2">
                  {[1, 2, 3].map(star => (
                    <IoStar key={star} className={`w-4 h-4 ${star <= (getLevelStars ? getLevelStars(currentLevel.id) : currentLevel.stars) ? 'text-yellow-400' : 'text-slate-600'}`} />
                  ))}
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-2 space-y-1">
                  <p className="text-amber-400 text-sm font-semibold">
                    <IoCash className="w-3 h-3 inline mr-1" />
                    Reward: {currentLevel.coinReward} coins
                  </p>
                  <p className="text-yellow-400 text-sm font-semibold">
                    <IoFlash className="w-3 h-3 inline mr-1" />
                    Cost: 20 energy
                  </p>
                  <p className="text-slate-400 text-xs">
                    Status: {levelCompleted ? 'Liberated' : levelUnlocked ? 'Under Siege' : 'Locked'}
                  </p>
                  {playerInventory.energy < 20 && levelUnlocked && (
                    <p className="text-red-400 text-xs font-bold">
                      ⚠️ Not enough energy!
                    </p>
                  )}
                  {!levelUnlocked && (
                    <p className="text-orange-400 text-xs font-bold">
                      🔒 Complete previous level first!
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
      
      {/* Compact Level Preview Modal */}
      {showPreview && previewLevel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {previewLevel.enemy} {previewLevel.name}
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Level Details */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Difficulty:</span>
                      <span className={`capitalize font-bold ${
                        previewLevel.difficulty === 'easy' ? 'text-green-400' :
                        previewLevel.difficulty === 'medium' ? 'text-yellow-400' :
                        previewLevel.difficulty === 'hard' ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {previewLevel.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Terrain:</span>
                      <span className="text-cyan-400">{previewLevel.terrain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Stars:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(star => (
                          <IoStar key={star} className={`w-4 h-4 ${star <= (getLevelStars ? getLevelStars(previewLevel.id) : previewLevel.stars) ? 'text-yellow-400' : 'text-slate-600'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Reward:</span>
                      <span className="text-amber-400 font-bold">{previewLevel.coinReward} 🪙</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Energy Cost:</span>
                      <span className="text-yellow-400 font-bold">20 ⚡</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Status:</span>
                      <span className={`font-bold ${
                        isLevelCompleted && isLevelCompleted(previewLevel.id) ? 'text-green-400' : 
                        isLevelUnlocked(previewLevel, campaignLevels) ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        {isLevelCompleted && isLevelCompleted(previewLevel.id) ? 'Completed' : 
                         isLevelUnlocked(previewLevel, campaignLevels) ? 'Available' : 'Locked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Board Preview */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-3 text-center">Battle Formation Preview</h4>
                <div className="bg-gradient-to-br from-amber-200 to-amber-600 p-2 rounded-xl mx-auto max-w-xs">
                  <div className="grid grid-cols-8 gap-0.5 bg-amber-900 p-1 rounded-lg">
                    {Array(64).fill(null).map((_, index) => {
                      const row = Math.floor(index / 8);
                      const col = index % 8;
                      const isLight = (row + col) % 2 === 0;
                      
                      // Full piece placement - show all pieces correctly
                      let piece = null;
                      
                      // Pig pieces (top rows)
                      if (row === 0) {
                        if (col === 4) piece = <KingPig size={12} />; // King always center
                        else if (col === 3 && previewLevel.pigPieces?.queen) piece = <QueenPig size={12} />;
                        else if ((col === 2 || col === 5) && previewLevel.pigPieces?.bishops > (col === 2 ? 0 : 1)) piece = <ForemanPig size={12} />;
                        else if ((col === 1 || col === 6) && previewLevel.pigPieces?.knights > (col === 1 ? 0 : 1)) piece = <NinjaPig size={12} />;
                        else if ((col === 0 || col === 7) && previewLevel.pigPieces?.rooks > (col === 0 ? 0 : 1)) piece = <CorporalPig size={12} />;
                      } else if (row === 1) {
                        // Pig pawns - centered
                        const pawnCount = previewLevel.pigPieces?.pawns || 0;
                        const startCol = Math.floor((8 - pawnCount) / 2);
                        if (col >= startCol && col < startCol + pawnCount) {
                          piece = <RegularPig size={10} />;
                        }
                      }
                      
                      // Bird pieces (bottom rows)
                      else if (row === 7) {
                        if (col === 4) piece = <RedBird size={12} />; // King always center
                        else if (col === 3 && previewLevel.birdPieces?.queen) piece = <Stella size={12} />;
                        else if ((col === 2 || col === 5) && previewLevel.birdPieces?.bishops > (col === 2 ? 0 : 1)) piece = <WhiteBird size={12} />;
                        else if ((col === 1 || col === 6) && previewLevel.birdPieces?.knights > (col === 1 ? 0 : 1)) piece = <BlackBird size={12} />;
                        else if ((col === 0 || col === 7) && previewLevel.birdPieces?.rooks > (col === 0 ? 0 : 1)) piece = <YellowBird size={12} />;
                      } else if (row === 6) {
                        // Bird pawns - centered
                        const pawnCount = previewLevel.birdPieces?.pawns || 0;
                        const startCol = Math.floor((8 - pawnCount) / 2);
                        if (col >= startCol && col < startCol + pawnCount) {
                          piece = <BlueBird size={10} />;
                        }
                      }
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square flex items-center justify-center ${
                            isLight ? 'bg-amber-100' : 'bg-amber-800'
                          }`}
                        >
                          {piece}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Quick piece summary */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center text-slate-300">
                    � Your Army: {previewLevel.birdPieces?.pawns || 0} pawns + {(previewLevel.birdPieces?.rooks || 0) + (previewLevel.birdPieces?.knights || 0) + (previewLevel.birdPieces?.bishops || 0) + (previewLevel.birdPieces?.queen ? 1 : 0)} pieces
                  </div>
                  <div className="text-center text-slate-300">
                    � Enemy Army: {previewLevel.pigPieces?.pawns || 0} pawns + {(previewLevel.pigPieces?.rooks || 0) + (previewLevel.pigPieces?.knights || 0) + (previewLevel.pigPieces?.bishops || 0) + (previewLevel.pigPieces?.queen ? 1 : 0)} pieces
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              
              {/* BIG PLAY BUTTON */}
              {isLevelUnlocked(previewLevel, campaignLevels) ? (
                <button
                  onClick={() => {
                    if (playerInventory.energy >= 20) {
                      onSelectLevel(previewLevel.id, previewLevel);
                      setShowPreview(false);
                    } else {
                      console.log('Not enough energy!');
                    }
                  }}
                  disabled={playerInventory.energy < 20}
                  className={`flex-1 py-4 px-8 rounded-lg transition-colors font-bold text-lg flex items-center justify-center gap-3 ${
                    playerInventory.energy >= 20
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <IoFlash className="w-6 h-6" />
                  PLAY BATTLE
                  <span className="text-sm">(-20 ⚡)</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-4 px-8 rounded-lg font-bold text-lg flex items-center justify-center gap-3 bg-red-800/50 text-red-300 cursor-not-allowed border border-red-600/50"
                >
                  <IoLockClosed className="w-6 h-6" />
                  LOCKED
                  <span className="text-sm">(Complete previous level)</span>
                </button>
              )}
            </div>
            
            {/* Energy warning */}
            {playerInventory.energy < 20 && isLevelUnlocked(previewLevel, campaignLevels) && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
                <p className="text-red-400 text-sm text-center">
                  ⚠️ Not enough energy! You need 20 energy to start this battle.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPage;
