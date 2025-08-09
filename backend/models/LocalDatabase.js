const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

class LocalDatabase {
  constructor() {
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.access(DATA_DIR);
    } catch (error) {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  }

  async findUserById(id) {
    const users = await this.loadUsers();
    return users.find(user => user._id === id);
  }

  async findUserByEmailOrUsername(identifier) {
    const users = await this.loadUsers();
    return users.find(user => 
      user.email === identifier.toLowerCase() || 
      user.username === identifier
    );
  }

  async createUser(userData) {
    const users = await this.loadUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => 
      u.email === userData.email.toLowerCase() || 
      u.username === userData.username
    );
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const newUser = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: userData.username,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      playerData: {
        coins: 0,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: new Date(),
        totalEnergyPurchased: 0,
        gamesPlayed: 0,
        totalCoinsEarned: 0,
        levelSkipTokens: 0,
        completionBonusAwarded: false,
        selectedTheme: 'default',
        coinMultiplier: {
          active: false,
          usesRemaining: 0,
          multiplier: 1
        },
        energyRegenBoost: {
          active: false,
          regenRate: 300000
        },
        ownedItems: {},
        shopPurchases: {},
        dailyDeals: {
          date: '',
          deals: []
        }
      },
      campaignProgress: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);
    await this.saveUsers(users);
    
    return newUser;
  }

  async updateUser(userId, updateData) {
    const users = await this.loadUsers();
    const userIndex = users.findIndex(user => user._id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date()
    };

    await this.saveUsers(users);
    return users[userIndex];
  }

  async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  // Energy regeneration method
  regenerateEnergy(user) {
    const now = new Date();
    const timeDiff = now - new Date(user.playerData.lastEnergyUpdate);
    
    // Check if energy regen boost is active
    let regenRate = 300000; // Default: 5 minutes
    if (user.playerData.energyRegenBoost.active && 
        now < new Date(user.playerData.energyRegenBoost.expiresAt)) {
      regenRate = user.playerData.energyRegenBoost.regenRate; // 30 seconds
    } else if (user.playerData.energyRegenBoost.active) {
      // Boost expired, deactivate it
      user.playerData.energyRegenBoost.active = false;
    }
    
    const energyToRegenerate = Math.floor(timeDiff / regenRate);
    
    if (energyToRegenerate > 0 && user.playerData.energy < user.playerData.maxEnergy) {
      const newEnergy = Math.min(user.playerData.energy + energyToRegenerate, user.playerData.maxEnergy);
      user.playerData.energy = newEnergy;
      user.playerData.lastEnergyUpdate = now;
      return true; // Energy was regenerated
    }
    
    return false; // No energy regenerated
  }

  // Get time until next energy
  getTimeUntilNextEnergy(user) {
    if (user.playerData.energy >= user.playerData.maxEnergy) {
      return 0; // Already at max
    }
    
    const now = new Date();
    const timeSinceLastUpdate = now - new Date(user.playerData.lastEnergyUpdate);
    
    // Check if energy regen boost is active
    let regenRate = 300000; // Default: 5 minutes
    if (user.playerData.energyRegenBoost.active && 
        now < new Date(user.playerData.energyRegenBoost.expiresAt)) {
      regenRate = user.playerData.energyRegenBoost.regenRate; // 30 seconds
    }
    
    const timeUntilNext = regenRate - (timeSinceLastUpdate % regenRate);
    return timeUntilNext;
  }
}

module.exports = new LocalDatabase();
