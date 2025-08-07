import { useState, useEffect, useCallback } from 'react';
import gameDB from '../utils/database';

  // Custom hook for managing player inventory with IndexedDB persistence
export const usePlayerInventory = () => {
  const [playerInventory, setPlayerInventory] = useState({
    coins: 0,
    energy: 100,
    maxEnergy: 100,
    lastEnergyUpdate: Date.now()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilNextEnergy, setTimeUntilNextEnergy] = useState(0);

  // Refresh player data (useful when completion bonus is awarded)
  const refreshPlayerData = useCallback(async () => {
    try {
      const updatedData = await gameDB.regenerateEnergy();
      setPlayerInventory({
        coins: updatedData.coins,
        energy: updatedData.energy,
        maxEnergy: updatedData.maxEnergy,
        lastEnergyUpdate: updatedData.lastEnergyUpdate,
        totalEnergyPurchased: updatedData.totalEnergyPurchased || 0,
        gamesPlayed: updatedData.gamesPlayed || 0,
        totalCoinsEarned: updatedData.totalCoinsEarned || 0,
        // Include shop items
        levelSkipTokens: updatedData.levelSkipTokens || 0,
        coinMultiplier: updatedData.coinMultiplier || null,
        energyRegenBoost: updatedData.energyRegenBoost || null,
        ownedItems: updatedData.ownedItems || {},
        shopPurchases: updatedData.shopPurchases || {},
        selectedTheme: updatedData.selectedTheme || 'default'
      });
    } catch (error) {
      console.error('Failed to refresh player data:', error);
    }
  }, []);

  // Initialize database and load player data
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await gameDB.init();
        // Regenerate energy based on time passed
        const updatedData = await gameDB.regenerateEnergy();
        
        setPlayerInventory({
          coins: updatedData.coins,
          energy: updatedData.energy,
          maxEnergy: updatedData.maxEnergy,
          lastEnergyUpdate: updatedData.lastEnergyUpdate,
          totalEnergyPurchased: updatedData.totalEnergyPurchased || 0,
          gamesPlayed: updatedData.gamesPlayed || 0,
          totalCoinsEarned: updatedData.totalCoinsEarned || 0,
          // Include shop items
          levelSkipTokens: updatedData.levelSkipTokens || 0,
          coinMultiplier: updatedData.coinMultiplier || null,
          energyRegenBoost: updatedData.energyRegenBoost || null,
          ownedItems: updatedData.ownedItems || {},
          shopPurchases: updatedData.shopPurchases || {},
          selectedTheme: updatedData.selectedTheme || 'default'
        });

        // Get time until next energy regeneration
        const nextEnergyTime = await gameDB.getTimeUntilNextEnergy();
        setTimeUntilNextEnergy(nextEnergyTime);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabase();

    // Listen for campaign completion events to refresh player data
    const handleCampaignCompleted = () => {
      console.log('🎉 Campaign completion event received, refreshing player data...');
      refreshPlayerData();
    };

    const handleForceRefresh = () => {
      console.log('🔄 Force refresh event received, refreshing player data...');
      refreshPlayerData();
    };

    window.addEventListener('campaignCompleted', handleCampaignCompleted);
    window.addEventListener('forceRefreshInventory', handleForceRefresh);
    
    return () => {
      window.removeEventListener('campaignCompleted', handleCampaignCompleted);
      window.removeEventListener('forceRefreshInventory', handleForceRefresh);
    };
  }, [refreshPlayerData]);

  // Auto-regenerate energy and update countdown
  useEffect(() => {
    const energyTimer = setInterval(async () => {
      try {
        const updatedData = await gameDB.regenerateEnergyWithBoost();
        setPlayerInventory(prev => ({
          ...prev,
          energy: updatedData.energy,
          maxEnergy: updatedData.maxEnergy,
          lastEnergyUpdate: updatedData.lastEnergyUpdate,
          energyRegenBoost: updatedData.energyRegenBoost
        }));

        // Update countdown timer
        const nextEnergyTime = await gameDB.getTimeUntilNextEnergy();
        setTimeUntilNextEnergy(nextEnergyTime);
      } catch (error) {
        console.error('Failed to regenerate energy:', error);
      }
    }, 1000); // Check every second for smooth countdown

    return () => clearInterval(energyTimer);
  }, []);

  // Save inventory to database whenever it changes
  const saveInventory = useCallback(async (newInventory) => {
    try {
      await gameDB.savePlayerData(newInventory);
      setPlayerInventory(newInventory);
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }, []);

  // Add coins
  const addCoins = useCallback(async (amount) => {
    const currentCoins = playerInventory.coins || 0;
    const currentTotalEarned = playerInventory.totalCoinsEarned || 0;
    const coinsToAdd = isNaN(amount) ? 0 : Math.max(0, Math.floor(amount));
    
    const newInventory = {
      ...playerInventory,
      coins: Math.max(0, currentCoins + coinsToAdd),
      totalCoinsEarned: Math.max(0, currentTotalEarned + coinsToAdd)
    };
    
    console.log('💰 Adding coins:', {
      currentCoins,
      coinsToAdd,
      newCoins: newInventory.coins
    });
    
    await saveInventory(newInventory);
  }, [playerInventory, saveInventory]);

  // Spend energy
  const spendEnergy = useCallback(async (amount) => {
    const currentEnergy = playerInventory.energy || 0;
    const energyToSpend = isNaN(amount) ? 0 : Math.max(0, Math.floor(amount));
    
    if (currentEnergy >= energyToSpend) {
      const newInventory = {
        ...playerInventory,
        energy: Math.max(0, currentEnergy - energyToSpend),
        lastEnergyUpdate: Date.now(),
        gamesPlayed: Math.max(0, (playerInventory.gamesPlayed || 0) + 1)
      };
      await saveInventory(newInventory);
      return true; // Successfully spent energy
    }
    return false; // Not enough energy
  }, [playerInventory, saveInventory]);

  // Purchase energy with coins
  const purchaseEnergy = useCallback(async (energyAmount) => {
    try {
      const result = await gameDB.purchaseEnergy(energyAmount, 10); // 10 coins per energy
      setPlayerInventory(result.newPlayerData);
      return {
        success: true,
        message: `Purchased ${result.energyGained} energy for ${result.coinsSpent} coins!`,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }, []);

  // Add energy (for testing or special rewards)
  const addEnergy = useCallback(async (amount) => {
    const currentEnergy = playerInventory.energy || 0;
    const maxEnergy = playerInventory.maxEnergy || 100;
    const energyToAdd = isNaN(amount) ? 0 : Math.max(0, Math.floor(amount));
    
    const newEnergy = Math.min(currentEnergy + energyToAdd, maxEnergy);
    const newInventory = {
      ...playerInventory,
      energy: newEnergy,
      lastEnergyUpdate: Date.now()
    };
    await saveInventory(newInventory);
  }, [playerInventory, saveInventory]);

  // Reset progress (for development/testing)
  const resetProgress = useCallback(async () => {
    try {
      const freshData = await gameDB.resetToFreshStart();
      setPlayerInventory(freshData);
      setTimeUntilNextEnergy(0);
      return true;
    } catch (error) {
      console.error('Failed to reset progress:', error);
      return false;
    }
  }, []);

  // Complete reset including campaign progress
  const resetEverything = useCallback(async () => {
    try {
      await gameDB.resetEverything();
      return true;
    } catch (error) {
      console.error('Failed to reset everything:', error);
      return false;
    }
  }, []);

  // Shop functionality
  const purchaseShopItem = useCallback(async (itemId, itemPrice, itemData = {}) => {
    try {
      const result = await gameDB.purchaseShopItem(itemId, itemPrice, itemData);
      if (result.success) {
        setPlayerInventory(result.newPlayerData);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }, []);

  const getDailyDeals = useCallback(async () => {
    try {
      return await gameDB.getDailyDeals();
    } catch (error) {
      console.error('Failed to get daily deals:', error);
      return [];
    }
  }, []);

  // Fix corrupted data (NaN coins, etc.)
  const fixCorruptedData = useCallback(async () => {
    try {
      const result = await gameDB.fixCorruptedData();
      if (result.fixed) {
        setPlayerInventory(result.data);
        console.log('✅ Corrupted data fixed and inventory refreshed!');
      }
      return result;
    } catch (error) {
      console.error('Failed to fix corrupted data:', error);
      return { fixed: false, error: error.message };
    }
  }, []);

  // Theme management
  const saveSelectedTheme = useCallback(async (themeId) => {
    try {
      const success = await gameDB.saveSelectedTheme(themeId);
      if (success) {
        // Update local inventory to include the theme
        setPlayerInventory(prev => ({
          ...prev,
          selectedTheme: themeId
        }));
      }
      return success;
    } catch (error) {
      console.error('Failed to save selected theme:', error);
      return false;
    }
  }, []);

  const getSelectedTheme = useCallback(async () => {
    try {
      return await gameDB.getSelectedTheme();
    } catch (error) {
      console.error('Failed to get selected theme:', error);
      return 'default';
    }
  }, []);

  return {
    playerInventory,
    isLoading,
    timeUntilNextEnergy,
    addCoins,
    spendEnergy,
    addEnergy,
    purchaseEnergy,
    resetProgress,
    resetEverything,
    saveInventory,
    refreshPlayerData,
    purchaseShopItem,
    getDailyDeals,
    fixCorruptedData,
    saveSelectedTheme,
    getSelectedTheme
  };
};

// Custom hook for managing campaign progress
export const useCampaignProgress = () => {
  const [levelProgress, setLevelProgress] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all level progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        await gameDB.init();
        const allProgress = await gameDB.getAllLevelProgress();
        
        const progressMap = {};
        allProgress.forEach(level => {
          progressMap[level.levelId] = level;
        });
        
        setLevelProgress(progressMap);
      } catch (error) {
        console.error('Failed to load campaign progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, []);

  // Save level completion
  const completeLevelWithStars = useCallback(async (levelId, stars, coinsEarned) => {
    try {
      const progressData = {
        completed: true,
        stars: stars,
        coinsEarned: coinsEarned,
        completedAt: Date.now()
      };

      await gameDB.saveLevelProgress(levelId, progressData);
      
      setLevelProgress(prev => ({
        ...prev,
        [levelId]: { levelId, ...progressData }
      }));

      // Check for coin multiplier and apply it
      const playerData = await gameDB.getPlayerData();
      let finalCoins = coinsEarned;
      let multiplierUsed = false;

      if (playerData.coinMultiplier && playerData.coinMultiplier.active && playerData.coinMultiplier.usesRemaining > 0) {
        finalCoins = coinsEarned * playerData.coinMultiplier.multiplier;
        multiplierUsed = true;
        
        // Update coin multiplier uses
        const updatedMultiplier = {
          ...playerData.coinMultiplier,
          usesRemaining: playerData.coinMultiplier.usesRemaining - 1
        };
        
        // Remove multiplier if no uses left
        if (updatedMultiplier.usesRemaining <= 0) {
          updatedMultiplier.active = false;
        }
        
        const updatedPlayerData = {
          ...playerData,
          coins: playerData.coins + finalCoins,
          coinMultiplier: updatedMultiplier
        };
        
        await gameDB.savePlayerData(updatedPlayerData);
        
        console.log(`🎉 Coin Multiplier Applied! ${coinsEarned} → ${finalCoins} coins (${playerData.coinMultiplier.usesRemaining - 1} uses left)`);
      } else {
        // No multiplier, add coins normally
        const updatedPlayerData = {
          ...playerData,
          coins: playerData.coins + finalCoins
        };
        await gameDB.savePlayerData(updatedPlayerData);
      }

      // Dispatch coin multiplier notification if used
      if (multiplierUsed) {
        window.dispatchEvent(new CustomEvent('coinMultiplierUsed', {
          detail: { 
            originalCoins: coinsEarned, 
            finalCoins: finalCoins,
            usesLeft: playerData.coinMultiplier.usesRemaining - 1
          }
        }));
      }

      // Check if all 13 levels are now completed for completion bonus
      const currentProgress = { ...levelProgress, [levelId]: { levelId, ...progressData } };
      const allLevelsCompleted = Array.from({length: 13}, (_, i) => i + 1)
        .every(id => currentProgress[id]?.completed);
      
      console.log(`🔍 Level ${levelId} completed. All levels completed: ${allLevelsCompleted}`);
      console.log('📊 Current progress:', currentProgress);
      console.log('📊 Level completion status:', Array.from({length: 13}, (_, i) => i + 1).map(id => 
        `Level ${id}: ${currentProgress[id]?.completed ? '✅' : '❌'}`
      ));
      
      if (allLevelsCompleted) {
        console.log('🎯 ALL LEVELS COMPLETED! Checking completion bonus status...');
        
        // Check if completion bonus has already been awarded
        const completionBonusAwarded = await gameDB.getCompletionBonusStatus();
        console.log(`🎯 Completion bonus already awarded: ${completionBonusAwarded}`);
        
        if (!completionBonusAwarded) {
          console.log('💎 AWARDING COMPLETION BONUS NOW!');
          
          // Award 1000 coin completion bonus
          const currentPlayerData = await gameDB.getPlayerData();
          console.log('💰 Current player data before bonus:', currentPlayerData);
          
          const newPlayerData = {
            ...currentPlayerData,
            coins: currentPlayerData.coins + 1000,
            totalCoinsEarned: (currentPlayerData.totalCoinsEarned || 0) + 1000,
            completionBonusAwarded: true
          };
          
          await gameDB.savePlayerData(newPlayerData);
          await gameDB.markCompletionBonusAwarded();
          
          console.log('🎉 CAMPAIGN COMPLETED! Awarded 1000 coin completion bonus!');
          console.log('💰 New player data after bonus:', newPlayerData);
          
          // Trigger a global event for UI to show celebration
          console.log('🎊 Dispatching campaignCompleted event...');
          window.dispatchEvent(new CustomEvent('campaignCompleted', {
            detail: { bonusCoins: 1000, totalLevels: 13 }
          }));
          
          // Force refresh player inventory
          console.log('🔄 Dispatching forceRefreshInventory event...');
          window.dispatchEvent(new CustomEvent('forceRefreshInventory'));
          
          return { bonusAwarded: true, bonusAmount: 1000 };
        } else {
          console.log('⚠️ Completion bonus already awarded, skipping...');
        }
      } else {
        console.log('❌ Not all levels completed yet, completion bonus not triggered');
      }

      return true;
    } catch (error) {
      console.error('Failed to save level progress:', error);
      return false;
    }
  }, [levelProgress]);

  // Check if level is completed
  const isLevelCompleted = useCallback((levelId) => {
    return levelProgress[levelId]?.completed || false;
  }, [levelProgress]);

  // Get stars for level
  const getLevelStars = useCallback((levelId) => {
    return levelProgress[levelId]?.stars || 0;
  }, [levelProgress]);

  return {
    levelProgress,
    isLoading,
    completeLevelWithStars,
    isLevelCompleted,
    getLevelStars
  };
};
