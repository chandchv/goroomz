/**
 * Polling Context
 * 
 * Manages real-time polling for bookings and status changes
 * Shows toast notifications for new online bookings
 * 
 * Requirements: 16.1, 16.2, 17.4
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { pollingService } from '../services/pollingService';
import { useToast } from '../hooks/useToast';
import { ToastProvider } from '../components/Toast';
import { useAuth } from './AuthContext';

interface PollingContextValue {
  startPolling: (propertyId: string) => void;
  stopPolling: () => void;
  isPollingActive: boolean;
}

const PollingContext = createContext<PollingContextValue | undefined>(undefined);

export function usePolling() {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within PollingProvider');
  }
  return context;
}

interface PollingProviderProps {
  children: ReactNode;
}

export function PollingProvider({ children }: PollingProviderProps) {
  const { user } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    // Start polling when user is authenticated and has a property
    if (user?.propertyId) {
      startPolling(user.propertyId);
    }

    // Cleanup on unmount
    return () => {
      pollingService.stopAllPolling();
    };
  }, [user?.propertyId]);

  const startPolling = (propertyId: string) => {
    // Start polling for new online bookings
    pollingService.startBookingPolling(
      propertyId,
      (booking) => {
        // Show toast notification for new online booking
        showToast({
          title: 'New Online Booking',
          description: `${booking.guestName} booked ${booking.roomNumber || 'a room'} for ${
            new Date(booking.checkInDate).toLocaleDateString()
          }`,
          type: 'info',
          duration: 8000, // Show for 8 seconds
        });

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(
          new CustomEvent('new-booking', { detail: booking })
        );
      },
      { interval: 30000, enabled: true }
    );

    // Start polling for booking status changes
    pollingService.startBookingStatusPolling(
      propertyId,
      (change) => {
        // Show toast notification for status change
        showToast({
          title: 'Booking Status Updated',
          description: `Booking #${change.bookingId} status changed to ${change.newStatus}`,
          type: 'info',
          duration: 5000,
        });

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(
          new CustomEvent('booking-status-change', { detail: change })
        );
      },
      { interval: 30000, enabled: true }
    );
  };

  const stopPolling = () => {
    pollingService.stopAllPolling();
  };

  const isPollingActive = pollingService.getActivePolling().length > 0;

  return (
    <PollingContext.Provider value={{ startPolling, stopPolling, isPollingActive }}>
      <ToastProvider toasts={toasts} onDismiss={dismissToast}>
        {children}
      </ToastProvider>
    </PollingContext.Provider>
  );
}
