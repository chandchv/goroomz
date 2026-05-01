# Routing and Navigation Implementation

## Overview

This document describes the implementation of role-based routing and navigation for the internal user role management system.

## Implementation Summary

### Task 32.1: Create Routes for All New Pages

Created route files for all internal role dashboards:

1. **Agent Dashboard** (`/agent-dashboard`)
   - Route file: `app/routes/agent-dashboard.tsx`
   - Page component: `AgentDashboardPage`
   - Access: Agents only

2. **Regional Manager Dashboard** (`/regional-manager-dashboard`)
   - Route file: `app/routes/regional-manager-dashboard.tsx`
   - Page component: `RegionalManagerDashboardPage`
   - Access: Regional Managers only

3. **Operations Manager Dashboard** (`/operations-manager-dashboard`)
   - Route file: `app/routes/operations-manager-dashboard.tsx`
   - Page component: `OperationsManagerDashboardPage`
   - Access: Operations Managers only

4. **Platform Admin Dashboard** (`/platform-admin-dashboard`)
   - Route file: `app/routes/platform-admin-dashboard.tsx`
   - Page component: `PlatformAdminDashboardPage`
   - Access: Platform Administrators only

5. **Superuser Dashboard** (`/superuser-dashboard`)
   - Route file: `app/routes/superuser-dashboard.tsx`
   - Page component: `SuperuserDashboardPage`
   - Access: Superusers only

All routes have been registered in `app/routes.ts`.

### Task 32.2: Implement Role-Based Route Protection

Created a new `RoleProtectedRoute` component that provides:

#### Features

1. **Role-Based Access Control**
   - Accepts `allowedRoles` prop to specify which roles can access a route
   - Automatically redirects unauthorized users to their appropriate dashboard
   - Prevents privilege escalation attempts

2. **Permission-Based Access Control**
   - Accepts `requiredPermission` prop for granular permission checks
   - Checks against `user.internalPermissions` object
   - Shows access denied message if permission is missing

3. **Smart Redirection**
   - Users attempting to access unauthorized routes are redirected to their role-specific dashboard
   - No "access denied" page for role mismatches - seamless UX
   - Helper function `getRoleDashboardPath()` determines correct dashboard

4. **Loading States**
   - Shows loading spinner while authentication state is being determined
   - Prevents flash of unauthorized content

#### Component API

```typescript
interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser'>;
  requiredPermission?: string;
}
```

#### Usage Example

```typescript
<RoleProtectedRoute allowedRoles={['agent']}>
  <MainLayout>
    <AgentDashboardPage />
  </MainLayout>
</RoleProtectedRoute>
```

#### Exported Utilities

- `useRoleDashboard()` hook - Returns the appropriate dashboard path for the current user

### Home Route Updates

Updated the home route (`/`) to automatically redirect users to their role-specific dashboard:

- Agents → `/agent-dashboard`
- Regional Managers → `/regional-manager-dashboard`
- Operations Managers → `/operations-manager-dashboard`
- Platform Admins → `/platform-admin-dashboard`
- Superusers → `/superuser-dashboard`
- Property Owners/Staff → `/dashboard`

### Login Page Updates

Updated the login page to redirect to home (`/`) after successful login, which then redirects to the appropriate dashboard based on the user's role.

## Role Hierarchy

The system supports the following internal roles:

1. **Agent** - Lowest level, can onboard properties and manage leads
2. **Regional Manager** - Manages agents and territories
3. **Operations Manager** - Manages platform-wide operations
4. **Platform Admin** - Manages system configuration and users
5. **Superuser** - Highest level, complete platform access

## Security Considerations

1. **Server-Side Validation**: All role checks are also enforced on the backend via middleware
2. **Token-Based Auth**: JWT tokens contain role information
3. **Audit Logging**: All access attempts are logged via audit middleware
4. **No Client-Side Bypass**: Even if a user manipulates the frontend, backend will reject unauthorized requests

## Integration with Existing System

The new role-based routing integrates seamlessly with the existing property owner/staff system:

- Existing `ProtectedRoute` component remains for property owner features
- New `RoleProtectedRoute` component handles internal role features
- Both components work together in the same application
- Sidebar already implements role-based menu filtering

## Testing Recommendations

1. **Role Access Testing**
   - Verify each role can only access their designated dashboard
   - Test that unauthorized access attempts redirect correctly
   - Verify permission-based access control works

2. **Navigation Testing**
   - Test login flow redirects to correct dashboard
   - Test home route redirects based on role
   - Test sidebar menu items show/hide based on role

3. **Edge Cases**
   - Test behavior when user has no role assigned
   - Test behavior when token expires mid-session
   - Test behavior when user role changes

## Future Enhancements

1. **Dynamic Role Assignment**: Allow runtime role changes without re-login
2. **Role Inheritance**: Implement role hierarchy where higher roles inherit lower role permissions
3. **Custom Roles**: Support for custom roles defined by superusers
4. **Multi-Role Support**: Allow users to have multiple roles simultaneously

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 10.1-10.5**: Role-specific dashboards for each internal user type
- **Requirement 11.1**: Permission enforcement throughout the system
- **Requirement 11.5**: Role-based access control with proper permission checks

## Files Modified/Created

### Created Files
- `internal-management/app/components/RoleProtectedRoute.tsx`
- `internal-management/app/routes/agent-dashboard.tsx`
- `internal-management/app/routes/regional-manager-dashboard.tsx`
- `internal-management/app/routes/operations-manager-dashboard.tsx`
- `internal-management/app/routes/platform-admin-dashboard.tsx`
- `internal-management/app/routes/superuser-dashboard.tsx`

### Modified Files
- `internal-management/app/routes.ts` - Added new dashboard routes
- `internal-management/app/routes/home.tsx` - Added role-based redirection
- `internal-management/app/pages/LoginPage.tsx` - Updated post-login redirect

## Conclusion

The routing and navigation system now fully supports role-based access control for internal users. Each role has a dedicated dashboard, and the system automatically routes users to the appropriate interface based on their role. The implementation is secure, user-friendly, and integrates seamlessly with the existing property management system.
