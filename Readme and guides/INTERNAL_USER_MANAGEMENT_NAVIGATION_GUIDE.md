# Internal User Management - Complete Navigation Guide

## Overview
This guide provides step-by-step navigation instructions for all implemented internal user management features in the GoRoomz platform.

**Base URL**: `http://localhost:5173` (or your configured frontend URL)  
**Backend URL**: `http://localhost:5000` (API server)

---

## 🔐 Prerequisites

Before accessing any internal user management features, you must:

1. **Be logged in** as a user with internal role permissions
2. **Have appropriate role**: Platform Administrator or Superuser
3. **Backend running**: Ensure backend is running on port 5000

---

## 📋 Completed Features & Navigation

### ✅ Task 1: Internal User Management Routes

**Status**: Completed  
**Routes Added**:
- `/internal-users` - User list page
- `/internal-users/create` - Create user page
- `/internal-users/:userId` - User detail page
- `/my-profile` - User profile page

---

### ✅ Task 2: Extended Internal User Service

**Status**: Completed  
**Location**: `internal-management/app/services/internalUserService.ts`

**Available Methods**:
- `getUsers()` - Fetch users with filters
- `getUserById()` - Get single user details
- `createUser()` - Create new internal user
- `updateUser()` - Update user information
- `deactivateUser()` - Deactivate user
- `reactivateUser()` - Reactivate user
- `updatePermissions()` - Update user permissions
- `resetPassword()` - Reset user password ✨ NEW
- `getUserPerformance()` - Get performance metrics
- `bulkImport()` - Import users from CSV
- `exportUsers()` - Export users to CSV

---

### ✅ Task 3: Internal User Management Page

**Navigation Path**:
```
1. Login as Platform Admin or Superuser
2. Click "Internal Users" in the sidebar
   OR
3. Navigate to: http://localhost:5173/internal-users
```

**Features Available**:
- View all internal users in a table
- Search users by name or email
- Filter by role and status
- Pagination controls
- Quick action buttons (Create, Import, Export)

**Page Location**: `internal-management/app/pages/InternalUserManagementPage.tsx`

---

### ✅ Task 4: User List View

**Navigation Path**:
```
Same as Task 3 - Integrated into Internal User Management Page
```

**Features**:
- Sortable columns (name, role, status, last login)
- Role filter dropdown
- Active/Inactive status toggle
- Search with debounce
- Online status indicators (green dot)
- Action buttons per user (Edit, Deactivate, View)
- Pagination with page size selector

**Component Location**: `internal-management/app/components/users/UserListView.tsx`

---

### ✅ Task 5: User Creation Modal

**Navigation Path**:
```
1. Go to /internal-users
2. Click "Create User" button (top right)
   OR
3. Navigate to: http://localhost:5173/internal-users/create
```

**Multi-Step Process**:
1. **Basic Information**: Name, email, phone
2. **Role Selection**: Choose from available roles
3. **Role-Specific Fields**: Territory, commission rate (for agents)
4. **Review & Submit**: Confirm all details

**Features**:
- Step-by-step wizard interface
- Real-time validation
- Role-based field visibility
- Email delivery of credentials
- Success confirmation

**Component Location**: `internal-management/app/components/users/UserCreationModal.tsx`

---

### ✅ Task 6: User Edit Modal

**Navigation Path**:
```
1. Go to /internal-users
2. Click on any user row
3. Click "Edit User" button
   OR
4. Click edit icon in user list
```

**Editable Fields**:
- Name
- Phone number
- Role (with confirmation)
- Territory assignment
- Commission rate
- Permissions (Superuser only)

**Features**:
- Tabbed interface
- Unsaved changes warning
- Role change confirmation
- Permission preview
- Audit log integration

**Component Location**: `internal-management/app/components/users/UserEditModal.tsx`

---

### ✅ Task 7: User Detail View

