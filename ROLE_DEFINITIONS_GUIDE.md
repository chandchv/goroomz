# GoRoomz Role Definitions Guide

## Overview
The GoRoomz platform uses a dual-role system that separates **Platform Staff** (internal company roles) from **Property Ecosystem** roles (property owners and their staff). This separation ensures clear boundaries between platform operations and property management.

## Role Architecture

### 🏢 Platform Staff Roles (Internal Roles)
Platform staff work for GoRoomz company and manage the platform itself. They have `internalRole` set and use `internalPermissions`.

#### 1. **Superuser** (`internalRole: 'superuser'`)
**Purpose:** Ultimate platform administrator with full system access
**Dashboard:** `/superuser-dashboard`
**Permissions:**
- `canManageInternalUsers: true` - Create/modify platform staff
- `canManageRoles: true` - Assign roles and permissions
- `canConfigurePlatform: true` - System configuration and settings
- `canAccessAllProperties: true` - View all properties on platform
- `canManageAPIKeys: true` - API key management
- `canViewAuditLogs: true` - System audit and security logs
- `canManageSubscriptions: true` - Platform subscriptions
- `canBroadcastAnnouncements: true` - Platform-wide announcements
- `canManageCommissions: true` - Agent commission management
- `canManageTerritories: true` - Territory and region management
- `canManageTickets: true` - Support ticket management
- `canViewAnalytics: true` - Platform analytics and reports

**Typical Users:** CTO, Platform Administrators, System Architects

#### 2. **Platform Admin** (`internalRole: 'platform_admin'`)
**Purpose:** Senior platform administrator with broad system access
**Dashboard:** `/platform-admin-dashboard`
**Permissions:**
- `canManageInternalUsers: true` - Manage platform staff (except superusers)
- `canAccessAllProperties: true` - View all properties
- `canViewAuditLogs: true` - Security and audit logs
- `canManageSubscriptions: true` - Subscription management
- `canBroadcastAnnouncements: true` - Platform announcements
- `canManageCommissions: true` - Commission management
- `canManageTerritories: true` - Territory management
- `canViewAnalytics: true` - Platform analytics

**Typical Users:** Operations Directors, Senior Platform Managers

#### 3. **Operations Manager** (`internalRole: 'operations_manager'`)
**Purpose:** Manages day-to-day platform operations
**Dashboard:** `/operations-manager-dashboard`
**Permissions:**
- `canAccessAllProperties: true` - View all properties for operations
- `canManageTickets: true` - Handle support tickets
- `canViewAnalytics: true` - Operations analytics
- `canBroadcastAnnouncements: true` - Operational announcements
- `canViewAuditLogs: true` - Operations audit logs

**Typical Users:** Operations Managers, Customer Success Managers

#### 4. **Regional Manager** (`internalRole: 'regional_manager'`)
**Purpose:** Manages agents and properties in specific regions
**Dashboard:** `/regional-manager-dashboard`
**Permissions:**
- `canManageAgents: true` - Manage agents in their territory
- `canManageCommissions: true` - Agent commission management
- `canViewAnalytics: true` - Regional analytics
- `canManageTickets: true` - Regional support

**Additional Fields:**
- `territoryId` - Assigned territory/region
- `managerId` - Reports to (usually Operations Manager)

**Typical Users:** Regional Sales Managers, Territory Managers

#### 5. **Agent** (`internalRole: 'agent'`)
**Purpose:** Sales agents who onboard properties and earn commissions
**Dashboard:** `/agent-dashboard`
**Permissions:**
- `canOnboardProperties: true` - Onboard new properties
- `canManageCommissions: false` - View own commissions only
- `canViewAnalytics: false` - Limited analytics access

**Additional Fields:**
- `territoryId` - Assigned territory
- `managerId` - Reports to Regional Manager
- `commissionRate` - Commission percentage

**Typical Users:** Sales Agents, Business Development Representatives

---

### 🏨 Property Ecosystem Roles

Property ecosystem users manage individual properties. They have `role` set and use `permissions` (not `internalRole`).

#### Property Owner Roles

##### 1. **Admin** (`role: 'admin'`)
**Purpose:** Platform-level property administrator (rare, usually for large chains)
**Dashboard:** `/dashboard`
**Capabilities:**
- Manage multiple properties
- Full property management access
- Can create property owners and staff
- System-level property operations

**Typical Users:** Hotel Chain Administrators, Large Property Group Managers

##### 2. **Owner** (`role: 'owner'`)
**Purpose:** Individual property owner
**Dashboard:** `/dashboard`
**Capabilities:**
- Manage their own properties
- Create and manage property staff
- Full access to property operations
- Financial reports and analytics

**Typical Users:** Hotel Owners, PG Owners, Property Investors

##### 3. **Category Owner** (`role: 'category_owner'`)
**Purpose:** Owns properties within a specific category
**Dashboard:** `/dashboard`
**Capabilities:**
- Manage properties in their category
- Category-specific operations
- Staff management within category

**Typical Users:** Boutique Hotel Groups, Specialized Property Managers

#### Property Staff Roles

Property staff work for property owners and have `staffRole` set with specific `permissions`.

##### 1. **Manager** (`staffRole: 'manager'`)
**Purpose:** Property manager with broad operational access
**Dashboard:** `/dashboard`
**Default Permissions:**
- `canCheckIn: true` - Process guest check-ins
- `canCheckOut: true` - Process guest check-outs
- `canManageRooms: true` - Room management and assignment
- `canRecordPayments: true` - Payment processing
- `canViewReports: true` - Property reports and analytics
- `canManageStaff: true` - Manage other property staff
- `canUpdateRoomStatus: true` - Room status management
- `canManageMaintenance: true` - Maintenance request management

