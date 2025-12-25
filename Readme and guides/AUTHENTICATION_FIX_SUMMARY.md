# Authentication Fix for Bed Selection

## Problem Identified ✅
The bed selection was failing with authentication errors:
```
❌ Beds API error: {"success":false,"message":"Token is not valid or has expired."}
❌ Error fetching beds: Error: Failed to fetch beds: 401
JWT verification error: jwt malformed
```

## Root Cause
The `CreateBookingModal` was using inconsistent authentication:
- **Wrong localStorage key**: Using `'token'` instead of `'auth_token'`
- **Raw fetch API**: Not using the centralized API service with proper interceptors

## Solution Applied ✅

### 1. Fixed Authentication Token Key
**Before**:
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

**After**: Using the correct key that matches the rest of the app:
```typescript
// Now uses apiService which automatically gets 'auth_token'
```

### 2. Used Centralized API Service
**Before**: Raw fetch with manual auth headers
```typescript
const response = await fetch(`/api/internal/rooms/${roomIdToFetch}/beds`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

**After**: Using the centralized API service
```typescript
import { apiService } from '../../services/api';

const response = await apiService.getApi().get(`/api/internal/rooms/${roomIdToFetch}/beds`);
```

### 3. Benefits of Using API Service
- ✅ **Automatic authentication**: Uses correct `auth_token` key
- ✅ **Error handling**: Automatic 401 handling and redirect to login
- ✅ **Consistency**: Same auth approach as rest of the app
- ✅ **Interceptors**: Request/response interceptors for better error handling

## Verification
The fix ensures that:
1. Bed API calls use the same authentication as other API calls
2. Token is retrieved from the correct localStorage key (`auth_token`)
3. 401 errors are handled consistently across the app
4. Users are redirected to login if token is invalid

## Expected Result
Now when users select a double sharing room:
1. ✅ Authentication will work correctly
2. ✅ Beds API will return the 2 beds for the room
3. ✅ Bed dropdown will show "Bed 1" and "Bed 2" options
4. ✅ Users can successfully create bookings

## Files Modified
- `internal-management/app/components/bookings/CreateBookingModal.tsx`
  - Added import for `apiService`
  - Replaced raw fetch with `apiService.getApi().get()`
  - Removed manual auth header (handled by interceptor)

## Status
✅ **COMPLETE** - Authentication issue resolved. Bed selection should now work correctly.