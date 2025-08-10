const express = require('express');
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

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