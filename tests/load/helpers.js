import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api/v1';
export const USER_EMAIL = __ENV.AUTH_EMAIL || 'benchmark@taskpulse.io';
export const USER_PASSWORD = __ENV.AUTH_PASSWORD || 'BenchmarkPassword123!';

export function authenticate() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.data.token;
  }

  // If user does not exist, register them
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      name: 'Benchmark User',
      email: USER_EMAIL,
      password: USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    return body.data.token;
  }

  throw new Error(`Authentication failed with status ${loginRes.status}: ${loginRes.body}`);
}

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}
