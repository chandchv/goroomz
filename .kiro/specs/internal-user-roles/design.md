# Design Document: Internal User Role Management System

## Overview

The Internal User Role Management System extends the GoRoomz platform to support a comprehensive hierarchy of internal staff roles who manage the platform itself, distinct from property owners. This system enables Marketing/Sales Agents to onboard new properties, Regional Managers to oversee teams and territories, Operations Managers to handle platform-wide operations, Platform Administrators to manage system configuration, and Superusers to maintain complete platform control.

### Key Features

- **Role Hierarchy**: Five-tier role structure (Agent → Regional Manager → Operations Manager → Administrator → Superuser)
- **Property Onboarding Workflow**: Complete workflow for agents to register new properties with approval process
- **Commission Tracking**: Automated commission calculation and payment tracking for agents
- **Territory Management**: Geographic assignment of agents to regions with lead distribution
- **Role-Specific Dashboards**: Customized interfaces for each role showing relevant metrics and actions
- **Performance Analytics**: Comprehensive reporting on agent performance, regional metrics, and platform health
- **Support Ticket System**: Integrated ticketing for property owner support
- **Audit Logging**: Complete traceability of all internal user actions
- **Document Management**: Secure storage and management of onboarding documentation
- **Mobile Responsive**: Full functionality on mobile devices for remote work

### Technology Stack

