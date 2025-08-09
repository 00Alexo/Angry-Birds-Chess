import React, { useState, useEffect } from 'react';
import { IoInformationCircle, IoPerson, IoPeople, IoClose, IoSpeedometer, IoShield, IoFlame, IoSkull, IoMap, IoSettings, IoCash, IoStorefront, IoBatteryHalf, IoAdd, IoTime } from 'react-icons/io5';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';
import EnergyPurchaseModal from './EnergyPurchaseModal';

const MainMenu = ({ 
  onSinglePlayer, 
  onMultiPlayer, 
  onShowCharacters, 
  onSelectDifficulty, 
  onShowCampaign, 
  onShowTesting,
  onShowShop,
  onLogout,
  playerInventory,
  purchaseEnergy,
  timeUntilNextEnergy = 0,
  saveSelectedTheme,
  getSelectedTheme,
  userName
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [showSingleplayerModal, setShowSingleplayerModal] = useState(false);
  const [showEnergyPurchase, setShowEnergyPurchase] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');

  // Available board themes
  const boardThemes = {
    default: {
      name: 'Classic Wood',
      colors: {
        light: 'bg-amber-100',
        dark: 'bg-amber-800',
        border: 'bg-amber-900'
      }
    },
    royal_board: {
      name: 'Royal Gold',
      colors: {
        light: 'bg-yellow-100',
        dark: 'bg-yellow-700',
        border: 'bg-yellow-900'
      }
    },
    forest_theme: {
      name: 'Forest Green',
      colors: {
        light: 'bg-green-200',
        dark: 'bg-green-600',
        border: 'bg-green-900'
      }
    },
    space_theme: {
      name: 'Cosmic Purple',
      colors: {
        light: 'bg-purple-200',
        dark: 'bg-purple-600',
        border: 'bg-purple-900'
      }
    }
  };

  // Format time until next energy
  const formatTimeUntilEnergy = (milliseconds) => {
    if (milliseconds <= 0) return null;
    
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Get remaining time for energy boost
  const getEnergyBoostTimeLeft = () => {
    if (!playerInventory.energyRegenBoost || !playerInventory.energyRegenBoost.active) {
      return null;
    }
    
    const now = Date.now();
    // Ensure expiresAt is converted to a number (in case it comes as a string from backend)
    const expiresAt = new Date(playerInventory.energyRegenBoost.expiresAt).getTime();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0 || isNaN(timeLeft)) {
      return null;
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    setShowAnimation(true);
    // Load selected theme from database
    if (getSelectedTheme) {
      getSelectedTheme().then(theme => {
        setSelectedTheme(theme || 'default');
      }).catch(error => {
        console.error('Failed to load selected theme:', error);
        setSelectedTheme('default');
      });
    }
  }, [getSelectedTheme]);

  // Handle theme selection
  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    if (saveSelectedTheme) {
      const success = await saveSelectedTheme(themeId);
      if (success) {
        console.log(`✅ Theme changed to: ${themeId}`);
      } else {
        console.error('❌ Failed to save selected theme');
      }
    }
  };

  const handleSingleplayerClick = () => {
    setShowSingleplayerModal(true);
  };

  const handleCloseModal = () => {
    setShowSingleplayerModal(false);
  };

  const handleDifficultySelect = (difficulty) => {
    setShowSingleplayerModal(false);
    onSelectDifficulty(difficulty);
  };

  const handleCampaignClick = () => {
    setShowSingleplayerModal(false);
    onShowCampaign();
  };

  // Function to get pieces for board preview
  const getBoardPreviewPiece = (index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    
    // Top row (pigs - AI team)
    if (row === 0) {
      switch (col) {
        case 0:
        case 7:
          return <CorporalPig size={28} />; // Rook
        case 1:
        case 6:
          return <NinjaPig size={28} />; // Knight
        case 2:
        case 5:
          return <ForemanPig size={28} />; // Bishop
        case 3:
          return <QueenPig size={28} />; // Queen
        case 4:
          return <KingPig size={30} />; // King
        default:
          return null;
      }
    } else if (row === 1) {
      return <RegularPig size={24} />; // Pawns
    }
    
    // Bottom row (birds - player team)
    else if (row === 7) {
      switch (col) {
        case 0:
        case 7:
          return <YellowBird size={28} />; // Rook (Chuck)
        case 1:
        case 6:
          return <BlackBird size={28} />; // Knight (Bomb)
        case 2:
        case 5:
          return <WhiteBird size={28} />; // Bishop (Matilda)
        case 3:
          return <Stella size={28} />; // Queen (Stella)
        case 4:
          return <RedBird size={30} />; // King (Red)
        default:
          return null;
      }
    } else if (row === 6) {
      return <BlueBird size={24} />; // Pawns (Jak and Jim)
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-green-300 to-blue-500 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-12 bg-white rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute top-20 right-20 w-16 h-10 bg-white rounded-full opacity-60 animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-20 w-24 h-14 bg-white rounded-full opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Top Bar with User Info and Logout */}
      <div className="relative z-30 flex justify-between items-center mb-2">
        {/* User Info */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-white/40">
          <IoPerson className="text-white w-4 h-4" />
          <span className="text-white font-medium text-sm">
            {userName || 'Player'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="bg-red-500/80 hover:bg-red-600/80 backdrop-blur-md text-white px-3 py-2 rounded-lg border border-red-400/50 transition-all duration-200 text-sm font-medium"
        >
          Logout
        </button>
      </div>

      {/* Responsive Status Bar */}
      {playerInventory && (
        <div className="relative z-20 flex justify-end p-2 sm:p-4">
          {/* Mobile Layout - Stack vertically on small screens */}
          <div className="hidden sm:flex items-center gap-3 lg:gap-4 bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 border-2 border-white/40 shadow-2xl flex-wrap max-w-full">
            {/* Coins - Always visible */}
            <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-400/50">
              <IoCash className="text-yellow-300 w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-yellow-100 font-bold text-sm sm:text-base">{playerInventory.coins?.toLocaleString() || 0}</span>
            </div>
            
            {/* Energy Display - Always visible */}
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-400/50">
              <IoBatteryHalf className="text-blue-300 w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-blue-100 font-bold text-sm sm:text-base">
                {playerInventory.energy || 0}/{playerInventory.maxEnergy || 100}
              </span>
              {playerInventory.energy < playerInventory.maxEnergy && (
                <button
                  onClick={() => setShowEnergyPurchase(true)}
                  className="ml-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-1.5 py-0.5 rounded text-xs transition-colors shadow-sm"
                  title="Buy Energy"
                >
                  +
                </button>
              )}
            </div>
            
            {/* Optional items - show only when they exist and there's space */}
            {timeUntilNextEnergy > 0 && playerInventory.energy < playerInventory.maxEnergy && (
              <div className="hidden lg:flex items-center gap-1 bg-cyan-500/20 px-2 py-1 rounded-lg border border-cyan-400/50">
                <IoTime className="text-cyan-300 w-3 h-3" />
                <span className="text-cyan-200 font-bold text-xs">
                  {formatTimeUntilEnergy(timeUntilNextEnergy)}
                </span>
              </div>
            )}
            
            {getEnergyBoostTimeLeft() && (
              <div className="hidden lg:flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-lg border border-green-400/50">
                <IoTime className="text-green-300 w-3 h-3" />
                <span className="text-green-100 font-bold text-xs">{getEnergyBoostTimeLeft()}</span>
              </div>
            )}
            
            {(playerInventory.levelSkipTokens > 0) && (
              <div className="flex items-center gap-1 bg-purple-500/20 px-2 py-1 rounded-lg border border-purple-400/50">
                <IoAdd className="text-purple-300 w-3 h-3 rotate-45" />
                <span className="text-purple-100 font-bold text-xs">{playerInventory.levelSkipTokens}</span>
              </div>
            )}
            
            {(playerInventory.coinMultiplier && 
              playerInventory.coinMultiplier.active && 
              playerInventory.coinMultiplier.usesRemaining > 0) && (
              <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-400/50">
                <IoCash className="text-amber-300 w-3 h-3" />
                <span className="text-amber-100 font-bold text-xs">×{playerInventory.coinMultiplier.multiplier}</span>
              </div>
            )}
            
            {/* Theme Button - Always visible */}
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="p-2 text-white bg-slate-600/60 hover:bg-slate-500/60 transition-colors rounded-lg border border-slate-400/50 hover:border-slate-300/50 shadow-sm"
              title="Board Themes"
            >
              🎨
            </button>
          </div>

          {/* Mobile Compact Layout */}
          <div className="flex sm:hidden items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border-2 border-white/40 shadow-2xl">
            <div className="flex items-center gap-1 text-yellow-100">
              <IoCash className="text-yellow-300 w-4 h-4" />
              <span className="font-bold text-sm">{playerInventory.coins?.toLocaleString() || 0}</span>
            </div>
            <div className="w-px h-4 bg-white/30"></div>
            <div className="flex items-center gap-1 text-blue-100">
              <IoBatteryHalf className="text-blue-300 w-4 h-4" />
              <span className="font-bold text-sm">{playerInventory.energy || 0}/{playerInventory.maxEnergy || 100}</span>
            </div>
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="p-1.5 text-white bg-slate-600/60 hover:bg-slate-500/60 transition-colors rounded border border-slate-400/50 text-sm"
              title="Themes"
            >
              🎨
            </button>
          </div>
        </div>
      )}

      <div className={`relative z-10 h-full transform transition-all duration-1000 ${showAnimation ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        
        {/* Responsive Header */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold game-title mb-2">
            ANGRY BIRDS CHESS
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white drop-shadow-md">
            Strategic Bird Warfare!
          </p>
        </div>

        {/* Responsive Main Content */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-stretch justify-center max-w-6xl mx-auto px-4">
          
          {/* Left Section - Battle Display */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                EPIC BATTLE
              </h2>
            </div>
            
            {/* VS Display */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-6 lg:space-x-8 mb-4 sm:mb-6">
              {/* Red Bird Side */}
              <div className="text-center">
                <div className="mb-2 sm:mb-4 animate-bounce" style={{animationDuration: '2s'}}>
                  <RedBird size={80} />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-red-200 drop-shadow-lg">BIRD ARMY</h3>
                <p className="text-white/80 text-sm sm:text-base">Your Team</p>
              </div>
              
              {/* VS Text */}
              <div className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-yellow-300 drop-shadow-lg animate-pulse">
                  VS
                </div>
                <div className="w-8 sm:w-10 lg:w-12 h-1 bg-yellow-300 mx-auto mt-1 sm:mt-2 rounded"></div>
              </div>
              
              {/* King Pig Side */}
              <div className="text-center">
                <div className="mb-2 sm:mb-4 animate-bounce" style={{animationDuration: '2s', animationDelay: '0.5s'}}>
                  <KingPig size={80} />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-200 drop-shadow-lg">PIG EMPIRE</h3>
                <p className="text-white/80 text-sm sm:text-base">AI Army</p>
              </div>
            </div>
            
            {/* Battle Description */}
            <div className="text-center">
              <p className="text-white/90 italic text-sm sm:text-base lg:text-lg">
                "You control only birds, but the AI has a full pig empire!"
              </p>
            </div>
          </div>

          {/* Center Section - Game Actions (Responsive) */}
          <div className="flex-shrink-0 flex flex-col justify-center items-center space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Character Showcase */}
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 mb-2 sm:mb-4">
              <div className="animate-bounce" style={{animationDelay: '0s'}}>
                <Stella size={35} />
              </div>
              <div className="animate-bounce" style={{animationDelay: '0.2s'}}>
                <YellowBird size={32} />
              </div>
              <div className="animate-bounce" style={{animationDelay: '0.4s'}}>
                <BlackBird size={34} />
              </div>
            </div>

            {/* Start Game Buttons */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="text-center">
                <button
                  onClick={handleSingleplayerClick}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                             text-white font-bold text-lg sm:text-xl lg:text-2xl px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 rounded-full shadow-2xl 
                             button-bounce transform hover:scale-110 transition-all duration-300
                             border-2 sm:border-3 lg:border-4 border-red-700 hover:border-red-800 flex items-center justify-center
                             animate-pulse hover:animate-none w-48 sm:w-56 lg:w-64"
                >
                  <IoPerson className="mr-2 sm:mr-3 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                  SINGLEPLAYER
                </button>
                <p className="text-white/80 text-xs sm:text-sm mt-1 sm:mt-2">vs AI Pig Army</p>
              </div>

              <div className="text-center">
                <button
                  onClick={onMultiPlayer}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                             text-white font-bold text-lg sm:text-xl lg:text-2xl px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 rounded-full shadow-2xl 
                             button-bounce transform hover:scale-110 transition-all duration-300
                             border-2 sm:border-3 lg:border-4 border-purple-700 hover:border-purple-800 flex items-center justify-center
                             w-48 sm:w-56 lg:w-64"
                >
                  <IoPeople className="mr-2 sm:mr-3 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                  MULTIPLAYER
                </button>
                <p className="text-white/80 text-xs sm:text-sm mt-1 sm:mt-2">vs Another Player</p>
              </div>
            </div>

            {/* Secondary Action Buttons (Responsive) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
              <button
                onClick={onShowCharacters}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                           text-white font-bold text-sm sm:text-base lg:text-xl px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-full shadow-lg 
                           button-bounce transform hover:scale-105 transition-all duration-200
                           border-2 sm:border-3 border-blue-700 hover:border-blue-800 flex items-center justify-center"
              >
                <IoInformationCircle className="mr-2 sm:mr-3 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                MEET YOUR ARMY
              </button>

              <button
                onClick={onShowShop}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 
                           text-white font-bold text-sm sm:text-base lg:text-xl px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-full shadow-lg 
                           button-bounce transform hover:scale-105 transition-all duration-200
                           border-2 sm:border-3 border-orange-700 hover:border-orange-800 flex items-center justify-center"
              >
                <IoStorefront className="mr-2 sm:mr-3 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                SHOP
              </button>
            </div>

            {/* Fun tagline */}
            <div className="text-center">
              <p className="text-lg text-white opacity-80 italic max-w-xs">
                "Birds vs. Pigs: The Ultimate Chess Showdown!"
              </p>
            </div>
          </div>

          {/* Right Section - Board Preview (Responsive) */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                BATTLEFIELD
              </h2>
            </div>
            
            {/* Mini Chess Board */}
            <div className="bg-amber-100 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 shadow-inner">
              <div className="grid grid-cols-8 gap-0.5 w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 mx-auto bg-amber-200 p-1.5 sm:p-2 rounded-lg">
                {Array.from({ length: 64 }, (_, i) => {
                  const isEven = Math.floor(i / 8) % 2 === 0;
                  const isLight = isEven ? i % 2 === 0 : i % 2 === 1;
                  
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center
                        ${isLight ? 'bg-yellow-100' : 'bg-amber-600'} 
                        transition-colors rounded-sm`}
                    >
                      {getBoardPreviewPiece(i)}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-2 sm:mt-3 lg:mt-4 text-center">
                <p className="text-amber-800 font-semibold text-sm sm:text-base">Chess Rules Apply</p>
                <p className="text-amber-700 text-xs sm:text-sm">But with Angry Birds fun!</p>
              </div>
            </div>

            {/* Game Features */}
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-center text-white/90">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                <span>Strategic Chess Gameplay</span>
              </div>
              <div className="flex items-center justify-center text-white/90">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                <span>Angry Birds Characters</span>
              </div>
              <div className="flex items-center justify-center text-white/90">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                <span>Epic Sound Effects</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Singleplayer Modal */}
      {showSingleplayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-4 border-purple-500 relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors"
            >
              <IoClose size={32} />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">🐦 SINGLEPLAYER</h2>
              <p className="text-white/80">Choose your difficulty level</p>
            </div>

            {/* Difficulty Options */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleDifficultySelect('easy')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                           text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 
                           transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <IoSpeedometer size={24} />
                <div>
                  <div className="text-lg">EASY</div>
                  <div className="text-xs opacity-80">Rookie</div>
                </div>
              </button>

              <button
                onClick={() => handleDifficultySelect('medium')}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600
                           text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 
                           transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <IoShield size={24} />
                <div>
                  <div className="text-lg">MEDIUM</div>
                  <div className="text-xs opacity-80">Challenger</div>
                </div>
              </button>

              <button
                onClick={() => handleDifficultySelect('hard')}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700
                           text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 
                           transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <IoFlame size={24} />
                <div>
                  <div className="text-lg">HARD</div>
                  <div className="text-xs opacity-80">Expert</div>
                </div>
              </button>

              <button
                onClick={() => handleDifficultySelect('nightmare')}
                className="bg-gradient-to-r from-purple-600 to-black hover:from-purple-700 hover:to-gray-900
                           text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 
                           transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <IoSkull size={24} />
                <div>
                  <div className="text-lg">NIGHTMARE</div>
                  <div className="text-xs opacity-80">Legendary</div>
                </div>
              </button>
            </div>

            {/* Separator */}
            <div className="w-full h-px bg-gray-600 my-6"></div>

            {/* Campaign Button */}
            <div className="text-center">
              <button
                onClick={handleCampaignClick}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                           text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 
                           transition-all duration-200 flex items-center justify-center space-x-3 mx-auto"
              >
                <IoMap size={20} />
                <span>PIG STRONGHOLDS</span>
              </button>
              <p className="text-white/60 text-sm mt-2">Fight through pig villages</p>
            </div>

            {/* Testing Button (Development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-center mt-6">
                <button
                  onClick={onShowTesting}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700
                             text-white font-bold py-2 px-6 rounded-lg shadow-lg transform hover:scale-105 
                             transition-all duration-200 flex items-center justify-center space-x-2 mx-auto text-sm"
                >
                  <IoSettings size={16} />
                  <span>ENERGY TESTING</span>
                </button>
                <p className="text-white/40 text-xs mt-1">Developer testing page</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Energy Purchase Modal */}
      {playerInventory && (
        <EnergyPurchaseModal
          isOpen={showEnergyPurchase}
          onClose={() => setShowEnergyPurchase(false)}
          onPurchase={async (energyAmount) => {
            if (purchaseEnergy) {
              const result = await purchaseEnergy(energyAmount);
              if (result.success) {
                console.log(result.message);
              } else {
                console.log(result.message);
              }
            }
            setShowEnergyPurchase(false);
          }}
          playerCoins={playerInventory.coins || 0}
          currentEnergy={playerInventory.energy || 0}
          maxEnergy={playerInventory.maxEnergy || 100}
        />
      )}

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Board Themes</h3>
              <button
                onClick={() => setShowThemeSelector(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {Object.entries(boardThemes).map(([themeId, theme]) => {
                const isOwned = themeId === 'default' || playerInventory.ownedItems?.[themeId];
                const isSelected = selectedTheme === themeId;
                
                if (!isOwned) return null;
                
                return (
                  <button
                    key={themeId}
                    onClick={() => handleThemeChange(themeId)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-400 bg-blue-500/20' 
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-white font-medium">{theme.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-4 h-4 rounded ${theme.colors.light}`}></div>
                          <div className={`w-4 h-4 rounded ${theme.colors.dark}`}></div>
                          <div className="text-slate-400 text-sm">Preview</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-400">✓</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                💡 Purchase more themes from the shop!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
