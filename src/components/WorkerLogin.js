import React, { useState } from 'react';
import './WorkerLogin.css';
import { load } from '../utils/storage';
import { SK } from '../utils/constants';

export default function WorkerLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const workers = load(SK.WORKERS, []).filter((worker) => worker.active !== false);
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
      setError('Invalid username or password');
    }
  };

  return (
    <div className="worker-login-container">
      <div className="worker-login-card">
        <div className="worker-login-header">
          <h1>🔐 Worker Login</h1>
          <p>Metro Phone Shop Management</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter worker username"
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
            Login
          </button>
        </form>

        <div className="worker-login-footer">
          <p>Demo worker: worker1 / 123</p>
        </div>
      </div>
    </div>
  );
}
