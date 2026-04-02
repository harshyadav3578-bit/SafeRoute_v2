import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import PolicePage from './pages/PolicePage';
import RoutePage from './pages/RoutePage';
import SafetyPage from './pages/SafetyPage';
import ReportPage from './pages/ReportPage';

function ProtectedRoute({ children }) {
  const storedUser = localStorage.getItem('saferouteUser');
  return storedUser ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const storedUser = localStorage.getItem('saferouteUser');
  return storedUser ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/police"
          element={
            <ProtectedRoute>
              <PolicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/route"
          element={
            <ProtectedRoute>
              <RoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safety"
          element={
            <ProtectedRoute>
              <SafetyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
