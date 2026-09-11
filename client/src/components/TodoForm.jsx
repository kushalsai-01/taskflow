import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function TodoForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        priority,
        category: category.trim() || 'General',
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('General');
      setDueDate('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel todo-form-card">
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          className="input-field"
          placeholder="What task needs to be completed?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="textarea-field"
          placeholder="Add detailed task description or requirements..."
          rows="2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="form-group" style={{ flexDirection: 'row', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              className="select-field"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Category (e.g. Work, Personal)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <input
              type="date"
              className="input-field"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Plus size={18} /> {submitting ? 'Adding...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
