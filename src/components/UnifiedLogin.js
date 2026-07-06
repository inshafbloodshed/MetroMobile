// UnifiedLogin.js
import React, { useState } from 'react';
import './UnifiedLogin.css';
import { load } from '../utils/storage';
import { SK } from '../utils/constants';

export default function UnifiedLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('worker'); // 'worker' or 'admin'

  // Special admin credentials
  const ADMIN_CREDENTIALS = {
    'Metroadd': 'Metro123'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Check Admin Login
    if (role === 'admin') {
      // Check special admin first
      if (ADMIN_CREDENTIALS[username] && ADMIN_CREDENTIALS[username] === password) {
        const user = {
          username: username,
          role: 'admin',
          isSpecialAdmin: true,
          displayName: 'Metro Admin'
        };
        onLogin(user, 'admin');
        return;
      }

      // Check regular admins from storage
      const workers = load(SK.WORKERS, []).filter(w => w.role === 'admin' && w.active !== false);
      const admin = workers.find(w => w.username === username && w.password === password);
      
      if (admin) {
        const user = {
          username: admin.username,
          role: 'admin',
          isSpecialAdmin: false,
          displayName: admin.name || admin.username,
          ...admin
        };
        onLogin(user, 'admin');
        return;
      }
      
      setError('Invalid admin username or password');
      return;
    }

    // Check Worker Login
    if (role === 'worker') {
      const workers = load(SK.WORKERS, []).filter(worker => worker.active !== false);
      const worker = workers.find(
        (entry) => entry.username === username && entry.password === password
      );

      if (worker) {
        onLogin(
          {
            username: worker.username,
            role: 'worker',
            displayName: worker.name || worker.username,
            ...worker,
          },
          'worker'
        );
      } else {
        setError('Invalid worker username or password');
      }
    }
  };

  return (
    <div className="unified-login-container">
      <div className="unified-login-card">
        <div className="unified-login-header">
          <h1>🔐 Metro Phone Shop</h1>
          <p>Login to your account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Login As</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'worker' ? 'active' : ''}`}
                onClick={() => setRole('worker')}
              >
                <i className="fas fa-user"></i> Worker
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
              >
                <i className="fas fa-user-shield"></i> Admin
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={`Enter ${role} username`}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-btn">
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
        
        <div className="unified-login-footer">
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>👤 Worker: worker1 / 123</p>
            <p>👑 Admin: Metroadd / Metro123</p>
          </div>
        </div>
      </div>
    </div>
  );
}