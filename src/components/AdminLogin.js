import React, { useState } from 'react';
import './AdminLogin.css';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Special admin credentials
  const ADMIN_CREDENTIALS = {
    'Metroadd': 'Metro123'
  };

  // Regular admin credentials (from localStorage)
  const getRegularAdmins = () => {
    const workers = JSON.parse(localStorage.getItem('workers_list') || '[]');
    return workers.filter(w => w.role === 'admin' && w.active !== false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

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

    // Check regular admins
    const admins = getRegularAdmins();
    const admin = admins.find(w => w.username === username && w.password === password);
    
    if (admin) {
      const user = {
        username: admin.username,
        role: 'admin',
        isSpecialAdmin: false,
        displayName: admin.name || admin.username
      };
      onLogin(user, 'admin');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>🔐 Admin Login</h1>
          <p>Metro Phone Shop Management</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
        
        <div className="admin-login-footer">
          <p>Default Admin: Metroadd / Metro123</p>
        </div>
      </div>
    </div>
  );
}