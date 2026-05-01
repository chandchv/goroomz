# Routing and Navigation Best Practices

## Critical Rule: Every Page Needs a Route AND Navigation Link

**The Golden Rule:** If users can't navigate to a page, it doesn't exist.

## Checklist for Creating New Pages

When creating any new page component, you MUST complete ALL of these steps:

### 1. Create the Page Component
```typescript
// Example: internal-management/app/pages/MyNewPage.tsx
export default function MyNewPage() {
  return <div>My New Page</div>;
}
```

### 2. Add Route Configuration
```typescript
// internal-management/app/routes.ts
route("my-new-page", "routes/my-new-page.tsx"),
```

### 3. Create Route File
```typescript
// internal-management/app/routes/my-new-page.tsx
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import MyNewPage from "../pages/MyNewPage";

export default function MyNewPageRoute() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <MyNewPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
```

### 4. Add Navigation Link

Choose ONE of these options:

#### Option A: Add to Sidebar (for property staff)
```typescript
// internal-management/app/components/Sidebar.tsx
const menuItems: MenuItem[] = [
  { 
    name: 'My New Page', 
    path: '/my-new-page', 
    icon: '📄',
    permission: 'canAccessFeature' // optional
  },
];
```

#### Option B: Add to InternalSidebar (for internal roles)
```typescript
// internal-management/app/components/InternalSidebar.tsx
const menuItems: MenuItem[] = [
  { 
    name: 'My New Page', 
    path: '/my-new-page', 
    icon: '📄',
    roles: ['platform_admin', 'superuser']
  },
];
```

#### Option C: Add to Dashboard Quick Actions
```typescript
// Example: internal-management/app/pages/SuperuserDashboardPage.tsx
<Link
  to="/my-new-page"
  className="quick-action-button"
>
  My New Page
</Link>
```

#### Option D: Add to Header Dropdown
```typescript
// internal-management/app/components/Header.tsx
<DropdownMenu.Item asChild>
  <Link to="/my-new-page">
    My New Page
  </Link>
</DropdownMenu.Item>
```

### 5. Verify Accessibility

Test that users can actually reach your page:
1. Login as the appropriate user role
2. Look for the navigation link in the UI
3. Click the link and verify the page loads
4. Check that the route is highlighted in the sidebar (if applicable)

## Common Mistakes to Avoid

### ❌ Creating a page without a route
```typescript
// DON'T DO THIS
// Created MyNewPage.tsx but forgot to add route
```

### ❌ Creating a route without navigation
```typescript
// DON'T DO THIS
// Added route to routes.ts but no way to navigate to it
```

### ❌ Adding navigation without a route
```typescript
// DON'T DO THIS
// Added sidebar link but forgot to create the route
```

### ❌ Wrong sidebar for user type
```typescript
// DON'T DO THIS
// Added internal user page to regular Sidebar instead of InternalSidebar
```

## Route Patterns

### List Pages
```
/resource-name          → List all resources
Example: /internal-users
```

### Detail Pages
```
/resource-name/:id      → View single resource
Example: /internal-users/123
```

### Create Pages
```
/resource-name/create   → Create new resource
Example: /internal-users/create
```

### Edit Pages
```
/resource-name/:id/edit → Edit existing resource
Example: /internal-users/123/edit
```

### Profile Pages
```
/my-profile            → Current user's profile
/profile               → Alternative pattern
```

## Permission-Based Navigation

### Using Role-Based Filtering
```typescript
const menuItems: MenuItem[] = [
  { 
    name: 'Admin Only Page', 
    path: '/admin-page', 
    icon: '🔐',
    internalRoles: ['platform_admin', 'superuser']
  },
];
```

### Using Permission-Based Filtering
```typescript
const menuItems: MenuItem[] = [
  { 
    name: 'Manage Users', 
    path: '/users', 
    icon: '👥',
    permission: 'canManageUsers'
  },
];
```

## Sidebar Organization

### Group Related Pages
```typescript
// Good: Organized by category
const userManagementItems: MenuItem[] = [
  { name: 'Internal Users', path: '/internal-users', icon: '👤' },
  { name: 'My Team', path: '/my-team', icon: '👥' },
  { name: 'My Profile', path: '/my-profile', icon: '👤' },
];
```

### Use Descriptive Icons
```typescript
// Good: Clear, recognizable icons
{ name: 'Dashboard', icon: '📊' }
{ name: 'Users', icon: '👥' }
{ name: 'Settings', icon: '⚙️' }
{ name: 'Reports', icon: '📈' }
```

## Testing Your Routes

### Manual Testing Checklist
- [ ] Route loads without errors
- [ ] Page renders correctly
- [ ] Navigation link is visible to appropriate users
- [ ] Active route is highlighted in sidebar
- [ ] Breadcrumbs work (if applicable)
- [ ] Back navigation works
- [ ] Deep linking works (paste URL directly)

### TypeScript Validation
```bash
# Check for TypeScript errors
npm run type-check
```

### Route Diagnostics
```typescript
// Use getDiagnostics to check for errors
getDiagnostics(['internal-management/app/routes.ts'])
```

## Quick Reference

### Files to Update When Adding a Page

1. **Page Component**: `internal-management/app/pages/YourPage.tsx`
2. **Route Config**: `internal-management/app/routes.ts`
3. **Route File**: `internal-management/app/routes/your-page.tsx`
4. **Navigation**: One of:
   - `internal-management/app/components/Sidebar.tsx`
   - `internal-management/app/components/InternalSidebar.tsx`
   - `internal-management/app/pages/[Dashboard]Page.tsx`
   - `internal-management/app/components/Header.tsx`

## Summary

**Remember:** A page without proper routing and navigation is invisible to users. Always complete the full routing setup before considering a page "done".

**The 4-Step Rule:**
1. Create Page Component
2. Add Route Configuration
3. Create Route File
4. Add Navigation Link

Follow this checklist for every new page, and your users will always be able to find and access the features you build.
