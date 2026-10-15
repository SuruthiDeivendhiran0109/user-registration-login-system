import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          <Shield className="w-6 h-6 text-sky-400 absolute" />
        </div>
        <p className="text-slate-400 text-sm animate-pulse">Authenticating your secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and preserve attempted target location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
