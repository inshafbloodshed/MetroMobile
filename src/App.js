// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import UnifiedLogin from './components/UnifiedLogin';
import WorkerPanel from './components/WorkerPanel';
import AdminPanel from './AdminPanel';
import { initializeDemoData } from './utils/storage';

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