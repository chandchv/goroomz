# Database Restructure Plan: Proper Property-Room Hierarchy

## Problem Statement

The current database structure uses the `rooms` table to represent both properties (hotels, PGs, homestays) AND individual rooms within those properties. This creates confusion and makes it difficult to:

1. Properly model the hierarchy: Category → Property → Rooms
2. Manage property-level information separately from room-level information
3. Assign staff to properties
4. Track property ownership vs room management

## Proposed Solution

Create a proper hierarchical structure with separate tables:

```
categories (existing)
    ↓
properties (NEW)
    ↓
rooms_new (NEW - replaces rooms)
    ↓
bed_assignments (existing)

property_staff (NEW)
    ↓
properties
```

## New Database Schema

### 1. Properties Table

**Purpose**: Represents the actual physical property (hotel, PG, homestay, etc.)

**Key Fields**:
- `id` (UUID, PK)
- `name` - Property name (e.g., "Sunrise Hotel", "Green Valley PG")
- `type` - ENUM('hotel', 'pg', 'hostel', 'homestay', 'apartment')
- `category_id` - FK to categories (e.g., "Budget Hotels", "Luxury PGs")
- `owner_id` - FK to users (property owner)
- `location` - JSONB (full address with coordinates)
- `contact_info` - JSONB (phone, email, website)
- `amenities` - ARRAY (property-level amenities)
- `images` - JSONB (property photos)
- `rules` - ARRAY (property rules)
- `total_floors` - INTEGER
- `total_rooms` - INTEGER (calculated)
- `check_in_time` - TIME
- `check_out_time` - TIME
- `rating` - JSONB {average, count}
- `is_active` - BOOLEAN
- `is_featured` - BOOLEAN
- `approval_status` - ENUM('pending', 'approved', 'rejected')
- `approved_at` - TIMESTAMP
- `approved_by` - FK to users (admin)
- `rejection_reason` - TEXT
- `metadata` - JSONB (additional data)

### 2. Rooms_New Table

**Purpose**: Represents individual rooms within a property

**Key Fields**:
- `id` (UUID, PK)
- `property_id` - FK to properties (REQUIRED)
- `room_number` - STRING (e.g., "101", "102", "201")
- `floor_number` - INTEGER
- `name` - STRING (optional, e.g., "Deluxe Suite")
- `description` - TEXT
- `room_type` - ENUM('standard', 'deluxe', 'suite', 'dormitory', 'private', 'shared')
- `sharing_type` - ENUM('single', 'double', 'triple', 'quad', 'dormitory')
- `total_beds` - INTEGER
- `price` - DECIMAL
- `pricing_type` - ENUM('per_bed', 'per_room', 'per_night', 'per_month')
- `amenities` - ARRAY (room-specific amenities)
- `images` - JSONB (room photos)
- `current_status` - ENUM('occupied', 'vacant_clean', 'vacant_dirty', 'maintenance', 'blocked')
- `is_active` - BOOLEAN
- `last_cleaned_at` - TIMESTAMP
- `last_maintenance_at` - TIMESTAMP
- `notes` - TEXT
- `metadata` - JSONB

**Unique Constraint**: (property_id, room_number)

### 3. Property_Staff Table

**Purpose**: Manages staff assignments to properties

**Key Fields**:
- `id` (UUID, PK)
- `property_id` - FK to properties
- `user_id` - FK to users (staff member)
- `role` - ENUM('manager', 'receptionist', 'housekeeping', 'maintenance', 'security', 'cook', 'accountant', 'other')
- `permissions` - JSONB {canCheckIn, canCheckOut, canManageRooms, canViewReports}
- `salary` - DECIMAL (optional)
- `joined_at` - TIMESTAMP
- `left_at` - TIMESTAMP (NULL if active)
- `is_active` - BOOLEAN
- `work_schedule` - JSONB {days, shifts}
- `contact_info` - JSONB
- `notes` - TEXT

**Unique Constraint**: (property_id, user_id)

### 4. Categories Table (Updated)

**Purpose**: Categorizes properties (e.g., "Budget Hotels", "Luxury PGs", "Student Hostels")

**Key Fields** (existing + updates):
- `id` (UUID, PK)
- `name` - STRING (e.g., "Budget Hotels", "Luxury PGs")
- `description` - TEXT
- `icon` - STRING
- `image` - STRING
- `is_active` - BOOLEAN
- `sort_order` - INTEGER
- `property_types` - ARRAY (which property types belong to this category)
- `default_amenities` - ARRAY

## Data Hierarchy

