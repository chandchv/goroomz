import { offlineQueueService } from '../services/offlineQueueService';
import { apiService } from '../services/api';
import api from '../services/api';
import type { AxiosRequestConfig } from 'axios';

/**
 * Wrapper for API calls that automatically queues requests when offline
 */
export async function offlineAwareRequest<T = any>(
  config: AxiosRequestConfig,
  options?: {
    operationType: string;
    description?: string;
    maxRetries?: number;
    queueIfOffline?: boolean; // Default: true for mutations, false for queries
  }
): Promise<T> {
  const isOnline = apiService.isOnline();
  const method = config.method?.toUpperCase() || 'GET';
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  // Determine if we should queue this request when offline
  const shouldQueue = options?.queueIfOffline ?? isMutation;

  // If offline and should queue, add to queue
  if (!isOnline && shouldQueue) {
    console.log(`Offline: Queueing ${method} ${config.url}`);
    
    await offlineQueueService.enqueue({
      method: method as any,
      url: config.url || '',
      data: config.data,
      headers: config.headers as Record<string, string>,
      maxRetries: options?.maxRetries || 3,
      operationType: options?.operationType || 'api_request',
      description: options?.description
    });

    // Return a mock response for optimistic UI updates
    // The actual response will come when synced
    return Promise.resolve({
      queued: true,
      message: 'Request queued for synchronization'
    } as any);
  }

  // If online or read-only request, make the request normally
  try {
    const response = await api.request<T>(config);
    return response.data;
  } catch (error: any) {
    // If network error and should queue, add to queue
    if (error.message === 'Network Error' && shouldQueue) {
      console.log(`Network error: Queueing ${method} ${config.url}`);
      
      await offlineQueueService.enqueue({
        method: method as any,
        url: config.url || '',
        data: config.data,
        headers: config.headers as Record<string, string>,
        maxRetries: options?.maxRetries || 3,
        operationType: options?.operationType || 'api_request',
        description: options?.description
      });

      return Promise.resolve({
        queued: true,
        message: 'Request queued for synchronization'
      } as any);
    }

    throw error;
  }
}

/**
 * Helper functions for common operations
 */
export const offlineApi = {
  /**
   * Update room status with offline support
   */
  updateRoomStatus: async (roomId: string, status: string, notes?: string) => {
    return offlineAwareRequest({
      method: 'PUT',
      url: `/api/internal/rooms/${roomId}/status`,
      data: { status, notes }
    }, {
      operationType: 'room_status_update',
      description: `Update room ${roomId} status to ${status}`
    });
  },

  /**
   * Create booking with offline support
   */
  createBooking: async (bookingData: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: '/api/internal/bookings',
      data: bookingData
    }, {
      operationType: 'booking_create',
      description: `Create booking for room ${bookingData.roomId}`
    });
  },

  /**
   * Check-in with offline support
   */
  checkIn: async (bookingId: string, checkInData: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: `/api/internal/bookings/${bookingId}/checkin`,
      data: checkInData
    }, {
      operationType: 'check_in',
      description: `Check-in for booking ${bookingId}`
    });
  },

  /**
   * Check-out with offline support
   */
  checkOut: async (bookingId: string, checkOutData: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: `/api/internal/bookings/${bookingId}/checkout`,
      data: checkOutData
    }, {
      operationType: 'check_out',
      description: `Check-out for booking ${bookingId}`
    });
  },

  /**
   * Record payment with offline support
   */
  recordPayment: async (paymentData: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: '/api/internal/payments',
      data: paymentData
    }, {
      operationType: 'payment_record',
      description: `Record payment for booking ${paymentData.bookingId}`
    });
  },

  /**
   * Complete housekeeping with offline support
   */
  completeHousekeeping: async (roomId: string, data: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: `/api/internal/housekeeping/tasks/${roomId}/complete`,
      data
    }, {
      operationType: 'housekeeping_complete',
      description: `Mark room ${roomId} as clean`
    });
  },

  /**
   * Create maintenance request with offline support
   */
  createMaintenanceRequest: async (requestData: any) => {
    return offlineAwareRequest({
      method: 'POST',
      url: '/api/internal/maintenance/requests',
      data: requestData
    }, {
      operationType: 'maintenance_request',
      description: `Create maintenance request for room ${requestData.roomId}`
    });
  }
};
