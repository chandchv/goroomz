# Internal Management System - Database Models

## Overview

This document describes the new database models and extensions created for the Internal Management System feature of GoRoomz.

## New Models Created

### 1. RoomStatus
Tracks the status history of rooms (occupied, vacant_clean, vacant_dirty).

**File:** `backend/models/RoomStatus.js`

**Fields:**
- `id` (UUID, Primary Key)
- `roomId` (UUID, Foreign Key -> rooms)
- `status` (ENUM: 'occupied', 'vacant_clean', 'vacant_dirty')
- `updatedBy` (UUID, Foreign Key -> users)
- `notes` (TEXT)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- room_id
- status
- updated_at

### 2. BedAssignment
Manages individual bed assignments in shared PG rooms.

**File:** `backend/models/BedAssignment.js`

**Fields:**
- `id` (UUID, Primary Key)
- `roomId` (UUID, Foreign Key -> rooms)
- `bedNumber` (INTEGER, 1-10)
- `status` (ENUM: 'occupied', 'vacant')
- `bookingId` (UUID, Foreign Key -> bookings, nullable)
- `occupantId` (UUID, Foreign Key -> users, nullable)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- room_id
- booking_id
- status
- UNIQUE(room_id, bed_number)

### 3. Payment
Records all payment transactions for bookings.

**File:** `backend/models/Payment.js`

**Fields:**
- `id` (UUID, Primary Key)
- `bookingId` (UUID, Foreign Key -> bookings)
- `amount` (DECIMAL(10,2))
- `paymentDate` (DATE)
- `paymentMethod` (ENUM: 'cash', 'card', 'upi', 'bank_transfer')
- `transactionReference` (STRING, nullable)
- `paymentType` (ENUM: 'booking', 'monthly_rent', 'security_deposit')
- `status` (ENUM: 'pending', 'completed', 'failed', 'refunded')
- `recordedBy` (UUID, Foreign Key -> users)
- `notes` (TEXT, nullable)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- booking_id
- payment_date
- status
- payment_type

### 4. PaymentSchedule
Manages monthly payment schedules for PG residents.

**File:** `backend/models/PaymentSchedule.js`

**Fields:**
- `id` (UUID, Primary Key)
- `bookingId` (UUID, Foreign Key -> bookings)
- `bedId` (UUID, Foreign Key -> bed_assignments, nullable)
- `dueDate` (DATEONLY)
- `amount` (DECIMAL(10,2))
- `status` (ENUM: 'pending', 'paid', 'overdue')
- `paidDate` (DATEONLY, nullable)
- `paymentId` (UUID, Foreign Key -> payments, nullable)
- `daysOverdue` (VIRTUAL - calculated field)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- booking_id
- bed_id
- due_date
- status

### 5. SecurityDeposit
Tracks security deposits collected and refunded.

**File:** `backend/models/SecurityDeposit.js`

**Fields:**
- `id` (UUID, Primary Key)
- `bookingId` (UUID, Foreign Key -> bookings, UNIQUE)
- `amount` (DECIMAL(10,2))
- `collectedDate` (DATEONLY)
- `paymentMethod` (ENUM: 'cash', 'card', 'upi', 'bank_transfer')
- `status` (ENUM: 'collected', 'refunded', 'partially_refunded')
- `refundAmount` (DECIMAL(10,2), nullable)
- `refundDate` (DATEONLY, nullable)
- `deductions` (JSONB - array of {reason, amount})
- `refundedBy` (UUID, Foreign Key -> users, nullable)
- `notes` (TEXT, nullable)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- booking_id
- status
- collected_date

### 6. MaintenanceRequest
Manages room maintenance requests and tracking.

**File:** `backend/models/MaintenanceRequest.js`

**Fields:**
- `id` (UUID, Primary Key)
- `roomId` (UUID, Foreign Key -> rooms)
- `title` (STRING, 3-200 chars)
- `description` (TEXT)
- `priority` (ENUM: 'low', 'medium', 'high', 'urgent')
- `status` (ENUM: 'pending', 'in_progress', 'completed', 'cancelled')
- `reportedBy` (UUID, Foreign Key -> users)
- `assignedTo` (UUID, Foreign Key -> users, nullable)
- `reportedDate` (DATE)
- `expectedCompletionDate` (DATEONLY, nullable)
- `completedDate` (DATE, nullable)
- `workPerformed` (TEXT, nullable)
- `costIncurred` (DECIMAL(10,2), nullable)
- `images` (JSONB - array of URLs)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- room_id
- status
- priority
- reported_date
- assigned_to

### 7. HousekeepingLog
Logs room cleaning activities.

**File:** `backend/models/HousekeepingLog.js`

**Fields:**
- `id` (UUID, Primary Key)
- `roomId` (UUID, Foreign Key -> rooms)
- `cleanedBy` (UUID, Foreign Key -> users)
- `cleanedAt` (DATE)
- `timeTaken` (INTEGER - minutes, 0-480)
- `checklistCompleted` (JSONB - array of {item, completed})
- `issuesFound` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- room_id
- cleaned_by
- cleaned_at

### 8. RoomCategory
Custom room categories defined by property owners.

