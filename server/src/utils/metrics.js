const metricsState = {
  totalRequests: 0,
  totalErrors: 0,
  activeRequests: 0,
  totalDurationMs: 0,
  statusCodes: {},
  startTime: Date.now(),
};

const metricsMiddleware = (req, res, next) => {
  metricsState.totalRequests += 1;
  metricsState.activeRequests += 1;
  const start = process.hrtime();

  res.on('finish', () => {
    metricsState.activeRequests = Math.max(0, metricsState.activeRequests - 1);
    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;
    metricsState.totalDurationMs += durationMs;

    const code = res.statusCode;
    metricsState.statusCodes[code] = (metricsState.statusCodes[code] || 0) + 1;

    if (code >= 400) {
      metricsState.totalErrors += 1;
    }
  });

  next();
};

const getMetricsSnapshot = () => {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const avgDurationMs = metricsState.totalRequests > 0
    ? (metricsState.totalDurationMs / metricsState.totalRequests).toFixed(2)
    : 0;

  return {
    uptimeSeconds: Math.floor((Date.now() - metricsState.startTime) / 1000),
    http: {
      totalRequests: metricsState.totalRequests,
      totalErrors: metricsState.totalErrors,
      activeRequests: metricsState.activeRequests,
      averageResponseTimeMs: parseFloat(avgDurationMs),
      statusCodes: metricsState.statusCodes,
    },
    system: {
      heapUsedMb: parseFloat((memory.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: parseFloat((memory.heapTotal / 1024 / 1024).toFixed(2)),
      rssMb: parseFloat((memory.rss / 1024 / 1024).toFixed(2)),
      cpuUserMs: Math.round(cpu.user / 1000),
      cpuSystemMs: Math.round(cpu.system / 1000),
    },
  };
};

module.exports = { metricsMiddleware, getMetricsSnapshot };
