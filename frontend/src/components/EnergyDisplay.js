import React from 'react';
import { FaBolt, FaCoins, FaClock, FaPlus } from 'react-icons/fa';

const EnergyDisplay = ({ 
  energy, 
  maxEnergy, 
  timeUntilNextEnergy, 
  onPurchaseClick,
  showPurchaseButton = true,
  size = 'normal'
}) => {
  // Format time until next energy
  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return 'Ready!';
    
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const energyPercentage = (energy / maxEnergy) * 100;
  const isEnergyFull = energy >= maxEnergy;
  
  // Size variations
  const sizeClasses = {
    small: {
      container: 'text-sm',
      text: 'text-sm',
      icon: 'text-sm',
      bar: 'h-2',
      button: 'p-1 text-xs'
    },
    normal: {
      container: 'text-base',
      text: 'text-base',
      icon: 'text-base',
      bar: 'h-3',
      button: 'p-2'
    },
    large: {
      container: 'text-lg',
      text: 'text-lg',
      icon: 'text-lg',
      bar: 'h-4',
      button: 'p-3 text-lg'
    }
  };

  const classes = sizeClasses[size] || sizeClasses.normal;

  return (
    <div className={`bg-white rounded-lg border-2 border-blue-300 p-3 ${classes.container}`}>
      {/* Energy Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FaBolt className={`text-blue-500 ${classes.icon}`} />
          <span className={`font-bold text-gray-800 ${classes.text}`}>
            {energy}/{maxEnergy}
          </span>
        </div>
        
        {showPurchaseButton && !isEnergyFull && onPurchaseClick && (
          <button
            onClick={onPurchaseClick}
            className={`bg-yellow-400 text-white rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center gap-1 ${classes.button}`}
            title="Buy Energy with Coins"
          >
            <FaPlus className="text-xs" />
            <FaCoins className="text-xs" />
          </button>
        )}
      </div>

      {/* Energy Bar */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${classes.bar} mb-2`}>
        <div
          className={`${classes.bar} rounded-full transition-all duration-300 ${
            energyPercentage > 60 ? 'bg-green-500' :
            energyPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${energyPercentage}%` }}
        />
      </div>

      {/* Regeneration Timer */}
      {!isEnergyFull && (
        <div className="flex items-center justify-center gap-1 text-gray-600">
          <FaClock className="text-xs" />
          <span className="text-xs font-medium">
            Next: {formatTime(timeUntilNextEnergy)}
          </span>
        </div>
      )}
      
      {/* Energy Full Message */}
      {isEnergyFull && (
        <div className="text-center text-green-600 font-medium text-xs">
          Energy Full!
        </div>
      )}
    </div>
  );
};

export default EnergyDisplay;
