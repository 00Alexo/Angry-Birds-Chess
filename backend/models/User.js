const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot be more than 20 characters long'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  playerData: {
    coins: { type: Number, default: 0 },
    energy: { type: Number, default: 100 },
    maxEnergy: { type: Number, default: 100 },
    lastEnergyUpdate: { type: Date, default: Date.now },
    totalEnergyPurchased: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    gamesDrawn: { type: Number, default: 0 },
    longestWinStreak: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    totalPlayTime: { type: Number, default: 0 }, // in milliseconds
    totalCoinsEarned: { type: Number, default: 0 },
    levelsCompleted: { type: Number, default: 0 },
    levelSkipTokens: { type: Number, default: 0 },
    completionBonusAwarded: { type: Boolean, default: false },
    selectedTheme: { type: String, default: 'default' },
    coinMultiplier: {
      active: { type: Boolean, default: false },
      usesRemaining: { type: Number, default: 0 },
      multiplier: { type: Number, default: 1 }
    },
    energyRegenBoost: {
      active: { type: Boolean, default: false },
      expiresAt: { type: Date },
      regenRate: { type: Number, default: 300000 } // 5 minutes in milliseconds
    },
    ownedItems: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    shopPurchases: { type: Map, of: Number, default: {} },
    dailyDeals: {
      date: String,
      deals: [mongoose.Schema.Types.Mixed]
    }
  },
  gameHistory: [{
    gameId: { type: String, required: true },
    gameType: { type: String, enum: ['campaign', 'vs-ai', 'vs-player'], required: true },
    opponent: { type: String }, // AI difficulty or player username
    result: { type: String, enum: ['win', 'loss', 'draw', 'in-progress'], required: true },
    duration: { type: Number }, // game duration in milliseconds
    movesPlayed: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    energySpent: { type: Number, default: 1 },
    levelId: { type: String }, // for campaign games
    stars: { type: Number, min: 0, max: 3 }, // for campaign games
    playerColor: { type: String, enum: ['white', 'black'] },
    endReason: { type: String }, // 'checkmate', 'timeout', 'resignation', 'draw-agreement', etc.
    createdAt: { type: Date, default: Date.now }
  }],
  campaignProgress: [{
    levelId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    stars: { type: Number, default: 0, min: 0, max: 3 },
    bestTime: Number,
    lastPlayed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to regenerate energy
userSchema.methods.regenerateEnergy = function() {
  const now = new Date();
  const timeDiff = now - this.playerData.lastEnergyUpdate;
  
  // Check if energy regen boost is active
  let regenRate = 300000; // Default: 5 minutes
  if (this.playerData.energyRegenBoost.active && now < this.playerData.energyRegenBoost.expiresAt) {
    regenRate = this.playerData.energyRegenBoost.regenRate; // 30 seconds
  } else if (this.playerData.energyRegenBoost.active) {
    // Boost expired, deactivate it
    this.playerData.energyRegenBoost.active = false;
  }
  
  const energyToRegenerate = Math.floor(timeDiff / regenRate);
  
  if (energyToRegenerate > 0 && this.playerData.energy < this.playerData.maxEnergy) {
    const newEnergy = Math.min(this.playerData.energy + energyToRegenerate, this.playerData.maxEnergy);
    this.playerData.energy = newEnergy;
    this.playerData.lastEnergyUpdate = now;
    return true; // Energy was regenerated
  }
  
  return false; // No energy regenerated
};

// Instance method to get time until next energy
userSchema.methods.getTimeUntilNextEnergy = function() {
  if (this.playerData.energy >= this.playerData.maxEnergy) {
    return 0; // Already at max
  }
  
  const now = new Date();
  const timeSinceLastUpdate = now - this.playerData.lastEnergyUpdate;
  
  // Check if energy regen boost is active
  let regenRate = 300000; // Default: 5 minutes
  if (this.playerData.energyRegenBoost.active && now < this.playerData.energyRegenBoost.expiresAt) {
    regenRate = this.playerData.energyRegenBoost.regenRate; // 30 seconds
  }
  
  const timeUntilNext = regenRate - (timeSinceLastUpdate % regenRate);
  return timeUntilNext;
};

// Instance method to record a game result and update statistics
userSchema.methods.recordGameResult = function(gameData) {
  const {
    gameId,
    gameType,
    opponent,
    result,
    duration,
    movesPlayed = 0,
    coinsEarned = 0,
    energySpent = 1,
    levelId,
    stars,
    playerColor,
    endReason
  } = gameData;

  // Add to game history
  this.gameHistory.push({
    gameId: gameId || new Date().getTime().toString(),
    gameType,
    opponent,
    result,
    duration,
    movesPlayed,
    coinsEarned,
    energySpent,
    levelId,
    stars,
    playerColor,
    endReason,
    createdAt: new Date()
  });

  // Update statistics
  this.playerData.gamesPlayed++;
  
  if (result === 'win') {
    this.playerData.gamesWon++;
    this.playerData.currentWinStreak++;
    this.playerData.longestWinStreak = Math.max(this.playerData.longestWinStreak, this.playerData.currentWinStreak);
  } else if (result === 'loss') {
    this.playerData.gamesLost++;
    this.playerData.currentWinStreak = 0;
  } else if (result === 'draw') {
    this.playerData.gamesDrawn++;
    this.playerData.currentWinStreak = 0;
  }

  if (duration) {
    this.playerData.totalPlayTime += duration;
  }

  if (coinsEarned > 0) {
    this.playerData.coins += coinsEarned;
    this.playerData.totalCoinsEarned += coinsEarned;
  }

  if (energySpent > 0) {
    this.playerData.energy = Math.max(0, this.playerData.energy - energySpent);
  }

  return this;
};

// Instance method to get formatted game statistics
userSchema.methods.getGameStats = function() {
  // Filter out in-progress games from statistics
  const completedGames = this.gameHistory.filter(game => game.result !== 'in-progress');
  const inProgressGames = this.gameHistory.filter(game => game.result === 'in-progress');

  const stats = {
    gamesPlayed: this.playerData.gamesPlayed,
    gamesWon: this.playerData.gamesWon,
    gamesLost: this.playerData.gamesLost,
    gamesDrawn: this.playerData.gamesDrawn,
    inProgressGames: inProgressGames.length,
    completedGames: completedGames.length,
    winRate: this.playerData.gamesPlayed > 0 ? Math.round((this.playerData.gamesWon / this.playerData.gamesPlayed) * 100) : 0,
    currentWinStreak: this.playerData.currentWinStreak,
    longestWinStreak: this.playerData.longestWinStreak,
    totalPlayTime: this.formatPlayTime(this.playerData.totalPlayTime),
    averageGameLength: this.getAverageGameLength(),
    favoriteOpening: 'N/A', // TODO: Implement opening detection
    totalCoinsEarned: this.playerData.totalCoinsEarned,
    levelsCompleted: this.playerData.levelsCompleted
  };

  return stats;
};

// Helper method to format play time
userSchema.methods.formatPlayTime = function(milliseconds) {
  if (!milliseconds || milliseconds === 0) return 'N/A';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '< 1m';
  }
};

// Helper method to get average game length
userSchema.methods.getAverageGameLength = function() {
  const gamesWithDuration = this.gameHistory.filter(game => 
    game.duration && 
    game.duration > 0 && 
    game.result !== 'in-progress' // Only consider completed games
  );
  
  if (gamesWithDuration.length === 0) return 'N/A';
  
  const totalDuration = gamesWithDuration.reduce((sum, game) => sum + game.duration, 0);
  const averageDuration = totalDuration / gamesWithDuration.length;
  
  return this.formatPlayTime(averageDuration);
};

module.exports = mongoose.model('User', userSchema);
