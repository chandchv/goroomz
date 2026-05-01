# Property and Room Hierarchy Clarification

## Current Data Model Issue

The system currently uses the `Room` table for two different concepts:
1. **Properties** (buildings/PGs/hotels) - the main property entity
2. **Rooms** (individual rooms within a property) - the actual rentable units

This creates confusion in the UI and data management.

## Current State

### For Property Owner (meera.iyer@example.com)
- Has 1 property: "Sharing PG photo's & More details Address: # 30/45, Ashirbad, 3rd Cross, Church Road, Koramangala 6t"
- This property currently has **0 rooms** added to it
- The property itself is stored as a Room record in the database

## How to Add Rooms

Property owners can add rooms to their property using:

1. **Navigate to Rooms Page**: Click "Rooms" in the sidebar
2. **Add Individual Rooms**: Use the existing room management interface
3. **Bulk Room Creation**: Use the BulkRoomCreationModal to add multiple rooms at once

### Bulk Room Creation Features
- Specify floor number (e.g., 1, 2, 3)
- Specify room number range (e.g., 101-110 for 10 rooms on floor 1)
- **For PG Properties**: Select sharing type (single, 2-sharing, 3-sharing, 4-sharing, dormitory)
- **For Hotel Properties**: Just floor and room numbers (no sharing types)

## Recommended Solution (Future Enhancement)

Create a proper hierarchy:

### Option 1: Separate Property Table
```
Properties Table:
- id
- name
- address
- owner_id
- category (PG/Hotel/etc)

Rooms Table:
- id
- property_id (FK to Properties)
- room_number
- floor_number
- sharing_type (for PGs)
- total_beds
```

### Option 2: Use Existing Room Table with Parent-Child Relationship
```
Rooms Table:
- id
- parent_property_id (NULL for properties, FK for rooms)
- is_property (boolean flag)
- room_number (NULL for properties)
- floor_number (NULL for properties)
```

## Current Workaround

Until the data model is refactored:
1. The "property" is the main Room record (with title, address, etc.)
2. Additional rooms need to be created as child records
3. The system groups rooms by the `title` field to show them as belonging to the same property

## Next Steps

1. Property owners should navigate to the Rooms page
2. Use the bulk room creation feature to add rooms with floor/room numbers
3. For PGs: Select appropriate sharing types
4. For Hotels: Just add rooms with floor and room numbers
