const User = require('../models/User');

// Get player data
const getPlayerData = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    return res.status(200).json({
      message: 'Player data retrieved successfully',
      playerData: req.user.playerData,
      timeUntilNextEnergy: req.user.getTimeUntilNextEnergy()
    });
  } catch (error) {
    console.error('Get player data error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while retrieving player data.' });
  }
};

// Update player data
const updatePlayerData = async (req, res) => {
  try {
    const { playerData } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!playerData) {
      return res.status(400).json({ error: 'Player data is required.' });
    }
    
    // Validate and sanitize numeric values
    const sanitizedData = {
      ...req.user.playerData.toObject(),
      ...playerData,
      coins: isNaN(playerData.coins) ? req.user.playerData.coins : Math.max(0, Math.floor(playerData.coins || 0)),
      energy: isNaN(playerData.energy) ? req.user.playerData.energy : Math.max(0, Math.floor(playerData.energy || 0)),
      maxEnergy: isNaN(playerData.maxEnergy) ? req.user.playerData.maxEnergy : Math.max(100, Math.floor(playerData.maxEnergy || 100)),
      levelSkipTokens: isNaN(playerData.levelSkipTokens) ? req.user.playerData.levelSkipTokens : Math.max(0, Math.floor(playerData.levelSkipTokens || 0)),
      totalEnergyPurchased: isNaN(playerData.totalEnergyPurchased) ? req.user.playerData.totalEnergyPurchased : Math.max(0, Math.floor(playerData.totalEnergyPurchased || 0)),
      gamesPlayed: isNaN(playerData.gamesPlayed) ? req.user.playerData.gamesPlayed : Math.max(0, Math.floor(playerData.gamesPlayed || 0)),
      totalCoinsEarned: isNaN(playerData.totalCoinsEarned) ? req.user.playerData.totalCoinsEarned : Math.max(0, Math.floor(playerData.totalCoinsEarned || 0)),
      lastEnergyUpdate: new Date()
    };

    req.user.playerData = sanitizedData;
    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Player data updated successfully',
      playerData: updatedUser.playerData
    });
  } catch (error) {
    console.error('Update player data error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while updating player data.' });
  }
};

// Spend energy
const spendEnergy = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid energy amount is required.' });
    }
    
    if (req.user.playerData.energy < amount) {
      return res.status(400).json({ error: 'Not enough energy available.' });
    }

    req.user.playerData.energy -= amount;
    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Energy spent successfully',
      newEnergy: updatedUser.playerData.energy
    });
  } catch (error) {
    console.error('Spend energy error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while spending energy.' });
  }
};

// Add coins
const addCoins = async (req, res) => {
  try {
    const { amount, multiplier = 1 } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid coin amount is required.' });
    }

    let actualAmount = amount;

    // Apply coin multiplier if active
    if (req.user.playerData.coinMultiplier.active && req.user.playerData.coinMultiplier.usesRemaining > 0) {
      actualAmount = amount * req.user.playerData.coinMultiplier.multiplier;
      req.user.playerData.coinMultiplier.usesRemaining--;
      
      if (req.user.playerData.coinMultiplier.usesRemaining <= 0) {
        req.user.playerData.coinMultiplier.active = false;
      }
    }

    req.user.playerData.coins += actualAmount;
    req.user.playerData.totalCoinsEarned += actualAmount;
    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Coins added successfully',
      coinsAdded: actualAmount,
      newTotal: updatedUser.playerData.coins,
      multiplierUsed: actualAmount !== amount
    });
  } catch (error) {
    console.error('Add coins error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while adding coins.' });
  }
};

// Purchase energy
const purchaseEnergy = async (req, res) => {
  try {
    const { energyAmount, costPerEnergy = 3 } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!energyAmount || isNaN(energyAmount) || energyAmount <= 0) {
      return res.status(400).json({ error: 'Valid energy amount is required.' });
    }

    const totalCost = energyAmount * costPerEnergy;

    if (req.user.playerData.coins < totalCost) {
      return res.status(400).json({ error: `Not enough coins! Need ${totalCost} coins.` });
    }

    if (req.user.playerData.energy >= req.user.playerData.maxEnergy) {
      return res.status(400).json({ error: 'Energy already at maximum!' });
    }

    const newEnergy = Math.min(req.user.playerData.energy + energyAmount, req.user.playerData.maxEnergy);
    const actualEnergyGained = newEnergy - req.user.playerData.energy;
    const actualCost = actualEnergyGained * costPerEnergy;

    req.user.playerData.coins -= actualCost;
    req.user.playerData.energy = newEnergy;
    req.user.playerData.totalEnergyPurchased += actualEnergyGained;
    req.user.playerData.lastEnergyUpdate = new Date();

    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Energy purchased successfully',
      energyGained: actualEnergyGained,
      coinsSpent: actualCost,
      newPlayerData: updatedUser.playerData
    });
  } catch (error) {
    console.error('Purchase energy error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while purchasing energy.' });
  }
};

