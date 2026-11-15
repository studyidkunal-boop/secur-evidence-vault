import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('evidence_vault_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('evidence_vault_user', JSON.stringify(res.data.user));
      } else {
        setUser(null);
        localStorage.removeItem('evidence_vault_user');
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('evidence_vault_user');
      localStorage.removeItem('evidence_vault_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const userData = res.data.user;
        const token = res.data.token;
        
        setUser(userData);
        localStorage.setItem('evidence_vault_user', JSON.stringify(userData));
        if (token) {
          localStorage.setItem('evidence_vault_token', token);
        }
        return userData;
      } else {
        throw new Error(res.data.error || 'Login failed');
      }
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || 'Authentication failed. Please verify credentials.';
      setError(message);
      throw new Error(message);
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('evidence_vault_user');
      localStorage.removeItem('evidence_vault_token');
      window.location.href = '/login';
    }
  }

  function getRoleHomePath(role) {
    switch (role) {
      case 'INSPECTOR':
        return '/inspector/evidence';
      case 'DCP':
        return '/dcp/review-queue';
      case 'JUDGE':
        return '/judge/exhibits';
      default:
        return '/login';
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    getRoleHomePath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

