# Design Document

## Overview

This design document outlines the technical approach for implementing property-room hierarchy features across both the internal management system and the property owner dashboard. The solution involves:

1. **Routing Integration** - Adding missing routes to make existing PropertyDetailPage and BulkRoomCreationModal accessible
2. **API Connectivity** - Ensuring backend endpoints work correctly for both internal and external access
3. **Property Owner Dashboard Extension** - Creating new components to display room hierarchy in the public-facing app
4. **Data Consistency** - Maintaining synchronized data between internal management and property owner views

The design leverages existing backend infrastructure (Room model, BedAssignment model, internal room routes) and existing frontend components (PropertyDetailPage, BulkRoomCreationModal) while adding the necessary wiring and extensions.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                      │
├──────────────────────────────┬────────────────────────────────┤
│  Internal Management System  │  Property Owner Dashboard      │
│  (internal-management/)      │  (src/)                        │
│                              │                                │
│  - PropertiesManagementPage  │  - OwnerDashboard             │
│  - PropertyDetailPage ✨NEW  │  - PropertyRoomView ✨NEW     │
│  - BulkRoomCreationModal     │  - RoomDetailModal ✨NEW      │
│  - Room filtering/sorting    │  - Room statistics            │
└──────────────────────────────┴────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Internal Routes (/api/internal/*)                          │
│  - GET /internal/rooms/status                               │
│  - GET /internal/rooms/floor/:floorNumber                   │
│  - PUT /internal/rooms/:id/status                           │
│  - POST /internal/superuser/bulk-create-rooms ✨NEW         │
│                                                              │
│  Public Routes (/api/*)                                      │
│  - GET /rooms/owner/my-rooms ✨EXTEND                       │
│  - GET /rooms/:propertyId/rooms ✨NEW                       │
│  - GET /rooms/:roomId/beds ✨NEW                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - rooms (existing)                                          │
│  - bed_assignments (existing)                                │
│  - bookings (existing)                                       │
│  - room_statuses (existing)                                  │
│  - room_categories (existing)                                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Internal Management System Flow:**
1. Agent navigates to Properties page
2. Clicks "View Details" on a property
3. System routes to `/properties/:propertyId`
4. PropertyDetailPage loads, fetches rooms via `/internal/rooms/status`
5. Displays rooms grouped by floor with filters
6. Agent can click "Add Rooms" to open BulkRoomCreationModal
7. Modal calls `/internal/superuser/bulk-create-rooms`
8. Page refreshes to show new rooms

**Property Owner Dashboard Flow:**
1. Owner logs into public dashboard
2. Views properties list with room counts
3. Clicks on a property to expand/view details
4. System fetches rooms via `/rooms/:propertyId/rooms`
5. Displays floor-wise room view with occupancy
6. Owner can click on a room to see bed-level details
7. Modal shows bed assignments and booking information

## Components and Interfaces

### Internal Management System Components

#### 1. PropertyDetailPage (Existing - Needs Routing)
**Location:** `internal-management/app/pages/PropertyDetailPage.tsx`

**Props:** None (uses URL params)

**State:**
```typescript
interface PropertyDetailState {
  property: Property | null;
  rooms: Room[];
  loading: boolean;
  error: string | null;
  showBulkRoomModal: boolean;
  filterFloor: string;
  filterSharing: string;
  filterStatus: string;
}
```

**Key Methods:**
- `loadPropertyDetails()` - Fetches property and rooms
- `handleBulkRoomSuccess()` - Refreshes after bulk creation
- `filteredRooms` - Computed property for filtered room list
- `roomsByFloor` - Groups rooms by floor number

#### 2. BulkRoomCreationModal (Existing)
**Location:** `internal-management/app/components/BulkRoomCreationModal.tsx`

**Props:**
```typescript
interface BulkRoomCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property: Property;
}
```

**Features:**
- Floor number input
- Room number range (start/end)
- Sharing type selection
- Live preview of rooms to be created
- Validation (max 100 rooms per batch)

#### 3. PropertiesManagementPage (Needs Update)
**Location:** `internal-management/app/pages/PropertiesManagementPage.tsx`

**Changes Needed:**
- Add "View Details" button to each property card
- Navigate to `/properties/:propertyId` on click

### Property Owner Dashboard Components (New)

#### 1. PropertyRoomView Component
**Location:** `src/components/PropertyRoomView.jsx` (NEW)

**Props:**
```typescript
interface PropertyRoomViewProps {
  property: Property;
  onClose?: () => void;
}
```

**Features:**
- Floor-wise room display
- Room statistics (total, occupied, vacant)
- Bed-level occupancy indicators
- Filter by floor/status
- Click room to see details

**Component Structure:**
```jsx
<PropertyRoomView>
  <PropertyHeader />
  <StatisticsCards />
  <FilterBar />
  <FloorSections>
    {floors.map(floor => (
      <FloorSection key={floor}>
        <RoomGrid>
          {rooms.map(room => (
            <RoomCard onClick={openRoomDetail} />
          ))}
        </RoomGrid>
      </FloorSection>
    ))}
  </FloorSections>
</PropertyRoomView>
```

#### 2. RoomDetailModal Component
**Location:** `src/components/RoomDetailModal.jsx` (NEW)

**Props:**
```typescript
interface RoomDetailModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (roomId: string, updates: Partial<Room>) => void;
}
```

**Features:**
- Room information display
- Bed-level occupancy grid
- Booking details for occupied beds
- Edit pricing (if owner has permission)
- View booking history

#### 3. OwnerDashboard Updates
**Location:** `src/pages/OwnerDashboard.jsx` (UPDATE)

**Changes:**
- Add room count to property cards
- Add "View Rooms" button
- Integrate PropertyRoomView component
- Display upcoming check-ins/check-outs

## Data Models

### Room Model (Existing)
```typescript
interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  title: string;
  category: string;
  roomType: string;
  sharingType: 'single' | '2_sharing' | '3_sharing' | 'quad' | 'dormitory';
  totalBeds: number;
  currentStatus: 'occupied' | 'vacant_clean' | 'vacant_dirty';
  price: number;
  amenities: string[];
  images: ImageObject[];
  ownerId: string;
  customCategoryId?: string;
  lastCleanedAt?: Date;
  lastMaintenanceAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### BedAssignment Model (Existing)
```typescript
interface BedAssignment {
  id: string;
  roomId: string;
  bedNumber: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  bookingId?: string;
  occupantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### RoomWithOccupancy (Computed)
```typescript
interface RoomWithOccupancy extends Room {
  occupiedBeds: number;
  availableBeds: number;
  beds: BedAssignment[];
  occupancyRate: number; // percentage
}
```

### PropertyWithRooms (Computed)
```typescript
interface PropertyWithRooms {
  id: string;
  title: string;
  category: string;
  location: Location;
  rooms: RoomWithOccupancy[];
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  revenue: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Room Display Completeness
*For any* property with rooms, when displaying the property detail page, all rooms associated with that property should be displayed.
**Validates: Requirements 1.3, 3.1**

### Property 2: Sharing Type to Bed Count Mapping
*For any* room with a sharing type, the total bed count should match the sharing type (single=1, double=2, triple=3, quad=4, dormitory=6+).
**Validates: Requirements 2.3**

### Property 3: Bulk Room Creation Completeness
*For any* valid bulk room creation request with start room N and end room M, exactly (M - N + 1) rooms should be created.
**Validates: Requirements 2.4**

### Property 4: Floor Grouping Consistency
*For any* set of rooms, when grouped by floor, each room should appear in exactly one floor group matching its floorNumber.
**Validates: Requirements 3.1**

### Property 5: Occupied Bed Count Accuracy
*For any* room, the occupied bed count should equal the number of bed assignments with status 'occupied'.
**Validates: Requirements 3.3**

### Property 6: Floor Sorting Order
*For any* list of floors displayed, floors should be in ascending numerical order.
**Validates: Requirements 3.4**

### Property 7: Room Sorting Within Floor
*For any* floor's room list, rooms should be sorted by room number in ascending order.
**Validates: Requirements 3.5**

### Property 8: Floor Filter Correctness
*For any* floor filter applied, all displayed rooms should have a floorNumber matching the filter value.
**Validates: Requirements 4.1**

### Property 9: Multiple Filter AND Logic
*For any* set of active filters (floor, sharing type, status), displayed rooms should match ALL filter criteria.
**Validates: Requirements 4.4**

### Property 10: Filter Clear Round Trip
*For any* room list, applying filters then clearing them should restore the original complete room list.
**Validates: Requirements 4.5**

### Property 11: Property Statistics Accuracy
*For any* property, the displayed occupancy percentage should equal (occupiedBeds / totalBeds) * 100.
**Validates: Requirements 5.3, 8.1**

### Property 12: Room Creation Requires Valid Property
*For any* room creation attempt, if the property ID is invalid or missing, the creation should fail with a validation error.
**Validates: Requirements 10.1**

### Property 13: Property Reference Integrity
*For any* room query result, the associated property reference should exist and be valid.
**Validates: Requirements 10.2**

### Property 14: Ownership Cascade Consistency
*For any* property ownership change, all associated rooms should have their ownerId updated to match the new property owner.
**Validates: Requirements 10.3**

### Property 15: Cross-System Data Consistency
*For any* room created or updated in the internal management system, querying the same room from the property owner dashboard should return identical data.
**Validates: Requirements 10.5**

## Error Handling

### Validation Errors
- **Invalid Property ID**: Return 404 with message "Property not found"
- **Invalid Room Number Range**: Return 400 with message "Start room number must be less than or equal to end room number"
- **Duplicate Room Numbers**: Return 409 with message "Room number {number} already exists on floor {floor}"
- **Exceeded Bulk Limit**: Return 400 with message "Cannot create more than 100 rooms at once"
- **Invalid Sharing Type**: Return 400 with message "Invalid sharing type. Must be one of: single, double, triple, quad, dormitory"

### Authorization Errors
- **Unauthorized Access**: Return 403 with message "You do not have permission to view this property"
- **Invalid Session**: Return 401 with message "Please log in to continue"

### Data Errors
- **Missing Required Fields**: Return 400 with list of missing fields
- **Database Constraint Violation**: Return 500 with message "Failed to save data. Please try again."
- **Concurrent Modification**: Return 409 with message "This resource was modified by another user. Please refresh and try again."

### Network Errors
- **API Timeout**: Display toast "Request timed out. Please check your connection and try again."
- **Server Error**: Display toast "Something went wrong. Please try again later."
- **Connection Lost**: Display banner "You are offline. Changes will be saved when connection is restored."

## Testing Strategy

### Unit Tests
- Room filtering logic (by floor, sharing type, status)
- Room sorting (by floor, by room number)
- Occupancy calculation (occupied beds, vacancy rate)
- Bulk room number generation
- Form validation (room range, floor number)

### Property-Based Tests
We will use **fast-check** (JavaScript/TypeScript) for property-based testing. Each test will run a minimum of 100 iterations.

#### Test 1: Sharing Type Bed Count Consistency
**Feature: property-room-hierarchy, Property 2: Sharing Type to Bed Count Mapping**
```javascript
fc.assert(
  fc.property(
    fc.constantFrom('single', 'double', 'triple', 'quad', 'dormitory'),
    (sharingType) => {
      const room = createRoomWithSharingType(sharingType);
      const expectedBeds = {
        single: 1,
        double: 2,
        triple: 3,
        quad: 4,
        dormitory: 6
      };
      return room.totalBeds === expectedBeds[sharingType];
    }
  ),
  { numRuns: 100 }
);
```

#### Test 2: Bulk Creation Completeness
**Feature: property-room-hierarchy, Property 3: Bulk Room Creation Completeness**
```javascript
fc.assert(
  fc.property(
    fc.integer({ min: 101, max: 199 }),
    fc.integer({ min: 101, max: 199 }),
    (start, end) => {
      fc.pre(start <= end && (end - start + 1) <= 100);
      const rooms = bulkCreateRooms(start, end);
      return rooms.length === (end - start + 1);
    }
  ),
  { numRuns: 100 }
);
```

#### Test 3: Floor Filter Correctness
**Feature: property-room-hierarchy, Property 8: Floor Filter Correctness**
```javascript
fc.assert(
  fc.property(
    fc.array(roomGenerator()),
    fc.integer({ min: 0, max: 10 }),
    (rooms, floorFilter) => {
      const filtered = filterRoomsByFloor(rooms, floorFilter);
      return filtered.every(room => room.floorNumber === floorFilter);
    }
  ),
  { numRuns: 100 }
);
```

#### Test 4: Occupancy Calculation Accuracy
**Feature: property-room-hierarchy, Property 5: Occupied Bed Count Accuracy**
```javascript
fc.assert(
  fc.property(
    roomWithBedsGenerator(),
    (room) => {
      const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;
      const calculated = calculateOccupiedBeds(room);
      return calculated === occupiedCount;
    }
  ),
  { numRuns: 100 }
);
```

#### Test 5: Filter Clear Round Trip
**Feature: property-room-hierarchy, Property 10: Filter Clear Round Trip**
```javascript
fc.assert(
  fc.property(
    fc.array(roomGenerator()),
    fc.record({
      floor: fc.option(fc.integer({ min: 0, max: 10 })),
      sharingType: fc.option(fc.constantFrom('single', 'double', 'triple')),
      status: fc.option(fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty'))
    }),
    (rooms, filters) => {
      const filtered = applyFilters(rooms, filters);
      const cleared = clearFilters(filtered, rooms);
      return cleared.length === rooms.length &&
             cleared.every((room, i) => room.id === rooms[i].id);
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests
- Complete flow: Navigate to property → View rooms → Add rooms → Verify display
- Property owner flow: Login → View property → See rooms → View bed details
- Authorization: Verify property owners can only see their own properties
- Data consistency: Create room in internal system → Verify visible in owner dashboard

### End-to-End Tests
- Agent onboards property with rooms
- Property owner logs in and sees rooms
- Agent updates room status
- Property owner sees updated status
- Booking is made
- Both systems show updated occupancy

## API Endpoints

### Internal Management Endpoints (Existing)

#### GET /api/internal/rooms/status
Returns all rooms with current status for properties within user's data scope.

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "uuid",
      "roomNumber": "101",
      "floorNumber": 1,
      "title": "Property Name",
      "category": "PG",
      "sharingType": "double",
      "totalBeds": 2,
      "currentStatus": "vacant_clean",
      "occupiedBeds": 0,
      "availableBeds": 2,
      "beds": [...]
    }
  ]
}
```

#### GET /api/internal/rooms/floor/:floorNumber
Returns all rooms on a specific floor.

#### PUT /api/internal/rooms/:id/status
Updates room status (occupied, vacant_clean, vacant_dirty).

### New Internal Management Endpoints

#### POST /api/internal/superuser/bulk-create-rooms
Creates multiple rooms in bulk.

**Request:**
```json
{
  "propertyId": "uuid",
  "floorNumber": 1,
  "startRoomNumber": 101,
  "endRoomNumber": 110,
  "categoryId": "uuid",
  "sharingType": "double"
}
```

**Response:**
```json
{
  "success": true,
  "created": 10,
  "rooms": [...]
}
```

### New Public Endpoints

#### GET /api/rooms/:propertyId/rooms
Returns all rooms for a specific property (owner must own the property).

**Response:**
```json
{
  "success": true,
  "property": {
    "id": "uuid",
    "title": "My PG",
    "totalRooms": 20,
    "occupiedBeds": 15,
    "totalBeds": 40
  },
  "rooms": [...]
}
```

#### GET /api/rooms/:roomId/beds
Returns bed-level details for a specific room.

**Response:**
```json
{
  "success": true,
  "room": {...},
  "beds": [
    {
      "id": "uuid",
      "bedNumber": 1,
      "status": "occupied",
      "booking": {
        "guestName": "John Doe",
        "checkIn": "2024-01-01",
        "checkOut": "2024-01-31"
      }
    }
  ]
}
```

## Implementation Notes

### Route Registration
Add to `internal-management/app/routes.ts`:
```typescript
route("properties/:propertyId", "routes/property-detail.tsx"),
```

### Property Owner Dashboard Integration
The OwnerDashboard component will be updated to:
1. Fetch room counts with property data
2. Add "View Rooms" button to property cards
3. Open PropertyRoomView component in modal or expanded view
4. Display upcoming check-ins/check-outs in overview tab

### Data Fetching Strategy
- **Internal Management**: Use existing `/internal/rooms/status` endpoint with data scoping
- **Property Owner**: Create new `/rooms/:propertyId/rooms` endpoint with ownership validation
- **Caching**: Implement React Query for caching and automatic refetching
- **Real-time Updates**: Consider WebSocket for live occupancy updates (future enhancement)

### Performance Considerations
- Paginate room lists for properties with >100 rooms
- Lazy load bed details (only fetch when room is clicked)
- Cache floor groupings to avoid recalculation
- Use virtual scrolling for large room lists

### Security Considerations
- Validate property ownership on all endpoints
- Apply data scoping middleware to internal endpoints
- Sanitize room numbers to prevent injection
- Rate limit bulk creation endpoint
- Log all room creation/modification for audit trail

## Migration Strategy

### Phase 1: Internal Management System (Week 1)
1. Add property detail route
2. Update PropertiesManagementPage with "View Details" button
3. Test PropertyDetailPage and BulkRoomCreationModal
4. Create bulk creation backend endpoint
5. Test end-to-end flow

### Phase 2: Property Owner Dashboard (Week 2)
1. Create PropertyRoomView component
2. Create RoomDetailModal component
3. Update OwnerDashboard to integrate new components
4. Create new public API endpoints
5. Test property owner flow

### Phase 3: Route Fixes (Week 3)
1. Audit all routes in property owner dashboard
2. Fix broken navigation links
3. Add proper error pages (404, 403)
4. Test all navigation paths
5. Update documentation

### Phase 4: Testing & Polish (Week 4)
1. Write property-based tests
2. Write integration tests
3. Perform end-to-end testing
4. Fix bugs and edge cases
5. Performance optimization
6. Deploy to production

## Future Enhancements

- **Real-time Occupancy Updates**: WebSocket integration for live bed status
- **Room Analytics**: Occupancy trends, revenue per room, popular room types
- **Bulk Room Editing**: Update multiple rooms at once
- **Room Templates**: Save and reuse room configurations
- **Mobile App**: Native mobile app for property owners
- **Notifications**: Push notifications for check-ins, check-outs, maintenance
- **Room Photos**: Upload and manage room-specific photos
- **Guest Reviews**: Display guest reviews per room
