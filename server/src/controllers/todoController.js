const todoService = require('../services/todoService');
const { sendResponse } = require('../utils/apiResponse');

const createTodo = async (req, res, next) => {
  try {
    const todo = await todoService.createTodo(req.user._id, req.body);
    return sendResponse(res, 201, 'Todo created successfully', todo);
  } catch (error) {
    next(error);
  }
};

const getTodos = async (req, res, next) => {
  try {
    const { todos, meta } = await todoService.getTodos(req.user._id, req.query);
    return sendResponse(res, 200, 'Todos retrieved successfully', todos, meta);
  } catch (error) {
    next(error);
  }
};

const getTodoById = async (req, res, next) => {
  try {
    const todo = await todoService.getTodoById(req.user._id, req.params.id);
    return sendResponse(res, 200, 'Todo retrieved successfully', todo);
  } catch (error) {
    next(error);
  }
};

const updateTodo = async (req, res, next) => {
  try {
    const todo = await todoService.updateTodo(req.user._id, req.params.id, req.body);
    return sendResponse(res, 200, 'Todo updated successfully', todo);
  } catch (error) {
    next(error);
  }
};

const deleteTodo = async (req, res, next) => {
  try {
    const result = await todoService.deleteTodo(req.user._id, req.params.id);
    return sendResponse(res, 200, 'Todo deleted successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTodo,
  getTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
};
