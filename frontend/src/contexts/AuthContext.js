import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = apiService.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with server and get user data
      const response = await apiService.getCurrentUser();
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, remove it
        apiService.removeToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token is invalid, remove it
      apiService.removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials, isLoginMode = true) => {
    try {
      setIsLoading(true);
      
      const response = isLoginMode 
        ? await apiService.login(credentials)
        : await apiService.register(credentials);

      // Both login and register return { message, token, user } on success
      if (response.user && response.token) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Authentication failed' };
      }
    } catch (error) {
      console.error('Login/Register failed:', error);
      return { 
        success: false, 
        message: error.message || 'Authentication failed. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const refreshUserData = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.user) {
        setUser(response.user);
        return response.user;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
    return null;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUserData,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
