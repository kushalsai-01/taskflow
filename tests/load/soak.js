import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 30 },  // Ramp up
    { duration: '2h', target: 30 },  // Sustained soak for 2 hours
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const token = authenticate();
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);

  // Periodic mixed queries to detect heap memory leaks and connection pool exhaustion
  http.get(`${BASE_URL}/todos?page=1&limit=6`, params);
  http.get(`${BASE_URL}/metrics`);

  if (Math.random() < 0.1) {
    const payload = JSON.stringify({
      title: `Soak Task ${Date.now()}`,
      priority: 'low',
    });
    const res = http.post(`${BASE_URL}/todos`, payload, params);
    if (res.status === 201) {
      const id = JSON.parse(res.body).data._id;
      http.del(`${BASE_URL}/todos/${id}`, null, params);
    }
  }

  sleep(2);
}
