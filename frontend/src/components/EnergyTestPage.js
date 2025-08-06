import React, { useState, useEffect } from 'react';
import { usePlayerInventory } from '../hooks/useGameData';
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
