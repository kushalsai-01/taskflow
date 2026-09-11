import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authenticate, authHeaders } from './helpers.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const token = authenticate();
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);

  // 1. Health & Readiness check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'Health status is 200': (r) => r.status === 200 });

  // 2. Fetch Tasks list
  const listRes = http.get(`${BASE_URL}/todos?page=1&limit=6`, params);
  check(listRes, {
    'Todos fetched successfully (200)': (r) => r.status === 200,
  });

  // 3. Create a task
  const createPayload = JSON.stringify({
    title: `Smoke Test Task ${Date.now()}`,
    description: 'Minimal smoke test execution validation',
    priority: 'medium',
    category: 'Testing',
  });
  const createRes = http.post(`${BASE_URL}/todos`, createPayload, params);
  check(createRes, {
    'Todo created (201)': (r) => r.status === 201,
  });

  let createdId = null;
  if (createRes.status === 201) {
    createdId = JSON.parse(createRes.body).data._id;
  }

  // 4. Update the task
  if (createdId) {
    const updatePayload = JSON.stringify({ completed: true });
    const updateRes = http.patch(`${BASE_URL}/todos/${createdId}`, updatePayload, params);
    check(updateRes, {
      'Todo updated (200)': (r) => r.status === 200,
    });

    // 5. Delete the task
    const deleteRes = http.del(`${BASE_URL}/todos/${createdId}`, null, params);
    check(deleteRes, {
      'Todo deleted (200)': (r) => r.status === 200,
    });
  }

  sleep(1);
}
