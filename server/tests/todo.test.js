const request = require('supertest');
const app = require('../src/server');
const authService = require('../src/services/authService');
const todoService = require('../src/services/todoService');
const User = require('../src/models/User');

describe('Todo Endpoints API Integration, Validation & CRUD Tests', () => {
  const mockUserId = '65f123456789012345678901';
  const validToken = authService.generateToken(mockUserId);
  const mockTodoId = '65f987654321098765432109';

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Test Engineer',
        email: 'test@example.com',
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication Enforcement', () => {
    it('should reject unauthenticated request to /api/v1/todos with 401 error', async () => {
      const res = await request(app).get('/api/v1/todos');
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated POST /api/v1/todos with 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/todos')
        .send({ title: 'Unauthorized Task' });
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/todos Query Parameter Validation', () => {
    it('should reject invalid page parameter with 400 validation error', async () => {
      const res = await request(app)
        .get('/api/v1/todos?page=0')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Page must be a positive integer');
    });

    it('should reject limit parameter exceeding maximum bound (100) with 400 error', async () => {
      const res = await request(app)
        .get('/api/v1/todos?limit=250')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Limit must be an integer between 1 and 100');
    });

    it('should reject invalid priority query filter with 400 error', async () => {
      const res = await request(app)
        .get('/api/v1/todos?priority=critical')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Priority must be low, medium, or high');
    });

    it('should reject disallowed sortBy field with 400 error', async () => {
      const res = await request(app)
        .get('/api/v1/todos?sortBy=unindexedColumn')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('sortBy must be');
    });

    it('should reject search queries longer than 100 characters with 400 error', async () => {
      const longSearch = 'a'.repeat(101);
      const res = await request(app)
        .get(`/api/v1/todos?search=${longSearch}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Search query cannot exceed 100 characters');
    });

    it('should return 200 with paginated task data when valid query is supplied', async () => {
      const mockResult = {
        todos: [
          {
            _id: mockTodoId,
            user: mockUserId,
            title: 'Refactor Auth Routes',
            completed: false,
            priority: 'high',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      jest.spyOn(todoService, 'getTodos').mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .get('/api/v1/todos?page=1&limit=10&priority=high&sortBy=createdAt&order=desc')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toEqual(1);
    });
  });

  describe('POST /api/v1/todos Task Creation', () => {
    it('should reject task creation with missing or empty title (400 error)', async () => {
      const res = await request(app)
        .post('/api/v1/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: '',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Title is required');
    });

    it('should reject task creation with title exceeding 120 characters', async () => {
      const res = await request(app)
        .post('/api/v1/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'x'.repeat(121),
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('between 1 and 120 characters');
    });

    it('should reject task creation with invalid priority value', async () => {
      const res = await request(app)
        .post('/api/v1/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Valid Title',
          priority: 'urgent',
        });

      expect(res.statusCode).toEqual(400);
    });

    it('should successfully create task and return 201 Created', async () => {
      const mockCreatedTodo = {
        _id: mockTodoId,
        user: mockUserId,
        title: 'Complete Unit Tests',
        description: 'Achieve >80% test coverage',
        completed: false,
        priority: 'high',
        category: 'Engineering',
        createdAt: new Date().toISOString(),
      };

      jest.spyOn(todoService, 'createTodo').mockResolvedValueOnce(mockCreatedTodo);

      const res = await request(app)
        .post('/api/v1/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Complete Unit Tests',
          description: 'Achieve >80% test coverage',
          priority: 'high',
          category: 'Engineering',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toEqual('Complete Unit Tests');
    });
  });

  describe('GET, PATCH, DELETE /api/v1/todos/:id Validation & Handlers', () => {
    it('should reject malformed ObjectId on GET with 400 error', async () => {
      const res = await request(app)
        .get('/api/v1/todos/invalid-object-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Invalid task ID format');
    });

    it('should return 404 when task ID does not exist', async () => {
      const AppError = require('../src/utils/appError');
      jest.spyOn(todoService, 'getTodoById').mockRejectedValueOnce(new AppError('Todo not found', 404));

      const res = await request(app)
        .get(`/api/v1/todos/${mockTodoId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Todo not found');
    });

    it('should successfully return single task by ID with 200 OK', async () => {
      const mockTodo = {
        _id: mockTodoId,
        user: mockUserId,
        title: 'Single Task',
      };

      jest.spyOn(todoService, 'getTodoById').mockResolvedValueOnce(mockTodo);

      const res = await request(app)
        .get(`/api/v1/todos/${mockTodoId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.title).toEqual('Single Task');
    });

    it('should successfully update task via PATCH and return 200 OK', async () => {
      const mockUpdatedTodo = {
        _id: mockTodoId,
        user: mockUserId,
        title: 'Updated Title',
        completed: true,
      };

      jest.spyOn(todoService, 'updateTodo').mockResolvedValueOnce(mockUpdatedTodo);

      const res = await request(app)
        .patch(`/api/v1/todos/${mockTodoId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title',
          completed: true,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.completed).toBe(true);
    });

    it('should successfully delete task and return 200 OK', async () => {
      jest.spyOn(todoService, 'deleteTodo').mockResolvedValueOnce({ id: mockTodoId });

      const res = await request(app)
        .delete(`/api/v1/todos/${mockTodoId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toEqual(mockTodoId);
    });
  });

  describe('System Health, Readiness & Metrics Endpoints', () => {
    it('GET /api/v1/health should return 200 OK with healthy status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.uptimeSeconds).toBeDefined();
    });

    it('GET /api/v1/ready should return system readiness status', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect([200, 503]).toContain(res.statusCode);
      expect(res.body.status).toBeDefined();
    });

    it('GET /api/v1/metrics should return operational metrics', async () => {
      const res = await request(app).get('/api/v1/metrics');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.http.totalRequests).toBeGreaterThanOrEqual(1);
    });
  });
});
