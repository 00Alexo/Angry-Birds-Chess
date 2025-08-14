/**
 * Upset-Boost Elo Rating System
 * 
 * This implements an Elo rating system with a twist:
 * - Standard Elo calculations for expected outcomes and draws
 * - Double the rating swing when the lower-rated player wins (upset)
 * - Keeps the system zero-sum while making upsets more rewarding
 * 
 * Update rule: R' = R + K * M * (S - E)
 * Where:
 * - R' = New rating
 * - R = Current rating  
 * - K = K-factor (typically 20 for competitive play)
 * - M = Multiplier (2 for upsets, 1 otherwise)
 * - S = Actual score (1 for win, 0.5 for draw, 0 for loss)
 * - E = Expected score based on rating difference
 */

class EloRatingSystem {
  constructor(kFactor = 20) {
    this.kFactor = kFactor;
  }

  /**
   * Calculate expected score for a player based on rating difference
   * @param {number} playerRating - Player's current rating
   * @param {number} opponentRating - Opponent's current rating
   * @returns {number} Expected score (0-1)
   */
  calculateExpectedScore(playerRating, opponentRating) {
    const ratingDifference = opponentRating - playerRating;
    return 1 / (1 + Math.pow(10, ratingDifference / 400));
  }

  /**
   * Determine if this game result is an "upset" (lower-rated player wins)
   * @param {number} player1Rating - Player 1's rating
   * @param {number} player2Rating - Player 2's rating
   * @param {string} result - Game result ('player1_win', 'player2_win', or 'draw')
   * @returns {boolean} True if this is an upset
   */
  isUpset(player1Rating, player2Rating, result) {
    if (result === 'draw') {
      return false; // Draws are never considered upsets
    }
    
    // Determine if the winner had a lower rating than the loser
    if (result === 'player1_win') {
      return player1Rating < player2Rating;
    } else if (result === 'player2_win') {
      return player2Rating < player1Rating;
    }
    
    return false;
  }

  /**
   * Calculate new ratings for both players after a game
   * @param {number} player1Rating - Player 1's current rating
   * @param {number} player2Rating - Player 2's current rating
   * @param {string} result - Game result ('player1_win', 'player2_win', or 'draw')
   * @returns {Object} Object with newPlayer1Rating and newPlayer2Rating
   */
  calculateNewRatings(player1Rating, player2Rating, result) {
    // Calculate expected scores
    const player1Expected = this.calculateExpectedScore(player1Rating, player2Rating);
    const player2Expected = this.calculateExpectedScore(player2Rating, player1Rating);

    // Determine actual scores
    let player1Score, player2Score;
    if (result === 'player1_win') {
      player1Score = 1;
      player2Score = 0;
    } else if (result === 'player2_win') {
      player1Score = 0;
      player2Score = 1;
    } else { // draw
      player1Score = 0.5;
      player2Score = 0.5;
    }

    // Determine multiplier (M)
    const isUpsetGame = this.isUpset(player1Rating, player2Rating, result);
    const multiplier = isUpsetGame ? 2 : 1;

    // Calculate rating changes
    const player1Change = this.kFactor * multiplier * (player1Score - player1Expected);
    const player2Change = this.kFactor * multiplier * (player2Score - player2Expected);

    // Apply changes and round to 2 decimal places
    const newPlayer1Rating = Math.round((player1Rating + player1Change) * 100) / 100;
    const newPlayer2Rating = Math.round((player2Rating + player2Change) * 100) / 100;

    return {
      newPlayer1Rating,
      newPlayer2Rating,
      player1Change: Math.round(player1Change * 100) / 100,
      player2Change: Math.round(player2Change * 100) / 100,
      isUpset: isUpsetGame,
      multiplierUsed: multiplier
    };
  }

  /**
   * Get a player's rank based on their rating
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
   * Calculate probability of player1 winning against player2
   * @param {number} player1Rating - Player 1's rating
   * @param {number} player2Rating - Player 2's rating
   * @returns {number} Probability (0-1) of player1 winning
   */
  getWinProbability(player1Rating, player2Rating) {
    return this.calculateExpectedScore(player1Rating, player2Rating);
  }

  /**
   * Get default starting rating for new players
   * @returns {number} Default rating
   */
  getDefaultRating() {
    return 1200;
  }

  /**
   * Validate that a rating is within reasonable bounds
   * @param {number} rating - Rating to validate
   * @returns {number} Clamped rating within bounds
   */
  clampRating(rating) {
    const minRating = 100;  // Minimum rating floor
    const maxRating = 3000; // Maximum rating ceiling
    return Math.max(minRating, Math.min(maxRating, rating));
  }

  /**
   * Calculate rating difference category for matchmaking
   * @param {number} rating1 - First player's rating
   * @param {number} rating2 - Second player's rating
   * @returns {string} Category describing the rating difference
   */
  getRatingDifferenceCategory(rating1, rating2) {
    const diff = Math.abs(rating1 - rating2);
    if (diff <= 50) return 'very_close';
    if (diff <= 100) return 'close';
    if (diff <= 200) return 'moderate';
    if (diff <= 400) return 'large';
    return 'very_large';
  }
}

// Export both the class and a default instance
const defaultEloSystem = new EloRatingSystem(20); // K-factor of 20

module.exports = {
  EloRatingSystem,
  eloRating: defaultEloSystem
};
