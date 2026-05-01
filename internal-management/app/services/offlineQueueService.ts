import Dexie, { type Table } from 'dexie';

// Define the structure of queued operations
export interface QueuedOperation {
  id?: number; // Auto-incremented by Dexie
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
  operationType: string; // e.g., 'room_status_update', 'booking_create', etc.
  description?: string; // Human-readable description
}

// Define the database schema for offline queue
class OfflineQueueDatabase extends Dexie {
  queue!: Table<QueuedOperation, number>;

  constructor() {
    super('OfflineQueue');
    
    // Define database schema
    this.version(1).stores({
      queue: '++id, timestamp, status, operationType'
    });
  }
}

// Create database instance
const queueDb = new OfflineQueueDatabase();

/**
 * Offline Queue Service for managing operations while offline
 */
export const offlineQueueService = {
  /**
   * Add an operation to the queue
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<number> {
    const queuedOp: Omit<QueuedOperation, 'id'> = {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    const id = await queueDb.queue.add(queuedOp as QueuedOperation);
    console.log(`Operation queued: ${operation.operationType} (ID: ${id})`);
    return id;
  },

  /**
   * Get all pending operations in chronological order
   */
  async getPendingOperations(): Promise<QueuedOperation[]> {
    return queueDb.queue
      .where('status')
      .equals('pending')
      .sortBy('timestamp');
  },

  /**
   * Get all operations (for debugging/display)
   */
  async getAllOperations(): Promise<QueuedOperation[]> {
    return queueDb.queue.orderBy('timestamp').toArray();
  },

  /**
   * Get operation by ID
   */
  async getOperation(id: number): Promise<QueuedOperation | undefined> {
    return queueDb.queue.get(id);
  },

  /**
   * Update operation status
   */
  async updateStatus(
    id: number,
    status: QueuedOperation['status'],
    error?: string
  ): Promise<void> {
    const updates: Partial<QueuedOperation> = { status };
    if (error) {
      updates.error = error;
    }
    await queueDb.queue.update(id, updates);
  },

  /**
   * Increment retry count for an operation
   */
  async incrementRetry(id: number): Promise<void> {
    const operation = await queueDb.queue.get(id);
    if (operation) {
      await queueDb.queue.update(id, {
        retryCount: operation.retryCount + 1
      });
    }
  },

  /**
   * Mark operation as completed and remove from queue
   */
  async markCompleted(id: number): Promise<void> {
    await queueDb.queue.update(id, { status: 'completed' });
    // Optionally delete completed operations after a delay
    setTimeout(() => {
      queueDb.queue.delete(id);
    }, 5000); // Keep for 5 seconds for confirmation
  },

  /**
   * Mark operation as failed
   */
  async markFailed(id: number, error: string): Promise<void> {
    await queueDb.queue.update(id, {
      status: 'failed',
      error
    });
  },

  /**
   * Remove operation from queue
   */
  async remove(id: number): Promise<void> {
    await queueDb.queue.delete(id);
  },

  /**
   * Clear all completed operations
   */
  async clearCompleted(): Promise<void> {
    const completed = await queueDb.queue
      .where('status')
      .equals('completed')
      .toArray();
    
    const ids = completed.map(op => op.id!);
    await queueDb.queue.bulkDelete(ids);
  },

  /**
   * Clear all failed operations
   */
  async clearFailed(): Promise<void> {
    const failed = await queueDb.queue
      .where('status')
      .equals('failed')
      .toArray();
    
    const ids = failed.map(op => op.id!);
    await queueDb.queue.bulkDelete(ids);
  },

  /**
   * Clear entire queue
   */
  async clearAll(): Promise<void> {
    await queueDb.queue.clear();
  },

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
    total: number;
  }> {
    const [pending, processing, failed, completed, total] = await Promise.all([
      queueDb.queue.where('status').equals('pending').count(),
      queueDb.queue.where('status').equals('processing').count(),
      queueDb.queue.where('status').equals('failed').count(),
      queueDb.queue.where('status').equals('completed').count(),
      queueDb.queue.count()
    ]);

    return { pending, processing, failed, completed, total };
  },

  /**
   * Check if queue has pending operations
   */
  async hasPendingOperations(): Promise<boolean> {
    const count = await queueDb.queue
      .where('status')
      .equals('pending')
      .count();
    return count > 0;
  },

  /**
   * Helper: Queue a room status update
   */
  async queueRoomStatusUpdate(roomId: string, status: string, notes?: string): Promise<number> {
    return this.enqueue({
      method: 'PUT',
      url: `/internal/rooms/${roomId}/status`,
      data: { status, notes },
      maxRetries: 3,
      operationType: 'room_status_update',
      description: `Update room ${roomId} status to ${status}`
    });
  },

  /**
   * Helper: Queue a booking creation
   */
  async queueBookingCreate(bookingData: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: '/api/internal/bookings',
      data: bookingData,
      maxRetries: 3,
      operationType: 'booking_create',
      description: `Create booking for room ${bookingData.roomId}`
    });
  },

  /**
   * Helper: Queue a check-in
   */
  async queueCheckIn(bookingId: string, checkInData: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: `/internal/bookings/${bookingId}/checkin`,
      data: checkInData,
      maxRetries: 3,
      operationType: 'check_in',
      description: `Check-in for booking ${bookingId}`
    });
  },

  /**
   * Helper: Queue a check-out
   */
  async queueCheckOut(bookingId: string, checkOutData: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: `/internal/bookings/${bookingId}/checkout`,
      data: checkOutData,
      maxRetries: 3,
      operationType: 'check_out',
      description: `Check-out for booking ${bookingId}`
    });
  },

  /**
   * Helper: Queue a payment recording
   */
  async queuePaymentRecord(paymentData: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: '/api/internal/payments',
      data: paymentData,
      maxRetries: 3,
      operationType: 'payment_record',
      description: `Record payment for booking ${paymentData.bookingId}`
    });
  },

  /**
   * Helper: Queue a housekeeping completion
   */
  async queueHousekeepingComplete(roomId: string, data: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: `/internal/housekeeping/tasks/${roomId}/complete`,
      data,
      maxRetries: 3,
      operationType: 'housekeeping_complete',
      description: `Mark room ${roomId} as clean`
    });
  },

  /**
   * Helper: Queue a maintenance request
   */
  async queueMaintenanceRequest(requestData: any): Promise<number> {
    return this.enqueue({
      method: 'POST',
      url: '/api/internal/maintenance/requests',
      data: requestData,
      maxRetries: 3,
      operationType: 'maintenance_request',
      description: `Create maintenance request for room ${requestData.roomId}`
    });
  }
};

// Export database instance for advanced usage
export { queueDb };
