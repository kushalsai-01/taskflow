const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const config = require('../config/env');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('User already exists with this email address', 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password,
  });

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    token,
  };
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  generateToken,
};
