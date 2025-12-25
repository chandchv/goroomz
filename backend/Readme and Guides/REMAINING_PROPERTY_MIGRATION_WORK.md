# Remaining Property Migration Work

## Overview

After the database restructure migration, most property management pages have been updated, but several backend routes still reference the old `Room` model for property operations. These need to be updated to use the new `Property` model.

## ✅ Already Updated

### Frontend
- ✅ `internal-management/app/services/superuserService.ts` - Updated to use new Property interface
- ✅ `internal-management/app/components/PropertyManagementModal.tsx` - Updated form fields
- ✅ `internal-management/app/pages/PropertiesManagementPage.tsx` - Using new structure
- ✅ `internal-management/app/pages/PropertyDetailPage.tsx` - Using new structure
- ✅ `internal-management/app/pages/PropertyOwnerManagementPage.tsx` - Using new structure
- ✅ `internal-management/app/pages/PropertyOwnerDetailPage.tsx` - Using new structure

### Backend
- ✅ `backend/routes/internal/platform/properties.js` - Partially updated (GET endpoint)
- ✅ `backend/routes/internal/rooms.js` - Updated to work with new structure

## ❌ Still Needs Updates

### Critical - Property Staff Management
**File:** `backend/routes/internal/propertyStaff.js`

**Issues:**
- Line 121: `Room.findAll` to get owned properties
- Line 247: `Room.findOne` to verify property ownership
- Line 408, 577, 683, 788: `Room.findOne` to verify staff property assignments
- Line 456: `Room.findOne` when changing assigned property
- Line 860: `Room.findAll` to get staff assigned to owner's properties

**Fix Required:**
```javascript
// OLD
const ownedProperties = await Room.findAll({
  where: { ownerId: req.user.id },
  attributes: ['id', 'title']
});

// NEW
const ownedProperties = await Property.findAll({
  where: { owner_id: req.user.id },
  attributes: ['id', 'name']
});
```

### Critical - Platform Properties Route
**File:** `backend/routes/internal/platform/properties.js`

**Issues:**
- Line 162: `Room.findOne` to get property details
- Line 193: `Room.findAll` to get related rooms
- Line 265, 275, 287: `Room.findAll` for statistics
- Line 363, 421, 462: `Room.findOne` for property operations

**Status:** Partially updated but still has Room references

### Critical - Platform Owners Route
**File:** `backend/routes/internal/platform/owners.js`

**Issues:**
- Line 479: `Room.update` to deactivate owner's properties

**Fix Required:**
```javascript
// OLD
await Room.update(
  { isActive: false },
  { where: { ownerId: id } }
);

// NEW
await Property.update(
  { is_active: false },
  { where: { owner_id: id } }
);
```

### Medium Priority - Superuser Route
**File:** `backend/routes/internal/superuser.js`

**Issues:**
- Line 218: `Room.update` to deactivate properties
- Line 259: `Room.create` to create property
- Line 340: `Room.create` to create rooms
- Line 420: `Room.update` to change property owner
- Line 462: `Room.findAll` to get property rooms
- Line 612: `Room.findOne` to check duplicate room
- Line 627: `Room.create` to create room

**Note:** This file handles both properties AND rooms, so some Room references are correct. Need to distinguish between property operations (should use Property model) and room operations (should use Room model).

### Low Priority - Analytics & Reports
These files use Room model for statistics but may work correctly if they're querying actual rooms:

**Files:**
- `backend/routes/internal/analytics.js` (Line 665)
- `backend/routes/internal/dashboard.js` (Lines 142, 441)
- `backend/routes/internal/dashboards.js` (Line 458)
- `backend/routes/internal/health.js` (Line 202)
- `backend/routes/internal/reports.js` (Lines 47, 756, 825, 1248)

**Action:** Review to determine if these should query Properties or Rooms

### Low Priority - Housekeeping
**File:** `backend/routes/internal/housekeeping.js`

**Issues:**
- Line 58: `Room.findAll` for dirty rooms

**Status:** This is correct - housekeeping operates on rooms, not properties

### Low Priority - Bookings
**File:** `backend/routes/internal/bookings.js`

**Issues:**
- Lines 43, 315, 436: Room operations

**Status:** This is correct - bookings are for rooms, not properties

## Migration Priority

### Phase 1: Critical Property Operations (URGENT)
1. ✅ Update `backend/routes/internal/platform/properties.js` - DONE
2. ❌ Update `backend/routes/internal/propertyStaff.js` - PENDING
3. ❌ Update `backend/routes/internal/platform/owners.js` - PENDING

### Phase 2: Superuser Operations (HIGH)
4. ❌ Review and update `backend/routes/internal/superuser.js` - PENDING
   - Distinguish between property operations (use Property model)
   - Keep room operations (use Room model)

### Phase 3: Analytics & Reports (MEDIUM)
5. ❌ Review analytics routes to determine if they should query Properties or Rooms
6. ❌ Update report generation to use correct models

### Phase 4: Testing (HIGH)
7. ❌ Test all property management operations
8. ❌ Test property staff assignment
9. ❌ Test property owner management
10. ❌ Test property statistics and reports

## Field Mapping Reference

### Property Fields
| Old (Room) | New (Property) |
|------------|----------------|
| `ownerId` | `owner_id` |
| `title` | `name` |
| `category` | `type` (enum) |
| `isActive` | `is_active` |
| `featured` | `is_featured` |
| `approvalStatus` | `approval_status` |
| `property_details.totalFloors` | `total_floors` |
| - | `total_rooms` |
| - | `contact_info` |
| - | `category_id` |

### Room Fields (Unchanged)
| Field | Type |
|-------|------|
| `property_id` | UUID (FK to properties) |
| `room_number` | String |
| `floor_number` | Integer |
| `name` | String (optional) |
| `room_type` | Enum |
| `sharing_type` | Enum |
| `current_status` | Enum |

## Testing Checklist

### Property Operations
- [ ] Create property
- [ ] Update property
- [ ] Delete property
- [ ] List properties
- [ ] Get property details
- [ ] Get property statistics

### Property Staff Operations
- [ ] Assign staff to property
- [ ] Update staff property assignment
- [ ] Remove staff from property
- [ ] List staff for property
- [ ] Verify property ownership checks

### Property Owner Operations
- [ ] Create property owner
- [ ] Update property owner
- [ ] Deactivate property owner
- [ ] List property owners
- [ ] Get owner properties
- [ ] Change property owner

### Room Operations (Should Still Work)
- [ ] Create room
- [ ] Update room
- [ ] Delete room
- [ ] List rooms for property
- [ ] Get room details
- [ ] Update room status

## Next Steps

1. **Immediate:** Update `propertyStaff.js` to use Property model
2. **Immediate:** Update `platform/owners.js` property deactivation
3. **High Priority:** Review and fix `superuser.js` property operations
4. **Medium Priority:** Review analytics and reports
5. **Testing:** Comprehensive testing of all property operations

## Notes

- The migration has successfully created the new `properties` table
- Data has been migrated from `rooms` (where property_id was null) to `properties`
- The old `rooms` table has been backed up as `rooms_old`
- Frontend is mostly updated and working
- Backend routes need systematic updates to use Property model instead of Room model for property operations
