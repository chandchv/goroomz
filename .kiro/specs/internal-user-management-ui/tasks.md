# Implementation Plan: Internal User Management UI

## Overview

This implementation plan adds comprehensive internal user management UI to the GoRoomz internal management platform. The backend APIs are already fully implemented; this plan focuses on creating frontend components, routes, and integrations to expose user management functionality across all internal role dashboards.

**Current State**: Backend APIs exist at `/api/internal/users/*` but frontend lacks proper integration. Components `InternalUserList` and `InternalUserForm` exist but are not routed or integrated into dashboards.

**Goal**: Enable Platform Administrators and Superusers to create, manage, and monitor internal users through a comprehensive UI accessible from their dashboards.

## ⚠️ IMPORTANT ROUTING REMINDER

**For ALL tasks that create new pages or components:**
- Every new page MUST have a corresponding route added to `internal-management/app/routes.ts`
- Every new page MUST be accessible via navigation (Sidebar, InternalSidebar, or dashboard links)
- Pages without proper routing and navigation links are inaccessible and wasted effort
- Always verify that users can actually navigate to the pages you create

**Before marking a page-creation task as complete, verify:**
1. ✅ Route exists in routes.ts
2. ✅ Route file exists in app/routes/
3. ✅ Navigation link exists in Sidebar/InternalSidebar OR dashboard quick actions
4. ✅ User can navigate to the page from the UI

## Task Breakdown

- [x] 1. Add internal user management routes







  - [x] 1.1 Add routes to internal-management/app/routes.ts

    - Add route for internal-users list page
    - Add route for internal-users create page
    - Add route for internal-user detail page
    - Add route for internal-user edit page
    - Add route for my-profile page
    - Update internal-management/app/routes.ts
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create route files for internal user management


    - Create internal-management/app/routes/internal-users.tsx (list page)
    - Create internal-management/app/routes/internal-users-create.tsx (create page)
    - Create internal-management/app/routes/internal-user-detail.tsx (detail page)
    - Create internal-management/app/routes/my-profile.tsx (profile page)
    - _Requirements: 1.1, 13.1_

- [x] 2. Extend internalUserService with missing methods





  - [x] 2.1 Add user management methods to service


    - Add getUsers() with filtering and pagination
    - Add getUserById() for detail view
    - Add createUser() for user creation
    - Add updateUser() for editing
    - Add deactivateUser() and reactivateUser()
    - Add updatePermissions() for permission management
    - Add resetPassword() for password reset
    - Add getUserPerformance() for metrics
    - Update internal-management/app/services/internalUserService.ts
    - _Requirements: 1.3, 2.1, 3.1, 4.1, 6.1, 7.1_

  - [x] 2.2 Add bulk operations to service


    - Add bulkImport() for CSV import
    - Add exportUsers() for CSV/PDF export
    - Add CSV parsing and validation logic
    - Update internal-management/app/services/internalUserService.ts
    - _Requirements: 11.1, 12.1_

- [x] 3. Create InternalUserManagementPage component





  - [x] 3.1 Create main page component


    - Create page layout with header and tabs
    - Add state management for users, filters, pagination
    - Add loading and error states
    - Implement user list loading on mount
    - Create internal-management/app/pages/InternalUserManagementPage.tsx
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Add quick action buttons

    - Add "Create User" button
    - Add "Bulk Import" button
    - Add "Export" button
    - Add permission-based button visibility
    - _Requirements: 2.1, 11.1, 12.1_

- [x] 4. Create UserListView component





  - [x] 4.1 Create user list table component


    - Create table with columns: name, email, role, status, last login, actions
    - Add sortable column headers
    - Add online status indicator
    - Add action buttons (edit, deactivate, view)
    - Add permission-based action visibility
    - Create internal-management/app/components/users/UserListView.tsx
    - _Requirements: 1.3, 1.4, 14.1_

  - [x] 4.2 Add filtering and search

    - Add role filter dropdown
    - Add status filter toggle (active/inactive)
    - Add search input with debounce
    - Add filter state management
    - Update UserListView component
    - _Requirements: 1.4_

  - [x] 4.3 Add pagination controls

    - Add pagination component
    - Add page size selector
    - Add total count display
    - Update UserListView component
    - _Requirements: 1.5_

