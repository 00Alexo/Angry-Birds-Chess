import apiService from './apiService';

/**
 * Rating Service
 * 
 * Handles all rating-related API calls and data management
 */
class RatingService {
  /**
   * Get user's current rating information
   * @returns {Promise<Object>} Rating information
   */
  async getRatingInfo() {
    try {
      const response = await apiService.request('/game/rating-info', 'GET');
      return response.rating;
    } catch (error) {
      console.error('Error fetching rating info:', error);
      // Return default rating if API fails
      return {
        current: 1200,
        peak: 1200,
        gamesPlayed: 0,
        rank: 'Beginner',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get leaderboard data
   * @param {number} limit - Number of players to fetch (default: 50)
   * @param {number} skip - Number of players to skip (default: 0)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(limit = 50, skip = 0) {
    try {
      const response = await apiService.request(`/game/leaderboard?limit=${limit}&skip=${skip}`, 'GET');
      return {
        leaderboard: response.leaderboard || [],
        userRank: response.userRank || null,
        totalPlayers: response.totalPlayers || 0
      };
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Return empty leaderboard if API fails
      return {
        leaderboard: [],
        userRank: null,
        totalPlayers: 0
      };
    }
  }

  /**
   * Get ranking statistics for Hall of Fame
   * @returns {Promise<Object>} Ranking statistics
   */
  async getRankingStats() {
    try {
      const response = await apiService.request('/game/ranking-stats', 'GET');
      return {
        tierStats: response.tierStats || [],
        userTier: response.userTier || null
      };
    } catch (error) {
      console.error('Error fetching ranking stats:', error);
      // Return default ranking stats if API fails
      return {
        tierStats: [
          { name: 'Legendary Bird Master', minRating: 2400, maxRating: 3000, icon: '👑', players: 0 },
          { name: 'Grandmaster Falcon', minRating: 2200, maxRating: 2399, icon: '🦅', players: 0 },
          { name: 'Master Eagle', minRating: 2000, maxRating: 2199, icon: '🦆', players: 0 },
          { name: 'Expert Cardinal', minRating: 1800, maxRating: 1999, icon: '🐦‍🔥', players: 0 },
          { name: 'Advanced Robin', minRating: 1600, maxRating: 1799, icon: '🐦', players: 0 },
          { name: 'Skilled Sparrow', minRating: 1400, maxRating: 1599, icon: '🐤', players: 0 },
          { name: 'Novice Chick', minRating: 1200, maxRating: 1399, icon: '🐣', players: 0 },
          { name: 'Beginner Egg', minRating: 0, maxRating: 1199, icon: '🥚', players: 0 }
        ],
        userTier: null
      };
    }
  }

  /**
   * Get rank name based on rating
   * @param {number} rating - Player's rating
   * @returns {string} Rank name
   */
  getRank(rating) {
    if (rating >= 2400) return 'Grandmaster';
    if (rating >= 2100) return 'Master';
    if (rating >= 1800) return 'Expert';
    if (rating >= 1600) return 'Advanced';
    if (rating >= 1400) return 'Intermediate';
    if (rating >= 1200) return 'Beginner';
    return 'Novice';
  }

  /**
   * Get rank color for UI display
   * @param {string} rank - Rank name
   * @returns {string} Tailwind CSS color class
   */
  getRankColor(rank) {
    switch (rank) {
      case 'Grandmaster': return 'text-purple-400 bg-purple-900/30';
      case 'Master': return 'text-blue-400 bg-blue-900/30';
      case 'Expert': return 'text-green-400 bg-green-900/30';
      case 'Advanced': return 'text-yellow-400 bg-yellow-900/30';
      case 'Intermediate': return 'text-orange-400 bg-orange-900/30';
      case 'Beginner': return 'text-gray-400 bg-gray-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  }

  /**
   * Format rating change for display
   * @param {number} change - Rating change (+/-)
   * @returns {string} Formatted string with appropriate sign
   */
  formatRatingChange(change) {
    if (change > 0) {
      return `+${change}`;
    } else if (change < 0) {
      return `${change}`;
    } else {
      return '0';
    }
  }

  /**
   * Calculate expected score between two players
   * @param {number} playerRating - Player's rating
   * @param {number} opponentRating - Opponent's rating
   * @returns {number} Expected score (0-1)
   */
  calculateExpectedScore(playerRating, opponentRating) {
    const ratingDifference = opponentRating - playerRating;
    return 1 / (1 + Math.pow(10, ratingDifference / 400));
  }

  /**
   * Get win probability as percentage
   * @param {number} playerRating - Player's rating
   * @param {number} opponentRating - Opponent's rating
   * @returns {number} Win probability as percentage (0-100)
   */
  getWinProbability(playerRating, opponentRating) {
    const expected = this.calculateExpectedScore(playerRating, opponentRating);
    return Math.round(expected * 100);
  }

  /**
   * Get rating difference category for display
   * @param {number} rating1 - First player's rating
   * @param {number} rating2 - Second player's rating
   * @returns {Object} Category info with name and description
   */
  getRatingDifferenceInfo(rating1, rating2) {
    const diff = Math.abs(rating1 - rating2);
    
    if (diff <= 50) {
      return { 
        category: 'very_close', 
        name: 'Very Close Match',
        description: 'Evenly matched opponents',
        color: 'text-green-400'
      };
    } else if (diff <= 100) {
      return { 
        category: 'close', 
        name: 'Close Match',
        description: 'Fairly matched opponents',
        color: 'text-blue-400'
      };
    } else if (diff <= 200) {
      return { 
        category: 'moderate', 
        name: 'Moderate Difference',
        description: 'One player slightly favored',
        color: 'text-yellow-400'
      };
    } else if (diff <= 400) {
      return { 
        category: 'large', 
        name: 'Large Difference',
        description: 'One player heavily favored',
        color: 'text-orange-400'
      };
    } else {
      return { 
        category: 'very_large', 
        name: 'Very Large Difference',
        description: 'Heavily mismatched',
        color: 'text-red-400'
      };
    }
  }

  /**
   * Check if a game result would be considered an "upset"
   * @param {number} playerRating - Player's rating
   * @param {number} opponentRating - Opponent's rating
   * @param {string} result - Game result ('win', 'loss', 'draw')
   * @returns {boolean} True if this would be an upset
   */
  wouldBeUpset(playerRating, opponentRating, result) {
    if (result === 'draw') return false;
    
    // It's an upset if the lower-rated player wins
    if (result === 'win') {
      return playerRating < opponentRating;
    }
    
    return false;
  }

  /**
   * Estimate rating change for a potential game result
   * @param {number} playerRating - Player's rating
   * @param {number} opponentRating - Opponent's rating
   * @param {string} result - Expected result ('win', 'loss', 'draw')
   * @param {number} kFactor - K-factor (default: 20)
   * @returns {number} Estimated rating change
   */
  estimateRatingChange(playerRating, opponentRating, result, kFactor = 20) {
    const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
    
    let actualScore;
    if (result === 'win') {
      actualScore = 1;
    } else if (result === 'loss') {
      actualScore = 0;
    } else {
      actualScore = 0.5;
    }
    
    const isUpset = this.wouldBeUpset(playerRating, opponentRating, result);
    const multiplier = isUpset ? 2 : 1;
    
    const change = kFactor * multiplier * (actualScore - expectedScore);
    return Math.round(change);
  }
}

// Export singleton instance
export default new RatingService();
