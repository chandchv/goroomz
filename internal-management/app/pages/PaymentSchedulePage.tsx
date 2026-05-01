import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  getPaymentSchedule,
  type PaymentScheduleResponse,
  type PaymentSchedule,
} from '../services/paymentService';
import PaymentRecordModal from '../components/payments/PaymentRecordModal';

export default function PaymentSchedulePage() {
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');

  const [bookingId, setBookingId] = useState(bookingIdParam || '');
  const [scheduleData, setScheduleData] = useState<PaymentScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  useEffect(() => {
    if (bookingIdParam) {
      fetchSchedule(bookingIdParam);
    }
  }, [bookingIdParam]);

  const fetchSchedule = async (id: string) => {
    if (!id) {
      setError('Please enter a booking ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getPaymentSchedule(id);
      setScheduleData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payment schedule');
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchedule(bookingId);
  };

  const handleRecordPayment = (schedule: PaymentSchedule) => {
    setSelectedSchedule(schedule);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    if (bookingId) {
      fetchSchedule(bookingId);
    }
    setSelectedSchedule(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'overdue':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const upcomingPayments = scheduleData?.data.filter(
    (s) => s.status === 'pending' || s.status === 'overdue'
  );

  const paidPayments = scheduleData?.data.filter((s) => s.status === 'paid');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Payment Schedule (PG)</h1>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Enter Booking ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {scheduleData && (
        <>
          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Booking Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Guest Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scheduleData.booking.user.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scheduleData.booking.room.roomNumber} (Floor{' '}
                  {scheduleData.booking.room.floorNumber})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(scheduleData.booking.checkIn).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{scheduleData.booking.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Calendar View
            </button>
          </div>

          {/* Upcoming Due Dates */}
          {upcomingPayments && upcomingPayments.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Upcoming Due Dates ({upcomingPayments.length})
              </h2>
              <div className="space-y-3">
                {upcomingPayments.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-yellow-600">{getStatusIcon(schedule.status)}</div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Due: {new Date(schedule.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Amount: ₹{parseFloat(schedule.amount.toString()).toFixed(2)}
                          {schedule.bed && ` - Bed ${schedule.bed.bedNumber}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecordPayment(schedule)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Pay Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History Table */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scheduleData.data.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(schedule.dueDate).toLocaleDateString()}
                          {schedule.bed && (
                            <span className="ml-2 text-gray-500">
                              (Bed {schedule.bed.bedNumber})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₹{parseFloat(schedule.amount.toString()).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              schedule.status
                            )}`}
                          >
                            {getStatusIcon(schedule.status)}
                            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schedule.paidDate
                            ? new Date(schedule.paidDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schedule.payment?.paymentMethod
                            ? schedule.payment.paymentMethod.toUpperCase()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {schedule.status !== 'paid' && (
                            <button
                              onClick={() => handleRecordPayment(schedule)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Payment Calendar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleData.data.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-lg border-2 ${
                      schedule.status === 'paid'
                        ? 'bg-green-50 border-green-300'
                        : schedule.status === 'overdue'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(schedule.status)}
                        <span className="font-semibold text-gray-900">
                          {new Date(schedule.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                          schedule.status
                        )}`}
                      >
                        {schedule.status}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      ₹{parseFloat(schedule.amount.toString()).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Due: {new Date(schedule.dueDate).toLocaleDateString()}
                    </p>
                    {schedule.status === 'paid' ? (
                      <p className="text-sm text-green-600 font-medium">
                        Paid on {schedule.paidDate && new Date(schedule.paidDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleRecordPayment(schedule)}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Record Modal */}
      {isPaymentModalOpen && selectedSchedule && (
        <PaymentRecordModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedSchedule(null);
          }}
          bookingId={selectedSchedule.bookingId}
          bookingDetails={
            scheduleData
              ? {
                  guestName: scheduleData.booking.user.name,
                  roomNumber: scheduleData.booking.room.roomNumber,
                  totalAmount: parseFloat(selectedSchedule.amount.toString()),
                  paidAmount: 0,
                }
              : undefined
          }
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
