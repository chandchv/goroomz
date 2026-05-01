# Real-time Updates Guide

This guide explains how the Internal Management System stays synchronized with online bookings and status changes through polling.

## Overview

The system polls the backend API every 30 seconds to check for:
1. New online bookings from the customer-facing website
2. Booking status changes
3. Other real-time updates

When new data is detected, toast notifications are shown to alert staff.

## Requirements

This implementation satisfies:
- **Requirement 16.1**: "WHEN a booking is created through the online platform THEN the System SHALL automatically update the internal management system with the new booking"
- **Requirement 16.2**: "WHEN a booking status changes in the backend THEN the System SHALL reflect the updated status in the internal management interface within 5 seconds"
- **Requirement 17.4**: "WHEN an online booking is received THEN the System SHALL send a notification to the property owner in the internal management system"

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Internal Management App                 │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         PollingContext (Provider)              │    │
│  │  - Manages polling lifecycle                   │    │
│  │  - Shows toast notifications                   │    │
│  │  - Dispatches custom events                    │    │
│  └────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌────────────────────────────────────────────────┐    │
│  │         PollingService                         │    │
│  │  - Polls every 30 seconds                      │    │
│  │  - Tracks seen bookings                        │    │
│  │  - Handles online/offline state                │    │
│  └────────────────────────────────────────────────┘    │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼ HTTP Polling
┌─────────────────────────────────────────────────────────┐
│                    Backend API                           │
│  GET /api/internal/bookings?source=online&since=...     │
│  GET /api/internal/bookings/status-changes?since=...    │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Automatic Polling

Polling starts automatically when a user logs in and has a property assigned:

```typescript
// In root.tsx - already configured
<AuthProvider>
  <PollingProvider>
    <Outlet />
  </PollingProvider>
</AuthProvider>
```

The `PollingProvider` automatically:
1. Starts polling when user is authenticated
2. Stops polling when user logs out
3. Handles online/offline transitions
4. Shows toast notifications for new bookings

### Manual Control

You can manually control polling in components:

```typescript
import { usePolling } from '../contexts/PollingContext';

function MyComponent() {
  const { startPolling, stopPolling, isPollingActive } = usePolling();

  const handleStartPolling = () => {
    startPolling('property-123');
  };

  const handleStopPolling = () => {
    stopPolling();
  };

  return (
    <div>
      <p>Polling: {isPollingActive ? 'Active' : 'Inactive'}</p>
      <button onClick={handleStartPolling}>Start</button>
      <button onClick={handleStopPolling}>Stop</button>
    </div>
  );
}
```

### Listening to Events

Components can listen for new bookings and status changes:

```typescript
import { useEffect } from 'react';

function BookingList() {
  useEffect(() => {
    // Listen for new bookings
    const handleNewBooking = (event: CustomEvent) => {
      const booking = event.detail;
      console.log('New booking received:', booking);
      
      // Refresh booking list
      refreshBookings();
    };

    window.addEventListener('new-booking', handleNewBooking as EventListener);

    return () => {
      window.removeEventListener('new-booking', handleNewBooking as EventListener);
    };
  }, []);

  useEffect(() => {
    // Listen for status changes
    const handleStatusChange = (event: CustomEvent) => {
      const change = event.detail;
      console.log('Status changed:', change);
      
      // Update specific booking
      updateBookingStatus(change.bookingId, change.newStatus);
    };

    window.addEventListener('booking-status-change', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('booking-status-change', handleStatusChange as EventListener);
    };
  }, []);

  return <div>...</div>;
}
```

## Polling Service API

### Starting Booking Polling

```typescript
import { pollingService } from '../services/pollingService';

pollingService.startBookingPolling(
  'property-123',
  (booking) => {
    console.log('New booking:', booking);
    // Handle new booking
  },
  {
    interval: 30000,  // 30 seconds
    enabled: true,
  }
);
```

### Starting Status Polling

```typescript
pollingService.startBookingStatusPolling(
  'property-123',
  (change) => {
    console.log('Status change:', change);
    // Handle status change
  },
  {
    interval: 30000,
    enabled: true,
  }
);
```

### Stopping Polling

```typescript
// Stop specific polling
pollingService.stopPolling('bookings-property-123');

// Stop all polling
pollingService.stopAllPolling();
```

### Checking Polling Status

```typescript
// Get active polling keys
const activeKeys = pollingService.getActivePolling();
console.log('Active polling:', activeKeys);

// Check if specific polling is active
const isActive = pollingService.isPollingActive('bookings-property-123');
```

## Toast Notifications

Toast notifications are automatically shown for:

### New Online Bookings

```
┌─────────────────────────────────────────┐
│ ℹ️ New Online Booking                   │
│ John Doe booked Room 101 for 12/25/2024│
└─────────────────────────────────────────┘
```

