import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Normal load
    { duration: '3m', target: 150 },  // Elevated load
    { duration: '3m', target: 300 },  // High load (stress test knee)
    { duration: '2m', target: 500 },  // Maximum capacity / breaking point
    { duration: '2m', target: 0 },    // Recovery period
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Allow up to 5% failure during breaking-point discovery
  },
};

export function setup() {
  const token = authenticate();
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);

  // Intensive workload: combined search, filtering, and writes
  const res = http.get(`${BASE_URL}/todos?page=1&limit=10&sortBy=dueDate`, params);
  check(res, { 'Status 200': (r) => r.status === 200 });

  if (Math.random() < 0.25) {
    const payload = JSON.stringify({
      title: `Stress Task VU-${__VU}-${Date.now()}`,
      priority: 'high',
    });
    const createRes = http.post(`${BASE_URL}/todos`, payload, params);
    check(createRes, { 'Created 201': (r) => r.status === 201 });
  }

  sleep(0.5);
}
