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
    totalCoinsEarned: { type: Number, default: 0 },
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

module.exports = mongoose.model('User', userSchema);
