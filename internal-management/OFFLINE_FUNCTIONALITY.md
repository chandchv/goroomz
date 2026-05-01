# Offline Functionality Documentation

## Overview

The Internal Management System includes comprehensive offline functionality that allows staff to continue working even when internet connectivity is lost. Changes made while offline are automatically queued and synchronized when the connection is restored.

## Features

### 1. Offline Detection

The system automatically detects when the device goes offline or comes back online using the browser's `navigator.onLine` API and network events.

**Implementation:**
- `useOnlineStatus` hook monitors connection status
- Visual indicator in the Header shows online/offline status
- Offline mode is clearly indicated with a red badge

### 2. Local Data Caching

Essential data is cached locally using IndexedDB (via Dexie.js) to allow viewing and working with data while offline.

**Cached Data:**
- Room status and information
- Today's bookings
- Guest information
- Payment records
- Metadata

**Cache Expiration:**
- Default: 1 hour
- Automatically cleaned up when expired
- Can be manually refreshed

**Usage Example:**
```typescript
import { cacheService } from '../services/cacheService';

// Cache room data
await cacheService.cacheRoomStatus(rooms);

// Retrieve cached data
const cachedRooms = await cacheService.getCachedRoomStatus();

// Clear cache
await cacheService.clearAll();
```

### 3. Offline Queue

Changes made while offline are queued in IndexedDB and processed when connection is restored.

**Queued Operations:**
- Room status updates
- Booking creation
- Check-in/check-out
- Payment recording
- Housekeeping completion
- Maintenance requests

**Queue Features:**
- Operations stored in chronological order
- Automatic retry with configurable max retries
- Status tracking (pending, processing, completed, failed)
- Manual retry for failed operations

**Usage Example:**
```typescript
import { offlineQueueService } from '../services/offlineQueueService';

// Queue a room status update
await offlineQueueService.queueRoomStatusUpdate(
  roomId,
  'vacant_clean',
  'Cleaned after checkout'
);

// Get pending operations
const pending = await offlineQueueService.getPendingOperations();

// Get queue statistics
const stats = await offlineQueueService.getStats();
```

### 4. Automatic Synchronization

When connection is restored, the system automatically syncs all queued operations with the backend.

**Sync Features:**
- Auto-sync on connection restore
- Manual sync trigger
- Conflict detection and resolution
- Progress tracking
- Success/failure notifications

**Usage Example:**
```typescript
import { syncService } from '../services/syncService';

// Manual sync
const result = await syncService.forceSyncNow();

// Listen to sync status
syncService.onSyncStatusChange((status, result) => {
  console.log('Sync status:', status);
  if (result) {
    console.log(`Synced ${result.success} operations`);
  }
});

// Resolve conflicts
await syncService.resolveConflict(operationId, 'use_local');
```

### 5. Conflict Resolution

When sync conflicts occur (e.g., data changed on server while offline), the system prompts the user to resolve them.

**Resolution Options:**
- **Use Local Changes**: Overwrite server data with local changes
- **Use Server Data**: Discard local changes and keep server data
- **Cancel Operation**: Remove the operation from the queue

**UI Component:**
- `SyncConflictModal` displays conflicts one at a time
- Shows both local and server data for comparison
- Allows user to choose resolution strategy

## Components

### Hooks

#### `useOnlineStatus()`
Monitors online/offline status.

```typescript
const isOnline = useOnlineStatus();
```

#### `useSyncStatus()`
Provides sync status and control functions.

```typescript
const {
  syncStatus,      // 'idle' | 'syncing' | 'success' | 'error'
  isSyncing,       // boolean
  lastSyncResult,  // SyncResult | null
  triggerSync,     // () => Promise<SyncResult>
  resolveConflict, // (id, resolution) => Promise<void>
  clearFailedOperations,
  retryFailedOperations
} = useSyncStatus();
```

### Services

#### `cacheService`
Manages local data caching with IndexedDB.

**Methods:**
- `set(table, id, data, expirationMs)` - Store data
- `get(table, id)` - Retrieve data
- `getAll(table)` - Get all items
- `setMany(table, items)` - Store multiple items
- `remove(table, id)` - Remove item
- `clearTable(table)` - Clear table
- `clearAll()` - Clear all data
- `cleanupExpired()` - Remove expired items
- `has(table, id)` - Check if exists
- `getStats()` - Get cache statistics

#### `offlineQueueService`
Manages the queue of offline operations.

**Methods:**
- `enqueue(operation)` - Add operation to queue
- `getPendingOperations()` - Get pending operations
- `getAllOperations()` - Get all operations
- `updateStatus(id, status, error)` - Update operation status
- `markCompleted(id)` - Mark as completed
- `markFailed(id, error)` - Mark as failed
- `remove(id)` - Remove operation
- `clearCompleted()` - Clear completed operations
- `clearFailed()` - Clear failed operations
- `clearAll()` - Clear entire queue
- `getStats()` - Get queue statistics
- `hasPendingOperations()` - Check if has pending

**Helper Methods:**
- `queueRoomStatusUpdate(roomId, status, notes)`
- `queueBookingCreate(bookingData)`
- `queueCheckIn(bookingId, checkInData)`
- `queueCheckOut(bookingId, checkOutData)`
- `queuePaymentRecord(paymentData)`
- `queueHousekeepingComplete(roomId, data)`
- `queueMaintenanceRequest(requestData)`

#### `syncService`
Handles synchronization of offline changes.

