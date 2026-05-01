import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDashboardPath } from '../utils/roleRedirect';

/**
 * Home route that redirects users to their appropriate dashboard
 * based on their role (internal role or property owner/staff)
 */
export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect to role-specific dashboard
        const dashboardPath = getRoleDashboardPath(user.internalRole, user);
        navigate(dashboardPath, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
