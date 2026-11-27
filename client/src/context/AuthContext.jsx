import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('dh_token');
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('dh_token');

    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }

    api.get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('dh_token');
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('dh_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.post('/auth/register', details);
    localStorage.setItem('dh_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