**Navigation Path**:
```
1. Go to /internal-users
2. Click on any user row
   OR
3. Navigate to: http://localhost:5173/internal-users/{userId}
```

**Sections Displayed**:
1. **User Info Card**: Basic details, role, status, last login
2. **Performance Metrics**: Role-specific KPIs
   - Agents: Properties, commission, leads, conversion rate
   - Regional Managers: Team size, performance, approvals
   - Operations Managers: Tickets, properties, announcements
3. **Activity Timeline**: Recent actions with date filter
4. **Audit Log**: All changes with filters (Superuser/Platform Admin only)

**Action Buttons**:
- Reset Password (yellow button) ✨ NEW
- Deactivate/Reactivate User (red/green button)
- Edit User (blue button)

**Component Location**: `internal-management/app/components/users/UserDetailView.tsx`

---

### ✅ Task 8: User Deactivation

**Navigation Path**:
```
1. Go to user detail page (/internal-users/{userId})
2. Click "Deactivate User" button
   OR
3. Click deactivate icon in user list
```

**Process**:
1. Confirmation dialog appears
2. Shows user details and warning
3. Confirms action
4. Revokes all authentication tokens
5. Preserves historical data
6. Shows success message

**Features**:
- Reactivation available for inactive users
- Cannot deactivate own account
- Platform Admins cannot deactivate Superusers
- Audit trail logged

**Component Location**: `internal-management/app/components/users/DeactivateUserDialog.tsx`

---

### ✅ Task 9: Password Reset Functionality ✨ NEW

**Navigation Path**:
```
1. Go to user detail page (/internal-users/{userId})
2. Click "Reset Password" button (yellow, with key icon)
```

**Process**:
1. **Confirmation Dialog**: Shows user details and warning
2. **Generate Password**: Creates secure 16-character password
3. **Email Notification**: Sends credentials to user's email
4. **Success Display**: Shows temporary password with copy button
5. **Audit Logging**: Records who reset the password and when

**Security Features**:
- Only visible to Platform Admins and Superusers
- Only shown for active users
- Platform Admins cannot reset Superuser passwords
- Users cannot reset their own passwords
- All actions logged in audit trail

**Components**:
- Dialog: `internal-management/app/components/users/ResetPasswordDialog.tsx`
- Backend API: `POST /api/internal/users/:id/reset-password`

**Email Content**:
- Subject: "Your GoRoomz Password Has Been Reset"
- Contains temporary password
- Security warning to change immediately
- Login URL included

---

## 🎯 Quick Access Summary

| Feature | URL | Required Role | Status |
|---------|-----|---------------|--------|
| User List | `/internal-users` | Platform Admin, Superuser | ✅ |
| Create User | `/internal-users/create` | Platform Admin, Superuser | ✅ |
| User Detail | `/internal-users/:userId` | Platform Admin, Superuser | ✅ |
| My Profile | `/my-profile` | All Internal Users | ✅ |
| Reset Password | User Detail Page | Platform Admin, Superuser | ✅ NEW |

---

## 🔍 Testing Checklist

### User List Page
- [ ] Navigate to `/internal-users`
- [ ] Verify user list loads
- [ ] Test search functionality
- [ ] Test role filter
- [ ] Test status filter
- [ ] Test pagination
- [ ] Verify online status indicators

### User Creation
- [ ] Click "Create User" button
- [ ] Fill basic information
- [ ] Select role
- [ ] Fill role-specific fields
- [ ] Submit form
- [ ] Verify success message
- [ ] Check email delivery

### User Detail View
- [ ] Click on a user
- [ ] Verify all sections load
- [ ] Check performance metrics display
- [ ] Test activity timeline filters
- [ ] Test audit log filters (if authorized)
- [ ] Verify action buttons appear

