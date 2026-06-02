import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as apiClient from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('codelens_token');
    const savedUser = localStorage.getItem('codelens_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('codelens_token');
        localStorage.removeItem('codelens_user');
      }
    }

    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { token: newToken, user: newUser } = await apiClient.login(email, password);

      localStorage.setItem('codelens_token', newToken);
      localStorage.setItem('codelens_user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      setLoading(true);
      const { token: newToken, user: newUser } = await apiClient.register(name, email, password);

      localStorage.setItem('codelens_token', newToken);
      localStorage.setItem('codelens_user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('codelens_token');
    localStorage.removeItem('codelens_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
