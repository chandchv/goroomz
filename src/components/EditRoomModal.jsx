import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

const EditRoomModal = ({ room, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    ...room,
    title: room.title || '',
    description: room.description || '',
    price: room.price || 0,
    pricingType: room.pricingType || 'monthly',
    pgOptions: room.pgOptions || {
      sharingPrices: {
        single: 0,
        double: 0,
        triple: 0,
        quad: 0
      }
    },
    hotelPrices: room.hotelPrices || {
      standard: 0,
      deluxe: 0,
      suite: 0,
      premium: 0
    },
    maxGuests: room.maxGuests || 1,
    location: typeof room.location === 'object' 
      ? `${room.location?.address || ''}, ${room.location?.city || ''}`
      : (room.location || ''),
    city: typeof room.location === 'object' ? (room.location?.city || '') : '',
    roomType: room.roomType || 'Private Room',
    category: room.category || 'PG',
    amenities: room.amenities || [],
    rules: Array.isArray(room.rules) ? room.rules.join('\n') : '',
    images: room.images || []
  });
  const [newImageFiles, setNewImageFiles] = useState([]);

  const amenitiesList = ['wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 'gym', 'security'];
  const categories = ['PG', 'Hotel Room', 'Independent Home', 'Home Stay'];

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + formData.images.length > 10) {
      toast({
        title: "Too Many Images",
        description: "You can have maximum 10 images",
        variant: "destructive"
      });
      return;
    }

    // Convert to base64
    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    };

    try {
      const base64Images = await Promise.all(files.map(file => convertToBase64(file)));
      const newImages = base64Images.map((base64, index) => ({
        url: base64,
        isPrimary: formData.images.length === 0 && index === 0
      }));

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    } catch (error) {
      console.error('Error converting images:', error);
      toast({
        title: "Image Upload Error",
        description: "Failed to process images",
        variant: "destructive"
      });
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // If we removed the primary image, make the first image primary
      if (prev.images[index].isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const setPrimaryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const updatedRoom = {
      ...formData,
      price: parseInt(formData.price) || 0,
      maxGuests: parseInt(formData.maxGuests),
      rules: formData.rules.split('\n').filter(r => r.trim()),
      images: formData.images,
      pricingType: formData.pricingType,
      pgOptions: formData.category === 'PG' ? formData.pgOptions : null,
      hotelPrices: formData.category === 'Hotel Room' ? formData.hotelPrices : null
    };

    // Pass the room ID and updates as separate arguments
    onUpdate(room.id, updatedRoom);
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-effect rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 glass-effect p-6 border-b flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold gradient-text">Edit Room</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Room Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>

              {/* Pricing Section */}
              <div className="space-y-4 border-2 border-purple-200 rounded-xl p-4 bg-purple-50/30">
                <h3 className="font-bold text-lg gradient-text">Pricing Details</h3>
                
                {/* Pricing Type */}
                <div className="space-y-2">
                  <Label htmlFor="pricingType">Pricing Type</Label>
                  <select
                    id="pricingType"
                    value={formData.pricingType}
                    onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="daily">Daily Rate</option>
                    <option value="monthly">Monthly Rate</option>
                  </select>
                </div>

                {/* PG Pricing */}
                {formData.category === 'PG' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Sharing Type Prices (₹/{formData.pricingType === 'daily' ? 'day' : 'month'})</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="pgSingle" className="text-xs">Single Occupancy</Label>
                        <Input
                          id="pgSingle"
                          type="number"
                          value={formData.pgOptions?.sharingPrices?.single || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            pgOptions: {
                              ...formData.pgOptions,
                              sharingPrices: {
                                ...formData.pgOptions.sharingPrices,
                                single: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          placeholder="10000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pgDouble" className="text-xs">Double Sharing</Label>
                        <Input
                          id="pgDouble"
                          type="number"
                          value={formData.pgOptions?.sharingPrices?.double || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            pgOptions: {
                              ...formData.pgOptions,
                              sharingPrices: {
                                ...formData.pgOptions.sharingPrices,
                                double: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          placeholder="7000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pgTriple" className="text-xs">Triple Sharing</Label>
                        <Input
                          id="pgTriple"
                          type="number"
                          value={formData.pgOptions?.sharingPrices?.triple || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            pgOptions: {
                              ...formData.pgOptions,
                              sharingPrices: {
                                ...formData.pgOptions.sharingPrices,
                                triple: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          placeholder="5000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pgQuad" className="text-xs">Quad Sharing</Label>
                        <Input
                          id="pgQuad"
                          type="number"
                          value={formData.pgOptions?.sharingPrices?.quad || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            pgOptions: {
                              ...formData.pgOptions,
                              sharingPrices: {
                                ...formData.pgOptions.sharingPrices,
                                quad: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          placeholder="4000"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hotel Room Pricing */}
                {formData.category === 'Hotel Room' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Room Type Prices (₹/{formData.pricingType === 'daily' ? 'night' : 'month'})</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="hotelStandard" className="text-xs">Standard Room</Label>
                        <Input
                          id="hotelStandard"
                          type="number"
                          value={formData.hotelPrices?.standard || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            hotelPrices: {
                              ...formData.hotelPrices,
                              standard: parseInt(e.target.value) || 0
                            }
                          })}
                          placeholder="2000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hotelDeluxe" className="text-xs">Deluxe Room</Label>
                        <Input
                          id="hotelDeluxe"
                          type="number"
                          value={formData.hotelPrices?.deluxe || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            hotelPrices: {
                              ...formData.hotelPrices,
                              deluxe: parseInt(e.target.value) || 0
                            }
                          })}
                          placeholder="3500"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hotelSuite" className="text-xs">Suite</Label>
                        <Input
                          id="hotelSuite"
                          type="number"
                          value={formData.hotelPrices?.suite || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            hotelPrices: {
                              ...formData.hotelPrices,
                              suite: parseInt(e.target.value) || 0
                            }
                          })}
                          placeholder="5000"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hotelPremium" className="text-xs">Premium Room</Label>
                        <Input
                          id="hotelPremium"
                          type="number"
                          value={formData.hotelPrices?.premium || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            hotelPrices: {
                              ...formData.hotelPrices,
                              premium: parseInt(e.target.value) || 0
                            }
                          })}
                          placeholder="7500"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Base Price for other categories */}
                {(formData.category === 'Home Stay' || formData.category === 'Independent Home') && (
                <div className="space-y-2">
                    <Label htmlFor="price">Price (₹/{formData.pricingType === 'daily' ? 'night' : 'month'})</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomType">Room Type</Label>
                  <select
                    id="roomType"
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option>Private Room</option>
                    <option>Shared Room</option>
                    <option>Entire Place</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {amenitiesList.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${amenity}`}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label htmlFor={`edit-${amenity}`} className="text-sm capitalize cursor-pointer">
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">House Rules (one per line)</Label>
                <textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>

              {/* Images Section */}
              <div className="space-y-3">
                <Label>Property Images</Label>
                
                {/* Upload Button */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">Add more photos (max 10 total)</p>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('imageUpload').click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                {/* Existing Images */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`Property ${index + 1}`}
                          className="w-full h-28 object-cover rounded-lg border-2"
                          style={{ borderColor: image.isPrimary ? '#9333ea' : '#e5e7eb' }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          {!image.isPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(index)}
                              className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg rounded-2xl shadow-xl"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditRoomModal;