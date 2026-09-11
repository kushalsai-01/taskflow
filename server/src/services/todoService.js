const Todo = require('../models/Todo');
const AppError = require('../utils/appError');

// Escape regex special characters to prevent ReDoS attacks
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'completed', 'priority', 'category', 'dueDate'];
const ALLOWED_SORT_FIELDS = ['createdAt', 'dueDate', 'title', 'priority'];

const createTodo = async (userId, todoData) => {
  const todo = await Todo.create({
    user: userId,
    title: todoData.title.trim(),
    description: todoData.description ? todoData.description.trim() : '',
    completed: typeof todoData.completed === 'boolean' ? todoData.completed : false,
    priority: todoData.priority || 'medium',
    category: todoData.category ? todoData.category.trim() : 'General',
    dueDate: todoData.dueDate || null,
  });

  return todo;
};

const getTodos = async (userId, query) => {
  const { search, completed, priority, category, sortBy, order, page = 1, limit = 10 } = query;

  // Build query enforcing strict user isolation
  const filterQuery = { user: userId };

  if (completed !== undefined && completed !== '') {
    filterQuery.completed = completed === 'true' || completed === true;
  }

  if (priority) {
    filterQuery.priority = priority;
  }

  if (category) {
    filterQuery.category = category.trim();
  }

  // Safe search using escaped regex with length constraint
  if (search && typeof search === 'string') {
    const sanitizedSearch = escapeRegex(search.trim().slice(0, 100));
    if (sanitizedSearch) {
      filterQuery.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { category: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
  }

  // Sorting whitelist
  const sortField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOption = { [sortField]: sortOrder };

  // Bounded pagination: min 1, max 100
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [total, todos] = await Promise.all([
    Todo.countDocuments(filterQuery),
    Todo.find(filterQuery)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    todos,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

const getTodoById = async (userId, todoId) => {
  const todo = await Todo.findOne({ _id: todoId, user: userId }).lean();
  if (!todo) {
    const exists = await Todo.exists({ _id: todoId });
    if (exists) {
      throw new AppError('Not authorized to access this todo', 403);
    }
    throw new AppError('Todo not found', 404);
  }

  return todo;
};

const updateTodo = async (userId, todoId, updateData) => {
  // Mass assignment protection: filter out disallowed fields
  const sanitizedUpdate = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  }

  if (sanitizedUpdate.title !== undefined) {
    sanitizedUpdate.title = sanitizedUpdate.title.trim();
  }
  if (sanitizedUpdate.description !== undefined) {
    sanitizedUpdate.description = sanitizedUpdate.description.trim();
  }
  if (sanitizedUpdate.category !== undefined) {
    sanitizedUpdate.category = sanitizedUpdate.category.trim();
  }

  const todo = await Todo.findOneAndUpdate(
    { _id: todoId, user: userId },
    { $set: sanitizedUpdate },
    { new: true, runValidators: true }
  ).lean();

  if (!todo) {
    const exists = await Todo.exists({ _id: todoId });
    if (exists) {
      throw new AppError('Not authorized to modify this todo', 403);
    }
    throw new AppError('Todo not found', 404);
  }

  return todo;
};

const deleteTodo = async (userId, todoId) => {
  const todo = await Todo.findOneAndDelete({ _id: todoId, user: userId }).lean();

  if (!todo) {
    const exists = await Todo.exists({ _id: todoId });
    if (exists) {
      throw new AppError('Not authorized to delete this todo', 403);
    }
    throw new AppError('Todo not found', 404);
  }

  return { id: todoId };
};

module.exports = {
  createTodo,
  getTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
  escapeRegex,
};
