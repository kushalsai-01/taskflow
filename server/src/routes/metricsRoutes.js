const express = require('express');
const { getMetricsSnapshot } = require('../utils/metrics');

const router = express.Router();

router.get('/', (req, res) => {
  const metrics = getMetricsSnapshot();

  // If Prometheus text format requested, format as plain text
  if (req.headers.accept && req.headers.accept.includes('text/plain')) {
    let prometheusText = '';
    prometheusText += `# HELP http_requests_total Total number of HTTP requests\n`;
    prometheusText += `# TYPE http_requests_total counter\n`;
    prometheusText += `http_requests_total ${metrics.http.totalRequests}\n\n`;

    prometheusText += `# HELP http_errors_total Total number of HTTP requests that returned 4xx or 5xx\n`;
    prometheusText += `# TYPE http_errors_total counter\n`;
    prometheusText += `http_errors_total ${metrics.http.totalErrors}\n\n`;

    prometheusText += `# HELP http_active_requests Currently in-flight HTTP requests\n`;
    prometheusText += `# TYPE http_active_requests gauge\n`;
    prometheusText += `http_active_requests ${metrics.http.activeRequests}\n\n`;

    prometheusText += `# HELP process_heap_used_bytes Process heap memory used\n`;
    prometheusText += `# TYPE process_heap_used_bytes gauge\n`;
    prometheusText += `process_heap_used_bytes ${Math.round(metrics.system.heapUsedMb * 1024 * 1024)}\n`;

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.status(200).send(prometheusText);
  }

  return res.status(200).json({
    success: true,
    data: metrics,
  });
});

module.exports = router;
