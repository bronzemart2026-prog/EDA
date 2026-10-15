import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, showBack = false, onBack }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে লগআউট করতে চান?')) {
      logout();
    }
  };

  return (
    <header className="app-header">
      {showBack ? (
        <button className="back-btn" onClick={onBack || (() => navigate(-1))}>
          <ArrowLeft size={22} style={{ marginRight: '6px' }} />
          <span>ফেরত</span>
        </button>
      ) : user ? (
        <div className="header-user-profile" onClick={() => navigate('/profile')}>
          <div className="header-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="header-username">{user.name}</span>
        </div>
      ) : (
        <div style={{ width: '48px' }}></div>
      )}

      {/* Center: Somiti name + page title */}
      <div style={{ flex: 1, textAlign: 'center', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
        <span className="header-somiti-name">স্বপ্নের বাতিঘর </span>
        <h1 style={{ fontSize: '0.78rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0, letterSpacing: '0.02em' }}>
          {title}
        </h1>
      </div>

      {user ? (
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '16px',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            e.currentTarget.style.color = '#fca5a5';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="লগআউট"
        >
          <LogOut size={14} style={{ color: 'inherit' }} />
          <span style={{ color: 'inherit' }}>লগআউট</span>
        </button>
      ) : (
        <div style={{ width: '48px' }}></div>
      )}
    </header>
  );
}
