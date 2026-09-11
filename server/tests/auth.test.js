const request = require('supertest');
const app = require('../src/server');
const authService = require('../src/services/authService');
const User = require('../src/models/User');

describe('Auth Endpoints API Integration & Validation Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should reject registration with invalid email format (400 validation error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please include a valid email address');
    });

    it('should reject registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: '',
          password: '',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration when password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Password User',
          email: 'shortpass@example.com',
          password: '123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('should return 409 when registering an existing email address', async () => {
      jest.spyOn(authService, 'registerUser').mockImplementationOnce(async () => {
        const AppError = require('../src/utils/appError');
        throw new AppError('User already exists with this email address', 409);
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('User already exists');
    });

    it('should successfully register a valid user and return 201 with JWT token', async () => {
      const mockResult = {
        user: {
          id: '65f123456789012345678901',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date().toISOString(),
        },
        token: 'mock.jwt.token',
      };

      jest.spyOn(authService, 'registerUser').mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toEqual('jane@example.com');
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when login email or password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when invalid credentials are provided', async () => {
      jest.spyOn(authService, 'loginUser').mockImplementationOnce(async () => {
        const AppError = require('../src/utils/appError');
        throw new AppError('Invalid email or password', 401);
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPassword123!',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual('Invalid email or password');
    });

    it('should successfully authenticate and return 200 with JWT token', async () => {
      const mockLoginResult = {
        user: {
          id: '65f123456789012345678901',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date().toISOString(),
        },
        token: 'valid.mock.jwt.token',
      };

      jest.spyOn(authService, 'loginUser').mockResolvedValueOnce(mockLoginResult);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual('valid.mock.jwt.token');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject request without Authorization token with 401 error', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('token missing');
    });

    it('should reject request with malformed or invalid Authorization token with 401 error', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer malformed.invalid.token');

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('invalid');
    });

    it('should return user profile when valid Authorization token is supplied', async () => {
      const validToken = authService.generateToken('65f123456789012345678901');

      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '65f123456789012345678901',
          name: 'Jane Doe',
          email: 'jane@example.com',
        }),
      });

      jest.spyOn(authService, 'getUserProfile').mockResolvedValueOnce({
        id: '65f123456789012345678901',
        name: 'Jane Doe',
        email: 'jane@example.com',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toEqual('jane@example.com');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 OK on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });
});
