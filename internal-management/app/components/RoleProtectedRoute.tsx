import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser'>;
  requiredPermission?: string;
}

/**
 * RoleProtectedRoute component that enforces role-based access control
 * and redirects users to their appropriate dashboard based on their role.
 * 
 * @param children - The content to render if access is granted
 * @param allowedRoles - Array of roles that are allowed to access this route
 * @param requiredPermission - Specific permission required to access this route
 */
export default function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  requiredPermission 
}: RoleProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for required role if specified
  if (allowedRoles && allowedRoles.length > 0) {
    let userRole = user?.internalRole;
    
    // Fallback: If no internalRole but user has old 'admin' or 'superuser' role, treat as superuser
    if (!userRole && (user?.role === 'admin' || user?.role === 'superuser')) {
      userRole = 'superuser';
    }
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect to user's appropriate dashboard instead of showing access denied
      const redirectPath = getRoleDashboardPath(userRole, user);
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check for required permission if specified
  if (requiredPermission && user?.internalPermissions) {
    const hasPermission = user.internalPermissions[requiredPermission as keyof typeof user.internalPermissions];
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * Get the appropriate dashboard path based on user's internal role
 */
function getRoleDashboardPath(role?: string | null, user?: any): string {
  switch (role) {
    case 'agent':
      return '/agent-dashboard';
    case 'regional_manager':
      return '/regional-manager-dashboard';
    case 'operations_manager':
      return '/operations-manager-dashboard';
    case 'platform_admin':
      return '/platform-admin-dashboard';
    case 'superuser':
      return '/superuser-dashboard';
    default:
      // Fallback: Check if user has old 'admin' or 'superuser' role (treat as superuser)
      if (user?.role === 'admin' || user?.role === 'superuser') {
        return '/superuser-dashboard';
      }
      // For property owners and staff, redirect to regular dashboard
      return '/dashboard';
  }
}

/**
 * Hook to get the user's appropriate dashboard path
 */
export function useRoleDashboard() {
  const { user } = useAuth();
  return getRoleDashboardPath(user?.internalRole);
}
