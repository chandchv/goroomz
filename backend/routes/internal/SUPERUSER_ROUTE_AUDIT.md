# Superuser Route Audit - Phase 3

## Overview
The `backend/routes/internal/superuser.js` file currently uses the Room model for property operations, which violates the Property-Room hierarchy. This audit identifies all issues and provides a migration plan.

## Current Issues

### 1. Property Owner Management Section
**Endpoints Affected:**
- `GET /api/internal/superuser/property-owners`
- `GET /api/internal/superuser/property-owners/:id`
- `PUT /api/internal/superuser/property-owners/:id/deactivate`

**Problems:**
- Uses `Room` model with `as: 'ownedRooms'` to fetch properties
- Transforms Room data to look like Property data (workaround)
- Deactivation updates `Room.isActive` instead of `Property.isActive`

**Fix Required:**
- Replace `Room` includes with `Property` includes
- Use `as: 'properties'` association
- Update deactivation to target Property model

### 2. Property Management Section
**Endpoints Affected:**
- `POST /api/internal/superuser/properties`
- `PUT /api/internal/superuser/properties/:id`
- `POST /api/internal/superuser/properties/:id/bulk-rooms`
- `PUT /api/internal/superuser/properties/:id/transfer-ownership`
- `GET /api/internal/superuser/properties/:id/statistics`

**Problems:**
- Creates properties using `Room.create()` instead of `Property.create()`
- Updates properties using `Room.findByPk()` instead of `Property.findByPk()`
- Bulk room creation fetches property as Room instead of Property
- Transfer ownership updates Room records instead of Property
- Statistics endpoint treats Room as property

**Fix Required:**
- Use Property model for all property-level operations
- Keep Room model only for actual room operations
- Update bulk room creation to properly reference Property
- Fix transfer ownership to update Property and its Rooms
- Update statistics to query Property with Room associations

### 3. Bulk Room Creation Endpoint
**Endpoint:** `POST /api/internal/superuser/bulk-create-rooms`

**Problems:**
- Fetches property using `Room.findByPk(propertyId)`
- Should use `Property.findByPk(propertyId)`
- Creates rooms correctly but references wrong property model

**Fix Required:**
- Change property fetch to use Property model
- Ensure propertyId references properties table, not rooms table

## Detailed Migration Plan

### Step 1: Update Property Owner Endpoints

#### GET /property-owners
```javascript
// BEFORE
include: [{ 
  model: Room, 
  as: 'ownedRooms', 
  attributes: [...],
  required: false 
}]

// AFTER
include: [{ 
  model: Property, 
  as: 'properties', 
  attributes: ['id', 'name', 'type', 'location', 'isActive', 'createdAt'],
  required: false,
  include: [{
    model: Room,
    as: 'rooms',
    attributes: ['id', 'currentStatus'],
    required: false
  }]
}]
```

#### GET /property-owners/:id
```javascript
// BEFORE
include: [{
  model: Room, as: 'ownedRooms',
  include: [{ model: Booking, as: 'bookings', ... }]
}]

// AFTER
include: [{
  model: Property, as: 'properties',
  include: [{
    model: Room, as: 'rooms',
    include: [{ model: Booking, as: 'bookings', ... }]
  }]
}]
```

#### PUT /property-owners/:id/deactivate
```javascript
// BEFORE
await Room.update({ isActive: false }, { where: { ownerId: id } });

// AFTER
await Property.update({ isActive: false }, { where: { ownerId: id } });
// Also update rooms if needed
await Room.update({ isActive: false }, { 
  where: { 
    propertyId: { 
      [Op.in]: sequelize.literal(`(SELECT id FROM properties WHERE owner_id = '${id}')`)
    }
  }
});
```

### Step 2: Update Property Management Endpoints

#### POST /properties
```javascript
// BEFORE
const property = await Room.create({
  ownerId, title, description, category, roomType, ...
});

// AFTER
const property = await Property.create({
  ownerId, 
  name: title,  // Property uses 'name' not 'title'
  description, 
  type: propertyType.toLowerCase(),  // 'hotel', 'pg', etc.
  categoryId,  // Must provide category ID
  location,
  amenities,
  rules,
  isActive: true,
  approvalStatus: 'approved',
  approvedAt: new Date(),
  approvedBy: req.user.id
});
```

#### PUT /properties/:id
```javascript
// BEFORE
const property = await Room.findByPk(id);

// AFTER
const property = await Property.findByPk(id);
```

#### POST /properties/:id/bulk-rooms
```javascript
// BEFORE
const property = await Room.findByPk(propertyId);

// AFTER
const property = await Property.findByPk(propertyId);

// Room creation stays the same but ensure:
// - propertyId references Property.id
// - Room.propertyId is set correctly
```

