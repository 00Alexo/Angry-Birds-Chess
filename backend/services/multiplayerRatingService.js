const { eloRating } = require('../utils/eloRating');
const User = require('../models/User');

/**
 * Multiplayer Rating Service
 * 
 * Handles Elo rating calculations and updates for competitive multiplayer games
 */
class MultiplayerRatingService {
  
  /**
   * Process rating changes for both players after a competitive multiplayer game
   * @param {Object} player1 - Player 1 data (userId, username, rating)
   * @param {Object} player2 - Player 2 data (userId, username, rating)
   * @param {string} result - Game result ('player1_win', 'player2_win', 'draw')
   * @param {Object} gameData - Additional game data (gameId, duration, etc.)
   * @returns {Promise<Object>} Rating update results
   */
  async processCompetitiveGameResult(player1, player2, result, gameData) {
    try {
      console.log(`📊 [RatingService] Processing competitive game result:`);
      console.log(`📊 [RatingService] ${player1.username} (${player1.rating}) vs ${player2.username} (${player2.rating})`);
      console.log(`📊 [RatingService] Result: ${result}`);
      
      // Calculate new ratings using Upset-Boost Elo system
      const ratingResult = eloRating.calculateNewRatings(
        player1.rating,
        player2.rating,
        result
      );
      
      console.log(`📊 [RatingService] Rating calculation:`, ratingResult);
      
      // Load user documents from database
      const [user1, user2] = await Promise.all([
        User.findById(player1.userId),
        User.findById(player2.userId)
      ]);
      
      if (!user1 || !user2) {
        throw new Error(`One or both users not found: ${player1.userId}, ${player2.userId}`);
      }
      
      // Store original ratings for game history
      const player1OriginalRating = user1.getCompetitiveRating();
      const player2OriginalRating = user2.getCompetitiveRating();
      
      // Update ratings in user documents
      const player1RatingUpdate = user1.updateRating(
        ratingResult.newPlayer1Rating,
        ratingResult.player1Change,
        ratingResult.isUpset
      );
      
      const player2RatingUpdate = user2.updateRating(
        ratingResult.newPlayer2Rating,
        ratingResult.player2Change,
        ratingResult.isUpset
      );
      
      // Determine individual results for each player
      let player1Result, player2Result;
      if (result === 'player1_win') {
        player1Result = 'win';
        player2Result = 'loss';
      } else if (result === 'player2_win') {
        player1Result = 'loss';
        player2Result = 'win';
      } else { // draw
        player1Result = 'draw';
        player2Result = 'draw';
      }
      
      // Record game results with rating information
      const commonGameData = {
        gameType: 'multiplayer_competitive',
        duration: gameData.duration || 0,
        movesPlayed: gameData.movesPlayed || 0,
        moves: gameData.moves || [],
        coinsEarned: gameData.coinsEarned || 0,
        energySpent: gameData.energySpent || 1,
        endReason: gameData.endReason || 'completed',
        playerColor: gameData.player1Color || 'white'
      };
      
      // Record game for player 1
      user1.recordGameResult({
        ...commonGameData,
        gameId: `${gameData.gameId}_p1`,
        opponent: player2.username,
        opponentRating: player2OriginalRating,
        result: player1Result,
        playerColor: gameData.player1Color || 'white',
        ratingBefore: player1OriginalRating,
        ratingAfter: ratingResult.newPlayer1Rating,
        ratingChange: ratingResult.player1Change,
        isUpset: ratingResult.isUpset && player1Result === 'win'
      });
      
      // Record game for player 2  
      user2.recordGameResult({
        ...commonGameData,
        gameId: `${gameData.gameId}_p2`,
        opponent: player1.username,
        opponentRating: player1OriginalRating,
        result: player2Result,
        playerColor: gameData.player2Color || 'black',
        ratingBefore: player2OriginalRating,
        ratingAfter: ratingResult.newPlayer2Rating,
        ratingChange: ratingResult.player2Change,
        isUpset: ratingResult.isUpset && player2Result === 'win'
      });
      
      // Save both users to database
      await Promise.all([
        user1.save(),
        user2.save()
      ]);
      
      console.log(`✅ [RatingService] Rating updates completed successfully`);
      console.log(`📊 [RatingService] Final ratings: ${user1.username}: ${ratingResult.newPlayer1Rating}, ${user2.username}: ${ratingResult.newPlayer2Rating}`);
      
      return {
        success: true,
        isUpset: ratingResult.isUpset,
        multiplierUsed: ratingResult.multiplierUsed,
        player1: {
          userId: player1.userId,
          username: player1.username,
          oldRating: player1OriginalRating,
          newRating: ratingResult.newPlayer1Rating,
          ratingChange: ratingResult.player1Change,
          result: player1Result
        },
        player2: {
          userId: player2.userId,
          username: player2.username,
          oldRating: player2OriginalRating,
          newRating: ratingResult.newPlayer2Rating,
          ratingChange: ratingResult.player2Change,
          result: player2Result
        }
      };
      
    } catch (error) {
      console.error('❌ [RatingService] Error processing competitive game result:', error);
      throw error;
    }
  }
  
