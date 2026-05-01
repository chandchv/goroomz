/**
 * Skeleton Loader for User List
 * Displays placeholder content while user data is loading
 */

interface UserListSkeletonProps {
  rows?: number;
}

export default function UserListSkeleton({ rows = 5 }: UserListSkeletonProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters Skeleton */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4">
          {/* Search Input Skeleton */}
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Filter Dropdowns Skeleton */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="h-4 w-12 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div>
              <div className="h-4 w-14 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table Skeleton - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="h-4 w-14 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="px-6 py-3 text-right">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-40 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-28 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-4">
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Skeleton - Visible only on mobile */}
      <div className="md:hidden divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="p-4 animate-pulse">
            {/* User Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-40 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full ml-2"></div>
            </div>

            {/* User Details */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-14 bg-gray-200 rounded"></div>
                <div className="h-3 w-28 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <div className="flex-1 h-11 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 h-11 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 h-11 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="px-4 md:px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