**Methods:**
- `sync()` - Sync all pending operations
- `forceSyncNow()` - Manual sync trigger
- `resolveConflict(operationId, resolution)` - Resolve conflict
- `getSyncStats()` - Get sync statistics
- `clearFailedOperations()` - Clear failed operations
- `retryFailedOperations()` - Retry failed operations
- `onSyncStatusChange(callback)` - Listen to status changes
- `setAutoSync(enabled)` - Enable/disable auto-sync
- `getIsSyncing()` - Check if syncing

### UI Components

#### `SyncStatusBar`
Displays sync status and pending operations count.

**Features:**
- Shows syncing indicator
- Displays pending operations count
- Shows failed operations count
- Provides "Sync Now" button
- Provides "Retry Failed" button
- Opens conflict modal when conflicts occur

#### `SyncConflictModal`
Modal for resolving sync conflicts.

**Features:**
- Displays conflict details
- Shows local vs server data comparison
- Provides resolution options
- Handles multiple conflicts sequentially

### Utilities

#### `offlineApiWrapper`
Wrapper for API calls with offline queue support.

**Function:**
```typescript
offlineAwareRequest<T>(config, options)
```

**Options:**
- `operationType` - Type of operation (for tracking)
- `description` - Human-readable description
- `maxRetries` - Maximum retry attempts (default: 3)
- `queueIfOffline` - Whether to queue when offline (default: true for mutations)

**Helper Object:**
```typescript
offlineApi.updateRoomStatus(roomId, status, notes)
offlineApi.createBooking(bookingData)
offlineApi.checkIn(bookingId, checkInData)
offlineApi.checkOut(bookingId, checkOutData)
offlineApi.recordPayment(paymentData)
offlineApi.completeHousekeeping(roomId, data)
offlineApi.createMaintenanceRequest(requestData)
```

## Usage in Components

### Example: Room Status Update with Offline Support

```typescript
import { offlineApi } from '../utils/offlineApiWrapper';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function RoomCard({ room }) {
  const isOnline = useOnlineStatus();

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const result = await offlineApi.updateRoomStatus(
        room.id,
        newStatus,
        'Status updated by staff'
      );

      if (result.queued) {
        // Show message that it will sync later
        toast.info('Change will sync when online');
      } else {
        // Show success message
        toast.success('Room status updated');
      }
    } catch (error) {
      toast.error('Failed to update room status');
    }
  };

  return (
    <div>
      {!isOnline && (
        <div className="offline-badge">Offline Mode</div>
      )}
      <button onClick={() => handleStatusUpdate('vacant_clean')}>
        Mark as Clean
      </button>
    </div>
  );
}
```

### Example: Using Cache for Offline Data

```typescript
import { cacheService } from '../services/cacheService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const loadRooms = async () => {
      if (isOnline) {
        // Fetch from API
        const response = await api.get('/api/internal/rooms/status');
        setRooms(response.data);
        
        // Cache for offline use
        await cacheService.cacheRoomStatus(response.data);
      } else {
        // Load from cache
        const cached = await cacheService.getCachedRoomStatus();
        setRooms(cached);
      }
    };

    loadRooms();
  }, [isOnline]);

  return (
    <div>
      {!isOnline && (
        <div className="warning">
          Viewing cached data. Changes will sync when online.
        </div>
      )}
      {rooms.map(room => <RoomCard key={room.id} room={room} />)}
    </div>
  );
}
```

## Best Practices

1. **Always use `offlineApi` for mutations** - This ensures changes are queued when offline
2. **Cache data after fetching** - Use `cacheService` to store data for offline access
3. **Show offline indicators** - Use `useOnlineStatus()` to show when in offline mode
4. **Provide feedback** - Show users when changes are queued vs immediately saved
5. **Handle conflicts gracefully** - Use `SyncConflictModal` to let users resolve conflicts
6. **Test offline scenarios** - Use browser DevTools to simulate offline mode
7. **Set appropriate cache expiration** - Balance freshness vs offline capability
8. **Monitor queue size** - Alert users if queue grows too large

## Testing Offline Functionality

### Simulate Offline Mode

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown

**Firefox DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox

### Test Scenarios

1. **Go offline and make changes**
   - Update room status
   - Create booking
   - Record payment
   - Verify changes are queued

2. **Come back online**
   - Verify auto-sync triggers
   - Check sync status bar
   - Confirm changes are saved

3. **Create conflicts**
   - Make change offline
   - Make different change on server
   - Come back online
   - Verify conflict modal appears
   - Test resolution options

4. **Test failed operations**
   - Queue invalid operation
   - Come back online
   - Verify failure handling
   - Test retry functionality

## Troubleshooting

### Queue not syncing
- Check if online (navigator.onLine)
- Check browser console for errors
- Verify API endpoints are accessible
- Check queue stats: `await offlineQueueService.getStats()`

### Cache not working
- Check IndexedDB in browser DevTools
- Verify cache expiration settings
- Clear cache and try again: `await cacheService.clearAll()`

### Conflicts not resolving
- Check conflict modal is displayed
- Verify resolution logic in syncService
- Check server response for conflict data

## Performance Considerations

- **Cache size**: Monitor cache size to avoid storage limits
- **Queue size**: Large queues may take time to sync
- **Sync frequency**: Auto-sync on connection restore, manual sync available
- **Cleanup**: Expired cache and completed operations are automatically cleaned

## Security Considerations

- **Local storage**: Data stored in IndexedDB is not encrypted
- **Sensitive data**: Avoid caching highly sensitive information
- **Token expiration**: Queued operations may fail if auth token expires
- **Conflict resolution**: User must manually resolve conflicts (no automatic overwrites)
