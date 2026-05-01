import type { ActivitiesData } from '../../services/dashboardService';

interface TodayActivitiesProps {
  data: ActivitiesData | null;
  loading: boolean;
}

export default function TodayActivities({ data, loading }: TodayActivitiesProps) {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activities</h2>
      
      <div className="space-y-4">
        {/* Check-ins */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Check-ins ({data.checkIns?.length || 0})
          </h3>
          {(data.checkIns?.length || 0) === 0 ? (
            <p className="text-sm text-gray-500">No check-ins scheduled</p>
          ) : (
            <div className="space-y-2">
              {data.checkIns?.slice(0, 3).map((checkIn) => (
                <div key={checkIn.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{checkIn.guestName}</p>
                    <p className="text-gray-500">Room {checkIn.roomNumber}</p>
                  </div>
                  <span className="text-gray-600">{formatTime(checkIn.checkInTime)}</span>
                </div>
              ))}
              {(data.checkIns?.length || 0) > 3 && (
                <p className="text-xs text-gray-500">
                  +{(data.checkIns?.length || 0) - 3} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Check-outs */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Check-outs ({data.checkOuts?.length || 0})
          </h3>
          {(data.checkOuts?.length || 0) === 0 ? (
            <p className="text-sm text-gray-500">No check-outs scheduled</p>
          ) : (
            <div className="space-y-2">
              {data.checkOuts?.slice(0, 3).map((checkOut) => (
                <div key={checkOut.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{checkOut.guestName}</p>
                    <p className="text-gray-500">Room {checkOut.roomNumber}</p>
                  </div>
                  <span className="text-gray-600">{formatTime(checkOut.checkOutTime)}</span>
                </div>
              ))}
              {(data.checkOuts?.length || 0) > 3 && (
                <p className="text-xs text-gray-500">
                  +{(data.checkOuts?.length || 0) - 3} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payments Due */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Payments Due ({data.paymentsDue?.length || 0})
          </h3>
          {(data.paymentsDue?.length || 0) === 0 ? (
            <p className="text-sm text-gray-500">No payments due today</p>
          ) : (
            <div className="space-y-2">
              {data.paymentsDue?.slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{payment.guestName}</p>
                    <p className="text-gray-500">Room {payment.roomNumber}</p>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    ₹{payment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {(data.paymentsDue?.length || 0) > 3 && (
                <p className="text-xs text-gray-500">
                  +{(data.paymentsDue?.length || 0) - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
