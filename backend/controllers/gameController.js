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

    if (!levelId || levelId === 'undefined' || levelId === null) {
      console.log('❌ INVALID LEVEL ID PROVIDED:', levelId);
      return res.status(400).json({ error: 'Valid level ID is required for campaign progress.' });
    }

    // Only process valid campaign level IDs (not undefined, null, or non-campaign games)
    const levelIdStr = String(levelId);
    if (levelIdStr === 'undefined' || levelIdStr === 'null') {
      console.log('❌ IGNORING NON-CAMPAIGN GAME - levelId is undefined/null');
      return res.status(400).json({ error: 'This endpoint is only for campaign levels. Non-campaign games should not call this endpoint.' });
    }

    // Validate and sanitize inputs
    const sanitizedLevelId = String(levelId);
    const sanitizedStars = Math.max(0, Math.min(3, Number(stars) || 0));
    const sanitizedCoinsEarned = Math.max(0, Number(coinsEarned) || 0);
    const sanitizedBestTime = bestTime ? Number(bestTime) : null;

    console.log(`🎯 completeLevelWithStars: Processing levelId=${sanitizedLevelId}, stars=${sanitizedStars}, coinsEarned=${sanitizedCoinsEarned}, bestTime=${sanitizedBestTime}`);
    
    // Find if there's an in-progress game for this user that should be ended
    const activeGame = req.user.gameHistory.find(game => 
      game.result === 'in-progress' && 
      String(game.levelId) === sanitizedLevelId
    );
    
    if (activeGame) {
      console.log(`🎮 Found active game ${activeGame.gameId} for level ${sanitizedLevelId} - ending it as part of level completion`);
      
      // End the active game as a win
      activeGame.result = 'win';
      activeGame.duration = activeGame.createdAt ? Date.now() - new Date(activeGame.createdAt).getTime() : null;
      activeGame.movesPlayed = activeGame.movesPlayed || 0;
      activeGame.coinsEarned = sanitizedCoinsEarned;
      activeGame.playerColor = activeGame.playerColor || 'white';
      activeGame.endReason = 'level-completed';
      activeGame.stars = sanitizedStars;
      
      // Update game statistics
      req.user.playerData.gamesWon++;
      req.user.playerData.currentWinStreak++;
      req.user.playerData.longestWinStreak = Math.max(
        req.user.playerData.longestWinStreak, 
        req.user.playerData.currentWinStreak
      );
      
      // Add duration to total play time
      if (activeGame.duration) {
        req.user.playerData.totalPlayTime += activeGame.duration;
      }
      
      req.user.markModified('gameHistory');
      console.log(`✅ Game ${activeGame.gameId} ended as win with level completion`);
    } else {
      // No active game found - create a new game history entry for this campaign level completion
      console.log(`🎮 No active game found for level ${sanitizedLevelId} - creating new game history entry`);
      
      const gameId = `campaign_${req.user._id}_${sanitizedLevelId}_${Date.now()}`;
      const newGameEntry = {
        gameId,
        gameType: 'campaign',
        opponent: `Level ${sanitizedLevelId}`,
        result: 'win',
        duration: sanitizedBestTime || null,
        movesPlayed: 0,
        coinsEarned: sanitizedCoinsEarned,
        energySpent: 1,
        levelId: sanitizedLevelId,
        stars: sanitizedStars,
        playerColor: 'white',
        endReason: 'level-completed',
        createdAt: new Date()
      };
      
      req.user.gameHistory.push(newGameEntry);
  // Since there was no 'startGame' call, ensure gamesPlayed is incremented as this is a full game completion
  req.user.playerData.gamesPlayed = (req.user.playerData.gamesPlayed || 0) + 1;
      // Update game statistics
      req.user.playerData.gamesWon++;
      req.user.playerData.currentWinStreak++;
      req.user.playerData.longestWinStreak = Math.max(
        req.user.playerData.longestWinStreak, 
        req.user.playerData.currentWinStreak
      );
      
      // Add duration to total play time
      if (sanitizedBestTime) {
        req.user.playerData.totalPlayTime += sanitizedBestTime;
      }
      
      req.user.markModified('gameHistory');
      console.log(`✅ Created new game history entry ${gameId} for campaign level completion`);
    }

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

    // Use retry mechanism to handle version conflicts
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
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
        if (saveError.name === 'VersionError' && retryCount < maxRetries - 1) {
          console.log(`⚠️ Version conflict in completeLevelWithStars (attempt ${retryCount + 1}/${maxRetries}), refreshing user and retrying...`);
          // Refresh the user document and retry
          const freshUser = await User.findById(req.user._id);
          if (!freshUser) {
            throw new Error('User not found during retry');
          }
          
          // Re-apply all the changes to the fresh document
          // Handle active game ending
          const activeGame = freshUser.gameHistory.find(game => 
            game.result === 'in-progress' && 
            String(game.levelId) === sanitizedLevelId
          );
          
          if (activeGame) {
            activeGame.result = 'win';
            activeGame.duration = activeGame.createdAt ? Date.now() - new Date(activeGame.createdAt).getTime() : null;
            activeGame.movesPlayed = activeGame.movesPlayed || 0;
            activeGame.coinsEarned = sanitizedCoinsEarned;
            activeGame.playerColor = activeGame.playerColor || 'white';
            activeGame.endReason = 'level-completed';
            activeGame.stars = sanitizedStars;
            
            freshUser.playerData.gamesWon++;
            freshUser.playerData.currentWinStreak++;
            freshUser.playerData.longestWinStreak = Math.max(
              freshUser.playerData.longestWinStreak, 
              freshUser.playerData.currentWinStreak
            );
            
            if (activeGame.duration) {
              freshUser.playerData.totalPlayTime += activeGame.duration;
            }
            
            freshUser.markModified('gameHistory');
          }
          
          // Handle level progress
          let levelProgress = freshUser.campaignProgress.find(p => {
            const storedLevelIdStr = String(p.levelId);
            return storedLevelIdStr === sanitizedLevelId;
          });
          
          if (levelProgress) {
            levelProgress.completed = true;
            if (sanitizedStars > 0) {
              levelProgress.stars = Math.max(levelProgress.stars, sanitizedStars);
            }
            if (sanitizedBestTime && (!levelProgress.bestTime || sanitizedBestTime < levelProgress.bestTime)) {
              levelProgress.bestTime = sanitizedBestTime;
            }
            levelProgress.lastPlayed = new Date();
            freshUser.markModified('campaignProgress');
          } else {
            const newProgressEntry = {
              levelId: sanitizedLevelId,
              completed: true,
              stars: sanitizedStars,
              bestTime: sanitizedBestTime,
              lastPlayed: new Date()
            };
            
            freshUser.campaignProgress.push(newProgressEntry);
            freshUser.markModified('campaignProgress');
          }

          // Handle coins
          if (sanitizedCoinsEarned > 0) {
            let actualAmount = sanitizedCoinsEarned;

            if (freshUser.playerData.coinMultiplier.active && freshUser.playerData.coinMultiplier.usesRemaining > 0) {
              actualAmount = sanitizedCoinsEarned * freshUser.playerData.coinMultiplier.multiplier;
              freshUser.playerData.coinMultiplier.usesRemaining--;
              
              if (freshUser.playerData.coinMultiplier.usesRemaining <= 0) {
                freshUser.playerData.coinMultiplier.active = false;
              }
            }

            freshUser.playerData.coins += actualAmount;
            freshUser.playerData.totalCoinsEarned += actualAmount;
          }

          req.user = freshUser;
          retryCount++;
          continue;
        } else {
          throw saveError;
        }
      }
    }

    throw new Error('Failed to save level completion after maximum retries');
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

