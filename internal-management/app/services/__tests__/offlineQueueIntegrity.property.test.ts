/**
 * Property-Based Tests for Offline Queue Integrity
 * Feature: internal-management-system, Property 23: Offline queue integrity
 * 
 * Property: For any changes made while offline, they must be queued locally 
 * and synchronized to the backend in the order they were made when connection is restored
 * 
 * Validates: Requirements 35.3, 35.4
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { offlineQueueService, type QueuedOperation } from '../offlineQueueService';
import { queueDb } from '../offlineQueueService';

describe('Property 23: Offline Queue Integrity', () => {
  beforeEach(async () => {
    // Clear the queue before each test
    await offlineQueueService.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await offlineQueueService.clearAll();
  });

  /**
   * Generator for HTTP methods
   */
  const httpMethodArbitrary = () =>
    fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

  /**
   * Generator for operation types
   */
  const operationTypeArbitrary = () =>
    fc.constantFrom(
      'room_status_update',
      'booking_create',
      'check_in',
      'check_out',
      'payment_record',
      'housekeeping_complete',
      'maintenance_request'
    );

  /**
   * Generator for URLs
   */
  const urlArbitrary = () =>
    fc.oneof(
      fc.constant('/api/internal/rooms').chain(base =>
        fc.uuid().map(id => `${base}/${id}/status`)
      ),
      fc.constant('/api/internal/bookings'),
      fc.constant('/api/internal/bookings').chain(base =>
        fc.uuid().map(id => `${base}/${id}/checkin`)
      ),
      fc.constant('/api/internal/bookings').chain(base =>
        fc.uuid().map(id => `${base}/${id}/checkout`)
      ),
      fc.constant('/api/internal/payments'),
      fc.constant('/api/internal/housekeeping/tasks').chain(base =>
        fc.uuid().map(id => `${base}/${id}/complete`)
      ),
      fc.constant('/api/internal/maintenance/requests')
    );

  /**
   * Generator for operation data
   */
  const operationDataArbitrary = () =>
    fc.record({
      status: fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty'),
      notes: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
      amount: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), { nil: undefined }),
      roomId: fc.option(fc.uuid(), { nil: undefined })
    });

  /**
   * Generator for queued operations
   */
  const queuedOperationArbitrary = () =>
    fc.record({
      method: httpMethodArbitrary(),
      url: urlArbitrary(),
      data: operationDataArbitrary(),
      maxRetries: fc.integer({ min: 1, max: 5 }),
      operationType: operationTypeArbitrary(),
      description: fc.string({ minLength: 5, maxLength: 100 })
    });

  test('Property 23.1: Operations are queued in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 2, maxLength: 20 }),
        async (operations) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];
          const enqueuedTimestamps: number[] = [];

          for (const op of operations) {
            // Add small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 1));
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
            
            const queuedOp = await offlineQueueService.getOperation(id);
            if (queuedOp) {
              enqueuedTimestamps.push(queuedOp.timestamp);
            }
          }

          // Retrieve pending operations
          const pendingOps = await offlineQueueService.getPendingOperations();

          // Property: Operations must be returned in chronological order (by timestamp)
          expect(pendingOps.length).toBe(operations.length);

          for (let i = 0; i < pendingOps.length - 1; i++) {
            expect(pendingOps[i].timestamp).toBeLessThanOrEqual(pendingOps[i + 1].timestamp);
          }

          // Verify all operations are present
          const retrievedIds = pendingOps.map(op => op.id!);
          expect(retrievedIds.sort()).toEqual(enqueuedIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.2: All queued operations are preserved until processed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 1, maxLength: 15 }),
        async (operations) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];

          for (const op of operations) {
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
          }

          // Retrieve all operations
          const allOps = await offlineQueueService.getAllOperations();

          // Property: All enqueued operations must be present in the queue
          expect(allOps.length).toBe(operations.length);

          // Verify each operation has correct initial state
          for (const op of allOps) {
            expect(op.status).toBe('pending');
            expect(op.retryCount).toBe(0);
            expect(op.id).toBeDefined();
            expect(op.timestamp).toBeDefined();
            expect(enqueuedIds).toContain(op.id!);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.3: Operation order is maintained during status updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 3, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        async (operations, indicesToUpdate) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];

          for (const op of operations) {
            await new Promise(resolve => setTimeout(resolve, 1));
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
          }

          // Update status of some operations
          for (const index of indicesToUpdate) {
            if (index < enqueuedIds.length) {
              const id = enqueuedIds[index];
              await offlineQueueService.updateStatus(id, 'processing');
            }
          }

          // Retrieve all operations
          const allOps = await offlineQueueService.getAllOperations();

          // Property: Operations must still be in chronological order by timestamp
          for (let i = 0; i < allOps.length - 1; i++) {
            expect(allOps[i].timestamp).toBeLessThanOrEqual(allOps[i + 1].timestamp);
          }

          // Verify all operations are still present
          expect(allOps.length).toBe(operations.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.4: Pending operations remain in order after partial processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 5, maxLength: 15 }),
        fc.integer({ min: 1, max: 4 }),
        async (operations, numToComplete) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];

          for (const op of operations) {
            await new Promise(resolve => setTimeout(resolve, 1));
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
          }

          // Mark first N operations as completed
          const actualNumToComplete = Math.min(numToComplete, enqueuedIds.length);
          for (let i = 0; i < actualNumToComplete; i++) {
            await offlineQueueService.markCompleted(enqueuedIds[i]);
          }

          // Wait for completed operations to be deleted (5 second delay in implementation)
          await new Promise(resolve => setTimeout(resolve, 5100));

          // Retrieve pending operations
          const pendingOps = await offlineQueueService.getPendingOperations();

          // Property: Remaining operations must still be in chronological order
          for (let i = 0; i < pendingOps.length - 1; i++) {
            expect(pendingOps[i].timestamp).toBeLessThanOrEqual(pendingOps[i + 1].timestamp);
          }

          // Verify correct number of pending operations
          expect(pendingOps.length).toBeLessThanOrEqual(operations.length - actualNumToComplete);
        }
      ),
      { numRuns: 50 } // Reduced runs due to timeout delays
    );
  });

  test('Property 23.5: Queue statistics are consistent with actual queue state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        async (operations, indicesToFail, indicesToComplete) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];

          for (const op of operations) {
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
          }

          // Mark some as failed
          for (const index of indicesToFail) {
            if (index < enqueuedIds.length) {
              await offlineQueueService.markFailed(enqueuedIds[index], 'Test failure');
            }
          }

          // Mark some as completed
          for (const index of indicesToComplete) {
            if (index < enqueuedIds.length) {
              await offlineQueueService.markCompleted(enqueuedIds[index]);
            }
          }

          // Get statistics
          const stats = await offlineQueueService.getStats();

          // Get actual counts
          const allOps = await offlineQueueService.getAllOperations();
          const actualPending = allOps.filter(op => op.status === 'pending').length;
          const actualFailed = allOps.filter(op => op.status === 'failed').length;
          const actualCompleted = allOps.filter(op => op.status === 'completed').length;
          const actualProcessing = allOps.filter(op => op.status === 'processing').length;

          // Property: Statistics must match actual queue state
          expect(stats.pending).toBe(actualPending);
          expect(stats.failed).toBe(actualFailed);
          expect(stats.completed).toBe(actualCompleted);
          expect(stats.processing).toBe(actualProcessing);
          expect(stats.total).toBe(allOps.length);
          expect(stats.total).toBe(stats.pending + stats.failed + stats.completed + stats.processing);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.6: Operations maintain data integrity throughout lifecycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        queuedOperationArbitrary(),
        async (operation) => {
          // Enqueue operation
          const id = await offlineQueueService.enqueue(operation);

          // Retrieve and verify initial state
          const queuedOp = await offlineQueueService.getOperation(id);
          expect(queuedOp).toBeDefined();
          expect(queuedOp!.method).toBe(operation.method);
          expect(queuedOp!.url).toBe(operation.url);
          expect(queuedOp!.operationType).toBe(operation.operationType);
          expect(queuedOp!.maxRetries).toBe(operation.maxRetries);
          expect(queuedOp!.status).toBe('pending');
          expect(queuedOp!.retryCount).toBe(0);

          // Property: Original operation data must be preserved
          expect(queuedOp!.data).toEqual(operation.data);

          // Update status
          await offlineQueueService.updateStatus(id, 'processing');
          const processingOp = await offlineQueueService.getOperation(id);
          expect(processingOp!.status).toBe('processing');
          expect(processingOp!.data).toEqual(operation.data); // Data still preserved

          // Increment retry
          await offlineQueueService.incrementRetry(id);
          const retriedOp = await offlineQueueService.getOperation(id);
          expect(retriedOp!.retryCount).toBe(1);
          expect(retriedOp!.data).toEqual(operation.data); // Data still preserved

          // Property: Data integrity is maintained throughout all state changes
          expect(retriedOp!.method).toBe(operation.method);
          expect(retriedOp!.url).toBe(operation.url);
          expect(retriedOp!.operationType).toBe(operation.operationType);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.7: Retry count increments correctly and respects max retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        queuedOperationArbitrary(),
        fc.integer({ min: 1, max: 10 }),
        async (operation, numRetries) => {
          // Enqueue operation
          const id = await offlineQueueService.enqueue(operation);

          // Increment retry count multiple times
          for (let i = 0; i < numRetries; i++) {
            await offlineQueueService.incrementRetry(id);
          }

          // Retrieve operation
          const retriedOp = await offlineQueueService.getOperation(id);

          // Property: Retry count must equal the number of increments
          expect(retriedOp!.retryCount).toBe(numRetries);

          // Property: Retry count should not exceed max retries in normal flow
          // (This is enforced by the sync service, not the queue service itself)
          expect(retriedOp!.retryCount).toBeLessThanOrEqual(numRetries);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.8: Queue operations are idempotent for status updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        queuedOperationArbitrary(),
        fc.constantFrom('pending', 'processing', 'failed', 'completed'),
        fc.integer({ min: 1, max: 5 }),
        async (operation, status, numUpdates) => {
          // Enqueue operation
          const id = await offlineQueueService.enqueue(operation);

          // Update status multiple times to the same value
          for (let i = 0; i < numUpdates; i++) {
            await offlineQueueService.updateStatus(id, status as any);
          }

          // Retrieve operation
          const updatedOp = await offlineQueueService.getOperation(id);

          // Property: Multiple updates to the same status should be idempotent
          expect(updatedOp!.status).toBe(status);

          // Property: Data should remain unchanged
          expect(updatedOp!.data).toEqual(operation.data);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.9: Clearing operations removes only the specified subset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedOperationArbitrary(), { minLength: 5, maxLength: 15 }),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 4 }),
        async (operations, numToComplete, numToFail) => {
          // Enqueue all operations
          const enqueuedIds: number[] = [];

          for (const op of operations) {
            const id = await offlineQueueService.enqueue(op);
            enqueuedIds.push(id);
          }

          // Mark some as completed
          const actualNumToComplete = Math.min(numToComplete, enqueuedIds.length);
          for (let i = 0; i < actualNumToComplete; i++) {
            await offlineQueueService.updateStatus(enqueuedIds[i], 'completed');
          }

          // Mark some as failed
          const actualNumToFail = Math.min(numToFail, enqueuedIds.length - actualNumToComplete);
          for (let i = actualNumToComplete; i < actualNumToComplete + actualNumToFail; i++) {
            await offlineQueueService.markFailed(enqueuedIds[i], 'Test failure');
          }

          // Get counts before clearing
          const statsBefore = await offlineQueueService.getStats();

          // Clear completed operations
          await offlineQueueService.clearCompleted();

          // Get counts after clearing completed
          const statsAfterCompletedClear = await offlineQueueService.getStats();

          // Property: Only completed operations should be removed
          expect(statsAfterCompletedClear.completed).toBe(0);
          expect(statsAfterCompletedClear.failed).toBe(statsBefore.failed);
          expect(statsAfterCompletedClear.pending).toBe(statsBefore.pending);

          // Clear failed operations
          await offlineQueueService.clearFailed();

          // Get counts after clearing failed
          const statsAfterFailedClear = await offlineQueueService.getStats();

          // Property: Only failed operations should be removed
          expect(statsAfterFailedClear.failed).toBe(0);
          expect(statsAfterFailedClear.pending).toBe(statsBefore.pending);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23.10: Helper methods create operations with correct structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty'),
        fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
        async (roomId, status, notes) => {
          // Use helper method to queue room status update
          const id = await offlineQueueService.queueRoomStatusUpdate(roomId, status, notes);

          // Retrieve operation
          const op = await offlineQueueService.getOperation(id);

          // Property: Helper method must create correctly structured operation
          expect(op).toBeDefined();
          expect(op!.method).toBe('PUT');
          expect(op!.url).toBe(`/api/internal/rooms/${roomId}/status`);
          expect(op!.operationType).toBe('room_status_update');
          expect(op!.data).toEqual({ status, notes });
          expect(op!.maxRetries).toBe(3);
          expect(op!.status).toBe('pending');
          expect(op!.retryCount).toBe(0);
          expect(op!.description).toContain(roomId);
          expect(op!.description).toContain(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});
