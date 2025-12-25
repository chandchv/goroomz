# Design Document: Internal User Management UI

## Overview

This design extends the GoRoomz internal management platform to provide comprehensive UI for managing internal users across all role dashboards. The backend APIs are already implemented; this design focuses on creating the frontend components, routes, and integrations needed to expose internal user management functionality to Platform Administrators and Superusers.

### Key Features

- **Internal User Management Page**: Dedicated page for viewing, creating, editing, and managing internal users
- **Role-Based Access**: Different levels of access for Superusers, Platform Admins, Regional Managers, and Operations Managers
- **Quick Actions**: Dashboard shortcuts for common user management tasks
- **User Creation Workflow**: Step-by-step form for creating new internal users with role-specific fields
- **User Profile Management**: Edit user information, roles, territories, and permissions
- **Activity Monitoring**: View user login history, performance metrics, and current online status
- **Bulk Operations**: Import multiple users via CSV and export user lists
- **Audit Trail Integration**: View all user management actions in audit logs

### Technology Stack

- **Frontend**: React + TypeScript (existing stack)
- **Routing**: React Router v7 (existing)
- **State Management**: React Context + Hooks (existing)
- **UI Components**: Tailwind CSS (existing)
- **Forms**: React Hook Form (to be added if not present)
- **File Upload**: Native HTML5 with drag-and-drop
- **Backend APIs**: Already implemented at `/api/internal/users/*`

## Architecture

### Component Hierarchy

```
InternalUserManagementPage
├── UserListView
│   ├── UserFilters (role, status, search)
│   ├── UserTable
│   │   ├── UserRow (name, email, role, status, actions)
│   │   └── OnlineStatusIndicator
│   ├── Pagination
│   └── BulkActions (export, bulk import)
├── UserCreationModal
│   ├── BasicInfoStep (name, email, phone)
│   ├── RoleSelectionStep (role dropdown with descriptions)
│   ├── RoleSpecificFields
│   │   ├── AgentFields (territory, commission rate, manager)
│   │   └── PermissionCustomization (for custom roles)
│   └── ReviewAndSubmit
├── UserEditModal
│   ├── UserInfoForm
│   ├── RoleManagement
│   ├── PermissionEditor
│   └── ActivityLog
└── UserDetailView
    ├── UserInfoCard
    ├── PerformanceMetrics (role-specific)
    ├── ActivityTimeline
    └── AuditLogSection
```

### Data Flow

1. **User List Loading**: Component mounts → Fetch users from `/api/internal/users` → Display in table with filters
2. **User Creation**: Click "Create User" → Open modal → Fill form → Submit to `/api/internal/users` → Send email → Refresh list
3. **User Edit**: Click user row → Open edit modal → Fetch user details → Update fields → Submit to `/api/internal/users/:id` → Log audit → Refresh
4. **User Deactivation**: Click deactivate → Confirm → Call `/api/internal/users/:id` with `isActive: false` → Revoke tokens → Update UI
5. **Bulk Import**: Upload CSV → Validate → Call `/api/internal/users` for each row → Display results

## Components and Interfaces

### 1. InternalUserManagementPage

Main page component for user management.

**Props**: None (uses auth context for permissions)

**State**:
- `users`: Array of internal users
- `loading`: Boolean for loading state
- `filters`: Object with role, status, search query
- `pagination`: Current page, page size, total count
- `selectedUser`: User being edited or viewed
- `showCreateModal`: Boolean for create modal visibility
- `showEditModal`: Boolean for edit modal visibility

**Key Functions**:
- `loadUsers()`: Fetch users with current filters
- `handleCreateUser()`: Open creation modal
- `handleEditUser(userId)`: Open edit modal with user data
- `handleDeactivateUser(userId)`: Deactivate user with confirmation
- `handleExport()`: Export user list to CSV/PDF
- `handleBulkImport()`: Process CSV upload

### 2. UserListView Component

Displays paginated list of internal users with filters.

**Props**:
```typescript
interface UserListViewProps {
  users: InternalUser[];
  loading: boolean;
  onEdit: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onView: (userId: string) => void;
  canEdit: boolean; // Based on user role
  canDelete: boolean; // Based on user role
}
```

**Features**:
- Sortable columns (name, role, status, last login)
- Filter by role (dropdown with all roles)
- Filter by status (active/inactive toggle)
- Search by name or email (debounced)
- Online status indicator (green dot)
- Action buttons (edit, deactivate, view details)
- Pagination controls

### 3. UserCreationModal Component

Multi-step modal for creating new internal users.

**Props**:
```typescript
interface UserCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableRoles: Role[]; // Filtered based on current user's role
  territories: Territory[]; // For agent assignment
  regionalManagers: User[]; // For agent supervisor assignment
}
```

