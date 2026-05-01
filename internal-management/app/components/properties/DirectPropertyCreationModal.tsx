import { useState, useEffect } from 'react';
import api from '../../services/api';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface DirectPropertyCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DirectPropertyCreationModal({
  isOpen,
  onClose,
  onSuccess
}: DirectPropertyCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    // Property details
    name: '',
    description: '',
    type: 'pg' as 'pg' | 'hostel' | 'hotel' | 'apartment',
    totalFloors: '',
    totalRooms: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    // Location
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    landmark: '',
    // Contact
    contactPhone: '',
    contactEmail: '',
    contactWhatsapp: '',
    // Amenities
    amenities: [] as string[],
    // Rules
    rules: [] as string[],
    // Owner selection
    ownerMode: 'existing' as 'existing' | 'new',
    existingOwnerId: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: ''
  });

  const availableAmenities = [
    'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv',
    'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
    'refrigerator', 'microwave', 'iron', 'heater', 'cctv',
    'power-backup', 'water-purifier', 'geyser', 'lift'
  ];

  const commonRules = [
    'No smoking inside rooms',
    'No pets allowed',
    'Visitors allowed till 10 PM',
    'Maintain silence after 11 PM',
    'ID proof mandatory at check-in',
    'No alcohol consumption in common areas'
  ];

  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen]);

  const loadOwners = async () => {
    try {
      setLoadingOwners(true);
      const response = await api.get('/api/internal/platform/owners', {
        params: { limit: 100 }
      });
      setOwners(response.data.data || []);
    } catch (err) {
      console.error('Error loading owners:', err);
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleRuleToggle = (rule: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter(r => r !== rule)
        : [...prev.rules, rule]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        totalFloors: formData.totalFloors ? parseInt(formData.totalFloors) : null,
        totalRooms: formData.totalRooms ? parseInt(formData.totalRooms) : null,
        checkInTime: formData.checkInTime || null,
        checkOutTime: formData.checkOutTime || null,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          landmark: formData.landmark
        },
        contactInfo: {
          phone: formData.contactPhone,
          email: formData.contactEmail,
          whatsapp: formData.contactWhatsapp
        },
        amenities: formData.amenities,
        rules: formData.rules,
        images: [],
        // Owner info
        existingOwnerId: formData.ownerMode === 'existing' ? formData.existingOwnerId : null,
        createNewOwner: formData.ownerMode === 'new',
        ownerName: formData.ownerMode === 'new' ? formData.ownerName : null,
        ownerEmail: formData.ownerMode === 'new' ? formData.ownerEmail : null,
        ownerPhone: formData.ownerMode === 'new' ? formData.ownerPhone : null
      };

      await api.post('/api/internal/properties/direct', payload);
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'pg',
      totalFloors: '',
      totalRooms: '',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      landmark: '',
      contactPhone: '',
      contactEmail: '',
      contactWhatsapp: '',
      amenities: [],
      rules: [],
      ownerMode: 'existing',
      existingOwnerId: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: ''
    });
    setError(null);
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(ownerSearchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(ownerSearchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Direct Property Creation</h2>
            <p className="text-blue-100 text-sm">Create property directly (bypasses lead workflow)</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {/* Property Owner Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Owner</h3>
              
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ownerMode"
                    value="existing"
                    checked={formData.ownerMode === 'existing'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Select Existing Owner
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ownerMode"
                    value="new"
                    checked={formData.ownerMode === 'new'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Create New Owner
                </label>
              </div>

              {formData.ownerMode === 'existing' ? (
                <div>
                  <input
                    type="text"
                    placeholder="Search owners by name or email..."
                    value={ownerSearchTerm}
                    onChange={(e) => setOwnerSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-gray-900"
                  />
                  <select
                    name="existingOwnerId"
                    value={formData.existingOwnerId}
                    onChange={handleInputChange}
                    required={formData.ownerMode === 'existing'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">Select an owner...</option>
                    {loadingOwners ? (
                      <option disabled>Loading owners...</option>
                    ) : (
                      filteredOwners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} ({owner.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      required={formData.ownerMode === 'new'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleInputChange}
                      required={formData.ownerMode === 'new'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Basic Property Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="e.g., Sunrise PG for Men"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="pg">PG</option>
                    <option value="hostel">Hostel</option>
                    <option value="hotel">Hotel</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Floors</label>
                  <input
                    type="number"
                    name="totalFloors"
                    value={formData.totalFloors}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Number of floors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Rooms</label>
                  <input
                    type="number"
                    name="totalRooms"
                    value={formData.totalRooms}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Number of rooms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                  <input
                    type="time"
                    name="checkInTime"
                    value={formData.checkInTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                  <input
                    type="time"
                    name="checkOutTime"
                    value={formData.checkOutTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Brief description of the property..."
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Pincode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Near landmark"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Contact phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Contact email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    name="contactWhatsapp"
                    value={formData.contactWhatsapp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="WhatsApp number"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {availableAmenities.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.amenities.includes(amenity)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {amenity.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Rules</h3>
              <div className="space-y-2">
                {commonRules.map(rule => (
                  <label key={rule} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.rules.includes(rule)}
                      onChange={() => handleRuleToggle(rule)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">{rule}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Property'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
