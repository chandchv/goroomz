import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Users,
  Building,
  DollarSign,
  Bed
} from 'lucide-react';
import apiService from '@/services/api';

const SHARING_TYPES = [
  { value: 'single', label: 'Single', beds: 1, color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🛏️' },
  { value: 'double', label: 'Double', beds: 2, color: 'bg-green-100 text-green-700 border-green-200', icon: '🛏️🛏️' },
  { value: 'triple', label: 'Triple', beds: 3, color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🛏️🛏️🛏️' },
  { value: 'four', label: 'Four', beds: 4, color: 'bg-red-100 text-red-700 border-red-200', icon: '🛏️🛏️🛏️🛏️' },
];

const AMENITIES_OPTIONS = [
  'AC', 'Attached Bathroom', 'Balcony', 'WiFi', 'Wardrobe',
  'Study Table', 'Geyser', 'Power Backup', 'CCTV', 'Laundry',
  'Parking', 'Fridge', 'TV', 'Cooler'
];

const STATUS_COLORS = {
  vacant_clean: 'bg-green-100 text-green-700',
  occupied: 'bg-blue-100 text-blue-700',
  vacant_dirty: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-red-100 text-red-700',
  reserved: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  vacant_clean: 'Vacant',
  occupied: 'Occupied',
  vacant_dirty: 'Needs Cleaning',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
};

const RoomManagement = ({ properties = [] }) => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    roomNumber: '',
    floorNumber: 1,
    sharingType: 'double',
    totalBeds: 2,
    monthlyRent: '',
    securityDeposit: '',
    amenities: [],
    propertyId: '',
    isActive: true,
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get('/rooms/owner/my-rooms');
      if (response.success) {
        setRooms(response.data || []);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      roomNumber: '',
      floorNumber: 1,
      sharingType: 'double',
      totalBeds: 2,
      monthlyRent: '',
      securityDeposit: '',
      amenities: [],
      propertyId: properties.length > 0 ? properties[0].id : '',
      isActive: true,
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber || '',
      floorNumber: room.propertyDetails?.floorNumber || 1,
      sharingType: room.pgOptions?.sharingType || 'double',
      totalBeds: room.maxGuests || 2,
      monthlyRent: room.pgOptions?.monthlyRent || room.price || '',
      securityDeposit: room.pgOptions?.securityDeposit || '',
      amenities: room.amenities || [],
      propertyId: room.propertyDetails?.propertyId || '',
      isActive: room.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSharingTypeChange = (type) => {
    const sharingConfig = SHARING_TYPES.find(s => s.value === type);
    setFormData(prev => ({
      ...prev,
      sharingType: type,
      totalBeds: sharingConfig?.beds || prev.totalBeds,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const getPropertyLocation = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property?.location) {
      return {
        city: property.location.city || 'Bangalore',
        state: property.location.state || 'Karnataka',
        area: property.location.area || property.location.address || '',
      };
    }
    return { city: 'Bangalore', state: 'Karnataka', area: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.roomNumber.trim()) {
      toast({ title: 'Validation Error', description: 'Room number is required.', variant: 'destructive' });
      return;
    }
    if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) {
      toast({ title: 'Validation Error', description: 'Monthly rent must be greater than 0.', variant: 'destructive' });
      return;
    }
    if (!formData.propertyId) {
      toast({ title: 'Validation Error', description: 'Please select a property.', variant: 'destructive' });
      return;
    }

    const sharingLabel = SHARING_TYPES.find(s => s.value === formData.sharingType)?.label || 'Double';
    const title = `${sharingLabel} Sharing Room - ${formData.roomNumber}`;
    const description = `${sharingLabel} sharing PG room (Room ${formData.roomNumber}) on floor ${formData.floorNumber} with ${formData.totalBeds} bed(s). Monthly rent ₹${formData.monthlyRent} per bed. Amenities: ${formData.amenities.length > 0 ? formData.amenities.join(', ') : 'Basic amenities included'}.`;

    const location = getPropertyLocation(formData.propertyId);

    const roomPayload = {
      title,
      roomNumber: formData.roomNumber,
      description,
      price: Number(formData.monthlyRent),
      roomType: 'PG',
      category: 'PG',
      maxGuests: Number(formData.totalBeds),
      amenities: formData.amenities,
      pricingType: 'monthly',
      approvalStatus: 'approved',
      isActive: formData.isActive,
      currentStatus: 'vacant_clean',
      location,
      propertyDetails: {
        propertyId: formData.propertyId,
        floorNumber: Number(formData.floorNumber),
        totalBeds: Number(formData.totalBeds),
      },
      pgOptions: {
        sharingType: formData.sharingType,
        monthlyRent: Number(formData.monthlyRent),
        securityDeposit: Number(formData.securityDeposit) || 0,
        noticePeriod: 30,
        foodIncluded: false,
      },
    };

    try {
      setIsSaving(true);
      let response;

      if (editingRoom) {
        response = await apiService.put(`/rooms/${editingRoom.id}`, roomPayload);
      } else {
        response = await apiService.post('/rooms', roomPayload);
      }

      if (response.success) {
        toast({
          title: editingRoom ? 'Room Updated! ✨' : 'Room Added! 🎉',
          description: editingRoom
            ? `Room ${formData.roomNumber} has been updated.`
            : `Room ${formData.roomNumber} has been added successfully.`,
        });
        setIsModalOpen(false);
        loadRooms();
      }
    } catch (error) {
      toast({
        title: editingRoom ? 'Update Failed' : 'Add Failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roomId) => {
    try {
      const response = await apiService.delete(`/rooms/${roomId}`);
      if (response.success) {
        setRooms(rooms.filter(r => r.id !== roomId));
        toast({ title: 'Room Deleted! 🗑️', description: 'The room has been removed.' });
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete room.',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Group rooms by property
  const roomsByProperty = rooms.reduce((acc, room) => {
    const propId = room.propertyDetails?.propertyId || 'unassigned';
    if (!acc[propId]) acc[propId] = [];
    acc[propId].push(room);
    return acc;
  }, {});

  const getPropertyName = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.title || property?.name || 'Unassigned Property';
  };

  const getSharingBadge = (sharingType) => {
    const config = SHARING_TYPES.find(s => s.value === sharingType);
    return config || SHARING_TYPES[1]; // default to double
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-3 text-muted-foreground">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Room Management</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''} across {Object.keys(roomsByProperty).length} propert{Object.keys(roomsByProperty).length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={properties.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </div>

        {properties.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              ⚠️ You need to add a property first before you can add rooms.
            </p>
          </div>
        )}
      </div>

      {/* Room Cards grouped by property */}
      {Object.keys(roomsByProperty).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border text-center">
          <Bed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No rooms added yet. Start by adding your first room.</p>
          <Button
            onClick={openAddModal}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={properties.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Room
          </Button>
        </div>
      ) : (
        Object.entries(roomsByProperty).map(([propertyId, propertyRooms]) => (
          <div key={propertyId} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Building className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">{getPropertyName(propertyId)}</h3>
              <span className="text-sm text-muted-foreground">({propertyRooms.length} rooms)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyRooms.map(room => {
                const sharing = getSharingBadge(room.pgOptions?.sharingType);
                const status = room.currentStatus || 'vacant_clean';

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-xl p-5 shadow-sm border hover:border-purple-200 transition-colors"
                  >
                    {/* Room Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg">Room {room.roomNumber || '—'}</h4>
                        <p className="text-sm text-muted-foreground">
                          Floor {room.propertyDetails?.floorNumber || 1}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[status] || status}
                      </span>
                    </div>

                    {/* Sharing Type Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${sharing.color}`}>
                        {sharing.icon} {sharing.label} Sharing
                      </span>
                    </div>

                    {/* Pricing & Beds */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Price/Bed</p>
                        <p className="font-bold text-purple-600">
                          ₹{(room.pgOptions?.monthlyRent || room.price || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Total Beds</p>
                        <p className="font-bold">{room.maxGuests || room.propertyDetails?.totalBeds || '—'}</p>
                      </div>
                    </div>

                    {/* Amenities preview */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.slice(0, 3).map(amenity => (
                            <span key={amenity} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{room.amenities.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditModal(room)}
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setDeleteConfirm(room)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Property Selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Property *</label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title || prop.name} — {prop.location?.city || ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Number & Floor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Room Number *</label>
                  <Input
                    value={formData.roomNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="e.g. 101, G102"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Floor Number</label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.floorNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, floorNumber: e.target.value }))}
                  />
                </div>
              </div>

              {/* Sharing Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Sharing Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SHARING_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleSharingTypeChange(type.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.sharingType === type.value
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{type.icon}</div>
                      <p className="text-xs font-medium">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Beds */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Number of Beds</label>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.totalBeds}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalBeds: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-set based on sharing type, but you can adjust
                </p>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Monthly Rent/Bed (₹) *</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    placeholder="e.g. 8000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Security Deposit (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium mb-2">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITIES_OPTIONS.map(amenity => (
                    <label
                      key={amenity}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.amenities.includes(amenity)
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingRoom ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      {editingRoom ? 'Update Room' : 'Add Room'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-2">Delete Room?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete Room {deleteConfirm.roomNumber}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
