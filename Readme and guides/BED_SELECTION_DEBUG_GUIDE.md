# Bed Selection Debug Guide

## Issue
Users see "No vacant beds available in this room" when selecting double sharing rooms for booking.

## What We've Verified ✅

### Backend Data
- ✅ 26 beds exist for rooms 301-310 (2 beds per room)
- ✅ All beds have status 'vacant'
- ✅ All beds are properly associated with room IDs
- ✅ Rooms have correct sharing type 'double'
- ✅ Rooms have correct status 'vacant_clean'

### API Endpoints
- ✅ `/api/internal/rooms/:id/beds` endpoint works correctly
- ✅ Returns proper bed data with UUIDs
- ✅ Filtering logic works (vacant beds are returned)

## Debug Steps Added

### Frontend Debugging
Added console logs to `CreateBookingModal.tsx`:

1. **Room Selection**: Shows which room is selected and its sharing type
2. **API Call**: Shows if beds API is being called
3. **API Response**: Shows response status and raw data
4. **Filtering**: Shows vacant beds after filtering

### How to Debug

1. **Open Browser Console** (F12 → Console tab)
2. **Navigate to Booking Creation** page
3. **Select a Room 301-310** from dropdown
4. **Check Console Logs** for:

```
🏠 Room selection changed: { roomId: "...", selectedRoom: "301", sharingType: "double" }
✅ Fetching beds for shared room
🛏️ Fetching beds for room: 6777814f-c0a1-4363-9ee9-1156724a8fa0
📡 Beds API response status: 200
📋 Fetched beds result: { success: true, data: [...] }
🛏️ Raw beds data: [{ id: "...", bedNumber: 1, status: "vacant" }, ...]
✅ Vacant beds after filtering: [{ id: "...", bedNumber: 1 }, ...]
```

## Possible Issues to Check

### 1. Authentication
- Check if `localStorage.getItem('token')` returns a valid token
- Look for 401/403 errors in console

### 2. API URL
- Verify the API call goes to correct URL: `/api/internal/rooms/{roomId}/beds`
- Check if Vite proxy is working (should forward to backend:5000)

### 3. Room Selection
- Verify `roomId` is a valid UUID
- Check if `selectedRoom.sharingType` is truthy ('double' should be truthy)

### 4. Data Format
- Check if `result.data` exists and is an array
- Verify bed objects have correct structure: `{ id, bedNumber, status }`

## Expected Behavior
When selecting Room 301-310:
1. Console should show room selection with sharingType: "double"
2. API call should be made to fetch beds
3. Should receive 2 beds with status "vacant"
4. Bed dropdown should show "Bed 1" and "Bed 2" options

## If Still Not Working
Check these additional items:

1. **Network Tab**: Look for failed API requests
2. **Backend Logs**: Check if API requests are reaching the backend
3. **Database**: Verify beds still exist with correct room associations
4. **Frontend State**: Check if `beds` state is being set correctly

## Test Commands
```bash
# Verify beds exist
cd backend
node scripts/listAvailableBeds.js

# Test specific room
node scripts/testBedsAPI.js

# Check room statuses
node scripts/checkRoomStatuses.js
```