**Steps**:
1. **Basic Information**: Name, email, phone (all required)
2. **Role Selection**: Dropdown with role descriptions
3. **Role-Specific Fields**:
   - Agent: Territory, commission rate, supervisor
   - Regional Manager: Territory assignment
   - Operations Manager: No additional fields
   - Platform Admin: No additional fields
   - Superuser: Confirmation checkbox
4. **Review**: Summary of all entered information
5. **Submit**: Create user and send credentials

**Validation**:
- Email format validation
- Phone number format validation
- Unique email check (backend)
- Commission rate range (0-100%)
- Required field validation

### 4. UserEditModal Component

Modal for editing existing internal user information.

**Props**:
```typescript
interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  canEditRole: boolean; // Based on permissions
  canEditPermissions: boolean; // Superuser only
}
```

**Sections**:
- **Basic Info**: Name, phone (email read-only)
- **Role Management**: Change role (with confirmation)
- **Territory Assignment**: For agents and regional managers
- **Commission Rate**: For agents
- **Permissions**: Granular permission checkboxes (Superuser only)
- **Status**: Active/Inactive toggle

**Features**:
- Real-time validation
- Unsaved changes warning
- Audit log preview (shows what will be logged)
- Role change impact warning

### 5. UserDetailView Component

Detailed view of a single user with performance metrics.

**Props**:
```typescript
interface UserDetailViewProps {
  userId: string;
  canEdit: boolean;
  onEdit: () => void;
}
```

**Sections**:
- **User Info Card**: Name, email, phone, role, status, last login
- **Performance Metrics** (role-specific):
  - Agent: Properties onboarded, commission earned, active leads
  - Regional Manager: Team size, regional performance, pending approvals
  - Operations Manager: Tickets handled, properties accessed
- **Activity Timeline**: Recent actions and logins
- **Audit Log**: All changes made to this user
- **Session Info**: Current sessions, IP addresses, devices

### 6. QuickActionButton Component

Reusable button for dashboard quick actions.

**Props**:
```typescript
interface QuickActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple' | 'orange';
  badge?: number; // Optional count badge
}
```

### 7. BulkImportModal Component

Modal for bulk importing users via CSV.

**Props**:
```typescript
interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (results: ImportResult) => void;
}
```

**Features**:
- CSV template download
- Drag-and-drop file upload
- File validation (format, size)
- Row-by-row validation preview
- Error highlighting
- Import progress indicator
- Success/failure summary

**CSV Format**:
```csv
name,email,phone,role,territory,commissionRate,supervisorEmail
John Doe,john@example.com,+911234567890,agent,territory-id,5.0,manager@example.com
```

### 8. OnlineStatusIndicator Component

Shows if a user is currently online.

**Props**:
```typescript
interface OnlineStatusIndicatorProps {
  userId: string;
  lastLoginAt: string;
  isOnline: boolean;
}
```

**Display**:
- Green dot + "Online" for active sessions
- Gray dot + "Last seen X minutes ago" for recent activity
- No indicator for inactive users

## API Integration

### Existing Backend Endpoints

All endpoints are already implemented. Frontend will consume:

```typescript
// User Management
GET    /api/internal/users                    // List all users
POST   /api/internal/users                    // Create user
GET    /api/internal/users/:id                // Get user details
PUT    /api/internal/users/:id                // Update user
DELETE /api/internal/users/:id                // Deactivate user
PUT    /api/internal/users/:id/permissions    // Update permissions
PUT    /api/internal/users/:id/territory      // Assign territory
GET    /api/internal/users/:id/performance    // Get performance metrics

// Role Management
GET    /api/internal/roles                    // Get available roles

// Territory Management
GET    /api/internal/territories              // Get territories for assignment

// Audit Logs
GET    /api/internal/audit/user/:userId       // Get user audit log
```

### Service Layer

Create `internalUserService.ts` (already exists, will extend):

```typescript
interface InternalUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  internalRole: 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser';
  internalPermissions: {
    canOnboardProperties: boolean;
    canApproveOnboardings: boolean;
    canManageAgents: boolean;
    canAccessAllProperties: boolean;
    canManageSystemSettings: boolean;
    canViewAuditLogs: boolean;
    canManageCommissions: boolean;
    canManageTerritories: boolean;
    canManageTickets: boolean;
    canBroadcastAnnouncements: boolean;
  };
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  internalRole: string;
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
}

interface UpdateUserRequest {
  name?: string;
  phone?: string;
  internalRole?: string;
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
  isActive?: boolean;
}

class InternalUserService {
  async getUsers(filters?: {
    role?: string;
    status?: 'active' | 'inactive';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: InternalUser[]; total: number }>;
  
  async getUserById(id: string): Promise<InternalUser>;
  
  async createUser(data: CreateUserRequest): Promise<InternalUser>;
  
  async updateUser(id: string, data: UpdateUserRequest): Promise<InternalUser>;
  
  async deactivateUser(id: string): Promise<void>;
  
  async reactivateUser(id: string): Promise<void>;
  
  async updatePermissions(id: string, permissions: Partial<InternalUser['internalPermissions']>): Promise<InternalUser>;
  
  async resetPassword(id: string): Promise<void>;
  
  async getUserPerformance(id: string): Promise<any>;
  
  async bulkImport(file: File): Promise<{ success: number; failed: number; errors: any[] }>;
  
  async exportUsers(filters?: any): Promise<Blob>;
}
```

