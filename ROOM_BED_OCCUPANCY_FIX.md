# Room Bed Occupancy Display Fix

## Date: December 22, 2025

## Issue Description

The room modal in the `/rooms` page was displaying incorrect bed occupancy information:
- **Problem**: Showing "0 / 2" beds when room was occupied with actual bed assignments
- **Expected**: Should show actual occupied beds count (e.g., "1 / 2" if one bed is occupied)

## Root Cause

The backend API endpoints were not calculating or returning the `occupiedBeds` field:
1. **GET /api/internal/rooms/status** - Used for room listings, missing bed occupancy data
2. **GET /api/internal/rooms/:id** - Endpoint didn't exist for individual room details

## Solution Implemented

### 1. **Enhanced GET /api/internal/rooms/status Endpoint**

**Changes Made:**
- Added `BedAssignment` association to fetch bed data
- Calculate `occupiedBeds` count by filtering beds with `status === 'occupied'`
- Calculate `availableBeds` count by filtering beds with `status === 'vacant'`
- Return clean response without exposing full bed details

**Code Added:**
```javascript
include: [
  {
    model: BedAssignment,
    as: 'beds',
    attributes: ['id', 'bedNumber', 'status', 'bookingId', 'occupantId'],
    required: false
  }
],

// Calculate occupied beds for each room
const roomsWithOccupancy = rooms.map(room => {
  const roomData = room.toJSON();
  const beds = roomData.beds || [];
  const occupiedBeds = beds.filter(bed => bed.status === 'occupied').length;
  
  return {
    ...roomData,
    occupiedBeds,
    availableBeds: beds.filter(bed => bed.status === 'vacant').length,
    beds: undefined // Remove beds array from response
  };
});
```

### 2. **Added GET /api/internal/rooms/:id Endpoint**

**New Endpoint Created:**
- **Route**: `GET /api/internal/rooms/:id`
- **Purpose**: Get detailed information for a specific room
- **Features**:
  - Includes all room attributes
  - Calculates bed occupancy (`occupiedBeds`, `availableBeds`)
  - Returns detailed bed information for room management
  - Applies data scoping for security

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "room-123",
    "roomNumber": "302",
    "floorNumber": 3,
    "currentStatus": "occupied",
    "sharingType": "double",
    "totalBeds": 2,
    "occupiedBeds": 1,
    "availableBeds": 1,
    "beds": [
      {
        "id": "bed-1",
        "bedNumber": 1,
        "status": "occupied",
        "bookingId": "booking-123",
        "occupantId": "user-456"
      },
      {
        "id": "bed-2", 
        "bedNumber": 2,
        "status": "vacant",
        "bookingId": null,
        "occupantId": null
      }
    ]
  }
}
```

## Frontend Integration

The frontend components already had the logic to display bed occupancy:

**RoomDetailModal.tsx:**
```jsx
<p className="font-medium">{room.occupiedBeds || 0} / {room.totalBeds}</p>
```

**RoomService.ts:**
```typescript
occupiedBeds += room.occupiedBeds || beds;
```

The frontend was correctly expecting the `occupiedBeds` field, but the backend wasn't providing it.

## Benefits

### 1. **Accurate Bed Occupancy Display**
- Room modal now shows correct bed occupancy (e.g., "1 / 2" instead of "0 / 2")
- Property overview statistics are now accurate
- Room management decisions can be made with correct information

### 2. **Real-time Bed Status**
- Bed occupancy updates when bookings are checked in/out
- Reflects actual bed assignments from the database
- Helps staff identify available beds in shared rooms

### 3. **Better Room Management**
- Staff can see which beds are available in double/triple rooms
- Helps with PG (monthly) room assignments
- Improves occupancy tracking and reporting

## Testing Instructions

### Test 1: Room Modal Bed Display
1. Go to `/rooms` page
2. Click on a room that has bed assignments (sharing type: double, triple, etc.)
3. Verify the "Beds" field shows correct occupancy (e.g., "1 / 2" if one bed is occupied)
4. Check that the number matches actual bed assignments

### Test 2: Property Overview Statistics
1. Go to property overview dashboard
2. Check bed occupancy statistics
3. Verify numbers match individual room bed counts
4. Test with different room types (single, double, triple)

### Test 3: Bed Status Updates
1. Check in a guest to a shared room
2. Verify bed occupancy increases (e.g., "0 / 2" → "1 / 2")
3. Check out the guest
4. Verify bed occupancy decreases (e.g., "1 / 2" → "0 / 2")

## Files Modified

1. **backend/routes/internal/rooms.js**
   - Enhanced `GET /status` endpoint with bed occupancy calculation
   - Added new `GET /:id` endpoint for individual room details
   - Added BedAssignment associations and calculations

## Database Dependencies

This fix relies on:
- **BedAssignment** table with proper bed status tracking
- **Room** model associations with BedAssignment
- Bed status updates during check-in/check-out processes

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live bed status updates
2. **Bed Management**: Direct bed assignment/release from room modal
3. **Occupancy Analytics**: Historical bed occupancy trends and reports
4. **Bed Preferences**: Guest bed preferences and assignment optimization

## Conclusion

The room bed occupancy display now accurately reflects the actual bed assignments and status from the database. This provides staff with correct information for room management decisions and improves the overall accuracy of the property management system.