**File:** `backend/models/RoomCategory.js`

**Fields:**
- `id` (UUID, Primary Key)
- `propertyId` (UUID, Foreign Key -> users - property owner)
- `name` (STRING, 2-100 chars)
- `description` (TEXT, nullable)
- `isActive` (BOOLEAN)
- `createdAt`, `updatedAt` (Timestamps)

**Indexes:**
- property_id
- is_active
- UNIQUE(property_id, name)

## Extended Existing Models

### Room Model Extensions
**File:** `backend/models/Room.js`

**New Fields:**
- `floorNumber` (INTEGER, 0-100, nullable)
- `roomNumber` (STRING, 1-20 chars, nullable)
- `customCategoryId` (UUID, Foreign Key -> room_categories, nullable)
- `sharingType` (ENUM: 'single', '2_sharing', '3_sharing', nullable)
- `totalBeds` (INTEGER, 1-10, nullable)
- `currentStatus` (ENUM: 'occupied', 'vacant_clean', 'vacant_dirty', default: 'vacant_clean')
- `lastCleanedAt` (DATE, nullable)
- `lastMaintenanceAt` (DATE, nullable)

### Booking Model Extensions
**File:** `backend/models/Booking.js`

**New Fields:**
- `bookingSource` (ENUM: 'online', 'offline', default: 'online')
- `bedId` (UUID, Foreign Key -> bed_assignments, nullable)
- `actualCheckInTime` (DATE, nullable)
- `actualCheckOutTime` (DATE, nullable)
- `securityDepositId` (UUID, Foreign Key -> security_deposits, nullable)
- `checkedInBy` (UUID, Foreign Key -> users, nullable)
- `checkedOutBy` (UUID, Foreign Key -> users, nullable)

### User Model Extensions
**File:** `backend/models/User.js`

**New Fields:**
- `staffRole` (ENUM: 'front_desk', 'housekeeping', 'maintenance', 'manager', nullable)
- `permissions` (JSONB with fields: canCheckIn, canCheckOut, canManageRooms, canRecordPayments, canViewReports, canManageStaff, canUpdateRoomStatus, canManageMaintenance)

## Model Associations

All associations have been properly configured in `backend/models/index.js`:

### Room Associations
- `Room.hasMany(RoomStatus)` as 'statusHistory'
- `Room.hasMany(BedAssignment)` as 'beds'
- `Room.hasMany(MaintenanceRequest)` as 'maintenanceRequests'
- `Room.hasMany(HousekeepingLog)` as 'housekeepingLogs'
- `Room.belongsTo(RoomCategory)` as 'customCategory'

### Booking Associations
- `Booking.hasMany(Payment)` as 'payments'
- `Booking.hasMany(PaymentSchedule)` as 'paymentSchedules'
- `Booking.hasOne(SecurityDeposit)` as 'securityDeposit'
- `Booking.hasMany(BedAssignment)` as 'assignedBeds'

### User Associations
- `User.hasMany(RoomStatus)` as 'roomStatusUpdates'
- `User.hasMany(Payment)` as 'recordedPayments'
- `User.hasMany(MaintenanceRequest)` as 'reportedMaintenanceRequests'
- `User.hasMany(MaintenanceRequest)` as 'assignedMaintenanceRequests'
- `User.hasMany(HousekeepingLog)` as 'cleaningLogs'
- `User.hasMany(RoomCategory)` as 'roomCategories'
- `User.hasMany(SecurityDeposit)` as 'refundedDeposits'

### New Model Associations
All new models have proper belongsTo associations back to their parent models.

## Migration Script

**File:** `backend/scripts/migrateInternalManagementFields.js`

This script adds the new columns to existing tables (Room, Booking, User) without dropping data. It can be run safely multiple times as it checks for existing columns before adding them.

**Usage:**
```bash
node backend/scripts/migrateInternalManagementFields.js
```

## Testing

### Structure Test (No DB Required)
**File:** `backend/scripts/testModelsStructure.js`

Tests model definitions, attributes, and associations without requiring a database connection.

**Usage:**
```bash
node backend/scripts/testModelsStructure.js
```

**Results:** ✅ All tests passed
- 13 models verified
- All attributes present
- All associations configured correctly
- All table names correct

### Full Database Test
**File:** `backend/scripts/testModels.js`

Tests database synchronization, indexes, and table structures. Requires valid database connection.

**Usage:**
```bash
node backend/scripts/testModels.js
```

## Next Steps

1. Run the migration script when database is available
2. Create API endpoints for internal management features
3. Implement authentication middleware for internal users
4. Build frontend components for the internal management app

## Requirements Validated

This implementation satisfies the following requirements from the design document:
- Requirement 5.2: Bed assignment for PG rooms
- Requirement 7.1: Room status management
- Requirement 20.1: Payment schedule tracking
- Requirement 21.1: Payment recording
- Requirement 29.1: Security deposit management
- Requirement 30.1: Maintenance request tracking
- Requirement 1.1: Floor-based room organization
- Requirement 5.1: Sharing type configuration
- Requirement 17.2: Booking source tracking
- Requirement 33.1: Staff role and permissions
