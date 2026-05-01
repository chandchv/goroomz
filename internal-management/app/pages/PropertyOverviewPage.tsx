import React, { useState, useEffect } from 'react';
import { useSelectedProperty } from '../hooks/useSelectedProperty';
import PropertyIndicator from '../components/PropertyIndicator';
import api from '../services/api';
import roomService, { type Room } from '../services/roomService';
import RoomEditModal from '../components/RoomEditModal';

interface PropertyLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

interface PropertyContactInfo {
  phone: string;
  email: string;
  website?: string;
}

interface PropertyImage {
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

interface PropertyDetails {
  id: string;
  name: string;
  description: string;
  type: 'pg' | 'hostel' | 'hotel' | 'apartment';
  location: PropertyLocation;
  contactInfo: PropertyContactInfo;
  amenities: string[];
  images: PropertyImage[];
  rules: string[];
  checkInTime: string;
  checkOutTime: string;
  totalFloors: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  isActive: boolean;
  isFeatured: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

const COMMON_AMENITIES = [
  'WiFi', 'AC', 'TV', 'Parking', 'Laundry', 'Kitchen', 'Gym', 'Swimming Pool',
  'Security', 'CCTV', 'Power Backup', 'Water Supply', 'Housekeeping', 'Meals',
  'Hot Water', 'Refrigerator', 'Microwave', 'Washing Machine', 'Iron', 'Balcony',
  'Garden', 'Terrace', 'Lift', 'Wheelchair Access', 'Pet Friendly'
];

const PropertyOverviewPage: React.FC = () => {
  const { selectedProperty, hasMultipleProperties, loading: propertyLoading } = useSelectedProperty();
  
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'amenities' | 'photos' | 'rules' | 'rooms'>('basic');
  
  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'occupied' | 'vacant_clean' | 'vacant_dirty'>('all');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // Form state for editing
  const [formData, setFormData] = useState<Partial<PropertyDetails>>({});
  const [newRule, setNewRule] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (propertyLoading) return;
    if (selectedProperty?.id) {
      loadPropertyDetails();
    } else if (!hasMultipleProperties) {
      setLoading(false);
      setError('No property found. Please contact support.');
    } else {
      setLoading(false);
    }
  }, [selectedProperty?.id, propertyLoading]);

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const propertyId = selectedProperty?.id;
      if (!propertyId) {
        setError('No property selected');
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/internal/properties/${propertyId}`);
      const data = response.data?.data;
      
      if (data) {
        const normalizedData: PropertyDetails = {
          id: data.id,
          name: data.name || '',
          description: data.description || '',
          type: data.type || 'hotel',
          location: {
            address: data.location?.address || '',
            city: data.location?.city || '',
            state: data.location?.state || '',
            country: data.location?.country || 'India',
            pincode: data.location?.pincode || '',
          },
          contactInfo: {
            phone: data.contactInfo?.phone || '',
            email: data.contactInfo?.email || '',
            website: data.contactInfo?.website || '',
          },
          amenities: Array.isArray(data.amenities) ? data.amenities : [],
          images: Array.isArray(data.images) ? data.images : [],
          rules: Array.isArray(data.rules) ? data.rules : [],
          checkInTime: data.checkInTime || '14:00',
          checkOutTime: data.checkOutTime || '11:00',
          totalFloors: data.totalFloors || 1,
          totalRooms: data.totalRooms || 0,
          occupiedRooms: data.occupiedRooms || 0,
          availableRooms: data.availableRooms || 0,
          occupancyRate: parseFloat(data.occupancyRate) || 0,
          isActive: data.isActive !== false,
          isFeatured: data.isFeatured === true,
          approvalStatus: data.approvalStatus || 'pending',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        };
        setProperty(normalizedData);
        setFormData(normalizedData);
      }
    } catch (err: any) {
      console.error('Error loading property details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      const propertyId = selectedProperty?.id;
      if (!propertyId) {
        setError('No property selected');
        return;
      }
      const response = await api.put(`/api/internal/properties/${propertyId}`, formData);
      if (response.data?.success) {
        setProperty(response.data.data);
        setFormData(response.data.data);
        setSuccessMessage('Property details saved successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save property details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(property || {});
    setIsEditing(false);
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLocationField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: { ...(prev.location || {} as PropertyLocation), [field]: value }
    }));
  };

  const updateContactField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...(prev.contactInfo || {} as PropertyContactInfo), [field]: value }
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = formData.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    updateFormField('amenities', newAmenities);
  };

  const addRule = () => {
    if (newRule.trim()) {
      updateFormField('rules', [...(formData.rules || []), newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    updateFormField('rules', (formData.rules || []).filter((_, i) => i !== index));
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      const currentImages = formData.images || [];
      updateFormField('images', [...currentImages, { url: newImageUrl.trim(), isPrimary: currentImages.length === 0 }]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    updateFormField('images', (formData.images || []).filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    const newImages = (formData.images || []).map((img, i) => ({ ...img, isPrimary: i === index }));
    updateFormField('images', newImages);
  };

  const handleImageFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const invalid = fileArray.filter(f => !allowed.includes(f.type));
    if (invalid.length > 0) { setUploadError('Only JPEG, PNG, GIF, and WebP images are allowed'); return; }
    const oversized = fileArray.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) { setUploadError('Each image must be under 5MB'); return; }

    setUploadingImages(true);
    setUploadError(null);

    try {
      const propertyId = selectedProperty?.id;
      const currentImages = property?.images || [];
      const formPayload = new FormData();
      if (currentImages.length === 0) formPayload.append('setFirstAsPrimary', 'true');
      fileArray.forEach(f => formPayload.append('images', f));

      const uploadRes = await api.post(
        `/api/internal/properties/${propertyId}/upload-images`,
        formPayload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (!uploadRes.data?.success) {
        setUploadError(uploadRes.data?.message || 'Upload failed');
        return;
      }

      const uploaded: PropertyImage[] = uploadRes.data.data;
      const newImages = [...currentImages, ...uploaded];

      // Persist the updated images list to the property
      const saveRes = await api.put(`/api/internal/properties/${propertyId}`, { images: newImages });
      if (saveRes.data?.success) {
        const updated = saveRes.data.data;
        setProperty(prev => prev ? { ...prev, images: updated.images || newImages } : prev);
        setFormData(prev => ({ ...prev, images: updated.images || newImages }));
        setSuccessMessage('Photos saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Still update local state even if save response is unexpected
        setProperty(prev => prev ? { ...prev, images: newImages } : prev);
        setFormData(prev => ({ ...prev, images: newImages }));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setUploadError(e.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const saveImages = async (newImages: PropertyImage[]) => {
    const propertyId = selectedProperty?.id;
    try {
      const res = await api.put(`/api/internal/properties/${propertyId}`, { images: newImages });
      if (res.data?.success) {
        const imgs = res.data.data?.images || newImages;
        setProperty(prev => prev ? { ...prev, images: imgs } : prev);
        setFormData(prev => ({ ...prev, images: imgs }));
      } else {
        setProperty(prev => prev ? { ...prev, images: newImages } : prev);
        setFormData(prev => ({ ...prev, images: newImages }));
      }
    } catch {
      setProperty(prev => prev ? { ...prev, images: newImages } : prev);
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  const addImageAndSave = async () => {
    if (!newImageUrl.trim()) return;
    const currentImages = property?.images || [];
    const newImages = [...currentImages, { url: newImageUrl.trim(), isPrimary: currentImages.length === 0 }];
    setNewImageUrl('');
    await saveImages(newImages);
  };

  const removeImageAndSave = async (index: number) => {
    const newImages = (property?.images || []).filter((_, i) => i !== index);
    await saveImages(newImages);
  };

  const setPrimaryImageAndSave = async (index: number) => {
    const newImages = (property?.images || []).map((img, i) => ({ ...img, isPrimary: i === index }));
    await saveImages(newImages);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleImageFileUpload(e.dataTransfer.files);
    }
  };

  // Resolve image URL — relative paths from the upload endpoint get the API base prepended
  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const formatPropertyType = (type: string) => {
    const types: Record<string, string> = { pg: 'PG', hostel: 'Hostel', hotel: 'Hotel', apartment: 'Apartment' };
    return types[type] || type;
  };

  const loadRooms = async () => {
    if (!selectedProperty?.id) return;
    setRoomsLoading(true);
    try {
      const data = await roomService.getRoomsByProperty(selectedProperty.id);
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-red-100 text-red-700 border-red-200';
      case 'vacant_clean': return 'bg-green-100 text-green-700 border-green-200';
      case 'vacant_dirty': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-red-500';
      case 'vacant_clean': return 'bg-green-500';
      case 'vacant_dirty': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Occupied';
      case 'vacant_clean': return 'Vacant / Clean';
      case 'vacant_dirty': return 'Vacant / Dirty';
      default: return status?.replace(/_/g, ' ') || 'Unknown';
    }
  };

  const getSharingLabel = (type: string) => {
    const map: Record<string, string> = {
      single: 'Single', '2_sharing': '2 Sharing', '3_sharing': '3 Sharing',
      '4_sharing': '4 Sharing', double: 'Double', triple: 'Triple', dormitory: 'Dorm'
    };
    return map[type] || type || 'Single';
  };

  // Loading state
  if (loading || propertyLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  // No property selected
  if (hasMultipleProperties && !selectedProperty) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Property</h2>
          <p className="text-gray-600">Please select a property from the header to view its details.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !property) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadPropertyDetails} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'amenities', label: 'Amenities', icon: '✨' },
    { id: 'photos', label: 'Photos', icon: '📷' },
    { id: 'rules', label: 'House Rules', icon: '📜' },
    { id: 'rooms', label: 'Rooms', icon: '🏠' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as typeof activeTab);
    if (tabId === 'rooms' && rooms.length === 0) {
      loadRooms();
    }
  };

  // Render display field (read-only)
  const DisplayField = ({ label, value, className = '' }: { label: string; value: string | number; className?: string }) => (
    <div className={className}>
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-gray-900">{value || <span className="text-gray-400 italic">Not set</span>}</div>
    </div>
  );

  return (
    <>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Details</h1>
            <p className="text-gray-600">View and manage your property information</p>
          </div>
          <div className="flex items-center gap-4">
            {hasMultipleProperties && <PropertyIndicator size="md" />}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{successMessage}</div>}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button
          onClick={() => { handleTabChange('rooms'); setRoomFilter('all'); }}
          className="bg-white p-4 rounded-lg shadow border text-left hover:shadow-md hover:border-gray-300 transition-all group"
        >
          <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{property?.totalRooms || 0}</div>
          <div className="text-sm text-gray-600">Total Rooms</div>
          <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View all →</div>
        </button>

        <button
          onClick={() => { handleTabChange('rooms'); setRoomFilter('occupied'); }}
          className="bg-white p-4 rounded-lg shadow border text-left hover:shadow-md hover:border-red-200 transition-all group"
        >
          <div className="text-2xl font-bold text-red-600">{property?.occupiedRooms || 0}</div>
          <div className="text-sm text-gray-600">Occupied</div>
          <div className="text-xs text-red-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View occupied →</div>
        </button>

        <button
          onClick={() => { handleTabChange('rooms'); setRoomFilter('vacant_clean'); }}
          className="bg-white p-4 rounded-lg shadow border text-left hover:shadow-md hover:border-green-200 transition-all group"
        >
          <div className="text-2xl font-bold text-green-600">{property?.availableRooms || 0}</div>
          <div className="text-sm text-gray-600">Available</div>
          <div className="text-xs text-green-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View available →</div>
        </button>

        <button
          onClick={() => handleTabChange('rooms')}
          className="bg-white p-4 rounded-lg shadow border text-left hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="text-2xl font-bold text-blue-600">{property?.occupancyRate || 0}%</div>
          <div className="text-sm text-gray-600">Occupancy</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(property?.occupancyRate || 0, 100)}%` }}
            />
          </div>
        </button>

        <div className={`bg-white p-4 rounded-lg shadow border ${property?.isActive ? 'border-green-100' : 'border-red-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full ${property?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className={`text-2xl font-bold ${property?.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {property?.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="text-sm text-gray-600">Status</div>
          <div className="text-xs text-gray-400 mt-1 capitalize">{property?.approvalStatus || ''}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow border p-6">
        {/* BASIC INFO TAB */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DisplayField label="Property Name" value={property?.name || ''} />
                <DisplayField label="Property Type" value={formatPropertyType(property?.type || '')} />
                <div className="md:col-span-2">
                  <DisplayField label="Description" value={property?.description || ''} />
                </div>
                <DisplayField label="Check-in Time" value={property?.checkInTime || ''} />
                <DisplayField label="Check-out Time" value={property?.checkOutTime || ''} />
                <DisplayField label="Total Floors" value={property?.totalFloors || 0} />
                <DisplayField label="Contact Phone" value={property?.contactInfo?.phone || ''} />
                <DisplayField label="Contact Email" value={property?.contactInfo?.email || ''} />
                <DisplayField label="Website" value={property?.contactInfo?.website || ''} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Name</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => updateFormField('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter property name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <select value={formData.type || 'hotel'} onChange={(e) => updateFormField('type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="pg">PG</option><option value="hostel">Hostel</option><option value="hotel">Hotel</option><option value="apartment">Apartment</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea value={formData.description || ''} onChange={(e) => updateFormField('description', e.target.value)} rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Describe your property..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                    <input type="time" value={formData.checkInTime || '14:00'} onChange={(e) => updateFormField('checkInTime', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                    <input type="time" value={formData.checkOutTime || '11:00'} onChange={(e) => updateFormField('checkOutTime', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Floors</label>
                    <input type="number" min="1" value={formData.totalFloors || 1} onChange={(e) => updateFormField('totalFloors', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                    <input type="tel" value={formData.contactInfo?.phone || ''} onChange={(e) => updateContactField('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                    <input type="email" value={formData.contactInfo?.email || ''} onChange={(e) => updateContactField('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="contact@property.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input type="url" value={formData.contactInfo?.website || ''} onChange={(e) => updateContactField('website', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://yourproperty.com" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOCATION TAB */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Address</h3>
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <DisplayField label="Street Address" value={property?.location?.address || ''} />
                </div>
                <DisplayField label="City" value={property?.location?.city || ''} />
                <DisplayField label="State" value={property?.location?.state || ''} />
                <DisplayField label="Country" value={property?.location?.country || ''} />
                <DisplayField label="Pincode" value={property?.location?.pincode || ''} />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input type="text" value={formData.location?.address || ''} onChange={(e) => updateLocationField('address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input type="text" value={formData.location?.city || ''} onChange={(e) => updateLocationField('city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bangalore" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input type="text" value={formData.location?.state || ''} onChange={(e) => updateLocationField('state', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Karnataka" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input type="text" value={formData.location?.country || 'India'} onChange={(e) => updateLocationField('country', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="India" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input type="text" value={formData.location?.pincode || ''} onChange={(e) => updateLocationField('pincode', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="560001" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AMENITIES TAB */}
        {activeTab === 'amenities' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
            {!isEditing ? (
              <div>
                {(property?.amenities || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {property?.amenities.map((amenity, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{amenity}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No amenities added yet</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Select the amenities available at your property</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {COMMON_AMENITIES.map(amenity => (
                    <button key={amenity} onClick={() => toggleAmenity(amenity)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        (formData.amenities || []).includes(amenity) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}>
                      {amenity}
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Selected: {(formData.amenities || []).length} amenities</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Property Photos</h3>
              <span className="text-sm text-gray-500">{(property?.images || []).length} photo{(property?.images || []).length !== 1 ? 's' : ''}</span>
            </div>

            {/* Upload zone — always visible */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input
                id="property-image-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => e.target.files && handleImageFileUpload(e.target.files)}
                disabled={uploadingImages}
              />
              {uploadingImages ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  <p className="text-blue-600 font-medium">Uploading photos...</p>
                </div>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-700 font-medium">Drag & drop photos here, or click to browse</p>
                  <p className="text-sm text-gray-500 mt-1">JPEG, PNG, GIF, WebP — up to 5MB each — multiple files supported</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); document.getElementById('property-image-input')?.click(); }}
                    className="mt-3 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 relative z-10"
                  >
                    Choose Photos
                  </button>
                </>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
              </div>
            )}

            {/* URL fallback */}
            <details className="text-sm">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-700 select-none">Or add by URL instead</summary>
              <div className="flex gap-3 mt-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addImageAndSave()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://example.com/photo.jpg"
                />
                <button onClick={addImageAndSave} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                  Add URL
                </button>
              </div>
            </details>

            {/* Photo grid */}
            {(property?.images || []).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(property?.images || []).map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={resolveImageUrl(image.url)}
                      alt={`Property ${index + 1}`}
                      className={`w-full h-40 object-cover rounded-lg border-2 ${image.isPrimary ? 'border-blue-500' : 'border-gray-200'}`}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Found'; }}
                    />
                    {image.isPrimary && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Primary</span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      {!image.isPrimary && (
                        <button
                          onClick={() => setPrimaryImageAndSave(index)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => removeImageAndSave(index)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No photos yet — upload some above to showcase your property.</p>
              </div>
            )}
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h3>
            {!isEditing ? (
              <div>
                {(property?.rules || []).length > 0 ? (
                  <ul className="space-y-2">
                    {property?.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span className="text-gray-700">{rule}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No house rules added yet</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex gap-4 mb-4">
                  <input type="text" value={newRule} onChange={(e) => setNewRule(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addRule()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter a house rule" />
                  <button onClick={addRule} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Rule</button>
                </div>
                <ul className="space-y-2">
                  {(formData.rules || []).map((rule, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{rule}</span>
                      <button onClick={() => removeRule(index)} className="text-red-600 hover:text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                {(formData.rules || []).length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No house rules added yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Rooms</h3>
              <button
                onClick={loadRooms}
                disabled={roomsLoading}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${roomsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { status: 'all' as const, label: 'All', count: rooms.length },
                { status: 'occupied' as const, label: 'Occupied', count: rooms.filter(r => (r.currentStatus || r.current_status) === 'occupied').length },
                { status: 'vacant_clean' as const, label: 'Vacant / Clean', count: rooms.filter(r => (r.currentStatus || r.current_status) === 'vacant_clean').length },
                { status: 'vacant_dirty' as const, label: 'Vacant / Dirty', count: rooms.filter(r => (r.currentStatus || r.current_status) === 'vacant_dirty').length },
              ].map(({ status, label, count }) => (
                <button
                  key={status}
                  onClick={() => setRoomFilter(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium transition-all ${
                    roomFilter === status
                      ? status === 'occupied' ? 'bg-red-100 border-red-400 text-red-700'
                        : status === 'vacant_clean' ? 'bg-green-100 border-green-400 text-green-700'
                        : status === 'vacant_dirty' ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                        : 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {status !== 'all' && <span className={`w-2 h-2 rounded-full ${getStatusDot(status)}`} />}
                  {label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${roomFilter === status ? 'bg-white bg-opacity-60' : 'bg-gray-100'}`}>{count}</span>
                </button>
              ))}
            </div>

            {roomsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
                <span className="text-gray-500">Loading rooms...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p className="text-gray-500">No rooms found for this property.</p>
              </div>
            ) : (() => {
              // Group rooms by floor, applying filter
              const filteredRooms = roomFilter === 'all'
                ? rooms
                : rooms.filter(r => (r.currentStatus || r.current_status) === roomFilter);

              if (filteredRooms.length === 0) {
                return (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-500">No rooms match the selected filter.</p>
                    <button onClick={() => setRoomFilter('all')} className="mt-2 text-sm text-blue-600 hover:underline">Clear filter</button>
                  </div>
                );
              }

              const floorMap = new Map<number, Room[]>();
              filteredRooms.forEach(room => {
                const floor = room.floorNumber ?? room.floor_number ?? 0;
                if (!floorMap.has(floor)) floorMap.set(floor, []);
                floorMap.get(floor)!.push(room);
              });
              const floors = Array.from(floorMap.entries()).sort(([a], [b]) => a - b);

              return (
                <div className="space-y-8">
                  {floors.map(([floorNum, floorRooms]) => (
                    <div key={floorNum}>
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Floor {floorNum}
                        </h4>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">{floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {floorRooms
                          .sort((a, b) => (a.roomNumber || a.room_number || '').localeCompare(b.roomNumber || b.room_number || '', undefined, { numeric: true }))
                          .map(room => {
                            const status = room.currentStatus || room.current_status || 'vacant_clean';
                            const roomNum = room.roomNumber || room.room_number || '—';
                            const sharing = room.sharingType || room.sharing_type;
                            const totalBeds = room.totalBeds || room.total_beds || 1;
                            const occupiedBeds = room.occupiedBeds || 0;
                            const dailyRate = (room as any).dailyRate || (room as any).daily_rate || 0;
                            const monthlyRate = (room as any).monthlyRate || (room as any).monthly_rate || room.price || 0;
                            const isSelected = selectedRoom?.id === room.id;

                            return (
                              <button
                                key={room.id}
                                onClick={() => setSelectedRoom(isSelected ? null : room)}
                                className={`relative p-3 rounded-xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : status === 'occupied'
                                    ? 'border-red-200 bg-red-50 hover:border-red-400'
                                    : status === 'vacant_dirty'
                                    ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-400'
                                    : 'border-green-200 bg-green-50 hover:border-green-400'
                                }`}
                              >
                                {/* Status dot */}
                                <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusDot(status)}`} />

                                {/* Room number */}
                                <div className="text-base font-bold text-gray-900 mb-1">{roomNum}</div>

                                {/* Sharing type */}
                                {sharing && (
                                  <div className="text-xs text-gray-500 mb-1">{getSharingLabel(sharing)}</div>
                                )}

                                {/* Beds */}
                                {totalBeds > 1 && (
                                  <div className="text-xs text-gray-500 mb-1">
                                    {occupiedBeds}/{totalBeds} beds
                                  </div>
                                )}

                                {/* Rates */}
                                {monthlyRate > 0 && (
                                  <div className="text-xs font-medium text-gray-700">
                                    ₹{monthlyRate.toLocaleString()}<span className="font-normal text-gray-400">/mo</span>
                                  </div>
                                )}
                                {dailyRate > 0 && (
                                  <div className="text-xs text-gray-500">
                                    ₹{dailyRate.toLocaleString()}<span className="text-gray-400">/day</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Room detail panel */}
            {selectedRoom && (() => {
              const status = selectedRoom.currentStatus || selectedRoom.current_status || 'vacant_clean';
              const roomNum = selectedRoom.roomNumber || selectedRoom.room_number || '—';
              const sharing = selectedRoom.sharingType || selectedRoom.sharing_type;
              const totalBeds = selectedRoom.totalBeds || selectedRoom.total_beds || 1;
              const occupiedBeds = selectedRoom.occupiedBeds || 0;
              const dailyRate = (selectedRoom as any).dailyRate || (selectedRoom as any).daily_rate || 0;
              const monthlyRate = (selectedRoom as any).monthlyRate || (selectedRoom as any).monthly_rate || selectedRoom.price || 0;

              return (
                <div className="mt-4 p-5 bg-white border-2 border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Room {roomNum}</h4>
                      <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`} />
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRoom(selectedRoom)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Room
                      </button>
                      <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Floor</p>
                      <p className="font-medium text-gray-900">{selectedRoom.floorNumber ?? selectedRoom.floor_number ?? '—'}</p>
                    </div>
                    {sharing && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Sharing</p>
                        <p className="font-medium text-gray-900">{getSharingLabel(sharing)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Beds</p>
                      <p className="font-medium text-gray-900">{occupiedBeds} / {totalBeds} occupied</p>
                    </div>
                    {monthlyRate > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Monthly Rate</p>
                        <p className="font-medium text-gray-900">₹{monthlyRate.toLocaleString()}</p>
                      </div>
                    )}
                    {dailyRate > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Daily Rate</p>
                        <p className="font-medium text-gray-900">₹{dailyRate.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-gray-500 text-xs mb-1">Amenities</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRoom.amenities.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>

    {/* Room Edit Modal */}
    {editingRoom && (
      <RoomEditModal
        isOpen={true}
        room={{
          id: editingRoom.id,
          roomNumber: editingRoom.roomNumber || editingRoom.room_number || '',
          floorNumber: editingRoom.floorNumber ?? editingRoom.floor_number ?? 0,
          sharingType: editingRoom.sharingType || editingRoom.sharing_type,
          totalBeds: editingRoom.totalBeds || editingRoom.total_beds,
          currentStatus: editingRoom.currentStatus || editingRoom.current_status || 'vacant_clean',
          occupiedBeds: editingRoom.occupiedBeds,
          availableBeds: undefined,
          dailyRate: (editingRoom as any).dailyRate || (editingRoom as any).daily_rate,
          monthlyRate: (editingRoom as any).monthlyRate || (editingRoom as any).monthly_rate,
          description: (editingRoom as any).description,
          amenities: editingRoom.amenities,
          isActive: editingRoom.isActive,
          pricingType: editingRoom.pricingType,
          categoryName: editingRoom.categoryName,
        }}
        onClose={() => setEditingRoom(null)}
        onSuccess={() => {
          setEditingRoom(null);
          setSelectedRoom(null);
          loadRooms();
        }}
      />
    )}
    </>
  );
};

export default PropertyOverviewPage;
