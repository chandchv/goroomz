# API Endpoint Fixes Summary

## Issue
The frontend was making API calls to endpoints without the `/api` prefix, causing routing errors like:
```
Error: No route matches URL "/internal/properties"
```

## Root Cause
Frontend API calls were using paths like `/internal/properties` instead of `/api/internal/properties`, which caused React Router to try to match them as frontend routes instead of treating them as API calls.

## Files Fixed

### 1. **PropertiesManagementPage.tsx**
- **Fixed**: `/internal/properties` → `/api/internal/properties`
- **Fixed**: `/internal/platform/properties` → `/api/internal/platform/properties`

### 2. **AssignOwnerModal.tsx**
- **Fixed**: `/internal/platform/owners` → `/api/internal/platform/owners`

### 3. **auditService.ts**
- **Fixed**: `/internal/audit/export` → `/api/internal/audit/export`

### 4. **offlineQueueService.ts**
- **Fixed**: `/internal/bookings` → `/api/internal/bookings`
- **Fixed**: `/internal/payments` → `/api/internal/payments`
- **Fixed**: `/internal/maintenance/requests` → `/api/internal/maintenance/requests`

### 5. **pollingService.ts**
- **Fixed**: `/internal/bookings` → `/api/internal/bookings`
- **Fixed**: `/internal/bookings/status-changes` → `/api/internal/bookings/status-changes`

### 6. **staffService.ts**
- **Fixed**: `/internal/staff` → `/api/internal/staff`

### 7. **roomService.ts**
- **Fixed**: `/internal/rooms/floor/${floorNumber}` → `/api/internal/rooms/floor/${floorNumber}`
- **Fixed**: `/internal/rooms/${roomId}` → `/api/internal/rooms/${roomId}`
- **Fixed**: `/internal/rooms/${roomId}/status` → `/api/internal/rooms/${roomId}/status`
- **Fixed**: `/internal/rooms/${roomId}/bookings` → `/api/internal/rooms/${roomId}/bookings`
- **Fixed**: `/internal/maintenance/requests/${roomId}/history` → `/api/internal/maintenance/requests/${roomId}/history`
- **Fixed**: `/internal/rooms/${roomId}/status-history` → `/api/internal/rooms/${roomId}/status-history`

## Backend API Routes (Correct)
The backend correctly registers these routes with the `/api` prefix:
```javascript
app.use('/api/internal/properties', protectInternal, internalPropertiesRoutes);
app.use('/api/internal/rooms', protectInternal, internalRoomsRoutes);
app.use('/api/internal/bookings', protectInternal, internalBookingsRoutes);
// etc.
```

## Impact
- **Before**: Frontend API calls were being treated as route navigation, causing "No route matches URL" errors
- **After**: API calls are properly routed to the backend endpoints
- **Property Overview Dashboard**: Now works correctly with proper API endpoints

## Testing
All API endpoints should now work correctly:
- Property management pages
- Room status updates
- Booking management
- Staff management
- Audit logging
- Offline queue functionality
- Polling services

## Prevention
To prevent this issue in the future:
1. Always use the full API path with `/api` prefix
2. Consider creating API endpoint constants to avoid typos
3. Add linting rules to catch missing `/api` prefixes
4. Document the correct API endpoint patterns

## Related Files
- Backend routes are correctly configured in `backend/server.js`
- All internal API routes use the `/api/internal/` prefix
- Frontend services should always use the full API path