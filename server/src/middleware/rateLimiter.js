const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const authLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.maxAuth,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.maxApi,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
