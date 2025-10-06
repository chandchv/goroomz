import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    toast({
      title: "Access Denied",
      description: "Please log in to view this page.",
      variant: "destructive",
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    toast({
      title: "Permission Denied",
      description: "You do not have permission to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;