### Booking Status Changes

```
┌─────────────────────────────────────────┐
│ ℹ️ Booking Status Updated               │
│ Booking #12345 status changed to active│
└─────────────────────────────────────────┘
```

### Custom Toasts

You can show custom toasts in your components:

```typescript
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { showToast } = useToast();

  const handleAction = () => {
    showToast({
      title: 'Success!',
      description: 'Room status updated',
      type: 'success',
      duration: 5000,
    });
  };

  return <button onClick={handleAction}>Update</button>;
}
```

Toast types:
- `info` - Blue background (default)
- `success` - Green background
- `warning` - Yellow background
- `error` - Red background

## Configuration

### Polling Interval

Default: 30 seconds (30000ms)

To change the interval:

```typescript
pollingService.startBookingPolling(
  propertyId,
  callback,
  {
    interval: 60000,  // 60 seconds
    enabled: true,
  }
);
```

### Disabling Polling

To disable polling temporarily:

```typescript
pollingService.startBookingPolling(
  propertyId,
  callback,
  {
    interval: 30000,
    enabled: false,  // Disabled
  }
);
```

## Backend API Requirements

The polling service expects these endpoints:

### Get Recent Bookings

```
GET /api/internal/bookings?propertyId={id}&source=online&since={timestamp}&status=pending,confirmed
```

Response:
```json
{
  "bookings": [
    {
      "id": "booking-123",
      "guestName": "John Doe",
      "roomNumber": "101",
      "checkInDate": "2024-12-25",
      "checkOutDate": "2024-12-27",
      "status": "confirmed",
      "bookingSource": "online"
    }
  ]
}
```

### Get Status Changes

```
GET /api/internal/bookings/status-changes?propertyId={id}&since={timestamp}
```

Response:
```json
{
  "changes": [
    {
      "bookingId": "booking-123",
      "oldStatus": "pending",
      "newStatus": "confirmed",
      "changedAt": "2024-12-20T10:30:00Z"
    }
  ]
}
```

## Best Practices

### 1. Handle Offline State

The polling service automatically stops when offline:

```typescript
// Polling service checks navigator.onLine
if (!apiService.isOnline()) {
  return; // Skip polling
}
```

### 2. Avoid Duplicate Notifications

The service tracks seen bookings to avoid duplicate notifications:

```typescript
// Internal tracking
private lastBookingIds: Set<string> = new Set();

// Only notify about new bookings
const newBookings = response.bookings.filter(
  (booking) => !this.lastBookingIds.has(booking.id)
);
```

### 3. Clean Up on Unmount

Always clean up polling when components unmount:

```typescript
useEffect(() => {
  pollingService.startBookingPolling(propertyId, callback);

  return () => {
    pollingService.stopAllPolling();
  };
}, [propertyId]);
```

### 4. Combine with Optimistic Updates

Use polling for incoming data and optimistic updates for outgoing changes:

```typescript
// Outgoing: Optimistic update
await updateRoomStatusOptimistic(roomId, 'clean', {
  optimisticUpdate: () => setStatus('clean'),
  revertUpdate: () => setStatus('dirty'),
});

// Incoming: Polling detects changes from other sources
useEffect(() => {
  const handleStatusChange = (event: CustomEvent) => {
    setStatus(event.detail.newStatus);
  };
  
  window.addEventListener('booking-status-change', handleStatusChange);
  return () => window.removeEventListener('booking-status-change', handleStatusChange);
}, []);
```

## Performance Considerations

### Polling Frequency

- **30 seconds**: Good balance between real-time and server load
- **15 seconds**: More real-time but higher server load
- **60 seconds**: Lower server load but less real-time

### Network Efficiency

The service only polls when:
1. User is authenticated
2. Browser is online
3. Polling is enabled

### Memory Management

The service maintains a set of seen booking IDs. This grows over time but is cleared when:
- User logs out
- Polling is stopped
- Page is refreshed

## Troubleshooting

### Polling Not Working

Check:
1. User is authenticated: `user?.propertyId` exists
2. Browser is online: `navigator.onLine === true`
3. Polling is enabled in options
4. Backend endpoints are responding

### Duplicate Notifications

If you see duplicate notifications:
1. Check that polling isn't started multiple times
2. Verify `lastBookingIds` tracking is working
3. Check for multiple `PollingProvider` instances

### Missing Notifications

If notifications aren't showing:
1. Check browser console for errors
2. Verify backend is returning new bookings
3. Check toast duration (may have expired)
4. Verify `ToastProvider` is in component tree

## See Also

- [Optimistic Updates](./OPTIMISTIC_UPDATES.md) - Immediate UI updates
- [Offline Functionality](./OFFLINE_FUNCTIONALITY.md) - Offline queue integration
- [API Documentation](./API_DOCUMENTATION.md) - Backend API reference
