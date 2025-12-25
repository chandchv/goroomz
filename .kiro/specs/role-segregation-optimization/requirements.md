# Requirements Document

## Introduction

This specification defines the optimization and segregation of user roles within the GoRoomz platform. The system currently has overlapping and confusing role structures across three user types: external website users, property owners with their staff, and internal platform staff. This document establishes clear role hierarchies, data scoping rules, and access patterns to ensure proper separation of concerns while maintaining a single unified internal-management application.

## Glossary

- **System**: The GoRoomz platform including backend API and internal-management frontend
- **External User**: A website visitor who browses and books properties (role: 'user')
- **Property Owner**: A user who owns one or more properties and manages them (role: 'owner', 'category_owner', 'admin')
- **Property Staff**: Staff hired by property owners to manage day-to-day operations (staffRole: 'front_desk', 'housekeeping', 'maintenance', 'manager')
- **Platform Staff**: Internal company employees who manage the platform (internalRole: 'agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser')
- **Data Scoping**: Filtering database queries to show only data a user is authorized to access
- **Role Hierarchy**: The structured levels of access and permissions within each user type
- **Platform Routes**: Routes prefixed with /platform/ accessible only to platform staff
- **Property Routes**: Routes accessible to property owners scoped to their properties

## Requirements

### Requirement 1

**User Story:** As a system architect, I want clear role separation between external users, property owners, and platform staff, so that each user type has appropriate access without confusion.

#### Acceptance Criteria

1. WHEN the system authenticates a user THEN the system SHALL determine their user type based on role fields (role, internalRole, staffRole)
2. WHEN a user has multiple role types THEN the system SHALL prioritize internalRole over role over staffRole for access determination
3. WHEN the system evaluates permissions THEN the system SHALL use the appropriate permission set (internalPermissions for platform staff, permissions for property staff)
4. THE system SHALL maintain three distinct role hierarchies: external users (user), property ecosystem (owner/staff), and platform staff (internalRole)
5. THE system SHALL prevent role conflicts by ensuring a user cannot have both internalRole and owner role simultaneously

### Requirement 2

**User Story:** As a property owner, I want to access only my properties and their data, so that I cannot see or modify other owners' information.

#### Acceptance Criteria

1. WHEN a property owner queries properties THEN the system SHALL filter results to only properties they own
2. WHEN a property owner queries bookings THEN the system SHALL filter results to only bookings for their properties
3. WHEN a property owner queries rooms THEN the system SHALL filter results to only rooms in their properties
4. WHEN a property owner queries staff THEN the system SHALL filter results to only staff assigned to their properties
5. WHEN a property owner queries reports THEN the system SHALL filter data to only their properties' metrics

### Requirement 3

**User Story:** As platform staff, I want access to all properties based on my role level, so that I can perform my platform management duties.

#### Acceptance Criteria

1. WHEN platform staff with 'superuser' or 'platform_admin' role queries data THEN the system SHALL return all properties without filtering
2. WHEN platform staff with 'regional_manager' role queries data THEN the system SHALL filter to properties in their assigned territory
3. WHEN platform staff with 'agent' role queries data THEN the system SHALL filter to properties they are assigned to or in their territory
4. WHEN platform staff accesses platform routes THEN the system SHALL verify their internalRole before granting access
5. WHEN platform staff accesses property owner routes THEN the system SHALL deny access unless they have explicit override permissions

### Requirement 4

**User Story:** As a developer, I want middleware that automatically scopes database queries, so that data access rules are enforced consistently across all endpoints.

#### Acceptance Criteria

1. WHEN an API endpoint is called THEN the system SHALL apply data scoping middleware before executing queries
2. WHEN the middleware detects a property owner THEN the system SHALL inject property ownership filters into all queries
3. WHEN the middleware detects platform staff THEN the system SHALL apply territory or role-based filters as appropriate
4. WHEN the middleware detects a superuser THEN the system SHALL skip data scoping filters
5. WHEN a query attempts to bypass scoping THEN the system SHALL log the attempt and deny access

### Requirement 5

**User Story:** As a frontend developer, I want role-based navigation menus, so that users only see routes they can access.

#### Acceptance Criteria

1. WHEN a property owner logs in THEN the system SHALL display navigation for: Dashboard, My Properties, Rooms, Bookings, Staff, Reports
2. WHEN platform staff logs in THEN the system SHALL display navigation for: Platform Dashboard, All Properties, Owners, Agents, Territories, Analytics
3. WHEN a user's role changes THEN the system SHALL update the navigation menu without requiring re-login
4. WHEN a user accesses a route not in their navigation THEN the system SHALL redirect to their default dashboard
5. THE system SHALL render different sidebar components based on user type (Sidebar for owners, InternalSidebar for platform staff)

### Requirement 6

