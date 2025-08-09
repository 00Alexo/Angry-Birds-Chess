// Simple Campaign Manager - Single source of truth for campaign progression
import serverGameDB from './serverDatabase';

class CampaignManager {
  constructor() {
    this.campaignProgress = [];
    this.isLoaded = false;
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
  async completeLevel(levelId, stars = 3, coinsEarned = 0, bestTime = null) {
    try {
      console.log(`🎯 CampaignManager: Attempting to complete level ${levelId} with ${stars} stars and ${coinsEarned} coins`);
      
      // Ensure levelId is a string for consistency with backend
      const levelIdStr = String(levelId);
      console.log(`🔄 CampaignManager: Converting levelId from ${levelId} (${typeof levelId}) to ${levelIdStr} (${typeof levelIdStr})`);
      
      // Call the server to complete the level
      console.log('🔗 CampaignManager: Calling serverGameDB.completeLevelWithStars...');
      const result = await serverGameDB.completeLevelWithStars(levelIdStr, stars, coinsEarned, bestTime);
      
      console.log(`✅ CampaignManager: Level ${levelIdStr} completed successfully!`, result);
      
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
}

// Create singleton instance
const campaignManager = new CampaignManager();

export default campaignManager;
