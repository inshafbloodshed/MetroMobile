// UnifiedLogin.js
import React, { useState } from 'react';
import './UnifiedLogin.css';
import { load, toast } from '../utils/storage';
import { SK } from '../utils/constants';

export default function UnifiedLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ Check for admin/admin123 (special admin with 40% markup)
      if (username === 'admin' && password === 'admin123') {
        const user = {
          username: 'admin',
          role: 'admin',
          isSpecialAdmin: true,
          isDiscountAdmin: true, // Flag for 40% discount
          displayName: 'Admin',
          name: 'Admin',
          permissions: {
            salesInvoice: true,
            salesReturn: true,
            productCatalog: true,
            repairBilling: true,
            viewCostPrice: true
          }
        };
        onLogin(user, 'admin');
        setLoading(false);
        return;
      }

      // ✅ Check for Metroadd/Metro123 (main admin)
      if (username === 'Metroadd' && password === 'Metro123') {
        const user = {
          username: 'Metroadd',
          role: 'admin',
          isSpecialAdmin: true,
          isDiscountAdmin: false,
          displayName: 'Metro Admin',
          name: 'Metro Admin',
          permissions: {
            salesInvoice: true,
            salesReturn: true,
            productCatalog: true,
            repairBilling: true,
            viewCostPrice: true
          }
        };
        onLogin(user, 'admin');
        setLoading(false);
        return;
      }

      // ✅ Also allow Metroadd as worker login
      if (username === 'Metroadd' && password === 'Metro123' && role === 'worker') {
        const user = {
          username: 'Metroadd',
          role: 'worker',
          isSpecialAdmin: false,
          isDiscountAdmin: false,
          displayName: 'Metro Admin',
          name: 'Metro Admin',
          permissions: {
            salesInvoice: true,
            salesReturn: true,
            productCatalog: true,
            repairBilling: true,
            viewCostPrice: true
          }
        };
        onLogin(user, 'worker');
        setLoading(false);
        return;
      }

      // Check Admin Login from stored workers
      if (role === 'admin') {
        let workersData = [];
        try {
          const localWorkers = localStorage.getItem('workers');
          if (localWorkers) {
            workersData = JSON.parse(localWorkers);
          } else {
            workersData = await load(SK.WORKERS, []);
          }
        } catch (e) {
          console.warn('Could not load workers from storage:', e);
          workersData = [];
        }

        const workers = Array.isArray(workersData) ? workersData : [];
        const adminWorkers = workers.filter(w => w.role === 'admin' && w.active !== false);
        const admin = adminWorkers.find(w => w.username === username && w.password === password);
        
        if (admin) {
          const user = {
            username: admin.username,
            role: 'admin',
            isSpecialAdmin: false,
            isDiscountAdmin: false,
            displayName: admin.name || admin.username,
            ...admin
          };
          onLogin(user, 'admin');
          setLoading(false);
          return;
        }
        
        setError('Invalid admin username or password');
        setLoading(false);
        return;
      }

      // Check Worker Login
      if (role === 'worker') {
        let workersData = [];
        try {
          const localWorkers = localStorage.getItem('workers');
          if (localWorkers) {
            workersData = JSON.parse(localWorkers);
          } else {
            workersData = await load(SK.WORKERS, []);
          }
        } catch (e) {
          console.warn('Could not load workers from storage:', e);
          workersData = [];
        }

        const workers = Array.isArray(workersData) ? workersData : [];
        const activeWorkers = workers.filter(worker => worker.active !== false);
        const worker = activeWorkers.find(
          (entry) => entry.username === username && entry.password === password
        );

        if (worker) {
          onLogin(
            {
              username: worker.username,
              role: 'worker',
              isDiscountAdmin: false,
              displayName: worker.name || worker.username,
              ...worker,
            },
            'worker'
          );
          setLoading(false);
          return;
        } else {
          setError('Invalid worker username or password');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
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
                onClick={() => {
                  setRole('worker');
                  setError('');
                }}
                disabled={loading}
              >
                <i className="fas fa-user"></i> Worker
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setRole('admin');
                  setError('');
                }}
                disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>
        
        <div className="unified-login-footer">
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>👤 Worker: worker1 / 123</p>
            <p>👑 Admin: Metroadd / Metro123</p>
            <p>💰 Discount Admin: admin / admin123</p>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              ⚡ Note: You can also register new workers from the Admin panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}