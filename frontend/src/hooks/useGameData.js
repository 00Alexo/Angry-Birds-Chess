import { useState, useEffect, useCallback } from 'react';
import serverGameDB from '../utils/serverDatabase';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

export const usePlayerInventory = () => {
  const { user, isAuthenticated } = useAuth();
  const [playerInventory, setPlayerInventory] = useState({
    coins: 0,
    energy: 100,
    maxEnergy: 100,
    lastEnergyUpdate: Date.now(),
    totalEnergyPurchased: 0,
    gamesPlayed: 0,
    totalCoinsEarned: 0,
    levelSkipTokens: 0,
    completionBonusAwarded: false,
    selectedTheme: 'default',
    coinMultiplier: null,
    energyRegenBoost: null,
    ownedItems: {},
    shopPurchases: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilNextEnergy, setTimeUntilNextEnergy] = useState(0);

  // Load player data from server
  const loadPlayerData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get fresh user data directly from API
      const response = await apiService.getCurrentUser();
      
      if (response.user && response.user.playerData) {
        setPlayerInventory(response.user.playerData);
        setTimeUntilNextEnergy(response.user.timeUntilNextEnergy || 0);
      } else {
        // Fallback to server database if user data doesn't include player data
        const playerData = await serverGameDB.getPlayerData();
        setPlayerInventory(playerData);
        
        const timeUntilNext = await serverGameDB.getTimeUntilNextEnergy();
        setTimeUntilNextEnergy(timeUntilNext);
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
      // Use default data on error
      setPlayerInventory(serverGameDB.getDefaultPlayerData());
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data on mount and when auth changes
  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  // Energy regeneration timer with local countdown
  useEffect(() => {
    if (!isAuthenticated || playerInventory.energy >= playerInventory.maxEnergy) return;

    // Server sync interval - check server every 5 seconds
    const serverInterval = setInterval(async () => {
      try {
        const regeneratedData = await serverGameDB.regenerateEnergy();
        setPlayerInventory(regeneratedData);
        
        const timeUntilNext = await serverGameDB.getTimeUntilNextEnergy();
        setTimeUntilNextEnergy(timeUntilNext);
      } catch (error) {
        console.error('Energy regeneration failed:', error);
      }
    }, 5000);

    // Local countdown timer - update display every second
    const countdownInterval = setInterval(() => {
      setTimeUntilNextEnergy(prev => {
        if (prev <= 1000) { // Less than 1 second left
          return 0;
        }
        return prev - 1000; // Subtract 1 second
      });
    }, 1000);

    return () => {
      clearInterval(serverInterval);
      clearInterval(countdownInterval);
    };
  }, [isAuthenticated, playerInventory.energy, playerInventory.maxEnergy]);

  // Refresh player data
  const refreshPlayerData = useCallback(async () => {
    return await loadPlayerData();
  }, [loadPlayerData]);

  // Add coins
  const addCoins = useCallback(async (amount) => {
    if (!isAuthenticated) return false;
    
    try {
      const result = await serverGameDB.addCoins(amount);
      await refreshPlayerData(); // Refresh to get updated data
      return result;
    } catch (error) {
      console.error('Failed to add coins:', error);
      return false;
    }
  }, [isAuthenticated, refreshPlayerData]);

  // Spend energy
  const spendEnergy = useCallback(async (amount) => {
    if (!isAuthenticated) return false;
    
    try {
      const result = await serverGameDB.spendEnergy(amount);
      await refreshPlayerData(); // Refresh to get updated data
      return result;
    } catch (error) {
      console.error('Failed to spend energy:', error);
      return false;
    }
  }, [isAuthenticated, refreshPlayerData]);

  // Purchase energy
  const purchaseEnergy = useCallback(async (energyAmount, costPerEnergy = 3) => {
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };
    
    try {
      const result = await serverGameDB.purchaseEnergy(energyAmount, costPerEnergy);
      await refreshPlayerData(); // Refresh to get updated data
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to purchase energy:', error);
      return { success: false, message: error.message };
    }
  }, [isAuthenticated, refreshPlayerData]);

  // Purchase shop item
  const purchaseShopItem = useCallback(async (itemId, itemPrice, itemData = {}) => {
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };
    
    try {
      const result = await serverGameDB.purchaseShopItem(itemId, itemPrice, itemData);
      await refreshPlayerData(); // Refresh to get updated data
      return result;
    } catch (error) {
      console.error('Failed to purchase shop item:', error);
      return { success: false, message: error.message };
    }
  }, [isAuthenticated, refreshPlayerData]);

  // Get daily deals
  const getDailyDeals = useCallback(async () => {
    if (!isAuthenticated) return [];
    
    try {
      return await serverGameDB.getDailyDeals();
    } catch (error) {
      console.error('Failed to get daily deals:', error);
      return [];
    }
  }, [isAuthenticated]);

  // Save selected theme
  const saveSelectedTheme = useCallback(async (themeId) => {
    if (!isAuthenticated) return false;
    
    try {
      const result = await serverGameDB.saveSelectedTheme(themeId);
      await refreshPlayerData(); // Refresh to get updated data
      return result;
    } catch (error) {
      console.error('Failed to save selected theme:', error);
      return false;
    }
  }, [isAuthenticated, refreshPlayerData]);

  // Get selected theme
  const getSelectedTheme = useCallback(async () => {
    if (!isAuthenticated) return 'default';
    
    try {
      return await serverGameDB.getSelectedTheme();
    } catch (error) {
      console.error('Failed to get selected theme:', error);
      return 'default';
    }
  }, [isAuthenticated]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    if (!isAuthenticated) return false;
    
    try {
      const result = await apiService.resetProgress();
      // Reload player data after reset
      await loadPlayerData();
      return true;
    } catch (error) {
      console.error('Failed to reset progress:', error);
      return false;
    }
  }, [isAuthenticated, loadPlayerData]);

  return {
    playerInventory,
    isLoading,
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
  };
};

