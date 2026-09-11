import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ textAlign: 'center' }}>
        <HelpCircle size={64} style={{ color: '#f43f5e', margin: '0 auto 1rem' }} />
        <h2>404 — Page Not Found</h2>
        <p style={{ color: '#94a3b8', margin: '0.8rem 0 1.5rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
