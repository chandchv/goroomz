import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { SyncConflict } from '../services/syncService';

interface SyncConflictModalProps {
  conflicts: SyncConflict[];
  onResolve: (operationId: number, resolution: 'use_local' | 'use_server' | 'cancel') => void;
  onClose: () => void;
}

export default function SyncConflictModal({
  conflicts,
  onResolve,
  onClose
}: SyncConflictModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(
    conflicts[0] || null
  );

  if (conflicts.length === 0) {
    return null;
  }

  const handleResolve = (resolution: 'use_local' | 'use_server' | 'cancel') => {
    if (selectedConflict) {
      onResolve(selectedConflict.operationId, resolution);
      
      // Move to next conflict or close
      const currentIndex = conflicts.findIndex(
        c => c.operationId === selectedConflict.operationId
      );
      
      if (currentIndex < conflicts.length - 1) {
        setSelectedConflict(conflicts[currentIndex + 1]);
      } else {
        onClose();
      }
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Sync Conflict Detected
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need
                  resolution
                </p>
              </div>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {selectedConflict && (
              <div className="space-y-4">
                {/* Conflict Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg
                      className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-yellow-900">
                        {selectedConflict.operation.description ||
                          selectedConflict.operation.operationType}
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        {selectedConflict.error}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local vs Server Data */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Local Changes */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Your Local Changes
                    </h4>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedConflict.localData, null, 2)}
                    </pre>
                  </div>

                  {/* Server Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Server Data
                    </h4>
                    {selectedConflict.serverData ? (
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedConflict.serverData, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No server data available
                      </p>
                    )}
                  </div>
                </div>

                {/* Resolution Options */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">
                    How would you like to resolve this conflict?
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleResolve('use_local')}
                      className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <div className="font-medium text-gray-900">
                        Use My Local Changes
                      </div>
                      <div className="text-sm text-gray-600">
                        Overwrite server data with your local changes
                      </div>
                    </button>

                    <button
                      onClick={() => handleResolve('use_server')}
                      className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <div className="font-medium text-gray-900">
                        Use Server Data
                      </div>
                      <div className="text-sm text-gray-600">
                        Discard your local changes and keep server data
                      </div>
                    </button>

                    <button
                      onClick={() => handleResolve('cancel')}
                      className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <div className="font-medium text-gray-900">
                        Cancel This Operation
                      </div>
                      <div className="text-sm text-gray-600">
                        Remove this operation from the sync queue
                      </div>
                    </button>
                  </div>
                </div>

                {/* Progress Indicator */}
                {conflicts.length > 1 && (
                  <div className="text-center text-sm text-gray-600">
                    Conflict {conflicts.findIndex(c => c.operationId === selectedConflict.operationId) + 1} of {conflicts.length}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