// Get campaign progress
const getCampaignProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    return res.status(200).json({
      message: 'Campaign progress retrieved successfully',
      campaignProgress: req.user.campaignProgress
    });
  } catch (error) {
    console.error('Get campaign progress error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while retrieving campaign progress.' });
  }
};

// Update level progress
const updateLevelProgress = async (req, res) => {
  try {
    const { levelId, stars, bestTime } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!levelId) {
      return res.status(400).json({ error: 'Level ID is required.' });
    }

    if (stars !== undefined && (isNaN(stars) || stars < 0 || stars > 3)) {
      return res.status(400).json({ error: 'Stars must be a number between 0 and 3.' });
    }

    // Find existing progress or create new
    let levelProgress = req.user.campaignProgress.find(p => p.levelId === levelId);
    
    console.log(`🎯 Processing level ${levelId} completion:`, {
      existingProgress: levelProgress,
      stars,
      bestTime
    });
    
    if (levelProgress) {
      // Update existing progress
      levelProgress.completed = true;
      if (stars !== undefined) {
        levelProgress.stars = Math.max(levelProgress.stars, stars);
      }
      if (bestTime && (!levelProgress.bestTime || bestTime < levelProgress.bestTime)) {
        levelProgress.bestTime = bestTime;
      }
      levelProgress.lastPlayed = new Date();
    } else {
      // Create new progress
      req.user.campaignProgress.push({
        levelId,
        completed: true,
        stars: stars || 0,
        bestTime,
        lastPlayed: new Date()
      });
    }

    const updatedUser = await req.user.save();
    
    console.log(`✅ Level ${levelId} progress saved! Updated campaign progress:`, 
      updatedUser.campaignProgress.map(p => ({
        levelId: p.levelId,
        completed: p.completed,
        stars: p.stars
      }))
    );

    return res.status(200).json({
      message: 'Level progress updated successfully',
      campaignProgress: updatedUser.campaignProgress
    });
  } catch (error) {
    console.error('Update level progress error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while updating level progress.' });
  }
};

// Purchase shop item
const purchaseShopItem = async (req, res) => {
  try {
    const { itemId, itemPrice, itemData = {} } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required.' });
    }

    // Allow price to be 0 for token consumption or free items
    if (itemPrice === undefined || itemPrice === null || isNaN(itemPrice) || itemPrice < 0) {
      return res.status(400).json({ error: 'Valid item price is required.' });
    }

    // Check if player has enough coins
    if (req.user.playerData.coins < itemPrice) {
      return res.status(400).json({ error: `Not enough coins! Need ${itemPrice} coins.` });
    }

    // Process different item types
    let updatedData = req.user.playerData;
    updatedData.coins -= itemPrice;

    switch (itemId) {
      case 'energy_refill':
        updatedData.energy = updatedData.maxEnergy;
        updatedData.lastEnergyUpdate = new Date();
        break;
        
      case 'max_energy_upgrade':
        if (updatedData.maxEnergy >= 500) {
          return res.status(400).json({ error: 'Maximum energy capacity already reached (500)!' });
        }
        updatedData.maxEnergy = Math.min(updatedData.maxEnergy + 25, 500);
        break;
        
      case 'energy_regen_boost':
        updatedData.energyRegenBoost = {
          active: true,
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
          regenRate: 30000 // 30 seconds
        };
        break;
        
      case 'level_skip':
        if (itemData.consumeToken) {
          if (updatedData.levelSkipTokens <= 0) {
            return res.status(400).json({ error: 'No level skip tokens available!' });
          }
          updatedData.levelSkipTokens--;
        } else {
          updatedData.levelSkipTokens++;
        }
        break;
        
      case 'coin_multiplier':
        updatedData.coinMultiplier = {
          active: true,
          usesRemaining: 5,
          multiplier: 2
        };
        break;

      default:
        // For cosmetic items and other permanent items
        if (!updatedData.ownedItems) {
          updatedData.ownedItems = new Map();
        }
        updatedData.ownedItems.set(itemId, {
          purchaseDate: new Date(),
          ...itemData
        });
    }

    // Track purchase history
    if (!updatedData.shopPurchases) {
      updatedData.shopPurchases = new Map();
    }
    const currentCount = updatedData.shopPurchases.get(itemId) || 0;
    updatedData.shopPurchases.set(itemId, currentCount + 1);

    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Item purchased successfully',
      newPlayerData: updatedUser.playerData
    });
  } catch (error) {
    console.error('Shop purchase error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while purchasing item.' });
  }
};

