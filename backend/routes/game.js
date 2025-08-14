const express = require('express');
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// Game session routes
router.post('/start-game', gameController.startGame);
router.post('/end-game', gameController.endGame);
router.get('/game-history', gameController.getGameHistory);
router.get('/game-history/:username', gameController.getUserGameHistory);
router.post('/mark-unfinished-as-losses', gameController.markUnfinishedGamesAsLosses);
router.get('/unfinished-games-count', gameController.getUnfinishedGamesCount);

// Rating routes
router.get('/rating-info', gameController.getRatingInfo);
router.get('/leaderboard', gameController.getLeaderboard);
router.get('/ranking-stats', gameController.getRankingStats);

// Player data routes
router.get('/player-data', gameController.getPlayerData);
router.put('/player-data', gameController.updatePlayerData);
router.post('/spend-energy', gameController.spendEnergy);
router.post('/add-coins', gameController.addCoins);
router.post('/purchase-energy', gameController.purchaseEnergy);

// Campaign routes
router.get('/campaign-progress', gameController.getCampaignProgress);
router.post('/update-level-progress', gameController.updateLevelProgress);
router.post('/complete-level-with-stars', gameController.completeLevelWithStars);
router.post('/skip-level', gameController.skipLevel);

// Shop routes
router.post('/shop/purchase', gameController.purchaseShopItem);

// Utility routes
router.post('/reset-progress', gameController.resetProgress);

module.exports = router;