# Superuser Login Fix

## Problem
Superusers were being redirected to the property dashboard (`/dashboard`) instead of the superuser dashboard (`/superuser-dashboard`) after login.

## Root Cause
The backend authentication endpoint was not returning the `internalRole` field in the login response. The frontend was checking for `user.internalRole === 'superuser'` to determine the redirect, but this field was missing from the API response.

## Solution

### Backend Changes

Updated `backend/routes/internal/auth.js` to include internal role fields in all auth responses:

#### 1. Login Endpoint (`POST /api/internal/auth/login`)
Added the following fields to the user response:
```javascript
{
  internalRole: user.internalRole,
  internalPermissions: user.internalPermissions,
  territoryId: user.territoryId,
  managerId: user.managerId,
  commissionRate: user.commissionRate
}
```

#### 2. Get Current User Endpoint (`GET /api/internal/auth/me`)
Added the same internal role fields to ensure consistency.

#### 3. Verify Token Endpoint (`GET /api/internal/auth/verify`)
Added `internalRole` to the verification response.

### Diagnostic Tool

Created `backend/scripts/checkSuperuserRole.js` to help diagnose role issues:

```bash
node backend/scripts/checkSuperuserRole.js <email>
```

This script displays:
- User information
- All roles (role, staffRole, internalRole)
- Staff and internal permissions
- Internal role fields (territoryId, managerId, commissionRate)
- Status check confirming if user is a superuser

## How to Fix for Existing Users

If a user should be a superuser but isn't being redirected correctly:

### Step 1: Check Current Role
```bash
cd backend
node scripts/checkSuperuserRole.js user@example.com
```

### Step 2: Set Superuser Role (if needed)
```bash
node scripts/setSuperuserRole.js user@example.com
```

### Step 3: Verify the Fix
```bash
node scripts/checkSuperuserRole.js user@example.com
```

You should see:
```
✅ User IS a Superuser
✅ Should have access to Superuser Dashboard
```

### Step 4: Test Login
1. Clear browser cache/localStorage
2. Login with the superuser credentials
3. Should be redirected to `/superuser-dashboard`

## Testing

### For Superusers:
1. Login with superuser credentials
2. Check browser console for user data
3. Verify `user.internalRole === 'superuser'`
4. Should redirect to `/superuser-dashboard`
5. "Dashboard" menu item should point to `/superuser-dashboard`

### For Other Roles:
1. Login with different role credentials
2. Should redirect to appropriate dashboard:
   - Agent → `/agent-dashboard`
   - Regional Manager → `/regional-manager-dashboard`
   - Operations Manager → `/operations-manager-dashboard`
   - Platform Admin → `/platform-admin-dashboard`
   - Staff/Property Owner → `/dashboard`

## API Response Example

### Before Fix:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "staffRole": null,
    "permissions": {}
  }
}
```

### After Fix:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "staffRole": null,
    "internalRole": "superuser",
    "permissions": {},
    "internalPermissions": {
      "canManageInternalUsers": true,
      "canManageRoles": true,
      ...
    },
    "territoryId": null,
    "managerId": null,
    "commissionRate": null
  }
}
```

## Files Modified

1. `backend/routes/internal/auth.js`
   - Updated login response to include `internalRole` and related fields
   - Updated `/me` endpoint response
   - Updated `/verify` endpoint response

2. `backend/scripts/checkSuperuserRole.js` (NEW)
   - Diagnostic tool to check user roles and permissions

## Related Documentation

- `backend/SUPERUSER_SETUP.md` - How to create superusers
- `backend/scripts/setSuperuserRole.js` - Script to set superuser role
- `internal-management/ROLE_BASED_NAVIGATION_FIX.md` - Frontend navigation fixes
