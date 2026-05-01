import { useState, useEffect } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { offlineQueueService } from '../services/offlineQueueService';
import SyncConflictModal from './SyncConflictModal';

export default function SyncStatusBar() {
  const {
    syncStatus,
    isSyncing,
    lastSyncResult,
    triggerSync,
    resolveConflict,
    retryFailedOperations
  } = useSyncStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Poll for queue stats
  useEffect(() => {
    const updateStats = async () => {
      const stats = await offlineQueueService.getStats();
      setPendingCount(stats.pending);
      setFailedCount(stats.failed);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [syncStatus]);

  // Show conflict modal if there are conflicts
  useEffect(() => {
    if (lastSyncResult && lastSyncResult.conflicts.length > 0) {
      setShowConflictModal(true);
    }
  }, [lastSyncResult]);

  // Don't show bar if nothing to display
  if (pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            {/* Syncing Indicator */}
            {isSyncing && (
              <div className="flex items-center space-x-2 text-blue-700">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  Synchronizing changes...
                </span>
              </div>
            )}

            {/* Pending Operations */}
            {!isSyncing && pendingCount > 0 && (
              <div className="flex items-center space-x-2 text-blue-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {pendingCount} change{pendingCount > 1 ? 's' : ''} waiting to sync
                </span>
              </div>
            )}

            {/* Failed Operations */}
            {failedCount > 0 && (
              <div className="flex items-center space-x-2 text-red-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {failedCount} failed operation{failedCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {failedCount > 0 && (
              <button
                onClick={retryFailedOperations}
                disabled={isSyncing}
                className="px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry Failed
              </button>
            )}

            {pendingCount > 0 && !isSyncing && (
              <button
                onClick={triggerSync}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && lastSyncResult && lastSyncResult.conflicts.length > 0 && (
        <SyncConflictModal
          conflicts={lastSyncResult.conflicts}
          onResolve={resolveConflict}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </>
  );
}
