# Offline Functionality Usage Examples

This document provides practical examples of how to use the offline functionality in the Internal Management System.

## Basic Setup

All the offline functionality is already integrated into the MainLayout component. You don't need to do any additional setup to enable it.

## Example 1: Using the Online Status Hook

```typescript
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function MyComponent() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && (
        <div className="bg-yellow-50 p-4 rounded">
          <p>You are currently offline. Changes will be synced when you're back online.</p>
        </div>
      )}
      {/* Rest of your component */}
    </div>
  );
}
```

## Example 2: Making Offline-Aware API Calls

```typescript
import { offlineApi } from '../utils/offlineApiWrapper';

function RoomStatusButton({ roomId }) {
  const handleMarkClean = async () => {
    try {
      const result = await offlineApi.updateRoomStatus(
        roomId,
        'vacant_clean',
        'Cleaned by housekeeping'
      );

      if (result.queued) {
        // Operation was queued for later sync
        toast.info('Change saved. Will sync when online.');
      } else {
        // Operation completed immediately
        toast.success('Room status updated!');
      }
    } catch (error) {
      toast.error('Failed to update room status');
    }
  };

  return (
    <button onClick={handleMarkClean}>
      Mark as Clean
    </button>
  );
}
```

## Example 3: Using Cache for Offline Data Access

```typescript
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cacheService } from '../services/cacheService';
import api from '../services/api';

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      
      try {
        if (isOnline) {
          // Fetch fresh data from API
          const response = await api.get('/api/internal/rooms/status');
          const roomData = response.data;
          setRooms(roomData);
          
          // Cache for offline use
          await cacheService.cacheRoomStatus(roomData);
        } else {
          // Load from cache when offline
          const cachedRooms = await cacheService.getCachedRoomStatus();
          setRooms(cachedRooms);
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
        
        // Fallback to cache on error
        const cachedRooms = await cacheService.getCachedRoomStatus();
        if (cachedRooms.length > 0) {
          setRooms(cachedRooms);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [isOnline]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {!isOnline && (
        <div className="bg-blue-50 p-3 rounded mb-4">
          <p className="text-sm text-blue-700">
            Viewing cached data from {new Date().toLocaleString()}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}
```

## Example 4: Monitoring Sync Status

```typescript
import { useSyncStatus } from '../hooks/useSyncStatus';

function SyncMonitor() {
  const {
    syncStatus,
    isSyncing,
    lastSyncResult,
    triggerSync
  } = useSyncStatus();

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold mb-2">Sync Status</h3>
      
      <div className="space-y-2">
        <div>
          Status: <span className="font-mono">{syncStatus}</span>
        </div>
        
        {isSyncing && (
          <div className="text-blue-600">
            Syncing in progress...
          </div>
        )}
        
        {lastSyncResult && (
          <div>
            <p>Last sync: {lastSyncResult.success} successful, {lastSyncResult.failed} failed</p>
            {lastSyncResult.conflicts.length > 0 && (
              <p className="text-red-600">
                {lastSyncResult.conflicts.length} conflicts need resolution
              </p>
            )}
          </div>
        )}
        
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Sync Now
        </button>
      </div>
    </div>
  );
}
```

## Example 5: Handling Conflicts

The system automatically shows a conflict resolution modal when conflicts are detected. However, you can also programmatically resolve conflicts:

```typescript
import { useSyncStatus } from '../hooks/useSyncStatus';

function ConflictHandler() {
  const { lastSyncResult, resolveConflict } = useSyncStatus();

  const handleResolveAll = async () => {
    if (!lastSyncResult?.conflicts) return;

    for (const conflict of lastSyncResult.conflicts) {
      // Automatically use local changes for all conflicts
      await resolveConflict(conflict.operationId, 'use_local');
    }
  };

  if (!lastSyncResult?.conflicts || lastSyncResult.conflicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 p-4 rounded">
      <p className="text-red-700 mb-2">
        {lastSyncResult.conflicts.length} sync conflicts detected
      </p>
      <button
        onClick={handleResolveAll}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Resolve All (Use Local)
      </button>
    </div>
  );
}
```

