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
    
    const dataToSave = {
      id: 'player_main',
      ...playerData,
      lastUpdate: Date.now()
    };

    return store.put(dataToSave);
  }

  async getPlayerData() {
    const transaction = this.db.transaction([STORE_NAMES.PLAYER_DATA], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.PLAYER_DATA);
    
    return new Promise((resolve, reject) => {
      const request = store.get('player_main');
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result);
        } else {
          // Return default player data if none exists - START FRESH
          resolve({
            id: 'player_main',
            coins: 0,
            energy: 100,
            maxEnergy: 100,
            lastEnergyUpdate: Date.now(),
            lastUpdate: Date.now()
          });
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
    const timeUntilNext = 300000 - (timeSinceLastUpdate % 300000); // 5 minutes = 300000ms
    
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
        totalCoinsEarned: 0
      };

      await this.savePlayerData(freshPlayerData);
      
      console.log('✅ Database reset to fresh start!');
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
      
      console.log('🧹 Database completely wiped clean!');
      window.location.reload(); // Force page reload to reset all state
      
      return {
        coins: 0,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: Date.now(),
        totalEnergyPurchased: 0,
        gamesPlayed: 0,
        totalCoinsEarned: 0
      };
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
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
}

// Create singleton instance
const gameDB = new GameDatabase();

export default gameDB;
