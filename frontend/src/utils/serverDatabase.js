// Server-based Database Manager for Angry Birds Chess
import apiService from '../services/apiService';

class ServerGameDatabase {
  constructor() {
    this.isOnline = true;
  }

  async checkConnection() {
    try {
      this.isOnline = await apiService.checkConnection();
    } catch (error) {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  async init() {
    // No initialization needed for server-based storage
    return Promise.resolve(true);
  }

  // Player Data Methods
  async savePlayerData(playerData) {
    try {
      const response = await apiService.updatePlayerData(playerData);
      console.log('💾 Player data saved to server successfully');
      return response.playerData;
    } catch (error) {
      console.error('❌ Failed to save player data to server:', error);
      throw error;
    }
  }

  async getPlayerData() {
    try {
      const response = await apiService.getPlayerData();
      console.log('📖 Player data loaded from server');
      return response.playerData;
    } catch (error) {
      console.error('❌ Failed to load player data from server:', error);
      // Return default player data if server fails
      return this.getDefaultPlayerData();
    }
  }

  getDefaultPlayerData() {
    return {
      coins: 0,
      energy: 100,
      maxEnergy: 100,
      lastEnergyUpdate: Date.now(),
      totalEnergyPurchased: 0,
      gamesPlayed: 0,
      totalCoinsEarned: 0,
      levelSkipTokens: 0,
      coinMultiplier: {
        active: false,
        multiplier: 2,
        usesRemaining: 0
      },
      energyRegenBoost: {
        active: false,
        expiresAt: 0,
        regenRate: 30000
      },
      ownedItems: {},
      shopPurchases: {},
      completionBonusAwarded: false,
      selectedTheme: 'default',
      dailyDeals: {
        date: null,
        deals: []
      }
    };
  }

  // Campaign Progress Methods
  async completeLevelWithStars(levelId, stars, coinsEarned, bestTime = null) {
    try {
      const response = await apiService.completeLevelWithStars(levelId, stars, coinsEarned, bestTime);
      console.log(`🏆 Level ${levelId} completed with ${stars} stars, ${coinsEarned} coins earned`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to complete level ${levelId}:`, error);
      throw error;
    }
  }

  async skipLevel(levelId, coinsEarned) {
    try {
      const response = await apiService.skipLevel(levelId, coinsEarned);
      console.log(`🚀 Level ${levelId} skipped, ${coinsEarned} coins earned`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to skip level ${levelId}:`, error);
      throw error;
    }
  }

  async saveLevelProgress(levelId, progressData) {
    try {
      const response = await apiService.saveLevelProgress(levelId, progressData);
      console.log(`💾 Progress saved for level ${levelId}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to save progress for level ${levelId}:`, error);
      throw error;
    }
  }

  async getLevelProgress(levelId) {
    try {
      const response = await apiService.getLevelProgress(levelId);
      return response.progress;
    } catch (error) {
      console.error(`❌ Failed to get progress for level ${levelId}:`, error);
      return null;
    }
  }

  async getAllLevelProgress() {
    try {
      const response = await apiService.getCampaignProgress();
      return response.campaignProgress || [];
    } catch (error) {
      console.error('❌ Failed to get all level progress:', error);
      return [];
    }
  }

  // Energy Management
  async updateEnergy(newEnergy, maxEnergy = 100) {
    try {
      const playerData = await this.getPlayerData();
      const updatedData = {
        ...playerData,
        energy: Math.max(0, Math.min(newEnergy, maxEnergy)),
        maxEnergy,
        lastEnergyUpdate: Date.now()
      };
      return await this.savePlayerData(updatedData);
    } catch (error) {
      console.error('❌ Failed to update energy:', error);
      throw error;
    }
  }

  async regenerateEnergy() {
    try {
      const response = await apiService.getPlayerData();
      return response.playerData;
    } catch (error) {
      console.error('❌ Failed to regenerate energy:', error);
      return false;
    }
  }

  async getTimeUntilNextEnergy() {
    try {
      const response = await apiService.getPlayerData();
      return response.timeUntilNextEnergy || 0;
    } catch (error) {
      console.error('❌ Failed to get time until next energy:', error);
      return 0;
    }
  }

  // Purchase energy with coins
  async purchaseEnergy(energyAmount, costPerEnergy = 3) {
    try {
      const response = await apiService.purchaseEnergy(energyAmount, costPerEnergy);
      console.log(`⚡ Purchased ${response.energyGained} energy for ${response.coinsSpent} coins`);
      return response.newPlayerData;
    } catch (error) {
      console.error('❌ Failed to purchase energy:', error);
      throw error;
    }
  }

  // Energy spending
  async spendEnergy(amount) {
    try {
      const response = await apiService.spendEnergy(amount);
      console.log(`⚡ Spent ${amount} energy`);
      return response.newEnergy;
    } catch (error) {
      console.error('❌ Failed to spend energy:', error);
      return false;
    }
  }

  // Coin management
  async addCoins(amount, multiplier = 1) {
    try {
      const response = await apiService.addCoins(amount, multiplier);
      console.log(`💰 Added ${response.coinsAdded} coins (multiplier: ${response.multiplierUsed ? 'YES' : 'NO'})`);
      return response.newTotal;
    } catch (error) {
      console.error('❌ Failed to add coins:', error);
      return false;
    }
  }

  // Utility Methods
  async clearAllData() {
    try {
      // This would need a specific API endpoint to clear all user data
      console.log('⚠️ Clear all data not implemented for server database');
      return false;
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      return false;
    }
  }

  async resetToFreshStart() {
    try {
      // This would need a specific API endpoint to reset user data
      console.log('⚠️ Reset to fresh start not implemented for server database');
      return false;
    } catch (error) {
      console.error('❌ Failed to reset to fresh start:', error);
      return false;
    }
  }

  async resetEverything() {
    try {
      // This would need a specific API endpoint to reset everything
      console.log('⚠️ Reset everything not implemented for server database');
      return false;
    } catch (error) {
      console.error('❌ Failed to reset everything:', error);
      return false;
    }
  }

  async fixCorruptedData() {
    try {
      // Server handles data integrity
      console.log('✅ Server database handles data integrity automatically');
      return { fixed: false, data: await this.getPlayerData() };
    } catch (error) {
      console.error('❌ Failed to check corrupted data:', error);
      throw error;
    }
  }

  // Shop System Methods
  async purchaseShopItem(itemId, itemPrice, itemData = {}) {
    try {
      const response = await apiService.purchaseShopItem(itemId, itemPrice, itemData);
      console.log(`🛒 Purchased ${itemId} for ${itemPrice} coins`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to purchase ${itemId}:`, error);
      throw error;
    }
  }

  // Daily deals
  async getDailyDeals() {
    try {
      const response = await apiService.getDailyDeals();
      return response.deals || [];
    } catch (error) {
      console.error('❌ Failed to get daily deals:', error);
      return [];
    }
  }

  // Get daily deals based on current date
  generateDailyDeals() {
    const today = new Date().toDateString();
    
    // Simple rotation based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const dealIndex = dayOfYear % 7; // 7 different deal rotations
    
    const allPossibleDeals = [
      { id: 'energy_refill', discount: 0.3 },
      { id: 'max_energy_upgrade', discount: 0.25 },
      { id: 'energy_regen_boost', discount: 0.4 },
      { id: 'level_skip', discount: 0.33 },
      { id: 'coin_multiplier', discount: 0.2 }
    ];

    const deals = [
      {
        ...allPossibleDeals[dealIndex % allPossibleDeals.length],
        available: true,
        category: 'energy'
      },
      {
        ...allPossibleDeals[(dealIndex + 2) % allPossibleDeals.length],
        available: true,
        category: 'utility'
      }
    ];

    return { date: today, deals };
  }

  // Theme Management
  async saveSelectedTheme(themeId) {
    try {
      const playerData = await this.getPlayerData();
      const updatedData = {
        ...playerData,
        selectedTheme: themeId
      };
      await this.savePlayerData(updatedData);
      console.log(`🎨 Theme changed to: ${themeId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save selected theme:', error);
      return false;
    }
  }

  async getSelectedTheme() {
    try {
      const playerData = await this.getPlayerData();
      return playerData.selectedTheme || 'default';
    } catch (error) {
      console.error('❌ Failed to get selected theme:', error);
      return 'default';
    }
  }

  // Connection status
  isConnected() {
    return this.isOnline;
  }
}

// Create singleton instance
const serverGameDB = new ServerGameDatabase();

export default serverGameDB;
