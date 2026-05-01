import { useState, useEffect } from 'react';
import { syncService, type SyncStatus, type SyncResult } from '../services/syncService';

/**
 * Hook to monitor sync status and trigger syncs
 */
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncService.onSyncStatusChange((status, result) => {
      setSyncStatus(status);
      setIsSyncing(status === 'syncing');
      
      if (result) {
        setLastSyncResult(result);
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    try {
      const result = await syncService.forceSyncNow();
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  };

  const resolveConflict = async (
    operationId: number,
    resolution: 'use_local' | 'use_server' | 'cancel'
  ) => {
    await syncService.resolveConflict(operationId, resolution);
  };

  const clearFailedOperations = async () => {
    await syncService.clearFailedOperations();
  };

  const retryFailedOperations = async () => {
    await syncService.retryFailedOperations();
  };

  return {
    syncStatus,
    isSyncing,
    lastSyncResult,
    triggerSync,
    resolveConflict,
    clearFailedOperations,
    retryFailedOperations
  };
}
