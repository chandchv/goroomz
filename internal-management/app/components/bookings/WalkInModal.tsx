/**
 * WalkInModal — Simplified one-screen walk-in check-in
 *
 * Designed for property owners/managers to quickly register a walk-in guest
 * directly from the floor view. Supports:
 *  - Instant check-in (today's date pre-filled)
 *  - Historical booking (past dates — for forgotten registrations)
 *  - Bed selection for sharing rooms
 *  - Monthly / daily booking type
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Bed {
  id: string;
  bedNumber: string;
  status: 'vacant' | 'occupied';
}

interface Room {
  id: string;
  roomNumber?: string;
  floorNumber?: number;
  sharingType?: string;
  totalBeds?: number;
  occupiedBeds?: number;
  dailyRate?: number;
  monthlyRate?: number;
  price?: number;
  propertyDetails?: any;
}

interface WalkInModalProps {
  room: Room;
  propertyId: string;
  ownerId?: string;
  preselectedBedId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const WalkInModal: React.FC<WalkInModalProps> = ({
  room,
  propertyId,
  ownerId,
  preselectedBedId,
  onClose,
  onSuccess,
}) => {
  const isSharing = !!(room.sharingType && room.sharingType !== 'single');
  const monthlyRate = room.monthlyRate || room.propertyDetails?.monthlyRate || 0;
  const dailyRate = room.dailyRate || room.propertyDetails?.dailyRate || room.price || 0;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [bookingType, setBookingType] = useState<'monthly' | 'daily'>(monthlyRate > 0 ? 'monthly' : 'daily');
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState('');
  const [selectedBedId, setSelectedBedId] = useState(preselectedBedId || '');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>('pending');
  const [paidAmount, setPaidAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);

  // ── Beds ────────────────────────────────────────────────────────────────────
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

  // ── Submit state ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load beds for sharing rooms
  useEffect(() => {
    if (!isSharing) return;
    setLoadingBeds(true);
    api.get(`/api/internal/rooms/${room.id}/beds`)
      .then(res => {
        const allBeds: Bed[] = res.data?.data || [];
        setBeds(allBeds);
        // Auto-select preselected or first vacant bed
        if (preselectedBedId) {
          setSelectedBedId(preselectedBedId);
        } else {
          const firstVacant = allBeds.find(b => b.status === 'vacant');
          if (firstVacant) setSelectedBedId(firstVacant.id);
        }
      })
      .catch(() => setBeds([]))
      .finally(() => setLoadingBeds(false));
  }, [room.id, isSharing, preselectedBedId]);

  // Auto-set checkout for monthly (1 month ahead) — but only as a suggestion, not required
  useEffect(() => {
    if (bookingType === 'monthly' && checkIn && !checkOut) {
      const d = new Date(checkIn);
      d.setMonth(d.getMonth() + 1);
      setCheckOut(d.toISOString().split('T')[0]);
    }
  }, [bookingType, checkIn]);

  // ── Price calculation ────────────────────────────────────────────────────────
  const totalAmount = (() => {
    if (!checkIn) return 0;
    if (bookingType === 'monthly') {
      // No checkout = open-ended, show 1 month as the first payment
      if (!checkOut) return monthlyRate;
      const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
      const months = Math.max(1, Math.ceil(days / 30));
      return monthlyRate * months;
    } else {
      if (!checkOut) return 0;
      const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
      return Math.max(0, days) * dailyRate;
    }
  })();

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!guestName.trim()) { setError('Guest name is required'); return; }
    if (!guestPhone.trim()) { setError('Phone number is required'); return; }
    if (!checkIn) { setError('Check-in date is required'); return; }
    if (bookingType === 'daily' && !checkOut) { setError('Check-out date is required for daily bookings'); return; }
    if (isSharing && !selectedBedId) { setError('Please select a bed'); return; }

    setSubmitting(true);
    try {
      const payload = {
        roomId: room.id,
        propertyId,
        ownerId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        checkIn,
        checkOut: checkOut || undefined,
        bookingType,
        bedId: selectedBedId || undefined,
        totalAmount,
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
        paymentStatus,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        specialRequests: notes.trim() || undefined,
        bookingSource: 'walk_in',
        isHistorical,
        guests: 1,
      };

      await api.post('/api/internal/bookings', payload);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const vacantBeds = beds.filter(b => b.status === 'vacant');
  const roomLabel = `Room ${room.roomNumber || room.id.slice(0, 6)}`;
  const sharingLabel = room.sharingType ? ` · ${room.sharingType.replace('_', '-')} sharing` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🚶 Walk-in Check-in</h2>
            <p className="text-sm text-gray-500">{roomLabel}{sharingLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Historical booking toggle ── */}
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-amber-900">Historical Booking</p>
              <p className="text-xs text-amber-700">Forgot to register? Use a past check-in date</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsHistorical(!isHistorical);
                if (!isHistorical) setCheckIn(''); // clear so user picks past date
                else setCheckIn(today());
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isHistorical ? 'bg-amber-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isHistorical ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* ── Booking type ── */}
          <div className="grid grid-cols-2 gap-2">
            {(['monthly', 'daily'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setBookingType(type)}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  bookingType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-200'
                }`}
              >
                {type === 'monthly' ? '📅 Monthly PG' : '🌙 Daily Stay'}
                {type === 'monthly' && monthlyRate > 0 && (
                  <span className="block text-xs font-normal mt-0.5">₹{monthlyRate.toLocaleString()}/mo</span>
                )}
                {type === 'daily' && dailyRate > 0 && (
                  <span className="block text-xs font-normal mt-0.5">₹{dailyRate.toLocaleString()}/day</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Guest info ── */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Guest Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* ── Bed selection (sharing rooms) ── */}
          {isSharing && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Select Bed <span className="text-red-500">*</span>
              </label>
              {loadingBeds ? (
                <p className="text-sm text-gray-400">Loading beds…</p>
              ) : vacantBeds.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ No vacant beds in this room
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {beds.map(bed => (
                    <button
                      key={bed.id}
                      type="button"
                      disabled={bed.status === 'occupied'}
                      onClick={() => setSelectedBedId(bed.id)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        bed.status === 'occupied'
                          ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                          : selectedBedId === bed.id
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-green-300'
                      }`}
                    >
                      🛏️ {bed.bedNumber}
                      <span className="block text-[10px] font-normal mt-0.5">
                        {bed.status === 'occupied' ? 'Occupied' : 'Vacant'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Dates ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Check-in Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                max={isHistorical ? today() : undefined}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {isHistorical && (
                <p className="text-[10px] text-amber-600 mt-1">Past dates allowed</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                {bookingType === 'monthly' ? 'Expected Move-out' : 'Check-out Date'}
                {bookingType === 'daily' && <span className="text-red-500"> *</span>}
                {bookingType === 'monthly' && (
                  <span className="ml-1 text-gray-400 font-normal normal-case">(optional)</span>
                )}
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                min={checkIn || undefined}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={bookingType === 'daily'}
              />
              {bookingType === 'monthly' && !checkOut && (
                <p className="text-[10px] text-blue-600 mt-1">Open-ended — tenant stays until notice</p>
              )}
              {bookingType === 'monthly' && checkOut && (
                <p className="text-[10px] text-gray-400 mt-1">
                  <button type="button" onClick={() => setCheckOut('')} className="text-red-400 hover:text-red-600 underline">
                    Clear (make open-ended)
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-700">
                  {bookingType === 'monthly' && !checkOut ? '1st Month Rent' : 'Total Amount'}
                </span>
                {bookingType === 'monthly' && !checkOut && (
                  <p className="text-[10px] text-blue-600">Open-ended tenancy — renews monthly</p>
                )}
              </div>
              <span className="text-xl font-bold text-blue-600">
                {totalAmount > 0 ? `₹${totalAmount.toLocaleString()}` : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Amount Paid Now
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={e => {
                      setPaidAmount(e.target.value);
                      const paid = parseFloat(e.target.value) || 0;
                      if (paid >= totalAmount && totalAmount > 0) setPaymentStatus('paid');
                      else if (paid > 0) setPaymentStatus('partial');
                      else setPaymentStatus('pending');
                    }}
                    min="0"
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid ✓</option>
                </select>
              </div>
            </div>

            {bookingType === 'monthly' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Security Deposit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    min="0"
                    placeholder="e.g. 10000"
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special notes…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isSharing && !selectedBedId && vacantBeds.length > 0)}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking in…
                </>
              ) : (
                <>✅ {isHistorical ? 'Register Historical Booking' : 'Check In Now'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WalkInModal;