- [x] 5. Create UserCreationModal component






  - [x] 5.1 Create multi-step modal structure


    - Create modal wrapper with stepper
    - Add step navigation (next, back, cancel)
    - Add form state management
    - Add validation logic
    - Create internal-management/app/components/users/UserCreationModal.tsx
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Create basic information step

    - Add name input field
    - Add email input field
    - Add phone input field
    - Add field validation (required, format)
    - Update UserCreationModal component
    - _Requirements: 2.2_

  - [x] 5.3 Create role selection step

    - Add role dropdown with descriptions
    - Filter roles based on current user's permissions
    - Add role-specific field visibility logic
    - Update UserCreationModal component
    - _Requirements: 2.3, 5.1_

  - [x] 5.4 Create role-specific fields

    - Add territory selection for agents
    - Add commission rate input for agents
    - Add supervisor selection for agents
    - Add conditional rendering based on selected role
    - Update UserCreationModal component
    - _Requirements: 2.4, 2.5_

  - [x] 5.5 Create review and submit step

    - Display summary of all entered information
    - Add edit buttons to go back to specific steps
    - Add submit button with loading state
    - Add success/error handling
    - Update UserCreationModal component
    - _Requirements: 2.6, 2.7_

- [-] 6. Create UserEditModal component



  - [x] 6.1 Create edit modal structure


    - Create modal wrapper with tabs
    - Add form state management
    - Add unsaved changes warning
    - Load user data on open
    - Create internal-management/app/components/users/UserEditModal.tsx
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Create basic info edit form


    - Add name input (editable)
    - Add email display (read-only)
    - Add phone input (editable)
    - Add validation
    - Update UserEditModal component
    - _Requirements: 3.2, 3.3_

  - [x] 6.3 Create role management section


    - Add role dropdown
    - Add role change confirmation dialog
    - Add permission preview
    - Update UserEditModal component
    - _Requirements: 3.4_

  - [x] 6.4 Create permission editor (Superuser only)


    - Add permission checkboxes
    - Add permission descriptions
    - Add save button
    - Add permission-based visibility
    - Update UserEditModal component
    - _Requirements: 5.4_

  - [x] 6.5 Add save and audit logging



    - Add save button with loading state
    - Call updateUser API
    - Display success/error messages
    - Refresh user list on success
    - Update UserEditModal component
    - _Requirements: 3.5, 3.6_

- [x] 7. Create UserDetailView component





  - [x] 7.1 Create detail view layout


    - Create page layout with sections
    - Add user info card
    - Add edit button
    - Add back button
    - Create internal-management/app/components/users/UserDetailView.tsx
    - _Requirements: 6.1_

  - [x] 7.2 Add performance metrics section


    - Add role-specific metrics display
    - Add agent metrics (properties, commission, leads)
    - Add regional manager metrics (team, performance, approvals)
    - Add operations manager metrics (tickets, properties, announcements)
    - Update UserDetailView component
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 7.3 Add activity timeline


    - Display recent actions
    - Display login history
    - Add date range filter
    - Update UserDetailView component
    - _Requirements: 6.1, 6.5_

  - [x] 7.4 Add audit log section


    - Display all changes to user
    - Show who made changes and when
    - Show before/after values
    - Add filtering by action type
    - Update UserDetailView component
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [-] 8. Create user deactivation functionality



  - [x] 8.1 Add deactivation button and confirmation


    - Add "Deactivate" button to user list and detail view
    - Create confirmation dialog
    - Add warning about access revocation
    - Create internal-management/app/components/users/DeactivateUserDialog.tsx
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Implement deactivation logic


    - Call deactivateUser API
    - Update user status in UI
    - Display success message
    - Log action in audit log
    - Update DeactivateUserDialog component
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 8.3 Add reactivation functionality



    - Add "Reactivate" button for inactive users
    - Call reactivateUser API
    - Update user status in UI
    - Update DeactivateUserDialog component
    - _Requirements: 4.6_

