import React, { useState } from 'react';
import { Check, Trash2, Edit3, Save, X, Calendar } from 'lucide-react';

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editCategory, setEditCategory] = useState(todo.category || 'General');

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(todo._id, {
      ...todo,
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      category: editCategory.trim() || 'General',
    });
    setIsEditing(false);
  };

  const formattedDate = todo.dueDate
    ? new Date(todo.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className={`glass-panel todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-item-left">
        <div
          className={`checkbox-custom ${todo.completed ? 'checked' : ''}`}
          onClick={() => onToggle(todo._id, !todo.completed)}
        >
          {todo.completed && <Check size={14} />}
        </div>

        {isEditing ? (
          <div className="todo-content" style={{ gap: '0.6rem', width: '100%' }}>
            <input
              type="text"
              className="input-field"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <textarea
              className="textarea-field"
              rows="2"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <select
                className="select-field"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input
                type="text"
                className="input-field"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="todo-content">
            <div className="todo-title">{todo.title}</div>
            {todo.description && <div className="todo-desc">{todo.description}</div>}

            <div className="todo-badges">
              <span className={`badge badge-${todo.priority}`}>
                {todo.priority}
              </span>
              <span className="badge badge-category">
                {todo.category || 'General'}
              </span>
              {formattedDate && (
                <span className="badge badge-category" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> {formattedDate}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="todo-actions">
        {isEditing ? (
          <>
            <button className="btn-icon" onClick={handleSave} title="Save">
              <Save size={16} />
            </button>
            <button className="btn-icon" onClick={() => setIsEditing(false)} title="Cancel">
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button className="btn-icon" onClick={() => setIsEditing(true)} title="Edit">
              <Edit3 size={16} />
            </button>
            <button className="btn-icon delete" onClick={() => onDelete(todo._id)} title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