// Start a new game
const startGame = async (req, res) => {
  try {
    const { gameType, opponent, levelId, energySpent = 1 } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!gameType || !['campaign', 'vs-ai', 'vs-player'].includes(gameType)) {
      return res.status(400).json({ error: 'Valid game type is required (campaign, vs-ai, vs-player).' });
    }

    // Check if user has enough energy
    if (req.user.playerData.energy < energySpent) {
      return res.status(400).json({ error: 'Not enough energy to start the game.' });
    }

    // Spend energy
    req.user.playerData.energy -= energySpent;
    req.user.playerData.lastEnergyUpdate = new Date();

    // Generate game ID
    const gameId = `${req.user._id}_${Date.now()}`;

    // Create game history entry with "in-progress" status
    const gameEntry = {
      gameId,
      gameType,
      opponent: opponent || 'Unknown',
      result: 'in-progress', // Special status for ongoing games
      duration: null,
      movesPlayed: 0,
      coinsEarned: 0,
      energySpent,
      levelId: levelId || null,
      stars: null,
  // Always set a valid playerColor to satisfy enum validation (player is birds -> white)
  playerColor: 'white',
      endReason: null,
      createdAt: new Date()
    };

    // Add to game history
    req.user.gameHistory.push(gameEntry);

    // Increment games played counter
    req.user.playerData.gamesPlayed++;

    const updatedUser = await req.user.save();

    console.log(`🎮 Game started: ${gameId}, type: ${gameType}, opponent: ${opponent}, energySpent: ${energySpent}`);

    return res.status(200).json({
      message: 'Game started successfully',
      gameId,
      energyRemaining: updatedUser.playerData.energy,
      timeUntilNextEnergy: updatedUser.getTimeUntilNextEnergy()
    });
  } catch (error) {
    console.error('Start game error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while starting game.' });
  }
};

