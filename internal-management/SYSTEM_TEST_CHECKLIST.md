# System Test Checklist - Internal User Management UI

This document provides a comprehensive checklist for manually testing the internal user management feature across all roles and workflows.

## Test Environment Setup

- [ ] Backend server is running on port 5000
- [ ] Frontend server is running on port 5173
- [ ] Database is properly seeded with test users
- [ ] Test users exist for all roles (Superuser, Platform Admin, Regional Manager, Operations Manager, Agent)

## 1. Component Rendering Tests

### 1.1 InternalUserManagementPage
- [ ] Page loads without errors
- [ ] Page title "Internal User Management" is displayed
- [ ] Quick action buttons are visible (Create User, Bulk Import, Export)
- [ ] User list table renders with columns: Name, Email, Role, Status, Last Login, Actions
- [ ] Filter controls are present (Role filter, Status filter, Search box)
- [ ] Pagination controls are visible

### 1.2 Dashboard Integration
- [ ] **Superuser Dashboard**: "Create Internal User" and "Manage Internal Users" quick actions visible
- [ ] **Platform Admin Dashboard**: User management quick actions visible (excluding Superuser creation)
- [ ] **Regional Manager Dashboard**: "My Team" section displays assigned agents
- [ ] **Operations Manager Dashboard**: Read-only user list accessible
- [ ] **Agent Dashboard**: No user management features visible (correct)

### 1.3 Navigation
- [ ] Sidebar contains "Internal Users" menu item for Superuser and Platform Admin
- [ ] Sidebar contains "My Team" menu item for Regional Manager
- [ ] Sidebar contains "My Profile" menu item for all roles
- [ ] All navigation links work correctly
- [ ] Active route is highlighted in sidebar

## 2. User Creation Workflow Tests

### 2.1 Basic User Creation (as Superuser)
- [ ] Click "Create User" button opens modal
- [ ] Modal displays "Create Internal User" title
- [ ] Step 1: Basic Information form displays (Name, Email, Phone)
- [ ] All fields show validation errors when empty
- [ ] Email validation rejects invalid formats
- [ ] Phone validation rejects invalid formats
- [ ] Step 2: Role selection dropdown shows all roles including Superuser
- [ ] Step 3: Role-specific fields appear based on selection
  - [ ] Agent: Territory, Commission Rate, Supervisor fields appear
  - [ ] Regional Manager: Territory field appears
  - [ ] Operations Manager: No additional fields
  - [ ] Platform Admin: No additional fields
  - [ ] Superuser: Confirmation checkbox appears
- [ ] Step 4: Review step shows all entered information
- [ ] Submit button creates user successfully
- [ ] Success message displays
- [ ] User list refreshes with new user
- [ ] Email is sent to new user (check logs or email service)

### 2.2 User Creation (as Platform Admin)
- [ ] Role dropdown does NOT include Superuser option
- [ ] Can create Agent, Regional Manager, Operations Manager, Platform Admin
- [ ] All other functionality works same as Superuser

### 2.3 User Creation Validation
- [ ] Cannot submit with empty required fields
- [ ] Cannot submit with invalid email format
- [ ] Cannot submit with invalid phone format
- [ ] Cannot create user with duplicate email
- [ ] Commission rate must be between 0-100
- [ ] Territory selection is required for Agent role
- [ ] Supervisor selection works correctly for Agent role

## 3. User Editing Workflow Tests

### 3.1 Edit User Information
- [ ] Click user row or "Edit" button opens edit modal
- [ ] Modal displays "Edit User" title
- [ ] User's current information is pre-filled
- [ ] Can update name
- [ ] Can update phone
- [ ] Email field is read-only (cannot be changed)
- [ ] Can change role (with confirmation dialog)
- [ ] Can update territory (for agents/regional managers)
- [ ] Can update commission rate (for agents)
- [ ] Save button updates user successfully
- [ ] Success message displays
- [ ] User list refreshes with updated information
- [ ] Audit log records the change

### 3.2 Permission Editing (Superuser only)
- [ ] Permission editor section is visible for Superuser
- [ ] Permission editor is hidden for Platform Admin
- [ ] Can toggle individual permissions
- [ ] Permission descriptions are clear
- [ ] Save updates permissions successfully
- [ ] Changes are reflected immediately

### 3.3 Role Change Workflow
- [ ] Changing role shows confirmation dialog
- [ ] Confirmation dialog explains permission changes
- [ ] Confirming role change updates user
- [ ] Role-specific fields update based on new role
- [ ] Canceling role change reverts selection

## 4. User Deactivation Tests

### 4.1 Deactivate User
- [ ] "Deactivate" button is visible for active users
- [ ] Click deactivate shows confirmation dialog
- [ ] Confirmation dialog warns about access revocation
- [ ] Confirming deactivation sets user status to inactive
- [ ] User's authentication tokens are revoked
- [ ] User cannot log in after deactivation
- [ ] User's historical data is preserved
- [ ] Audit log records deactivation

