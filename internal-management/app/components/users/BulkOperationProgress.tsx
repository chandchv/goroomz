/**
 * Progress Indicator for Bulk Operations
 * Shows progress bar and status for bulk import/export operations
 */

interface BulkOperationProgressProps {
  current: number;
  total: number;
  operation: string;
  message?: string;
}

export default function BulkOperationProgress({
  current,
  total,
  operation,
  message,
}: BulkOperationProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Spinner and Title */}
      <div className="flex flex-col items-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900">{operation}</h3>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            {current} of {total}
          </span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Please don't close this window while the operation is in progress.
        </p>
      </div>
    </div>
  );
}

/**
 * Indeterminate Progress Indicator
 * Shows a loading state when progress cannot be determined
 */
interface IndeterminateProgressProps {
  operation: string;
  message?: string;
}

export function IndeterminateProgress({ operation, message }: IndeterminateProgressProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-lg font-medium text-gray-900">{operation}</p>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      <div className="mt-6 flex justify-center">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
