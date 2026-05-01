import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requirePropertyOwner?: boolean;
  requirePropertyStaff?: boolean;
  requirePlatformStaff?: boolean;
}

/**
 * ProtectedRoute component that enforces authentication and user type-based access control.
 * Implements the role segregation design from the role-segregation-optimization spec.
 * 
 * @param children - The content to render if access is granted
 * @param requiredPermission - Specific permission required (checks appropriate permission set based on user type)
 * @param requirePropertyOwner - Only allow property owners
 * @param requirePropertyStaff - Only allow property staff
 * @param requirePlatformStaff - Only allow platform staff (use PlatformRoute for /platform/* routes)
 */
export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  requirePropertyOwner = false,
  requirePropertyStaff = false,
  requirePlatformStaff = false
}: ProtectedRouteProps) {
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

  // Determine user type using the design document's classification logic
  const userType = getUserType(user);

  // Check platform staff requirement
  if (requirePlatformStaff && userType !== 'platform_staff') {
    const redirectPath = getDefaultDashboardPath(user, userType);
    return <Navigate to={redirectPath} replace />;
  }

  // Check property owner requirement
  if (requirePropertyOwner && userType !== 'property_owner') {
    const redirectPath = getDefaultDashboardPath(user, userType);
    return <Navigate to={redirectPath} replace />;
  }

  // Check property staff requirement
  if (requirePropertyStaff && userType !== 'property_staff') {
    const redirectPath = getDefaultDashboardPath(user, userType);
    return <Navigate to={redirectPath} replace />;
  }

  // Check for required permission if specified
  if (requiredPermission) {
    let hasPermission = false;
    
    // Use appropriate permission set based on user type (following design document)
    // Priority: internalPermissions for platform staff, permissions for property ecosystem
    if (userType === 'platform_staff' && user?.internalPermissions) {
      hasPermission = user.internalPermissions[requiredPermission as keyof typeof user.internalPermissions] || false;
    } else if ((userType === 'property_staff' || userType === 'property_owner') && user?.permissions) {
      hasPermission = user.permissions[requiredPermission as keyof typeof user.permissions] || false;
    }
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500 mb-4">
              Required permission: {requiredPermission} | User type: {userType}
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
 * Determine user type based on role fields.
 * Implements the user type classification logic from the design document.
 * 
 * Priority order (Requirement 1.2):
 * 1. internalRole (platform staff)
 * 2. role (property owner)
 * 3. staffRole (property staff)
 * 4. external_user (fallback)
 * 
 * @param user - The user object from auth context
 * @returns User type classification
 */
function getUserType(user?: any): 'platform_staff' | 'property_owner' | 'property_staff' | 'external_user' {
  if (!user) return 'external_user';
  
  // Priority 1: Check for platform staff role (internalRole) or superuser role
  if (user.internalRole || user.role === 'superuser') {
    return 'platform_staff';
  }
  
  // Priority 2: Check for property owner role
  if (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner') {
    return 'property_owner';
  }
  
  // Priority 3: Check for property staff role
  if (user.staffRole) {
    return 'property_staff';
  }
  
  // Fallback: External user (shouldn't be in internal management)
  return 'external_user';
}

/**
 * Get the appropriate default dashboard path based on user type.
 * Implements Requirement 5.4: redirect users to their default dashboard.
 * 
 * @param user - The user object from auth context
 * @param userType - Optional pre-calculated user type
 * @returns Dashboard path for the user
 */
function getDefaultDashboardPath(user?: any, userType?: string): string {
  const type = userType || getUserType(user);
  
  switch (type) {
    case 'platform_staff':
      // Platform staff get role-specific dashboards
      return getPlatformDashboardPath(user?.internalRole, user);
    case 'property_owner':
    case 'property_staff':
      // Property ecosystem users get the standard dashboard
      return '/dashboard';
    case 'external_user':
    default:
      // External users shouldn't be here, but redirect to dashboard
      return '/dashboard';
  }
}

/**
 * Get the appropriate platform dashboard path based on internal role.
 * Each platform staff role has a dedicated dashboard.
 * 
 * @param internalRole - The internal role of the platform staff member
 * @returns Dashboard path for the specific role
 */
function getPlatformDashboardPath(internalRole?: string, user?: any): string {
  // Handle superuser role even if internalRole is not set
  if (internalRole === 'superuser' || (!internalRole && user?.role === 'superuser')) {
    return '/superuser-dashboard';
  }
  
  switch (internalRole) {
    case 'agent':
      return '/agent-dashboard';
    case 'regional_manager':
      return '/regional-manager-dashboard';
    case 'operations_manager':
      return '/operations-manager-dashboard';
    case 'platform_admin':
      return '/platform-admin-dashboard';
    default:
      return '/dashboard';
  }
}

/**
 * Hook to get the current user's type classification.
 * Useful for conditional rendering based on user type.
 * 
 * @returns The user type classification
 */
export function useUserType() {
  const { user } = useAuth();
  return getUserType(user);
}

/**
 * Hook to get the default dashboard path for the current user.
 * Useful for navigation and redirects.
 * 
 * @returns The default dashboard path
 */
export function useDefaultDashboard() {
  const { user } = useAuth();
  return getDefaultDashboardPath(user);
}

/**
 * Hook to check if the current user is a property owner.
 * 
 * @returns True if user is a property owner
 */
export function useIsPropertyOwner() {
  const userType = useUserType();
  return userType === 'property_owner';
}

/**
 * Hook to check if the current user is platform staff.
 * 
 * @returns True if user is platform staff
 */
export function useIsPlatformStaff() {
  const userType = useUserType();
  return userType === 'platform_staff';
}

/**
 * Hook to check if the current user is property staff.
 * 
 * @returns True if user is property staff
 */
export function useIsPropertyStaff() {
  const userType = useUserType();
  return userType === 'property_staff';
}