  /**
   * Process an unranked multiplayer game (no rating changes)
   * @param {Object} player1 - Player 1 data
   * @param {Object} player2 - Player 2 data  
   * @param {string} result - Game result
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} Result without rating changes
   */
  async processUnrankedGameResult(player1, player2, result, gameData) {
    try {
      console.log(`📊 [RatingService] Processing unranked game result:`);
      console.log(`📊 [RatingService] ${player1.username} vs ${player2.username}`);
      console.log(`📊 [RatingService] Result: ${result} (no rating changes)`);
      
      // Load user documents
      const [user1, user2] = await Promise.all([
        User.findById(player1.userId),
        User.findById(player2.userId)
      ]);
      
      if (!user1 || !user2) {
        throw new Error(`One or both users not found: ${player1.userId}, ${player2.userId}`);
      }
      
      // Determine individual results
      let player1Result, player2Result;
      if (result === 'player1_win') {
        player1Result = 'win';
        player2Result = 'loss';
      } else if (result === 'player2_win') {
        player1Result = 'loss';
        player2Result = 'win';
      } else {
        player1Result = 'draw';
        player2Result = 'draw';
      }
      
      // Record games without rating changes
      const commonGameData = {
        gameType: 'multiplayer_unranked',
        duration: gameData.duration || 0,
        movesPlayed: gameData.movesPlayed || 0,
        moves: gameData.moves || [],
        coinsEarned: gameData.coinsEarned || 0,
        energySpent: gameData.energySpent || 1,
        endReason: gameData.endReason || 'completed'
      };
      
      user1.recordGameResult({
        ...commonGameData,
        gameId: `${gameData.gameId}_p1`,
        opponent: player2.username,
        result: player1Result,
        playerColor: gameData.player1Color || 'white'
      });
      
      user2.recordGameResult({
        ...commonGameData,
        gameId: `${gameData.gameId}_p2`,
        opponent: player1.username,
        result: player2Result,
        playerColor: gameData.player2Color || 'black'
      });
      
      // Save both users
      await Promise.all([
        user1.save(),
        user2.save()
      ]);
      
      console.log(`✅ [RatingService] Unranked game recorded successfully`);
      
      return {
        success: true,
        isRanked: false,
        player1: {
          userId: player1.userId,
          username: player1.username,
          result: player1Result
        },
        player2: {
          userId: player2.userId,
          username: player2.username,
          result: player2Result
        }
      };
      
    } catch (error) {
      console.error('❌ [RatingService] Error processing unranked game result:', error);
      throw error;
    }
  }
  
  /**
   * Get rating information for matchmaking
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User rating information
   */
  async getUserRatingInfo(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      const ratingStats = user.getRatingStats();
      
      return {
        userId: user._id,
        username: user.username,
        rating: ratingStats.current,
        rank: ratingStats.rank,
        gamesPlayed: ratingStats.gamesPlayed,
        peak: ratingStats.peak
      };
    } catch (error) {
      console.error('❌ [RatingService] Error getting user rating info:', error);
      throw error;
    }
  }
  
  /**
   * Check if two players are suitable for matchmaking based on rating difference
   * @param {number} rating1 - First player's rating
   * @param {number} rating2 - Second player's rating
   * @param {number} maxDifference - Maximum allowed rating difference (default: 200)
   * @returns {boolean} Whether the match is suitable
   */
  isSuitableMatch(rating1, rating2, maxDifference = 200) {
    const difference = Math.abs(rating1 - rating2);
    const category = eloRating.getRatingDifferenceCategory(rating1, rating2);
    
    console.log(`🎯 [RatingService] Match suitability check: ${rating1} vs ${rating2}, diff: ${difference}, category: ${category}`);
    
    return difference <= maxDifference;
  }
  
  /**
   * Get win probability between two players
   * @param {number} player1Rating - Player 1's rating
   * @param {number} player2Rating - Player 2's rating
   * @returns {number} Probability of player 1 winning (0-1)
   */
  getWinProbability(player1Rating, player2Rating) {
    return eloRating.getWinProbability(player1Rating, player2Rating);
  }
}

// Export singleton instance
module.exports = new MultiplayerRatingService();
