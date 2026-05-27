// ============================================================
// src/components/LoginPage.jsx
// LoginPage component for ROWSC Student Management Portal
// ============================================================
import React, { useState } from 'react';
import { api } from '../api/client';
import { Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';

export const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.login(username, password);
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Login submit error:', err);
      setError(err.response?.data?.error || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cabinet-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="cabinet-container" style={{ maxWidth: '450px', padding: '40px 30px' }}>
        <div className="cabinet-header" style={{ marginBottom: '20px', borderBottom: 'none' }}>
          <div className="logo-plate" style={{ width: '100%' }}>
            <h1 style={{ fontSize: '20px' }}>ROWSC PORTAL</h1>
            <p>Raphael O. Wheatley Skill Center</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(214, 40, 40, 0.15)', borderColor: '#d62828' }}>
              <AlertCircle size={20} color="#ff8888" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#ffcccc' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>ADMIN USERNAME / EMAIL</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Username or email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 42px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 42px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-gold"
            disabled={loading}
            style={{
              padding: '14px',
              fontSize: '15px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? 'AUTHENTICATING...' : (
              <>
                <ShieldAlert size={18} />
                ENTER DIGITAL PORTAL
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            RESTRICTED ADMIN ACCESS
          </p>
        </div>
      </div>
    </div>
  );
};
