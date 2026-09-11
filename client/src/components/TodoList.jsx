import React from 'react';
import TodoItem from './TodoItem';
import { Sparkles } from 'lucide-react';

export default function TodoList({ todos, onToggle, onDelete, onUpdate }) {
  if (!todos || todos.length === 0) {
    return (
      <div className="glass-panel empty-state">
        <Sparkles size={48} style={{ color: '#a855f7', marginBottom: '1rem' }} />
        <h3>No tasks found</h3>
        <p style={{ marginTop: '0.4rem' }}>
          Create a new task above or adjust your search filters to explore.
        </p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo._id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
