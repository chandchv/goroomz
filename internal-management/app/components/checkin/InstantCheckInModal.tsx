import { useState, useEffect } from 'react';
import { bookingService, type InstantCheckInData } from '../../services/bookingService';
import { guestService, type GuestProfile } from '../../services/guestService';
import IdVerificationSection, { type IdVerificationData, type IdType } from './IdVerificationSection';
import type { Room } from '../../services/roomService';

interface InstantCheckInModalProps {
  room: Room;
  selectedBedId?: string;
  propertyId: string;
  ownerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InstantCheckInModal({
  room,
  selectedBedId,
  propertyId,
  ownerId,
  onClose,
  onSuccess,
}: InstantCheckInModalProps) {
  // Guest information
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Duration
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [bookingType, setBookingType] = useState<'daily' | 'monthly'>('daily');

  // Security deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');

  // ID Verification
  const [idVerificationData, setIdVerificationData] = useState<IdVerificationData | null>(null);
  const [idVerificationValid, setIdVerificationValid] = useState(false);

  // Guest profile lookup
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [lookingUpGuest, setLookingUpGuest] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');

  // UI state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price calculation
  const [totalAmount, setTotalAmount] = useState(0);

  // Rates from room data
  const monthlyRate = (room as any).monthlyRate || (room as any).monthly_rate || 0;
  const dailyRate = (room as any).dailyRate || (room as any).daily_rate || room.price || 0;
  const hasBothRates = monthlyRate > 0 && dailyRate > 0;
  const isPgRoom = room.pricingType === 'per_bed' || room.pricingType === 'monthly' ||
    (room.sharingType as string) === '2_sharing' || (room.sharingType as string) === '3_sharing' ||
    (room.sharingType as string) === '4_sharing';

  const activeRate = bookingType === 'monthly' ? monthlyRate : dailyRate;
  const rateLabel = bookingType === 'monthly' ? '/month' : '/day';

  // Default to monthly if room has a monthly rate
  useEffect(() => {
    setBookingType(monthlyRate > 0 ? 'monthly' : 'daily');
  }, [room.id]);

  // Reset check-out date when booking type changes
  useEffect(() => {
    const d = new Date();
    if (bookingType === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCheckOutDate(d.toISOString().split('T')[0]);
  }, [bookingType]);

  // Recalculate total when dates or booking type changes
  useEffect(() => {
    if (!checkOutDate) return;
    const today = new Date();
    const checkout = new Date(checkOutDate);
    const days = Math.ceil((checkout.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return;
    if (bookingType === 'monthly' && monthlyRate > 0) {
      setTotalAmount(Math.max(1, Math.ceil(days / 30)) * monthlyRate);
    } else {
      setTotalAmount(Math.max(1, days) * dailyRate);
    }
  }, [checkOutDate, bookingType, monthlyRate, dailyRate]);

  // Lookup guest when phone changes
  useEffect(() => {
    const lookupGuest = async () => {
      if (guestPhone.length === 10) {
        setLookingUpGuest(true);
        try {
          const result = await guestService.lookupByPhone(guestPhone);
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
            // Pre-fill guest info
            if (result.data.name && !guestName) setGuestName(result.data.name);
            if (result.data.email && !guestEmail) setGuestEmail(result.data.email);
          } else {
            setGuestProfile(null);
          }
        } catch (err) {
          console.error('Error looking up guest:', err);
          setGuestProfile(null);
        } finally {
          setLookingUpGuest(false);
        }
      }
    };

    const debounce = setTimeout(lookupGuest, 500);
    return () => clearTimeout(debounce);
  }, [guestPhone]);

  const handleIdVerificationChange = (data: IdVerificationData, isValid: boolean) => {
    setIdVerificationData(data);
    setIdVerificationValid(isValid);
  };

  const validateForm = (): boolean => {
    if (!guestName.trim()) {
      setError('Guest name is required');
      return false;
    }
    if (!guestPhone || guestPhone.length !== 10) {
      setError('Valid 10-digit phone number is required');
      return false;
    }
    if (!checkOutDate) {
      setError('Check-out date is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateForm()) return;

    setProcessing(true);
    try {
      const data: InstantCheckInData = {
        roomId: room.id,
        bedId: selectedBedId,
        propertyId,
        ownerId,
        guestInfo: {
          name: guestName.trim(),
          phone: guestPhone,
          email: guestEmail.trim() || undefined,
          address: idVerificationData?.address,
          idType: idVerificationData?.idType,
          idNumber: idVerificationData?.idNumber,
        },
        checkOut: checkOutDate,
        guests,
        notes: notes.trim() || undefined,
      };

      // Add deposit if provided
      if (depositAmount && parseFloat(depositAmount) > 0) {
        data.deposit = {
          amount: parseFloat(depositAmount),
          method: depositMethod,
        };
      }

      await bookingService.instantCheckIn(data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete instant check-in');
    } finally {
      setProcessing(false);
    }
  };

  const isSharedRoom = room.sharingType && room.sharingType !== 'single';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-primary-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Instant Check-In</h2>
            <p className="text-sm text-gray-600">
              Room {room.roomNumber} - Floor {room.floorNumber}
              {isSharedRoom && selectedBedId && ' (Bed selected)'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Room Info + Booking Type Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-900">Room Details</p>
                <p className="text-lg font-bold text-blue-900 mt-1">Room {room.roomNumber}</p>
                {room.categoryName && <p className="text-sm text-blue-800">{room.categoryName}</p>}
                {room.sharingType && (
                  <p className="text-sm text-blue-700 capitalize">{room.sharingType.replace(/_/g, ' ')}</p>
                )}
              </div>
              <div className="text-right">
                {hasBothRates ? (
                  <>
                    <p className="text-lg font-bold text-blue-900">₹{activeRate.toLocaleString()}{rateLabel}</p>
                    <p className="text-xs text-blue-500">
                      {bookingType === 'monthly'
                        ? `Also ₹${dailyRate.toLocaleString()}/day`
                        : `Also ₹${monthlyRate.toLocaleString()}/month`}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-blue-900">₹{activeRate.toLocaleString()}{rateLabel}</p>
                )}
              </div>
            </div>

            {/* Booking type toggle — always shown, both options enabled when rates exist */}
            <div className="flex rounded-lg border border-blue-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setBookingType('daily')}
                disabled={dailyRate === 0}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  bookingType === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                Daily{dailyRate > 0 ? ` — ₹${dailyRate.toLocaleString()}/day` : ''}
              </button>
              <button
                type="button"
                onClick={() => setBookingType('monthly')}
                disabled={monthlyRate === 0}
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-blue-200 ${
                  bookingType === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                Monthly{monthlyRate > 0 ? ` — ₹${monthlyRate.toLocaleString()}/mo` : ''}
              </button>
            </div>
          </div>

          {/* Guest Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>

            {/* Returning Guest Banner */}
            {lookingUpGuest && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Looking up guest...
                </div>
              </div>
            )}

            {guestProfile && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Returning Guest</p>
                    <p className="text-sm text-green-800">
                      {guestProfile.totalStays} previous stay{guestProfile.totalStays !== 1 ? 's' : ''}
                      {guestProfile.idVerified && ' • ID verified'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit phone"
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* ID Verification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Verification</h3>
            <IdVerificationSection
              guestProfileId={guestProfile?.id}
              initialData={guestProfile ? {
                mode: guestProfile.idVerified ? 'upload' : 'manual',
                idType: guestProfile.idType,
                address: guestProfile.address,
              } : undefined}
              onVerificationChange={handleIdVerificationChange}
              disabled={processing}
            />
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stay Duration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Guests
                </label>
                <input
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Security Deposit */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Deposit (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="100"
                  disabled={processing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value as any)}
                  disabled={processing || !depositAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or notes..."
              rows={2}
              disabled={processing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
            />
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Price Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Room Rate</span>
                <span className="text-gray-900">₹{activeRate.toLocaleString()}{rateLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="text-gray-900">
                  {checkOutDate ? (() => {
                    const days = Math.ceil((new Date(checkOutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    if (bookingType === 'monthly') {
                      const months = Math.max(1, Math.ceil(days / 30));
                      return `${months} month${months !== 1 ? 's' : ''}`;
                    }
                    return `${Math.max(1, days)} day${days !== 1 ? 's' : ''}`;
                  })() : '—'}
                </span>
              </div>
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="text-gray-900">₹{parseFloat(depositAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-primary-600 text-lg">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3 z-10 mt-auto">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !guestName || !guestPhone || !checkOutDate}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : 'Complete Check-In'}
          </button>
        </div>
      </div>
    </div>
  );
}
