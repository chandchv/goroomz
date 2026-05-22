import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import api from '../services/api';
import BulkRoomCreationModal from '../components/BulkRoomCreationModal';
import WalkInModal from '../components/bookings/WalkInModal';
import RoomEditModal from '../components/RoomEditModal';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../contexts/AuthContext';

interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  sharingType: string;
  totalBeds: number;
  currentStatus: string;
  occupiedBeds: number;
  availableBeds: number;
  dailyRate?: number;
  monthlyRate?: number;
  description?: string;
}

interface Property {
  id: string;
  name: string;
  type: 'Hotel' | 'PG';
  address?: string;
  ownerId: string;
  title?: string;
  category?: string;
  location?: any;
  totalRooms: number;
  occupiedRooms: number;
  createdAt: string;
  updatedAt: string;
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { hasAdminAccess, hasManagerAccess, isAgent } = useRole();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkRoomModal, setShowBulkRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [walkInRoom, setWalkInRoom] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterSharing, setFilterSharing] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Property editing state
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [rawPropertyData, setRawPropertyData] = useState<any>(null);

  const isSuperuser = (user?.role as string) === 'superuser' || user?.role === 'admin' || user?.internalRole === 'superuser' || user?.internalRole === 'platform_admin';

  // Check if user has permission to add rooms
  // Agents, Regional Managers, Operations Managers, Platform Admins, and Superusers can add rooms
  const canAddRooms = isAgent() || hasManagerAccess() || hasAdminAccess();

  useEffect(() => {
    loadPropertyDetails();
  }, [propertyId]);

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load property details from the internal properties endpoint
      const propertyResponse = await api.get(`/api/internal/properties/${propertyId}`);
      
      if (!propertyResponse.data.success) {
        setError('Property not found or you don\'t have access to it.');
        setProperty(null);
        setRooms([]);
        return;
      }

      const propertyData = propertyResponse.data.data;
      setRawPropertyData(propertyData);
      
      // Get rooms for this property
      const roomsData = propertyData.rooms || [];

      // Calculate occupancy statistics
      const totalRooms = roomsData.length;
      const occupiedRooms = roomsData.filter((r: any) => r.currentStatus === 'occupied').length;

      setProperty({
        id: propertyData.id,
        name: propertyData.name || 'Unnamed Property',
        type: propertyData.type === 'hotel' ? 'Hotel' : 'PG',
        address: propertyData.location?.address,
        ownerId: propertyData.ownerId || '',
        title: propertyData.name,
        category: propertyData.category?.name,
        location: propertyData.location,
        totalRooms,
        occupiedRooms,
        createdAt: propertyData.createdAt || new Date().toISOString(),
        updatedAt: propertyData.updatedAt || new Date().toISOString()
      });

      // Map rooms data to the Room interface (handle both camelCase and snake_case)
      const mappedRooms = roomsData.map((room: any) => {
        // Parse property_details JSON if it exists
        let propertyDetails = {};
        try {
          if (room.property_details && typeof room.property_details === 'string') {
            propertyDetails = JSON.parse(room.property_details);
          } else if (room.property_details && typeof room.property_details === 'object') {
            propertyDetails = room.property_details;
          }
        } catch (e) {
          console.warn('Failed to parse property_details for room:', room.id);
        }

        return {
          id: room.id,
          roomNumber: room.roomNumber || room.room_number || room.title || 'N/A',
          floorNumber: Number(room.floorNumber || room.floor_number || (propertyDetails as any).floorNumber) || 0,
          sharingType: room.sharingType || room.sharing_type || 'single',
          totalBeds: Number(room.totalBeds || room.total_beds) || 1,
          currentStatus: room.currentStatus || room.current_status || 'vacant_clean',
          occupiedBeds: room.occupiedBeds || room.occupied_beds || 0,
          availableBeds: room.availableBeds || room.available_beds || (Number(room.totalBeds || room.total_beds) || 1),
          dailyRate: (propertyDetails as any).dailyRate || room.price || 0,
          monthlyRate: (propertyDetails as any).monthlyRate || 0,
          description: room.description || ''
        };
      });

      setRooms(mappedRooms);
    } catch (err: any) {
      setError(err.message || 'Failed to load property details');
      console.error('Error loading property:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRoomSuccess = () => {
    setShowBulkRoomModal(false);
    loadPropertyDetails();
  };

  const [uploadingImages, setUploadingImages] = useState(false);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `https://goroomz.in${url}`;
    return url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = editForm.images || [];
    if (currentImages.length + files.length > 10) {
      alert('Maximum 10 images allowed per property');
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await api.post(`/api/internal/properties/${propertyId}/upload-images`, formData, {
        headers: { 'Content-Type': undefined }
      } as any);

      if (response.data.success) {
        setEditForm((prev: any) => ({
          ...prev,
          images: [...(prev.images || []), ...response.data.data]
        }));
      }
    } catch (err: any) {
      alert('Failed to upload images: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleImageDelete = (index: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index)
    }));
  };

  const startEditingProperty = () => {
    if (!rawPropertyData) return;
    const metadata = rawPropertyData.metadata || {};
    const pgOptions = metadata.pgOptions || {};
    const sharingPrices = pgOptions.sharingPrices || {};
    const sharingDailyPrices = pgOptions.sharingDailyPrices || {};
    setEditForm({
      name: rawPropertyData.name || '',
      description: rawPropertyData.description || '',
      type: rawPropertyData.type || 'pg',
      address: rawPropertyData.location?.address || '',
      area: rawPropertyData.location?.area || '',
      city: rawPropertyData.location?.city || '',
      state: rawPropertyData.location?.state || '',
      country: rawPropertyData.location?.country || 'India',
      phone: rawPropertyData.contactInfo?.phone || rawPropertyData.contact_info?.phone || '',
      email: rawPropertyData.contactInfo?.email || rawPropertyData.contact_info?.email || '',
      amenities: (rawPropertyData.amenities || []).join(', '),
      images: rawPropertyData.images || [],
      isActive: rawPropertyData.isActive !== false && rawPropertyData.is_active !== false,
      isFeatured: rawPropertyData.isFeatured || rawPropertyData.is_featured || false,
      // Pricing
      priceSingle: sharingPrices.single || '',
      priceDouble: sharingPrices.double || '',
      priceTriple: sharingPrices.triple || '',
      priceQuad: sharingPrices.quad || '',
      dailySingle: sharingDailyPrices.single || '',
      dailyDouble: sharingDailyPrices.double || '',
      dailyTriple: sharingDailyPrices.triple || '',
      dailyQuad: sharingDailyPrices.quad || '',
      basePrice: pgOptions.basePrice || rawPropertyData.price || '',
      genderPreference: metadata.genderPreference || '',
    });
    setIsEditingProperty(true);
  };

  const savePropertyEdits = async () => {
    try {
      setSaving(true);

      // Build sharing prices from form
      const sharingPrices: any = {};
      const sharingDailyPrices: any = {};
      if (editForm.priceSingle) sharingPrices.single = Number(editForm.priceSingle);
      if (editForm.priceDouble) sharingPrices.double = Number(editForm.priceDouble);
      if (editForm.priceTriple) sharingPrices.triple = Number(editForm.priceTriple);
      if (editForm.priceQuad) sharingPrices.quad = Number(editForm.priceQuad);
      if (editForm.dailySingle) sharingDailyPrices.single = Number(editForm.dailySingle);
      if (editForm.dailyDouble) sharingDailyPrices.double = Number(editForm.dailyDouble);
      if (editForm.dailyTriple) sharingDailyPrices.triple = Number(editForm.dailyTriple);
      if (editForm.dailyQuad) sharingDailyPrices.quad = Number(editForm.dailyQuad);

      // Calculate base price (lowest sharing price)
      const allPrices = Object.values(sharingPrices).filter((p: any) => p > 0) as number[];
      const basePrice = editForm.basePrice ? Number(editForm.basePrice) : (allPrices.length > 0 ? Math.min(...allPrices) : 0);

      // Merge with existing metadata
      const existingMetadata = rawPropertyData.metadata || {};
      const updatedMetadata = {
        ...existingMetadata,
        genderPreference: editForm.genderPreference || existingMetadata.genderPreference,
        pgOptions: {
          ...(existingMetadata.pgOptions || {}),
          basePrice,
          sharingPrices,
          sharingDailyPrices,
        },
      };

      const updateData = {
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        location: {
          ...(rawPropertyData.location || {}),
          address: editForm.address,
          area: editForm.area,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
        },
        contactInfo: { phone: editForm.phone, email: editForm.email },
        amenities: editForm.amenities.split(',').map((a: string) => a.trim().toLowerCase()).filter(Boolean),
        images: editForm.images || [],
        is_active: editForm.isActive,
        is_featured: editForm.isFeatured,
        metadata: updatedMetadata,
      };

      await api.put(`/api/internal/platform/properties/${propertyId}`, updateData);
      setIsEditingProperty(false);
      loadPropertyDetails();
      alert('Property updated successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const togglePropertyStatus = async () => {
    if (!rawPropertyData) return;
    const currentlyActive = rawPropertyData.isActive !== false && rawPropertyData.is_active !== false;
    const newStatus = !currentlyActive;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} this property?`)) return;
    try {
      await api.put(`/api/internal/platform/properties/${propertyId}`, { 
        is_active: newStatus,
        isActive: newStatus 
      });
      loadPropertyDetails();
      alert(`Property ${action}d successfully!`);
    } catch (err: any) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteProperty = async () => {
    if (!window.confirm('⚠️ Are you sure you want to DELETE this property? This will permanently remove the property and all its rooms. This action CANNOT be undone.')) return;
    if (!window.confirm('This is your final confirmation. Type OK to proceed with deletion.')) return;
    try {
      await api.delete(`/api/internal/platform/properties/${propertyId}`);
      alert('Property deleted successfully.');
      navigate('/properties');
    } catch (err: any) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const approveProperty = async () => {
    if (!window.confirm('Approve this property? It will become visible on the public website.')) return;
    try {
      await api.put(`/api/internal/platform/properties/${propertyId}`, {
        is_active: true,
        approval_status: 'approved'
      });
      loadPropertyDetails();
      alert('Property approved and activated!');
    } catch (err: any) {
      alert('Failed to approve: ' + (err.response?.data?.message || err.message));
    }
  };

  const rejectProperty = async () => {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/api/internal/platform/properties/${propertyId}`, {
        is_active: false,
        approval_status: 'rejected'
      });
      loadPropertyDetails();
      alert('Property rejected.');
    } catch (err: any) {
      alert('Failed to reject: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setShowEditRoomModal(true);
  };

  const handleEditRoomSuccess = () => {
    setShowEditRoomModal(false);
    setSelectedRoom(null);
    loadPropertyDetails();
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/internal/rooms/${roomId}`);
      if (response.data.success) {
        alert('Room deleted successfully');
        loadPropertyDetails();
      } else {
        alert('Failed to delete room: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (filterFloor) {
      const roomNum = room.roomNumber || '';
      let roomFloorKey;
      if (roomNum.startsWith('G')) {
        roomFloorKey = `G${room.floorNumber}`;
      } else if (roomNum.startsWith('B')) {
        roomFloorKey = `B${room.floorNumber}`;
      } else {
        roomFloorKey = room.floorNumber?.toString();
      }
      if (roomFloorKey !== filterFloor) return false;
    }
    if (filterSharing && room.sharingType !== filterSharing) return false;
    if (filterStatus && room.currentStatus !== filterStatus) return false;
    return true;
  });

  // Group rooms by floor and sort rooms within each floor
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floorNumber || 0;
    const roomNum = room.roomNumber || '';
    
    // Determine floor display key based on room number format
    let floorKey;
    if (roomNum.startsWith('G')) {
      floorKey = `G${floor}`;
    } else if (roomNum.startsWith('B')) {
      floorKey = `B${floor}`;
    } else {
      floorKey = floor.toString();
    }
    
    if (!acc[floorKey]) acc[floorKey] = [];
    acc[floorKey].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  // Sort rooms within each floor by room number
  Object.keys(roomsByFloor).forEach(floorKey => {
    roomsByFloor[floorKey].sort((a, b) => {
      const aNum = parseInt(a.roomNumber.replace(/[GB]/g, '')) || 0;
      const bNum = parseInt(b.roomNumber.replace(/[GB]/g, '')) || 0;
      return aNum - bNum;
    });
  });

  // Sort floors: regular floors first (1, 2, 3...), then ground (G1, G2...), then basement (B1, B2...)
  const floors = Object.keys(roomsByFloor).sort((a, b) => {
    if (a.startsWith('B') && b.startsWith('B')) {
      return parseInt(a.substring(1)) - parseInt(b.substring(1));
    }
    if (a.startsWith('G') && b.startsWith('G')) {
      return parseInt(a.substring(1)) - parseInt(b.substring(1));
    }
    if (!isNaN(Number(a)) && !isNaN(Number(b))) {
      return Number(a) - Number(b);
    }
    // Mixed types: regular floors first, then ground, then basement
    if (!isNaN(Number(a)) && (b.startsWith('G') || b.startsWith('B'))) return -1;
    if ((a.startsWith('G') || a.startsWith('B')) && !isNaN(Number(b))) return 1;
    if (a.startsWith('G') && b.startsWith('B')) return -1;
    if (a.startsWith('B') && b.startsWith('G')) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-2 text-lg font-semibold">{error}</p>
          <p className="text-gray-500 text-sm">The property you're looking for could not be found or you don't have access to it.</p>
        </div>
        <button
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">Property not found</p>
        <button
          onClick={() => navigate('/properties')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/properties')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name || property.title}</h1>
            <p className="text-gray-600">
              {property.location?.city}, {property.location?.state} • {property.type || property.category}
            </p>
          </div>
          {canAddRooms && (
            <button
              onClick={() => setShowBulkRoomModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rooms
            </button>
          )}
        </div>
      </div>

      {/* Property Info / Edit Section (Superuser) */}
      {isSuperuser && rawPropertyData && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Property Information</h2>
            <div className="flex gap-2">
              {!isEditingProperty ? (
                <>
                  <button onClick={startEditingProperty} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    ✏️ Edit Property
                  </button>
                  {rawPropertyData.approvalStatus === 'pending' && (
                    <button onClick={approveProperty}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                      ✅ Approve
                    </button>
                  )}
                  {rawPropertyData.approvalStatus === 'pending' && (
                    <button onClick={rejectProperty}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">
                      ❌ Reject
                    </button>
                  )}
                  <button onClick={togglePropertyStatus}
                    className={`px-3 py-1.5 text-sm rounded ${rawPropertyData.is_active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {rawPropertyData.is_active !== false ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                  <button onClick={deleteProperty}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                    🗑️ Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditingProperty(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Cancel</button>
                  <button onClick={savePropertyEdits} disabled={saving} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="p-6">
            {isEditingProperty ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option value="pg">PG</option>
                    <option value="hotel">Hotel</option>
                    <option value="hostel">Hostel</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <input type="text" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
                  <input type="text" value={editForm.amenities} onChange={e => setEditForm({...editForm, amenities: e.target.value})}
                    placeholder="wifi, ac, tv, parking, meals, laundry, security, cctv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                </div>

                {/* Pricing Section */}
                <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">💰 Pricing (Monthly Rent)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Single Room (₹/month)</label>
                      <input type="number" value={editForm.priceSingle} onChange={e => setEditForm({...editForm, priceSingle: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Double Sharing (₹/month)</label>
                      <input type="number" value={editForm.priceDouble} onChange={e => setEditForm({...editForm, priceDouble: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Triple Sharing (₹/month)</label>
                      <input type="number" value={editForm.priceTriple} onChange={e => setEditForm({...editForm, priceTriple: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quad Sharing (₹/month)</label>
                      <input type="number" value={editForm.priceQuad} onChange={e => setEditForm({...editForm, priceQuad: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">📅 Daily Rates (optional)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Single (₹/day)</label>
                      <input type="number" value={editForm.dailySingle} onChange={e => setEditForm({...editForm, dailySingle: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Double (₹/day)</label>
                      <input type="number" value={editForm.dailyDouble} onChange={e => setEditForm({...editForm, dailyDouble: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Triple (₹/day)</label>
                      <input type="number" value={editForm.dailyTriple} onChange={e => setEditForm({...editForm, dailyTriple: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quad (₹/day)</label>
                      <input type="number" value={editForm.dailyQuad} onChange={e => setEditForm({...editForm, dailyQuad: e.target.value})}
                        placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (₹/month) — auto-calculated if empty</label>
                      <input type="number" value={editForm.basePrice} onChange={e => setEditForm({...editForm, basePrice: e.target.value})}
                        placeholder="Auto (lowest sharing price)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gender Preference</label>
                      <select value={editForm.genderPreference} onChange={e => setEditForm({...editForm, genderPreference: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm">
                        <option value="">Any / Co-ed</option>
                        <option value="male">Boys / Gents Only</option>
                        <option value="female">Girls / Ladies Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images ({(editForm.images || []).length}/10)</label>
                  {(editForm.images || []).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {editForm.images.map((img: any, idx: number) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={getImageUrl(img.url)}
                            alt={img.caption || `Image ${idx + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleImageDelete(idx)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className={`px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${uploadingImages ? 'bg-gray-300 text-gray-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}>
                      {uploadingImages ? 'Uploading...' : '📷 Upload Images'}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageUpload}
                        disabled={uploadingImages || (editForm.images || []).length >= 10}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-500">Max 5MB each. JPEG, PNG, GIF, WebP.</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.isFeatured} onChange={e => setEditForm({...editForm, isFeatured: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Featured</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{rawPropertyData.name}</span></div>
                <div><span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900 uppercase">{rawPropertyData.type}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`font-medium ${rawPropertyData.is_active !== false ? 'text-green-600' : 'text-red-600'}`}>{rawPropertyData.is_active !== false ? 'Active' : 'Inactive'}</span></div>
                <div><span className="text-gray-500">Approval:</span> <span className={`font-medium ${rawPropertyData.approvalStatus === 'approved' ? 'text-green-600' : rawPropertyData.approvalStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{rawPropertyData.approvalStatus === 'approved' ? '✅ Approved' : rawPropertyData.approvalStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}</span></div>
                <div><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{rawPropertyData.location?.address || '—'}</span></div>
                <div><span className="text-gray-500">Area:</span> <span className="font-medium text-gray-900">{rawPropertyData.location?.area || '—'}</span></div>
                <div><span className="text-gray-500">City:</span> <span className="font-medium text-gray-900">{rawPropertyData.location?.city || '—'}, {rawPropertyData.location?.state || ''}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{rawPropertyData.contactInfo?.phone || rawPropertyData.contact_info?.phone || '—'}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{rawPropertyData.contactInfo?.email || rawPropertyData.contact_info?.email || '—'}</span></div>
                <div><span className="text-gray-500">Featured:</span> <span className="font-medium text-gray-900">{rawPropertyData.isFeatured || rawPropertyData.is_featured ? 'Yes' : 'No'}</span></div>
                <div className="md:col-span-2 lg:col-span-3">
                  <span className="text-gray-500">Amenities:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {(rawPropertyData.amenities || []).length > 0
                      ? rawPropertyData.amenities.map((a: string) => (
                          <span key={a} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs mr-1 mb-1 capitalize">{a}</span>
                        ))
                      : '—'}
                  </span>
                </div>
                {rawPropertyData.description && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <span className="text-gray-500">Description:</span>
                    <p className="font-medium text-gray-900 mt-1">{rawPropertyData.description}</p>
                  </div>
                )}
                {/* Pricing in view mode */}
                {(() => {
                  const pgOpts = rawPropertyData.metadata?.pgOptions || {};
                  const sp = pgOpts.sharingPrices || {};
                  const dp = pgOpts.sharingDailyPrices || {};
                  const hasPricing = sp.single || sp.double || sp.triple || sp.quad || pgOpts.basePrice;
                  if (!hasPricing) return null;
                  return (
                    <div className="md:col-span-2 lg:col-span-3 border-t border-gray-100 pt-3 mt-2">
                      <span className="text-gray-500 font-medium">💰 Pricing:</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {sp.single > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-500">Single</div>
                            <div className="text-lg font-bold text-green-700">₹{Number(sp.single).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">/month</div>
                            {dp.single > 0 && <div className="text-xs text-blue-600 mt-1">₹{dp.single}/day</div>}
                          </div>
                        )}
                        {sp.double > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-500">Double</div>
                            <div className="text-lg font-bold text-blue-700">₹{Number(sp.double).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">/month</div>
                            {dp.double > 0 && <div className="text-xs text-blue-600 mt-1">₹{dp.double}/day</div>}
                          </div>
                        )}
                        {sp.triple > 0 && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-500">Triple</div>
                            <div className="text-lg font-bold text-purple-700">₹{Number(sp.triple).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">/month</div>
                            {dp.triple > 0 && <div className="text-xs text-blue-600 mt-1">₹{dp.triple}/day</div>}
                          </div>
                        )}
                        {sp.quad > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-500">Quad</div>
                            <div className="text-lg font-bold text-orange-700">₹{Number(sp.quad).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">/month</div>
                            {dp.quad > 0 && <div className="text-xs text-blue-600 mt-1">₹{dp.quad}/day</div>}
                          </div>
                        )}
                      </div>
                      {pgOpts.basePrice > 0 && (
                        <div className="mt-2 text-sm text-gray-600">Base Price: <span className="font-semibold text-gray-900">₹{Number(pgOpts.basePrice).toLocaleString()}/month</span></div>
                      )}
                      {rawPropertyData.metadata?.genderPreference && (
                        <div className="mt-1 text-sm text-gray-600">Gender: <span className="font-semibold text-gray-900 capitalize">{rawPropertyData.metadata.genderPreference === 'male' ? 'Boys/Gents Only' : rawPropertyData.metadata.genderPreference === 'female' ? 'Girls/Ladies Only' : 'Co-ed'}</span></div>
                      )}
                    </div>
                  );
                })()}
                {/* Images in view mode */}
                {(rawPropertyData.images || []).length > 0 && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <span className="text-gray-500">Images:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {rawPropertyData.images.map((img: any, idx: number) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={img.url?.startsWith('http') ? img.url : `https://goroomz.in${img.url}`}
                            alt={img.caption || `Image ${idx + 1}`}
                            className="w-full h-24 object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Rooms</div>
          <div className="text-3xl font-bold text-gray-900">{property.totalRooms}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupied</div>
          <div className="text-3xl font-bold text-gray-900">{property.occupiedRooms}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Available</div>
          <div className="text-3xl font-bold text-gray-900">
            {property.totalRooms - property.occupiedRooms}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupancy Rate</div>
          <div className="text-3xl font-bold text-gray-900">
            {property.totalRooms > 0 
              ? Math.round((property.occupiedRooms / property.totalRooms) * 100) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Floors</option>
            {floors.map(floorKey => {
              const floorDisplayName = floorKey.startsWith('G') 
                ? `Ground ${floorKey.substring(1)}` 
                : floorKey.startsWith('B') 
                  ? `Basement ${floorKey.substring(1)}`
                  : `Floor ${floorKey}`;
              return (
                <option key={floorKey} value={floorKey}>{floorDisplayName}</option>
              );
            })}
          </select>
          <select
            value={filterSharing}
            onChange={(e) => setFilterSharing(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Sharing Types</option>
            <option value="single">Single</option>
            <option value="double">2-Sharing</option>
            <option value="triple">3-Sharing</option>
            <option value="quad">4-Sharing</option>
            <option value="dormitory">Dormitory</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant_clean">Vacant Clean</option>
            <option value="vacant_dirty">Vacant Dirty</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Rooms by Floor */}
      {floors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-600 mb-4">No rooms added yet</p>
          {canAddRooms && (
            <button
              onClick={() => setShowBulkRoomModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Your First Rooms
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map(floorKey => {
            const floorDisplayName = floorKey.startsWith('G') 
              ? `Ground ${floorKey.substring(1)}` 
              : floorKey.startsWith('B') 
                ? `Basement ${floorKey.substring(1)}`
                : `Floor ${floorKey}`;
                
            return (
            <div key={floorKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {floorDisplayName} ({roomsByFloor[floorKey].length} rooms)
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roomsByFloor[floorKey].map(room => {
                    const occupancyPercentage = room.totalBeds > 0 
                      ? Math.round((room.occupiedBeds / room.totalBeds) * 100) 
                      : 0;
                    
                    return (
                      <div
                        key={room.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Room {room.roomNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {room.sharingType?.replace('_', '-') || 'N/A'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              room.currentStatus === 'occupied'
                                ? 'bg-red-100 text-red-800'
                                : room.currentStatus === 'vacant_clean'
                                ? 'bg-green-100 text-green-800'
                                : room.currentStatus === 'vacant_dirty'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {room.currentStatus?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-2">
                          <div className="flex justify-between">
                            <span>Total Beds:</span>
                            <span className="font-medium text-gray-900">{room.totalBeds || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Occupied:</span>
                            <span className="font-medium text-red-600">{room.occupiedBeds || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vacant:</span>
                            <span className="font-medium text-green-600">{room.availableBeds || 0}</span>
                          </div>
                          {room.dailyRate && room.dailyRate > 0 && (
                            <div className="flex justify-between">
                              <span>Daily Rate:</span>
                              <span className="font-medium text-blue-600">₹{room.dailyRate}</span>
                            </div>
                          )}
                          {room.monthlyRate && room.monthlyRate > 0 && (
                            <div className="flex justify-between">
                              <span>Monthly Rate:</span>
                              <span className="font-medium text-blue-600">₹{room.monthlyRate}</span>
                            </div>
                          )}
                        </div>
                        {/* Occupancy bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Occupancy</span>
                            <span className="font-medium">{occupancyPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                occupancyPercentage === 100 ? 'bg-red-500' :
                                occupancyPercentage >= 75 ? 'bg-orange-500' :
                                occupancyPercentage >= 50 ? 'bg-yellow-500' :
                                occupancyPercentage > 0 ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${occupancyPercentage}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          className="mt-2 w-full px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 mb-2"
                        >
                          View Details
                        </button>
                        {/* Walk-in check-in button — only for vacant/available rooms */}
                        {(room.currentStatus === 'vacant_clean' || room.currentStatus === 'vacant_dirty' ||
                          (room.currentStatus === 'occupied' && room.sharingType !== 'single' && room.availableBeds > 0)) && (
                          <button
                            onClick={() => setWalkInRoom(room)}
                            className="w-full px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 mb-2 flex items-center justify-center gap-1"
                          >
                            🚶 Walk-in Check-in
                          </button>
                        )}
                        {canAddRooms && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRoom(room)}
                              className="flex-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="flex-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Bulk Room Creation Modal */}
      {showBulkRoomModal && property && (
        <BulkRoomCreationModal
          isOpen={showBulkRoomModal}
          onClose={() => setShowBulkRoomModal(false)}
          property={property}
          onSuccess={handleBulkRoomSuccess}
        />
      )}

      {/* Room Edit Modal */}
      {showEditRoomModal && selectedRoom && (
        <RoomEditModal
          isOpen={showEditRoomModal}
          onClose={() => setShowEditRoomModal(false)}
          room={selectedRoom}
          onSuccess={handleEditRoomSuccess}
        />
      )}

      {/* Walk-in Check-in Modal */}
      {walkInRoom && rawPropertyData && (
        <WalkInModal
          room={walkInRoom}
          propertyId={rawPropertyData.id}
          ownerId={rawPropertyData.ownerId || rawPropertyData.owner_id}
          onClose={() => setWalkInRoom(null)}
          onSuccess={() => {
            setWalkInRoom(null);
            loadPropertyDetails();
            alert('Walk-in check-in registered successfully!');
          }}
        />
      )}
    </div>
  );
}
