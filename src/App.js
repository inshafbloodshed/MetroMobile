// App.js - Fixed version with no duplicate imports
import React, { useState, useEffect } from 'react';
import { HashRouter  as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import UnifiedLogin from './components/UnifiedLogin';
import WorkerPanel from './components/WorkerPanel';
import AdminPanel from './AdminPanel';
import { initializeDemoData, toast } from './utils/storage';
import { initDatabase } from './database/db';

// Protected Route Component for Admin
const AdminProtectedRoute = ({ children, isAuthenticated, userRole }) => {
  const location = useLocation();

  if (!isAuthenticated || userRole !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Protected Route Component for Worker
const WorkerProtectedRoute = ({ children, isAuthenticated, userRole }) => {
  const location = useLocation();

  if (!isAuthenticated || userRole !== 'worker') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route - redirects to appropriate dashboard if already logged in
const PublicRoute = ({ children, isAuthenticated, userRole }) => {
  if (isAuthenticated) {
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'worker') {
      return <Navigate to="/worker/dashboard" replace />;
    }
  }
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // Initialize database
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Database initialization error:', error);
        // Use toast from storage utility
        const { toast: showToast } = require('./utils/storage');
        showToast('⚠️ Database initialization failed. Using localStorage fallback.');
        setDbReady(true); // Continue anyway with localStorage
      }
    };
    initialize();
  }, []);

  // Initialize demo data and check session
  useEffect(() => {
    // Initialize demo data on first load
    initializeDemoData();

    // Check for existing session
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedRole = localStorage.getItem('userRole');
    const savedUser = localStorage.getItem('currentUser');

    if (savedAuth === 'true' && savedRole && savedUser) {
      setIsAuthenticated(true);
      setUserRole(savedRole);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user, role) => {
    setCurrentUser(user);
    setUserRole(role);
    setIsAuthenticated(true);

    // Save session to localStorage
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setIsAuthenticated(false);

    // Clear session from localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
  };

  // Show loading screen while database initializes
  if (!dbReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>📱 Phone Repair App</div>
          <div style={{ color: '#64748b' }}>Initializing database...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Unified Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute isAuthenticated={isAuthenticated} userRole={userRole}>
              <UnifiedLogin onLogin={handleLogin} />
            </PublicRoute>
          }
        />

        {/* Admin Login Route - Redirect to unified login */}
        <Route
          path="/admin"
          element={<Navigate to="/login" replace />}
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute isAuthenticated={isAuthenticated} userRole={userRole}>
              <AdminPanel onLogout={handleLogout} user={currentUser} />
            </AdminProtectedRoute>
          }
        />

        {/* Worker Routes */}
        <Route
          path="/worker/dashboard"
          element={
            <WorkerProtectedRoute isAuthenticated={isAuthenticated} userRole={userRole}>
              <WorkerPanel onLogout={handleLogout} user={currentUser} />
            </WorkerProtectedRoute>
          }
        />

        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;