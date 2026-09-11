import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Baseline normal traffic
    { duration: '15s', target: 400 }, // Instantaneous traffic spike
    { duration: '1m', target: 400 },  // Sustained spike
    { duration: '20s', target: 20 },  // Instant drop back to normal baseline
    { duration: '1m', target: 20 },   // Recovery observation
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  const token = authenticate();
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);

  const res = http.get(`${BASE_URL}/todos?limit=6`, params);
  check(res, { 'Spike response 200': (r) => r.status === 200 });

  sleep(0.3);
}
