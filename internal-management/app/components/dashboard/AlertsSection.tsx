import type { AlertsData } from '../../services/dashboardService';

interface AlertsSectionProps {
  data: AlertsData | null;
  loading: boolean;
}

export default function AlertsSection({ data, loading }: AlertsSectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const totalAlerts = 
    (data.overduePayments?.length || 0) + 
    (data.pendingMaintenance?.length || 0) + 
    (data.dirtyRooms?.length || 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
        {totalAlerts > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            {totalAlerts}
          </span>
        )}
      </div>

      {totalAlerts === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">All clear! No alerts at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overdue Payments */}
          {data.overduePayments && data.overduePayments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                Overdue Payments ({data.overduePayments.length})
              </h3>
              <div className="space-y-2">
                {data.overduePayments.slice(0, 3).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-sm bg-red-50 p-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{payment.guestName}</p>
                      <p className="text-gray-600">
                        Room {payment.roomNumber} • {payment.daysOverdue} days overdue
                      </p>
                    </div>
                    <span className="text-red-700 font-semibold">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                {data.overduePayments.length > 3 && (
                  <p className="text-xs text-gray-500 pl-2">
                    +{data.overduePayments.length - 3} more overdue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pending Maintenance */}
          {data.pendingMaintenance && data.pendingMaintenance.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Pending Maintenance ({data.pendingMaintenance.length})
              </h3>
              <div className="space-y-2">
                {data.pendingMaintenance.slice(0, 3).map((maintenance) => (
                  <div
                    key={maintenance.id}
                    className="flex items-center justify-between text-sm bg-orange-50 p-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{maintenance.title}</p>
                      <p className="text-gray-600">
                        Room {maintenance.roomNumber} • 
                        <span className={`ml-1 ${
                          maintenance.priority === 'urgent' 
                            ? 'text-red-600 font-semibold' 
                            : 'text-orange-600'
                        }`}>
                          {maintenance.priority}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">
                      {maintenance.status}
                    </span>
                  </div>
                ))}
                {data.pendingMaintenance.length > 3 && (
                  <p className="text-xs text-gray-500 pl-2">
                    +{data.pendingMaintenance.length - 3} more requests
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dirty Rooms */}
          {data.dirtyRooms && data.dirtyRooms.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Rooms Dirty &gt; 24 Hours ({data.dirtyRooms.length})
              </h3>
              <div className="space-y-2">
                {data.dirtyRooms.slice(0, 3).map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between text-sm bg-yellow-50 p-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">Room {room.roomNumber}</p>
                      <p className="text-gray-600">Floor {room.floorNumber}</p>
                    </div>
                    <span className="text-yellow-700 font-semibold">
                      {room.hoursDirty}h
                    </span>
                  </div>
                ))}
                {data.dirtyRooms.length > 3 && (
                  <p className="text-xs text-gray-500 pl-2">
                    +{data.dirtyRooms.length - 3} more rooms
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
