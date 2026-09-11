const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const handleHealth = (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      heapUsedMb: parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: parseFloat((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
      rssMb: parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2)),
    },
  });
};

const handleReady = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbReady = dbState === 1;

  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const statusCode = isDbReady ? 200 : 503;

  res.status(statusCode).json({
    status: isDbReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    database: {
      status: states[dbState] || 'unknown',
      connected: isDbReady,
    },
  });
};

router.get('/health', handleHealth);
router.get('/ready', handleReady);
router.get('/', handleHealth);

module.exports = router;
