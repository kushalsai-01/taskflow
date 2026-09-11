import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle2, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <CheckCircle2 size={28} style={{ color: '#6366f1' }} />
        <span>TaskPulse</span>
      </Link>

      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <button onClick={logout} className="btn-secondary" title="Logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
