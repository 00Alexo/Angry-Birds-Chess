// Simple Campaign Manager - Single source of truth for campaign progression
import serverGameDB from './serverDatabase';

class CampaignManager {
  constructor() {
    this.campaignProgress = [];
    this.isLoaded = false;
    this.currentGameId = null;
  }

  // Start a new campaign game
  async startCampaignGame(levelId, opponent = 'AI') {
    try {
      console.log(`🎮 CampaignManager: Starting campaign game for level ${levelId}`);
      
      // Call the new start game API
      const response = await fetch(`${process.env.REACT_APP_API_URL}/game/start-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gameType: 'campaign',
          opponent,
          levelId: String(levelId),
          energySpent: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start game: ${response.statusText}`);
      }

      const result = await response.json();
      this.currentGameId = result.gameId;
      
      console.log(`🎮 CampaignManager: Game started with ID ${this.currentGameId}`);
      return result;
    } catch (error) {
      console.error('❌ CampaignManager: Failed to start game:', error);
      throw error;
    }
  }

  // Load campaign progress from server
  async loadProgress() {
    try {
      console.log('🎯 CampaignManager: Loading progress from server...');
      this.campaignProgress = await serverGameDB.getAllLevelProgress();
      this.isLoaded = true;
      console.log('✅ CampaignManager: Progress loaded:', this.campaignProgress);
      return this.campaignProgress;
    } catch (error) {
      console.error('❌ CampaignManager: Failed to load progress:', error);
      this.campaignProgress = [];
      this.isLoaded = true;
      return [];
    }
  }

  // Complete a level with stars and coins
  async completeLevel(levelId, stars = 3, coinsEarned = 0, bestTime = null, gameStartTime = null) {
    try {
      console.log(`🎯 CampaignManager: Attempting to complete level ${levelId} with ${stars} stars and ${coinsEarned} coins`);
      
      // Ensure levelId is a string for consistency with backend
      const levelIdStr = String(levelId);
      console.log(`🔄 CampaignManager: Converting levelId from ${levelId} (${typeof levelId}) to ${levelIdStr} (${typeof levelIdStr})`);
      
      // For campaign level completion, we'll use the completeLevelWithStars endpoint 
      // which handles both the game ending and campaign progress in a single transaction
      console.log('🔗 CampaignManager: Calling serverGameDB.completeLevelWithStars (handles game ending internally)...');
      const result = await serverGameDB.completeLevelWithStars(levelIdStr, stars, coinsEarned, bestTime);
      
      console.log(`✅ CampaignManager: Level ${levelIdStr} completed successfully!`, result);
      
      // Clear the current game ID since the level is now completed
      this.currentGameId = null;
      
      // Check if the result indicates success
      if (!result || result.error) {
        console.error(`❌ CampaignManager: Server returned error for level ${levelIdStr}:`, result?.error || 'Unknown error');
        throw new Error(result?.error || 'Server returned error or null result');
      }
      
      // Reload progress to get fresh data
      console.log('🔄 CampaignManager: Reloading progress...');
      await this.loadProgress();
      
      // Dispatch event to notify UI components
      console.log('📢 CampaignManager: Dispatching campaignProgressUpdated event...');
      window.dispatchEvent(new CustomEvent('campaignProgressUpdated', { 
        detail: { levelId: levelIdStr, stars, coinsEarned, result } 
      }));
      
      console.log('🎉 CampaignManager: Level completion and reload complete!');
      return result;
    } catch (error) {
      console.error(`❌ CampaignManager: Failed to complete level ${levelId}:`, error);
      throw error;
    }
  }

  // End a campaign game with result
  async endCampaignGame(result, duration = null, levelId = null, stars = 0, coinsEarned = 0) {
    try {
      if (!this.currentGameId) {
        console.warn('⚠️ CampaignManager: No current game ID to end');
        return;
      }

      console.log(`🏁 CampaignManager: Ending game ${this.currentGameId} with result: ${result}`);
      
      // Call the new end game API
      const response = await fetch(`${process.env.REACT_APP_API_URL}/game/end-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gameId: this.currentGameId,
          gameType: 'campaign',
          opponent: 'AI',
          result,
          duration,
          movesPlayed: 0, // TODO: Track actual moves
          coinsEarned,
          levelId,
          stars,
          playerColor: 'white', // Assuming player is always white in campaign
          endReason: result === 'win' ? 'checkmate' : 'defeat'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to end game: ${response.statusText}`);
      }

      const endResult = await response.json();
      console.log(`🏁 CampaignManager: Game ended successfully:`, endResult);
      
      // Clear current game ID
      this.currentGameId = null;
      
      return endResult;
    } catch (error) {
      console.error('❌ CampaignManager: Failed to end game:', error);
      // Clear game ID even on error to prevent getting stuck
      this.currentGameId = null;
      throw error;
    }
  }

  // Skip a level using a level skip token
  async skipLevel(levelId, coinsEarned = 0) {
    try {
      console.log(`🚀 CampaignManager: Attempting to skip level ${levelId} with ${coinsEarned} coins`);
      
      // Ensure levelId is a string for consistency with backend
      const levelIdStr = String(levelId);
      console.log(`🔄 CampaignManager: Converting levelId from ${levelId} (${typeof levelId}) to ${levelIdStr} (${typeof levelIdStr})`);
      
      // Call the server to skip the level
      console.log('🔗 CampaignManager: Calling serverGameDB.skipLevel...');
      const result = await serverGameDB.skipLevel(levelIdStr, coinsEarned);
      
      console.log(`✅ CampaignManager: Level ${levelIdStr} skipped successfully!`, result);
      
      // Check if the result indicates success
      if (!result || result.error) {
        console.error(`❌ CampaignManager: Server returned error for level skip ${levelIdStr}:`, result?.error || 'Unknown error');
        throw new Error(result?.error || 'Server returned error or null result');
      }
      
      // Reload progress to get fresh data
      console.log('🔄 CampaignManager: Reloading progress after skip...');
      await this.loadProgress();
      
      // Dispatch event to notify UI components
      console.log('📢 CampaignManager: Dispatching campaignProgressUpdated event for skip...');
      window.dispatchEvent(new CustomEvent('campaignProgressUpdated', { 
        detail: { levelId: levelIdStr, stars: 1, coinsEarned, result, skipped: true } 
      }));
      
      console.log('🎉 CampaignManager: Level skip and reload complete!');
      return result;
    } catch (error) {
      console.error(`❌ CampaignManager: Failed to skip level ${levelId}:`, error);
      throw error;
    }
  }

  // Check if a level is completed
  isLevelCompleted(levelId) {
    if (!this.isLoaded) {
      console.warn('⚠️ CampaignManager: Progress not loaded yet');
      return false;
    }
    
    // Convert to string for comparison since backend stores as string
    const levelIdStr = String(levelId);
    const levelData = this.campaignProgress.find(p => String(p.levelId) === levelIdStr);
    const completed = levelData ? levelData.completed : false;
    
    console.log(`🔍 CampaignManager: Level ${levelId} (as string: ${levelIdStr}) completed: ${completed}`);
    return completed;
  }

  // Get level stars
  getLevelStars(levelId) {
    if (!this.isLoaded) {
      console.warn('⚠️ CampaignManager: Progress not loaded yet');
      return 0;
    }
    
    // Convert to string for comparison since backend stores as string
    const levelIdStr = String(levelId);
    const levelData = this.campaignProgress.find(p => String(p.levelId) === levelIdStr);
    return levelData ? levelData.stars : 0;
  }

  // Check if a level is unlocked
  isLevelUnlocked(levelId) {
    if (levelId === 1) return true; // First level always unlocked
    
    // Check if previous level is completed
    return this.isLevelCompleted(levelId - 1);
  }

  // Get progress stats
  getProgressStats() {
    if (!this.isLoaded) return { completedLevels: 0, totalStars: 0 };
    
    const completedLevels = this.campaignProgress.filter(p => p.completed).length;
    const totalStars = this.campaignProgress.reduce((sum, p) => sum + (p.stars || 0), 0);
    
    return { completedLevels, totalStars };
  }

  // Force refresh from server
  async refresh() {
    return await this.loadProgress();
  }

  // Get user's game history
  async getGameHistory(limit = 10, gameType = null) {
    try {
      console.log(`📜 CampaignManager: Fetching game history (limit: ${limit}, type: ${gameType || 'all'})`);
      
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (gameType) params.append('gameType', gameType);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/game/game-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game history: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📜 CampaignManager: Game history retrieved:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ CampaignManager: Failed to get game history:', error);
      throw error;
    }
  }
}

// Create singleton instance
const campaignManager = new CampaignManager();

export default campaignManager;
