# Requirements Document

## Introduction

This document specifies the requirements for extending internal user management functionality across all internal role dashboards in the GoRoomz platform. Currently, the backend APIs for internal user management are fully implemented, but the frontend lacks proper integration. This feature will add comprehensive UI components and routes to enable Platform Administrators and Superusers to create, manage, and assign internal users (Marketing Agents, Regional Managers, Operations Managers, Platform Admins) from their respective dashboards.

## Glossary

- **System**: The internal user management UI within the GoRoomz internal management platform
- **Internal User**: A platform employee with specific role and permissions (Agent, Regional Manager, Operations Manager, Platform Admin, Superuser)
- **Platform Administrator**: An internal user with permissions to manage other internal users up to Administrator level
- **Superuser**: The highest-level internal user with full platform access including custom role creation
- **Internal User Management Page**: A dedicated interface for viewing, creating, editing, and managing internal users
- **Quick Actions**: Shortcut buttons on dashboards for common tasks
- **Role Assignment**: The process of assigning a specific role and permissions to an internal user
- **User Activation/Deactivation**: Enabling or disabling an internal user's access while preserving their data

## Requirements

### Requirement 1

**User Story:** As a Platform Administrator, I want to access an internal user management page from my dashboard, so that I can view and manage all internal users.

#### Acceptance Criteria

1. WHEN a Platform Administrator accesses their dashboard THEN the System SHALL display a quick action button for "Manage Internal Users"
2. WHEN clicking the manage users button THEN the System SHALL navigate to the internal user management page
3. WHEN viewing the internal user management page THEN the System SHALL display a list of all internal users with their roles, status, and last login
4. WHEN viewing the user list THEN the System SHALL allow filtering by role, status (active/inactive), and searching by name or email
5. WHEN viewing the user list THEN the System SHALL display pagination for large datasets

### Requirement 2

**User Story:** As a Platform Administrator, I want to create new internal users, so that I can onboard new team members to the platform.

#### Acceptance Criteria

1. WHEN a Platform Administrator clicks "Create User" THEN the System SHALL display a user creation form
2. WHEN filling the form THEN the System SHALL require name, email, phone, and role selection
3. WHEN selecting a role THEN the System SHALL display only roles up to Platform Administrator level (excluding Superuser)
4. WHEN creating an Agent THEN the System SHALL require territory assignment and commission rate
5. WHEN creating an Agent THEN the System SHALL allow assigning a Regional Manager as their supervisor
6. WHEN submitting the form THEN the System SHALL generate secure credentials and send them via email
7. WHEN user creation succeeds THEN the System SHALL display a success message and refresh the user list

### Requirement 3

**User Story:** As a Platform Administrator, I want to edit existing internal users, so that I can update their information and permissions.

#### Acceptance Criteria

1. WHEN clicking on a user in the list THEN the System SHALL display an edit form with current user information
2. WHEN editing a user THEN the System SHALL allow updating name, phone, role, territory, and commission rate
3. WHEN editing a user THEN the System SHALL prevent changing email address (security constraint)
4. WHEN updating role THEN the System SHALL apply the new permission set immediately
5. WHEN saving changes THEN the System SHALL log the modification in the audit log
6. WHEN update succeeds THEN the System SHALL display a success message and refresh the user details

### Requirement 4

**User Story:** As a Platform Administrator, I want to deactivate internal users, so that I can revoke access for team members who leave the organization.

#### Acceptance Criteria

1. WHEN viewing a user THEN the System SHALL display an "Deactivate" button for active users
2. WHEN clicking deactivate THEN the System SHALL display a confirmation dialog
3. WHEN confirming deactivation THEN the System SHALL set the user status to inactive
4. WHEN a user is deactivated THEN the System SHALL revoke all authentication tokens immediately
5. WHEN a user is deactivated THEN the System SHALL preserve all their historical data and audit logs
6. WHEN viewing deactivated users THEN the System SHALL display a "Reactivate" button

### Requirement 5

**User Story:** As a Superuser, I want to create users with any role including other Superusers, so that I can manage the highest level of platform access.

#### Acceptance Criteria

1. WHEN a Superuser accesses the user creation form THEN the System SHALL display all roles including Superuser
2. WHEN a Superuser creates a custom role THEN the System SHALL allow assigning that custom role to users
3. WHEN a Superuser views the user list THEN the System SHALL display all users including other Superusers
4. WHEN a Superuser edits permissions THEN the System SHALL allow granular permission customization
5. WHEN a Superuser creates a Superuser THEN the System SHALL require additional confirmation

### Requirement 6

**User Story:** As a Platform Administrator, I want to view user activity and performance, so that I can monitor team productivity.

#### Acceptance Criteria

1. WHEN viewing a user's details THEN the System SHALL display their last login time and login history
2. WHEN viewing an Agent's details THEN the System SHALL display properties onboarded, commission earned, and current leads
3. WHEN viewing a Regional Manager's details THEN the System SHALL display team size, regional performance, and pending approvals
4. WHEN viewing an Operations Manager's details THEN the System SHALL display tickets handled, properties accessed, and announcements sent
5. WHEN viewing activity THEN the System SHALL allow filtering by date range

### Requirement 7