```
Category: "Budget Hotels"
    ├── Property: "Sunrise Hotel"
    │   ├── Owner: John Doe
    │   ├── Staff:
    │   │   ├── Manager: Jane Smith
    │   │   ├── Receptionist: Bob Johnson
    │   │   └── Housekeeping: Alice Brown
    │   └── Rooms:
    │       ├── Room 101 (Floor 1, Double, 2 beds)
    │       ├── Room 102 (Floor 1, Single, 1 bed)
    │       ├── Room 201 (Floor 2, Triple, 3 beds)
    │       └── Room 202 (Floor 2, Quad, 4 beds)
    │
    └── Property: "Moonlight Inn"
        ├── Owner: Sarah Wilson
        ├── Staff:
        │   └── Manager: Tom Davis
        └── Rooms:
            ├── Room 1 (Floor 0, Dormitory, 6 beds)
            └── Room 2 (Floor 0, Dormitory, 6 beds)

Category: "Luxury PGs"
    └── Property: "Green Valley PG"
        ├── Owner: Mike Chen
        ├── Staff:
        │   ├── Manager: Lisa Wang
        │   └── Cook: David Lee
        └── Rooms:
            ├── Room A1 (Floor 1, Double, 2 beds)
            ├── Room A2 (Floor 1, Double, 2 beds)
            └── Room B1 (Floor 2, Triple, 3 beds)
```

## Migration Strategy

### Phase 1: Create New Tables (Non-Breaking)

1. Create `properties` table
2. Create `rooms_new` table
3. Create `property_staff` table
4. Update `categories` table with new fields

### Phase 2: Data Migration

1. **Identify Properties in Current Rooms Table**:
   - Properties are rooms where `property_id IS NULL`
   - These represent the actual hotels/PGs/homestays

2. **Migrate Properties**:
   ```sql
   INSERT INTO properties (id, name, type, category_id, owner_id, location, ...)
   SELECT 
     id,
     title as name,
     CASE 
       WHEN category = 'Hotel Room' THEN 'hotel'
       WHEN category = 'PG' THEN 'pg'
       ELSE 'hostel'
     END as type,
     -- Map to appropriate category_id
     owner_id,
     location,
     ...
   FROM rooms
   WHERE property_id IS NULL;
   ```

3. **Migrate Rooms**:
   ```sql
   INSERT INTO rooms_new (id, property_id, room_number, floor_number, ...)
   SELECT 
     id,
     property_id,
     room_number,
     floor_number,
     ...
   FROM rooms
   WHERE property_id IS NOT NULL;
   ```

4. **Update Foreign Keys**:
   - Update `bookings.room_id` to reference `rooms_new`
   - Update `bed_assignments.room_id` to reference `rooms_new`
   - Update other tables referencing rooms

### Phase 3: Update Application Code

1. Update models to use new structure
2. Update API endpoints:
   - `/api/properties` - List properties
   - `/api/properties/:id` - Get property details
   - `/api/properties/:id/rooms` - Get rooms for a property
   - `/api/properties/:id/staff` - Get staff for a property
3. Update frontend components
4. Update internal management system

### Phase 4: Deprecate Old Structure

1. Rename `rooms` table to `rooms_old`
2. Rename `rooms_new` to `rooms`
3. Keep `rooms_old` for 30 days as backup
4. Drop `rooms_old` after verification

## Benefits

1. **Clear Hierarchy**: Category → Property → Room → Bed
2. **Proper Ownership**: Properties have owners, rooms belong to properties
3. **Staff Management**: Staff can be assigned to properties with specific roles
4. **Better Queries**: Easy to get all rooms for a property, all properties in a category
5. **Scalability**: Can add property-level features without affecting rooms
6. **Data Integrity**: Foreign key constraints ensure referential integrity
7. **Flexibility**: Can have different room types within same property

## API Changes

### Old Structure
```
GET /api/rooms - Returns mix of properties and rooms
GET /api/rooms/:id - Could be property or room
```

### New Structure
```
GET /api/properties - List all properties
GET /api/properties/:id - Get property details
GET /api/properties/:id/rooms - Get rooms for property
GET /api/properties/:id/staff - Get staff for property
GET /api/rooms/:id - Get specific room details
GET /api/categories/:id/properties - Get properties in category
```

## Implementation Files

1. **Models**:
   - `backend/models/Property.js` ✅ Created
   - `backend/models/RoomNew.js` ✅ Created
   - `backend/models/PropertyStaff.js` ✅ Created

2. **Migrations**:
   - `backend/migrations/YYYYMMDD-create-properties-table.js` (TODO)
   - `backend/migrations/YYYYMMDD-create-rooms-new-table.js` (TODO)
   - `backend/migrations/YYYYMMDD-create-property-staff-table.js` (TODO)
   - `backend/migrations/YYYYMMDD-migrate-data-to-new-structure.js` (TODO)

3. **Scripts**:
   - `backend/scripts/migrateToNewStructure.js` (TODO)
   - `backend/scripts/verifyDataMigration.js` (TODO)

## Next Steps

1. Review and approve this restructure plan
2. Create migration files
3. Test migration on development database
4. Update application code
5. Deploy to staging for testing
6. Deploy to production with rollback plan

## Rollback Plan

If issues arise:
1. Keep `rooms_old` table intact
2. Revert foreign keys to point to `rooms_old`
3. Drop new tables (`properties`, `rooms_new`, `property_staff`)
4. Restore application code from backup
