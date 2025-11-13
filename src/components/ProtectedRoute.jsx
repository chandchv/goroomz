import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  const location = useLocation();
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Reset the flag when component unmounts
    return () => {
      hasShownToast.current = false;
    };
  }, []);

  if (!user) {
    // Show toast only once using useEffect pattern
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      // Use setTimeout to ensure toast happens after render
      setTimeout(() => {
        toast({
          title: "Access Denied",
          description: "Please log in to view this page.",
          variant: "destructive",
        });
      }, 0);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      setTimeout(() => {
        toast({
          title: "Permission Denied",
          description: "You do not have permission to access this page.",
          variant: "destructive",
        });
      }, 0);
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;