import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Bed, Users, DollarSign, Home, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import roomTypeService from '@/services/roomTypeService';

const RoomTypeModal = ({ isOpen, onClose, propertyId, roomType = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricePerNight: '',
    pricePerBed: '',
    maxOccupancy: 1,
    totalRooms: 1,
    totalBeds: '',
    roomSize: '',
    isDormitory: false,
    gender: 'mixed',
    bedConfiguration: {
      single: 0,
      double: 0,
      bunk: 0,
      queen: 0,
      king: 0
    },
    amenities: [],
    hasAttachedBathroom: true,
    hasAC: false,
    hasBalcony: false,
    smokingAllowed: false,
    petsAllowed: false,
    floor: '',
    viewType: '',
    cancellationPolicy: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (roomType) {
      setFormData({
        name: roomType.name || '',
        description: roomType.description || '',
        pricePerNight: roomType.pricePerNight || '',
        pricePerBed: roomType.pricePerBed || '',
        maxOccupancy: roomType.maxOccupancy || 1,
        totalRooms: roomType.totalRooms || 1,
        totalBeds: roomType.totalBeds || '',
        roomSize: roomType.roomSize || '',
        isDormitory: roomType.isDormitory || false,
        gender: roomType.gender || 'mixed',
        bedConfiguration: roomType.bedConfiguration || { single: 0, double: 0, bunk: 0, queen: 0, king: 0 },
        amenities: roomType.amenities || [],
        hasAttachedBathroom: roomType.hasAttachedBathroom ?? true,
        hasAC: roomType.hasAC || false,
        hasBalcony: roomType.hasBalcony || false,
        smokingAllowed: roomType.smokingAllowed || false,
        petsAllowed: roomType.petsAllowed || false,
        floor: roomType.floor || '',
        viewType: roomType.viewType || '',
        cancellationPolicy: roomType.cancellationPolicy || ''
      });
    }
  }, [roomType]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBedConfigChange = (bedType, increment) => {
    setFormData(prev => ({
      ...prev,
      bedConfiguration: {
        ...prev.bedConfiguration,
        [bedType]: Math.max(0, prev.bedConfiguration[bedType] + increment)
      }
    }));
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        propertyId,
        pricePerNight: parseFloat(formData.pricePerNight),
        pricePerBed: formData.pricePerBed ? parseFloat(formData.pricePerBed) : null,
        totalBeds: formData.isDormitory && formData.totalBeds ? parseInt(formData.totalBeds) : null,
        roomSize: formData.roomSize ? parseInt(formData.roomSize) : null
      };

      let response;
      if (roomType) {
        response = await roomTypeService.updateRoomType(roomType.id, dataToSubmit);
      } else {
        response = await roomTypeService.createRoomType(dataToSubmit);
      }

      if (response.success) {
        toast({
          title: roomType ? "Room Type Updated! ✨" : "Room Type Added! 🎉",
          description: roomType ? "Room type has been updated successfully." : "New room type has been added."
        });
        onSuccess && onSuccess(response.data);
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to save room type.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const commonAmenities = [
    'WiFi', 'TV', 'Air Conditioning', 'Heater', 'Wardrobe', 'Study Table',
    'Chair', 'Window', 'Fan', 'Geyser', 'Attached Bathroom', 'Balcony'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {roomType ? 'Edit Room Type' : 'Add Room Type'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Home className="w-5 h-5 text-purple-600" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Type Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Single Bed in Dormitory"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Room Type</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={!formData.isDormitory}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDormitory: !checked }))}
                    />
                    <span>Private Room</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.isDormitory}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDormitory: checked }))}
                    />
                    <span>Dormitory</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe the room type..."
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Pricing
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerNight">Price Per Night (₹) *</Label>
                <Input
                  id="pricePerNight"
                  name="pricePerNight"
                  type="number"
                  value={formData.pricePerNight}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {formData.isDormitory && (
                <div className="space-y-2">
                  <Label htmlFor="pricePerBed">Price Per Bed (₹)</Label>
                  <Input
                    id="pricePerBed"
                    name="pricePerBed"
                    type="number"
                    value={formData.pricePerBed}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Capacity
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOccupancy">Max Occupancy *</Label>
                <Input
                  id="maxOccupancy"
                  name="maxOccupancy"
                  type="number"
                  value={formData.maxOccupancy}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalRooms">Total Rooms *</Label>
                <Input
                  id="totalRooms"
                  name="totalRooms"
                  type="number"
                  value={formData.totalRooms}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>

              {formData.isDormitory && (
                <div className="space-y-2">
                  <Label htmlFor="totalBeds">Total Beds</Label>
                  <Input
                    id="totalBeds"
                    name="totalBeds"
                    type="number"
                    value={formData.totalBeds}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              )}
            </div>

            {formData.isDormitory && (
              <div className="space-y-2">
                <Label>Gender Restriction</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="mixed"
                      checked={formData.gender === 'mixed'}
                      onChange={handleInputChange}
                    />
                    <span>Mixed</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={handleInputChange}
                    />
                    <span>Male Only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={handleInputChange}
                    />
                    <span>Female Only</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Bed Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bed className="w-5 h-5 text-purple-600" />
              Bed Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.bedConfiguration).map(([bedType, count]) => (
                <div key={bedType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="capitalize">{bedType} Bed{count !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBedConfigChange(bedType, -1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{count}</span>
                    <button
                      type="button"
                      onClick={() => handleBedConfigChange(bedType, 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              Amenities & Features
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {commonAmenities.map(amenity => (
                <label key={amenity} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.amenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <span className="text-sm">{amenity}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasAttachedBathroom}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasAttachedBathroom: checked }))}
                />
                <span className="text-sm">Attached Bathroom</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasAC}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasAC: checked }))}
                />
                <span className="text-sm">AC</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasBalcony}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasBalcony: checked }))}
                />
                <span className="text-sm">Balcony</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.smokingAllowed}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smokingAllowed: checked }))}
                />
                <span className="text-sm">Smoking Allowed</span>
              </label>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomSize">Room Size (sq ft)</Label>
              <Input
                id="roomSize"
                name="roomSize"
                type="number"
                value={formData.roomSize}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                placeholder="e.g., Ground, 1st, 2nd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewType">View Type</Label>
              <Input
                id="viewType"
                name="viewType"
                value={formData.viewType}
                onChange={handleInputChange}
                placeholder="e.g., Garden, Street"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? 'Saving...' : roomType ? 'Update Room Type' : 'Add Room Type'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomTypeModal;

