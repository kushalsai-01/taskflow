import React from 'react';
import { Search } from 'lucide-react';

export default function TodoFilters({
  search,
  setSearch,
  status,
  setStatus,
  priority,
  setPriority,
  sortBy,
  setSortBy,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search by title, description, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${status === 'all' ? 'active' : ''}`}
              onClick={() => setStatus('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${status === 'active' ? 'active' : ''}`}
              onClick={() => setStatus('active')}
            >
              Active
            </button>
            <button
              className={`filter-tab ${status === 'completed' ? 'active' : ''}`}
              onClick={() => setStatus('completed')}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar-row" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: '0 1 180px' }}>
          <select
            className="select-field"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div style={{ flex: '0 1 200px' }}>
          <select
            className="select-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="title">Sort: Alphabetical</option>
          </select>
        </div>
      </div>
    </div>
  );
}
