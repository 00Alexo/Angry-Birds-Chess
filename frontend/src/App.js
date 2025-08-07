

import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import CharactersPage from './components/CharactersPage';
import CampaignPage from './components/CampaignPage';
import ChessBoardPage from './components/ChessBoardPage';
import EnergyTestPage from './components/EnergyTestPage';
import ShopPage from './components/ShopPage';
import { usePlayerInventory, useCampaignProgress } from './hooks/useGameData';

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // Back to main menu as default
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  
  // Check for testing route in URL
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/testing') {
      setCurrentScreen('energy-test');
    }
  }, []);
  
  // Use custom hooks for data management
  const { 
    playerInventory, 
    isLoading: inventoryLoading, 
    addCoins, 
    spendEnergy, 
    purchaseEnergy,
    resetProgress,
    timeUntilNextEnergy,
    refreshPlayerData,
    purchaseShopItem,
    getDailyDeals,
    saveSelectedTheme,
    getSelectedTheme
  } = usePlayerInventory();
  const { completeLevelWithStars, isLevelCompleted, getLevelStars } = useCampaignProgress();

  // Show loading screen while data loads
  if (inventoryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Game Data...</p>
        </div>
      </div>
    );
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    // Auto-hide notification after 4 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  const handleMultiPlayer = () => {
    showNotification(`Multiplayer is not available yet as the game is still in it's beta phase, but will be available soon with our own ELO system!`, `error`);
  };

  const handleSelectDifficulty = async (difficulty) => {
    setSelectedDifficulty(difficulty);
    
    // Create level data based on difficulty
    const difficultyLevels = {
      easy: {
        name: "Rookie Battle",
        terrain: "Green Hills",
        difficulty: "easy",
        coinReward: 100,
        energyCost: 0,
        description: "A gentle introduction to chess warfare"
      },
      medium: {
        name: "Challenger Duel",
        terrain: "Desert Canyon",
        difficulty: "medium", 
        coinReward: 200,
        energyCost: 0,
        description: "Strategic thinking required"
      },
      hard: {
        name: "Expert Combat",
        terrain: "Volcano Fortress",
        difficulty: "hard",
        coinReward: 350,
        energyCost: 0,
        description: "Only skilled commanders survive"
      },
      nightmare: {
        name: "Legendary Warfare",
        terrain: "Shadow Realm",
        difficulty: "nightmare",
        coinReward: 500,
        energyCost: 0,
        description: "The ultimate chess challenge"
      }
    };

    console.log(`Starting ${difficulty} difficulty battle (Free practice)`);
    
    // Store the level data and navigate to chess board
    setSelectedLevel(difficultyLevels[difficulty]);
    setCurrentScreen('chess');
    window.history.pushState(null, null, `/difficulty/${difficulty}`);
  };

  const handleSelectLevel = async (levelId, levelData) => {
    // Check if player has enough energy
    if (playerInventory.energy < 20) {
      console.log('Not enough energy! You need 20 energy to start a battle.');
      return;
    }

    // Spend energy for the battle
    const energySpent = await spendEnergy(20);
    if (!energySpent) {
      console.log('Failed to start battle. Not enough energy.');
      return;
    }

    console.log(`Starting campaign level: ${levelId} (Cost: 20 energy)`);
    
    // Store the level data and navigate to chess board
    setSelectedLevel(levelData);
    setCurrentScreen('chess');
    window.history.pushState(null, null, `/level/${levelId}`);
  };

  const handleShowCharacters = () => {
    setCurrentScreen('characters');
  };

  const handleShowCampaign = () => {
    setCurrentScreen('campaign');
    window.history.pushState(null, null, '/campaign');
  };

  const handleShowTesting = () => {
    setCurrentScreen('energy-test');
    window.history.pushState(null, null, '/testing');
  };

  const handleShowShop = () => {
    setCurrentScreen('shop');
    window.history.pushState(null, null, '/shop');
  };

  const handleBackToCampaign = () => {
    setCurrentScreen('campaign');
    setSelectedLevel(null);
    window.history.pushState(null, null, '/campaign');
  };

  const handleBackFromDifficulty = () => {
    setCurrentScreen('menu');
    setSelectedLevel(null);
    setSelectedDifficulty(null);
    window.history.pushState(null, null, '/');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
    setSelectedLevel(null);
    window.history.pushState(null, null, '/');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'energy-test':
        return <EnergyTestPage onBack={handleBackToMenu} />;
      case 'characters':
        return <CharactersPage onBack={handleBackToMenu} playerInventory={playerInventory} />;
      case 'shop':
        return (
          <ShopPage 
            onBack={handleBackToMenu} 
            playerInventory={playerInventory}
            purchaseShopItem={purchaseShopItem}
            getDailyDeals={getDailyDeals}
          />
        );
      case 'chess':
        return (
          <ChessBoardPage 
            onBack={selectedDifficulty ? handleBackFromDifficulty : handleBackToCampaign}
            levelData={selectedLevel}
            playerInventory={playerInventory}
            spendEnergy={spendEnergy}
            addCoins={addCoins}
            completeLevelWithStars={completeLevelWithStars}
            selectedTheme={playerInventory.selectedTheme || 'default'}
          />
        );
      case 'campaign':
        return (
          <CampaignPage 
            onBack={handleBackToMenu} 
            onSelectLevel={handleSelectLevel} 
            playerInventory={playerInventory}
            isLevelCompleted={isLevelCompleted}
            getLevelStars={getLevelStars}
            purchaseEnergy={purchaseEnergy}
            resetProgress={resetProgress}
            timeUntilNextEnergy={timeUntilNextEnergy}
            completeLevelWithStars={completeLevelWithStars}
            purchaseShopItem={purchaseShopItem}
          />
        );
      default:
        return (
          <MainMenu 
            onMultiPlayer={handleMultiPlayer}
            onShowCharacters={handleShowCharacters}
            onSelectDifficulty={handleSelectDifficulty}
            onShowCampaign={handleShowCampaign}
            onShowTesting={handleShowTesting}
            onShowShop={handleShowShop}
            playerInventory={playerInventory}
            purchaseEnergy={purchaseEnergy}
            timeUntilNextEnergy={timeUntilNextEnergy}
            saveSelectedTheme={saveSelectedTheme}
            getSelectedTheme={getSelectedTheme}
          />
        );
    }
  };

  return (
    <div className="App">
      {/* Notification Banner */}
      {notification.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${
          notification.type === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : notification.type === 'success'
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        } text-white px-6 py-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'error' 
            ? 'border-red-300' 
            : notification.type === 'success'
            ? 'border-green-300'
            : 'border-blue-300'
        } animate-slide-down backdrop-blur-sm`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-xl">
              {notification.type === 'error' ? '⚠️' : notification.type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'info' })}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {renderCurrentScreen()}
    </div>
  );
}

export default App;
