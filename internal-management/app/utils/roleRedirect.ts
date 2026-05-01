/**
 * Get the appropriate dashboard path based on user's internal role
 */
export function getRoleDashboardPath(internalRole?: string | null, user?: any): string {
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
      // Fallback: Check if user has 'superuser' role but no internalRole
      if (user?.role === 'superuser') {
        return '/superuser-dashboard';
      }
      // For property owners and staff without internal roles
      return '/dashboard';
  }
}

/**
 * Check if current path matches user's assigned dashboard
 */
export function isOnCorrectDashboard(currentPath: string, internalRole?: string | null, user?: any): boolean {
  const correctPath = getRoleDashboardPath(internalRole, user);
  return currentPath === correctPath || currentPath.startsWith(correctPath);
}