**User Story:** As a platform administrator, I want platform-specific routes under /platform/ prefix, so that platform management features are clearly separated from property management.

#### Acceptance Criteria

1. THE system SHALL organize all platform staff routes under /platform/ prefix
2. WHEN a property owner attempts to access /platform/ routes THEN the system SHALL return 403 Forbidden
3. WHEN platform staff accesses /platform/ routes THEN the system SHALL verify internalRole permissions
4. THE system SHALL maintain property management routes at root level (/properties, /rooms, /bookings)
5. THE system SHALL use route guards to enforce platform route access restrictions

### Requirement 7

**User Story:** As a property staff member, I want to access only the property I work for, so that I can perform my assigned duties without seeing other properties.

#### Acceptance Criteria

1. WHEN property staff logs in THEN the system SHALL determine their assigned property from their user record
2. WHEN property staff queries data THEN the system SHALL filter to only their assigned property
3. WHEN property staff attempts to access another property THEN the system SHALL deny access
4. THE system SHALL allow property owners to assign and manage their property staff
5. THE system SHALL prevent property staff from modifying their own permissions

### Requirement 8

**User Story:** As a system administrator, I want a clean User model structure, so that role fields are organized and easy to understand.

#### Acceptance Criteria

1. THE system SHALL group role fields logically: base role (role), platform role (internalRole), property role (staffRole)
2. THE system SHALL group permission fields logically: property permissions (permissions), platform permissions (internalPermissions)
3. THE system SHALL include helper methods on User model to determine user type (isPropertyOwner(), isPlatformStaff(), isPropertyStaff())
4. THE system SHALL validate that role combinations are valid (no owner + internalRole)
5. THE system SHALL provide clear documentation of each role field's purpose

### Requirement 9

**User Story:** As a developer, I want consistent authentication middleware, so that all routes are protected with appropriate role checks.

#### Acceptance Criteria

1. THE system SHALL provide protectInternal middleware for all internal-management routes
2. THE system SHALL provide requirePlatformRole middleware for platform-specific routes
3. THE system SHALL provide requirePropertyOwner middleware for owner-specific routes
4. THE system SHALL provide requirePropertyStaff middleware for staff-specific routes
5. THE system SHALL chain middleware appropriately (auth → role check → data scoping)

### Requirement 10

**User Story:** As a property owner, I want to manage my property staff, so that I can control who has access to my property operations.

#### Acceptance Criteria

1. WHEN a property owner creates staff THEN the system SHALL assign the staff to the owner's property
2. WHEN a property owner updates staff permissions THEN the system SHALL validate permissions are within allowed scope
3. WHEN a property owner deactivates staff THEN the system SHALL revoke their access immediately
4. THE system SHALL prevent property owners from creating platform staff roles
5. THE system SHALL allow property owners to view audit logs for their staff's actions

### Requirement 11

**User Story:** As a developer, I want helper methods on the User model, so that I can easily determine user types and access levels.

#### Acceptance Criteria

1. THE User model SHALL provide isPropertyOwner() method returning true for users with owner/admin role and no internalRole
2. THE User model SHALL provide isPlatformStaff() method returning true for users with internalRole
3. THE User model SHALL provide isPropertyStaff() method returning true for users with staffRole
4. THE User model SHALL provide getUserType() method returning 'property_owner', 'platform_staff', 'property_staff', or 'external_user'
5. THE User model SHALL provide getAccessiblePropertyIds() method returning array of property IDs the user can access

### Requirement 12

**User Story:** As a backend developer, I want data scoping middleware that works with Sequelize, so that queries are automatically filtered without manual intervention.

#### Acceptance Criteria

1. WHEN middleware detects a property owner THEN the system SHALL inject WHERE clauses filtering by property ownership
2. WHEN middleware detects platform staff with territory THEN the system SHALL inject WHERE clauses filtering by territory
3. WHEN middleware detects property staff THEN the system SHALL inject WHERE clauses filtering by assigned property
4. WHEN a query includes explicit property filters THEN the system SHALL merge them with scoping filters using AND logic
5. THE system SHALL provide a bypass mechanism for superuser queries that need full access

### Requirement 13

**User Story:** As a developer, I want consistent naming conventions across the codebase, so that I can avoid camelCase/snake_case conversion errors.

#### Acceptance Criteria

1. THE system SHALL use snake_case for all database column names (internal_role, staff_role, created_at)
2. THE system SHALL use camelCase for all JavaScript/TypeScript variables and object properties (internalRole, staffRole, createdAt)
3. WHEN Sequelize models are defined THEN the system SHALL use underscored: true option for automatic conversion
4. WHEN API responses are sent THEN the system SHALL use camelCase in JSON responses
5. THE system SHALL document the naming convention in a CONVENTIONS.md file
