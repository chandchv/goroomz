import React, { useState, useEffect } from 'react';
import { bookingService, type CreateBookingData } from '../../services/bookingService';
import roomService, { type Room } from '../../services/roomService';
import { apiService } from '../../services/api';

interface CreateBookingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  propertyId?: string;
}

interface Bed {
  id: string;
  bedNumber: number;
  status: string;
  bookingId?: string;
}

const CreateBookingModal: React.FC<CreateBookingModalProps> = ({ onClose, onSuccess, propertyId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  
  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [bedId, setBedId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [propertyType, setPropertyType] = useState<'hotel' | 'pg'>('hotel');
  const [bookingType, setBookingType] = useState<'daily' | 'monthly'>('daily');
  const [depositAmount, setDepositAmount] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState('0');
  const [adjustmentType, setAdjustmentType] = useState<'discount' | 'surcharge'>('discount');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>('pending');
  const [paidAmount, setPaidAmount] = useState('');

  // Fetch rooms on mount or when propertyId changes
  useEffect(() => {
    fetchRooms();
  }, [propertyId]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      // Use property-specific room loading if propertyId is provided
      const roomsData = propertyId 
        ? await roomService.getRoomsByProperty(propertyId)
        : await roomService.getAllRooms();
      console.log('Fetched rooms data:', roomsData); // Debug log
      
      // Handle the case where roomsData might be the entire response object
      const roomsArray = Array.isArray(roomsData) ? roomsData : (roomsData.rooms || []);
      console.log('Rooms array:', roomsArray); // Debug log
      
      // Handle both camelCase and snake_case field names
      const normalizedRooms = roomsArray.map(room => ({
        ...room,
        roomNumber: room.roomNumber || room.room_number || 'N/A',
        floorNumber: room.floorNumber || room.floor_number || 0,
        currentStatus: room.currentStatus || room.current_status || room.status || 'unknown',
        sharingType: room.sharingType || room.sharing_type || 'single',
        totalBeds: room.totalBeds || room.total_beds || 1,
        occupiedBeds: room.occupiedBeds || 0,
        availableBeds: room.availableBeds || 0,
        price: room.price || room.dailyRate || 0,
        dailyRate: room.dailyRate || room.price || 0,
        monthlyRate: room.monthlyRate || (room.dailyRate || room.price || 0) * 30
      }));
      
      // Filter to show available rooms:
      // 1. Completely vacant rooms (clean or dirty)
      // 2. Shared rooms with available beds (partially occupied but has vacant beds)
      const availableRooms = normalizedRooms.filter(room => {
        console.log(`🏠 Room ${room.roomNumber}: status="${room.currentStatus}", sharing="${room.sharingType}"`);
        
        // Always include completely vacant rooms
        if (room.currentStatus === 'vacant_clean' || room.currentStatus === 'vacant_dirty') {
          return true;
        }
        
        // For occupied shared rooms, check if they have available beds
        if (room.currentStatus === 'occupied' && room.sharingType && room.sharingType !== 'single') {
          const totalBeds = room.totalBeds || 1;
          const occupiedBeds = room.occupiedBeds || 0;
          const availableBeds = totalBeds - occupiedBeds;
          
          console.log(`🛏️ Shared room ${room.roomNumber}: ${occupiedBeds}/${totalBeds} beds occupied, ${availableBeds} available`);
          
          // Include if there are available beds
          return availableBeds > 0;
        }
        
        return false;
      });
      
      console.log('Available rooms (including shared with vacant beds):', availableRooms); // Debug log
      setRooms(availableRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Get selected room details
  const selectedRoom = rooms.find(r => r.id === roomId);
  
  // Automatically detect property type based on room
  useEffect(() => {
    if (selectedRoom) {
      // If room has sharing type, it's a PG
      if (selectedRoom.sharingType) {
        setPropertyType('pg');
      } else {
        setPropertyType('hotel');
      }
    }
  }, [selectedRoom]);
  
  // Fetch beds when room is selected and it's a shared room
  useEffect(() => {
    console.log('🏠 Room selection changed:', { roomId, selectedRoom: selectedRoom?.roomNumber, sharingType: selectedRoom?.sharingType }); // Debug log
    
    if (roomId && selectedRoom?.sharingType) {
      console.log('✅ Fetching beds for shared room'); // Debug log
      fetchBedsForRoom(roomId);
    } else {
      console.log('❌ Not fetching beds:', { hasRoomId: !!roomId, hasSharingType: !!selectedRoom?.sharingType }); // Debug log
      setBeds([]);
      setBedId('');
    }
  }, [roomId, selectedRoom]);

  const fetchBedsForRoom = async (roomIdToFetch: string) => {
    try {
      setLoadingBeds(true);
      console.log('🛏️ Fetching beds for room:', roomIdToFetch); // Debug log
      
      const response = await apiService.getApi().get(`/api/internal/rooms/${roomIdToFetch}/beds`);
      
      console.log('📡 Beds API response status:', response.status); // Debug log
      console.log('📋 Fetched beds result:', response.data); // Debug log
      console.log('🛏️ Raw beds data:', response.data.data); // Debug log
      
      // Filter to only show vacant beds
      const vacantBeds = response.data.data ? response.data.data.filter((bed: Bed) => bed.status === 'vacant') : [];
      console.log('✅ Vacant beds after filtering:', vacantBeds); // Debug log
      setBeds(vacantBeds);
    } catch (err: any) {
      console.error('❌ Error fetching beds:', err);
      setError('Failed to load beds for this room');
      setBeds([]);
    } finally {
      setLoadingBeds(false);
    }
  };

  // Calculate price
  const calculatePrice = () => {
    if (!selectedRoom || !checkIn) return 0;
    
    let basePrice = 0;
    
    if (bookingType === 'daily') {
      // Daily booking: requires check-out date
      if (!checkOut) return 0;
      
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const duration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (duration <= 0) return 0;
      const dailyRate = selectedRoom.dailyRate || selectedRoom.price || 0;
      basePrice = dailyRate * duration;
    } else {
      // Monthly booking: use monthly rate
      const monthlyRate = selectedRoom.monthlyRate || (selectedRoom.dailyRate || selectedRoom.price || 0) * 30;
      
      if (checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const duration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const months = Math.ceil(duration / 30);
        basePrice = monthlyRate * months;
      } else {
        // Default to 1 month for ongoing rental
        basePrice = monthlyRate;
      }
    }
    
    // Apply price adjustment
    const adjustment = parseFloat(priceAdjustment) || 0;
    if (adjustmentType === 'discount') {
      return Math.max(0, basePrice - adjustment);
    } else {
      return basePrice + adjustment;
    }
  };

  const baseAmount = (() => {
    if (!selectedRoom || !checkIn) return 0;
    if (bookingType === 'daily') {
      if (!checkOut) return 0;
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const duration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      if (duration <= 0) return 0;
      return (selectedRoom.dailyRate || selectedRoom.price || 0) * duration;
    } else {
      const monthlyRate = selectedRoom.monthlyRate || (selectedRoom.dailyRate || selectedRoom.price || 0) * 30;
      if (checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const duration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const months = Math.ceil(duration / 30);
        return monthlyRate * months;
      }
      return monthlyRate;
    }
  })();

  const totalAmount = calculatePrice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!guestName || !guestEmail || !guestPhone || !roomId || !checkIn) {
      setError('Please fill in all required fields');
      return;
    }

    if (bookingType === 'daily' && !checkOut) {
      setError('Check-out date is required for daily bookings');
      return;
    }

    if (bookingType === 'monthly' && !depositAmount) {
      setError('Deposit amount is required for monthly PG bookings');
      return;
    }

    if (bookingType === 'monthly' && parseFloat(depositAmount) < 0) {
      setError('Deposit amount must be a positive number');
      return;
    }

    if (selectedRoom?.sharingType && !bedId) {
      setError('Please select a bed for shared room');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bookingData: CreateBookingData = {
        roomId,
        bedId: bedId || undefined,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut: checkOut || undefined,
        guests: parseInt(guests),
        totalAmount,
        specialRequests: specialRequests || undefined,
        paymentStatus,
        paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
        depositAmount: bookingType === 'monthly' && depositAmount ? parseFloat(depositAmount) : undefined,
      };

      await bookingService.createBooking(bookingData);
      onSuccess();
    } catch (err: any) {
      console.error('Create booking error:', err);
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Booking</h2>
            <p className="text-sm text-gray-600 mt-1">Create an offline booking for walk-in guests</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Booking Type Selection */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors ${bookingType === 'daily' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="bookingType"
                  value="daily"
                  checked={bookingType === 'daily'}
                  onChange={() => { setBookingType('daily'); setPropertyType('hotel'); }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Daily Booking</div>
                  <div className="text-xs text-gray-500">Hotel-style, per night</div>
                  {selectedRoom && (selectedRoom.dailyRate || selectedRoom.price) ? (
                    <div className="text-xs font-semibold text-blue-600 mt-0.5">
                      ₹{(selectedRoom.dailyRate || selectedRoom.price || 0).toLocaleString()}/day
                    </div>
                  ) : null}
                </div>
              </label>

              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors ${bookingType === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="bookingType"
                  value="monthly"
                  checked={bookingType === 'monthly'}
                  onChange={() => { setBookingType('monthly'); setPropertyType('pg'); }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Monthly Rental</div>
                  <div className="text-xs text-gray-500">PG-style, per month</div>
                  {selectedRoom?.monthlyRate ? (
                    <div className="text-xs font-semibold text-blue-600 mt-0.5">
                      ₹{selectedRoom.monthlyRate.toLocaleString()}/month
                    </div>
                  ) : null}
                </div>
              </label>
            </div>
          </div>

          {/* Guest Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Enter guest name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="guest@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="+91 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Guests
              </label>
              <input
                type="number"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          {/* Room Selection */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Room Selection</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room <span className="text-red-500">*</span>
              </label>
              {loadingRooms ? (
                <p className="text-sm text-gray-500">Loading rooms...</p>
              ) : (
                <select
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setBedId(''); // Reset bed selection when room changes
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - Floor {room.floorNumber}
                      {room.categoryName && ` - ${room.categoryName}`}
                      {room.sharingType && ` (${room.sharingType.replace('_', '-')})`}
                      {room.sharingType && room.sharingType !== 'single' && room.currentStatus === 'occupied' 
                        ? ` - ${room.totalBeds - room.occupiedBeds}/${room.totalBeds} beds available`
                        : room.currentStatus === 'occupied' 
                        ? ' - Partially Available'
                        : ''
                      }
                      {room.price && ` - ₹${room.price}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bed Selection for PG Shared Rooms */}
            {selectedRoom?.sharingType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bed <span className="text-red-500">*</span>
                </label>
                {loadingBeds ? (
                  <p className="text-sm text-gray-500">Loading beds...</p>
                ) : beds.length === 0 ? (
                  <p className="text-sm text-amber-600">No vacant beds available in this room</p>
                ) : (
                  <select
                    value={bedId}
                    onChange={(e) => setBedId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select a bed</option>
                    {beds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        Bed {bed.bedNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Booking Dates */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Dates</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            {bookingType === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for daily bookings
                </p>
              </div>
            )}

            {bookingType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for ongoing monthly rental. If specified, will calculate total months.
                </p>
              </div>
            )}
          </div>

          {/* Deposit Amount for PG Bookings */}
          {bookingType === 'monthly' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Security Deposit</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required={bookingType === 'monthly'}
                    min="0"
                    step="100"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="5000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Security deposit required for monthly PG rentals (typically 1-2 months rent)
                </p>
              </div>
            </div>
          )}

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Requests (Optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Any special requests or notes..."
            />
          </div>

          {/* Price Adjustment */}
          {selectedRoom && checkIn && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Price Adjustment</label>
              <div className="flex gap-3">
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as 'discount' | 'surcharge')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="discount">Discount</option>
                  <option value="surcharge">Surcharge</option>
                </select>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={priceAdjustment}
                    onChange={(e) => setPriceAdjustment(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Collection */}
          {selectedRoom && checkIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid Now
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => {
                        setPaidAmount(e.target.value);
                        if (parseFloat(e.target.value) >= totalAmount) {
                          setPaymentStatus('paid');
                        } else if (parseFloat(e.target.value) > 0) {
                          setPaymentStatus('partial');
                        } else {
                          setPaymentStatus('pending');
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as 'pending' | 'partial' | 'paid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Price Summary */}
          {selectedRoom && checkIn && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Base Price</span>
                <span>₹{baseAmount.toLocaleString()}</span>
              </div>
              {parseFloat(priceAdjustment) > 0 && (
                <div className={`flex justify-between items-center text-sm ${adjustmentType === 'discount' ? 'text-green-600' : 'text-orange-600'}`}>
                  <span>{adjustmentType === 'discount' ? 'Discount' : 'Surcharge'}</span>
                  <span>{adjustmentType === 'discount' ? '-' : '+'}₹{parseFloat(priceAdjustment).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</span>
              </div>
              {checkIn && (
                <p className="text-sm text-gray-600">
                  {bookingType === 'daily' && checkOut
                    ? `${Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} days`
                    : bookingType === 'monthly' && checkOut
                    ? `${Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                    : bookingType === 'monthly'
                    ? '1 month (ongoing rental)'
                    : 'Select dates to see duration'
                  }
                </p>
              )}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || loadingRooms}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBookingModal;

