import { useState, useEffect } from 'react';
import {
  getPaymentSummary,
  getOverduePayments,
  type PaymentSummary,
  type OverduePayment,
} from '../services/paymentService';
import PaymentRecordModal from '../components/payments/PaymentRecordModal';

export default function PaymentDashboardPage() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'daysOverdue' | 'amount' | 'room'>('daysOverdue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [floorFilter, roomFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryData, overdueData] = await Promise.all([
        getPaymentSummary(),
        getOverduePayments({
          floor: floorFilter ? parseInt(floorFilter) : undefined,
          roomNumber: roomFilter || undefined,
        }),
      ]);

      setSummary(summaryData);
      setOverduePayments(overdueData.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'daysOverdue' | 'amount' | 'room') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedPayments = [...overduePayments].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'daysOverdue':
        comparison = a.daysOverdue - b.daysOverdue;
        break;
      case 'amount':
        comparison = parseFloat(a.amount.toString()) - parseFloat(b.amount.toString());
        break;
      case 'room':
        comparison = a.booking.room.roomNumber.localeCompare(b.booking.room.roomNumber);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleRecordPayment = (payment: OverduePayment) => {
    setSelectedBookingId(payment.bookingId);
    setSelectedBookingDetails({
      guestName: payment.booking.user.name,
      roomNumber: payment.booking.room.roomNumber,
      totalAmount: payment.amount,
      paidAmount: 0,
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchData();
    setSelectedBookingId(null);
    setSelectedBookingDetails(null);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading payment data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Payment Dashboard</h1>
        <button
          onClick={() => {
            setSelectedBookingId(null);
            setSelectedBookingDetails(null);
            setIsPaymentModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Record Payment
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Collected</p>
                <p className="text-3xl font-bold mt-2">₹{summary.totalCollected.toFixed(2)}</p>
                <p className="text-green-100 text-sm mt-1">{summary.collectedCount} payments</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-2">₹{summary.totalPending.toFixed(2)}</p>
                <p className="text-yellow-100 text-sm mt-1">{summary.pendingCount} payments</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Overdue</p>
                <p className="text-3xl font-bold mt-2">₹{summary.totalOverdue.toFixed(2)}</p>
                <p className="text-red-100 text-sm mt-1">{summary.overdueCount} payments</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Payments Section */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-800">Overdue Payments</h2>
            
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Filter by floor"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 text-gray-900"
              />
              <input
                type="text"
                placeholder="Filter by room"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('room')}
                >
                  Room {sortBy === 'room' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('daysOverdue')}
                >
                  Days Overdue {sortBy === 'daysOverdue' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No overdue payments found
                  </td>
                </tr>
              ) : (
                sortedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.booking.room.roomNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Floor {payment.booking.room.floorNumber}
                        {payment.bed && ` - Bed ${payment.bed.bedNumber}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.booking.user.name}
                      </div>
                      <div className="text-sm text-gray-500">{payment.booking.user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{parseFloat(payment.amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.daysOverdue > 30
                            ? 'bg-red-100 text-red-800'
                            : payment.daysOverdue > 7
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payment.daysOverdue} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRecordPayment(payment)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Record Modal */}
      {isPaymentModalOpen && (
        <PaymentRecordModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedBookingId(null);
            setSelectedBookingDetails(null);
          }}
          bookingId={selectedBookingId || ''}
          bookingDetails={selectedBookingDetails}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