#### PUT /properties/:id/transfer-ownership
```javascript
// BEFORE
const property = await Room.findByPk(propertyId);
property.ownerId = newOwnerId;
await property.save({ transaction });
await Room.update({ ownerId: newOwnerId }, {
  where: { ownerId: oldOwnerId, title: { [Op.like]: `${property.title}%` } },
  transaction
});

// AFTER
const property = await Property.findByPk(propertyId);
property.ownerId = newOwnerId;
await property.save({ transaction });
// Update all rooms belonging to this property
await Room.update({ ownerId: newOwnerId }, {
  where: { propertyId: propertyId },
  transaction
});
```

#### GET /properties/:id/statistics
```javascript
// BEFORE
const property = await Room.findByPk(propertyId);
const rooms = await Room.findAll({
  where: { ownerId: property.ownerId, title: { [Op.like]: `${property.title}%` } },
  ...
});

// AFTER
const property = await Property.findByPk(propertyId, {
  include: [{
    model: Room,
    as: 'rooms',
    include: [{ model: Booking, as: 'bookings', ... }]
  }]
});
const rooms = property.rooms || [];
```

### Step 3: Update Bulk Room Creation

#### POST /bulk-create-rooms
```javascript
// BEFORE
const property = await Room.findByPk(propertyId);

// AFTER
const property = await Property.findByPk(propertyId);

// Ensure room creation uses:
await Room.create({
  propertyId: propertyId,  // References Property.id
  ownerId: property.ownerId,
  title: `${property.name} - Room ${roomNumber}`,  // Use property.name
  category: property.type,  // Map property.type to room.category
  ...
}, { transaction });
```

## Model Mapping Reference

### Property Model → Room Model (for room creation)
```javascript
Property.name → Room.title (prefix)
Property.type → Room.category (needs mapping)
Property.location → Room.location (copy)
Property.amenities → Room.amenities (copy)
Property.rules → Room.rules (copy)
Property.ownerId → Room.ownerId (copy)
Property.id → Room.propertyId (reference)
```

### Type Mapping
```javascript
// Property.type → Room.category
'hotel' → 'Hotel Room'
'pg' → 'PG'
'hostel' → 'PG' or 'Hotel Room' (depends on context)
'homestay' → 'Home Stay'
'apartment' → 'Independent Home'
```

## Testing Checklist

### Property Owner Management
- [ ] List property owners shows correct property count
- [ ] Property owner details shows properties (not rooms)
- [ ] Deactivating owner deactivates all their properties
- [ ] Statistics show correct property and room counts

### Property Management
- [ ] Create property creates Property record (not Room)
- [ ] Update property updates Property record
- [ ] Bulk room creation creates rooms under correct property
- [ ] Transfer ownership updates Property and all Rooms
- [ ] Statistics show correct room and booking data

### Bulk Room Creation
- [ ] Fetches property from properties table
- [ ] Creates rooms with correct propertyId reference
- [ ] Room numbers follow floor convention
- [ ] Bed assignments created correctly

## Import Changes Required

```javascript
// BEFORE
const { User, Room, Booking, Payment, RoomCategory, BedAssignment, sequelize } = require('../../models');

// AFTER
const { User, Property, Room, Booking, Payment, RoomCategory, BedAssignment, sequelize } = require('../../models');
```

## Backward Compatibility Notes

### Breaking Changes
1. Property creation now returns Property model structure (not Room)
2. Property IDs now reference properties table (not rooms table)
3. Frontend may need updates if it expects Room structure

### Migration Path
1. Update backend first (this phase)
2. Test all endpoints with Postman/curl
3. Update frontend to use new Property structure
4. Deprecate old Room-based property endpoints

## Estimated Impact

### High Impact (Breaking Changes)
- POST /properties - Returns different structure
- GET /property-owners - Returns different structure
- PUT /properties/:id/transfer-ownership - Different behavior

### Medium Impact (Structure Changes)
- GET /property-owners/:id - Nested structure changes
- GET /properties/:id/statistics - Response structure changes

### Low Impact (Internal Changes)
- PUT /properties/:id - Same interface, different model
- POST /properties/:id/bulk-rooms - Same interface
- PUT /property-owners/:id/deactivate - Same interface

## Next Steps

1. ✅ Complete Phase 2 (Platform Properties Route)
2. ⏳ Start Phase 3 (Superuser Route Migration)
3. ⏳ Update frontend to handle new Property structure
4. ⏳ Add integration tests for all endpoints
5. ⏳ Update API documentation

## Files to Modify

1. `backend/routes/internal/superuser.js` - Main migration file
2. `backend/models/index.js` - Already updated with Property associations
3. Frontend files (if needed):
   - `internal-management/app/services/superuserService.ts`
   - `internal-management/app/pages/PropertyOwnerManagementPage.tsx`
   - `internal-management/app/components/PropertyOwnerModal.tsx`

## Date Created
November 26, 2025
