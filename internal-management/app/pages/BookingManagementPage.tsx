import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { bookingService, type Booking, type BookingFilters } from '../services/bookingService';
import BookingCard from '../components/bookings/BookingCard';
import BookingDetailModal from '../components/bookings/BookingDetailModal';
import CreateBookingModal from '../components/bookings/CreateBookingModal';
import PropertyIndicator from '../components/PropertyIndicator';
import { useSwipe } from '../hooks/useSwipe';
import { useSelectedProperty } from '../hooks/useSelectedProperty';

const BookingManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProperty, hasMultipleProperties } = useSelectedProperty();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, setFilters] = useState<BookingFilters>({
    page: 1,
    limit: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const tabs = [
    { id: 'all', label: 'All', count: null },
    { id: 'pending', label: 'Pending', count: null },
    { id: 'confirmed', label: 'Active', count: null },
    { id: 'completed', label: 'Completed', count: null },
    { id: 'cancelled', label: 'Cancelled', count: null },
  ];

  // Swipe gesture support for tab navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        handleTabChange(tabs[currentIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
      if (currentIndex > 0) {
        handleTabChange(tabs[currentIndex - 1].id);
      }
    },
    threshold: 50,
  });

  // Check URL parameters to auto-open create modal
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowCreateModal(true);
      // Remove the parameter from URL after opening modal
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterParams: BookingFilters = {
        ...filters,
        search: searchTerm || undefined,
        propertyId: selectedProperty?.id, // Add property filter
      };

      // Apply tab filter
      if (activeTab !== 'all') {
        filterParams.status = activeTab;
      }

      console.log('Fetching bookings with params:', filterParams); // Debug log
      const response = await bookingService.getBookings(filterParams);
      console.log('Bookings response:', response); // Debug log
      
      if (response && response.data) {
        setBookings(response.data);
        setTotalPages(response.pages || 1);
      } else {
        console.error('Invalid response structure:', response);
        setError('Invalid response from server');
        setBookings([]);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.message || 'Failed to fetch bookings');
      setBookings([]); // Ensure bookings is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab, filters.page, filters.bookingSource, filters.startDate, filters.endDate, selectedProperty?.id]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.page === 1) {
        fetchBookings();
      } else {
        setFilters({ ...filters, page: 1 });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters({ ...filters, page: 1 });
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  const handleBookingUpdate = () => {
    setSelectedBooking(null);
    fetchBookings();
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchBookings();
  };

  const handleSourceFilter = (source: string) => {
    setFilters({
      ...filters,
      bookingSource: filters.bookingSource === source ? undefined : source,
      page: 1,
    });
  };

  const handleDateRangeFilter = (startDate: string, endDate: string) => {
    setFilters({
      ...filters,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50" {...swipeHandlers}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Booking Management</h1>
              {hasMultipleProperties && <PropertyIndicator size="sm" />}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Manage all bookings, check-ins, and check-outs
              {selectedProperty && <span className="font-medium"> for {selectedProperty.name}</span>}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 flex items-center gap-2 text-sm sm:text-base min-h-touch w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 sm:px-6">
          <div className="flex space-x-4 sm:space-x-8 border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap min-h-touch ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full bg-gray-100 text-gray-600 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Swipe indicator for mobile */}
          <div className="md:hidden text-center py-1">
            <p className="text-xs text-gray-400">← Swipe to navigate →</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by guest name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-touch"
              />
              <svg
                className="absolute left-3 top-2.5 sm:top-3 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Booking Source Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSourceFilter('online')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-touch ${
                filters.bookingSource === 'online'
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => handleSourceFilter('offline')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.bookingSource === 'offline'
                  ? 'bg-gray-100 text-gray-700 border-2 border-gray-500'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Offline
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleDateRangeFilter(e.target.value, filters.endDate || '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <span className="flex items-center text-gray-500">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleDateRangeFilter(filters.startDate || '', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Clear Filters */}
          {(filters.bookingSource || filters.startDate || filters.endDate || searchTerm) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        ) : (bookings && bookings.length === 0) ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filters.bookingSource || filters.startDate
                ? 'Try adjusting your filters'
                : 'Get started by creating a new booking'}
            </p>
          </div>
        ) : (
          <>
            {/* Bookings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(bookings || []).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onClick={handleBookingClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(totalPages, (filters.page || 1) + 1) })}
                  disabled={filters.page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={handleCloseModal}
          onUpdate={handleBookingUpdate}
        />
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <CreateBookingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          propertyId={selectedProperty?.id}
        />
      )}
    </div>
  );
};

export default BookingManagementPage;

