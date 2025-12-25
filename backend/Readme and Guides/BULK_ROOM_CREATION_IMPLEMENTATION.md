# Bulk Room Creation Endpoint Implementation

## Overview
This document describes the implementation of the bulk room creation endpoint for the property-room hierarchy feature.

## Endpoint Details

**Route:** `POST /api/internal/superuser/bulk-create-rooms`

**Authentication:** Requires superuser role

**Audit Logging:** Enabled (logs bulk_create_rooms action)

## Request Body

```json
{
  "propertyId": "uuid",
  "floorNumber": 1,
  "startRoom": 1,
  "endRoom": 10,
  "sharingType": "2_sharing",
  "categoryId": "uuid (optional)",
  "price": 5000
}
```

## Validations

### 1. Required Fields
- `propertyId`: UUID of the parent property
- `floorNumber`: Floor number (integer)
- `startRoom`: Starting room number (integer)
- `endRoom`: Ending room number (integer)
- `sharingType`: Type of room sharing

### 2. Floor Number Validation
- **Range:** 1-50
- **Error:** "Floor number must be between 1 and 50"

### 3. Room Range Validation
- `startRoom` must be ≤ `endRoom`
- Maximum 100 rooms per batch
- **Errors:**
  - "Start room number must be less than or equal to end room number"
  - "Cannot create more than 100 rooms per batch"

### 4. Sharing Type Validation
- **Valid values:** `single`, `2_sharing`, `3_sharing`, `quad`, `dormitory`
- **Error:** "Invalid sharing type. Must be one of: single, 2_sharing, 3_sharing, quad, dormitory"

## Room Number Generation

Uses floor convention for automatic room numbering:
- Floor 1: 101, 102, 103, ...
- Floor 2: 201, 202, 203, ...
- Floor 10: 1001, 1002, 1003, ...

**Format:** `{floorNumber}{roomNumber.padStart(2, '0')}`

## Bed Count Mapping

Automatic bed creation based on sharing type:

| Sharing Type | Beds Created |
|--------------|--------------|
| single       | 1            |
| 2_sharing    | 2            |
| 3_sharing    | 3            |
| quad         | 4            |
| dormitory    | 6            |

## Transaction Handling

- All room and bed creations are wrapped in a database transaction
- **All-or-nothing:** If any room fails, the entire batch is rolled back
- Duplicate room numbers are detected and skipped with warnings

## Room Creation Process

For each room in the range:

1. **Generate room number** using floor convention
2. **Check for duplicates** in the same property
3. **Create room record** with:
   - Inherited property details (owner, location, amenities, rules)
   - Floor number and room number
   - Sharing type and bed count
   - Default status: `vacant_clean`
   - Approval status: `approved`
4. **Create bed assignments** (1 to N based on sharing type)
   - Each bed starts with status `vacant`
   - Bed numbers: 1, 2, 3, ...

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Successfully created 10 room(s)",
  "data": {
    "created": 10,
    "total": 10,
    "rooms": [
      {
        "id": "uuid",
        "roomNumber": "101",
        "floorNumber": 1,
        "sharingType": "2_sharing",
        "totalBeds": 2,
        "beds": 2
      }
    ]
  }
}
```

### Partial Success Response (201 Created with warnings)

```json
{
  "success": true,
  "message": "Created 8 of 10 rooms. 2 room(s) had errors.",
  "data": {
    "created": 8,
    "total": 10,
    "rooms": [...]
  },
  "warnings": [
    "Room 101 already exists",
    "Room 102 already exists"
  ]
}
```

### Error Responses

**400 Bad Request:**
- Missing required fields
- Invalid floor number
- Invalid room range
- Invalid sharing type

**404 Not Found:**
- Property not found

**500 Internal Server Error:**
- Database transaction failure
- Unexpected errors

## Audit Logging

Each bulk creation operation is logged with:
- **Action:** `bulk_create_rooms`
- **Resource Type:** `room`
- **Resource ID:** Property ID
- **Changes:**
  - `propertyId`
  - `floorNumber`
  - `roomRange` (e.g., "1-10")
  - `sharingType`
  - `roomsCreated` (count)
- **User ID:** Superuser who performed the action
- **IP Address:** Request IP
- **User Agent:** Request user agent

## Requirements Satisfied

✅ **Requirement 2.1:** Bulk room creation modal triggers endpoint
✅ **Requirement 2.2:** Preview generation based on floor and room range
✅ **Requirement 2.3:** Automatic bed count based on sharing type
✅ **Requirement 2.4:** All rooms created with specified configuration

## Testing

A test script is available at `backend/scripts/testBulkRoomCreation.js` that validates:
1. Floor number validation (1-50)
2. Room range validation (max 100 per batch)
3. Sharing type validation
4. Bed count mapping
5. Room number generation with floor convention
6. Transaction-based creation
7. Bed assignment creation

## Usage Example

```javascript
// Create 10 double-sharing rooms on floor 1
POST /api/internal/superuser/bulk-create-rooms
{
  "propertyId": "123e4567-e89b-12d3-a456-426614174000",
  "floorNumber": 1,
  "startRoom": 1,
  "endRoom": 10,
  "sharingType": "2_sharing",
  "price": 5000
}

// Result: Rooms 101-110 created, each with 2 beds
```

## Error Handling

- **Duplicate Detection:** Skips existing rooms and continues with others
- **Transaction Rollback:** On critical errors, all changes are rolled back
- **Detailed Error Messages:** Each failed room is reported in warnings array
- **Graceful Degradation:** Partial success is possible (some rooms created, some skipped)

## Security

- **Authorization:** Superuser role required
- **Audit Trail:** All operations logged
- **Input Validation:** All inputs sanitized and validated
- **Transaction Safety:** ACID compliance ensures data integrity

## Performance Considerations

- **Batch Limit:** Maximum 100 rooms per request to prevent timeouts
- **Transaction Efficiency:** Single transaction for all operations
- **Duplicate Check:** Efficient query before each room creation
- **Bulk Bed Creation:** Beds created in loop but within same transaction

## Future Enhancements

- [ ] Async processing for very large batches (>100 rooms)
- [ ] Progress tracking for long-running operations
- [ ] Bulk update/delete operations
- [ ] Room template support
- [ ] Custom room numbering schemes