// Complete level with stars and coins
const completeLevelWithStars = async (req, res) => {
  try {
    console.log('🎯🎯🎯 LEVEL COMPLETION REQUEST RECEIVED! 🎯🎯🎯');
    console.log('📦 Request body:', req.body);
    console.log('🔐 User authenticated:', !!req.user);
    console.log('👤 User ID:', req.user?._id);
    
    const { levelId, stars, bestTime, coinsEarned } = req.body;

    if (!req.user) {
      console.log('❌ NO USER AUTHENTICATED');
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!levelId) {
      console.log('❌ NO LEVEL ID PROVIDED');
      return res.status(400).json({ error: 'Level ID is required.' });
    }

    // Validate and sanitize inputs
    const sanitizedLevelId = String(levelId);
    const sanitizedStars = Math.max(0, Math.min(3, Number(stars) || 0));
    const sanitizedCoinsEarned = Math.max(0, Number(coinsEarned) || 0);
    const sanitizedBestTime = bestTime ? Number(bestTime) : null;

    console.log(`🎯 completeLevelWithStars: Processing levelId=${sanitizedLevelId}, stars=${sanitizedStars}, coinsEarned=${sanitizedCoinsEarned}, bestTime=${sanitizedBestTime}`);
    console.log(`📊 Current campaign progress length: ${req.user.campaignProgress.length}`);

    // Find existing progress or create new
    // Convert both to strings for comparison to handle type mismatch
    let levelProgress = req.user.campaignProgress.find(p => {
      const storedLevelIdStr = String(p.levelId);
      console.log(`🔍 Comparing stored levelId: "${storedLevelIdStr}" with incoming: "${sanitizedLevelId}"`);
      return storedLevelIdStr === sanitizedLevelId;
    });
    
    if (levelProgress) {
      console.log('✅ FOUND EXISTING LEVEL PROGRESS - UPDATING');
      console.log('🔍 Before update:', {
        levelId: levelProgress.levelId,
        completed: levelProgress.completed,
        stars: levelProgress.stars
      });
      
      // Update existing progress
      levelProgress.completed = true;
      if (sanitizedStars > 0) {
        levelProgress.stars = Math.max(levelProgress.stars, sanitizedStars);
      }
      if (sanitizedBestTime && (!levelProgress.bestTime || sanitizedBestTime < levelProgress.bestTime)) {
        levelProgress.bestTime = sanitizedBestTime;
      }
      levelProgress.lastPlayed = new Date();
      
      console.log('🔍 After update:', {
        levelId: levelProgress.levelId,
        completed: levelProgress.completed,
        stars: levelProgress.stars
      });
      
      // Mark the path as modified to ensure Mongoose saves it
      req.user.markModified('campaignProgress');
      console.log('✅ Marked campaignProgress as modified');
    } else {
      // Create new progress in completeLevelWithStars
      console.log(`➕ completeLevelWithStars: Creating new progress entry for levelId: ${sanitizedLevelId}`);
      console.log('🆕 CREATING NEW LEVEL PROGRESS ENTRY');
      
      const newProgressEntry = {
        levelId: sanitizedLevelId,
        completed: true,
        stars: sanitizedStars,
        bestTime: sanitizedBestTime,
        lastPlayed: new Date()
      };
      
      console.log('🔍 New progress entry:', newProgressEntry);
      
      req.user.campaignProgress.push(newProgressEntry);
      console.log(`📈 Campaign progress array now has ${req.user.campaignProgress.length} entries`);
      
      // Mark the path as modified to ensure Mongoose saves it
      req.user.markModified('campaignProgress');
      console.log('✅ Marked campaignProgress as modified for new entry');
      
      // Additional verification that the entry was added
      const addedEntry = req.user.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId);
      console.log('🔍 Verification - entry added to array:', addedEntry);
    }

    // Add coins if provided
    if (sanitizedCoinsEarned > 0) {
      let actualAmount = sanitizedCoinsEarned;

      // Apply coin multiplier if active
      if (req.user.playerData.coinMultiplier.active && req.user.playerData.coinMultiplier.usesRemaining > 0) {
        actualAmount = coinsEarned * req.user.playerData.coinMultiplier.multiplier;
        req.user.playerData.coinMultiplier.usesRemaining--;
        
        if (req.user.playerData.coinMultiplier.usesRemaining <= 0) {
          req.user.playerData.coinMultiplier.active = false;
        }
      }

      req.user.playerData.coins += actualAmount;
      req.user.playerData.totalCoinsEarned += actualAmount;
      
      console.log(`💰 Added ${actualAmount} coins (${sanitizedCoinsEarned} base + multiplier)`);
    }

    console.log('🔄 ATTEMPTING TO SAVE USER TO DATABASE...');
    console.log(`🔄 User ID: ${req.user._id}`);
    console.log(`🔄 Campaign progress before save:`, req.user.campaignProgress.map(p => ({
      levelId: p.levelId,
      completed: p.completed,
      stars: p.stars
    })));

    try {
      const updatedUser = await req.user.save();
      
      console.log(`✅ USER SAVED SUCCESSFULLY!`);
      console.log(`✅ Level ${sanitizedLevelId} completed with ${sanitizedStars} stars and ${sanitizedCoinsEarned} coins!`);
      console.log(`📊 Updated progress count: ${updatedUser.campaignProgress.length}`);
      console.log(`📊 Updated progress for this level:`, updatedUser.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId));
      console.log(`📊 All campaign progress:`, updatedUser.campaignProgress.map(p => ({
        levelId: p.levelId,
        completed: p.completed,
        stars: p.stars
      })));

      // CRITICAL: Re-query the database to verify the save actually persisted
      console.log('🔍 VERIFYING DATABASE PERSISTENCE...');
      const User = require('../models/User');
      const freshUser = await User.findById(req.user._id);
      const persistedProgress = freshUser.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId);
      
      if (persistedProgress && persistedProgress.completed) {
        console.log('✅ VERIFIED: Level progress persisted in database!', persistedProgress);
      } else {
        console.error('❌ CRITICAL: Level progress NOT found in database after save!');
        console.error('❌ Fresh user progress:', freshUser.campaignProgress.map(p => ({
          levelId: p.levelId,
          completed: p.completed,
          stars: p.stars
        })));
      }

      return res.status(200).json({
        message: 'Level completed successfully',
        campaignProgress: updatedUser.campaignProgress,
        playerData: updatedUser.playerData,
        coinsAdded: sanitizedCoinsEarned,
        verified: !!persistedProgress
      });
    } catch (saveError) {
      console.error('❌ CRITICAL ERROR: Failed to save user to database!');
      console.error('❌ Save error details:', {
        message: saveError.message,
        stack: saveError.stack,
        name: saveError.name,
        code: saveError.code
      });
      console.error('❌ User object at time of save error:', {
        userId: req.user._id,
        campaignProgressLength: req.user.campaignProgress.length,
        isModified: req.user.isModified(),
        modifiedPaths: req.user.modifiedPaths()
      });
      
      return res.status(500).json({ 
        error: 'Database save failed', 
        details: saveError.message,
        code: 'SAVE_ERROR'
      });
    }
  } catch (error) {
    console.error('Complete level with stars error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while completing level.' });
  }
};

