# Property Listing - Known Issues & Solutions

## Issue: Room Model Association Fields

### Problem
When creating rooms linked to properties, Sequelize tries to return `owner_id`, `category_owner_id`, and `custom_category_id` in the RETURNING clause, but these columns don't exist in the rooms table after the database restructure.

### Root Cause
The `backend/models/index.js` file defines associations between Room and User models using these foreign keys:
- `Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' })`
- `Room.belongsTo(User, { foreignKey: 'categoryOwnerId', as: 'categoryOwner' })`
- `Room.belongsTo(RoomCategory, { foreignKey: 'customCategoryId', as: 'customCategory' })`

These associations were for the old standalone room system. With the new property-room hierarchy, ownership is tracked through the Property model, not directly on rooms.

### Solution Options

#### Option 1: Remove Legacy Associations (Recommended)
Remove the old Room-User associations from `models/index.js` since rooms are now owned through properties:

```javascript
// REMOVE these lines from models/index.js:
User.hasMany(Room, {
  foreignKey: 'ownerId',
  as: 'ownedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

User.hasMany(Room, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwnedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwner'
});

Room.belongsTo(RoomCategory, {
  foreignKey: 'customCategoryId',
  as: 'customCategory'
});
```

#### Option 2: Add Migration to Add Columns (Not Recommended)
Add a migration to add these columns back to the rooms table. This is not recommended because it defeats the purpose of the property-room hierarchy.

#### Option 3: Use Raw Queries (Temporary Workaround)
For now, use raw SQL queries to insert rooms without triggering Sequelize's association logic:

```javascript
const [room] = await sequelize.query(`
  INSERT INTO rooms (
    id, property_id, title, description, price, max_guests,
    category, room_type, pricing_type, location, amenities,
    rules, images, approval_status, is_active, room_number,
    floor_number, sharing_type, total_beds, current_status,
    created_at, updated_at
  ) VALUES (
    :id, :propertyId, :title, :description, :price, :maxGuests,
    :category, :roomType, :pricingType, :location, :amenities,
    :rules, :images, :approvalStatus, :isActive, :roomNumber,
    :floorNumber, :sharingType, :totalBeds, :currentStatus,
    NOW(), NOW()
  )
  RETURNING *
`, {
  replacements: roomData,
  type: sequelize.QueryTypes.INSERT,
  transaction
});
```

### Recommended Action

**Remove the legacy associations** from `models/index.js`. The new workflow is:
1. User owns Property (via `Property.ownerId`)
2. Property has Rooms (via `Room.propertyId`)
3. To get room owner: `Room → Property → User`

This maintains data integrity and follows the new hierarchy.

### Impact

**Breaking Change:** Code that directly queries `room.owner` will need to be updated to:
```javascript
// Old way (broken):
const room = await Room.findByPk(id, {
  include: [{ model: User, as: 'owner' }]
});

// New way:
const room = await Room.findByPk(id, {
  include: [{
    model: Property,
    as: 'property',
    include: [{
      model: User,
      as: 'owner'
    }]
  }]
});
```

### Files to Update

1. **`backend/models/index.js`** - Remove legacy Room-User associations
2. **`backend/routes/rooms.js`** - Update queries to use Property association
3. **Any other files** that query `room.owner` directly

### Migration Path

1. Update `models/index.js` to remove legacy associations
2. Update all routes that query room owners
3. Test thoroughly
4. Deploy

### Temporary Workaround for Testing

Until the associations are removed, you can test the property creation API directly via HTTP instead of using the test script:

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"password"}' \
  | jq -r '.token')

# Create property
curl -X POST http://localhost:5000/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test PG",
    "description": "A test property",
    "type": "pg",
    "categoryId": "CATEGORY_UUID",
    "location": {
      "address": "123 Test St",
      "city": "Bangalore",
      "state": "Karnataka"
    },
    "amenities": ["wifi"],
    "images": [],
    "rules": [],
    "createRoom": true,
    "roomData": {
      "title": "Test Room",
      "price": 5000,
      "category": "PG",
      "roomType": "PG",
      "pricingType": "monthly"
    }
  }'
```

## Status

- ✅ Property creation API implemented
- ✅ Frontend integration complete
- ⚠️ Test script blocked by association issue
- ⏳ Need to remove legacy associations
- ⏳ Need to update existing code that uses room.owner

## Next Steps

1. Remove legacy Room-User associations from `models/index.js`
2. Update routes to use Property → User path for ownership
3. Test property creation end-to-end
4. Update documentation
