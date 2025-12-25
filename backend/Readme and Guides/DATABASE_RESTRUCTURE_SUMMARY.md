# Database Restructure Summary

## What Was Done

I've created a proper database structure to match your application's hierarchy:

**Category → Property → Rooms → Beds**

## New Models Created

### 1. Property Model (`backend/models/Property.js`)
Represents the actual hotel, PG, homestay, or apartment building.

**Key Features**:
- Belongs to a Category (e.g., "Budget Hotels", "Luxury PGs")
- Has an Owner (user)
- Contains multiple Rooms
- Has property-level amenities, images, rules
- Tracks approval status, ratings, location
- Can have multiple staff members assigned

### 2. RoomNew Model (`backend/models/RoomNew.js`)
Represents individual rooms within a property.

**Key Features**:
- Belongs to a Property (required foreign key)
- Has room number, floor number
- Tracks sharing type (single, double, triple, quad, dormitory)
- Has room-specific amenities, images, pricing
- Tracks status (occupied, vacant_clean, vacant_dirty, maintenance)
- Unique constraint: (property_id, room_number)

### 3. PropertyStaff Model (`backend/models/PropertyStaff.js`)
Manages staff assignments to properties.

**Key Features**:
- Links a User (staff member) to a Property
- Defines role (manager, receptionist, housekeeping, etc.)
- Tracks permissions, salary, work schedule
- Tracks join/leave dates
- Unique constraint: (property_id, user_id)

## Current vs New Structure

### Current (Problematic)
```
rooms table
├── Properties (where property_id IS NULL)
└── Rooms (where property_id IS NOT NULL)
```
**Problem**: One table trying to be two things!

### New (Proper Hierarchy)
```
categories
    ↓
properties
    ↓
rooms_new
    ↓
bed_assignments

property_staff → properties
```

## Example Data Structure

```
Category: "Budget Hotels"
    │
    ├── Property: "Sunrise Hotel" (Owner: John Doe)
    │   ├── Staff: Jane (Manager), Bob (Receptionist)
    │   └── Rooms:
    │       ├── Room 101 (Floor 1, Double, 2 beds, ₹1000/bed)
    │       ├── Room 102 (Floor 1, Single, 1 bed, ₹1500/room)
    │       └── Room 201 (Floor 2, Triple, 3 beds, ₹800/bed)
    │
    └── Property: "Moonlight Inn" (Owner: Sarah Wilson)
        ├── Staff: Tom (Manager)
        └── Rooms:
            ├── Room 1 (Dormitory, 6 beds, ₹500/bed)
            └── Room 2 (Dormitory, 6 beds, ₹500/bed)

Category: "Luxury PGs"
    │
    └── Property: "Green Valley PG" (Owner: Mike Chen)
        ├── Staff: Lisa (Manager), David (Cook)
        └── Rooms:
            ├── Room A1 (Double, 2 beds, ₹8000/month)
            └── Room A2 (Double, 2 beds, ₹8000/month)
```

## What You Need to Do Next

### Option 1: Gradual Migration (Recommended)
1. **Review the plan**: Read `DATABASE_RESTRUCTURE_PLAN.md`
2. **Test on dev database**: Create migrations and test data migration
3. **Update API endpoints**: Gradually add new endpoints while keeping old ones
4. **Update frontend**: Update components to use new structure
5. **Deploy**: Once tested, deploy to production

### Option 2: Quick Start (For New Projects)
If you're starting fresh or have minimal data:
1. Drop existing `rooms` table
2. Rename `rooms_new` to `rooms`
3. Use the new models directly
4. Update all code to use new structure

## Migration Steps (Detailed)

### Step 1: Create Tables
Run migrations to create:
- `properties` table
- `rooms_new` table  
- `property_staff` table

### Step 2: Migrate Data
```javascript
// Pseudo-code for migration
// 1. Find all "properties" in current rooms table
const properties = await Room.findAll({ where: { propertyId: null } });

// 2. Create Property records
for (const prop of properties) {
  await Property.create({
    id: prop.id,
    name: prop.title,
    type: mapCategoryToType(prop.category),
    categoryId: findOrCreateCategory(prop.category),
    ownerId: prop.ownerId,
    location: prop.location,
    // ... other fields
  });
}

// 3. Migrate rooms
const rooms = await Room.findAll({ where: { propertyId: { [Op.ne]: null } } });

for (const room of rooms) {
  await RoomNew.create({
    id: room.id,
    propertyId: room.propertyId,
    roomNumber: room.roomNumber,
    floorNumber: room.floorNumber,
    // ... other fields
  });
}
```

### Step 3: Update Foreign Keys
Update all tables that reference `rooms`:
- `bookings.room_id` → points to `rooms_new`
- `bed_assignments.room_id` → points to `rooms_new`
- `housekeeping_logs.room_id` → points to `rooms_new`
- etc.

### Step 4: Update Application Code

**API Routes**:
```javascript
// Old
GET /api/rooms → Returns properties and rooms mixed

// New
GET /api/properties → Returns only properties
GET /api/properties/:id → Property details
GET /api/properties/:id/rooms → Rooms for that property
GET /api/rooms/:id → Specific room details
```

**Frontend Components**:
```javascript
// Old
<PropertyList /> // Shows rooms table data

// New
<PropertyList /> // Shows properties table data
<PropertyDetail propertyId={id}>
  <RoomList propertyId={id} /> // Shows rooms for property
</PropertyDetail>
```

## Benefits of New Structure

1. ✅ **Clear Separation**: Properties and rooms are distinct entities
2. ✅ **Proper Ownership**: Properties have owners, rooms belong to properties
3. ✅ **Staff Management**: Can assign staff to properties with roles
4. ✅ **Better Queries**: Easy to get all rooms for a property
5. ✅ **Scalability**: Can add property-level features independently
6. ✅ **Data Integrity**: Foreign keys ensure referential integrity
7. ✅ **Flexibility**: Different room types within same property

## Files Created

1. ✅ `backend/models/Property.js` - Property model
2. ✅ `backend/models/RoomNew.js` - New room model
3. ✅ `backend/models/PropertyStaff.js` - Staff assignment model
4. ✅ `backend/DATABASE_RESTRUCTURE_PLAN.md` - Detailed migration plan
5. ✅ `backend/DATABASE_RESTRUCTURE_SUMMARY.md` - This file

## Questions?

**Q: Will this break my existing application?**
A: Not immediately. The new tables are separate. You can migrate gradually.

**Q: How long will migration take?**
A: Depends on data volume. For <10k records, should be quick (<1 hour).

**Q: Can I rollback if something goes wrong?**
A: Yes! Keep the old `rooms` table as `rooms_old` for 30 days.

**Q: Do I need to update all code at once?**
A: No. You can run both structures in parallel during transition.

## Need Help?

If you want me to:
1. Create the migration files
2. Write the data migration script
3. Update specific API endpoints
4. Update frontend components

Just let me know which part you'd like help with!
