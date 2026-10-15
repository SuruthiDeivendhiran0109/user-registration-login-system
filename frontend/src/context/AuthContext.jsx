import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize CSRF and verify existing Spring Security session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      // First ensure CSRF cookie is initialized
      await api.getCsrf();

      // Retrieve current authenticated user profile directly from MySQL via Spring Security
      const response = await api.getCurrentUser();
      
      if (isMounted) {
        if (response.success && response.data?.user) {
          setUser(response.data.user);
          setAuthError(null);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update session state upon successful backend login
  const loginUser = (userData) => {
    setUser(userData);
    setAuthError(null);
  };

  // Perform secure logout by invalidating the server session
  const logoutUser = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      setUser(null);
    }
  };

  // Explicitly refresh profile data directly from MySQL
  const refreshProfile = async () => {
    const response = await api.getCurrentUser();
    if (response.success && response.data?.user) {
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    }
    return { success: false, error: response.error };
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    authError,
    loginUser,
    logoutUser,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
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
