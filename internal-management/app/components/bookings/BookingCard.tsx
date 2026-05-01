import React from 'react';
import type { Booking } from '../../services/bookingService';

interface BookingCardProps {
  booking: Booking;
  onClick: (booking: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceBadge = (source: string) => {
    return source === 'online' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        Online
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        Offline
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={() => onClick(booking)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {booking.user?.name || 'Guest'}
            </h3>
            {getSourceBadge(booking.bookingSource)}
          </div>
          <p className="text-sm text-gray-600">
            {booking.user?.email || booking.contactInfo?.email}
          </p>
          <p className="text-sm text-gray-600">
            {booking.user?.phone || booking.contactInfo?.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
            {booking.paymentStatus?.charAt(0).toUpperCase() + booking.paymentStatus?.slice(1) || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Room</p>
          <p className="text-sm font-medium text-gray-900">
            {booking.room?.roomNumber || 'N/A'}
            {booking.bed && ` - Bed ${booking.bed.bedNumber}`}
          </p>
          <p className="text-xs text-gray-600">Floor {booking.room?.floorNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Guests</p>
          <p className="text-sm font-medium text-gray-900">{booking.guests}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Check-in</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkIn)}</p>
          {booking.actualCheckInTime && (
            <p className="text-xs text-green-600">✓ {formatTime(booking.actualCheckInTime)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {booking.bed ? 'Duration' : 'Check-out'}
          </p>
          <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkOut)}</p>
          {booking.actualCheckOutTime && (
            <p className="text-xs text-green-600">✓ {formatTime(booking.actualCheckOutTime)}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
        <div className="flex-1">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">₹{booking.totalAmount.toLocaleString()}</p>
          {booking.securityDeposit && (
            <div className="mt-1">
              <p className="text-xs text-gray-500">Security Deposit</p>
              <p className="text-sm font-medium text-blue-600">
                ₹{booking.securityDeposit.amount.toLocaleString()}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                  booking.securityDeposit.status === 'collected' ? 'bg-green-100 text-green-800' :
                  booking.securityDeposit.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                  booking.securityDeposit.status === 'partially_refunded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {booking.securityDeposit.status}
                </span>
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          {booking.specialRequests && (
            <div className="text-xs text-gray-500 mb-1">
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Special requests
            </div>
          )}
          {booking.bed && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              PG Monthly
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;

