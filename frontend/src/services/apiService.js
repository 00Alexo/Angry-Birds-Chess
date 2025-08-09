// API service for communicating with the backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = this.getToken();
  }

  // Token management
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication endpoints
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async verifyToken() {
    return this.request('/auth/verify-token', {
      method: 'POST',
    });
  }

  logout() {
    this.removeToken();
  }

  // Game data endpoints
  async getPlayerData() {
    return this.request('/game/player-data');
  }

  async updatePlayerData(playerData) {
    return this.request('/game/player-data', {
      method: 'PUT',
      body: JSON.stringify({ playerData }),
    });
  }

  async spendEnergy(amount) {
    return this.request('/game/spend-energy', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async addCoins(amount, multiplier = 1) {
    return this.request('/game/add-coins', {
      method: 'POST',
      body: JSON.stringify({ amount, multiplier }),
    });
  }

  async purchaseEnergy(energyAmount, costPerEnergy = 3) {
    return this.request('/game/purchase-energy', {
      method: 'POST',
      body: JSON.stringify({ energyAmount, costPerEnergy }),
    });
  }

  async getCampaignProgress() {
    return this.request('/game/campaign-progress');
  }

  async updateLevelProgress(levelId, stars, bestTime = null) {
    return this.request('/game/update-level-progress', {
      method: 'POST',
      body: JSON.stringify({ levelId, stars, bestTime }),
    });
  }

  async completeLevelWithStars(levelId, stars, coinsEarned, bestTime = null) {
    console.log(`🔗 ApiService: completeLevelWithStars called with levelId=${levelId}, stars=${stars}, coinsEarned=${coinsEarned}, bestTime=${bestTime}`);
    
    const requestBody = { levelId, stars, coinsEarned, bestTime };
    console.log('📦 ApiService: Request body:', requestBody);
    
    try {
      const response = await this.request('/game/complete-level-with-stars', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      console.log('✅ ApiService: Response received:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiService: Request failed:', error);
      console.error('❌ ApiService: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  async purchaseShopItem(itemId, itemPrice, itemData = {}) {
    return this.request('/game/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId, itemPrice, itemData }),
    });
  }

  async resetProgress() {
    return this.request('/game/reset-progress', {
      method: 'POST',
    });
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token;
  }

  async checkConnection() {
    try {
      // Use the auth verify endpoint for connection check
      const response = await fetch(`${this.baseURL}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      // Even if it returns 401 (unauthorized), the server is responding
      return response.status !== 0; // 0 means network error
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
