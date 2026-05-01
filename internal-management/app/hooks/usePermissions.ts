import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for checking user permissions
 * Supports both staff permissions and internal role permissions
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Check if user has a specific staff permission
   */
  const hasStaffPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions[permission as keyof typeof user.permissions] === true;
  };

  /**
   * Check if user has a specific internal role permission
   */
  const hasInternalPermission = (permission: string): boolean => {
    if (!user?.internalPermissions) return false;
    return user.internalPermissions[permission as keyof typeof user.internalPermissions] === true;
  };

  /**
   * Check if user has any of the specified staff permissions
   */
  const hasAnyStaffPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasStaffPermission(permission));
  };

  /**
   * Check if user has all of the specified staff permissions
   */
  const hasAllStaffPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasStaffPermission(permission));
  };

  /**
   * Check if user has any of the specified internal permissions
   */
  const hasAnyInternalPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasInternalPermission(permission));
  };

  /**
   * Check if user has all of the specified internal permissions
   */
  const hasAllInternalPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasInternalPermission(permission));
  };

  /**
   * Check if user has any permission (staff or internal)
   */
  const hasAnyPermission = (staffPermissions: string[] = [], internalPermissions: string[] = []): boolean => {
    return hasAnyStaffPermission(staffPermissions) || hasAnyInternalPermission(internalPermissions);
  };

  /**
   * Check if user can create internal users
   * Platform Admins can create users up to Admin level
   * Superusers can create any role including Superuser
   */
  const canCreateUsers = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can create a specific role
   * Platform Admins cannot create Superusers
   * Superusers can create any role
   */
  const canCreateRole = (targetRole: string): boolean => {
    if (!user?.internalRole) return false;
    
    // Superusers can create any role
    if (user.internalRole === 'superuser') return true;
    
    // Platform Admins can create any role except Superuser
    if (user.internalRole === 'platform_admin') {
      return targetRole !== 'superuser';
    }
    
    return false;
  };

  /**
   * Check if user can edit internal users
   * Platform Admins can edit users up to Admin level
   * Superusers can edit any user
   * Regional Managers cannot edit users
   * Operations Managers cannot edit users
   */
  const canEditUsers = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can edit a specific user
   * Platform Admins cannot edit Superusers
   * Superusers can edit any user
   * Users cannot edit themselves (role/permissions)
   */
  const canEditUser = (targetUserId: string, targetUserRole?: string): boolean => {
    if (!user?.internalRole) return false;
    
    // Users cannot edit themselves (for role/permission changes)
    if (user.id === targetUserId) return false;
    
    // Superusers can edit any user
    if (user.internalRole === 'superuser') return true;
    
    // Platform Admins can edit any user except Superusers
    if (user.internalRole === 'platform_admin') {
      return targetUserRole !== 'superuser';
    }
    
    return false;
  };

  /**
   * Check if user can deactivate internal users
   * Same rules as editing users
   */
  const canDeactivateUsers = (): boolean => {
    return canEditUsers();
  };

  /**
   * Check if user can deactivate a specific user
   * Same rules as editing a specific user
   */
  const canDeactivateUser = (targetUserId: string, targetUserRole?: string): boolean => {
    return canEditUser(targetUserId, targetUserRole);
  };

  /**
   * Check if user can view audit logs
   * Platform Admins have limited access
   * Superusers have full access
   */
  const canViewAuditLogs = (): boolean => {
    if (!user?.internalRole) return false;
    
    // Check internal permissions first
    if (user.internalPermissions?.canViewAuditLogs) return true;
    
    // Platform Admins and Superusers can view audit logs
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can view full audit logs (including sensitive actions)
   * Only Superusers have full access
   */
  const canViewFullAuditLogs = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'superuser';
  };

  /**
   * Check if user can edit custom permissions
   * Only Superusers can edit granular permissions
   */
  const canEditPermissions = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'superuser';
  };

  /**
   * Check if user can reset passwords
   * Platform Admins and Superusers can reset passwords
   */
  const canResetPasswords = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can bulk import users
   * Platform Admins and Superusers can bulk import
   */
  const canBulkImportUsers = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can export user lists
   * Platform Admins and Superusers can export
   */
  const canExportUsers = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'platform_admin' || user.internalRole === 'superuser';
  };

  /**
   * Check if user can view all internal users
   * Platform Admins, Superusers, and Operations Managers can view all users
   * Regional Managers can only view their team
   */
  const canViewAllUsers = (): boolean => {
    if (!user?.internalRole) return false;
    return ['platform_admin', 'superuser', 'operations_manager'].includes(user.internalRole);
  };

  /**
   * Check if user can view their team members
   * Regional Managers can view their team
   */
  const canViewTeam = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'regional_manager';
  };

  /**
   * Check if user has read-only access to user management
   * Operations Managers have read-only access
   */
  const hasReadOnlyUserAccess = (): boolean => {
    if (!user?.internalRole) return false;
    return user.internalRole === 'operations_manager';
  };

  /**
   * Get the current user's role
   */
  const getCurrentUserRole = (): string | null => {
    return user?.internalRole || null;
  };

  /**
   * Get the current user's ID
   */
  const getCurrentUserId = (): string | null => {
    return user?.id || null;
  };

  return {
    hasStaffPermission,
    hasInternalPermission,
    hasAnyStaffPermission,
    hasAllStaffPermissions,
    hasAnyInternalPermission,
    hasAllInternalPermissions,
    hasAnyPermission,
    // User management specific permissions
    canCreateUsers,
    canCreateRole,
    canEditUsers,
    canEditUser,
    canDeactivateUsers,
    canDeactivateUser,
    canViewAuditLogs,
    canViewFullAuditLogs,
    canEditPermissions,
    canResetPasswords,
    canBulkImportUsers,
    canExportUsers,
    canViewAllUsers,
    canViewTeam,
    hasReadOnlyUserAccess,
    getCurrentUserRole,
    getCurrentUserId,
  };
}
