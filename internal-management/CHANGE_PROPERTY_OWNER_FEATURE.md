# Change Property Owner Feature

## Overview
Added functionality to change property owners from the platform properties management page. This is useful for correcting seeding issues where all properties were assigned to a single owner.

## Changes Made

### Backend
**File:** `backend/routes/internal/platform/properties.js`

Added new endpoint:
- **PUT** `/api/internal/platform/properties/:id/owner`
  - Changes the owner of a property
  - Requires `superuser` or `platform_admin` role
  - Validates new owner exists and has appropriate role (owner/admin)
  - Logs the change with audit trail
  - Returns updated property with new owner details

**Request Body:**
```json
{
  "newOwnerId": "uuid",
  "reason": "Optional reason for the change"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property owner changed successfully",
  "data": { /* updated property */ },
  "changes": {
    "oldOwner": { "id": "...", "name": "..." },
    "newOwner": { "id": "...", "name": "...", "email": "..." }
  }
}
```

### Frontend
**New Component:** `internal-management/app/components/properties/ChangeOwnerModal.tsx`

Features:
- Modal dialog for changing property owner
- Search functionality to find owners by name or email
- Radio button selection for new owner
- Shows current owner information
- Optional reason field for audit trail
- Warning message about the implications
- Shows owner's existing property count
- Real-time validation

**Updated Page:** `internal-management/app/pages/PropertiesManagementPage.tsx`

Added:
- "Change Owner" button in the actions column
- Integration with ChangeOwnerModal
- Auto-refresh after successful owner change

## Usage

1. Navigate to `/platform/properties`
2. Find the property you want to reassign
3. Click "Change Owner" in the Actions column
4. Search for and select the new owner
5. Optionally provide a reason
6. Click "Change Owner" to confirm

## Security

- Only `superuser` and `platform_admin` roles can change property owners
- All changes are logged in the audit trail
- New owner must have `owner` or `admin` role
- Data scoping is applied (regional managers can only change properties in their territory)

## Audit Trail

Every owner change is logged with:
- Property ID and name
- Old owner ID and name
- New owner ID, name, and email
- User who made the change
- Reason (if provided)
- Timestamp

## UI Features

- **Search:** Filter owners by name or email
- **Visual Feedback:** Selected owner is highlighted
- **Property Count:** Shows how many properties each owner currently has
- **Confirmation:** Clear preview of the change before confirming
- **Loading States:** Proper loading indicators during API calls
- **Error Handling:** Clear error messages if something goes wrong

## Testing

To test the feature:
1. Login as superuser or platform_admin
2. Go to Properties Management page
3. Select a property with the wrong owner
4. Change to the correct owner
5. Verify the change is reflected immediately
6. Check audit logs to confirm the change was logged

## Notes

- The feature is designed to fix bulk seeding issues where properties were assigned to a single test user
- All related data (rooms, bookings, etc.) remain associated with the property
- The change is immediate and cannot be undone through the UI (requires database access or another owner change)
