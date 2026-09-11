const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const config = require('./config/env');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');
const healthRoutes = require('./routes/healthRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { logger, requestLogger } = require('./utils/logger');
const { metricsMiddleware } = require('./utils/metrics');

const app = express();

// Trust proxy if running behind Nginx or Cloud load balancers
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:80',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:80',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body Parsers with payload size limits (DoS protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Observability & Metrics Middleware
app.use(requestLogger);
app.use(metricsMiddleware);

// Mount Versioned API Routes (/api/v1/...)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/todos', apiLimiter, todoRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/ready', healthRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1', healthRoutes);

// Backward Compatibility Aliases (/api/...)
app.use('/api/auth', authRoutes);
app.use('/api/todos', apiLimiter, todoRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ready', healthRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api', healthRoutes);

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Middleware
app.use(errorHandler);

const PORT = config.port;

let server;
if (config.nodeEnv !== 'test') {
  connectDB().then(() => {
    server = app.listen(PORT, () => {
      logger.info(`[Server] Express running in ${config.nodeEnv} mode on port ${PORT}`, {
        port: PORT,
        env: config.nodeEnv,
      });
    });
  });
}

// Graceful Shutdown Handler
const handleShutdown = async (signal) => {
  logger.info(`[Server] ${signal} received: closing HTTP server and database connections...`);

  if (server) {
    server.close(async () => {
      logger.info('[Server] HTTP server closed.');
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false);
          logger.info('[Database] Mongoose connection closed successfully.');
        }
        process.exit(0);
      } catch (err) {
        logger.error(`[Database Error] Error closing Mongoose connection: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Process-level exception handling
process.on('unhandledRejection', (reason) => {
  logger.error('[FATAL] Unhandled Rejection at Promise:', {
    reason: reason instanceof Error ? reason.stack : reason,
  });
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught Exception thrown:', {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

module.exports = app;
