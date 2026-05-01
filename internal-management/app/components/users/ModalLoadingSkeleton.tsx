/**
 * Skeleton Loader for Modal Content
 * Displays placeholder content while modal data is loading
 */

interface ModalLoadingSkeletonProps {
  type?: 'form' | 'details' | 'list';
}

export default function ModalLoadingSkeleton({ type = 'form' }: ModalLoadingSkeletonProps) {
  if (type === 'form') {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Form Field 1 */}
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>

        {/* Form Field 2 */}
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>

        {/* Form Field 3 */}
        <div>
          <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>

        {/* Form Field 4 */}
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>

        {/* Form Field 5 */}
        <div>
          <div className="h-4 w-36 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (type === 'details') {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