export const useCampaignProgress = () => {
  const { isAuthenticated } = useAuth();
  const [campaignProgress, setCampaignProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load campaign progress using the simple campaign manager
  const loadCampaignProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { default: campaignManager } = await import('../utils/campaignManager');
      const progress = await campaignManager.loadProgress();
      setCampaignProgress(progress);
      console.log(`✅ useCampaignProgress: Loaded ${progress.length} completed levels`);
    } catch (error) {
      console.error('❌ useCampaignProgress: Failed to load campaign progress:', error);
      setCampaignProgress([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data on mount and when auth changes
  useEffect(() => {
    loadCampaignProgress();
  }, [loadCampaignProgress]);

  // Complete level with stars - simplified
  const completeLevelWithStars = useCallback(async (levelId, stars, coinsEarned, bestTime = null) => {
    if (!isAuthenticated) return false;
    
    try {
      const { default: campaignManager } = await import('../utils/campaignManager');
      const result = await campaignManager.completeLevel(levelId, stars, coinsEarned, bestTime);
      
      // Update local state with fresh data
      const progress = await campaignManager.loadProgress();
      setCampaignProgress(progress);
      
      return result;
    } catch (error) {
      console.error('❌ useCampaignProgress: Failed to complete level:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Check if level is completed - simplified
  const isLevelCompleted = useCallback((levelId) => {
    const levelData = campaignProgress.find(p => p.levelId === levelId);
    return levelData ? levelData.completed : false;
  }, [campaignProgress]);

  // Get level stars - simplified
  const getLevelStars = useCallback((levelId) => {
    const levelData = campaignProgress.find(p => p.levelId === levelId);
    return levelData ? levelData.stars : 0;
  }, [campaignProgress]);

  return {
    campaignProgress,
    isLoading,
    completeLevelWithStars,
    isLevelCompleted,
    getLevelStars,
    refreshCampaignProgress: loadCampaignProgress
  };
};
