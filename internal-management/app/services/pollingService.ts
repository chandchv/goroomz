/**
 * Polling Service for Real-time Updates
 * 
 * This service polls the backend API for new online bookings and booking status changes
 * to keep the internal management system synchronized with the customer-facing website.
 * 
 * Requirements: 16.1, 16.2, 17.4
 */

import { apiService } from './api';

export interface PollingCallback<T> {
  (data: T): void;
}

export interface PollingOptions {
  interval: number; // in milliseconds
  enabled: boolean;
}

class PollingService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private lastBookingCheck: Date | null = null;
  private lastBookingIds: Set<string> = new Set();

  /**
   * Start polling for new online bookings
   * Polls every 30 seconds for new bookings from the online platform
   */
  public startBookingPolling(
    propertyId: string,
    onNewBooking: PollingCallback<any>,
    options: PollingOptions = { interval: 30000, enabled: true }
  ): void {
    if (!options.enabled) return;

    const key = `bookings-${propertyId}`;
    
    // Clear existing interval if any
    this.stopPolling(key);

    // Initial fetch
    this.checkForNewBookings(propertyId, onNewBooking);

    // Set up polling interval
    const intervalId = setInterval(() => {
      this.checkForNewBookings(propertyId, onNewBooking);
    }, options.interval);

    this.intervals.set(key, intervalId);
  }

  /**
   * Start polling for booking status changes
   * Polls every 30 seconds for changes in booking statuses
   */
  public startBookingStatusPolling(
    propertyId: string,
    onStatusChange: PollingCallback<any>,
    options: PollingOptions = { interval: 30000, enabled: true }
  ): void {
    if (!options.enabled) return;

    const key = `booking-status-${propertyId}`;
    
    // Clear existing interval if any
    this.stopPolling(key);

    // Set up polling interval
    const intervalId = setInterval(() => {
      this.checkForBookingStatusChanges(propertyId, onStatusChange);
    }, options.interval);

    this.intervals.set(key, intervalId);
  }

  /**
   * Stop polling for a specific key
   */
  public stopPolling(key: string): void {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
    }
  }

  /**
   * Stop all polling
   */
  public stopAllPolling(): void {
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    this.lastBookingCheck = null;
    this.lastBookingIds.clear();
  }

  /**
   * Check for new bookings from the online platform
   */
  private async checkForNewBookings(
    propertyId: string,
    onNewBooking: PollingCallback<any>
  ): Promise<void> {
    try {
      // Only check if online
      if (!apiService.isOnline()) {
        return;
      }

      const now = new Date();
      const since = this.lastBookingCheck || new Date(Date.now() - 60000); // Last minute if first check

      // Fetch recent bookings
      const response = await apiService.request<{ bookings: any[] }>({
        method: 'GET',
        url: '/api/internal/bookings',
        params: {
          propertyId,
          source: 'online',
          since: since.toISOString(),
          status: 'pending,confirmed',
        },
      });

      this.lastBookingCheck = now;

      // Check for new bookings we haven't seen before
      if (response.bookings && Array.isArray(response.bookings)) {
        const newBookings = response.bookings.filter(
          (booking) => !this.lastBookingIds.has(booking.id)
        );

        // Update our tracking set
        response.bookings.forEach((booking) => {
          this.lastBookingIds.add(booking.id);
        });

        // Notify about new bookings
        newBookings.forEach((booking) => {
          onNewBooking(booking);
        });
      }
    } catch (error) {
      console.error('Error checking for new bookings:', error);
      // Don't throw - just log and continue polling
    }
  }

  /**
   * Check for booking status changes
   */
  private async checkForBookingStatusChanges(
    propertyId: string,
    onStatusChange: PollingCallback<any>
  ): Promise<void> {
    try {
      // Only check if online
      if (!apiService.isOnline()) {
        return;
      }

      // Fetch recent status changes
      const response = await apiService.request<{ changes: any[] }>({
        method: 'GET',
        url: '/api/internal/bookings/status-changes',
        params: {
          propertyId,
          since: new Date(Date.now() - 60000).toISOString(), // Last minute
        },
      });

      // Notify about status changes
      if (response.changes && Array.isArray(response.changes)) {
        response.changes.forEach((change) => {
          onStatusChange(change);
        });
      }
    } catch (error) {
      console.error('Error checking for booking status changes:', error);
      // Don't throw - just log and continue polling
    }
  }

  /**
   * Get active polling keys
   */
  public getActivePolling(): string[] {
    return Array.from(this.intervals.keys());
  }

  /**
   * Check if polling is active for a key
   */
  public isPollingActive(key: string): boolean {
    return this.intervals.has(key);
  }
}

export const pollingService = new PollingService();
export default pollingService;
