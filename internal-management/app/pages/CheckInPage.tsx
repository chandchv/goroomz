import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { bookingService, type Booking } from '../services/bookingService';
import { depositService } from '../services/depositService';
import { guestService, type GuestProfile, type GuestAddress } from '../services/guestService';
import RoomChangeModal from '../components/bookings/RoomChangeModal';
import IdVerificationSection, { type IdVerificationData, type IdType } from '../components/checkin/IdVerificationSection';
import type { Room } from '../services/roomService';
import { useSelectedProperty } from '../hooks/useSelectedProperty';

export default function CheckInPage() {
  const navigate = useNavigate();
  const { selectedProperty } = useSelectedProperty();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'id' | 'name'>('id');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Pending check-ins list
  const [pendingCheckIns, setPendingCheckIns] = useState<Booking[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [bookingSourceFilter, setBookingSourceFilter] = useState<'all' | 'online' | 'offline' | 'walk_in'>('all');

  // Form state
  const [guestIdVerified, setGuestIdVerified] = useState(false);
  const [roomConfirmed, setRoomConfirmed] = useState(false);
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');
  const [securityDepositMethod, setSecurityDepositMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);

  // ID Verification state
  const [idVerificationData, setIdVerificationData] = useState<IdVerificationData | null>(null);
  const [idVerificationValid, setIdVerificationValid] = useState(false);
  
  // Guest profile lookup state
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [lookingUpGuest, setLookingUpGuest] = useState(false);
  const [guestLookupDone, setGuestLookupDone] = useState(false);

  // Fetch pending check-ins on mount and when property changes
  useEffect(() => {
    const fetchPendingCheckIns = async () => {
      setLoadingPending(true);
      try {
        // Fetch confirmed/pending bookings with check-in today or earlier (early check-ins)
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const response = await bookingService.getBookings({
          status: 'confirmed',
          endDate: today.toISOString().split('T')[0], // Check-in date <= today
          propertyId: selectedProperty?.id,
          limit: 50
        });
        
        // Filter for bookings that haven't been checked in yet (no actualCheckInTime)
        const pending = response.data.filter(b => !b.actualCheckInTime);
        setPendingCheckIns(pending);
      } catch (err) {
        console.error('Error fetching pending check-ins:', err);
      } finally {
        setLoadingPending(false);
      }
    };

    fetchPendingCheckIns();
  }, [selectedProperty?.id]);

  // Pre-populate security deposit fields when booking is loaded
  useEffect(() => {
    if (booking?.securityDeposit) {
      console.log('📋 Pre-populating security deposit from existing booking:', booking.securityDeposit);
      setSecurityDepositAmount(booking.securityDeposit.amount.toString());
      setSecurityDepositMethod(booking.securityDeposit.paymentMethod as any);
    } else {
      // Clear fields if no existing deposit
      setSecurityDepositAmount('');
      setSecurityDepositMethod('cash');
    }
  }, [booking]);

  // Lookup guest profile when booking is loaded
  useEffect(() => {
    if (booking && !guestLookupDone) {
      lookupGuestProfile();
    }
  }, [booking]);

  const lookupGuestProfile = async () => {
    if (!booking) return;
    
    const phone = booking.user?.phone || booking.contactInfo?.phone;
    if (!phone) {
      setGuestLookupDone(true);
      return;
    }
    
    setLookingUpGuest(true);
    try {
      const result = await guestService.lookupByPhone(phone);
      if (result.found && result.data) {
        setGuestProfile({
          id: result.data.id,
          name: result.data.name,
          email: result.data.email,
          phone: result.data.phone,
          address: result.data.address,
          idType: result.data.idType as IdType,
          idVerified: result.data.idVerified,
          totalStays: result.data.totalStays,
          lastStayDate: result.data.lastStayDate,
          createdAt: '',
          updatedAt: '',
        });
      }
    } catch (error) {
      console.error('Error looking up guest:', error);
    } finally {
      setLookingUpGuest(false);
      setGuestLookupDone(true);
    }
  };

  const handleIdVerificationChange = (data: IdVerificationData, isValid: boolean) => {
    setIdVerificationData(data);
    setIdVerificationValid(isValid);
    // Auto-check the verification checkbox if valid
    if (isValid && !guestIdVerified) {
      setGuestIdVerified(true);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a booking ID or guest name');
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);

    try {
      if (searchType === 'id') {
        // Search by booking ID
        const foundBooking = await bookingService.getBookingById(searchQuery.trim());
        setBooking(foundBooking);
        setCurrentBooking(foundBooking);
      } else {
        // Search by guest name
        const response = await bookingService.getBookings({
          search: searchQuery.trim(),
          status: 'confirmed',
          limit: 10,
        });

        if (response.data.length === 0) {
          setError('No confirmed bookings found for this guest name');
        } else if (response.data.length === 1) {
          const foundBooking = response.data[0];
          setBooking(foundBooking);
          setCurrentBooking(foundBooking);
        } else {
          // Multiple bookings found - show selection
          setError(`Found ${response.data.length} bookings. Please use booking ID for specific selection.`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to find booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;

    if (!guestIdVerified) {
      setError('Please verify guest identity before check-in');
      return;
    }

    if (!roomConfirmed) {
      setError('Please confirm room assignment before check-in');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Process check-in
      const checkInData: any = {
        notes,
      };

      // Only add security deposit data if:
      // 1. Amount is provided and greater than 0
      // 2. No existing deposit exists, OR existing deposit has different amount/method
      if (securityDepositAmount && parseFloat(securityDepositAmount) > 0) {
        if (!booking.securityDeposit) {
          // No existing deposit - send new deposit data
          checkInData.securityDepositAmount = parseFloat(securityDepositAmount);
          checkInData.securityDepositMethod = securityDepositMethod;
        } else {
          // Existing deposit - only send if amount or method is different
          const existingAmount = booking.securityDeposit.amount;
          const existingMethod = booking.securityDeposit.paymentMethod;
          
          if (existingAmount !== parseFloat(securityDepositAmount) || 
              existingMethod !== securityDepositMethod) {
            checkInData.securityDepositAmount = parseFloat(securityDepositAmount);
            checkInData.securityDepositMethod = securityDepositMethod;
          }
        }
      }

      await bookingService.checkIn(booking.id, checkInData);

      // Show success message
      alert('Check-in completed successfully!');
      
      // Navigate back to bookings or dashboard
      navigate('/bookings');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete check-in');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoomChanged = (newRoom: Room) => {
    if (currentBooking) {
      // Update the current booking with new room information
      const updatedBooking = {
        ...currentBooking,
        roomId: newRoom.id,
        room: {
          id: newRoom.id,
          title: newRoom.roomNumber || newRoom.room_number || '',
          roomNumber: newRoom.roomNumber || newRoom.room_number || '',
          floorNumber: newRoom.floorNumber || newRoom.floor_number || 0,
          currentStatus: newRoom.currentStatus || newRoom.current_status || 'vacant_clean'
        }
      };
      
      setBooking(updatedBooking);
      setCurrentBooking(updatedBooking);
      setShowRoomChangeModal(false);
      
      // Show success message
      alert(`Room successfully changed to ${newRoom.roomNumber || newRoom.room_number}`);
    }
  };

  const isRoomOccupied = () => {
    if (!booking?.room) return false;
    const status = booking.room.currentStatus;
    if (status !== 'occupied') return false;

    // For shared/PG rooms, occupied just means some beds are taken — not necessarily all.
    const sharingType = booking.room.sharingType;
    const isShared = sharingType && sharingType !== 'single';
    if (isShared) return false; // backend validates actual bed availability

    return true; // single room that's occupied — block
  };

  const getCheckInStatus = (checkInDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { label: 'Late', color: 'bg-red-100 text-red-800', priority: 1 };
    } else if (diffDays === 0) {
      return { label: 'Today', color: 'bg-green-100 text-green-800', priority: 2 };
    } else {
      return { label: 'Early', color: 'bg-blue-100 text-blue-800', priority: 3 };
    }
  };

  const getBookingSourceDisplay = (source: string | undefined) => {
    switch (source) {
      case 'online':
        return { label: 'Online', color: 'bg-purple-100 text-purple-800', icon: '🌐' };
      case 'walk_in':
        return { label: 'Walk-in', color: 'bg-orange-100 text-orange-800', icon: '🚶' };
      case 'offline':
      default:
        return { label: 'Offline', color: 'bg-gray-100 text-gray-800', icon: '📞' };
    }
  };

  const selectBookingForCheckIn = (selectedBooking: Booking) => {
    setBooking(selectedBooking);
    setCurrentBooking(selectedBooking);
    setSearchQuery('');
    setError(null);
    setGuestIdVerified(false);
    setRoomConfirmed(false);
    setIdVerificationData(null);
    setIdVerificationValid(false);
    setGuestProfile(null);
    setGuestLookupDone(false);
  };

  // Sort and filter pending check-ins
  const sortedPendingCheckIns = [...pendingCheckIns]
    .filter(b => bookingSourceFilter === 'all' || b.bookingSource === bookingSourceFilter)
    .sort((a, b) => {
      const statusA = getCheckInStatus(a.checkIn);
      const statusB = getCheckInStatus(b.checkIn);
      return statusA.priority - statusB.priority;
    });

  const handleReset = () => {
    setSearchQuery('');
    setBooking(null);
    setCurrentBooking(null);
    setError(null);
    setGuestIdVerified(false);
    setRoomConfirmed(false);
    setSecurityDepositAmount('');
    setSecurityDepositMethod('cash');
    setNotes('');
    setShowRoomChangeModal(false);
    setIdVerificationData(null);
    setIdVerificationValid(false);
    setGuestProfile(null);
    setGuestLookupDone(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Guest Check-In</h1>
        <p className="text-gray-600 mt-2">Process guest arrival and room assignment</p>
      </div>

      {/* Pending Check-ins List */}
      {!booking && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Check-ins ({sortedPendingCheckIns.length})
            </h2>
            <div className="flex items-center gap-3">
              {/* Booking Source Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Source:</label>
                <select
                  value={bookingSourceFilter}
                  onChange={(e) => setBookingSourceFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="all">All Sources</option>
                  <option value="online">🌐 Online</option>
                  <option value="offline">📞 Offline</option>
                  <option value="walk_in">🚶 Walk-in</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setLoadingPending(true);
                  bookingService.getBookings({
                    status: 'confirmed',
                    endDate: new Date().toISOString().split('T')[0],
                    propertyId: selectedProperty?.id,
                    limit: 50
                  }).then(response => {
                    const pending = response.data.filter(b => !b.actualCheckInTime);
                    setPendingCheckIns(pending);
                  }).finally(() => setLoadingPending(false));
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingPending ? (
            <div className="text-center py-8 text-gray-500">Loading pending check-ins...</div>
          ) : sortedPendingCheckIns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No pending check-ins</p>
              <p className="text-sm mt-1">All guests have been checked in or no bookings scheduled</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPendingCheckIns.map((pendingBooking) => {
                    const status = getCheckInStatus(pendingBooking.checkIn);
                    const sourceDisplay = getBookingSourceDisplay(pendingBooking.bookingSource);
                    return (
                      <tr key={pendingBooking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${sourceDisplay.color}`}>
                            <span className="mr-1">{sourceDisplay.icon}</span>
                            {sourceDisplay.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {pendingBooking.user?.name || (pendingBooking.contactInfo as any)?.name || 'Guest'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pendingBooking.user?.phone || pendingBooking.contactInfo?.phone || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            Room {pendingBooking.room?.roomNumber || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Floor {pendingBooking.room?.floorNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(pendingBooking.checkIn).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{pendingBooking.totalAmount?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => selectBookingForCheckIn(pendingBooking)}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            Check In
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {booking ? 'Selected Booking' : 'Search for a Booking'}
        </h2>
        
        {!booking && (
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search By
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'id' | 'name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="id">Booking ID</option>
                <option value="name">Guest Name</option>
              </select>
            </div>

            <div className="flex-[2]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {searchType === 'id' ? 'Booking ID' : 'Guest Name'}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={searchType === 'id' ? 'Enter booking ID' : 'Enter guest name'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        )}

        {error && !booking && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Booking Details & Check-in Form */}
      {booking && (
        <div className="space-y-6">
          {/* Booking Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Booking ID</p>
                <p className="font-medium text-gray-900">{booking.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Source</p>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                  booking.bookingSource === 'online' 
                    ? 'bg-purple-100 text-purple-800' 
                    : booking.bookingSource === 'walk_in'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {booking.bookingSource === 'online' && <span className="mr-1">🌐</span>}
                  {booking.bookingSource === 'walk_in' && <span className="mr-1">🚶</span>}
                  {booking.bookingSource === 'offline' && <span className="mr-1">📞</span>}
                  {booking.bookingSource === 'online' ? 'Online' : 
                   booking.bookingSource === 'walk_in' ? 'Walk-in' : 'Offline'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guest Name</p>
                <p className="font-medium text-gray-900">{booking.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-medium text-gray-900">{booking.user?.phone || booking.contactInfo?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room</p>
                <p className="font-medium text-gray-900">
                  {booking.room?.roomNumber || 'N/A'} (Floor {booking.room?.floorNumber || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.checkIn).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium text-gray-900">₹{booking.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  booking.paymentStatus === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : booking.paymentStatus === 'partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {booking.paymentStatus === 'paid' ? 'Paid' : 
                   booking.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                </span>
              </div>
              {booking.securityDeposit && (
                <div>
                  <p className="text-sm text-gray-600">Security Deposit</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">₹{booking.securityDeposit.amount.toLocaleString()}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      booking.securityDeposit.status === 'collected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.securityDeposit.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {booking.specialRequests && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-900">Special Requests:</p>
                <p className="text-sm text-yellow-800 mt-1">{booking.specialRequests}</p>
              </div>
            )}
          </div>

          {/* Guest Verification */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Identity Verification</h2>
            
            {/* Returning Guest Banner */}
            {lookingUpGuest && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Looking up guest profile...
                </div>
              </div>
            )}

            {guestProfile && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-900">Returning Guest</h3>
                    <div className="mt-2 text-sm text-blue-800">
                      <p><strong>{guestProfile.name}</strong></p>
                      <p className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          {guestProfile.totalStays} previous stay{guestProfile.totalStays !== 1 ? 's' : ''}
                        </span>
                        {guestProfile.lastStayDate && (
                          <span className="text-blue-600">
                            Last visit: {new Date(guestProfile.lastStayDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      {guestProfile.idVerified && (
                        <p className="mt-1 flex items-center text-green-700">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ID previously verified ({guestService.getIdTypeLabel(guestProfile.idType || '')})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* ID Verification Section */}
            <IdVerificationSection
              guestProfileId={guestProfile?.id}
              bookingId={booking.id}
              initialData={guestProfile ? {
                mode: guestProfile.idVerified ? 'upload' : 'manual',
                idType: guestProfile.idType,
                address: guestProfile.address,
              } : undefined}
              onVerificationChange={handleIdVerificationChange}
              disabled={processing}
            />

            {/* Verification Confirmation */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="guestIdVerified"
                  checked={guestIdVerified}
                  onChange={(e) => setGuestIdVerified(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="guestIdVerified" className="ml-2 text-sm text-gray-700">
                  I have verified the guest's identity document matches the booking details
                </label>
              </div>

              {!idVerificationValid && guestIdVerified && (
                <p className="text-xs text-yellow-600 ml-6 mt-1">
                  ⚠️ Please complete ID verification above (upload ID or enter details manually)
                </p>
              )}
            </div>
          </div>

          {/* Room Assignment Confirmation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Assignment Confirmation</h2>
            
            <div className="space-y-4">
              {/* Room Status Warning */}
              {isRoomOccupied() && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-900">Room is currently occupied</p>
                      <p className="text-sm text-red-800 mt-1">
                        The assigned room appears to be occupied by another booking. Please change the room assignment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Assigned Room:</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                      Room {booking.room?.roomNumber} - Floor {booking.room?.floorNumber}
                    </p>
                    {booking.bed && (
                      <p className="text-sm text-blue-800 mt-1">Bed #{booking.bed.bedNumber}</p>
                    )}
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        isRoomOccupied()
                          ? 'bg-red-100 text-red-800'
                          : booking.room?.currentStatus === 'occupied'
                          ? 'bg-yellow-100 text-yellow-800'
                          : booking.room?.currentStatus === 'vacant_clean'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isRoomOccupied()
                          ? 'Fully Occupied'
                          : booking.room?.currentStatus === 'occupied'
                          ? 'Partially Occupied (beds available)'
                          : booking.room?.currentStatus === 'vacant_clean'
                          ? 'Available'
                          : 'Needs Cleaning'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRoomChangeModal(true)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Change Room
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="roomConfirmed"
                  checked={roomConfirmed}
                  onChange={(e) => setRoomConfirmed(e.target.checked)}
                  disabled={isRoomOccupied()}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
                />
                <label htmlFor="roomConfirmed" className={`ml-2 text-sm ${isRoomOccupied() ? 'text-gray-400' : 'text-gray-700'}`}>
                  I confirm the room is clean and ready for guest occupancy
                </label>
              </div>

              {isRoomOccupied() && (
                <p className="text-sm text-red-600 ml-6">
                  ⚠️ Cannot confirm occupied room. Please change to an available room first.
                </p>
              )}
            </div>
          </div>

          {/* Security Deposit */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Security Deposit {booking?.securityDeposit ? '(Already Collected)' : '(Optional)'}
            </h2>
            
            {/* Payment Already Completed Notice - Requirement 11.10 */}
            {booking?.paymentStatus === 'paid' && !booking?.securityDeposit && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-blue-900">Payment completed online</p>
                </div>
                <p className="text-sm text-blue-800">
                  This booking was paid online. Security deposit collection is optional.
                </p>
              </div>
            )}
            
            {booking?.securityDeposit && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-900">Security deposit already collected</p>
                </div>
                <div className="text-sm text-green-800">
                  <p>Amount: ₹{booking.securityDeposit.amount.toLocaleString()}</p>
                  <p>Method: {booking.securityDeposit.paymentMethod}</p>
                  <p>Collected: {new Date(booking.securityDeposit.collectedDate).toLocaleDateString()}</p>
                  {booking.securityDeposit.notes && (
                    <p>Notes: {booking.securityDeposit.notes}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  value={securityDepositAmount}
                  onChange={(e) => setSecurityDepositAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="100"
                  disabled={!!booking?.securityDeposit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 ${
                    booking?.securityDeposit ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                {booking?.securityDeposit && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using existing deposit amount
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={securityDepositMethod}
                  onChange={(e) => setSecurityDepositMethod(e.target.value as any)}
                  disabled={!!booking?.securityDeposit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 ${
                    booking?.securityDeposit ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the check-in..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleReset}
              disabled={processing}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              disabled={processing || !guestIdVerified || !roomConfirmed}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Processing...' : 'Complete Check-In'}
            </button>
          </div>
        </div>
      )}

      {/* Room Change Modal */}
      {showRoomChangeModal && currentBooking && (
        <RoomChangeModal
          booking={currentBooking}
          isOpen={showRoomChangeModal}
          onClose={() => setShowRoomChangeModal(false)}
          onRoomChanged={handleRoomChanged}
        />
      )}
    </div>
  );
}
