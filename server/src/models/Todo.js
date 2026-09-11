const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
      // Note: Single index removed because compound index below covers { user: 1 } prefix
    },
    title: {
      type: String,
      required: [true, 'Please add a task title'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes supporting primary query and sort combinations
todoSchema.index({ user: 1, completed: 1, createdAt: -1 });
todoSchema.index({ user: 1, dueDate: 1 });
todoSchema.index({ user: 1, priority: 1 });

module.exports = mongoose.model('Todo', todoSchema);
