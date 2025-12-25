# Property Listing Workflow Fix

## Problem
The frontend was still creating "Room" records directly via `POST /api/rooms` when property owners listed properties. With the new property-room hierarchy, this approach doesn't work correctly because:

1. Properties should be created first in the `properties` table
2. Rooms should then be created under those properties with a `propertyId` reference
3. The old workflow bypassed the property creation step entirely

## Solution

### Backend Changes

1. **Created `/backend/routes/properties.js`**
   - New public-facing property routes for property owners
   - `POST /api/properties` - Create property with optional room
   - `GET /api/properties` - List all approved properties (public)
   - `GET /api/properties/:id` - Get single property with rooms
   - `GET /api/properties/owner/my-properties` - Get owner's properties
   - `PUT /api/properties/:id` - Update property
   - `DELETE /api/properties/:id` - Delete property and associated rooms

2. **Updated `/backend/server.js`**
   - Registered the new properties route at `/api/properties`
   - Added `propertyRoutes` import and middleware

3. **Property Creation Flow**
   - When a property owner submits a listing:
     - Creates a Property record with `approvalStatus: 'pending'`
     - Optionally creates a Room record linked to the property
     - Both require admin approval before appearing publicly

### Frontend Changes

1. **Created `/src/services/propertyService.js`**
   - New service for property-related API calls
   - Methods for CRUD operations on properties
   - Search and filter capabilities

2. **Update Required in `/src/pages/OwnerDashboard.jsx`**
   - Change `handleAddProperty` to use `propertyService.createProperty()` instead of `roomService.createRoom()`
   - Transform the wizard data to match the new API structure

3. **PropertyListingWizard Data Transformation**
   - The wizard collects data in a specific format
   - Need to transform it to match the new property + room structure

## Data Structure

### Old Structure (Direct Room Creation)
```javascript
{
  title: "Room Title",
  description: "Description",
  category: "PG",
  roomType: "Private Room",
  price: 5000,
  location: { address, city, state },
  amenities: [],
  images: [],
  // ... other room fields
}
```

### New Structure (Property + Room)
```javascript
{
  // Property fields
  name: "Property Name",
  description: "Description",
  type: "pg", // hotel, pg, hostel, homestay, apartment
  categoryId: "uuid",
  location: { address, city, state, pincode },
  amenities: [],
  images: [],
  rules: [],
  
  // Optional room creation
  createRoom: true,
  roomData: {
    title: "Room Title",
    description: "Description",
    price: 5000,
    category: "PG",
    roomType: "Private Room",
    pricingType: "monthly",
    // ... other room fields
  }
}
```

## Migration Path

### For Existing Rooms
- Existing standalone rooms (without `propertyId`) continue to work
- They can be migrated to properties later via admin panel
- The `/api/rooms` endpoint still works for backward compatibility

### For New Listings
- All new listings from property owners create Properties first
- Rooms are automatically linked to their parent property
- Approval workflow applies to both property and room

## Category Mapping

| Frontend Category | Property Type | Room Category |
|------------------|---------------|---------------|
| Hotel Room       | hotel         | Hotel Room    |
| PG               | pg            | PG            |
| Home Stay        | homestay      | Home Stay     |
| Independent Home | apartment     | Independent Home |

## Implementation Steps

1. ✅ Create backend property routes
2. ✅ Register routes in server.js
3. ✅ Create frontend property service
4. ⏳ Update OwnerDashboard to use property service
5. ⏳ Transform wizard data to new structure
6. ⏳ Update AdminPage to use property service
7. ⏳ Test end-to-end property listing flow

## Testing Checklist

- [ ] Property owner can list a new property
- [ ] Property appears in owner dashboard with "pending" status
- [ ] Admin can approve/reject properties
- [ ] Approved properties appear in public listings
- [ ] Property details page shows associated rooms
- [ ] Owner can edit their properties
- [ ] Owner can delete their properties
- [ ] Search and filters work with properties
- [ ] Backward compatibility with existing rooms

## API Endpoints Summary

### Public Routes
- `GET /api/properties` - List approved properties
- `GET /api/properties/:id` - Get property details

### Owner Routes (Protected)
- `POST /api/properties` - Create property
- `GET /api/properties/owner/my-properties` - Get my properties
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Legacy Routes (Still Supported)
- `POST /api/rooms` - Create standalone room (old workflow)
- `GET /api/rooms` - List rooms
- `GET /api/rooms/owner/my-rooms` - Get my rooms

## Notes

- Properties require a valid `categoryId` - ensure categories exist in database
- Location must include `address`, `city`, and `state` (required fields)
- Images are stored as JSONB array with `url` and `isPrimary` fields
- Approval workflow: `pending` → `approved` or `rejected`
- Property owners can only see/edit their own properties
- Admins can see/edit all properties
