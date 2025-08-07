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

  // Initialize database and load player data
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await gameDB.init();
        const savedData = await gameDB.getPlayerData();
        
        // Regenerate energy based on time passed
        const updatedData = await gameDB.regenerateEnergy();
        
        setPlayerInventory({
          coins: updatedData.coins,
          energy: updatedData.energy,
          maxEnergy: updatedData.maxEnergy,
          lastEnergyUpdate: updatedData.lastEnergyUpdate,
          totalEnergyPurchased: updatedData.totalEnergyPurchased || 0,
          gamesPlayed: updatedData.gamesPlayed || 0,
          totalCoinsEarned: updatedData.totalCoinsEarned || 0
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
  }, []);

  // Auto-regenerate energy and update countdown
  useEffect(() => {
    const energyTimer = setInterval(async () => {
      try {
        const updatedData = await gameDB.regenerateEnergy();
        setPlayerInventory(prev => ({
          ...prev,
          energy: updatedData.energy,
          lastEnergyUpdate: updatedData.lastEnergyUpdate
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
    const newInventory = {
      ...playerInventory,
      coins: playerInventory.coins + amount,
      totalCoinsEarned: (playerInventory.totalCoinsEarned || 0) + amount
    };
    await saveInventory(newInventory);
  }, [playerInventory, saveInventory]);

  // Spend energy
  const spendEnergy = useCallback(async (amount) => {
    if (playerInventory.energy >= amount) {
      const newInventory = {
        ...playerInventory,
        energy: playerInventory.energy - amount,
        lastEnergyUpdate: Date.now(),
        gamesPlayed: (playerInventory.gamesPlayed || 0) + 1
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
    const newEnergy = Math.min(playerInventory.energy + amount, playerInventory.maxEnergy);
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
    saveInventory
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

      // Check if all 13 levels are now completed for completion bonus
      const currentProgress = { ...levelProgress, [levelId]: { levelId, ...progressData } };
      const allLevelsCompleted = Array.from({length: 13}, (_, i) => i + 1)
        .every(id => currentProgress[id]?.completed);
      
      if (allLevelsCompleted) {
        // Check if completion bonus has already been awarded
        const completionBonusAwarded = await gameDB.getCompletionBonusStatus();
        if (!completionBonusAwarded) {
          // Award 1000 coin completion bonus
          const playerData = await gameDB.getPlayerData();
          const newPlayerData = {
            ...playerData,
            coins: playerData.coins + 1000,
            totalCoinsEarned: (playerData.totalCoinsEarned || 0) + 1000,
            completionBonusAwarded: true
          };
          await gameDB.savePlayerData(newPlayerData);
          await gameDB.markCompletionBonusAwarded();
          
          console.log('🎉 CAMPAIGN COMPLETED! Awarded 1000 coin completion bonus!');
        }
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
