import { useAuth } from '../contexts/AuthContext';

type StaffRole = 'front_desk' | 'housekeeping' | 'maintenance' | 'manager';
type InternalRole = 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser';

/**
 * Hook for checking user roles
 * Supports both staff roles and internal roles
 */
export function useRole() {
  const { user } = useAuth();

  /**
   * Check if user has a specific staff role
   */
  const hasStaffRole = (role: StaffRole): boolean => {
    return user?.staffRole === role;
  };

  /**
   * Check if user has any of the specified staff roles
   */
  const hasAnyStaffRole = (roles: StaffRole[]): boolean => {
    if (!user?.staffRole) return false;
    return roles.includes(user.staffRole);
  };

  /**
   * Check if user has a specific internal role
   */
  const hasInternalRole = (role: InternalRole): boolean => {
    return user?.internalRole === role;
  };

  /**
   * Check if user has any of the specified internal roles
   */
  const hasAnyInternalRole = (roles: InternalRole[]): boolean => {
    if (!user?.internalRole) return false;
    return roles.includes(user.internalRole);
  };

  /**
   * Check if user is an agent
   */
  const isAgent = (): boolean => {
    return hasInternalRole('agent');
  };

  /**
   * Check if user is a regional manager
   */
  const isRegionalManager = (): boolean => {
    return hasInternalRole('regional_manager');
  };

  /**
   * Check if user is an operations manager
   */
  const isOperationsManager = (): boolean => {
    return hasInternalRole('operations_manager');
  };

  /**
   * Check if user is a platform admin
   */
  const isPlatformAdmin = (): boolean => {
    return hasInternalRole('platform_admin');
  };

  /**
   * Check if user is a superuser
   */
  const isSuperuser = (): boolean => {
    return hasInternalRole('superuser') || user?.role === 'superuser';
  };

  /**
   * Check if user has any internal role (is an internal user)
   */
  const isInternalUser = (): boolean => {
    return !!user?.internalRole || user?.role === 'superuser';
  };

  /**
   * Check if user has any staff role (is a staff member)
   */
  const isStaffMember = (): boolean => {
    return !!user?.staffRole;
  };

  /**
   * Get the current staff role
   */
  const getStaffRole = (): StaffRole | null => {
    return user?.staffRole || null;
  };

  /**
   * Get the current internal role
   */
  const getInternalRole = (): InternalRole | null => {
    return user?.internalRole || null;
  };

  /**
   * Check if user has manager-level access or higher (for internal roles)
   * Regional Manager, Operations Manager, Platform Admin, or Superuser
   */
  const hasManagerAccess = (): boolean => {
    return hasAnyInternalRole(['regional_manager', 'operations_manager', 'platform_admin', 'superuser']) || 
           user?.role === 'superuser';
  };

  /**
   * Check if user has admin-level access (Platform Admin or Superuser)
   */
  const hasAdminAccess = (): boolean => {
    return hasAnyInternalRole(['platform_admin', 'superuser']) || user?.role === 'superuser';
  };

  /**
   * Check if user is a property owner
   * Property owners have owner/admin role but no internalRole or staffRole
   */
  const isPropertyOwner = (): boolean => {
    return (user?.role === 'owner' || user?.role === 'admin' || user?.role === 'category_owner') &&
           !user?.internalRole && !user?.staffRole;
  };

  /**
   * Check if user is property staff
   * Property staff have staffRole but no internalRole
   */
  const isPropertyStaff = (): boolean => {
    return !!user?.staffRole && !user?.internalRole;
  };

  /**
   * Get the user type based on role hierarchy
   * Priority: internalRole > role > staffRole
   * Returns: 'platform_staff' | 'property_owner' | 'property_staff' | 'external_user'
   */
  const getUserType = (): 'platform_staff' | 'property_owner' | 'property_staff' | 'external_user' => {
    if (user?.internalRole || user?.role === 'superuser') {
      return 'platform_staff';
    }
    if (user?.staffRole && !user?.internalRole) {
      return 'property_staff';
    }
    if ((user?.role === 'owner' || user?.role === 'admin' || user?.role === 'category_owner') && 
        !user?.internalRole && !user?.staffRole) {
      return 'property_owner';
    }
    return 'external_user';
  };

  return {
    hasStaffRole,
    hasAnyStaffRole,
    hasInternalRole,
    hasAnyInternalRole,
    isAgent,
    isRegionalManager,
    isOperationsManager,
    isPlatformAdmin,
    isSuperuser,
    isInternalUser,
    isStaffMember,
    getStaffRole,
    getInternalRole,
    hasManagerAccess,
    hasAdminAccess,
    isPropertyOwner,
    isPropertyStaff,
    getUserType,
  };
}
