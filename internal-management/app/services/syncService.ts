import { offlineQueueService, type QueuedOperation } from './offlineQueueService';
import { cacheService } from './cacheService';
import api, { apiService } from './api';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncConflict {
  operationId: number;
  operation: QueuedOperation;
  localData: any;
  serverData?: any;
  error: string;
}

export interface SyncResult {
  success: number;
  failed: number;
  conflicts: SyncConflict[];
  totalProcessed: number;
}

/**
 * Synchronization Service for syncing offline changes with the backend
 */
class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus, result?: SyncResult) => void> = [];
  private autoSyncEnabled = true;

  constructor() {
    // Listen for online events to trigger auto-sync
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.autoSyncEnabled) {
          console.log('Connection restored, starting auto-sync...');
          this.sync();
        }
      });
    }
  }

  /**
   * Add a listener for sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus, result?: SyncResult) => void): () => void {
    this.syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus, result?: SyncResult): void {
    this.syncListeners.forEach(callback => callback(status, result));
  }

  /**
   * Enable or disable auto-sync
   */
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Main sync function - processes all pending operations
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return {
        success: 0,
        failed: 0,
        conflicts: [],
        totalProcessed: 0
      };
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('Cannot sync while offline');
      return {
        success: 0,
        failed: 0,
        conflicts: [],
        totalProcessed: 0
      };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    const result: SyncResult = {
      success: 0,
      failed: 0,
      conflicts: [],
      totalProcessed: 0
    };

    try {
      // Get all pending operations
      const pendingOps = await offlineQueueService.getPendingOperations();
      result.totalProcessed = pendingOps.length;

      console.log(`Starting sync: ${pendingOps.length} operations to process`);

      // Process each operation in order
      for (const operation of pendingOps) {
        try {
          await this.processOperation(operation);
          result.success++;
        } catch (error: any) {
          result.failed++;
          
          // Check if it's a conflict error
          if (error.isConflict) {
            result.conflicts.push({
              operationId: operation.id!,
              operation,
              localData: operation.data,
              serverData: error.serverData,
              error: error.message
            });
          }

          console.error(`Failed to sync operation ${operation.id}:`, error);
        }
      }

      console.log(`Sync completed: ${result.success} success, ${result.failed} failed, ${result.conflicts.length} conflicts`);

      // Clean up completed operations
      await offlineQueueService.clearCompleted();

      this.notifyListeners('success', result);
      return result;

    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('error');
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    if (!operation.id) {
      throw new Error('Operation ID is required');
    }

    // Update status to processing
    await offlineQueueService.updateStatus(operation.id, 'processing');

    try {
      // Make the API request
      const response = await api.request({
        method: operation.method,
        url: operation.url,
        data: operation.data,
        headers: operation.headers
      });

      // Mark as completed
      await offlineQueueService.markCompleted(operation.id);

      console.log(`Operation ${operation.id} (${operation.operationType}) completed successfully`);

    } catch (error: any) {
      // Increment retry count
      await offlineQueueService.incrementRetry(operation.id);

      const currentOp = await offlineQueueService.getOperation(operation.id);
      
      if (currentOp && currentOp.retryCount >= currentOp.maxRetries) {
        // Max retries reached, mark as failed
        await offlineQueueService.markFailed(
          operation.id,
          error.message || 'Max retries exceeded'
        );
        throw error;
      } else {
        // Reset to pending for retry
        await offlineQueueService.updateStatus(
          operation.id,
          'pending',
          error.message
        );
        throw error;
      }
    }
  }

  /**
   * Resolve a conflict by choosing local or server version
   */
  async resolveConflict(
    operationId: number,
    resolution: 'use_local' | 'use_server' | 'cancel'
  ): Promise<void> {
    const operation = await offlineQueueService.getOperation(operationId);
    
    if (!operation) {
      throw new Error('Operation not found');
    }

    switch (resolution) {
      case 'use_local':
        // Retry the operation (force update)
        await offlineQueueService.updateStatus(operationId, 'pending');
        await this.sync();
        break;

      case 'use_server':
        // Discard local changes
        await offlineQueueService.markCompleted(operationId);
        break;

      case 'cancel':
        // Remove from queue
        await offlineQueueService.remove(operationId);
        break;
    }
  }

  /**
   * Get current sync statistics
   */
  async getSyncStats(): Promise<{
    pendingOperations: number;
    failedOperations: number;
    lastSyncTime?: number;
  }> {
    const stats = await offlineQueueService.getStats();
    
    return {
      pendingOperations: stats.pending,
      failedOperations: stats.failed,
      lastSyncTime: undefined // Could be stored in metadata
    };
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow(): Promise<SyncResult> {
    return this.sync();
  }

  /**
   * Clear all failed operations
   */
  async clearFailedOperations(): Promise<void> {
    await offlineQueueService.clearFailed();
  }

  /**
   * Retry all failed operations
   */
  async retryFailedOperations(): Promise<void> {
    const allOps = await offlineQueueService.getAllOperations();
    const failedOps = allOps.filter(op => op.status === 'failed');

    for (const op of failedOps) {
      if (op.id) {
        await offlineQueueService.updateStatus(op.id, 'pending');
      }
    }

    await this.sync();
  }
}

// Create singleton instance
export const syncService = new SyncService();

/**
 * React hook for using sync service
 */
export function useSyncService() {
  return syncService;
}