**Typical Users:** Hotel Managers, PG Managers, Operations Managers

##### 2. **Front Desk** (`staffRole: 'front_desk'`)
**Purpose:** Front desk operations and guest services
**Dashboard:** `/dashboard`
**Default Permissions:**
- `canCheckIn: true` - Guest check-ins
- `canCheckOut: true` - Guest check-outs
- `canRecordPayments: true` - Payment processing
- `canUpdateRoomStatus: true` - Room status updates
- `canViewReports: false` - Limited reporting access

**Typical Users:** Receptionists, Front Desk Staff, Guest Service Representatives

##### 3. **Housekeeping** (`staffRole: 'housekeeping'`)
**Purpose:** Room cleaning and maintenance coordination
**Dashboard:** `/dashboard`
**Default Permissions:**
- `canUpdateRoomStatus: true` - Update room cleaning status
- `canManageMaintenance: true` - Report and track maintenance
- `canViewReports: false` - Limited access to housekeeping reports

**Typical Users:** Housekeeping Staff, Cleaning Supervisors

##### 4. **Maintenance** (`staffRole: 'maintenance'`)
**Purpose:** Property maintenance and repairs
**Dashboard:** `/dashboard`
**Default Permissions:**
- `canManageMaintenance: true` - Maintenance request management
- `canUpdateRoomStatus: true` - Update room status after repairs
- `canViewReports: false` - Maintenance-specific reports

**Typical Users:** Maintenance Staff, Repair Technicians, Facility Managers

#### Regular Users

##### **User** (`role: 'user'`)
**Purpose:** Regular platform users (guests, customers)
**Dashboard:** Customer-facing interface (not internal management)
**Capabilities:**
- Make bookings
- View booking history
- Basic profile management

**Typical Users:** Hotel Guests, PG Tenants, Customers

---

## Role Hierarchy & Permissions

### Platform Staff Hierarchy
```
Superuser (Full Platform Control)
├── Platform Admin (Platform Management)
├── Operations Manager (Operations & Support)
├── Regional Manager (Territory Management)
└── Agent (Property Onboarding)
```

### Property Ecosystem Hierarchy
```
Admin (Multi-Property Management)
├── Owner (Property Owner)
├── Category Owner (Category Management)
└── Property Staff
    ├── Manager (Full Property Operations)
    ├── Front Desk (Guest Services)
    ├── Housekeeping (Room Management)
    └── Maintenance (Facility Management)
```

## Business Rules

### 1. **Role Separation**
- Users cannot have both `internalRole` and property owner roles (`owner`, `admin`, `category_owner`)
- This prevents conflicts of interest between platform operations and property management

### 2. **Permission Scope**
- **Platform Staff** use `internalPermissions` for platform-wide operations
- **Property Staff** use `permissions` for property-specific operations
- Property staff cannot have `internalPermissions`

### 3. **Data Access**
- **Platform Staff** can access multiple properties based on their role
- **Property Ecosystem** users can only access their own properties
- **Superuser/Platform Admin** can access all properties
- **Regional Managers** access properties in their territory
- **Agents** access properties they've onboarded

### 4. **Permission Management**
- **Superusers** can modify any user's roles and permissions
- **Platform Admins** can manage platform staff (except superusers)
- **Property Owners** can manage their property staff
- **Property Staff** cannot modify their own permissions

## Dashboard Routing

### Platform Staff Dashboards
- `/superuser-dashboard` - Superuser interface
- `/platform-admin-dashboard` - Platform admin interface
- `/operations-manager-dashboard` - Operations management
- `/regional-manager-dashboard` - Regional management
- `/agent-dashboard` - Agent interface

### Property Ecosystem Dashboard
- `/dashboard` - Unified property management interface
  - Adapts based on user's role and permissions
  - Property owners see multi-property views
  - Property staff see role-specific features

## Security Considerations

### 1. **Authentication**
- All internal management users must have password authentication
- Social login users are redirected to customer interface

### 2. **Authorization**
- Role-based access control at route level
- Permission-based feature access within interfaces
- Data scoping based on user type and assignments

### 3. **Audit Trail**
- All role changes are logged
- Permission modifications are tracked
- Critical actions require audit logging

## Implementation Notes

### Database Fields
```javascript
// User Model Fields
role: ENUM('user', 'owner', 'category_owner', 'admin') // Property ecosystem
staffRole: ENUM('front_desk', 'housekeeping', 'maintenance', 'manager') // Property staff
internalRole: ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser') // Platform staff

permissions: JSONB // Property-specific permissions
internalPermissions: JSONB // Platform-wide permissions

// Assignment fields for platform staff
territoryId: UUID // For regional managers and agents
managerId: UUID // Reporting hierarchy
commissionRate: DECIMAL // For agents
```

### Role Detection Logic
```javascript
function getUserType(user) {
  if (user.internalRole) return 'platform_staff';
  if (user.role === 'owner' || user.role === 'admin' || user.role === 'category_owner') return 'property_owner';
  if (user.staffRole) return 'property_staff';
  return 'external_user';
}
```

This role system ensures clear separation of concerns, proper security boundaries, and scalable permission management across the GoRoomz platform.