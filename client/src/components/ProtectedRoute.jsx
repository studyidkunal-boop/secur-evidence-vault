import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading, getRoleHomePath } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono tracking-wider text-slate-400">
          VALIDATING CRYPTOGRAPHIC CREDENTIALS...
        </p>
      </div>
    );
  }

  // 1. Not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role unauthorized -> redirect to own dashboard with access denied toast state
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const ownHome = getRoleHomePath(user.role);
    return (
      <Navigate
        to={ownHome}
        state={{
          accessDenied: true,
          attemptedPath: location.pathname,
          requiredRoles: allowedRoles,
        }}
        replace
      />
    );
  }

  return children;
}
