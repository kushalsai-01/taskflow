const authService = require('../services/authService');
const { sendResponse } = require('../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendResponse(res, 201, 'User registered successfully', result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return sendResponse(res, 200, 'User logged in successfully', result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return sendResponse(res, 200, 'User logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user._id);
    return sendResponse(res, 200, 'Current user profile fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
