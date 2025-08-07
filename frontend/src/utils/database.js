// IndexedDB Database Manager for Angry Birds Chess
const DB_NAME = 'AngryBirdsChessDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  PLAYER_DATA: 'playerData',
  CAMPAIGN_PROGRESS: 'campaignProgress',
  SETTINGS: 'settings'
};

class GameDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Player Data Store (coins, energy, etc.)
        if (!db.objectStoreNames.contains(STORE_NAMES.PLAYER_DATA)) {
          const playerStore = db.createObjectStore(STORE_NAMES.PLAYER_DATA, { keyPath: 'id' });
          playerStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
        }

        // Campaign Progress Store (level completion, stars)
        if (!db.objectStoreNames.contains(STORE_NAMES.CAMPAIGN_PROGRESS)) {
          const campaignStore = db.createObjectStore(STORE_NAMES.CAMPAIGN_PROGRESS, { keyPath: 'levelId' });
          campaignStore.createIndex('completed', 'completed', { unique: false });
        }

        // Settings Store (preferences, options)
        if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
          db.createObjectStore(STORE_NAMES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  // Player Data Methods
  async savePlayerData(playerData) {
    const transaction = this.db.transaction([STORE_NAMES.PLAYER_DATA], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.PLAYER_DATA);
    
    // Sanitize data to prevent NaN values
    const sanitizedData = {
      id: 'player_main',
      ...playerData,
      // Ensure all numeric values are valid numbers
      coins: isNaN(playerData.coins) ? 0 : Math.max(0, Math.floor(playerData.coins || 0)),
      energy: isNaN(playerData.energy) ? 100 : Math.max(0, Math.floor(playerData.energy || 100)),
      maxEnergy: isNaN(playerData.maxEnergy) ? 100 : Math.max(100, Math.floor(playerData.maxEnergy || 100)),
      levelSkipTokens: isNaN(playerData.levelSkipTokens) ? 0 : Math.max(0, Math.floor(playerData.levelSkipTokens || 0)),
      totalEnergyPurchased: isNaN(playerData.totalEnergyPurchased) ? 0 : Math.max(0, Math.floor(playerData.totalEnergyPurchased || 0)),
      gamesPlayed: isNaN(playerData.gamesPlayed) ? 0 : Math.max(0, Math.floor(playerData.gamesPlayed || 0)),
      totalCoinsEarned: isNaN(playerData.totalCoinsEarned) ? 0 : Math.max(0, Math.floor(playerData.totalCoinsEarned || 0)),
      lastEnergyUpdate: playerData.lastEnergyUpdate || Date.now(),
      lastUpdate: Date.now()
    };

    console.log('💾 Saving sanitized player data:', {
      originalCoins: playerData.coins,
      sanitizedCoins: sanitizedData.coins,
      isNaN: isNaN(playerData.coins)
    });

    return store.put(sanitizedData);
  }

  async getPlayerData() {
    const transaction = this.db.transaction([STORE_NAMES.PLAYER_DATA], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.PLAYER_DATA);
    
    return new Promise((resolve, reject) => {
      const request = store.get('player_main');
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Sanitize loaded data to prevent NaN values
          const sanitizedResult = {
            ...result,
            coins: isNaN(result.coins) ? 0 : Math.max(0, Math.floor(result.coins || 0)),
            energy: isNaN(result.energy) ? 100 : Math.max(0, Math.floor(result.energy || 100)),
            maxEnergy: isNaN(result.maxEnergy) ? 100 : Math.max(100, Math.floor(result.maxEnergy || 100)),
            levelSkipTokens: isNaN(result.levelSkipTokens) ? 0 : Math.max(0, Math.floor(result.levelSkipTokens || 0)),
            totalEnergyPurchased: isNaN(result.totalEnergyPurchased) ? 0 : Math.max(0, Math.floor(result.totalEnergyPurchased || 0)),
            gamesPlayed: isNaN(result.gamesPlayed) ? 0 : Math.max(0, Math.floor(result.gamesPlayed || 0)),
            totalCoinsEarned: isNaN(result.totalCoinsEarned) ? 0 : Math.max(0, Math.floor(result.totalCoinsEarned || 0))
          };
          
          console.log('📖 Loaded and sanitized player data:', {
            originalCoins: result.coins,
            sanitizedCoins: sanitizedResult.coins,
            wasNaN: isNaN(result.coins)
          });
          
          resolve(sanitizedResult);
        } else {
          // Return default player data if none exists - START FRESH
          const defaultData = {
            id: 'player_main',
            coins: 0,
            energy: 100,
            maxEnergy: 100,
            lastEnergyUpdate: Date.now(),
            lastUpdate: Date.now(),
            totalEnergyPurchased: 0,
            gamesPlayed: 0,
            totalCoinsEarned: 0,
            levelSkipTokens: 0,
            coinMultiplier: null,
            energyRegenBoost: null,
            ownedItems: {},
            shopPurchases: {},
            completionBonusAwarded: false,
            selectedTheme: 'default'
          };
          console.log('🆕 Created fresh player data:', defaultData);
          resolve(defaultData);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Campaign Progress Methods
  async saveLevelProgress(levelId, progressData) {
    const transaction = this.db.transaction([STORE_NAMES.CAMPAIGN_PROGRESS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.CAMPAIGN_PROGRESS);
    
    const dataToSave = {
      levelId,
      ...progressData,
      lastPlayed: Date.now()
    };

    return store.put(dataToSave);
  }

  async getLevelProgress(levelId) {
    const transaction = this.db.transaction([STORE_NAMES.CAMPAIGN_PROGRESS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.CAMPAIGN_PROGRESS);
    
    return new Promise((resolve, reject) => {
      const request = store.get(levelId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllLevelProgress() {
    const transaction = this.db.transaction([STORE_NAMES.CAMPAIGN_PROGRESS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.CAMPAIGN_PROGRESS);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Energy Management
  async updateEnergy(newEnergy, maxEnergy = 100) {
    const playerData = await this.getPlayerData();
    const updatedData = {
      ...playerData,
      energy: Math.max(0, Math.min(newEnergy, maxEnergy)),
      maxEnergy,
      lastEnergyUpdate: Date.now()
    };

    await this.savePlayerData(updatedData);
    return updatedData;
  }

  async regenerateEnergy() {
    const playerData = await this.getPlayerData();
    const now = Date.now();
    const timeDiff = now - (playerData.lastEnergyUpdate || now);
    
    // Regenerate 1 energy every 5 minutes (300000ms)
    const energyToRegenerate = Math.floor(timeDiff / 300000);
    
    if (energyToRegenerate > 0 && playerData.energy < playerData.maxEnergy) {
      const newEnergy = Math.min(playerData.energy + energyToRegenerate, playerData.maxEnergy);
      return await this.updateEnergy(newEnergy, playerData.maxEnergy);
    }

    return playerData;
  }

  // Get time until next energy regeneration (in milliseconds)
  async getTimeUntilNextEnergy() {
    const playerData = await this.getPlayerData();
    if (playerData.energy >= playerData.maxEnergy) {
      return 0; // Already at max
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - (playerData.lastEnergyUpdate || now);
    
    // Check if energy regen boost is active
    let regenRate = 300000; // Default: 5 minutes (300000ms)
    if (playerData.energyRegenBoost && playerData.energyRegenBoost.active) {
      if (now < playerData.energyRegenBoost.expiresAt) {
        regenRate = playerData.energyRegenBoost.regenRate; // 30 seconds
      }
    }
    
    const timeUntilNext = regenRate - (timeSinceLastUpdate % regenRate);
    return timeUntilNext;
  }

  // Purchase energy with coins
  async purchaseEnergy(energyAmount, costPerEnergy = 10) {
    const playerData = await this.getPlayerData();
    const totalCost = energyAmount * costPerEnergy;
    
    if (playerData.coins < totalCost) {
      throw new Error(`Not enough coins! Need ${totalCost} coins.`);
    }

    if (playerData.energy >= playerData.maxEnergy) {
      throw new Error('Energy already at maximum!');
    }

    const newEnergy = Math.min(playerData.energy + energyAmount, playerData.maxEnergy);
    const actualEnergyGained = newEnergy - playerData.energy;
    const actualCost = actualEnergyGained * costPerEnergy;

    const updatedData = {
      ...playerData,
      coins: playerData.coins - actualCost,
      energy: newEnergy,
      totalEnergyPurchased: (playerData.totalEnergyPurchased || 0) + actualEnergyGained,
      lastEnergyUpdate: Date.now()
    };

    await this.savePlayerData(updatedData);
    return {
      energyGained: actualEnergyGained,
      coinsSpent: actualCost,
      newPlayerData: updatedData
    };
  }

  // Utility Methods
  async clearAllData() {
    const transaction = this.db.transaction([STORE_NAMES.PLAYER_DATA, STORE_NAMES.CAMPAIGN_PROGRESS], 'readwrite');
    
    await transaction.objectStore(STORE_NAMES.PLAYER_DATA).clear();
    await transaction.objectStore(STORE_NAMES.CAMPAIGN_PROGRESS).clear();
    
    return transaction.complete;
  }

  // Development/Testing: Reset everything to fresh start
  async resetToFreshStart() {
    try {
      // Clear all existing data
      await this.clearAllData();
      
      // Set fresh starting data
      const freshPlayerData = {
        id: 'player_main',
        coins: 0,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: Date.now(),
        lastUpdate: Date.now(),
        totalEnergyPurchased: 0,
        gamesPlayed: 0,
        totalCoinsEarned: 0,
        completionBonusAwarded: false, // Explicitly clear completion bonus flag
        levelSkipTokens: 0,
        coinMultiplier: null,
        energyRegenBoost: null,
        ownedItems: {},
        shopPurchases: {},
        selectedTheme: 'default'
      };

      await this.savePlayerData(freshPlayerData);
      
      console.log('✅ Database reset to fresh start! Completion bonus flag cleared.');
      return freshPlayerData;
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw error;
    }
  }

  // Complete database reset - clears everything including campaign progress
  async resetEverything() {
    try {
      await this.init();
      
      // Clear all object stores
      const tx = this.db.transaction(['playerData', 'campaignProgress'], 'readwrite');
      await tx.objectStore('playerData').clear();
      await tx.objectStore('campaignProgress').clear();
      await tx.done;
      
      // Reset to fresh player data with completion bonus flag cleared
      const freshPlayerData = {
        id: 'player_main',
        coins: 0,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: Date.now(),
        lastUpdate: Date.now(),
        totalEnergyPurchased: 0,
        gamesPlayed: 0,
        totalCoinsEarned: 0,
        completionBonusAwarded: false, // Explicitly clear completion bonus flag
        levelSkipTokens: 0,
        coinMultiplier: null,
        energyRegenBoost: null,
        ownedItems: {},
        shopPurchases: {},
        selectedTheme: 'default'
      };
      
      await this.savePlayerData(freshPlayerData);
      
      console.log('🧹 Database completely wiped clean! Completion bonus flag reset.');
      window.location.reload(); // Force page reload to reset all state
      
      return freshPlayerData;
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw error;
    }
  }

  // Fix corrupted player data (NaN values, etc.)
  async fixCorruptedData() {
    try {
      const playerData = await this.getPlayerData();
      console.log('🔧 Checking for corrupted data...', playerData);
      
      // Check for NaN or invalid values and fix them
      const fixedData = {
        ...playerData,
        coins: isNaN(playerData.coins) ? 0 : Math.max(0, Math.floor(playerData.coins || 0)),
        energy: isNaN(playerData.energy) ? 100 : Math.max(0, Math.floor(playerData.energy || 100)),
        maxEnergy: isNaN(playerData.maxEnergy) ? 100 : Math.max(100, Math.floor(playerData.maxEnergy || 100)),
        levelSkipTokens: isNaN(playerData.levelSkipTokens) ? 0 : Math.max(0, Math.floor(playerData.levelSkipTokens || 0)),
        totalEnergyPurchased: isNaN(playerData.totalEnergyPurchased) ? 0 : Math.max(0, Math.floor(playerData.totalEnergyPurchased || 0)),
        gamesPlayed: isNaN(playerData.gamesPlayed) ? 0 : Math.max(0, Math.floor(playerData.gamesPlayed || 0)),
        totalCoinsEarned: isNaN(playerData.totalCoinsEarned) ? 0 : Math.max(0, Math.floor(playerData.totalCoinsEarned || 0))
      };
      
      // Check if any fixes were needed
      const wasCorrupted = Object.keys(fixedData).some(key => {
        const original = playerData[key];
        const fixed = fixedData[key];
        return (typeof original === 'number' && isNaN(original)) || original !== fixed;
      });
      
      if (wasCorrupted) {
        console.log('🔧 Found corrupted data, fixing...', {
          original: playerData,
          fixed: fixedData
        });
        await this.savePlayerData(fixedData);
        console.log('✅ Data corruption fixed!');
        return { fixed: true, data: fixedData };
      } else {
        console.log('✅ No corruption found!');
        return { fixed: false, data: playerData };
      }
    } catch (error) {
      console.error('❌ Failed to fix corrupted data:', error);
      throw error;
    }
  }

  // Campaign Completion Bonus Methods
  async getCompletionBonusStatus() {
    try {
      const playerData = await this.getPlayerData();
      return playerData.completionBonusAwarded || false;
    } catch (error) {
      console.error('Failed to get completion bonus status:', error);
      return false;
    }
  }

  async markCompletionBonusAwarded() {
    try {
      const playerData = await this.getPlayerData();
      const updatedData = {
        ...playerData,
        completionBonusAwarded: true,
        completionBonusDate: Date.now()
      };
      await this.savePlayerData(updatedData);
      return true;
    } catch (error) {
      console.error('Failed to mark completion bonus awarded:', error);
      return false;
    }
  }

  // Shop System Methods
  async purchaseShopItem(itemId, itemPrice, itemData = {}) {
    try {
      const playerData = await this.getPlayerData();
      
      // Check if player has enough coins
      if (playerData.coins < itemPrice) {
        throw new Error(`Not enough coins! Need ${itemPrice} coins.`);
      }

      let updatedData = {
        ...playerData,
        coins: playerData.coins - itemPrice,
        shopPurchases: playerData.shopPurchases || {},
        ownedItems: playerData.ownedItems || {}
      };

      // Handle different item types
      switch (itemId) {
        case 'energy_refill':
          updatedData.energy = updatedData.maxEnergy;
          updatedData.lastEnergyUpdate = Date.now();
          break;
          
        case 'max_energy_upgrade':
          const currentMax = updatedData.maxEnergy || 100;
          if (currentMax >= 500) {
            throw new Error('Maximum energy capacity already reached (500)!');
          }
          updatedData.maxEnergy = Math.min(currentMax + 25, 500);
          break;
          
        case 'energy_regen_boost':
          updatedData.energyRegenBoost = {
            active: true,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            regenRate: 30000 // 30 seconds instead of 5 minutes
          };
          break;
          
        case 'level_skip':
          if (itemData.consumeToken) {
            // Consuming a token to skip a level
            if ((updatedData.levelSkipTokens || 0) <= 0) {
              throw new Error('No level skip tokens available!');
            }
            updatedData.levelSkipTokens = (updatedData.levelSkipTokens || 0) - 1;
            console.log(`🎯 Consumed level skip token. Remaining: ${updatedData.levelSkipTokens}`);
          } else {
            // Purchasing a new token
            updatedData.levelSkipTokens = (updatedData.levelSkipTokens || 0) + 1;
            console.log(`🛒 Purchased level skip token. Total: ${updatedData.levelSkipTokens}`);
          }
          break;
          
        case 'coin_multiplier':
          updatedData.coinMultiplier = {
            active: true,
            usesRemaining: 5,
            multiplier: 2
          };
          console.log(`🛒 Purchased coin multiplier. Active: true, Uses: 5`);
          break;

        case 'energy_pack_coins':
        case 'campaign_pack_coins':
          // Just deduct coins for pack purchases (items already added)
          break;
          
        default:
          // For cosmetic items and other permanent items
          updatedData.ownedItems[itemId] = {
            purchaseDate: Date.now(),
            ...itemData
          };
      }

      // Track purchase history
      updatedData.shopPurchases[itemId] = (updatedData.shopPurchases[itemId] || 0) + 1;
      
      await this.savePlayerData(updatedData);
      
      // Debug logging
      console.log(`💾 Player data saved after purchasing ${itemId}:`, {
        levelSkipTokens: updatedData.levelSkipTokens,
        coinMultiplier: updatedData.coinMultiplier,
        energyRegenBoost: updatedData.energyRegenBoost
      });
      
      return {
        success: true,
        message: `Successfully purchased item!`,
        newPlayerData: updatedData
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Get daily deals (rotates daily)
  async getDailyDeals() {
    try {
      const today = new Date().toDateString();
      const playerData = await this.getPlayerData();
      
      // Check if we have today's deals cached
      if (playerData.dailyDeals && playerData.dailyDeals.date === today) {
        return playerData.dailyDeals.deals;
      }
      
      // Generate new daily deals
      const allItems = ['energy_refill', 'max_energy_upgrade', 'energy_regen_boost', 'coin_multiplier'];
      const dailyItems = allItems.sort(() => Math.random() - 0.5).slice(0, 2);
      
      const deals = dailyItems.map(itemId => ({
        itemId,
        originalPrice: this.getItemPrice(itemId),
        discountedPrice: Math.floor(this.getItemPrice(itemId) * 0.7), // 30% off
        discount: 30
      }));
      
      // Save deals to player data
      const updatedData = {
        ...playerData,
        dailyDeals: {
          date: today,
          deals: deals
        }
      };
      
      await this.savePlayerData(updatedData);
      return deals;
    } catch (error) {
      console.error('Failed to get daily deals:', error);
      return [];
    }
  }

  // Helper method to get item prices
  getItemPrice(itemId) {
    const prices = {
      'energy_refill': 50,
      'max_energy_upgrade': 200,
      'energy_regen_boost': 150,
      'level_skip': 300,
      'coin_multiplier': 200,
      'royal_board': 500,
      'forest_theme': 400,
      'space_theme': 600
    };
    return prices[itemId] || 100;
  }

  // Enhanced energy regeneration with boost support
  async regenerateEnergyWithBoost() {
    const playerData = await this.getPlayerData();
    const now = Date.now();
    
    // Check if energy regen boost is active
    let regenRate = 300000; // Default: 5 minutes (300000ms)
    if (playerData.energyRegenBoost && playerData.energyRegenBoost.active) {
      if (now < playerData.energyRegenBoost.expiresAt) {
        regenRate = playerData.energyRegenBoost.regenRate; // 30 seconds
      } else {
        // Boost expired, remove it
        const updatedData = { ...playerData };
        delete updatedData.energyRegenBoost;
        await this.savePlayerData(updatedData);
      }
    }
    
    const timeDiff = now - (playerData.lastEnergyUpdate || now);
    const energyToRegenerate = Math.floor(timeDiff / regenRate);
    
    if (energyToRegenerate > 0 && playerData.energy < playerData.maxEnergy) {
      const newEnergy = Math.min(playerData.energy + energyToRegenerate, playerData.maxEnergy);
      return await this.updateEnergy(newEnergy, playerData.maxEnergy);
    }

    return playerData;
  }

  // Theme Management Methods
  async saveSelectedTheme(themeId) {
    try {
      const playerData = await this.getPlayerData();
      const updatedData = {
        ...playerData,
        selectedTheme: themeId
      };
      await this.savePlayerData(updatedData);
      return true;
    } catch (error) {
      console.error('Failed to save selected theme:', error);
      return false;
    }
  }

  async getSelectedTheme() {
    try {
      const playerData = await this.getPlayerData();
      return playerData.selectedTheme || 'default';
    } catch (error) {
      console.error('Failed to get selected theme:', error);
      return 'default';
    }
  }
}

// Create singleton instance
const gameDB = new GameDatabase();

export default gameDB;