// End a game and record the result
const endGame = async (req, res) => {
  try {
    const {
      gameId,
      gameType,
      opponent,
      result,
      duration,
      movesPlayed,
      coinsEarned = 0,
      levelId,
      stars,
      playerColor,
      endReason
    } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!gameId || !result) {
      return res.status(400).json({ error: 'Game ID and result are required.' });
    }

    if (!['win', 'loss', 'draw'].includes(result)) {
      return res.status(400).json({ error: 'Result must be win, loss, or draw.' });
    }

    // Find the existing game in history
    const existingGameIndex = req.user.gameHistory.findIndex(game => game.gameId === gameId);
    
    if (existingGameIndex === -1) {
      return res.status(404).json({ error: 'Game not found in history.' });
    }

    const existingGame = req.user.gameHistory[existingGameIndex];
    
    // Check if game was already completed
    if (existingGame.result !== 'in-progress') {
      return res.status(400).json({ error: 'Game result already recorded.' });
    }

    // Update the existing game entry
    existingGame.result = result;
    existingGame.duration = duration || null;
    existingGame.movesPlayed = movesPlayed || 0;
    existingGame.coinsEarned = coinsEarned;
    // Preserve existing color or default to white (never set to null to avoid enum validation error)
    if (playerColor === 'white' || playerColor === 'black') {
      existingGame.playerColor = playerColor;
    } else if (!existingGame.playerColor) {
      existingGame.playerColor = 'white';
    }
    existingGame.endReason = endReason || null;
    
    if (levelId) existingGame.levelId = levelId;
    if (stars !== undefined) existingGame.stars = stars;

    // Update game statistics (don't increment gamesPlayed since it was already incremented at start)
    if (result === 'win') {
      req.user.playerData.gamesWon++;
      req.user.playerData.currentWinStreak++;
      req.user.playerData.longestWinStreak = Math.max(
        req.user.playerData.longestWinStreak, 
        req.user.playerData.currentWinStreak
      );
    } else if (result === 'loss') {
      req.user.playerData.gamesLost++;
      req.user.playerData.currentWinStreak = 0;
    } else if (result === 'draw') {
      req.user.playerData.gamesDrawn++;
      req.user.playerData.currentWinStreak = 0;
    }

    // Add duration to total play time
    if (duration) {
      req.user.playerData.totalPlayTime += duration;
    }

    // Add coins earned
    if (coinsEarned > 0) {
      let actualAmount = coinsEarned;

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
      existingGame.coinsEarned = actualAmount; // Update the actual coins earned with multiplier
    }

    // If it's a campaign level completion, update level progress
    if (gameType === 'campaign' && levelId && result === 'win') {
      let levelProgress = req.user.campaignProgress.find(p => String(p.levelId) === String(levelId));
      
      if (levelProgress) {
        levelProgress.completed = true;
        if (stars !== undefined) {
          levelProgress.stars = Math.max(levelProgress.stars, stars);
        }
        if (duration && (!levelProgress.bestTime || duration < levelProgress.bestTime)) {
          levelProgress.bestTime = duration;
        }
        levelProgress.lastPlayed = new Date();
      } else {
        req.user.campaignProgress.push({
          levelId: String(levelId),
          completed: true,
          stars: stars || 0,
          bestTime: duration || null,
          lastPlayed: new Date()
        });
      }
      
      req.user.playerData.levelsCompleted = req.user.campaignProgress.filter(p => p.completed).length;
      req.user.markModified('campaignProgress');
    }

    // Mark game history as modified to ensure Mongoose saves the changes
    req.user.markModified('gameHistory');

    // Use retry mechanism to handle version conflicts
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const updatedUser = await req.user.save();
        console.log(`🎯 Game ended successfully: ${gameId}, result: ${result}, coins earned: ${coinsEarned}`);
        
        return res.status(200).json({
          message: 'Game result recorded successfully',
          gameStats: updatedUser.getGameStats(),
          playerData: updatedUser.playerData,
          gameHistory: updatedUser.gameHistory.slice(-10) // Return last 10 games
        });
      } catch (saveError) {
        if (saveError.name === 'VersionError' && retryCount < maxRetries - 1) {
          console.log(`⚠️ Version conflict detected (attempt ${retryCount + 1}/${maxRetries}), refreshing user and retrying...`);
          // Refresh the user document and retry
          const freshUser = await User.findById(req.user._id);
          if (!freshUser) {
            throw new Error('User not found during retry');
          }
          
          // Find the game entry again in the fresh document
          const gameIndex = freshUser.gameHistory.findIndex(game => game.gameId === gameId);
          if (gameIndex === -1) {
            throw new Error('Game not found in refreshed user document');
          }
          
          const freshGame = freshUser.gameHistory[gameIndex];
          if (freshGame.result !== 'in-progress') {
            // Game was already completed by another request
            console.log('⚠️ Game was already completed by another request');
            return res.status(200).json({
              message: 'Game result already recorded',
              gameStats: freshUser.getGameStats(),
              playerData: freshUser.playerData,
              gameHistory: freshUser.gameHistory.slice(-10)
            });
          }
          
          // Apply the same updates to the fresh document
          freshGame.result = result;
          freshGame.duration = duration || null;
          freshGame.movesPlayed = movesPlayed || 0;
          freshGame.coinsEarned = coinsEarned;
          if (playerColor === 'white' || playerColor === 'black') {
            freshGame.playerColor = playerColor;
          } else if (!freshGame.playerColor) {
            freshGame.playerColor = 'white';
          }
          freshGame.endReason = endReason || null;
          
          if (levelId) freshGame.levelId = levelId;
          if (stars !== undefined) freshGame.stars = stars;

          // Update game statistics
          if (result === 'win') {
            freshUser.playerData.gamesWon++;
            freshUser.playerData.currentWinStreak++;
            freshUser.playerData.longestWinStreak = Math.max(
              freshUser.playerData.longestWinStreak, 
              freshUser.playerData.currentWinStreak
            );
          } else if (result === 'loss') {
            freshUser.playerData.gamesLost++;
            freshUser.playerData.currentWinStreak = 0;
          } else if (result === 'draw') {
            freshUser.playerData.gamesDrawn++;
            freshUser.playerData.currentWinStreak = 0;
          }

          // Add duration to total play time
          if (duration) {
            freshUser.playerData.totalPlayTime += duration;
          }

          // Add coins earned (without multiplier in retry to avoid double application)
          if (coinsEarned > 0) {
            freshUser.playerData.coins += coinsEarned;
            freshUser.playerData.totalCoinsEarned += coinsEarned;
            freshGame.coinsEarned = coinsEarned;
          }

          // Handle campaign level completion (only if not already handled by completeLevelWithStars)
          if (gameType === 'campaign' && levelId && result === 'win' && levelId !== 'undefined' && levelId !== null) {
            let levelProgress = freshUser.campaignProgress.find(p => String(p.levelId) === String(levelId));
            
            if (!levelProgress || !levelProgress.completed) {
              if (levelProgress) {
                levelProgress.completed = true;
                if (stars !== undefined) {
                  levelProgress.stars = Math.max(levelProgress.stars, stars);
                }
                if (duration && (!levelProgress.bestTime || duration < levelProgress.bestTime)) {
                  levelProgress.bestTime = duration;
                }
                levelProgress.lastPlayed = new Date();
              } else {
                freshUser.campaignProgress.push({
                  levelId: String(levelId),
                  completed: true,
                  stars: stars || 0,
                  bestTime: duration || null,
                  lastPlayed: new Date()
                });
              }
              
              freshUser.playerData.levelsCompleted = freshUser.campaignProgress.filter(p => p.completed).length;
              freshUser.markModified('campaignProgress');
            }
          }

          freshUser.markModified('gameHistory');
          req.user = freshUser;
          retryCount++;
          continue;
        } else {
          throw saveError;
        }
      }
    }

    throw new Error('Failed to save after maximum retries');
  } catch (error) {
    console.error('End game error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while ending game.' });
  }
};

