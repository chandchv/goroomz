import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { depositService, type SecurityDeposit, type DepositFilters } from '../services/depositService';

export default function SecurityDepositPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [deposits, setDeposits] = useState<SecurityDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState<DepositFilters>({
    status: searchParams.get('status') || '',
    paymentMethod: searchParams.get('paymentMethod') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20
  });

  // Individual deposit lookup
  const [showLookup, setShowLookup] = useState(false);
  const [lookupBookingId, setLookupBookingId] = useState('');
  const [lookupDeposit, setLookupDeposit] = useState<SecurityDeposit | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    fetchDeposits();
  }, [filters.page]);

  const fetchDeposits = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await depositService.getAllDeposits(filters);
      setDeposits(response.data);
      setTotalCount(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.pages);
    } catch (err: any) {
      console.error('Error fetching deposits:', err);
      setError(err.response?.data?.message || 'Failed to fetch deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<DepositFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (updatedFilters.status) params.set('status', updatedFilters.status);
    if (updatedFilters.paymentMethod) params.set('paymentMethod', updatedFilters.paymentMethod);
    if (updatedFilters.search) params.set('search', updatedFilters.search);
    if (updatedFilters.page && updatedFilters.page > 1) params.set('page', updatedFilters.page.toString());
    
    setSearchParams(params);
    fetchDeposits();
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleLookupDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupBookingId.trim()) {
      setLookupError('Please enter a booking ID');
      return;
    }

    setLookupLoading(true);
    setLookupError('');

    try {
      const deposit = await depositService.getDepositByBookingId(lookupBookingId.trim());
      setLookupDeposit(deposit);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setLookupError('No security deposit found for this booking');
      } else {
        setLookupError(err.response?.data?.message || 'Failed to fetch security deposit');
      }
      setLookupDeposit(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected':
        return 'bg-blue-100 text-blue-800';
      case 'refunded':
        return 'bg-green-100 text-green-800';
      case 'partially_refunded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'card':
        return 'bg-blue-100 text-blue-800';
      case 'upi':
        return 'bg-purple-100 text-purple-800';
      case 'bank_transfer':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Security Deposits</h1>
          <p className="text-gray-600 mt-1">Manage all security deposits and refunds</p>
        </div>
        <button
          onClick={() => setShowLookup(!showLookup)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showLookup ? 'Hide Lookup' : 'Lookup by Booking ID'}
        </button>
      </div>

      {/* Individual Deposit Lookup */}
      {showLookup && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Lookup Deposit by Booking ID</h2>
          <form onSubmit={handleLookupDeposit} className="flex gap-3 mb-4">
            <input
              type="text"
              value={lookupBookingId}
              onChange={(e) => setLookupBookingId(e.target.value)}
              placeholder="Enter Booking ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={lookupLoading}
            >
              {lookupLoading ? 'Loading...' : 'Search'}
            </button>
          </form>

          {lookupError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
              {lookupError}
            </div>
          )}

          {lookupDeposit && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">₹{(lookupDeposit.amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lookupDeposit.status)}`}>
                    {lookupDeposit.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(lookupDeposit.paymentMethod)}`}>
                    {lookupDeposit.paymentMethod.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Collected Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(lookupDeposit.collectedDate)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="collected">Collected</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={filters.paymentMethod || ''}
              onChange={(e) => handleFilterChange({ paymentMethod: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
              placeholder="Guest name, room number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20 });
                setSearchParams(new URLSearchParams());
                fetchDeposits();
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Deposits</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Collected</p>
              <p className="text-2xl font-bold text-green-600">
                {deposits.filter(d => d.status === 'collected').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Partially Refunded</p>
              <p className="text-2xl font-bold text-yellow-600">
                {deposits.filter(d => d.status === 'partially_refunded').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Refunded</p>
              <p className="text-2xl font-bold text-gray-600">
                {deposits.filter(d => d.status === 'refunded').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Deposits List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">All Security Deposits</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {deposits.length} of {totalCount} deposits
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading deposits...</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No deposits found</p>
            <p className="text-sm">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest & Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposit Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refund Info
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {deposit.booking?.user?.name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {deposit.booking?.user?.email || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Room {deposit.booking?.room?.roomNumber || 'N/A'} - Floor {deposit.booking?.room?.floorNumber || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-gray-900">
                          ID: {deposit.bookingId ? deposit.bookingId.slice(0, 8) + '...' : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {deposit.booking?.checkIn ? formatDate(deposit.booking.checkIn) : 'N/A'} - {deposit.booking?.checkOut ? formatDate(deposit.booking.checkOut) : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {deposit.booking?.guests || 0} guest{(deposit.booking?.guests || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          ₹{(deposit.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Booking: ₹{(deposit.booking?.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deposit.status)}`}>
                        {deposit.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(deposit.paymentMethod)}`}>
                        {deposit.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(deposit.collectedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deposit.refundAmount !== undefined && deposit.refundAmount !== null ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            ₹{deposit.refundAmount.toLocaleString()}
                          </p>
                          {deposit.refundDate && (
                            <p className="text-xs text-gray-500">
                              {formatDate(deposit.refundDate)}
                            </p>
                          )}
                          {deposit.deductions && deposit.deductions.length > 0 && (
                            <p className="text-xs text-red-600">
                              -{deposit.deductions.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()} deducted
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not refunded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
