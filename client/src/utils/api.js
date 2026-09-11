const API_BASE = '/api/v1';

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      // Clear expired or invalid token from browser storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw new Error(data.message || 'An error occurred during API call');
  }

  return data;
};

// Auth API Methods
export const apiRegister = (userData) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });

export const apiLogin = (credentials) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });

export const apiLogout = () => request('/auth/logout', { method: 'POST' });

export const apiGetMe = () => request('/auth/me', { method: 'GET' });

// Todo API Methods
export const apiGetTodos = (queryParams = '') =>
  request(`/todos${queryParams ? `?${queryParams}` : ''}`, { method: 'GET' });

export const apiGetTodoById = (id) => request(`/todos/${id}`, { method: 'GET' });

export const apiCreateTodo = (todoData) =>
  request('/todos', { method: 'POST', body: JSON.stringify(todoData) });

export const apiUpdateTodo = (id, todoData) =>
  request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(todoData) });

export const apiDeleteTodo = (id) =>
  request(`/todos/${id}`, { method: 'DELETE' });

// Health & System API Methods
export const apiGetHealth = () => request('/health', { method: 'GET' });
export const apiGetReady = () => request('/ready', { method: 'GET' });
