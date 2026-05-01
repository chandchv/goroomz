# Superuser Menu Implementation

## Overview
Implemented a dedicated "Superuser Dashboard" menu item with custom permission checking to ensure it only appears for superusers.

## Implementation Details

### 1. Menu Item Configuration
```typescript
{
  name: 'Superuser Dashboard',
  path: '/superuser-dashboard',
  icon: '🛡️',
  permission: 'is_superuser'
}
```

### 2. Permission Checking Logic
Added special handling in the `hasPermission` function:

```typescript
const hasPermission = (item: MenuItem): boolean => {
  // Special check for is_superuser permission
  if (item.permission === 'is_superuser') {
    return user?.internalRole === 'superuser';
  }
  
  // ... other permission checks
}
```

### 3. Menu Placement
- Located in the **Administration** section
- Appears at the top of admin items
- Only visible to users with `internalRole === 'superuser'`

### 4. Visual Design
- Uses shield icon (🛡️) to distinguish from regular dashboard
- Follows the same styling as other menu items
- Appears in the sidebar navigation

## Permission Types Supported

The sidebar now supports three types of permission checks:

1. **Custom Permissions** (e.g., `is_superuser`)
   - Checked first with custom logic
   - Example: `permission: 'is_superuser'`

2. **Internal Role Requirements**
   - Checks if user has specific internal roles
   - Example: `internalRoles: ['superuser', 'platform_admin']`

3. **Staff Permissions**
   - Checks staff-level permissions
   - Example: `permission: 'canManageStaff'`

4. **Internal Permissions**
   - Checks internal permission flags
   - Example: `internalPermission: 'canAccessAllProperties'`

## Usage Example

To add a menu item with custom permission:

```typescript
{
  name: 'Menu Item Name',
  path: '/path',
  icon: '🔧',
  permission: 'custom_permission_name'
}
```

Then add the check in `hasPermission`:

```typescript
if (item.permission === 'custom_permission_name') {
  return /* your custom logic */;
}
```

## Route Protection

The route is protected using `RoleProtectedRoute`:

```typescript
<RoleProtectedRoute allowedRoles={['superuser']}>
  <MainLayout>
    <SuperuserDashboardPage />
  </MainLayout>
</RoleProtectedRoute>
```

This ensures that even if someone tries to access the URL directly, they'll be redirected if they don't have the superuser role.

## Testing

To test the implementation:

1. **As Superuser:**
   - Login with superuser credentials
   - Check sidebar - "Superuser Dashboard" should appear in Administration section
   - Click the menu item - should navigate to enhanced dashboard

2. **As Other Roles:**
   - Login with non-superuser credentials (platform_admin, operations_manager, etc.)
   - Check sidebar - "Superuser Dashboard" should NOT appear
   - Try accessing `/superuser-dashboard` directly - should be redirected

3. **As Regular Staff:**
   - Login with staff credentials
   - Check sidebar - Should only see property management features
   - No internal or admin sections should be visible