## Example 6: Custom Offline Queue Operations

```typescript
import { offlineQueueService } from '../services/offlineQueueService';

async function customOperation() {
  // Queue a custom operation
  const operationId = await offlineQueueService.enqueue({
    method: 'POST',
    url: '/api/internal/custom-endpoint',
    data: { customData: 'value' },
    maxRetries: 5,
    operationType: 'custom_operation',
    description: 'My custom operation'
  });

  console.log(`Operation queued with ID: ${operationId}`);
}

// Check queue status
async function checkQueueStatus() {
  const stats = await offlineQueueService.getStats();
  console.log(`Pending: ${stats.pending}, Failed: ${stats.failed}`);
  
  const hasPending = await offlineQueueService.hasPendingOperations();
  if (hasPending) {
    console.log('There are operations waiting to sync');
  }
}

// Get all pending operations
async function viewPendingOperations() {
  const pending = await offlineQueueService.getPendingOperations();
  pending.forEach(op => {
    console.log(`${op.operationType}: ${op.description}`);
  });
}
```

## Example 7: Manual Cache Management

```typescript
import { cacheService } from '../services/cacheService';

// Store custom data
async function cacheCustomData() {
  await cacheService.set('metadata', 'last-sync', {
    timestamp: Date.now(),
    user: 'john@example.com'
  });
}

// Retrieve custom data
async function getCustomData() {
  const data = await cacheService.get('metadata', 'last-sync');
  if (data) {
    console.log('Last sync:', new Date(data.timestamp));
  }
}

// Clear specific cache
async function clearRoomCache() {
  await cacheService.clearTable('rooms');
}

// Get cache statistics
async function getCacheInfo() {
  const stats = await cacheService.getStats();
  console.log(`Total cached items: ${stats.total}`);
  console.log(`Rooms: ${stats.rooms}, Bookings: ${stats.bookings}`);
}

// Cleanup expired items
async function cleanupCache() {
  await cacheService.cleanupExpired();
  console.log('Expired cache items removed');
}
```

## Testing Offline Functionality

### Using Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Make changes in the app
5. Check that operations are queued
6. Switch back to "Online"
7. Verify that sync happens automatically

### Programmatic Testing

```typescript
// Simulate going offline
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false
});
window.dispatchEvent(new Event('offline'));

// Make some changes...

// Simulate coming back online
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});
window.dispatchEvent(new Event('online'));
```

## Best Practices

1. **Always use `offlineApi` for mutations**: This ensures changes are queued when offline
2. **Cache data after fetching**: Use `cacheService` to store data for offline access
3. **Show offline indicators**: Use `useOnlineStatus()` to inform users of offline mode
4. **Provide feedback**: Let users know when changes are queued vs immediately saved
5. **Handle conflicts gracefully**: The system will prompt users, but you can also handle programmatically
6. **Monitor queue size**: Alert users if the queue grows too large
7. **Test offline scenarios**: Always test your features in offline mode

## Common Patterns

### Pattern 1: Optimistic UI Updates

```typescript
const handleUpdate = async (newData) => {
  // Update UI immediately (optimistic)
  setLocalData(newData);
  
  try {
    // Make API call (will queue if offline)
    await offlineApi.updateSomething(newData);
  } catch (error) {
    // Revert on error
    setLocalData(oldData);
    toast.error('Update failed');
  }
};
```

### Pattern 2: Refresh on Reconnect

```typescript
const isOnline = useOnlineStatus();

useEffect(() => {
  if (isOnline) {
    // Refresh data when coming back online
    fetchFreshData();
  }
}, [isOnline]);
```

### Pattern 3: Show Queued Changes

```typescript
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  const updateCount = async () => {
    const stats = await offlineQueueService.getStats();
    setPendingCount(stats.pending);
  };
  
  updateCount();
  const interval = setInterval(updateCount, 5000);
  return () => clearInterval(interval);
}, []);

return (
  <div>
    {pendingCount > 0 && (
      <Badge>{pendingCount} changes pending</Badge>
    )}
  </div>
);
```
