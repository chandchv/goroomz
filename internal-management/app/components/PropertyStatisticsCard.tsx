import React, { useState, useEffect } from 'react';
import superuserService, { type PropertyStatistics, type Property } from '../services/superuserService';

interface PropertyStatisticsCardProps {
  property: Property;
}

const PropertyStatisticsCard: React.FC<PropertyStatisticsCardProps> = ({ property }) => {
  const [statistics, setStatistics] = useState<PropertyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, [property.id]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superuserService.getPropertyStatistics(property.id);
      setStatistics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
      console.error('Error loading property statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-red-600 text-sm">
          {error || 'Failed to load statistics'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Statistics</h3>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Rooms</div>
          <div className="text-2xl font-bold text-blue-900">{statistics.totalRooms}</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Occupied</div>
          <div className="text-2xl font-bold text-green-900">{statistics.occupiedRooms}</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Occupancy Rate</div>
          <div className="text-2xl font-bold text-purple-900">{statistics.occupancyRate.toFixed(1)}%</div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium mb-1">Monthly Revenue</div>
          <div className="text-2xl font-bold text-yellow-900">
            ₹{statistics.monthlyRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="text-sm text-gray-600 font-medium mb-1">Total Revenue</div>
        <div className="text-3xl font-bold text-gray-900">
          ₹{statistics.totalRevenue.toLocaleString()}
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Bookings</h4>
        
        {!statistics.recentBookings || statistics.recentBookings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No recent bookings</p>
        ) : (
          <div className="space-y-2">
            {statistics.recentBookings.slice(0, 5).map((booking: any, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {booking.guestName || booking.User?.name || 'Guest'}
                  </div>
                  <div className="text-xs text-gray-600">
                    Room {booking.Room?.roomNumber || booking.roomId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-900">₹{booking.totalAmount?.toLocaleString() || 0}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(booking.checkInDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={loadStatistics}
          className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Refresh Statistics
        </button>
      </div>
    </div>
  );
};

export default PropertyStatisticsCard;
