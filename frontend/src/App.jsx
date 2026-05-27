// ============================================================
// src/App.jsx
// Root App component managing Authentication and Routing
// ============================================================
import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { FileCabinet } from './components/FileCabinet';
import { api } from './api/client';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('rowsc_token');
      if (token) {
        try {
          const data = await api.verifyToken();
          if (data.valid) {
            setUser(data.user);
          } else {
            // Invalid response
            api.logout();
          }
        } catch (err) {
          console.error('Auth verification failed:', err);
          // Don't auto-logout on network error, only if unauthorized response (handled by interceptor)
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        background: 'radial-gradient(circle at center, #002a80 0%, #001133 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#fff',
        fontFamily: 'sans-serif',
      }}>
        <Loader2 className="animate-spin" size={40} color="var(--gold)" />
        <span style={{ fontSize: '14px', letterSpacing: '1px', fontWeight: 600, color: '#ffe680' }}>
          VERIFYING ADMIN CREDENTIALS...
        </span>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <FileCabinet user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
