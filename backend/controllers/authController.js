const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Register user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ error: `User with this ${field} already exists.` });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      playerData: {
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
      }
    });

    const savedUser = await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: savedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        playerData: savedUser.playerData
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error occurred during registration.' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Regenerate energy before login
    user.regenerateEnergy();
    const updatedUser = await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: updatedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        playerData: updatedUser.playerData
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error occurred during login.' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    return res.status(200).json({
      message: 'User data retrieved successfully',
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        playerData: req.user.playerData,
        timeUntilNextEnergy: req.user.getTimeUntilNextEnergy()
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while retrieving user data.' });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Token is not valid.' });
    }

    return res.status(200).json({
      message: 'Token is valid',
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({ error: 'Internal server error occurred during token verification.' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  verifyToken
};
