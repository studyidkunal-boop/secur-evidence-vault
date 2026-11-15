const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Strict rate limiter for authentication endpoints: 5 allowed attempts per 15-minute window; 6+ rapid attempts blocked
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// Public routes: Registration / Signup & Login (Rate-limited)
router.post('/signup', authLimiter, authController.signup);
router.post('/register', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
