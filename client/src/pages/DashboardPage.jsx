import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import TodoForm from '../components/TodoForm';
import TodoFilters from '../components/TodoFilters';
import TodoList from '../components/TodoList';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import * as api from '../utils/api';

export default function DashboardPage() {
  const [todos, setTodos] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);

  // Ref to track the latest request sequence to prevent race conditions
  const latestRequestId = useRef(0);

  const fetchTodos = useCallback(async () => {
    const currentRequestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const queryParts = [];

      if (debouncedSearch) queryParts.push(`search=${encodeURIComponent(debouncedSearch)}`);
      if (status === 'active') queryParts.push('completed=false');
      if (status === 'completed') queryParts.push('completed=true');
      if (priority) queryParts.push(`priority=${encodeURIComponent(priority)}`);
      if (sortBy) queryParts.push(`sortBy=${encodeURIComponent(sortBy)}`);
      queryParts.push(`page=${page}`);
      queryParts.push('limit=6');

      const queryString = queryParts.join('&');
      const response = await api.apiGetTodos(queryString);

      // Only update state if this is still the most recent request
      if (currentRequestId === latestRequestId.current) {
        setTodos(response.data || []);
        setMeta(response.meta || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      if (currentRequestId === latestRequestId.current) {
        setError(err.message || 'Failed to load todos');
      }
    } finally {
      if (currentRequestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, status, priority, sortBy, page]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (newTodoData) => {
    try {
      await api.apiCreateTodo(newTodoData);
      fetchTodos();
    } catch (err) {
      alert(`Error creating todo: ${err.message}`);
    }
  };

  const handleToggleTodo = async (id, newCompletedState) => {
    // Optimistic UI update
    setTodos((prev) =>
      prev.map((t) => (t._id === id ? { ...t, completed: newCompletedState } : t))
    );

    try {
      await api.apiUpdateTodo(id, { completed: newCompletedState });
      // Successfully updated; no full list refetch needed, preserving UI fluidity
    } catch (err) {
      // Revert optimistic update on failure
      setTodos((prev) =>
        prev.map((t) => (t._id === id ? { ...t, completed: !newCompletedState } : t))
      );
      alert(`Error updating todo: ${err.message}`);
    }
  };

  const handleUpdateTodo = async (id, updatedData) => {
    try {
      const res = await api.apiUpdateTodo(id, updatedData);
      // Update local state with the returned updated task
      setTodos((prev) =>
        prev.map((t) => (t._id === id ? { ...t, ...res.data } : t))
      );
    } catch (err) {
      alert(`Error updating todo: ${err.message}`);
      fetchTodos();
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    // Optimistic removal
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter((t) => t._id !== id));

    try {
      await api.apiDeleteTodo(id);
      fetchTodos();
    } catch (err) {
      setTodos(previousTodos);
      alert(`Error deleting todo: ${err.message}`);
    }
  };

  return (
    <div>
      <Navbar />

      <main className="main-content">
        <TodoForm onAdd={handleAddTodo} />

        <TodoFilters
          search={search}
          setSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          status={status}
          setStatus={(val) => {
            setStatus(val);
            setPage(1);
          }}
          priority={priority}
          setPriority={(val) => {
            setPriority(val);
            setPage(1);
          }}
          sortBy={sortBy}
          setSortBy={(val) => {
            setSortBy(val);
            setPage(1);
          }}
        />

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="loading-spinner">
            <div style={{ color: '#6366f1', fontWeight: 600 }}>Loading tasks...</div>
          </div>
        ) : (
          <>
            <TodoList
              todos={todos}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
              onUpdate={handleUpdateTodo}
            />

            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </main>
    </div>
  );
}
