# Bulk Room Creation Transaction Fix

## Issue
Bulk room creation was failing with PostgreSQL transaction errors:

```
Error creating room 110: Error
name: 'SequelizeDatabaseError',
code: '25P02' (current transaction is aborted, commands ignored until end of transaction block)
sql: `SELECT "id" FROM "rooms" AS "Room" WHERE "Room"."property_id" = '...' AND "Room"."room_number" = '110' LIMIT 1;`
```

## Root Cause
The bulk room creation code in `backend/routes/internal/superuser.js` was using snake_case database column names (`property_id`, `room_number`) in Sequelize `where` clauses, but the Room model has `underscored: true` configuration.

### Sequelize Column Naming Rules
When a model has `underscored: true`:
- **Database columns**: Use snake_case (`property_id`, `room_number`, `created_at`)
- **JavaScript properties**: Use camelCase (`propertyId`, `roomNumber`, `createdAt`)
- **Where clauses**: Must use JavaScript property names (camelCase)
- **Attributes/Order clauses**: Use database column names (snake_case)

## Fix Applied
Updated the Room.findOne query in the bulk room creation loop:

```javascript
// Before (BROKEN)
const existingRoom = await Room.findOne({
  where: {
    property_id: propertyId,    // ❌ Wrong: database column name
    room_number: roomNumber     // ❌ Wrong: database column name
  },
  attributes: ['id'],
  transaction
});

// After (WORKING)
const existingRoom = await Room.findOne({
  where: {
    propertyId: propertyId,     // ✅ Correct: JavaScript property name
    roomNumber: roomNumber      // ✅ Correct: JavaScript property name
  },
  attributes: ['id'],
  transaction
});
```

## Why This Caused Transaction Abort
1. **Initial Error**: The `Room.findOne` query failed due to incorrect column names
2. **Transaction State**: PostgreSQL aborted the transaction due to the error
3. **Subsequent Queries**: All following queries in the same transaction were rejected with "25P02" error
4. **Loop Continuation**: The code continued trying to create more rooms, but all queries failed

## Files Modified
- `backend/routes/internal/superuser.js` - Fixed Room.findOne query in bulk creation loop
- `backend/scripts/testBulkRoomCreationTransaction.js` - Created test to verify fix

## Error Code Reference
- **25P02**: PostgreSQL error code for "current transaction is aborted"
- This occurs when a transaction encounters an error and PostgreSQL refuses to execute further commands until the transaction is rolled back or committed

## Testing
Created `testBulkRoomCreationTransaction.js` to verify:
- ✅ Room.findOne query works with correct column names
- ✅ Room.create works within transaction
- ✅ BedAssignment.create works within transaction
- ✅ Transaction can be properly rolled back

## Prevention
To avoid similar issues in the future:
1. **Always use JavaScript property names in `where` clauses** for models with `underscored: true`
2. **Use database column names in `attributes` and `order` clauses**
3. **Test transaction-based operations thoroughly**
4. **Add proper error handling and transaction rollback**

## Related Models with `underscored: true`
Almost all models in the system use `underscored: true`, so this pattern applies to:
- Room, Property, User, Booking, Payment, etc.
- Always use camelCase in where clauses for these models

The bulk room creation should now work correctly without transaction errors.