// Get game history
const getGameHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const { limit = 50, offset = 0, gameType, result } = req.query;

    let gameHistory = req.user.gameHistory;

    // Filter by game type if specified
    if (gameType) {
      gameHistory = gameHistory.filter(game => game.gameType === gameType);
    }

    // Filter by result if specified
    if (result) {
      gameHistory = gameHistory.filter(game => game.result === result);
    }

    // Sort by creation date (newest first)
    gameHistory = gameHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedHistory = gameHistory.slice(offset, offset + parseInt(limit));

    return res.status(200).json({
      message: 'Game history retrieved successfully',
      gameHistory: paginatedHistory,
      totalGames: gameHistory.length,
      gameStats: req.user.getGameStats()
    });
  } catch (error) {
    console.error('Get game history error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while retrieving game history.' });
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
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    longestWinStreak: 0,
    currentWinStreak: 0,
    totalPlayTime: 0,
    totalCoinsEarned: 0,
    levelsCompleted: 0,
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

  // Clear campaign progress and game history
  req.user.campaignProgress = [];
  req.user.gameHistory = [];

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

// Mark unfinished games as losses (called when needed to clean up abandoned games)
const markUnfinishedGamesAsLosses = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Find all unfinished games
    const unfinishedGames = req.user.gameHistory.filter(game => game.result === 'in-progress');
    
    if (unfinishedGames.length === 0) {
      return res.status(200).json({
        message: 'No unfinished games found',
        markedAsLosses: 0
      });
    }

    let markedCount = 0;

    // Mark each unfinished game as a loss
    for (let game of unfinishedGames) {
      game.result = 'loss';
      game.endReason = 'abandoned';
      
      // Update game statistics
      req.user.playerData.gamesLost++;
      req.user.playerData.currentWinStreak = 0;
      
      markedCount++;
    }

    // Mark game history as modified
    req.user.markModified('gameHistory');
    
    const updatedUser = await req.user.save();

    console.log(`🗑️ Marked ${markedCount} unfinished games as losses for user ${req.user.username}`);

    return res.status(200).json({
      message: `Successfully marked ${markedCount} unfinished games as losses`,
      markedAsLosses: markedCount,
      gameStats: updatedUser.getGameStats()
    });
  } catch (error) {
    console.error('Mark unfinished games error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while marking unfinished games.' });
  }
};

// Get unfinished games count
const getUnfinishedGamesCount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const unfinishedGames = req.user.gameHistory.filter(game => game.result === 'in-progress');
    
    return res.status(200).json({
      message: 'Unfinished games count retrieved successfully',
      unfinishedCount: unfinishedGames.length,
      unfinishedGames: unfinishedGames.map(game => ({
        gameId: game.gameId,
        gameType: game.gameType,
        opponent: game.opponent,
        createdAt: game.createdAt
      }))
    });
  } catch (error) {
    console.error('Get unfinished games count error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while getting unfinished games count.' });
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
  resetProgress,
  startGame,
  endGame,
  getGameHistory,
  markUnfinishedGamesAsLosses,
  getUnfinishedGamesCount
};