// Skip level using a level skip token
const skipLevel = async (req, res) => {
  try {
    console.log('🚀🚀🚀 LEVEL SKIP REQUEST RECEIVED! 🚀🚀🚀');
    console.log('📦 Request body:', req.body);
    console.log('🔐 User authenticated:', !!req.user);
    console.log('👤 User ID:', req.user?._id);
    
    const { levelId, coinsEarned } = req.body;

    if (!req.user) {
      console.log('❌ NO USER AUTHENTICATED');
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!levelId) {
      console.log('❌ NO LEVEL ID PROVIDED');
      return res.status(400).json({ error: 'Level ID is required.' });
    }

    // Check if user has level skip tokens
    if (!req.user.playerData.levelSkipTokens || req.user.playerData.levelSkipTokens <= 0) {
      console.log('❌ NO LEVEL SKIP TOKENS AVAILABLE');
      return res.status(400).json({ error: 'No level skip tokens available.' });
    }

    // Validate and sanitize inputs
    const sanitizedLevelId = String(levelId);
    const sanitizedCoinsEarned = Math.max(0, Number(coinsEarned) || 0);

    console.log(`🚀 skipLevel: Processing levelId=${sanitizedLevelId}, coinsEarned=${sanitizedCoinsEarned}`);
    console.log(`🎟️ Current skip tokens: ${req.user.playerData.levelSkipTokens}`);

    // Check if level is already completed
    const existingProgress = req.user.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId);
    if (existingProgress && existingProgress.completed) {
      console.log('❌ LEVEL ALREADY COMPLETED');
      return res.status(400).json({ error: 'Level is already completed.' });
    }

    // Consume the level skip token
    req.user.playerData.levelSkipTokens--;
    console.log(`🎟️ Consumed skip token. Remaining: ${req.user.playerData.levelSkipTokens}`);

    // Complete the level with 1 star (skip level always gives 1 star)
    let levelProgress = req.user.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId);
    
    if (levelProgress) {
      console.log('✅ UPDATING EXISTING LEVEL PROGRESS FOR SKIP');
      levelProgress.completed = true;
      levelProgress.stars = Math.max(levelProgress.stars, 1); // Skip always gives at least 1 star
      levelProgress.lastPlayed = new Date();
      levelProgress.skipped = true; // Mark as skipped
      req.user.markModified('campaignProgress');
    } else {
      console.log('🆕 CREATING NEW LEVEL PROGRESS FOR SKIP');
      const newProgressEntry = {
        levelId: sanitizedLevelId,
        completed: true,
        stars: 1, // Skip always gives 1 star
        lastPlayed: new Date(),
        skipped: true // Mark as skipped
      };
      
      req.user.campaignProgress.push(newProgressEntry);
      req.user.markModified('campaignProgress');
    }

    // Add coins if provided
    if (sanitizedCoinsEarned > 0) {
      let actualAmount = sanitizedCoinsEarned;

      // Apply coin multiplier if active
      if (req.user.playerData.coinMultiplier.active && req.user.playerData.coinMultiplier.usesRemaining > 0) {
        actualAmount = sanitizedCoinsEarned * req.user.playerData.coinMultiplier.multiplier;
        req.user.playerData.coinMultiplier.usesRemaining--;
        
        if (req.user.playerData.coinMultiplier.usesRemaining <= 0) {
          req.user.playerData.coinMultiplier.active = false;
        }
      }

      req.user.playerData.coins += actualAmount;
      req.user.playerData.totalCoinsEarned += actualAmount;
      
      console.log(`💰 Added ${actualAmount} coins from skip (${sanitizedCoinsEarned} base + multiplier)`);
    }

    console.log('🔄 ATTEMPTING TO SAVE USER TO DATABASE...');
    
    try {
      const updatedUser = await req.user.save();
      
      console.log(`✅ LEVEL SKIP SAVED SUCCESSFULLY!`);
      console.log(`🚀 Level ${sanitizedLevelId} skipped with 1 star and ${sanitizedCoinsEarned} coins!`);
      console.log(`🎟️ Remaining skip tokens: ${updatedUser.playerData.levelSkipTokens}`);
      
      // Verify the skip was saved
      const skippedProgress = updatedUser.campaignProgress.find(p => String(p.levelId) === sanitizedLevelId);
      console.log('🔍 Skip verification:', skippedProgress);

      return res.status(200).json({
        message: 'Level skipped successfully',
        campaignProgress: updatedUser.campaignProgress,
        playerData: updatedUser.playerData,
        coinsAdded: sanitizedCoinsEarned,
        tokensRemaining: updatedUser.playerData.levelSkipTokens,
        skippedLevel: skippedProgress
      });
    } catch (saveError) {
      console.error('❌ CRITICAL ERROR: Failed to save level skip!');
      console.error('❌ Save error details:', saveError);
      
      return res.status(500).json({ 
        error: 'Database save failed during level skip', 
        details: saveError.message,
        code: 'SKIP_SAVE_ERROR'
      });
    }
  } catch (error) {
    console.error('Skip level error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while skipping level.' });
  }
};

// Reset progress
const resetProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Reset player data to initial state
    req.user.playerData = {
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
      ownedItems: new Map(),
      shopPurchases: new Map(),
      dailyDeals: {
        date: '',
        deals: []
      }
    };

    // Clear campaign progress
    req.user.campaignProgress = [];

    const updatedUser = await req.user.save();

    return res.status(200).json({
      message: 'Progress reset successfully',
      playerData: updatedUser.playerData
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while resetting progress.' });
  }
};

module.exports = {
  getPlayerData,
  updatePlayerData,
  spendEnergy,
  addCoins,
  purchaseEnergy,
  getCampaignProgress,
  updateLevelProgress,
  completeLevelWithStars,
  purchaseShopItem,
  skipLevel,
  resetProgress
};