- **Backend**: Node.js + Express (existing stack)
- **Database**: PostgreSQL with new tables for internal users, leads, commissions, territories
- **Authentication**: JWT tokens with role-based permissions (extending existing auth)
- **Frontend**: React + Vite (extending existing internal management app)
- **File Storage**: AWS S3 or local storage for documents
- **Email Service**: Nodemailer (existing) for credential delivery and notifications
- **Maps**: Google Maps API or Mapbox for territory visualization
- **Charts**: Recharts (existing) for analytics dashboards

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Internal User Management Frontend                   │
│                    (React + Vite)                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Agent     │  │   Regional   │  │  Operations  │          │
│  │  Dashboard   │  │    Manager   │  │   Manager    │          │
│  │              │  │   Dashboard  │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Platform   │  │  Superuser   │                            │
│  │    Admin     │  │  Dashboard   │                            │
│  │  Dashboard   │  │              │                            │
│  └──────────────┘  └──────────────┘                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Onboarding  │  │  Commission  │  │  Territory   │          │
│  │  Management  │  │   Tracking   │  │  Management  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Support    │  │  Performance │  │    Audit     │          │
│  │   Tickets    │  │   Reports    │  │     Logs     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│              State Management Layer (Context)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API Service │  │ Auth Service │  │ File Service │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Server                            │
│                  (Node.js + Express)                             │
├─────────────────────────────────────────────────────────────────┤
│  New Routes: /api/internal/roles/*, /api/internal/leads/*,      │
│              /api/internal/commissions/*, /api/internal/tickets/*│
│              /api/internal/territories/*, /api/internal/audit/*  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                             │
│  New Tables: internal_roles, leads, commissions, territories,   │
│              support_tickets, audit_logs, lead_communications,   │
│              agent_targets, property_documents                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: Internal users log in with email/password, receive JWT with role information
2. **Role-Based Routing**: Frontend routes user to appropriate dashboard based on role
3. **Permission Enforcement**: Backend middleware validates permissions for each API request
4. **Onboarding Flow**: Agent creates lead → fills property details → uploads documents → submits for approval → Regional Manager approves → Property owner receives credentials
5. **Commission Calculation**: System automatically calculates commission when property is approved and goes live
6. **Audit Trail**: All actions logged with user ID, timestamp, and affected resources

## Components and Interfaces

### Backend Components

#### 1. Extended User Model

Extend existing User model with internal role fields:

```javascript
// Add to User model
{
  internalRole: ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  internalPermissions: JSONB {
    canOnboardProperties: BOOLEAN,
    canApproveOnboardings: BOOLEAN,
    canManageAgents: BOOLEAN,
    canAccessAllProperties: BOOLEAN,
    canManageSystemSettings: BOOLEAN,
    canViewAuditLogs: BOOLEAN,
    canManageCommissions: BOOLEAN,
    canManageTerritories: BOOLEAN,
    canManageTickets: BOOLEAN,
    canBroadcastAnnouncements: BOOLEAN
  },
  territoryId: UUID (foreign key to territories),
  managerId: UUID (foreign key to users - for agents reporting to regional managers),
  commissionRate: DECIMAL(5,2), // percentage for agents
  isActive: BOOLEAN,
  lastLoginAt: TIMESTAMP
}
```

#### 2. New Database Models

**InternalRole**
```javascript
{
  id: UUID (primary key),
  name: STRING, // 'agent', 'regional_manager', etc.
  displayName: STRING, // 'Marketing/Sales Agent'
  description: TEXT,
  defaultPermissions: JSONB,
  isCustom: BOOLEAN,
  createdBy: UUID (foreign key to users),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**Lead**
```javascript
{
  id: UUID (primary key),
  propertyOwnerName: STRING,
  email: STRING,
  phone: STRING,
  businessName: STRING,
  propertyType: ENUM('hotel', 'pg'),
  address: TEXT,
  city: STRING,
  state: STRING,
  country: STRING,
  estimatedRooms: INTEGER,
  status: ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
  source: STRING, // 'referral', 'cold_call', 'website', etc.
  agentId: UUID (foreign key to users),
  territoryId: UUID (foreign key to territories),
  expectedCloseDate: DATE,
  rejectionReason: TEXT,
  notes: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  approvedAt: TIMESTAMP,
  approvedBy: UUID (foreign key to users)
}
```

**LeadCommunication**
```javascript
{
  id: UUID (primary key),
  leadId: UUID (foreign key to leads),
  userId: UUID (foreign key to users),
  type: ENUM('call', 'email', 'meeting', 'note'),
  subject: STRING,
  content: TEXT,
  scheduledAt: TIMESTAMP,
  completedAt: TIMESTAMP,
  createdAt: TIMESTAMP
}
```

**Commission**
```javascript
{
  id: UUID (primary key),
  agentId: UUID (foreign key to users),
  leadId: UUID (foreign key to leads),
  propertyId: UUID (foreign key to rooms.ownerId or properties),
  amount: DECIMAL(10, 2),
  rate: DECIMAL(5, 2), // percentage used for calculation
  status: ENUM('earned', 'pending_payment', 'paid', 'cancelled'),
  earnedDate: DATE,
  paymentDate: DATE,
  paymentMethod: STRING,
  transactionReference: STRING,
  notes: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**Territory**
```javascript
{
  id: UUID (primary key),
  name: STRING, // 'North Region', 'Mumbai Zone'
  description: TEXT,
  regionalManagerId: UUID (foreign key to users),
  boundaries: JSONB { // GeoJSON or simple coordinates
    type: 'Polygon',
    coordinates: [[lat, lng], ...]
  },
  cities: ARRAY[STRING],
  states: ARRAY[STRING],
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**AgentTarget**
```javascript
{
  id: UUID (primary key),
  agentId: UUID (foreign key to users),
  territoryId: UUID (foreign key to territories),
  period: ENUM('monthly', 'quarterly', 'yearly'),
  startDate: DATE,
  endDate: DATE,
  targetProperties: INTEGER,
  targetRevenue: DECIMAL(12, 2),
  actualProperties: INTEGER,
  actualRevenue: DECIMAL(12, 2),
  setBy: UUID (foreign key to users - regional manager),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**SupportTicket**
```javascript
{
  id: UUID (primary key),
  ticketNumber: STRING (unique, auto-generated),
  propertyOwnerId: UUID (foreign key to users),
  propertyId: UUID (foreign key to properties),
  title: STRING,
  description: TEXT,
  category: ENUM('technical', 'billing', 'operations', 'feature_request', 'other'),
  priority: ENUM('low', 'medium', 'high', 'urgent'),
  status: ENUM('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
  assignedTo: UUID (foreign key to users - operations manager),
  createdBy: UUID (foreign key to users),
  resolvedAt: TIMESTAMP,
  resolvedBy: UUID (foreign key to users),
  resolution: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**TicketResponse**
```javascript
{
  id: UUID (primary key),
  ticketId: UUID (foreign key to support_tickets),
  userId: UUID (foreign key to users),
  message: TEXT,
  isInternal: BOOLEAN, // internal notes vs customer-facing responses
  attachments: JSONB [URLs],
  createdAt: TIMESTAMP
}
```

**PropertyDocument**
```javascript
{
  id: UUID (primary key),
  leadId: UUID (foreign key to leads),
  propertyOwnerId: UUID (foreign key to users),
  documentType: ENUM('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
  fileName: STRING,
  fileUrl: STRING,
  fileSize: INTEGER,
  mimeType: STRING,
  uploadedBy: UUID (foreign key to users),
  status: ENUM('pending_review', 'approved', 'rejected'),
  reviewedBy: UUID (foreign key to users),
  reviewNotes: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**AuditLog**
```javascript
{
  id: UUID (primary key),
  userId: UUID (foreign key to users),
  action: STRING, // 'create_lead', 'approve_onboarding', 'update_commission', etc.
  resourceType: STRING, // 'lead', 'property', 'user', 'commission', etc.
  resourceId: UUID,
  changes: JSONB { // before and after values
    before: {},
    after: {}
  },
  ipAddress: STRING,
  userAgent: STRING,
  isCritical: BOOLEAN,
  createdAt: TIMESTAMP
}
```

**Announcement**
```javascript
{
  id: UUID (primary key),
  title: STRING,
  content: TEXT,
  targetAudience: ENUM('all_property_owners', 'specific_region', 'specific_property_type'),
  targetFilters: JSONB { // region, propertyType, etc.
    regions: [UUID],
    propertyTypes: ['hotel', 'pg']
  },
  createdBy: UUID (foreign key to users),
  scheduledAt: TIMESTAMP,
  sentAt: TIMESTAMP,
  deliveryMethod: ARRAY[ENUM('email', 'in_app', 'sms')],
  readCount: INTEGER,
  totalRecipients: INTEGER,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Frontend Components

#### 1. Role-Specific Dashboards

**AgentDashboard**
- KPI cards: Total properties onboarded, pending leads, commission earned this month
- Lead pipeline: Kanban board or list view with stages
- Recent activities: Latest communications and status changes
- Commission summary: Earned, pending, paid
- Quick actions: Create new lead, view targets

**RegionalManagerDashboard**
- Team overview: List of agents with key metrics
- Regional statistics: Total properties, occupancy rates, revenue
- Territory map: Visual representation of coverage
- Pending approvals: Onboardings awaiting review
- Team performance: Charts showing agent comparisons
- Quick actions: Assign territory, set targets, approve onboarding

**OperationsManagerDashboard**
- Platform health: Total properties, bookings, occupancy rate
- Support tickets: Open tickets by priority
- Property health: Properties with issues (low occupancy, payment problems)
- Platform trends: Booking patterns, revenue trends
- Alerts: Critical issues requiring attention
- Quick actions: Access property, create ticket, broadcast announcement

**PlatformAdminDashboard**
- User management: Internal users and property owners
- System configuration: Commission rates, regions, settings
- Subscription management: Active subscriptions, billing
- API usage: Integration statistics
- Notification settings: Configure alerts and notifications
- Quick actions: Create user, configure settings

**SuperuserDashboard**
- Complete platform overview: All key metrics
- Audit logs: Recent critical actions
- Financial summary: Revenue, commissions, payments
- System health: Infrastructure metrics
- Role management: Custom roles and permissions
- Quick actions: Access any dashboard, view audit logs

#### 2. Onboarding Components

**LeadCreationForm**
- Property owner information (name, email, phone)
- Business details (business name, property type)
- Property location (address, city, state)
- Estimated rooms count
- Lead source selection
- Notes field
- Submit button

**LeadPipelineView**
- Kanban board with columns: Contacted, In Progress, Pending Approval, Approved, Rejected, Lost
- Drag-and-drop to change status
- Filter by date range, territory
- Search by property owner name or business name
- Click card to view details

**LeadDetailModal**
- Property owner and business information
- Current status with status history
- Communication history timeline
- Document uploads section
- Actions: Update status, add communication, upload document, submit for approval

**OnboardingApprovalView** (Regional Manager)
- List of pending onboardings
- Property details display
- Uploaded documents viewer
- Approve/Reject buttons with reason field
- Bulk approval option

**DocumentUploadComponent**
- Document type selection
- File upload with drag-and-drop
- Preview uploaded documents
- Document status indicators (pending, approved, rejected)
- Delete/replace document option

#### 3. Commission Components

**CommissionDashboard** (Agent)
- Summary cards: Earned, pending, paid
- Commission breakdown table: Property, date, amount, status
- Payment history: Past payments with dates and methods
- Expected payment date display
- Filter by date range, status

**CommissionManagement** (Admin)
- All commissions list with filters
- Commission rate configuration
- Payment processing interface
- Bulk payment marking
- Export commission reports

#### 4. Territory Components

**TerritoryMapView** (Regional Manager)
- Interactive map showing territories
- Property markers color-coded by status
- Agent assignment overlay
- Territory boundary editing
- Filter by property type, occupancy
- Click property for details

**TerritoryManagement** (Regional Manager)
- List of territories with assigned agents
- Create/edit territory form
- Assign agents to territories
- View territory statistics
- Lead distribution settings

**AgentAssignment** (Regional Manager)
- List of agents in region
- Assign/reassign territories
- View agent workload
- Set agent targets

#### 5. Performance Components

**AgentPerformanceView** (Regional Manager)
- Agent selection dropdown
- Performance metrics: Properties onboarded, conversion rate, average time to close
- Performance history chart
- Target vs actual comparison
- Lead pipeline status
- Commission earned

**TeamPerformanceReport** (Regional Manager)
- Team comparison table
- Performance trends chart
- Top performers highlight
- Underperformers alert
- Export report button

**PlatformAnalytics** (Operations Manager)
- Platform-wide metrics dashboard
- Booking trends chart
- Revenue trends chart
- Occupancy heatmap
- Regional comparison
- Property type breakdown

#### 6. Support Components

**SupportTicketList** (Operations Manager)
- Tabbed view: New, In Progress, Waiting, Resolved, Closed
- Priority indicators
- Filter by category, property, date
- Search by ticket number or property owner
- Create ticket button

**TicketDetailView**
- Ticket information (number, title, description, priority, status)
- Property owner and property details
- Response timeline
- Add response form
- Internal notes section
- Status update controls
- Assign to user dropdown
- Resolve/close buttons

**TicketCreationForm**
- Property owner selection
- Property selection
- Title and description
- Category and priority selection
- Assign to operations manager
- Submit button

#### 7. User Management Components

**InternalUserList** (Platform Admin)
- Table of internal users
- Role indicators
- Status (active/inactive)
- Last login time
- Filter by role, status
- Search by name or email
- Create user button

**InternalUserForm** (Platform Admin)
- Name, email, phone inputs
- Role selection dropdown
- Territory assignment (for agents)
- Manager assignment (for agents)
- Commission rate (for agents)
- Permission checkboxes
- Generate password button
- Send credentials email checkbox
- Submit button

**RoleManagement** (Superuser)
- List of roles (default and custom)
- Create custom role button
- Edit role permissions
- View users assigned to role
- Delete custom role (with validation)

#### 8. Audit Components

**AuditLogViewer** (Superuser)
- Audit log table with filters
- Filter by user, action type, date range, resource type
- Search by resource ID
- Critical actions highlight
- View changes (before/after)
- Export audit logs

**UserActivityLog** (Platform Admin)
- User selection
- Activity timeline
- Action details
- Filter by date range, action type

### Backend API Endpoints

#### Internal Role Management

```
GET    /api/internal/roles - Get all roles
POST   /api/internal/roles - Create custom role (superuser only)
PUT    /api/internal/roles/:id - Update role permissions
DELETE /api/internal/roles/:id - Delete custom role
GET    /api/internal/roles/:id/users - Get users with specific role
```

#### Internal User Management

```
GET    /api/internal/users - Get all internal users
POST   /api/internal/users - Create internal user
GET    /api/internal/users/:id - Get user details
PUT    /api/internal/users/:id - Update user
DELETE /api/internal/users/:id - Deactivate user
PUT    /api/internal/users/:id/permissions - Update permissions
PUT    /api/internal/users/:id/territory - Assign territory
GET    /api/internal/users/:id/performance - Get performance metrics
```

#### Lead Management

```
GET    /api/internal/leads - Get all leads (filtered by role/territory)
POST   /api/internal/leads - Create new lead
GET    /api/internal/leads/:id - Get lead details
PUT    /api/internal/leads/:id - Update lead
DELETE /api/internal/leads/:id - Delete lead
PUT    /api/internal/leads/:id/status - Update lead status
POST   /api/internal/leads/:id/communications - Add communication
GET    /api/internal/leads/:id/communications - Get communication history
POST   /api/internal/leads/:id/submit-approval - Submit for approval
POST   /api/internal/leads/:id/approve - Approve onboarding (regional manager)
POST   /api/internal/leads/:id/reject - Reject onboarding (regional manager)
```

#### Commission Management

```
GET    /api/internal/commissions - Get commissions (filtered by role)
GET    /api/internal/commissions/:id - Get commission details
PUT    /api/internal/commissions/:id - Update commission
POST   /api/internal/commissions/:id/mark-paid - Mark as paid
GET    /api/internal/commissions/agent/:agentId - Get agent commissions
GET    /api/internal/commissions/pending - Get pending payments
POST   /api/internal/commissions/bulk-pay - Process bulk payments
```

#### Territory Management

```
GET    /api/internal/territories - Get all territories
POST   /api/internal/territories - Create territory
GET    /api/internal/territories/:id - Get territory details
PUT    /api/internal/territories/:id - Update territory
DELETE /api/internal/territories/:id - Delete territory
GET    /api/internal/territories/:id/agents - Get agents in territory
POST   /api/internal/territories/:id/assign-agent - Assign agent
GET    /api/internal/territories/:id/properties - Get properties in territory
GET    /api/internal/territories/:id/statistics - Get territory stats
```

#### Agent Target Management

```
GET    /api/internal/targets - Get targets (filtered by role)
POST   /api/internal/targets - Set target for agent
GET    /api/internal/targets/:id - Get target details
PUT    /api/internal/targets/:id - Update target
DELETE /api/internal/targets/:id - Delete target
GET    /api/internal/targets/agent/:agentId - Get agent targets
```

#### Support Ticket Management

```
GET    /api/internal/tickets - Get all tickets (filtered by role)
POST   /api/internal/tickets - Create ticket
GET    /api/internal/tickets/:id - Get ticket details
PUT    /api/internal/tickets/:id - Update ticket
PUT    /api/internal/tickets/:id/status - Update status
PUT    /api/internal/tickets/:id/assign - Assign to user
POST   /api/internal/tickets/:id/responses - Add response
GET    /api/internal/tickets/:id/responses - Get responses
POST   /api/internal/tickets/:id/resolve - Resolve ticket
POST   /api/internal/tickets/:id/close - Close ticket
```

#### Document Management

```
POST   /api/internal/documents/upload - Upload document
GET    /api/internal/documents/:id - Get document
DELETE /api/internal/documents/:id - Delete document
PUT    /api/internal/documents/:id/review - Review document (approve/reject)
GET    /api/internal/documents/lead/:leadId - Get lead documents
```

#### Audit Log

```
GET    /api/internal/audit - Get audit logs (superuser/admin)
GET    /api/internal/audit/:id - Get specific audit entry
GET    /api/internal/audit/user/:userId - Get user activity
GET    /api/internal/audit/resource/:resourceType/:resourceId - Get resource history
POST   /api/internal/audit/export - Export audit logs
```

#### Dashboard Endpoints

```
GET    /api/internal/dashboard/agent - Get agent dashboard data
GET    /api/internal/dashboard/regional-manager - Get regional manager dashboard
GET    /api/internal/dashboard/operations-manager - Get operations dashboard
GET    /api/internal/dashboard/platform-admin - Get admin dashboard
GET    /api/internal/dashboard/superuser - Get superuser dashboard
```

#### Performance & Analytics

```
GET    /api/internal/analytics/agent/:agentId - Get agent performance
GET    /api/internal/analytics/team/:territoryId - Get team performance
GET    /api/internal/analytics/platform - Get platform-wide analytics
GET    /api/internal/analytics/regional/:territoryId - Get regional analytics
POST   /api/internal/analytics/export - Export analytics report
```

#### Announcement Management

```
GET    /api/internal/announcements - Get all announcements
POST   /api/internal/announcements - Create announcement
GET    /api/internal/announcements/:id - Get announcement details
PUT    /api/internal/announcements/:id - Update announcement
DELETE /api/internal/announcements/:id - Delete announcement
POST   /api/internal/announcements/:id/send - Send announcement
GET    /api/internal/announcements/:id/statistics - Get delivery stats
```

## Data Models

See Backend Components section above for complete data model definitions.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified the following areas where properties can be consolidated:

- Multiple properties test similar permission enforcement (11.1, 11.2, 11.3, 11.4) - these can be combined into a single comprehensive permission enforcement property
- Several properties test audit logging (6.3, 8.5, 21.1, 21.3) - these can be combined into a single audit logging property
- Multiple properties test notification sending (4.3, 14.3, 18.3, 25.5, 28.2) - these can be combined into a single notification property
- Commission tracking properties (1.4, 17.2, 17.3) can be combined into a comprehensive commission lifecycle property

### Core Role and Permission Properties

**Property 1: Role-based permission enforcement**
*For any* internal user and any action, the system should only allow the action if the user's role has the required permissions for that action
**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

**Property 2: Role assignment applies correct permissions**
*For any* role assignment, the user should receive exactly the permission set defined for that role
**Validates: Requirements 7.2, 22.2**

**Property 3: Custom role permission consistency**
*For any* custom role modification, all users assigned to that role should have their permissions updated to match the new role definition
**Validates: Requirements 22.4**

**Property 4: Role deletion protection**
*For any* role with assigned users, deletion attempts should be rejected
**Validates: Requirements 22.5**

### Onboarding and Lead Management Properties

**Property 5: Required field validation**
*For any* property onboarding submission, all required fields (name, email, phone, business details, property information) must be present or the submission should be rejected
**Validates: Requirements 1.2, 1.5**

**Property 6: Agent attribution**
*For any* successful property onboarding, the agent ID who performed the onboarding must be recorded
**Validates: Requirements 1.4**

**Property 7: Credential generation and delivery**
*For any* approved property onboarding, secure credentials must be generated and an email must be sent to the property owner
**Validates: Requirements 1.3, 7.3, 18.3**

**Property 8: Lead status timestamp**
*For any* lead status update, the system must record a timestamp with the status change
**Validates: Requirements 2.4**

**Property 9: Territory-based lead assignment**
*For any* new lead created in a territory, the lead should be automatically assigned to an agent designated for that territory
**Validates: Requirements 4.2, 28.1**

**Property 10: Lead reassignment preservation**
*For any* lead reassignment, all communication history must be preserved and accessible to the new agent
**Validates: Requirements 4.3, 12.5**

**Property 11: Territory overlap prevention**
*For any* two territories, if their geographic boundaries overlap, the system should prevent the assignment or alert the manager
**Validates: Requirements 4.5**

**Property 12: Approval workflow**
*For any* completed property onboarding, it must be submitted for Regional Manager approval before the property becomes active
**Validates: Requirements 18.1**

**Property 13: Rejection requires reason**
*For any* rejected onboarding, a rejection reason must be provided and the lead status must be updated
**Validates: Requirements 18.4**

### Commission Properties

**Property 14: Commission lifecycle tracking**
*For any* approved property onboarding, a commission record must be created with the agent ID, property ID, amount, rate, and earned date
**Validates: Requirements 1.4, 17.2**

**Property 15: Commission payment recording**
*For any* commission marked as paid, the payment date, method, and transaction reference must be recorded
**Validates: Requirements 17.3**

**Property 16: Commission total calculation**
*For any* agent and time period, the total commission displayed should equal the sum of all individual commission amounts for that agent in that period
**Validates: Requirements 2.5**

**Property 17: Historical commission immutability**
*For any* commission rate update, existing commission records must remain unchanged with their original rates
**Validates: Requirements 8.2**

### Performance and Analytics Properties

**Property 18: Regional agent filtering**
*For any* Regional Manager, the dashboard should display only agents assigned to their territory
**Validates: Requirements 3.1**

**Property 19: Performance metric accuracy**
*For any* agent, the displayed performance metrics (properties onboarded, conversion rate, commission earned) should match the actual data from the database
**Validates: Requirements 3.2**

**Property 20: Regional aggregation**
*For any* region, the total properties, occupancy, and revenue should equal the sum of individual property values in that region
**Validates: Requirements 3.3**

**Property 21: Target progress calculation**
*For any* agent with a target, the progress percentage should equal (actual properties / target properties) × 100
**Validates: Requirements 24.2**

**Property 22: Team aggregation**
*For any* team, the aggregate performance should equal the sum of individual agent performance
**Validates: Requirements 24.5**

### Search and Filter Properties

**Property 23: Search result matching**
*For any* search query (property name, owner name, email, location), all returned results should match the search criteria
**Validates: Requirements 16.1, 16.2, 16.3, 6.1**

**Property 24: Filter result matching**
*For any* applied filters (region, property type, date range, status), all returned results should match all filter criteria
**Validates: Requirements 5.5, 14.5, 29.3**

**Property 25: Communication chronological ordering**
*For any* lead or property owner, all communications should be displayed in chronological order by timestamp
**Validates: Requirements 12.1, 17.4**

### Audit and Security Properties

**Property 26: Comprehensive audit logging**
*For any* internal user action, an audit log entry must be created with user ID, action type, timestamp, and affected resources
**Validates: Requirements 6.3, 8.5, 21.1**

**Property 27: Critical action flagging**
*For any* action marked as critical, the audit log entry must be flagged for review
**Validates: Requirements 21.3**

**Property 28: User deactivation access revocation**
*For any* deactivated user, all authentication attempts should be rejected while their historical data remains accessible
**Validates: Requirements 7.5**

**Property 29: Superuser complete access**
*For any* superuser, access should be granted to all dashboards, properties, and administrative functions
**Validates: Requirements 9.1**

**Property 30: Operations Manager property access**
*For any* Operations Manager and any property, the Operations Manager should have full read and write access to all property features
**Validates: Requirements 6.2, 11.3**

### Document Management Properties

**Property 31: Document validation**
*For any* document upload, if the file type or size exceeds limits, the upload should be rejected
**Validates: Requirements 23.2**

**Property 32: Document association**
*For any* uploaded document, it must be associated with the correct lead or property owner account
**Validates: Requirements 23.5**

**Property 33: Required document enforcement**
*For any* property onboarding, if required documents are missing, the onboarding completion should be blocked
**Validates: Requirements 23.4**

### Notification and Alert Properties

**Property 34: Notification delivery**
*For any* event requiring notification (lead assignment, ticket creation, approval, etc.), a notification must be sent to the designated recipient
**Validates: Requirements 4.3, 14.3, 18.3, 25.5, 28.2**

**Property 35: Alert generation for criteria**
*For any* property meeting alert criteria (zero occupancy > 7 days, payment failures, high-priority tickets), an alert must be created for the Operations Manager
**Validates: Requirements 14.1, 14.2, 14.3**

**Property 36: Time-based reminder**
*For any* lead not contacted within 24 hours of assignment, a reminder notification must be sent to the assigned agent
**Validates: Requirements 28.5**

**Property 37: Notification preference enforcement**
*For any* user with notification preferences, notifications should only be sent via the enabled channels (email, in-app, SMS)
**Validates: Requirements 26.1, 26.3**

### Support Ticket Properties

**Property 38: Ticket creation completeness**
*For any* support ticket creation, all required fields (description, priority, category) must be captured
**Validates: Requirements 25.1**

**Property 39: Ticket update tracking**
*For any* ticket status change or response, the change must be recorded with a timestamp
**Validates: Requirements 25.4**

**Property 40: Ticket resolution notification**
*For any* resolved ticket, a notification must be sent to the property owner
**Validates: Requirements 25.5**

### Subscription and Billing Properties

**Property 41: Proration calculation**
*For any* subscription upgrade, the prorated charge should be correctly calculated based on the remaining billing period
**Validates: Requirements 15.2**

**Property 42: Subscription expiration access restriction**
*For any* expired subscription, the property owner's access should be restricted and a renewal notification should be sent
**Validates: Requirements 15.3**

**Property 43: Discount application**
*For any* applied discount, the discount amount should be correctly calculated (percentage or fixed) and applied to the subscription
**Validates: Requirements 15.5**

### API and Integration Properties

**Property 44: API key generation**
*For any* API key creation, a secure unique key must be generated and associated with the specified permissions
**Validates: Requirements 20.1**

**Property 45: API key revocation**
*For any* revoked API key, all subsequent requests using that key should be immediately blocked
**Validates: Requirements 20.3**

### Announcement Properties

**Property 46: Announcement targeting**
*For any* announcement with target filters (region, property type), only property owners matching all filter criteria should receive the announcement
**Validates: Requirements 30.2, 30.3**

**Property 47: Announcement scheduling**
*For any* scheduled announcement, it should be sent at the specified date and time
**Validates: Requirements 30.5**

### Mobile and Offline Properties

**Property 48: Offline data caching**
*For any* mobile user going offline, essential data should be cached and accessible for viewing
**Validates: Requirements 27.4**

**Property 49: Offline sync on reconnection**
*For any* changes made while offline, they should be synchronized to the server when connection is restored
**Validates: Requirements 27.5**

## Error Handling

### Authentication and Authorization Errors

**Invalid Credentials**
- Display clear error message for incorrect email/password
- Do not reveal whether email exists (security)
- Rate limit login attempts to prevent brute force

**Insufficient Permissions**
- Return 403 Forbidden with clear message indicating required role/permission
- Log unauthorized access attempts in audit log
- Redirect to appropriate dashboard for user's role

**Token Expiration**
- Automatically refresh token before expiration when possible
- Redirect to login on expired token
- Preserve user's current page for redirect after re-authentication

### Data Validation Errors

**Missing Required Fields**
- Highlight missing fields in red
- Display field-level error messages
- Prevent form submission until all required fields are filled

**Invalid Data Format**
- Validate email format, phone format, file types
- Display format requirements clearly
- Provide examples of valid formats

**File Upload Errors**
- Validate file size before upload
- Check file type against allowed types
- Display progress bar for large uploads
- Handle upload failures with retry option

### Business Logic Errors

**Territory Overlap**
- Detect overlapping boundaries before saving
- Display visual indication of overlap on map
- Require manager to resolve conflict before proceeding

**Commission Calculation Errors**
- Validate commission rate is within acceptable range (0-100%)
- Handle edge cases (zero properties, negative amounts)
- Log calculation errors for admin review

**Lead Assignment Conflicts**
- Prevent assigning lead to agent outside their territory
- Handle case where no agents available in territory
- Alert manager when automatic assignment fails

### External Service Errors

**Email Delivery Failures**
- Queue failed emails for retry
- Log email failures in system
- Provide manual credential delivery option
- Alert admin if email service is down

**File Storage Errors**
- Handle S3/storage service failures gracefully
- Provide local fallback if possible
- Display clear error message to user
- Retry failed uploads automatically

**API Integration Errors**
- Implement exponential backoff for retries
- Log integration failures
- Display user-friendly error messages
- Provide manual workaround when possible

### Concurrent Access Errors

**Optimistic Locking**
- Detect when two users edit same record simultaneously
- Display conflict resolution dialog
- Show both versions for comparison
- Allow user to choose which version to keep

**Race Conditions**
- Use database transactions for critical operations
- Implement row-level locking where needed
- Handle duplicate submissions (idempotency)

## Testing Strategy

### Unit Testing

**Backend Unit Tests**
- Test each API endpoint in isolation
- Mock database calls and external services
- Test authentication and authorization middleware
- Test business logic functions (commission calculation, proration, etc.)
- Test validation functions
- Test error handling paths

**Frontend Unit Tests**
- Test React components in isolation
- Mock API calls and context providers
- Test user interactions (clicks, form submissions, navigation)
- Test conditional rendering based on role
- Test form validation logic
- Test utility functions (date formatting, calculations)

### Integration Testing

**API Integration Tests**
- Test complete workflows from frontend to database
- Test role-based access control across multiple endpoints
- Test data persistence and retrieval
- Test file upload and storage
- Test email sending integration
- Test audit logging across operations

**Workflow Integration Tests**
- Test complete onboarding workflow (create lead → upload docs → submit → approve → activate)
- Test commission lifecycle (onboarding → commission earned → payment → paid)
- Test support ticket workflow (create → assign → respond → resolve)
- Test territory assignment and lead distribution
- Test user creation and permission assignment

### Property-Based Testing

We will use **fast-check** (for JavaScript/TypeScript) as our property-based testing library.

**Configuration**
- Minimum 100 iterations per property test
- Use custom generators for domain-specific data (leads, commissions, territories, users)
- Tag each test with the property number from this design document using format: `**Feature: internal-user-roles, Property {number}: {property_text}**`

**Key Properties to Test**

1. **Permission Enforcement** (Property 1)
   - Generate random users with different roles
   - Generate random actions requiring different permissions
   - Verify access is granted/denied correctly

2. **Commission Calculation** (Property 16)
   - Generate random commission records for agents
   - Verify total equals sum of individual commissions

3. **Regional Aggregation** (Property 20)
   - Generate random properties in regions
   - Verify regional totals equal sum of property values

4. **Search Result Matching** (Property 23)
   - Generate random search queries and data sets
   - Verify all results match search criteria

5. **Audit Logging** (Property 26)
   - Generate random user actions
   - Verify audit log entry created for each action

6. **Territory Assignment** (Property 9)
   - Generate random leads in territories
   - Verify correct agent assignment

7. **Document Validation** (Property 31)
   - Generate random file uploads with various types/sizes
   - Verify validation rules enforced

8. **Notification Delivery** (Property 34)
   - Generate random events requiring notifications
   - Verify notifications sent to correct recipients

**Example Test Structure**
```javascript
// Feature: internal-user-roles, Property 1: Role-based permission enforcement
test('users can only perform actions their role permits', () => {
  fc.assert(
    fc.property(
      userGenerator(),
      actionGenerator(),
      (user, action) => {
        const hasPermission = checkPermission(user, action);
        const actionAllowed = performAction(user, action);
        return hasPermission === actionAllowed;
      }
    ),
    { numRuns: 100 }
  );
});
```

### End-to-End Testing

**Critical User Journeys**
- Agent onboards property from start to finish
- Regional Manager reviews and approves onboarding
- Operations Manager accesses property and resolves ticket
- Platform Admin creates internal user and assigns role
- Superuser views audit logs and manages custom roles

**Cross-Role Testing**
- Verify each role sees appropriate dashboard
- Verify permission boundaries are enforced
- Verify data isolation (agents only see their leads, etc.)

### Performance Testing

**Load Testing**
- Test system with 100+ concurrent internal users
- Test dashboard load times with large datasets
- Test search performance with thousands of properties
- Test report generation with large date ranges

**Scalability Testing**
- Test with 1000+ properties across multiple regions
- Test with 100+ agents and their leads
- Test audit log performance with millions of entries

### Security Testing

**Authentication Testing**
- Test JWT token validation
- Test token expiration and refresh
- Test rate limiting on login attempts

**Authorization Testing**
- Test permission enforcement for each role
- Test privilege escalation attempts
- Test cross-tenant data access prevention

**Input Validation Testing**
- Test SQL injection prevention
- Test XSS prevention
- Test file upload security (malicious files)

## Deployment Considerations

### Database Migrations

- Create migration scripts for all new tables
- Add indexes for performance (user lookups, lead searches, audit log queries)
- Set up foreign key constraints with appropriate cascade rules
- Plan for data migration if extending existing User table

### Environment Configuration

- Configure separate commission rates per environment (dev/staging/prod)
- Set up email service credentials
- Configure file storage (S3 buckets or local paths)
- Set up API keys for maps service

### Monitoring and Alerts

- Monitor API response times for dashboard endpoints
- Alert on failed email deliveries
- Monitor audit log growth and archive old entries
- Track commission calculation errors
- Monitor file storage usage

### Backup and Recovery

- Regular database backups including audit logs
- Backup uploaded documents separately
- Test restore procedures
- Plan for disaster recovery

### Performance Optimization

- Cache frequently accessed data (user permissions, role definitions)
- Implement pagination for large lists (leads, audit logs, properties)
- Optimize database queries with proper indexes
- Use CDN for static assets
- Implement lazy loading for dashboard components