### 4.2 Reactivate User
- [ ] "Reactivate" button is visible for inactive users
- [ ] Click reactivate shows confirmation dialog
- [ ] Confirming reactivation sets user status to active
- [ ] User can log in after reactivation
- [ ] User's previous data is intact

## 5. User Detail View Tests

### 5.1 Basic Information
- [ ] Click user name navigates to detail page
- [ ] User info card displays all information
- [ ] Edit button opens edit modal
- [ ] Back button returns to user list

### 5.2 Performance Metrics (Role-Specific)
- [ ] **Agent**: Shows properties onboarded, commission earned, active leads
- [ ] **Regional Manager**: Shows team size, regional performance, pending approvals
- [ ] **Operations Manager**: Shows tickets handled, properties accessed, announcements sent
- [ ] Metrics display correct values
- [ ] Metrics update when data changes

### 5.3 Activity Timeline
- [ ] Recent actions are displayed
- [ ] Login history is shown
- [ ] Date range filter works correctly
- [ ] Timeline is sorted by date (newest first)

### 5.4 Audit Log Section
- [ ] All changes to user are displayed
- [ ] Shows who made each change
- [ ] Shows when each change was made
- [ ] Shows before/after values for changes
- [ ] Filter by action type works
- [ ] Pagination works for large audit logs

## 6. Password Reset Tests

### 6.1 Reset Password Workflow
- [ ] "Reset Password" button is visible in user detail view
- [ ] Click reset password shows confirmation dialog
- [ ] Confirming reset generates new password
- [ ] Success message displays
- [ ] Email is sent to user with new credentials
- [ ] Audit log records password reset
- [ ] Shows which admin performed the reset

## 7. Bulk Operations Tests

### 7.1 Bulk Import
- [ ] Click "Bulk Import" button opens modal
- [ ] Modal displays file upload area
- [ ] "Download Template" button provides CSV template
- [ ] Drag-and-drop file upload works
- [ ] Click to browse file upload works
- [ ] CSV validation runs on upload
- [ ] Validation errors are displayed clearly
- [ ] Valid rows are shown in preview
- [ ] Import button creates all valid users
- [ ] Progress indicator shows during import
- [ ] Success/failure summary displays after import
- [ ] User list refreshes with new users

### 7.2 Export Users
- [ ] Click "Export" button opens format selection dialog
- [ ] Can select CSV format
- [ ] Can select PDF format
- [ ] Export includes current filters
- [ ] Export downloads to device
- [ ] Exported file contains correct data
- [ ] Sensitive information (passwords) is excluded

## 8. Filtering and Search Tests

### 8.1 Role Filter
- [ ] Role dropdown shows all roles
- [ ] Selecting role filters user list
- [ ] "All Roles" option shows all users
- [ ] Filter persists during pagination

### 8.2 Status Filter
- [ ] Active/Inactive toggle works
- [ ] Shows only active users when selected
- [ ] Shows only inactive users when selected
- [ ] Shows all users when neither selected

