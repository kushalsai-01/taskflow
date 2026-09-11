import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp-up to 20 users
    { duration: '3m', target: 50 },  // Steady state: 50 users
    { duration: '2m', target: 100 }, // Peak load: 100 users
    { duration: '1m', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const token = authenticate();
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);
  const randomRoll = Math.random();

  if (randomRoll < 0.50) {
    // 50% read traffic: dashboard pagination and sorting
    const page = Math.floor(Math.random() * 5) + 1;
    const res = http.get(`${BASE_URL}/todos?page=${page}&limit=6&sortBy=createdAt&order=desc`, params);
    check(res, { 'GET todos 200': (r) => r.status === 200 });
  } else if (randomRoll < 0.70) {
    // 20% search and filtering
    const searchTerms = ['Test', 'Task', 'Refactor', 'MongoDB', 'Docker'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const res = http.get(`${BASE_URL}/todos?search=${term}&priority=high`, params);
    check(res, { 'GET search todos 200': (r) => r.status === 200 });
  } else if (randomRoll < 0.85) {
    // 15% create task
    const payload = JSON.stringify({
      title: `Load Test Task ${Date.now()}-${__VU}`,
      description: 'Realistic user workload simulation',
      priority: 'medium',
      category: 'Work',
    });
    const res = http.post(`${BASE_URL}/todos`, payload, params);
    check(res, { 'POST todo 201': (r) => r.status === 201 });
  } else if (randomRoll < 0.95) {
    // 10% fetch user profile
    const res = http.get(`${BASE_URL}/auth/me`, params);
    check(res, { 'GET me 200': (r) => r.status === 200 });
  } else {
    // 5% system health & metrics poll
    const res = http.get(`${BASE_URL}/metrics`);
    check(res, { 'GET metrics 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 1.5 + 0.5); // Sleep 0.5s - 2.0s between requests
}
