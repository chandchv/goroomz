import React, { useState } from 'react';
import type { Booking } from '../../services/bookingService';
import { bookingService } from '../../services/bookingService';
import RoomChangeModal from './RoomChangeModal';

interface BookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdate: () => void;
}

// Derive the first collection period from booking type
function getFirstCollectionPeriod(booking: Booking): { label: string; amount: number } {
  const isMonthly = booking.bookingType === 'monthly' || !!booking.bed;
  if (isMonthly) {
    // 1 month rate
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const totalMonths = Math.max(
      1,
      (checkOut.getFullYear() - checkIn.getFullYear()) * 12 +
        (checkOut.getMonth() - checkIn.getMonth())
    );
    const monthlyRate = totalMonths > 0 ? booking.totalAmount / totalMonths : booking.totalAmount;
    return { label: '1 Month', amount: Math.round(monthlyRate) };
  } else {
    // 1 day rate
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const totalDays = Math.max(
      1,
      Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );
    const dailyRate = totalDays > 0 ? booking.totalAmount / totalDays : booking.totalAmount;
    return { label: '1 Day', amount: Math.round(dailyRate) };
  }
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showCheckOutForm, setShowCheckOutForm] = useState(false);
  const [showCollectPaymentForm, setShowCollectPaymentForm] = useState(false);
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');
  const [securityDepositMethod, setSecurityDepositMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid' | 'refunded'>(booking.paymentStatus);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectPaymentStatus, setCollectPaymentStatus] = useState<'pending' | 'partial' | 'paid' | 'refunded'>(booking.paymentStatus);
  const [collectNotes, setCollectNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    guestName: booking.user?.name || booking.contactInfo?.name || '',
    guestPhone: booking.user?.phone || booking.contactInfo?.phone || '',
    guestEmail: booking.user?.email || booking.contactInfo?.email || '',
    checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
    checkOut: booking.checkOut ? booking.checkOut.split('T')[0] : '',
    guests: booking.guests,
    totalAmount: booking.totalAmount,
    paidAmount: booking.paidAmount ?? 0,
    paymentStatus: booking.paymentStatus,
    specialRequests: booking.specialRequests || ''
  });

  const firstCollection = getFirstCollectionPeriod(booking);
  const alreadyPaid = booking.paymentStatus === 'paid'
    ? booking.totalAmount  // if marked paid, treat full amount as collected
    : (booking.paidAmount ?? 0);
  const outstanding = Math.max(0, booking.totalAmount - alreadyPaid);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isActive = booking.status !== 'cancelled' && booking.status !== 'completed';
  const canCheckIn = booking.status === 'pending' || booking.status === 'confirmed';
  const canCheckOut = booking.status === 'confirmed' && !!booking.actualCheckInTime && !booking.actualCheckOutTime;
  const canCollectPayment = isActive && outstanding > 0;

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: Record<string, unknown> = {};
      if (securityDepositAmount) {
        data.securityDepositAmount = parseFloat(securityDepositAmount);
        data.securityDepositMethod = securityDepositMethod;
      }
      if (notes) data.notes = notes;
      if (paidAmount) data.paidAmount = parseFloat(paidAmount);
      if (paymentStatus) data.paymentStatus = paymentStatus;

      await bookingService.checkIn(booking.id, data);
      setShowCheckInForm(false);
      onUpdate();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to process check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: Record<string, unknown> = {};
      if (notes) data.notes = notes;

      await bookingService.checkOut(booking.id, data);
      setShowCheckOutForm(false);
      onUpdate();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to process check-out');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setLoading(true);
      setError(null);
      await bookingService.cancelBooking(booking.id);
      onUpdate();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      await bookingService.updateBooking(booking.id, editData);
      setIsEditing(false);
      onUpdate();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!collectAmount || parseFloat(collectAmount) <= 0) {
      setError('Please enter a valid amount to collect');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await bookingService.collectPayment(booking.id, {
        paidAmount: parseFloat(collectAmount),
        paymentStatus: collectPaymentStatus,
        notes: collectNotes || undefined,
      });
      setShowCollectPaymentForm(false);
      setCollectAmount('');
      setCollectNotes('');
      onUpdate();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to collect payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
            <p className="text-sm text-gray-600 mt-1">Booking ID: {booking.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Status Badges */}
          <div className="flex gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
              Payment: {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.bookingSource === 'online' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
              {booking.bookingSource === 'online' ? 'Online Booking' : 'Offline Booking'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${(booking.bookingType === 'monthly' || booking.bed) ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
              {(booking.bookingType === 'monthly' || booking.bed) ? `PG (Monthly) — 1st collection: ₹${firstCollection.amount.toLocaleString()}` : `Hotel (Daily) — 1st collection: ₹${firstCollection.amount.toLocaleString()}`}
            </span>
          </div>

          {isEditing ? (
            <div className="bg-gray-50 rounded-lg p-6 space-y-6 border-2 border-blue-100">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Edit Booking</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                  <input type="text" value={editData.guestName} onChange={e => setEditData({ ...editData, guestName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={editData.guestPhone} onChange={e => setEditData({ ...editData, guestPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editData.guestEmail} onChange={e => setEditData({ ...editData, guestEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
                  <input type="number" value={editData.guests} onChange={e => setEditData({ ...editData, guests: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Duration of Stay</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                    <input type="date" value={editData.checkIn} onChange={e => setEditData({ ...editData, checkIn: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                    <input type="date" value={editData.checkOut} onChange={e => setEditData({ ...editData, checkOut: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(booking.bookingType === 'monthly' || booking.bed)
                    ? 'PG booking — payment collected monthly regardless of total duration'
                    : 'Hotel booking — payment collected daily regardless of total duration'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input type="number" value={editData.totalAmount} onChange={e => setEditData({ ...editData, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Already Paid Amount</label>
                  <input type="number" value={editData.paidAmount} onChange={e => setEditData({ ...editData, paidAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select value={editData.paymentStatus} onChange={e => setEditData({ ...editData, paymentStatus: e.target.value as 'pending' | 'partial' | 'paid' | 'refunded' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500">
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea value={editData.specialRequests} onChange={e => setEditData({ ...editData, specialRequests: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel Edit</button>
                <button onClick={handleUpdateBooking} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <>
              {/* Guest Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Guest Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-base font-medium text-gray-900">{booking.user?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-base font-medium text-gray-900">{booking.user?.email || booking.contactInfo?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">{booking.user?.phone || booking.contactInfo?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Number of Guests</p>
                    <p className="text-base font-medium text-gray-900">{booking.guests}</p>
                  </div>
                </div>
              </div>

              {/* Room Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Room Information</h3>
                  {isActive && (
                    <button
                      onClick={() => setShowRoomChangeModal(true)}
                      className="text-sm bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Change Room / Bed
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Room Number</p>
                    <p className="text-base font-medium text-gray-900">{booking.room?.roomNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Floor</p>
                    <p className="text-base font-medium text-gray-900">Floor {booking.room?.floorNumber}</p>
                  </div>
                  {booking.bed && (
                    <div>
                      <p className="text-sm text-gray-600">Bed Number</p>
                      <p className="text-base font-medium text-gray-900">Bed {booking.bed.bedNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Current Status</p>
                    <p className="text-base font-medium text-gray-900 capitalize">
                      {booking.room?.currentStatus?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Booking Dates */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Check-in Date</p>
                    <p className="text-base font-medium text-gray-900">{formatDate(booking.checkIn)}</p>
                    {booking.actualCheckInTime && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Checked in: {formatDateTime(booking.actualCheckInTime)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-out Date</p>
                    <p className="text-base font-medium text-gray-900">{formatDate(booking.checkOut)}</p>
                    {booking.actualCheckOutTime && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Checked out: {formatDateTime(booking.actualCheckOutTime)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">₹{booking.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Collected</p>
                    <p className="text-lg font-semibold text-green-700">₹{alreadyPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className={`text-lg font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{outstanding.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-sm text-blue-700 font-medium">
                      {(booking.bookingType === 'monthly' || booking.bed)
                        ? `PG Monthly — Collect ₹${firstCollection.amount.toLocaleString()} per month (1st collection = 1 month)`
                        : `Hotel Daily — Collect ₹${firstCollection.amount.toLocaleString()} per day (1st collection = 1 day)`}
                    </p>
                  </div>
                  {booking.securityDeposit && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Security Deposit</p>
                        <p className="text-base font-medium text-gray-900">
                          ₹{booking.securityDeposit.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Deposit Status</p>
                        <p className="text-base font-medium text-gray-900 capitalize">
                          {booking.securityDeposit.status}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {booking.specialRequests && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Requests</h3>
                  <p className="text-base text-gray-700">{booking.specialRequests}</p>
                </div>
              )}
            </>
          )}

          {/* Check-in Form */}
          {showCheckInForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-in Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={securityDepositAmount}
                    onChange={(e) => setSecurityDepositAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                {securityDepositAmount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={securityDepositMethod}
                      onChange={(e) => setSecurityDepositMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="border-t border-blue-200 pt-4 mt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Payment Collection</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold">₹{booking.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Already Paid</p>
                      <p className="text-lg font-semibold text-green-600">₹{(parseFloat(booking.paidAmount?.toString() || '0')).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid Now
                      </label>
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as 'pending' | 'partial' | 'paid' | 'refunded')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Check-in'}
                  </button>
                  <button
                    onClick={() => setShowCheckInForm(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Check-out Form */}
          {showCheckOutForm && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-out Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    placeholder="Any additional notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCheckOut}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Check-out'}
                  </button>
                  <button
                    onClick={() => setShowCheckOutForm(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collect Payment Form */}
          {showCollectPaymentForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Collect Payment</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 bg-white rounded-lg p-3 border border-emerald-100">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-base font-bold text-gray-900">₹{booking.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Collected</p>
                    <p className="text-base font-bold text-green-700">₹{alreadyPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-base font-bold text-red-600">₹{outstanding.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-blue-700 font-medium">
                    Suggested collection ({firstCollection.label}): ₹{firstCollection.amount.toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCollectAmount(String(firstCollection.amount))}
                    className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    Use this amount
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Collect *</label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder={`e.g. ${firstCollection.amount}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Payment Status</label>
                    <select
                      value={collectPaymentStatus}
                      onChange={(e) => setCollectPaymentStatus(e.target.value as 'pending' | 'partial' | 'paid' | 'refunded')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                    >
                      <option value="partial">Partial</option>
                      <option value="paid">Fully Paid</option>
                      <option value="pending">Still Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="e.g. Cash received, UPI ref #..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCollectPayment}
                    disabled={loading || !collectAmount}
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Collection'}
                  </button>
                  <button
                    onClick={() => setShowCollectPaymentForm(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions — always visible */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {canCheckIn && (
                <button
                  onClick={() => { setShowCheckInForm(v => !v); setShowCheckOutForm(false); setShowCollectPaymentForm(false); }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${showCheckInForm ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {showCheckInForm ? 'Hide Check-in' : 'Check In'}
                </button>
              )}
              {canCheckOut && (
                <button
                  onClick={() => { setShowCheckOutForm(v => !v); setShowCheckInForm(false); setShowCollectPaymentForm(false); }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${showCheckOutForm ? 'bg-green-800' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {showCheckOutForm ? 'Hide Check-out' : 'Check Out'}
                </button>
              )}
              {canCollectPayment && (
                <button
                  onClick={() => { setShowCollectPaymentForm(v => !v); setShowCheckInForm(false); setShowCheckOutForm(false); }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${showCollectPaymentForm ? 'bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {showCollectPaymentForm ? 'Hide Payment' : `Collect Payment (₹${outstanding.toLocaleString()} due)`}
                </button>
              )}
              {isActive && !isEditing && (
                <button
                  onClick={() => setShowRoomChangeModal(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change Room
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Booking
                </button>
              )}
              {isActive && !isEditing && (
                <button
                  onClick={handleCancelBooking}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel Booking
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Room Change Modal */}
    {showRoomChangeModal && (
      <RoomChangeModal
        booking={booking}
        isOpen={showRoomChangeModal}
        onClose={() => setShowRoomChangeModal(false)}
        onRoomChanged={() => { setShowRoomChangeModal(false); onUpdate(); }}
      />
    )}
    </>
  );
};

export default BookingDetailModal;

