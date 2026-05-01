import React, { useState, useEffect } from 'react';
import roomService, { type Room, type BookingHistory, type MaintenanceHistory, type RoomStatus } from '../../services/roomService';

interface StatusHistoryItem extends RoomStatus {
  updatedByName?: string;
}

interface RoomDetailModalProps {
  room: Room;
  onClose: () => void;
  onStatusUpdate?: () => void;
  onEdit?: (room: Room) => void;
  onBookRoom?: (room: Room) => void;
  onCheckIn?: (room: Room) => void;
  onCheckOut?: (room: Room) => void;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onStatusUpdate,
  onEdit,
  onBookRoom,
  onCheckIn,
  onCheckOut,
}) => {
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'bookings' | 'maintenance' | 'status'>('details');

  useEffect(() => {
    loadHistory();
  }, [room.id]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [bookings, maintenance, statusHist] = await Promise.all([
        roomService.getRoomBookingHistory(room.id),
        roomService.getRoomMaintenanceHistory(room.id),
        roomService.getRoomStatusHistory(room.id).catch(() => []),
      ]);
      setBookingHistory(bookings);
      setMaintenanceHistory(maintenance);
      setStatusHistory(statusHist);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-yellow-100 text-yellow-800';
      case 'vacant_dirty':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'vacant_clean':
        return 'Vacant/Clean';
      case 'occupied':
        return 'Occupied';
      case 'vacant_dirty':
        return 'Vacant/Dirty';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRoomAction = (action: 'book' | 'checkin' | 'checkout') => {
    switch (action) {
      case 'book':
        if (onBookRoom) {
          onBookRoom(room);
        } else {
          // Navigate to booking creation page
          window.location.href = `/bookings/create?roomId=${room.id}`;
        }
        break;
      case 'checkin':
        if (onCheckIn) {
          onCheckIn(room);
        } else {
          // Navigate to check-in page
          window.location.href = `/check-in?roomId=${room.id}`;
        }
        break;
      case 'checkout':
        if (onCheckOut) {
          onCheckOut(room);
        } else {
          // Navigate to check-out page
          window.location.href = `/check-out?roomId=${room.id}`;
        }
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Room {room.roomNumber}</h2>
            <p className="text-sm text-gray-600">Floor {room.floorNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Booking History
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'maintenance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Maintenance History
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Status History
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Room Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Room Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Room Number</label>
                    <p className="font-medium">{room.roomNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Floor</label>
                    <p className="font-medium">{room.floorNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Category</label>
                    <p className="font-medium">{room.categoryName || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Current Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(room.currentStatus)}`}>
                      {getStatusLabel(room.currentStatus)}
                    </span>
                  </div>
                  {room.sharingType && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">Sharing Type</label>
                        <p className="font-medium">{room.sharingType.replace('_', '-')}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Beds</label>
                        <p className="font-medium">{room.occupiedBeds || 0} / {room.totalBeds}</p>
                      </div>
                    </>
                  )}
                  {room.price && (
                    <div>
                      <label className="text-sm text-gray-600">Price</label>
                      <p className="font-medium">₹{room.price}</p>
                    </div>
                  )}
                  {room.lastCleanedAt && (
                    <div>
                      <label className="text-sm text-gray-600">Last Cleaned</label>
                      <p className="font-medium">{formatDate(room.lastCleanedAt)}</p>
                    </div>
                  )}
                  {room.lastMaintenanceAt && (
                    <div>
                      <label className="text-sm text-gray-600">Last Maintenance</label>
                      <p className="font-medium">{formatDate(room.lastMaintenanceAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {room.amenities && room.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Management Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Room Management</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Row 1: Basic Actions */}
                  <button
                    onClick={() => onEdit && onEdit(room)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Room
                  </button>
                  <button
                    onClick={onStatusUpdate}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update Status
                  </button>
                  
                  {/* Row 2: Booking Actions */}
                  <button
                    onClick={() => handleRoomAction('book')}
                    disabled={room.currentStatus === 'occupied'}
                    className={`px-4 py-2 rounded flex items-center justify-center gap-2 ${
                      room.currentStatus === 'occupied'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Booking
                  </button>
                  <button
                    onClick={() => handleRoomAction('checkin')}
                    disabled={room.currentStatus !== 'vacant_clean'}
                    className={`px-4 py-2 rounded flex items-center justify-center gap-2 ${
                      room.currentStatus !== 'vacant_clean'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Check In
                  </button>
                  
                  {/* Row 3: Check-out Action */}
                  <button
                    onClick={() => handleRoomAction('checkout')}
                    disabled={room.currentStatus !== 'occupied'}
                    className={`px-4 py-2 rounded flex items-center justify-center gap-2 col-span-2 ${
                      room.currentStatus !== 'occupied'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Check Out
                  </button>
                </div>
                
                {/* Action Status Messages */}
                <div className="mt-3 text-xs text-gray-500">
                  {room.currentStatus === 'occupied' && (
                    <p>• Room is occupied - only check-out available</p>
                  )}
                  {room.currentStatus === 'vacant_dirty' && (
                    <p>• Room needs cleaning before new bookings or check-ins</p>
                  )}
                  {room.currentStatus === 'vacant_clean' && (
                    <p>• Room is ready for new bookings and check-ins</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Booking History</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : bookingHistory.length === 0 ? (
                <p className="text-gray-500">No booking history available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookingHistory.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-4 py-3 text-sm">{booking.guestName}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(booking.checkInDate)}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(booking.checkOutDate)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              booking.bookingSource === 'online'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {booking.bookingSource}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Maintenance History</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : maintenanceHistory.length === 0 ? (
                <p className="text-gray-500">No maintenance history available</p>
              ) : (
                <div className="space-y-4">
                  {maintenanceHistory.map((maintenance) => (
                    <div key={maintenance.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{maintenance.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          maintenance.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : maintenance.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {maintenance.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{maintenance.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Priority: {maintenance.priority}</span>
                        <span>Reported: {formatDate(maintenance.reportedDate)}</span>
                        {maintenance.completedDate && (
                          <span>Completed: {formatDate(maintenance.completedDate)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'status' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Status History</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : statusHistory.length === 0 ? (
                <p className="text-gray-500">No status history available</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((status) => (
                    <div key={status.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
                          {getStatusLabel(status.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(status.updatedAt)}
                        </span>
                      </div>
                      {status.notes && (
                        <p className="text-sm text-gray-600 mt-2">{status.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
