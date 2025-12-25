# Design Document: Internal Management System

## Overview

The Internal Management System is a standalone desktop/tablet application designed for property owners, administrators, and staff to manage day-to-day operations of Hotels and PGs (Paying Guests) on the GoRoomz platform. This application operates independently from the customer-facing website, communicating with the shared backend API for data synchronization while maintaining performance isolation from online customer traffic.

### Key Features

- **Floor-based Room Visualization**: Visual representation of rooms organized by floor with real-time status indicators
- **Dual Property Type Support**: Separate workflows for Hotels (daily operations) and PGs (monthly operations with bed-level management)
- **Comprehensive Booking Management**: Handle both online bookings (from website) and offline bookings (walk-ins, phone reservations)
- **Payment Tracking**: Monthly payment schedules for PG residents with overdue tracking and collection management
- **Housekeeping Management**: Track room cleaning status and prioritize tasks
- **Check-in/Check-out Operations**: Streamlined guest registration and departure processing
- **Reporting Suite**: Occupancy, revenue, booking, housekeeping, and payment collection reports
- **Maintenance Tracking**: Record and manage room maintenance requests and history
- **Role-based Access Control**: Different permission levels for property owners, front desk, housekeeping, maintenance, and managers
- **Offline Capability**: Local data caching with automatic synchronization when connection is restored

### Technology Stack

