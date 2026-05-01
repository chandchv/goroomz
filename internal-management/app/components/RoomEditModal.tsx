import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  sharingType?: string;
  totalBeds?: number;
  currentStatus: string;
  occupiedBeds?: number;
  availableBeds?: number;
  dailyRate?: number;
  monthlyRate?: number;
  description?: string;
  amenities?: string[];
  isActive?: boolean;
  pricingType?: string;
  categoryName?: string;
}

interface RoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  room: Room | null;
}

type Tab = 'details' | 'pricing' | 'availability' | 'amenities';

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'ac', label: 'AC' },
  { value: 'tv', label: 'TV' },
  { value: 'meals', label: 'Meals' },
  { value: 'parking', label: 'Parking' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'gym', label: 'Gym' },
  { value: 'security', label: 'Security' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'washing-machine', label: 'Washing Machine' },
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'iron', label: 'Iron' },
  { value: 'heater', label: 'Heater' },
  { value: 'cctv', label: 'CCTV' },
];

const STATUS_OPTIONS = [
  { value: 'vacant_clean', label: 'Vacant — Clean', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'vacant_dirty', label: 'Vacant — Dirty', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { value: 'occupied', label: 'Occupied', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'blocked', label: 'Blocked', color: 'text-gray-700 bg-gray-50 border-gray-200' },
];

const SHARING_OPTIONS = [
  { value: 'single', label: 'Single (1 bed)', beds: 1 },
  { value: '2_sharing', label: '2-Sharing (2 beds)', beds: 2 },
  { value: '3_sharing', label: '3-Sharing (3 beds)', beds: 3 },
  { value: 'quad', label: '4-Sharing (4 beds)', beds: 4 },
  { value: 'dormitory', label: 'Dormitory (6+ beds)', beds: 6 },
];

const RoomEditModal: React.FC<RoomEditModalProps> = ({ isOpen, onClose, onSuccess, room }) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dailyRate: '',
    monthlyRate: '',
    maxGuests: '1',
    sharingType: 'single',
    currentStatus: 'vacant_clean',
    amenities: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    if (room && isOpen) {
      setFormData({
        title: room.roomNumber || '',
        description: room.description || '',
        dailyRate: room.dailyRate ? String(room.dailyRate) : '',
        monthlyRate: room.monthlyRate ? String(room.monthlyRate) : '',
        maxGuests: String(room.totalBeds || 1),
        sharingType: room.sharingType || 'single',
        currentStatus: room.currentStatus || 'vacant_clean',
        amenities: room.amenities || [],
        isActive: room.isActive !== false,
      });
      setActiveTab('details');
      setError(null);
      setSuccessMsg(null);
      setConfirmDelete(false);
    }
  }, [room, isOpen]);

  const set = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleAmenity = (val: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(val)
        ? prev.amenities.filter(a => a !== val)
        : [...prev.amenities, val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setError(null);
    setSuccessMsg(null);

    if (!formData.title.trim()) { setError('Room number is required'); return; }
    if (!formData.description.trim()) { setError('Description is required'); return; }
    if (!formData.dailyRate && !formData.monthlyRate) {
      setError('At least one rate (daily or monthly) is required');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/api/internal/rooms/${room.id}`, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : undefined,
        maxGuests: parseInt(formData.maxGuests) || 1,
        sharingType: formData.sharingType,
        currentStatus: formData.currentStatus,
        amenities: formData.amenities,
        isActive: formData.isActive,
      });
      setSuccessMsg('Room updated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!room) return;
    try {
      setLoading(true);
      await api.delete(`/api/internal/rooms/${room.id}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to delete room');
      setConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !room) return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'details', label: 'Details', icon: '🏠' },
    { id: 'pricing', label: 'Pricing', icon: '₹' },
    { id: 'availability', label: 'Availability', icon: '📅' },
    { id: 'amenities', label: 'Amenities', icon: '✨' },
  ];

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === formData.currentStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Room {room.roomNumber}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Floor {room.floorNumber}
              {room.categoryName ? ` · ${room.categoryName}` : ''}
              {room.sharingType ? ` · ${room.sharingType.replace(/_/g, ' ')}` : ''}
            </p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Messages */}
        {(error || successMsg) && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
            successMsg ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {successMsg || error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="e.g. 101, A-201"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => set('description', e.target.value)}
                    rows={3}
                    placeholder="Describe the room — size, features, view..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sharing Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sharingType}
                      onChange={e => {
                        const opt = SHARING_OPTIONS.find(o => o.value === e.target.value);
                        set('sharingType', e.target.value);
                        if (opt) set('maxGuests', String(opt.beds));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {SHARING_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Beds / Max Guests
                    </label>
                    <input
                      type="number"
                      value={formData.maxGuests}
                      onChange={e => set('maxGuests', e.target.value)}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>
              </>
            )}

            {/* PRICING TAB */}
            {activeTab === 'pricing' && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
                  Set the rates for this room. You can offer daily, monthly, or both.
                  At least one rate is required.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        value={formData.dailyRate}
                        onChange={e => set('dailyRate', e.target.value)}
                        min="0"
                        step="1"
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Per day for short-term stays</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        value={formData.monthlyRate}
                        onChange={e => set('monthlyRate', e.target.value)}
                        min="0"
                        step="100"
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Per month for PG / long-term</p>
                  </div>
                </div>

                {/* Live preview */}
                {(formData.dailyRate || formData.monthlyRate) && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Rate Preview</p>
                    <div className="flex gap-6">
                      {formData.dailyRate && (
                        <div>
                          <span className="text-2xl font-bold text-gray-900">₹{parseFloat(formData.dailyRate).toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-1">/day</span>
                        </div>
                      )}
                      {formData.monthlyRate && (
                        <div>
                          <span className="text-2xl font-bold text-gray-900">₹{parseFloat(formData.monthlyRate).toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-1">/month</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* AVAILABILITY TAB */}
            {activeTab === 'availability' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Current Status</label>
                  <div className="grid grid-cols-1 gap-2">
                    {STATUS_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.currentStatus === opt.value
                            ? `${opt.color} border-current`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="currentStatus"
                          value={opt.value}
                          checked={formData.currentStatus === opt.value}
                          onChange={() => set('currentStatus', opt.value)}
                          className="sr-only"
                        />
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          opt.value === 'vacant_clean' ? 'bg-green-500' :
                          opt.value === 'vacant_dirty' ? 'bg-yellow-500' :
                          opt.value === 'occupied' ? 'bg-red-500' :
                          opt.value === 'maintenance' ? 'bg-orange-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium text-sm">{opt.label}</span>
                        {formData.currentStatus === opt.value && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Room Active</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Inactive rooms are hidden from bookings and the floor view
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set('isActive', !formData.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        formData.isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className={`mt-2 text-xs font-medium ${formData.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.isActive ? '✓ Room is active and visible' : '✗ Room is inactive and hidden'}
                  </div>
                </div>
              </>
            )}

            {/* AMENITIES TAB */}
            {activeTab === 'amenities' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-600">Select all amenities available in this room</p>
                  <span className="text-xs text-gray-400">{formData.amenities.length} selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITY_OPTIONS.map(opt => {
                    const selected = formData.amenities.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleAmenity(opt.value)}
                        className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {selected && <span className="mr-1.5">✓</span>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            {/* Delete */}
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
              >
                Delete Room
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">Confirm delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomEditModal;
