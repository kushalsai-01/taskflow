const crypto = require('crypto');

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'authorization', 'cookie'];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const formatLog = (level, message, meta = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeData(meta),
  };
  return JSON.stringify(logEntry);
};

const logger = {
  info: (message, meta) => console.log(formatLog('INFO', message, meta)),
  warn: (message, meta) => console.warn(formatLog('WARN', message, meta)),
  error: (message, meta) => console.error(formatLog('ERROR', message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    // Skip logging health checks in production to keep logs lean
    if (req.originalUrl.includes('/health') && res.statusCode === 200) {
      return;
    }

    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: parseFloat(durationMs),
      ip: req.ip || req.connection.remoteAddress,
    };

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} failed with ${res.statusCode}`, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} responded with ${res.statusCode}`, meta);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl}`, meta);
    }
  });

  next();
};

module.exports = { logger, requestLogger, sanitizeData };