- **Frontend**: React with Vite (reusing existing tech stack)
- **UI Framework**: Tailwind CSS with Radix UI components
- **State Management**: React Context + Hooks
- **API Communication**: Axios with retry logic and offline queue
- **Local Storage**: IndexedDB for offline data caching
- **Charts/Visualizations**: Recharts or Chart.js for reporting
- **Desktop Deployment**: Electron (optional for true desktop app) or PWA for web-based deployment

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Internal Management App                     │
│                    (React + Vite)                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │    Rooms     │  │   Bookings   │     │
│  │     View     │  │  Management  │  │  Management  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Check-in/   │  │  Payments &  │  │   Reports    │     │
│  │   Check-out  │  │  Collections │  │  Generation  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Housekeeping │  │ Maintenance  │  │  Staff Mgmt  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│              State Management Layer (Context)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  API Service │  │ Sync Service │  │ Cache Service│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                        │
│                  (Node.js + Express)                         │
├─────────────────────────────────────────────────────────────┤
│  Existing Routes: /api/rooms, /api/bookings, /api/users     │
│  New Routes: /api/internal/*, /api/payments/*,              │
│              /api/housekeeping/*, /api/maintenance/*         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  Tables: rooms, bookings, users, payments, maintenance,      │
│          room_status, bed_assignments, payment_schedules     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: Staff logs in with credentials, receives JWT token
2. **Initial Data Load**: App fetches property data, rooms, bookings, and caches locally
3. **Real-time Updates**: WebSocket or polling for live updates from backend
4. **Offline Operations**: Changes queued in IndexedDB when offline
5. **Synchronization**: Automatic sync when connection restored, conflict resolution if needed

## Components and Interfaces

### Frontend Components

#### 1. Authentication & Layout

**LoginScreen**
- Staff login with email/password
- Role-based redirection after login
- Remember me functionality

**MainLayout**
- Top navigation bar with property selector
- Sidebar with role-based menu items
- Real-time connection status indicator
- User profile and logout

#### 2. Dashboard Components

**DashboardView**
- KPI cards: Occupancy rate, revenue, pending payments
- Room status summary: Occupied, vacant/clean, vacant/dirty counts
- Today's activities: Check-ins, check-outs, payment due dates
- Alerts: Overdue payments, pending maintenance, dirty rooms > 24hrs
- Auto-refresh every 60 seconds

#### 3. Room Management Components

**FloorView**
- Floor selector/tabs
- Grid layout of rooms per floor
- Room cards with:
  - Room number
  - Category (Suite, Deluxe, etc.)
  - Status indicator (color-coded)
  - Occupancy info (for PG shared rooms)
- Click to view room details

**RoomDetailModal**
- Room information (number, floor, category, amenities)
- Current status with update controls
- Booking history
- Maintenance history
- Edit room properties button

**RoomCategoryManager**
- List of custom categories
- Add/edit/delete categories
- Assign categories to rooms

**RoomStatusControls**
- Quick status change buttons
- Status history log
- Housekeeping assignment

#### 4. Booking Management Components

**BookingList**
- Tabbed view: All, Pending, Active, Completed, Cancelled
- Filters: Date range, room, guest name, booking source
- Search by guest name or room number
- Booking cards with key info
- Actions: View details, check-in, check-out, cancel

**BookingDetailModal**
- Guest information
- Room details
- Check-in/check-out dates
- Payment status
- Special requests
- Status update controls
- Payment recording

**CreateBookingForm**
- Guest information input
- Room selection (with availability check)
- Date selection (daily for Hotels, monthly for PGs)
- Bed selection (for PG shared rooms)
- Price calculation
- Payment method selection

#### 5. Check-in/Check-out Components

**CheckInForm**
- Booking lookup by ID or guest name
- Verify guest identity
- Room assignment confirmation
- ID/document upload
- Security deposit recording
- Generate room key/access code
- Update room status to occupied

**CheckOutForm**
- Booking lookup
- Calculate final charges
- Record checkout time
- Security deposit refund processing
- Room inspection checklist
- Update room status to vacant/dirty
- Generate invoice

#### 6. Payment Management Components

**PaymentDashboard**
- Summary: Total collected, pending, overdue
- Overdue payments list with days overdue
- Filter by floor, room, date range
- Quick payment recording

**PaymentScheduleView** (PG-specific)
- Monthly payment calendar
- Per-bed payment status
- Upcoming due dates
- Payment history per resident

**PaymentRecordForm**
- Amount input
- Payment method selection
- Transaction reference
- Receipt generation
- Update payment status

**SecurityDepositManager**
- Deposit recording at check-in
- Deduction tracking with reasons
- Refund processing at check-out
- Deposit history

#### 7. Housekeeping Components

**HousekeepingDashboard**
- Pending tasks list (vacant/dirty rooms)
- Priority indicators (time since checkout)
- Filter by floor
- Assign tasks to staff
- Mark as clean

**RoomCleaningForm**
- Room number
- Cleaning checklist
- Issues found
- Time taken
- Staff signature
- Update status to vacant/clean

#### 8. Maintenance Components

**MaintenanceRequestList**
- Pending, in-progress, completed tabs
- Priority indicators
- Filter by room, floor, type
- Create new request

**MaintenanceRequestForm**
- Room selection
- Issue description
- Priority level
- Photo upload
- Assign to staff
- Expected completion date

**MaintenanceDetailView**
- Request details
- Status updates
- Work performed log
- Costs incurred
- Completion confirmation

#### 9. Reporting Components

**ReportSelector**
- Report type selection
- Date range picker
- Filter options
- Export format (PDF/CSV)

**OccupancyReport**
- Occupancy percentage chart
- Breakdown by room category
- Breakdown by floor
- Comparison with previous period

**RevenueReport**
- Total revenue chart
- Revenue by category
- Revenue by booking source (online/offline)
- Payment status breakdown
- Period comparison

**BookingReport**
- Total bookings chart
- Online vs offline distribution
- Cancellation rate
- Average stay duration
- Guest statistics

**HousekeepingReport**
- Rooms cleaned count
- Average cleaning time
- Room turnover time
- Status distribution over time

**PaymentCollectionReport** (PG-specific)
- Collection efficiency percentage
- On-time vs late payments
- Defaulters list
- Outstanding amounts

#### 10. Staff Management Components

**StaffUserList**
- List of staff accounts
- Role indicators
- Active/inactive status
- Create new staff user

**StaffUserForm**
- Name, email, phone
- Role selection (front desk, housekeeping, maintenance, manager)
- Permission assignment
- Password generation

### Backend API Endpoints

#### New Endpoints Required

**Internal Management Authentication**
```
POST /api/internal/auth/login
POST /api/internal/auth/logout
GET  /api/internal/auth/me
```

**Room Status Management**
```
GET    /api/internal/rooms/status
PUT    /api/internal/rooms/:id/status
GET    /api/internal/rooms/floor/:floorNumber
POST   /api/internal/rooms/:id/assign-category
```

**Room Categories**
```
GET    /api/internal/categories
POST   /api/internal/categories
PUT    /api/internal/categories/:id
DELETE /api/internal/categories/:id
```

**Bed Management (PG-specific)**
```
GET    /api/internal/rooms/:id/beds
POST   /api/internal/rooms/:id/beds
PUT    /api/internal/beds/:id/status
GET    /api/internal/beds/:id/occupant
```

**Check-in/Check-out**
```
POST   /api/internal/bookings/:id/checkin
POST   /api/internal/bookings/:id/checkout
GET    /api/internal/bookings/pending-checkin
GET    /api/internal/bookings/pending-checkout
```

**Payment Management**
```
GET    /api/internal/payments
POST   /api/internal/payments
GET    /api/internal/payments/overdue
GET    /api/internal/payments/schedule/:bookingId
PUT    /api/internal/payments/:id
```

**Security Deposits**
```
POST   /api/internal/deposits
PUT    /api/internal/deposits/:id/refund
GET    /api/internal/deposits/:bookingId
```

**Housekeeping**
```
GET    /api/internal/housekeeping/tasks
POST   /api/internal/housekeeping/tasks/:roomId/complete
GET    /api/internal/housekeeping/history/:roomId
```

**Maintenance**
```
GET    /api/internal/maintenance/requests
POST   /api/internal/maintenance/requests
PUT    /api/internal/maintenance/requests/:id
GET    /api/internal/maintenance/requests/:roomId/history
```

**Reports**
```
GET    /api/internal/reports/occupancy
GET    /api/internal/reports/revenue
GET    /api/internal/reports/bookings
GET    /api/internal/reports/housekeeping
GET    /api/internal/reports/payments
POST   /api/internal/reports/export
```

**Dashboard**
```
GET    /api/internal/dashboard/kpis
GET    /api/internal/dashboard/activities
GET    /api/internal/dashboard/alerts
```

**Staff Management**
```
GET    /api/internal/staff
POST   /api/internal/staff
PUT    /api/internal/staff/:id
DELETE /api/internal/staff/:id
PUT    /api/internal/staff/:id/permissions
```

**Superuser Management (Admin Only)**
```
GET    /api/internal/superuser/property-owners
POST   /api/internal/superuser/property-owners
GET    /api/internal/superuser/property-owners/:id
PUT    /api/internal/superuser/property-owners/:id
PUT    /api/internal/superuser/property-owners/:id/deactivate
POST   /api/internal/superuser/properties
PUT    /api/internal/superuser/properties/:id
POST   /api/internal/superuser/properties/:id/bulk-rooms
PUT    /api/internal/superuser/properties/:id/transfer-ownership
GET    /api/internal/superuser/properties/:id/statistics
```

## Data Models

### New Database Tables

#### 1. RoomStatus
```javascript
{
  id: UUID (primary key),
  roomId: UUID (foreign key to rooms),
  status: ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
  updatedAt: TIMESTAMP,
  updatedBy: UUID (foreign key to users),
  notes: TEXT
}
```

#### 2. BedAssignment (for PG shared rooms)
```javascript
{
  id: UUID (primary key),
  roomId: UUID (foreign key to rooms),
  bedNumber: INTEGER,
  status: ENUM('occupied', 'vacant'),
  bookingId: UUID (foreign key to bookings, nullable),
  occupantId: UUID (foreign key to users, nullable),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

#### 3. Payment
```javascript
{
  id: UUID (primary key),
  bookingId: UUID (foreign key to bookings),
  amount: DECIMAL(10, 2),
  paymentDate: DATE,
  paymentMethod: ENUM('cash', 'card', 'upi', 'bank_transfer'),
  transactionReference: STRING,
  paymentType: ENUM('booking', 'monthly_rent', 'security_deposit'),
  status: ENUM('pending', 'completed', 'failed', 'refunded'),
  recordedBy: UUID (foreign key to users),
  notes: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

#### 4. PaymentSchedule (for PG monthly payments)
```javascript
{
  id: UUID (primary key),
  bookingId: UUID (foreign key to bookings),
  bedId: UUID (foreign key to bed_assignments, nullable),
  dueDate: DATE,
  amount: DECIMAL(10, 2),
  status: ENUM('pending', 'paid', 'overdue'),
  paidDate: DATE (nullable),
  paymentId: UUID (foreign key to payments, nullable),
  daysOverdue: INTEGER (calculated),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

#### 5. SecurityDeposit
```javascript
{
  id: UUID (primary key),
  bookingId: UUID (foreign key to bookings),
  amount: DECIMAL(10, 2),
  collectedDate: DATE,
  paymentMethod: ENUM('cash', 'card', 'upi', 'bank_transfer'),
  status: ENUM('collected', 'refunded', 'partially_refunded'),
  refundAmount: DECIMAL(10, 2) (nullable),
  refundDate: DATE (nullable),
  deductions: JSONB [{reason: STRING, amount: DECIMAL}],
  refundedBy: UUID (foreign key to users, nullable),
  notes: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

#### 6. MaintenanceRequest
```javascript
{
  id: UUID (primary key),
  roomId: UUID (foreign key to rooms),
  title: STRING,
  description: TEXT,
  priority: ENUM('low', 'medium', 'high', 'urgent'),
  status: ENUM('pending', 'in_progress', 'completed', 'cancelled'),
  reportedBy: UUID (foreign key to users),
  assignedTo: UUID (foreign key to users, nullable),
  reportedDate: TIMESTAMP,
  expectedCompletionDate: DATE (nullable),
  completedDate: TIMESTAMP (nullable),
  workPerformed: TEXT (nullable),
  costIncurred: DECIMAL(10, 2) (nullable),
  images: JSONB [URLs],
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

#### 7. HousekeepingLog
```javascript
{
  id: UUID (primary key),
  roomId: UUID (foreign key to rooms),
  cleanedBy: UUID (foreign key to users),
  cleanedAt: TIMESTAMP,
  timeTaken: INTEGER (minutes),
  checklistCompleted: JSONB [{item: STRING, completed: BOOLEAN}],
  issuesFound: TEXT (nullable),
  notes: TEXT (nullable),
  createdAt: TIMESTAMP
}
```

#### 8. RoomCategory (custom categories per property)
```javascript
{
  id: UUID (primary key),
  propertyId: UUID (foreign key to rooms.ownerId or separate properties table),
  name: STRING,
  description: TEXT (nullable),
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Extended Existing Models

#### Room Model Extensions
```javascript
// Add to existing Room model
{
  floorNumber: INTEGER,
  roomNumber: STRING,
  customCategoryId: UUID (foreign key to room_categories, nullable),
  sharingType: ENUM('single', '2_sharing', '3_sharing') (for PG),
  totalBeds: INTEGER (for PG),
  currentStatus: ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
  lastCleanedAt: TIMESTAMP (nullable),
  lastMaintenanceAt: TIMESTAMP (nullable)
}
```

#### Booking Model Extensions
```javascript
// Add to existing Booking model
{
  bookingSource: ENUM('online', 'offline'),
  bedId: UUID (foreign key to bed_assignments, nullable for PG),
  actualCheckInTime: TIMESTAMP (nullable),
  actualCheckOutTime: TIMESTAMP (nullable),
  securityDepositId: UUID (foreign key to security_deposits, nullable),
  checkedInBy: UUID (foreign key to users, nullable),
  checkedOutBy: UUID (foreign key to users, nullable)
}
```

#### User Model Extensions
```javascript
// Add to existing User model
{
  staffRole: ENUM('front_desk', 'housekeeping', 'maintenance', 'manager') (nullable),
  permissions: JSONB {
    canCheckIn: BOOLEAN,
    canCheckOut: BOOLEAN,
    canManageRooms: BOOLEAN,
    canRecordPayments: BOOLEAN,
    canViewReports: BOOLEAN,
    canManageStaff: BOOLEAN,
    canUpdateRoomStatus: BOOLEAN,
    canManageMaintenance: BOOLEAN
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Core Data Integrity Properties

**Property 1: Room status consistency**
*For any* room, when the status is updated, the timestamp and updatedBy fields must be set, and the status must be one of the valid enum values (occupied, vacant_clean, vacant_dirty)
**Validates: Requirements 7.1**

**Property 2: Bed assignment consistency**
*For any* PG room with sharing type, the number of bed assignments must equal the sharing type count (1 for single, 2 for 2-sharing, 3 for 3-sharing)
**Validates: Requirements 5.2**

**Property 3: Booking date validity**
*For any* booking, the check-out date must be after the check-in date
**Validates: Requirements 3.2, 4.2, 8.2, 9.2**

**Property 4: Double-booking prevention**
*For any* room and date range, there should be at most one active booking (pending or confirmed status) for that room during overlapping dates
**Validates: Requirements 14.1, 14.2, 19.1, 19.2**

**Property 5: Bed-level double-booking prevention**
*For any* bed in a shared room and date range, there should be at most one active booking for that specific bed during overlapping dates
**Validates: Requirements 14.3, 19.4**

### Room Management Properties

**Property 6: Floor grouping correctness**
*For any* floor view display, all rooms with the same floor number must be grouped together and displayed in ascending floor order
**Validates: Requirements 1.1**

**Property 7: Room category assignment**
*For any* room with an assigned category, the category must exist in the property's custom categories list
**Validates: Requirements 2.2**

**Property 8: Category deletion protection**
*For any* category with assigned rooms, deletion attempts must be rejected
**Validates: Requirements 2.5**

**Property 9: Room status affects availability**
*For any* room with status vacant_dirty or occupied, the room must not appear in available rooms for new bookings
**Validates: Requirements 7.2, 14.4**

### Booking and Check-in/Check-out Properties

**Property 10: Check-in status transition**
*For any* booking, when check-in is completed, the booking status must change to active and the associated room status must change to occupied
**Validates: Requirements 8.3**

**Property 11: Check-out status transition**
*For any* booking, when check-out is completed, the booking status must change to completed and the associated room status must change to vacant_dirty
**Validates: Requirements 9.3**

**Property 12: Booking source preservation**
*For any* booking created in the system, the booking source (online or offline) must be recorded and remain unchanged throughout the booking lifecycle
**Validates: Requirements 17.2**

**Property 13: Hotel pricing calculation**
*For any* Hotel booking, the total amount must equal the daily rate multiplied by the number of days between check-in and check-out
**Validates: Requirements 3.2**

**Property 14: PG pricing calculation**
*For any* PG booking, the total amount must equal the monthly rate multiplied by the number of months
**Validates: Requirements 4.2**

### Payment Properties

**Property 15: Payment schedule creation**
*For any* PG booking, when a resident checks in, a payment schedule with monthly due dates must be created
**Validates: Requirements 20.1**

**Property 16: Payment status calculation**
*For any* payment in the schedule, if the current date is after the due date and status is pending, the payment must be marked as overdue with days overdue calculated
**Validates: Requirements 20.4**

**Property 17: Payment completion**
*For any* booking, when all scheduled payments are marked as paid, the booking payment status must be updated to paid
**Validates: Requirements 21.3**

**Property 18: Partial payment balance**
*For any* booking with partial payment, the remaining balance must equal the total amount minus the sum of all completed payments
**Validates: Requirements 21.2**

**Property 19: Security deposit refund calculation**
*For any* security deposit with deductions, the refund amount must equal the collected amount minus the sum of all deduction amounts
**Validates: Requirements 29.4**

### Synchronization Properties

**Property 20: Backend persistence**
*For any* room status change in the internal management system, the change must be persisted to the backend database immediately
**Validates: Requirements 16.3, 18.1, 18.2**

**Property 21: Online booking import**
*For any* booking created through the online platform, it must appear in the internal management system with source marked as "online"
**Validates: Requirements 17.1**

**Property 22: Availability synchronization**
*For any* room with status vacant_clean, the room must be available for online bookings; for any room with status vacant_dirty, the room must not appear in online search results
**Validates: Requirements 18.3, 18.4**

**Property 23: Offline queue integrity**
*For any* changes made while offline, they must be queued locally and synchronized to the backend in the order they were made when connection is restored
**Validates: Requirements 35.3, 35.4**

### Housekeeping Properties

**Property 24: Housekeeping task priority**
*For any* room with status vacant_dirty for more than 24 hours, it must be marked as high priority in the housekeeping dashboard
**Validates: Requirements 13.4**

**Property 25: Room cleaning completion**
*For any* room marked as vacant_clean, the lastCleanedAt timestamp must be updated to the current time
**Validates: Requirements 7.3, 13.3**

### Maintenance Properties

**Property 26: Maintenance request completeness**
*For any* maintenance request, it must have a room ID, description, priority, and reported date
**Validates: Requirements 30.1**

**Property 27: Maintenance completion recording**
*For any* maintenance request marked as completed, it must have a completion date and work performed description
**Validates: Requirements 30.4**

### Role-Based Access Properties

**Property 28: Role permission enforcement**
*For any* staff user with role front_desk, they must only have access to check-in, check-out, and booking management features
**Validates: Requirements 33.2**

**Property 29: Housekeeping role restriction**
*For any* staff user with role housekeeping, they must only have access to room status updates and cleaning task management
**Validates: Requirements 33.3**

**Property 30: Manager role access**
*For any* staff user with role manager, they must have access to all features including reports and financial data
**Validates: Requirements 33.5**

### Report Generation Properties

**Property 31: Occupancy calculation**
*For any* occupancy report, the occupancy percentage must equal (occupied rooms / total rooms) × 100 for the selected date range
**Validates: Requirements 23.1**

**Property 32: Revenue calculation**
*For any* revenue report, the total revenue must equal the sum of all completed payments in the selected date range
**Validates: Requirements 24.1**

**Property 33: Collection efficiency calculation**
*For any* payment collection report, the on-time payment percentage must equal (on-time payments / total payments) × 100
**Validates: Requirements 27.2**

### Superuser Management Properties

**Property 34: Property owner account creation**
*For any* new property owner account, secure credentials must be generated and the account must be associated with at least one property
**Validates: Requirements 36.2**

**Property 35: Property assignment**
*For any* property, it must be assigned to exactly one active property owner at any given time
**Validates: Requirements 37.1, 37.5**

**Property 36: Bulk room creation consistency**
*For any* bulk room creation operation, all rooms must be created with the same property ID and valid floor/room number combinations
**Validates: Requirements 37.3**

## Error Handling

### API Communication Errors

**Connection Failures**
- Display user-friendly error messages
- Implement exponential backoff retry logic (1s, 2s, 4s, 8s, max 30s)
- Queue operations locally when offline
- Show connection status indicator in UI

**Authentication Errors**
- Redirect to login on 401 Unauthorized
- Refresh JWT token automatically before expiration
- Clear local cache on authentication failure

**Validation Errors**
- Display field-level validation messages
- Prevent form submission until all validations pass
- Highlight invalid fields in red

**Conflict Errors**
- Show detailed conflict information (e.g., "Room 101 is already booked from Jan 1-5")
- Provide options to resolve conflicts
- Refresh data after conflict resolution

### Data Integrity Errors

**Double-booking Detection**
- Check availability before allowing booking creation
- Lock room/bed during booking process
- Show alternative available rooms if conflict detected

**Status Transition Errors**
- Validate status transitions (e.g., can't mark occupied room as vacant_clean)
- Show current status and allowed transitions
- Require confirmation for critical transitions

**Payment Errors**
- Validate payment amounts against booking totals
- Prevent negative payments or refunds
- Require reason for refunds and deductions

### Offline Operation Errors

**Sync Conflicts**
- Detect conflicts when syncing offline changes
- Show both local and server versions
- Allow user to choose which version to keep or merge manually

**Cache Expiration**
- Warn when cached data is stale (> 1 hour old)
- Prompt user to refresh when connection available
- Prevent critical operations with stale data

## Testing Strategy

### Unit Testing

**Component Testing**
- Test each React component in isolation
- Mock API calls and context providers
- Test user interactions (clicks, form submissions)
- Verify correct rendering based on props and state

**Service Layer Testing**
- Test API service functions
- Mock HTTP requests/responses
- Test error handling and retry logic
- Verify request/response transformations

**Utility Function Testing**
- Test date calculations (duration, overdue days)
- Test price calculations (daily, monthly)
- Test validation functions
- Test data transformation functions

### Integration Testing

**API Integration**
- Test complete flows from UI to backend
- Verify data persistence
- Test authentication and authorization
- Test real-time synchronization

**Offline Functionality**
- Test offline queue management
- Test sync after reconnection
- Test conflict resolution
- Test cache invalidation

### Property-Based Testing

We will use **fast-check** (for JavaScript/TypeScript) as our property-based testing library.

**Configuration**
- Minimum 100 iterations per property test
- Use custom generators for domain-specific data (rooms, bookings, payments)
- Tag each test with the property number from this design document

**Test Organization**
- Group tests by feature area (rooms, bookings, payments, etc.)
- Use descriptive test names that reference the property
- Include property validation in test assertions

**Example Test Structure**
```javascript
// Feature: internal-management-system, Property 4: Double-booking prevention
test('no overlapping bookings for same room', () => {
  fc.assert(
    fc.property(
      roomGenerator(),
      bookingListGenerator(),
      (room, bookings) => {
        const activeBookings = bookings.filter(b => 
          b.roomId === room.id && 
          ['pending', 'confirmed'].includes(b.status)
        );
        
        // Check no overlapping dates
        for (let i = 0; i < activeBookings.length; i++) {
          for (let j = i + 1; j < activeBookings.length; j++) {
            const overlap = checkDateOverlap(
              activeBookings[i],
              activeBookings[j]
            );
            expect(overlap).toBe(false);
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### End-to-End Testing

**Critical User Flows**
- Complete booking flow (create → check-in → check-out)
- Payment recording and tracking
- Room status updates and housekeeping
- Report generation and export
- Staff user management

**Cross-browser Testing**
- Test on Chrome, Firefox, Safari, Edge
- Test on desktop and tablet devices
- Verify responsive design

### Performance Testing

**Load Testing**
- Test with 100+ rooms per property
- Test with 1000+ bookings
- Test report generation with large datasets
- Measure API response times

**UI Performance**
- Measure initial load time (target < 3s)
- Measure dashboard refresh time (target < 1s)
- Test smooth scrolling with large lists
- Verify no memory leaks during extended use

## Security Considerations

### Authentication & Authorization

**JWT Token Management**
- Store tokens securely (httpOnly cookies or secure storage)
- Implement token refresh before expiration
- Clear tokens on logout
- Validate token on each API request

**Role-Based Access Control**
- Enforce permissions on both frontend and backend
- Hide UI elements based on user role
- Validate permissions on API endpoints
- Log unauthorized access attempts

### Data Protection

**Sensitive Data**
- Encrypt payment information in transit (HTTPS)
- Mask credit card numbers in UI
- Limit access to financial reports based on role
- Implement audit logging for sensitive operations

**Input Validation**
- Sanitize all user inputs
- Validate data types and formats
- Prevent SQL injection (use parameterized queries)
- Prevent XSS attacks (escape HTML)

### API Security

**Rate Limiting**
- Implement per-user rate limits
- Throttle failed login attempts
- Limit report generation requests

**CORS Configuration**
- Whitelist internal management app origin
- Reject requests from unknown origins
- Include credentials in CORS policy

## Deployment Strategy

### Development Environment

**Local Development**
- Run frontend on localhost:3001 (different from customer website)
- Connect to local backend API
- Use development database
- Enable hot reload and debugging

### Staging Environment

**Pre-production Testing**
- Deploy to staging server
- Use staging database with anonymized production data
- Test with real devices (desktop, tablet)
- Perform UAT with property owners

### Production Deployment

**Deployment Options**

**Option 1: Web Application (PWA)**
- Deploy as Progressive Web App
- Host on CDN (Vercel, Netlify, or AWS S3 + CloudFront)
- Enable offline functionality with service workers
- Allow installation on desktop and tablet

**Option 2: Electron Desktop App**
- Package as native desktop application
- Distribute via download link or app store
- Auto-update functionality
- Better offline capabilities

**Recommended: Hybrid Approach**
- Start with PWA for faster deployment
- Migrate to Electron if native features needed

### Monitoring & Maintenance

**Application Monitoring**
- Track API response times
- Monitor error rates
- Log user actions for debugging
- Set up alerts for critical errors

**Usage Analytics**
- Track feature usage
- Identify performance bottlenecks
- Gather user feedback
- Plan feature improvements

## Future Enhancements

### Phase 2 Features

**Advanced Reporting**
- Custom report builder
- Scheduled report generation
- Email report delivery
- Data visualization dashboards

**Mobile App**
- Native iOS and Android apps
- Push notifications for bookings and payments
- Offline-first architecture
- Barcode/QR code scanning for check-in

**Automation**
- Automated payment reminders via SMS/Email
- Automated housekeeping task assignment
- Smart pricing based on occupancy
- Predictive maintenance alerts

**Integration**
- Payment gateway integration (Stripe, Razorpay)
- Accounting software integration (QuickBooks, Xero)
- Channel manager integration (OTAs)
- Smart lock integration for keyless entry

### Scalability Considerations

**Multi-property Support**
- Property switching in UI
- Consolidated reporting across properties
- Property-specific configurations
- Bulk operations across properties

**Performance Optimization**
- Implement virtual scrolling for large lists
- Add pagination for reports
- Cache frequently accessed data
- Optimize database queries with indexes

**Internationalization**
- Multi-language support
- Currency conversion
- Date/time format localization
- Regional compliance (GDPR, etc.)
