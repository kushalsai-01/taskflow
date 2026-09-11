const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  logger.error(`[Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  // CORS origin error
  if (err.message && err.message.includes('CORS policy')) {
    error.statusCode = 403;
    error.message = 'Not allowed by CORS policy';
  }

  // Mongoose invalid ObjectId (CastError) -> 404
  if (err.name === 'CastError') {
    error.statusCode = 404;
    error.message = `Resource not found with id of ${err.value}`;
  }

  // Mongoose duplicate key error -> 409
  if (err.code === 11000) {
    error.statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error.message = `Duplicate field value entered: ${field}. Please use another value.`;
  }

  // Mongoose validation error -> 422
  if (err.name === 'ValidationError') {
    error.statusCode = 422;
    error.message = Object.values(err.errors || {}).map((val) => val.message).join(', ');
  }

  // JsonWebTokenErrors -> 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Invalid or expired authentication token';
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
