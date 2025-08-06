import React, { useState, useEffect } from 'react';
import { IoGameController, IoInformationCircle, IoPerson, IoPeople, IoClose, IoSpeedometer, IoShield, IoFlame, IoSkull, IoMap, IoSettings, IoCash } from 'react-icons/io5';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';
import EnergyDisplay from './EnergyDisplay';
import EnergyPurchaseModal from './EnergyPurchaseModal';

const MainMenu = ({ 
  onSinglePlayer, 
  onMultiPlayer, 
  onShowCharacters, 
  onSelectDifficulty, 
  onShowCampaign, 
  onShowTesting,
  playerInventory,
  purchaseEnergy,
  timeUntilNextEnergy = 0
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [showSingleplayerModal, setShowSingleplayerModal] = useState(false);
  const [showEnergyPurchase, setShowEnergyPurchase] = useState(false);

  useEffect(() => {
    setShowAnimation(true);
  }, []);

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

      {/* Status Bar */}
      {playerInventory && (
        <div className="relative z-20 flex justify-end p-4">
          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
            <div className="flex items-center gap-2">
              <IoCash className="text-yellow-400 w-5 h-5" />
              <span className="text-white font-bold">{playerInventory.coins?.toLocaleString() || 0}</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <EnergyDisplay
              energy={playerInventory.energy || 0}
              maxEnergy={playerInventory.maxEnergy || 100}
              timeUntilNextEnergy={timeUntilNextEnergy}
              onPurchaseClick={() => setShowEnergyPurchase(true)}
              size="small"
            />
          </div>
        </div>
      )}

      <div className={`relative z-10 h-full transform transition-all duration-1000 ${showAnimation ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold game-title mb-2">
            ANGRY BIRDS CHESS
          </h1>
          <p className="text-xl md:text-2xl text-white drop-shadow-md">
            Strategic Bird Warfare!
          </p>
        </div>

        {/* Main Content - Three Columns */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center max-w-7xl mx-auto">
          
          {/* Left Section - PIG VS RED BIRD */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                EPIC BATTLE
              </h2>
            </div>
            
            {/* VS Display */}
            <div className="flex items-center justify-center space-x-8 mb-6">
              {/* Red Bird Side */}
              <div className="text-center">
                <div className="mb-4 animate-bounce" style={{animationDuration: '2s'}}>
                  <RedBird size={120} />
                </div>
                <h3 className="text-2xl font-bold text-red-200 drop-shadow-lg">BIRD ARMY</h3>
                <p className="text-white/80">Your Team</p>
              </div>
              
              {/* VS Text */}
              <div className="text-center">
                <div className="text-6xl font-bold text-yellow-300 drop-shadow-lg animate-pulse">
                  VS
                </div>
                <div className="w-12 h-1 bg-yellow-300 mx-auto mt-2 rounded"></div>
              </div>
              
              {/* King Pig Side */}
              <div className="text-center">
                <div className="mb-4 animate-bounce" style={{animationDuration: '2s', animationDelay: '0.5s'}}>
                  <KingPig size={120} />
                </div>
                <h3 className="text-2xl font-bold text-green-200 drop-shadow-lg">PIG EMPIRE</h3>
                <p className="text-white/80">AI Army</p>
              </div>
            </div>
            
            {/* Battle Description */}
            <div className="text-center">
              <p className="text-white/90 italic text-lg">
                "You control only birds, but the AI has a full pig empire!"
              </p>
            </div>
          </div>

          {/* Center Section - Start Game */}
          <div className="flex-shrink-0 flex flex-col justify-center items-center space-y-8">
            {/* Character Showcase */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="animate-bounce" style={{animationDelay: '0s'}}>
                <Stella size={50} />
              </div>
              <div className="animate-bounce" style={{animationDelay: '0.2s'}}>
                <YellowBird size={45} />
              </div>
              <div className="animate-bounce" style={{animationDelay: '0.4s'}}>
                <BlackBird size={48} />
              </div>
            </div>

            {/* Start Game Buttons */}
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleSingleplayerClick}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                             text-white font-bold text-2xl px-10 py-4 rounded-full shadow-2xl 
                             button-bounce transform hover:scale-110 transition-all duration-300
                             border-4 border-red-700 hover:border-red-800 flex items-center justify-center
                             animate-pulse hover:animate-none w-64"
                >
                  <IoPerson className="mr-3" size={32} />
                  SINGLEPLAYER
                </button>
                <p className="text-white/80 text-sm mt-2">vs AI Pig Army</p>
              </div>

              <div className="text-center">
                <button
                  onClick={onMultiPlayer}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                             text-white font-bold text-2xl px-10 py-4 rounded-full shadow-2xl 
                             button-bounce transform hover:scale-110 transition-all duration-300
                             border-4 border-purple-700 hover:border-purple-800 flex items-center justify-center
                             w-64"
                >
                  <IoPeople className="mr-3" size={32} />
                  MULTIPLAYER
                </button>
                <p className="text-white/80 text-sm mt-2">vs Another Player</p>
              </div>
            </div>

            {/* Meet Your Army Button */}
            <button
              onClick={onShowCharacters}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                         text-white font-bold text-xl px-8 py-3 rounded-full shadow-lg 
                         button-bounce transform hover:scale-105 transition-all duration-200
                         border-3 border-blue-700 hover:border-blue-800 flex items-center justify-center"
            >
              <IoInformationCircle className="mr-3" size={24} />
              MEET YOUR ARMY
            </button>

            {/* Fun tagline */}
            <div className="text-center">
              <p className="text-lg text-white opacity-80 italic max-w-xs">
                "Birds vs. Pigs: The Ultimate Chess Showdown!"
              </p>
            </div>
          </div>

          {/* Right Section - Board Preview */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                BATTLEFIELD
              </h2>
            </div>
            
            {/* Mini Chess Board */}
            <div className="bg-amber-100 rounded-2xl p-4 shadow-inner">
              <div className="grid grid-cols-8 gap-0.5 w-64 h-64 mx-auto bg-amber-200 p-2 rounded-lg">
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
              
              <div className="mt-4 text-center">
                <p className="text-amber-800 font-semibold">Chess Rules Apply</p>
                <p className="text-amber-700 text-sm">But with Angry Birds fun!</p>
              </div>
            </div>

            {/* Game Features */}
            <div className="mt-6 space-y-3">
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
    </div>
  );
};

export default MainMenu;