- [x] 9. Create password reset functionality





  - [x] 9.1 Add password reset button and dialog


    - Add "Reset Password" button to user detail view
    - Create confirmation dialog
    - Create internal-management/app/components/users/ResetPasswordDialog.tsx
    - _Requirements: 7.1_

  - [x] 9.2 Implement password reset logic


    - Call resetPassword API
    - Display success message with email confirmation
    - Log action in audit log
    - Update ResetPasswordDialog component
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [-] 10. Create BulkImportModal component



  - [x] 10.1 Create bulk import modal structure


    - Create modal with file upload area
    - Add CSV template download button
    - Add drag-and-drop file upload
    - Create internal-management/app/components/users/BulkImportModal.tsx
    - _Requirements: 11.1, 11.2_

  - [x] 10.2 Add CSV validation

    - Parse uploaded CSV file
    - Validate required fields
    - Display validation errors
    - Show preview of valid rows
    - Update BulkImportModal component
    - _Requirements: 11.3, 11.4_

  - [x] 10.3 Implement bulk import logic


    - Call bulkImport API
    - Display progress indicator
    - Show success/failure summary
    - Refresh user list on completion
    - Update BulkImportModal component
    - _Requirements: 11.5, 11.6_

- [x] 11. Create export functionality







  - [x] 11.1 Add export button and format selection

    - Add "Export" button to user list
    - Create format selection dialog (CSV, PDF)
    - Create internal-management/app/components/users/ExportDialog.tsx
    - _Requirements: 12.1, 12.2_



  - [x] 11.2 Implement export logic




    - Call exportUsers API with current filters
    - Download file to user's device
    - Display success message
    - Update ExportDialog component
    - _Requirements: 12.3, 12.4, 12.5_

- [-] 12. Create OnlineStatusIndicator component



  - [x] 12.1 Create online status indicator


    - Add green dot for online users
    - Add gray dot with "last seen" for offline users
    - Add tooltip with session info
    - Create internal-management/app/components/users/OnlineStatusIndicator.tsx
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 12.2 Add online users filter


    - Add "Show online only" toggle to filters
    - Update filter logic
    - Update UserListView component
    - _Requirements: 14.3_

- [x] 13. Create MyProfile page





  - [x] 13.1 Create profile page component


    - Create page layout
    - Display user's own information
    - Add edit form for phone and preferences
    - Create internal-management/app/pages/MyProfilePage.tsx
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 13.2 Add profile edit functionality


    - Add phone number edit
    - Add notification preferences edit
    - Add save button
    - Prevent role/permission editing
    - Update MyProfilePage component
    - _Requirements: 13.4, 13.5_

- [x] 14. Add quick actions to Superuser Dashboard








  - [x] 14.1 Add "Create Internal User" quick action

    - Add button to quick actions section
    - Open UserCreationModal on click
    - Update internal-management/app/pages/SuperuserDashboardPage.tsx
    - _Requirements: 8.1, 8.2_

  - [x] 14.2 Add "Manage Internal Users" quick action

    - Add button to quick actions section
    - Navigate to internal users page on click
    - Update SuperuserDashboardPage component
    - _Requirements: 1.1, 1.2_

  - [x] 14.3 Add internal users count to dashboard

    - Display count of active users by role
    - Add to KPI cards or overview section
    - Update SuperuserDashboardPage component
    - _Requirements: 8.3_

- [x] 15. Add quick actions to Platform Admin Dashboard






  - [x] 15.1 Add user management quick actions


    - Add "Create Internal User" button
    - Add "Manage Internal Users" button
    - Filter available roles (exclude Superuser)
    - Update internal-management/app/pages/PlatformAdminDashboardPage.tsx
    - _Requirements: 1.1, 2.3_

  - [x] 15.2 Add internal users overview


    - Display count of users by role
    - Add to dashboard overview section
    - Update PlatformAdminDashboardPage component
    - _Requirements: 8.3_

- [x] 16. Add team view to Regional Manager Dashboard






  - [x] 16.1 Create "My Team" section


    - Display agents assigned to regional manager
    - Show team member cards with basic info
    - Add click to view detailed performance
    - Update internal-management/app/pages/RegionalManagerDashboardPage.tsx
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 16.2 Add team member detail view

    - Create modal or page for team member details
    - Display performance metrics
    - Add read-only mode (no editing)
    - Create internal-management/app/components/users/TeamMemberDetailView.tsx
    - _Requirements: 9.4, 9.5_

