const mongoose = require('mongoose');
const config = require('./env');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`[Database Error] Connection failed: ${error.message}`);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
