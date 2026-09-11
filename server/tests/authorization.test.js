const todoService = require('../src/services/todoService');
const Todo = require('../src/models/Todo');
const AppError = require('../src/utils/appError');

describe('Authorization, User Isolation & Security Core Tests (Anti-IDOR)', () => {
  const userAId = '65f111111111111111111111';
  const userBId = '65f222222222222222222222';
  const taskAId = '65faaaaaaaaaaaaaaaaaaaaa';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Anti-IDOR / Anti-BOLA Authorization Verification', () => {
    it('User B cannot read User A task -> must throw 403 Forbidden', async () => {
      // User B tries to fetch Task A belonging to User A
      jest.spyOn(Todo, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null), // findOne with { _id: taskAId, user: userBId } returns null
      });

      // exists check verifies the task actually exists under another user
      jest.spyOn(Todo, 'exists').mockResolvedValueOnce({ _id: taskAId });

      await expect(todoService.getTodoById(userBId, taskAId)).rejects.toThrow(
        new AppError('Not authorized to access this todo', 403)
      );
    });

    it('User B cannot modify User A task -> must throw 403 Forbidden', async () => {
      // User B tries to update Task A belonging to User A
      jest.spyOn(Todo, 'findOneAndUpdate').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(Todo, 'exists').mockResolvedValueOnce({ _id: taskAId });

      await expect(
        todoService.updateTodo(userBId, taskAId, { title: 'Hijacked Title' })
      ).rejects.toThrow(new AppError('Not authorized to modify this todo', 403));
    });

    it('User B cannot delete User A task -> must throw 403 Forbidden', async () => {
      // User B tries to delete Task A belonging to User A
      jest.spyOn(Todo, 'findOneAndDelete').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(Todo, 'exists').mockResolvedValueOnce({ _id: taskAId });

      await expect(todoService.deleteTodo(userBId, taskAId)).rejects.toThrow(
        new AppError('Not authorized to delete this todo', 403)
      );
    });

    it('Query for tasks must strictly isolate to user: userId', async () => {
      let capturedFilter = null;
      jest.spyOn(Todo, 'countDocuments').mockImplementation((filter) => {
        capturedFilter = filter;
        return Promise.resolve(0);
      });

      jest.spyOn(Todo, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await todoService.getTodos(userAId, { page: 1, limit: 10 });

      expect(capturedFilter).toBeDefined();
      expect(capturedFilter.user).toEqual(userAId);
    });
  });

  describe('ReDoS Protection & Regex Sanitization', () => {
    it('escapeRegex should escape all regex meta-characters to prevent catastrophic backtracking', () => {
      const maliciousPayload = 'a(a+)+$[*?^|]';
      const escaped = todoService.escapeRegex(maliciousPayload);

      expect(escaped).toEqual('a\\(a\\+\\)\\+\\$\\[\\*\\?\\^\\|\\]');
      // Verifies that a RegExp constructed with escaped input is treated as literal text
      const regex = new RegExp(escaped);
      expect(regex.test('a(a+)+$[*?^|]')).toBe(true);
      expect(regex.test('aaaaa')).toBe(false);
    });
  });

  describe('Mass Assignment Protection', () => {
    it('updateTodo should strip disallowed arbitrary fields like role or admin', async () => {
      let capturedUpdate = null;

      jest.spyOn(Todo, 'findOneAndUpdate').mockImplementation((query, update) => {
        capturedUpdate = update.$set;
        return {
          lean: jest.fn().mockResolvedValue({
            _id: taskAId,
            user: userAId,
            title: 'Clean Task',
          }),
        };
      });

      await todoService.updateTodo(userAId, taskAId, {
        title: 'Clean Task',
        role: 'admin',
        isSuperuser: true,
        user: userBId, // Attempted ownership transfer
      });

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate.title).toEqual('Clean Task');
      expect(capturedUpdate.role).toBeUndefined();
      expect(capturedUpdate.isSuperuser).toBeUndefined();
      expect(capturedUpdate.user).toBeUndefined(); // User field must never be overwritten
    });
  });
});