- [x] 17. Add read-only user list to Operations Manager Dashboard






  - [x] 17.1 Add "View Team" section


    - Add link to internal users page
    - Display user list in read-only mode
    - Hide edit/delete buttons
    - Update internal-management/app/pages/OperationsManagerDashboardPage.tsx
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 17.2 Add user search functionality


    - Add search bar to operations manager view
    - Allow searching by name, email, role
    - Update OperationsManagerDashboardPage component
    - _Requirements: 10.4_

- [x] 18. Add permission-based UI rendering







  - [x] 18.1 Create permission checking utilities

    - Create canCreateUsers() helper
    - Create canEditUsers() helper
    - Create canDeactivateUsers() helper
    - Create canViewAuditLogs() helper
    - Update internal-management/app/hooks/usePermissions.ts
    - _Requirements: All permission-based requirements_

  - [x] 18.2 Apply permission checks to components


    - Hide/show buttons based on permissions
    - Disable actions user cannot perform
    - Show appropriate error messages
    - Update all user management components
    - _Requirements: All permission-based requirements_

- [x] 19. Add mobile responsiveness





  - [x] 19.1 Make user list mobile responsive


    - Convert table to card layout on mobile
    - Stack filters vertically
    - Add touch-optimized buttons
    - Update UserListView component
    - _Requirements: Mobile responsiveness_

  - [x] 19.2 Make modals mobile responsive


    - Use full-screen modals on mobile
    - Stack form fields vertically
    - Add mobile-friendly navigation
    - Update UserCreationModal and UserEditModal components
    - _Requirements: Mobile responsiveness_

- [x] 20. Add error handling and loading states






  - [x] 20.1 Add loading states to all components


    - Add skeleton loaders for user list
    - Add loading spinners for modals
    - Add progress indicators for bulk operations
    - Update all user management components
    - _Requirements: All requirements_

  - [x] 20.2 Add error handling


    - Display error messages for API failures
    - Add retry buttons for failed operations
    - Show validation errors clearly
    - Update all user management components
    - _Requirements: All requirements_

- [x] 21. Update Sidebar navigation





  - [x] 21.1 Add "Internal Users" menu item


    - Add menu item for Platform Admins and Superusers
    - Add icon and label
    - Add active state highlighting
    - Update internal-management/app/components/Sidebar.tsx
    - _Requirements: 1.1_

  - [x] 21.2 Add "My Team" menu item for Regional Managers

    - Add menu item for Regional Managers only
    - Link to team view
    - Update Sidebar component
    - _Requirements: 9.1_

  - [x] 21.3 Add "My Profile" menu item

    - Add menu item for all internal users
    - Link to profile page
    - Update Sidebar component
    - _Requirements: 13.1_

- [ ] 22. Testing and validation






  - [x] 22.1 Test user creation flow


    - Test creating users with all roles
    - Test validation errors
    - Test email delivery
    - Test permission enforcement
    - _Requirements: 2.1-2.7_

  - [x] 22.2 Test user editing flow


    - Test updating user information
    - Test role changes
    - Test permission updates
    - Test audit logging
    - _Requirements: 3.1-3.6_

  - [x] 22.3 Test deactivation and reactivation


    - Test deactivating users
    - Test access revocation
    - Test reactivating users
    - Test data preservation
    - _Requirements: 4.1-4.6_

  - [x] 22.4 Test bulk import


    - Test CSV upload and validation
    - Test error handling
    - Test success/failure reporting
    - _Requirements: 11.1-11.6_

  - [x] 22.5 Test permission enforcement

    - Test Platform Admin cannot create Superuser
    - Test Operations Manager has read-only access
    - Test Regional Manager sees only their team
    - Test all permission-based UI hiding
    - _Requirements: All permission requirements_

  - [x] 22.6 Test mobile responsiveness

    - Test on various screen sizes
    - Test touch interactions
    - Test modal behavior on mobile
    - _Requirements: Mobile responsiveness_

- [x] 23. Final checkpoint - Complete system testing









  - Ensure all components render correctly
  - Test all user management workflows end-to-end
  - Verify permission enforcement across all roles
  - Test on mobile devices
  - Verify integration with existing dashboards
  - Ask the user if questions arise