## Routing

Add new routes to `internal-management/app/routes.ts`:

```typescript
route("internal-users", "routes/internal-users.tsx"),
route("internal-users/create", "routes/internal-users-create.tsx"),
route("internal-users/:userId", "routes/internal-user-detail.tsx"),
route("internal-users/:userId/edit", "routes/internal-user-edit.tsx"),
route("my-profile", "routes/my-profile.tsx"),
```

## Permission Matrix

| Feature | Agent | Regional Manager | Operations Manager | Platform Admin | Superuser |
|---------|-------|------------------|-------------------|----------------|-----------|
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| View team members | ✗ | ✓ (own team) | ✗ | ✗ | ✗ |
| View all users | ✗ | ✗ | ✓ (read-only) | ✓ | ✓ |
| Create users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Edit users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Deactivate users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Edit permissions | ✗ | ✗ | ✗ | ✗ | ✓ |
| Create custom roles | ✗ | ✗ | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✗ | ✓ (limited) | ✓ (full) |
| Reset passwords | ✗ | ✗ | ✗ | ✓ | ✓ |
| Bulk import | ✗ | ✗ | ✗ | ✓ | ✓ |

## Error Handling

### Validation Errors

**Email Already Exists**
- Display error message: "This email is already registered"
- Highlight email field in red
- Suggest checking if user already exists

**Invalid Commission Rate**
- Display error: "Commission rate must be between 0 and 100"
- Highlight field in red
- Show valid range

**Missing Required Fields**
- Highlight all missing fields
- Display field-level error messages
- Prevent form submission

### Permission Errors

**Insufficient Permissions**
- Display error: "You don't have permission to perform this action"
- Hide action buttons user cannot access
- Redirect to appropriate dashboard

**Role Hierarchy Violation**
- Display error: "You cannot create users with higher privileges than your own"
- Filter role dropdown to show only allowed roles

### Network Errors

**Failed to Load Users**
- Display error banner with retry button
- Show cached data if available
- Log error for debugging

**Failed to Create User**
- Display error message from backend
- Keep form data intact for retry
- Offer to save as draft

**Email Delivery Failure**
- Display warning: "User created but email failed to send"
- Provide option to resend credentials
- Show generated password for manual delivery

## Testing Strategy

### Unit Tests

**Component Tests**:
- UserListView renders correctly with data
- UserCreationModal validates form fields
- UserEditModal handles role changes
- OnlineStatusIndicator shows correct status
- BulkImportModal validates CSV format

**Service Tests**:
- internalUserService.getUsers() calls correct endpoint
- internalUserService.createUser() sends correct payload
- internalUserService.bulkImport() handles CSV parsing
- Error handling for network failures

### Integration Tests

**User Creation Flow**:
- Open modal → Fill form → Submit → Verify API call → Check success message → Verify list refresh

**User Edit Flow**:
- Click user → Open edit modal → Change role → Submit → Verify audit log → Check updated data

**Bulk Import Flow**:
- Upload CSV → Validate → Import → Check results → Verify users created

**Permission Enforcement**:
- Platform Admin cannot create Superuser
- Operations Manager sees read-only view
- Regional Manager sees only their team

### Property-Based Tests

Not applicable for this UI-focused feature. Backend property tests already exist.

## Mobile Responsiveness

- User list table converts to card layout on mobile
- Creation modal uses full-screen on mobile
- Touch-optimized buttons (min 44px height)
- Swipe gestures for table actions
- Responsive filters (collapsible on mobile)
- Stack form fields vertically on small screens

## Accessibility

- Keyboard navigation for all forms
- ARIA labels for all interactive elements
- Screen reader announcements for status changes
- Focus management in modals
- Color contrast compliance (WCAG AA)
- Error messages associated with form fields

## Performance Considerations

- Paginate user list (default 20 per page)
- Debounce search input (300ms)
- Lazy load user details on demand
- Cache role and territory lists
- Optimize table rendering with virtualization for large lists
- Compress CSV exports for large datasets
