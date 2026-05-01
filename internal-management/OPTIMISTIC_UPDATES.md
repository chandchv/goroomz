# Optimistic Updates Guide

This guide explains how to implement optimistic UI updates in the Internal Management System.

## What are Optimistic Updates?

Optimistic updates improve user experience by immediately updating the UI when a user performs an action, before waiting for the server response. If the server request fails, the UI automatically reverts to the previous state.

**Benefits:**
- Instant feedback to users
- Perceived performance improvement
- Better user experience
- Automatic error recovery

## Requirements

This implementation satisfies **Requirement 16.3**: "WHEN a room status is updated in the internal management system THEN the System SHALL persist the change to the backend database immediately"

## Implementation Methods

### Method 1: Using `useOptimisticUpdate` Hook

Best for simple, single-value updates.

```typescript
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';

function MyComponent() {
  const [status, setStatus] = useState('pending');
  const { execute, isLoading, error } = useOptimisticUpdate();

  const handleUpdate = async (newStatus: string) => {
    await execute(
      // 1. Optimistic update - runs immediately
      () => setStatus(newStatus),
      
      // 2. API call - runs after optimistic update
      () => api.updateStatus(newStatus),
      
      // 3. Revert - runs if API call fails
      () => setStatus(status),
      
      // 4. Options
      {
        onSuccess: (result) => console.log('Success!'),
        onError: (err) => alert('Failed!'),
      }
    );
  };

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={() => handleUpdate('active')} disabled={isLoading}>
        Update
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Method 2: Using `useOptimisticState` Hook

Best for list operations (add, update, delete).

```typescript
import { useOptimisticState } from '../hooks/useOptimisticUpdate';

