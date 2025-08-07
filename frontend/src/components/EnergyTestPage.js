import React, { useState, useEffect } from 'react';
import { usePlayerInventory, useCampaignProgress } from '../hooks/useGameData';
import EnergyDisplay from '../components/EnergyDisplay';
import EnergyPurchaseModal from '../components/EnergyPurchaseModal';
import { IoArrowBack } from 'react-icons/io5';

const EnergyTestPage = ({ onBack }) => {
  const { 
    playerInventory, 
    isLoading, 
    timeUntilNextEnergy,
    purchaseEnergy,
    resetProgress,
    resetEverything,
    spendEnergy,
    addCoins
  } = usePlayerInventory();
  
  const { 
    completeLevelWithStars, 
    isLevelCompleted, 
    getLevelStars 
  } = useCampaignProgress();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [log, setLog] = useState([]);

  const addToLog = (message) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!isLoading) {
      addToLog(`Energy System Loaded - Energy: ${playerInventory.energy}/${playerInventory.maxEnergy}, Coins: ${playerInventory.coins}`);
    }
  }, [isLoading, playerInventory]);

  const handleSpendEnergy = async () => {
    const success = await spendEnergy(10);
    addToLog(success ? 'Spent 10 energy successfully!' : 'Failed to spend energy - not enough!');
  };

  const handleAddCoins = async () => {
    await addCoins(100);
    addToLog('Added 100 coins!');
  };

  const handlePurchaseEnergy = async (amount) => {
    const result = await purchaseEnergy(amount);
    addToLog(result.success ? result.message : `Failed: ${result.message}`);
    setShowPurchaseModal(false);
  };

  const handleResetProgress = async () => {
    if (window.confirm('Reset player progress only (keep campaign)?')) {
      const success = await resetProgress();
      addToLog(success ? 'Player progress reset successfully!' : 'Failed to reset progress');
    }
  };

  const handleResetEverything = async () => {
    if (window.confirm('🚨 RESET EVERYTHING? This will clear ALL progress including campaign levels and cannot be undone!')) {
      const success = await resetEverything();
      addToLog(success ? 'Everything reset! Page will reload...' : 'Failed to reset everything');
    }
  };

  const handleCompleteLevel = async (levelId, coins) => {
    if (completeLevelWithStars) {
      await completeLevelWithStars(levelId, 3, coins); // Complete with 3 stars
      addToLog(`Completed level ${levelId} with 3 stars and ${coins} coins!`);
    }
  };

  const handleCompleteAllLevels = async () => {
    if (window.confirm('Complete ALL campaign levels? This will unlock everything.')) {
      const levelRewards = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000];
      
      for (let i = 1; i <= 13; i++) {
        await handleCompleteLevel(i, levelRewards[i - 1]);
      }
      
      // Add completion bonus
      await addCoins(1000);
      addToLog('🎉 CAMPAIGN COMPLETED! Added 1000 coin completion bonus!');
    }
  };

  const handleTestCompletionBonus = async () => {
    // Check if all levels are completed
    const allCompleted = Array.from({length: 13}, (_, i) => i + 1).every(id => 
      isLevelCompleted && isLevelCompleted(id)
    );
    
    if (allCompleted) {
      await addCoins(1000);
      addToLog('🏆 Added 1000 coin completion bonus! (All levels already completed)');
    } else {
      addToLog('❌ Cannot add completion bonus - not all levels completed yet');
    }
  };

  const handleUnlockLevel = async (levelId) => {
    if (completeLevelWithStars && levelId > 1) {
      // Complete the previous level to unlock this one
      await completeLevelWithStars(levelId - 1, 1, 0); // Complete previous with 1 star, 0 coins (test only)
      addToLog(`Unlocked level ${levelId} by completing level ${levelId - 1}`);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <IoArrowBack />
            <span>Back to Menu</span>
          </button>
          <h1 className="text-3xl font-bold">Energy System Test Page</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
        
        {/* Energy Display */}
        <div className="mb-8 flex justify-center">
          <div className="w-80">
            <EnergyDisplay
              energy={playerInventory.energy}
              maxEnergy={playerInventory.maxEnergy}
              timeUntilNextEnergy={timeUntilNextEnergy}
              onPurchaseClick={() => setShowPurchaseModal(true)}
              size="large"
            />
          </div>
        </div>

        {/* Player Stats */}
        <div className="bg-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Player Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-yellow-400 font-bold text-2xl">{playerInventory.coins}</div>
              <div className="text-sm text-gray-300">Coins</div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-2xl">{playerInventory.energy}/{playerInventory.maxEnergy}</div>
              <div className="text-sm text-gray-300">Energy</div>
            </div>
            <div>
              <div className="text-green-400 font-bold text-2xl">{playerInventory.totalEnergyPurchased || 0}</div>
              <div className="text-sm text-gray-300">Energy Bought</div>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-2xl">{playerInventory.gamesPlayed || 0}</div>
              <div className="text-sm text-gray-300">Games Played</div>
            </div>
          </div>
          
          {timeUntilNextEnergy > 0 && (
            <div className="mt-4 text-center">
              <div className="text-cyan-400">
                Next energy in: {Math.ceil(timeUntilNextEnergy / 1000)} seconds
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <button
            onClick={handleSpendEnergy}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            disabled={playerInventory.energy < 10}
          >
            Spend 10 Energy
          </button>
          
          <button
            onClick={handleAddCoins}
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition-colors"
          >
            Add 100 Coins
          </button>
          
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
          >
            Buy Energy
          </button>
          
          <button
            onClick={handleResetProgress}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Reset Player Only
          </button>

          <button
            onClick={handleResetEverything}
            className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded-lg transition-colors text-sm font-bold border-2 border-red-600"
          >
            🚨 RESET ALL
          </button>
        </div>

        {/* Campaign Testing Buttons */}
        <div className="bg-purple-900/30 rounded-lg p-6 mb-8 border border-purple-600/30">
          <h2 className="text-xl font-bold mb-4 text-purple-300">🧪 Campaign Reward Testing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={handleCompleteAllLevels}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg transition-colors font-semibold"
            >
              🏆 Complete All Levels
              <div className="text-xs text-purple-200 mt-1">Auto-awards all level coins + 1000 bonus</div>
            </button>
            
            <button
              onClick={handleTestCompletionBonus}
              className="bg-amber-600 hover:bg-amber-700 px-4 py-3 rounded-lg transition-colors font-semibold"
            >
              💰 Test Completion Bonus
              <div className="text-xs text-amber-200 mt-1">Adds 1000 coins if all levels done</div>
            </button>
            
            <button
              onClick={() => handleCompleteLevel(13, 1000)}
              className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg transition-colors font-semibold"
            >
              👑 Complete Final Level
              <div className="text-xs text-red-200 mt-1">Complete level 13 (1000 coins)</div>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <h3 className="col-span-full text-lg font-semibold text-purple-200 mb-2">Quick Level Completion:</h3>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(levelId => (
              <button
                key={levelId}
                onClick={() => {
                  const rewards = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800];
                  handleCompleteLevel(levelId, rewards[levelId - 1]);
                }}
                className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
                  isLevelCompleted && isLevelCompleted(levelId)
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-600 hover:bg-slate-700 text-white'
                }`}
              >
                L{levelId} 
                <div className="text-xs">
                  {[50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800][levelId - 1]}🪙
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Campaign Status */}
        <div className="bg-blue-900/30 rounded-lg p-6 mb-8 border border-blue-600/30">
          <h2 className="text-xl font-bold mb-4 text-blue-300">📊 Campaign Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-green-400 font-bold text-2xl">
                {Array.from({length: 13}, (_, i) => i + 1).filter(id => isLevelCompleted && isLevelCompleted(id)).length}/13
              </div>
              <div className="text-sm text-gray-300">Levels Completed</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold text-2xl">
                {Array.from({length: 13}, (_, i) => i + 1).reduce((total, id) => 
                  total + (getLevelStars ? getLevelStars(id) : 0), 0)}/39
              </div>
              <div className="text-sm text-gray-300">Stars Earned</div>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-2xl">
                {Array.from({length: 13}, (_, i) => i + 1).reduce((total, id) => {
                  if (!isLevelCompleted || !isLevelCompleted(id)) return total;
                  const rewards = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000];
                  return total + rewards[id - 1];
                }, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">Level Coins Earned</div>
            </div>
            <div>
              <div className={`font-bold text-2xl ${
                Array.from({length: 13}, (_, i) => i + 1).every(id => isLevelCompleted && isLevelCompleted(id))
                  ? 'text-amber-400' : 'text-gray-400'
              }`}>
                {Array.from({length: 13}, (_, i) => i + 1).every(id => isLevelCompleted && isLevelCompleted(id))
                  ? '✅ 1000' : '❌ 0'}
              </div>
              <div className="text-sm text-gray-300">Completion Bonus</div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-black/20 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Activity Log</h2>
          <div className="h-60 overflow-y-auto bg-black/30 rounded p-4">
            {log.map((entry, index) => (
              <div key={index} className="text-sm text-gray-300 mb-1">
                {entry}
              </div>
            ))}
          </div>
        </div>

        {/* Purchase Modal */}
        <EnergyPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchase={handlePurchaseEnergy}
          playerCoins={playerInventory.coins}
          currentEnergy={playerInventory.energy}
          maxEnergy={playerInventory.maxEnergy}
        />
      </div>
    </div>
  );
};

export default EnergyTestPage;
