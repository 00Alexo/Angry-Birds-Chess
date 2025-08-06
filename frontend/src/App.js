

import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import CharactersPage from './components/CharactersPage';
import CampaignPage from './components/CampaignPage';
import ChessBoardPage from './components/ChessBoardPage';
import EnergyTestPage from './components/EnergyTestPage';
import { usePlayerInventory, useCampaignProgress } from './hooks/useGameData';

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // Back to main menu as default
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  
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
    timeUntilNextEnergy
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

  const handleMultiPlayer = () => {
    // TODO: Implement multiplayer game logic later
    console.log('Multiplayer game clicked!');
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
      case 'chess':
        return (
          <ChessBoardPage 
            onBack={selectedDifficulty ? handleBackFromDifficulty : handleBackToCampaign}
            levelData={selectedLevel}
            playerInventory={playerInventory}
            spendEnergy={spendEnergy}
            addCoins={addCoins}
            completeLevelWithStars={completeLevelWithStars}
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
            playerInventory={playerInventory}
            purchaseEnergy={purchaseEnergy}
            timeUntilNextEnergy={timeUntilNextEnergy}
          />
        );
    }
  };

  return (
    <div className="App">
      {renderCurrentScreen()}
    </div>
  );
}

export default App;
