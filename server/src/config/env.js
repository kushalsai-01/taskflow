const dotenv = require('dotenv');
dotenv.config();

const validateEnv = () => {
  const isTest = process.env.NODE_ENV === 'test';

  // In test mode, fallback to test secret if not set
  if (!process.env.JWT_SECRET && isTest) {
    process.env.JWT_SECRET = 'test_jwt_secret_for_automated_jest_testing_only_32_chars';
  }

  if (!process.env.JWT_SECRET) {
    console.error('[FATAL CONFIG ERROR] JWT_SECRET environment variable is required.');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY WARNING] JWT_SECRET should be at least 32 characters long in production.');
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    mongoUri: process.env.MONGO_URI || (isTest ? 'mongodb://127.0.0.1:27017/todoapp_test' : 'mongodb://127.0.0.1:27017/todoapp'),
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    rateLimits: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      maxAuth: parseInt(process.env.RATE_LIMIT_MAX_AUTH, 10) || 20,
      maxApi: parseInt(process.env.RATE_LIMIT_MAX_API, 10) || 300,
    },
  };
};

const config = validateEnv();

module.exports = config;
