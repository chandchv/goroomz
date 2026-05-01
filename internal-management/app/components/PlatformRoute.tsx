import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

type InternalRole = 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser';

interface PlatformRouteProps {
  children: ReactNode;
  requiredRoles?: InternalRole[];
}

/**
 * PlatformRoute component that enforces platform staff access control.
 * Only users with internalRole can access /platform/* routes.
 * Implements Requirements 3.4, 6.2, 6.3, 6.5 from role-segregation-optimization spec.
 * 
 * Property owners and property staff will be redirected to their appropriate dashboards.
 * This ensures proper separation between platform management and property management.
 * 
 * @param children - The content to render if access is granted
 * @param requiredRoles - Array of specific internal roles required to access this route
 */
export default function PlatformRoute({ children, requiredRoles }: PlatformRouteProps) {
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

  // Must have internal role OR platform-level role to access platform routes (Requirement 6.2, 6.3)
  // Property owners attempting to access /platform/ routes should be denied
  const hasPlatformAccess = user?.internalRole || 
    (user?.role && ['superuser', 'admin', 'category_owner'].includes(user.role));
  
  if (!hasPlatformAccess) {
    // Redirect to appropriate dashboard based on user type (Requirement 5.4)
    const redirectPath = getDefaultDashboardPath(user);
    return <Navigate to={redirectPath} replace />;
  }

  // Check specific role requirements if specified
  if (requiredRoles && requiredRoles.length > 0) {
    // For users with internalRole, check against that
    if (user?.internalRole) {
      if (!requiredRoles.includes(user.internalRole)) {
        // Redirect to user's platform dashboard instead of showing error
        // This provides better UX for platform staff with insufficient permissions
        const redirectPath = getPlatformDashboardPath(user.internalRole);
        return <Navigate to={redirectPath} replace />;
      }
    } else {
      // For users with basic roles, map them to equivalent internal roles for permission checking
      const equivalentRole = getEquivalentInternalRole(user?.role);
      if (!equivalentRole || !requiredRoles.includes(equivalentRole)) {
        // Redirect to appropriate dashboard
        const redirectPath = getDefaultDashboardPath(user);
        return <Navigate to={redirectPath} replace />;
      }
    }
  }

  return <>{children}</>;
}

/**
 * Map basic roles to equivalent internal roles for permission checking
 */
function getEquivalentInternalRole(role?: string): InternalRole | null {
  switch (role) {
    case 'superuser':
      return 'superuser';
    case 'admin':
    case 'category_owner':
      return 'platform_admin';
    default:
      return null;
  }
}

/**
 * Get the appropriate dashboard path based on user type
 */
function getDefaultDashboardPath(user?: any): string {
  // Property owners and staff go to regular dashboard
  if (user?.role === 'owner' || user?.role === 'admin' || user?.role === 'category_owner') {
    return '/dashboard';
  }
  
  // Property staff go to regular dashboard
  if (user?.staffRole) {
    return '/dashboard';
  }
  
  // External users shouldn't be in internal management
  return '/dashboard';
}

/**
 * Get the appropriate platform dashboard path based on internal role
 */
function getPlatformDashboardPath(internalRole: InternalRole): string {
  switch (internalRole) {
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
      return '/dashboard';
  }
}

/**
 * Hook to check if user has platform access
 */
export function useHasPlatformAccess() {
  const { user } = useAuth();
  return !!user?.internalRole;
}

/**
 * Hook to check if user has specific platform role
 */
export function useHasInternalRole(roles: InternalRole | InternalRole[]) {
  const { user } = useAuth();
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return user?.internalRole ? roleArray.includes(user.internalRole) : false;
}