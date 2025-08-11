
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginSignupPage from './components/LoginSignupPage';
import MainMenu from './components/MainMenu';
import CharactersPage from './components/CharactersPage';
import CampaignPage from './components/CampaignPage';
import ChessBoardPage from './components/ChessBoardPage';
import EnergyTestPage from './components/EnergyTestPage';
import ShopPage from './components/ShopPage';
import ProfilePage from './components/ProfilePage';
import { usePlayerInventory, useCampaignProgress } from './hooks/useGameData';
import socketService from './services/socketService';

// Main App Component wrapped with Auth
function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [authError, setAuthError] = useState('');
  const [authIsLoading, setAuthIsLoading] = useState(false);
  const [profileUsername, setProfileUsername] = useState(null);
  
  // Note: WebSocket connections are now handled per-game in ChessBoardPage
  // No persistent WebSocket connection needed

  // Parse URL for routing (including /profile/:username)
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/testing' && isAuthenticated) {
      setCurrentScreen('energy-test');
    } else if (path.startsWith('/profile/')) {
      const username = decodeURIComponent(path.replace('/profile/', ''));
      setProfileUsername(username);
      setCurrentScreen('profile');
    } else if (path === '/profile' && isAuthenticated) {
      setProfileUsername(user?.username || null);
      setCurrentScreen('profile');
    }
  }, [isAuthenticated, user]);
  
  // Use custom hooks for data management (only when authenticated)
  const { 
    playerInventory, 
    isLoading: inventoryLoading, 
    addCoins, 
    spendEnergy, 
    purchaseEnergy,
    resetProgress,
    timeUntilNextEnergy,
    purchaseShopItem,
    getDailyDeals,
    saveSelectedTheme,
    getSelectedTheme,
    refreshPlayerData
  } = usePlayerInventory();
  const { completeLevelWithStars, isLevelCompleted, getLevelStars } = useCampaignProgress();

  // Handle authentication
  const handleAuth = async (credentials, isLoginMode) => {
    setAuthIsLoading(true);
    setAuthError('');
    
    try {
      const result = await login(credentials, isLoginMode);
      
      if (!result.success) {
        setAuthError(result.message || 'Authentication failed');
      }
    } catch (error) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthIsLoading(false);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Connecting to Server...</p>
        </div>
      </div>
    );
  }

  // Show login/signup screen if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginSignupPage 
        onLogin={handleAuth}
        isLoading={authIsLoading}
        error={authError}
      />
    );
  }

  // Show loading screen while data loads
  if (inventoryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Game Data...</p>
          <p className="text-gray-300 text-sm mt-2">Welcome back, {user?.username}!</p>
        </div>
      </div>
    );
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  const handleMultiPlayer = () => {
    showNotification(`Multiplayer is not available yet as the game is still in its beta phase, but will be available soon with our own ELO system!`, `error`);
  };

  const handleSelectDifficulty = async (difficulty) => {
    setSelectedDifficulty(difficulty);
    
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
    
    setSelectedLevel(difficultyLevels[difficulty]);
    setCurrentScreen('chess');
    window.history.pushState(null, null, `/difficulty/${difficulty}`);
  };

  const handleSelectLevel = async (levelId, levelData) => {
    if (playerInventory.energy < 20) {
      console.log('Not enough energy! You need 20 energy to start a battle.');
      return;
    }

    const energySpent = await spendEnergy(20);
    if (!energySpent) {
      console.log('Failed to start battle. Not enough energy.');
      return;
    }

    console.log(`Starting campaign level: ${levelId} (Cost: 20 energy)`);
    
    setSelectedLevel(levelData);
    setCurrentScreen('chess');
    window.history.pushState(null, null, `/level/${levelId}`);
  };

  const handleNextLevel = () => {
    // Navigate back to campaign to show progress and allow next level selection
    setCurrentScreen('campaign');
    setSelectedLevel(null);
    window.history.pushState(null, null, '/campaign');
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

  // Show own profile
  const handleShowProfile = () => {
    setProfileUsername(user?.username || null);
    setCurrentScreen('profile');
    window.history.pushState(null, null, '/profile');
  };

  // Show any user's profile
  const handleShowAnyProfile = (username) => {
    setProfileUsername(username);
    setCurrentScreen('profile');
    window.history.pushState(null, null, `/profile/${encodeURIComponent(username)}`);
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

  const handleLogout = () => {
    logout();
    setCurrentScreen('menu');
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
            onNextLevel={handleNextLevel}
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
            purchaseEnergy={purchaseEnergy}
            resetProgress={resetProgress}
            timeUntilNextEnergy={timeUntilNextEnergy}
            purchaseShopItem={purchaseShopItem}
            refreshPlayerData={refreshPlayerData}
          />
        );
      case 'profile':
        return (
          <ProfilePage 
            onBack={handleBackToMenu}
            playerInventory={playerInventory}
            userName={profileUsername || user?.username}
            onShowAnyProfile={handleShowAnyProfile}
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
            onShowProfile={handleShowProfile}
            onLogout={handleLogout}
            playerInventory={playerInventory}
            purchaseEnergy={purchaseEnergy}
            timeUntilNextEnergy={timeUntilNextEnergy}
            saveSelectedTheme={saveSelectedTheme}
            getSelectedTheme={getSelectedTheme}
            userName={user?.username}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
