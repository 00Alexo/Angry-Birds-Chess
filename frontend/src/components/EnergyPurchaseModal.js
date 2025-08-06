import React, { useState } from 'react';
import { FaBolt, FaCoins, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';

const EnergyPurchaseModal = ({ isOpen, onClose, onPurchase, playerCoins, currentEnergy, maxEnergy }) => {
  const [energyToPurchase, setEnergyToPurchase] = useState(1);
  const COST_PER_ENERGY = 3; // 3 coins per energy
  
  if (!isOpen) return null;

  const totalCost = energyToPurchase * COST_PER_ENERGY;
  const canAfford = playerCoins >= totalCost;
  const maxPurchasable = Math.min(
    Math.floor(playerCoins / COST_PER_ENERGY), // Based on coins
    maxEnergy - currentEnergy // Based on energy capacity
  );

  const handlePurchase = () => {
    if (canAfford && energyToPurchase > 0) {
      onPurchase(energyToPurchase);
    }
  };

  const adjustAmount = (delta) => {
    const newAmount = Math.max(1, Math.min(maxPurchasable, energyToPurchase + delta));
    setEnergyToPurchase(newAmount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-yellow-400">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-400 rounded-full">
              <FaBolt className="text-2xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Buy Energy</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-red-400 rounded-full text-white hover:bg-red-500 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg p-4 mb-6 border-2 border-yellow-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Your Coins:</span>
            <div className="flex items-center gap-1">
              <FaCoins className="text-yellow-500" />
              <span className="font-bold text-lg">{playerCoins}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Energy:</span>
            <div className="flex items-center gap-1">
              <FaBolt className="text-blue-500" />
              <span className="font-bold text-lg">{currentEnergy}/{maxEnergy}</span>
            </div>
          </div>
        </div>

        {/* Energy Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">How much energy?</h3>
          
          {maxPurchasable === 0 ? (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 text-center">
              <p className="text-red-600 font-medium">
                {currentEnergy === maxEnergy ? 
                  "Your energy is already full!" : 
                  "Not enough coins to buy energy!"}
              </p>
            </div>
          ) : (
            <>
              {/* Amount Selector */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => adjustAmount(-1)}
                  disabled={energyToPurchase <= 1}
                  className="p-2 bg-red-400 text-white rounded-full hover:bg-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <FaMinus />
                </button>
                
                <div className="bg-white border-2 border-yellow-400 rounded-lg px-6 py-3 min-w-[80px] text-center">
                  <span className="text-2xl font-bold text-gray-800">{energyToPurchase}</span>
                </div>
                
                <button
                  onClick={() => adjustAmount(1)}
                  disabled={energyToPurchase >= maxPurchasable}
                  className="p-2 bg-green-400 text-white rounded-full hover:bg-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <FaPlus />
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2 justify-center mb-4">
                {[1, 5, 10, maxPurchasable].filter(amount => amount > 0 && amount <= maxPurchasable).map(amount => (
                  <button
                    key={amount}
                    onClick={() => setEnergyToPurchase(amount)}
                    className={`px-3 py-2 rounded-lg border-2 font-medium transition-colors ${
                      energyToPurchase === amount
                        ? 'bg-yellow-400 border-yellow-500 text-white'
                        : 'bg-white border-yellow-300 text-gray-700 hover:border-yellow-400'
                    }`}
                  >
                    {amount === maxPurchasable ? 'Max' : amount}
                  </button>
                ))}
              </div>

              {/* Cost Display */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Cost:</span>
                  <div className="flex items-center gap-2">
                    <FaCoins className="text-yellow-500" />
                    <span className="font-bold text-xl text-blue-800">{totalCost}</span>
                  </div>
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  ({COST_PER_ENERGY} coins per energy point)
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          
          {maxPurchasable > 0 && (
            <button
              onClick={handlePurchase}
              disabled={!canAfford}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                canAfford
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canAfford ? 'Buy Energy!' : 'Not Enough Coins'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnergyPurchaseModal;
