const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 50 })
      .withMessage('Name cannot exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please include a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .isLength({ max: 128 })
      .withMessage('Password cannot exceed 128 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please include a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  login
);

router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
