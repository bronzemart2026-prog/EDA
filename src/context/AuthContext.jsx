import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '../utils/api';
import { authService } from '../utils/supabaseService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login state on load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('somiti_token');
      if (token) {
        try {
          const profile = await apiRequest('/api/auth/me');
          setUser(profile);
        } catch (error) {
          console.error('Session validation failed:', error);
          localStorage.removeItem('somiti_token');
          localStorage.removeItem('somiti_user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { identifier, username: identifier, password }
      });
      
      localStorage.setItem('somiti_token', data.token);
      localStorage.setItem('somiti_user', JSON.stringify({
        _id: data._id,
        name: data.name,
        username: data.username,
        role: data.role
      }));
      
      setUser(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('somiti_token');
    localStorage.removeItem('somiti_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await apiRequest('/api/auth/me');
      setUser(profile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
