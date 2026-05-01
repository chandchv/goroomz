import type { RoomStatusData } from '../../services/dashboardService';

interface RoomStatusSummaryProps {
  data: RoomStatusData | null;
  loading: boolean;
}

export default function RoomStatusSummary({ data, loading }: RoomStatusSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusItems = [
    {
      label: 'Occupied',
      count: data.occupied,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Vacant & Clean',
      count: data.vacant_clean,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Vacant & Dirty',
      count: data.vacant_dirty,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Status Summary</h2>
      <div className="space-y-3">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${item.bgColor} mr-3`}></div>
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <span className={`text-lg font-semibold ${item.color}`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