**User Story:** As a Platform Administrator, I want to reset user passwords, so that I can help users who are locked out of their accounts.

#### Acceptance Criteria

1. WHEN viewing a user THEN the System SHALL display a "Reset Password" button
2. WHEN clicking reset password THEN the System SHALL generate a new secure password
3. WHEN password is reset THEN the System SHALL send the new credentials via email
4. WHEN password is reset THEN the System SHALL log the action in the audit log with the administrator who performed it
5. WHEN password reset succeeds THEN the System SHALL display a confirmation message

### Requirement 8

**User Story:** As a Superuser, I want quick access to create internal users from my dashboard, so that I can quickly onboard new team members.

#### Acceptance Criteria

1. WHEN a Superuser views their dashboard THEN the System SHALL display a "Create Internal User" quick action button
2. WHEN clicking the quick action THEN the System SHALL open the user creation form in a modal or navigate to the creation page
3. WHEN the dashboard loads THEN the System SHALL display the count of active internal users by role
4. WHEN viewing quick actions THEN the System SHALL display shortcuts to manage roles, view audit logs, and access user management
5. WHEN creating a user from quick action THEN the System SHALL follow the same validation and creation flow

### Requirement 9

**User Story:** As a Regional Manager, I want to view my team members, so that I can see who reports to me.

#### Acceptance Criteria

1. WHEN a Regional Manager accesses their dashboard THEN the System SHALL display a "My Team" section
2. WHEN viewing my team THEN the System SHALL display all Agents assigned to the Regional Manager
3. WHEN viewing team members THEN the System SHALL display their name, contact info, territory, and current performance
4. WHEN clicking on a team member THEN the System SHALL navigate to their detailed performance view
5. WHEN viewing team THEN the System SHALL not allow editing other Regional Managers or higher roles

### Requirement 10

**User Story:** As an Operations Manager, I want to view all internal users, so that I can understand the team structure.

#### Acceptance Criteria

1. WHEN an Operations Manager accesses the user list THEN the System SHALL display all internal users in read-only mode
2. WHEN viewing users THEN the System SHALL display role, status, and contact information
3. WHEN viewing users THEN the System SHALL not display edit or delete buttons (read-only access)
4. WHEN searching for users THEN the System SHALL allow searching by name, email, or role
5. WHEN viewing user details THEN the System SHALL display basic information without sensitive permission details

### Requirement 11

**User Story:** As a Platform Administrator, I want to bulk import internal users, so that I can efficiently onboard multiple team members at once.

#### Acceptance Criteria

1. WHEN accessing user management THEN the System SHALL display a "Bulk Import" button
2. WHEN clicking bulk import THEN the System SHALL display a file upload interface accepting CSV format
3. WHEN uploading a CSV THEN the System SHALL validate all required fields (name, email, phone, role)
4. WHEN validation fails THEN the System SHALL display specific errors for each row
5. WHEN validation succeeds THEN the System SHALL create all users and send credentials via email
6. WHEN import completes THEN the System SHALL display a summary of successful and failed imports

### Requirement 12

**User Story:** As a Platform Administrator, I want to export the internal user list, so that I can analyze team composition and create reports.

#### Acceptance Criteria

1. WHEN viewing the user list THEN the System SHALL display an "Export" button
2. WHEN clicking export THEN the System SHALL allow selecting CSV or PDF format
3. WHEN exporting THEN the System SHALL include all visible columns based on current filters
4. WHEN export completes THEN the System SHALL download the file to the user's device
5. WHEN exporting THEN the System SHALL exclude sensitive information like passwords or permission details

### Requirement 13

**User Story:** As an internal user, I want to see my own profile and permissions, so that I understand my access level.

#### Acceptance Criteria

1. WHEN any internal user clicks their profile icon THEN the System SHALL display a "My Profile" option
2. WHEN viewing my profile THEN the System SHALL display my name, email, phone, role, and assigned permissions
3. WHEN viewing my profile THEN the System SHALL display my last login time and login history
4. WHEN viewing my profile THEN the System SHALL allow updating my phone number and notification preferences
5. WHEN viewing my profile THEN the System SHALL not allow changing my own role or critical permissions

### Requirement 14

**User Story:** As a Platform Administrator, I want to see which users are currently online, so that I can understand platform usage.

#### Acceptance Criteria

1. WHEN viewing the user list THEN the System SHALL display an online status indicator for each user
2. WHEN a user is online THEN the System SHALL display a green dot next to their name
3. WHEN viewing online users THEN the System SHALL allow filtering to show only currently active users
4. WHEN viewing user details THEN the System SHALL display current session information (login time, IP address)
5. WHEN viewing platform overview THEN the System SHALL display total online users count

### Requirement 15

**User Story:** As a Superuser, I want to view detailed audit logs for user management actions, so that I can track who made changes to internal users.

#### Acceptance Criteria

1. WHEN viewing a user's details THEN the System SHALL display a "View Audit Log" button
2. WHEN clicking view audit log THEN the System SHALL display all actions performed on that user (creation, updates, role changes, deactivation)
3. WHEN viewing audit logs THEN the System SHALL display who performed each action and when
4. WHEN viewing audit logs THEN the System SHALL display before and after values for changes
5. WHEN viewing audit logs THEN the System SHALL allow filtering by action type and date range
