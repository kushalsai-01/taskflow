const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createTodo,
  getTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
} = require('../controllers/todoController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

// All todo routes require authentication
router.use(protect);

// Validator for Todo ID parameter
const validateTodoId = [
  param('id').isMongoId().withMessage('Invalid task ID format'),
];

router
  .route('/')
  .get(
    [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer starting from 1'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
      query('completed')
        .optional()
        .isBoolean()
        .withMessage('Completed filter must be true or false'),
      query('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Priority must be low, medium, or high'),
      query('sortBy')
        .optional()
        .isIn(['createdAt', 'dueDate', 'title', 'priority'])
        .withMessage('sortBy must be createdAt, dueDate, title, or priority'),
      query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('order must be asc or desc'),
      query('search')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Search query cannot exceed 100 characters'),
    ],
    validate,
    getTodos
  )
  .post(
    [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 1, max: 120 })
        .withMessage('Title must be between 1 and 120 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
      body('completed')
        .optional()
        .isBoolean()
        .withMessage('Completed must be a boolean value'),
      body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Priority must be low, medium, or high'),
      body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Category cannot exceed 50 characters'),
      body('dueDate')
        .optional({ nullable: true })
        .custom((val) => {
          if (!val) return true;
          if (isNaN(Date.parse(val))) {
            throw new Error('Due date must be a valid ISO 8601 date string');
          }
          return true;
        }),
    ],
    validate,
    createTodo
  );

// Shared validators for update operations (PATCH & PUT)
const validateTodoUpdate = [
  ...validateTodoId,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 120 })
    .withMessage('Title must be between 1 and 120 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean value'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('dueDate')
    .optional({ nullable: true })
    .custom((val) => {
      if (!val) return true;
      if (isNaN(Date.parse(val))) {
        throw new Error('Due date must be a valid date string');
      }
      return true;
    }),
];

router
  .route('/:id')
  .get(validateTodoId, validate, getTodoById)
  .patch(validateTodoUpdate, validate, updateTodo)
  .put(validateTodoUpdate, validate, updateTodo) // Keep PUT for backward compatibility
  .delete(validateTodoId, validate, deleteTodo);

module.exports = router;
