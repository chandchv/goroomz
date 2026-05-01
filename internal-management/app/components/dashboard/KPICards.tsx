import type { KPIData } from '../../services/dashboardService';

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
}

export default function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {/* Occupancy Rate */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 sm:p-6 text-white transform transition-transform hover:scale-105 active:scale-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-blue-100">Occupancy Rate</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
              {data.occupancy?.rate?.toFixed(1) || '0.0'}%
            </p>
            <p className="text-xs text-blue-100 mt-1 truncate">
              {data.occupancy?.occupiedRooms || 0} / {data.occupancy?.totalRooms || 0} rooms
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 sm:p-6 text-white transform transition-transform hover:scale-105 active:scale-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-green-100">Total Revenue</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
              ₹{data.revenue?.currentMonth?.toLocaleString('en-IN') || '0'}
            </p>
            <p className="text-xs text-green-100 mt-1">Current month</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-4 sm:p-6 text-white transform transition-transform hover:scale-105 active:scale-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-yellow-100">Pending Payments</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
              ₹{data.payments?.pendingAmount?.toLocaleString('en-IN') || '0'}
            </p>
            <p className="text-xs text-yellow-100 mt-1">
              {data.payments?.pendingCount || 0} payment{(data.payments?.pendingCount || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Occupied Rooms */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 sm:p-6 text-white transform transition-transform hover:scale-105 active:scale-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-purple-100">Occupied Rooms</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
              {data.occupancy?.occupiedRooms || 0}/{data.occupancy?.totalRooms || 0}
            </p>
            <p className="text-xs text-purple-100 mt-1">
              {data.occupancy?.vacantRooms || 0} vacant
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