### Password Reset ✨ NEW
- [ ] Navigate to user detail page
- [ ] Verify "Reset Password" button appears (yellow)
- [ ] Click reset password button
- [ ] Verify confirmation dialog
- [ ] Confirm reset
- [ ] Verify success message
- [ ] Check temporary password display
- [ ] Test copy to clipboard
- [ ] Verify email sent
- [ ] Check audit log entry

### User Deactivation
- [ ] Click "Deactivate User"
- [ ] Verify confirmation dialog
- [ ] Confirm deactivation
- [ ] Verify user status changes
- [ ] Test reactivation
- [ ] Verify audit log entry

### User Editing
- [ ] Click "Edit User"
- [ ] Modify user details
- [ ] Change role (test confirmation)
- [ ] Save changes
- [ ] Verify updates applied
- [ ] Check audit log

---

## 🚀 Backend API Endpoints

### User Management
```
GET    /api/internal/users                    - List users
POST   /api/internal/users                    - Create user
GET    /api/internal/users/:id                - Get user details
PUT    /api/internal/users/:id                - Update user
DELETE /api/internal/users/:id                - Deactivate user
PUT    /api/internal/users/:id/permissions    - Update permissions
PUT    /api/internal/users/:id/territory      - Assign territory
GET    /api/internal/users/:id/performance    - Get performance
POST   /api/internal/users/:id/reset-password - Reset password ✨ NEW
```

---

## 🎨 UI Components Reference

### Pages
- `InternalUserManagementPage.tsx` - Main user management page
- `MyProfilePage.tsx` - User profile page

### Components
- `UserListView.tsx` - User list table with filters
- `UserCreationModal.tsx` - Multi-step user creation
- `UserEditModal.tsx` - User editing interface
- `UserDetailView.tsx` - Detailed user information
- `DeactivateUserDialog.tsx` - Deactivation confirmation
- `ResetPasswordDialog.tsx` - Password reset dialog ✨ NEW

### Services
- `internalUserService.ts` - All user management API calls

---

## 🔒 Permission Matrix

| Action | Agent | Regional Manager | Operations Manager | Platform Admin | Superuser |
|--------|-------|------------------|-------------------|----------------|-----------|
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all users | ✗ | ✗ | ✓ (read-only) | ✓ | ✓ |
| Create users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Edit users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Deactivate users | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Reset passwords | ✗ | ✗ | ✗ | ✓ (up to Admin) | ✓ (all roles) |
| Edit permissions | ✗ | ✗ | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✗ | ✓ (limited) | ✓ (full) |

---

## 📝 Notes

1. **Email Configuration**: Ensure email service is configured in backend for password reset emails
2. **Audit Logging**: All user management actions are automatically logged
3. **Session Management**: Deactivated users have tokens revoked immediately
4. **Data Preservation**: Deactivation is soft delete - all data is preserved
5. **Password Security**: Reset passwords are cryptographically secure (16 characters)

---

## 🐛 Troubleshooting

### Cannot see "Internal Users" menu
- Verify you're logged in as Platform Admin or Superuser
- Check sidebar navigation permissions

### Password reset button not visible
- Verify user is active
- Verify you have Platform Admin or Superuser role
- Cannot reset Superuser passwords as Platform Admin

### Email not received
- Check backend email configuration
- Verify email service is running
- Use backup password displayed in success dialog

### Cannot deactivate user
- Cannot deactivate own account
- Platform Admins cannot deactivate Superusers
- Verify user exists and is active

---

## 📚 Related Documentation

- [TASK_9_PASSWORD_RESET_SUMMARY.md](./TASK_9_PASSWORD_RESET_SUMMARY.md) - Password reset implementation details
- [INTERNAL_USER_ROUTES_SETUP.md](./internal-management/INTERNAL_USER_ROUTES_SETUP.md) - Routing configuration
- [ROUTING_BEST_PRACTICES.md](./internal-management/ROUTING_BEST_PRACTICES.md) - Routing guidelines

---

**Last Updated**: November 21, 2025  
**Version**: 1.0  
**Status**: All features implemented and tested ✅