### 8.3 Search
- [ ] Search box accepts text input
- [ ] Search is debounced (doesn't search on every keystroke)
- [ ] Searches by name
- [ ] Searches by email
- [ ] Search results update correctly
- [ ] Clear search button works

### 8.4 Combined Filters
- [ ] Can combine role filter + status filter
- [ ] Can combine role filter + search
- [ ] Can combine status filter + search
- [ ] Can combine all three filters
- [ ] Filters work correctly together

## 9. Pagination Tests

### 9.1 Pagination Controls
- [ ] Page numbers display correctly
- [ ] "Previous" button works
- [ ] "Next" button works
- [ ] Can jump to specific page
- [ ] "Previous" disabled on first page
- [ ] "Next" disabled on last page

### 9.2 Page Size
- [ ] Page size selector shows options (10, 20, 50, 100)
- [ ] Changing page size updates list
- [ ] Total count displays correctly
- [ ] Pagination resets to page 1 when filters change

## 10. Permission Enforcement Tests

### 10.1 Superuser Permissions
- [ ] Can view all users including other Superusers
- [ ] Can create users with any role including Superuser
- [ ] Can edit any user
- [ ] Can deactivate any user
- [ ] Can edit granular permissions
- [ ] Can view full audit logs

### 10.2 Platform Admin Permissions
- [ ] Can view all users except Superusers (or see them read-only)
- [ ] Cannot create Superuser role
- [ ] Can create Agent, Regional Manager, Operations Manager, Platform Admin
- [ ] Can edit users up to Platform Admin level
- [ ] Can deactivate users up to Platform Admin level
- [ ] Cannot edit granular permissions
- [ ] Can view audit logs (limited)

### 10.3 Regional Manager Permissions
- [ ] Can only view own team members (agents assigned to them)
- [ ] Cannot create users
- [ ] Cannot edit users
- [ ] Cannot deactivate users
- [ ] Can view team member performance
- [ ] Cannot access user management page

### 10.4 Operations Manager Permissions
- [ ] Can view all users in read-only mode
- [ ] Cannot create users
- [ ] Cannot edit users
- [ ] Cannot deactivate users
- [ ] Can search users
- [ ] No edit/delete buttons visible

### 10.5 Agent Permissions
- [ ] Cannot access user management features
- [ ] Can only view own profile
- [ ] Cannot view other users
- [ ] No user management menu items visible

## 11. My Profile Tests

### 11.1 View Profile
- [ ] Click profile icon shows "My Profile" option
- [ ] My Profile page displays user's information
- [ ] Shows name, email, phone, role
- [ ] Shows assigned permissions
- [ ] Shows last login time
- [ ] Shows login history

### 11.2 Edit Profile
- [ ] Can update phone number
- [ ] Can update notification preferences
- [ ] Cannot change own role
- [ ] Cannot change own permissions
- [ ] Cannot change email
- [ ] Save button updates profile
- [ ] Success message displays

## 12. Online Status Tests

### 12.1 Online Status Indicator
- [ ] Green dot shows for online users
- [ ] Gray dot shows for offline users
- [ ] Tooltip shows "Online" for active users
- [ ] Tooltip shows "Last seen X minutes ago" for offline users
- [ ] Status updates in real-time (or on refresh)

### 12.2 Online Users Filter
- [ ] "Show online only" toggle works
- [ ] Shows only currently active users when enabled
- [ ] Shows all users when disabled

### 12.3 Session Information
- [ ] User detail view shows current session info
- [ ] Shows login time
- [ ] Shows IP address
- [ ] Shows device/browser information

## 13. Mobile Responsiveness Tests

### 13.1 User List (Mobile)
- [ ] Table converts to card layout on mobile
- [ ] Cards display all essential information
- [ ] Filters stack vertically
- [ ] Search box is full width
- [ ] Action buttons are touch-optimized (min 44px)
- [ ] Pagination controls are touch-friendly

### 13.2 Modals (Mobile)
- [ ] Modals use full screen on mobile
- [ ] Form fields stack vertically
- [ ] Buttons are full width
- [ ] Navigation between steps is clear
- [ ] Close button is easily accessible

### 13.3 Dashboard (Mobile)
- [ ] Quick action buttons are touch-optimized
- [ ] Cards stack vertically
- [ ] All content is readable
- [ ] No horizontal scrolling required

## 14. Error Handling Tests

### 14.1 Network Errors
- [ ] Failed API calls show error message
- [ ] Retry button is available
- [ ] Error message is clear and actionable
- [ ] Form data is preserved on error

### 14.2 Validation Errors
- [ ] Field-level errors display clearly
- [ ] Error messages are specific
- [ ] Errors clear when field is corrected
- [ ] Cannot submit form with validation errors

### 14.3 Permission Errors
- [ ] Insufficient permission shows appropriate message
- [ ] User is not able to perform unauthorized actions
- [ ] Unauthorized buttons are hidden or disabled

## 15. Loading States Tests

### 15.1 User List Loading
- [ ] Skeleton loader shows while loading
- [ ] Smooth transition to actual content
- [ ] Loading doesn't block other interactions

### 15.2 Modal Loading
- [ ] Loading spinner shows during form submission
- [ ] Submit button is disabled during loading
- [ ] Loading message is clear

### 15.3 Bulk Operations Loading
- [ ] Progress indicator shows during bulk import
- [ ] Shows percentage or count of processed items
- [ ] Cannot close modal during processing

## 16. Integration Tests

### 16.1 Dashboard to User Management
- [ ] Click "Manage Internal Users" navigates correctly
- [ ] Click "Create Internal User" opens modal
- [ ] User count on dashboard is accurate

### 16.2 User Management to User Detail
- [ ] Click user name navigates to detail page
- [ ] Back button returns to user list
- [ ] Filters are preserved when returning

### 16.3 Cross-Feature Integration
- [ ] Creating agent assigns them to territory correctly
- [ ] Agent appears in Regional Manager's team view
- [ ] Deactivating user revokes access across all features
- [ ] Audit logs appear in audit log viewer

## 17. Data Integrity Tests

### 17.1 User Creation
- [ ] User is created in database
- [ ] All fields are saved correctly
- [ ] Relationships (territory, manager) are established
- [ ] Audit log entry is created

### 17.2 User Update
- [ ] Changes are persisted to database
- [ ] Audit log records all changes
- [ ] Related data is updated (e.g., team assignments)

### 17.3 User Deactivation
- [ ] User status is updated
- [ ] Historical data is preserved
- [ ] User cannot authenticate
- [ ] Related data remains intact

## Test Results Summary

### Passed: _____ / _____
### Failed: _____ / _____
### Blocked: _____ / _____

## Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Notes

- Test Date: _______________
- Tester: _______________
- Environment: _______________
- Browser/Device: _______________

## Sign-off

- [ ] All critical tests passed
- [ ] All high-priority issues resolved
- [ ] Feature ready for production

Tester Signature: _______________ Date: _______________
