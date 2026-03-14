import React, { createContext, useContext, useState, useEffect } from 'react';
import socketService from '../services/socketService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing token on mount
    const token = localStorage.getItem('spy_admin_token');
    if (token) {
      setIsAuthenticated(true);
      socketService.connect(token);
      // user details would ideally be fetched here
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('spy_admin_token', token);
    setIsAuthenticated(true);
    setUser(userData);
    socketService.connect(token);
  };

  const logout = () => {
    localStorage.removeItem('spy_admin_token');
    setIsAuthenticated(false);
    setUser(null);
    socketService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