function RoomList({ initialRooms }) {
  const {
    state: rooms,
    updateOptimistic,
    deleteOptimistic,
    addOptimistic,
    isLoading,
    error,
  } = useOptimisticState(initialRooms);

  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>) => {
    const room = rooms.find(r => r.id === roomId);
    
    await updateOptimistic(
      (r) => r.id === roomId,           // Predicate to find item
      { ...room, ...updates },           // Updated item
      () => api.updateRoom(roomId, updates), // API call
      {
        onError: (err) => alert('Update failed'),
      }
    );
  };

  const handleDeleteRoom = async (roomId: string) => {
    await deleteOptimistic(
      (r) => r.id === roomId,
      () => api.deleteRoom(roomId),
      {
        onError: (err) => alert('Delete failed'),
      }
    );
  };

  return (
    <div>
      {rooms.map(room => (
        <div key={room.id}>
          <span>{room.name}</span>
          <button onClick={() => handleUpdateRoom(room.id, { status: 'clean' })}>
            Mark Clean
          </button>
          <button onClick={() => handleDeleteRoom(room.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Method 3: Using `optimisticApiRequest` Directly

Best for custom scenarios or when you need more control.

```typescript
import { optimisticApiRequest } from '../utils/optimisticApiWrapper';

async function updateRoomStatus(roomId: string, newStatus: string) {
  const previousState = getCurrentState();

  await optimisticApiRequest(
    {
      method: 'PUT',
      url: `/internal/rooms/${roomId}/status`,
      data: { status: newStatus },
    },
    {
      optimisticUpdate: () => {
        updateLocalState(newStatus);
      },
      revertUpdate: () => {
        restoreState(previousState);
      },
      onSuccess: (data) => {
        console.log('Updated:', data);
      },
      onError: (err) => {
        console.error('Failed:', err);
      },
    }
  );
}
```

### Method 4: Using Service Methods with Optimistic Support

Services can expose optimistic versions of their methods:

```typescript
// In roomService.ts
updateRoomStatusOptimistic: async (
  roomId: string,
  status: string,
  notes?: string,
  options?: OptimisticApiOptions<RoomStatus>
): Promise<RoomStatus | null> => {
  return optimisticApiRequest<RoomStatus>(
    {
      method: 'PUT',
      url: `/internal/rooms/${roomId}/status`,
      data: { status, notes },
    },
    options
  );
}

// In component
await roomService.updateRoomStatusOptimistic(
  roomId,
  'vacant_clean',
  'Cleaned by staff',
  {
    optimisticUpdate: () => setLocalStatus('vacant_clean'),
    revertUpdate: () => setLocalStatus(previousStatus),
    onError: (err) => alert('Failed to update'),
  }
);
```

## Loading States

### Using `useLoadingState` Hook

Track loading state for specific operations:

```typescript
import { useLoadingState } from '../hooks/useLoadingState';
import { apiCallWithLoading } from '../utils/optimisticApiWrapper';

function MyComponent() {
  const isLoading = useLoadingState('update-room-status');

  const handleUpdate = async () => {
    await apiCallWithLoading(
      'update-room-status',
      () => api.updateStatus('clean'),
      {
        optimisticUpdate: () => setStatus('clean'),
        revertUpdate: () => setStatus('dirty'),
      }
    );
  };

  return (
    <button disabled={isLoading}>
      {isLoading ? 'Updating...' : 'Update'}
    </button>
  );
}
```

### Using Loading Components

```typescript
import { ButtonWithLoading, LoadingOverlay } from '../components/LoadingSpinner';

// Button with loading spinner
<ButtonWithLoading
  isLoading={isLoading}
  onClick={handleUpdate}
  className="px-4 py-2 bg-blue-600 text-white rounded"
>
  Update Status
</ButtonWithLoading>

// Overlay for entire section
<LoadingOverlay isLoading={isLoading} message="Updating room...">
  <RoomDetails room={room} />
</LoadingOverlay>
```

## Best Practices

### 1. Always Provide Revert Function

```typescript
// ✅ Good - can revert on error
const previousValue = currentValue;
execute(
  () => setValue(newValue),
  () => api.update(newValue),
  () => setValue(previousValue)  // Revert to previous
);

// ❌ Bad - no way to revert
execute(
  () => setValue(newValue),
  () => api.update(newValue),
  () => {}  // Empty revert
);
```

### 2. Handle Errors Gracefully

```typescript
// ✅ Good - user-friendly error handling
{
  onError: (err) => {
    alert(`Failed to update room status: ${err.message}`);
    console.error('Update error:', err);
  }
}

// ❌ Bad - silent failure
{
  onError: (err) => console.log(err)
}
```

### 3. Show Loading States

```typescript
// ✅ Good - clear loading indication
<ButtonWithLoading isLoading={isLoading}>
  Update
</ButtonWithLoading>

// ❌ Bad - no loading feedback
<button onClick={handleUpdate}>Update</button>
```

### 4. Use Appropriate Method

- **Single value updates**: `useOptimisticUpdate`
- **List operations**: `useOptimisticState`
- **Complex scenarios**: `optimisticApiRequest`
- **Service integration**: Service-specific optimistic methods

### 5. Consider Network Conditions

```typescript
// Check if online before optimistic update
if (!navigator.onLine) {
  alert('You are offline. Changes will sync when connection is restored.');
  // Queue for offline sync instead
  return;
}

// Proceed with optimistic update
await execute(...);
```

## Common Patterns

### Room Status Updates

```typescript
const handleMarkClean = async (roomId: string) => {
  const room = rooms.find(r => r.id === roomId);
  
  await updateOptimistic(
    (r) => r.id === roomId,
    { ...room, currentStatus: 'vacant_clean', lastCleanedAt: new Date() },
    () => roomService.updateRoomStatus(roomId, 'vacant_clean'),
    {
      onSuccess: () => {
        showToast({ title: 'Room marked as clean', type: 'success' });
      },
      onError: (err) => {
        showToast({ title: 'Failed to update room', type: 'error' });
      },
    }
  );
};
```

### Booking Status Changes

```typescript
const handleCheckIn = async (bookingId: string) => {
  const booking = bookings.find(b => b.id === bookingId);
  
  await updateOptimistic(
    (b) => b.id === bookingId,
    { ...booking, status: 'active', actualCheckInTime: new Date() },
    () => bookingService.checkIn(bookingId),
    {
      onSuccess: () => {
        navigate('/dashboard');
        showToast({ title: 'Check-in successful', type: 'success' });
      },
      onError: (err) => {
        showToast({ 
          title: 'Check-in failed', 
          description: err.message,
          type: 'error' 
        });
      },
    }
  );
};
```

### Payment Recording

```typescript
const handleRecordPayment = async (amount: number) => {
  const newPayment = {
    id: `temp-${Date.now()}`,
    amount,
    date: new Date(),
    status: 'completed',
  };
  
  await addOptimistic(
    newPayment,
    () => paymentService.recordPayment(amount),
    {
      onSuccess: (result) => {
        // Replace temp payment with actual from server
        showToast({ title: 'Payment recorded', type: 'success' });
      },
      onError: (err) => {
        showToast({ title: 'Failed to record payment', type: 'error' });
      },
    }
  );
};
```

## Testing Optimistic Updates

```typescript
import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';

test('reverts on API failure', async () => {
  const { result } = renderHook(() => useOptimisticUpdate());
  
  let value = 'initial';
  const setValue = (v: string) => { value = v; };
  
  const failingApi = () => Promise.reject(new Error('API Error'));
  
  await act(async () => {
    await result.current.execute(
      () => setValue('optimistic'),
      failingApi,
      () => setValue('initial')
    );
  });
  
  expect(value).toBe('initial'); // Reverted
  expect(result.current.error).toBeTruthy();
});
```

## See Also

- [Real-time Updates](./REALTIME_UPDATES.md) - Polling for new bookings
- [Offline Functionality](./OFFLINE_FUNCTIONALITY.md) - Offline queue integration
- [API Documentation](./API_DOCUMENTATION.md) - Backend API reference
