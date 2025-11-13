import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Building, Home, Hotel, Users, Bed, DollarSign, MapPin, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PropertyListingWizard = ({ isOpen, onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.preview && preview.preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    };
  }, [imagePreviews]);
  const [formData, setFormData] = useState({
    // Step 1: Category Selection
    category: '',
    
    // Step 2: Basic Info
    title: '',
    description: '',
    
    // Step 3: Location
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    
    // Step 4: Category-Specific Options
    // For Hotels
    hotelRoomTypes: [],
    dailyRate: '',
    
    // For PGs
    pgSharingOptions: [],
    monthlyRate: '',
    securityDeposit: '',
    noticePeriod: '30',
    foodIncluded: false,
    
    // For Homestays & Independent Homes
    propertyType: '', // 'entire_place', 'private_room', 'shared_room'
    bedrooms: '1',
    bathrooms: '1',
    
    // Common fields
    maxGuests: '1',
    amenities: [],
    rules: [],
    images: []
  });

  const categories = [
    {
      id: 'Hotel Room',
      name: 'Hotel Room',
      icon: <Hotel className="w-12 h-12" />,
      description: 'Short-term stays with daily rates',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'PG',
      name: 'Paying Guest (PG)',
      icon: <Building className="w-12 h-12" />,
      description: 'Long-term stays with monthly rates',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'Home Stay',
      name: 'Home Stay',
      icon: <Home className="w-12 h-12" />,
      description: 'Experience local hospitality',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'Independent Home',
      name: 'Independent Home',
      icon: <Users className="w-12 h-12" />,
      description: 'Entire house for families',
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  const hotelRoomTypeOptions = [
    { id: 'standard', name: 'Standard Room', icon: '🛏️' },
    { id: 'deluxe', name: 'Deluxe Room', icon: '✨' },
    { id: 'suite', name: 'Suite', icon: '👑' },
    { id: 'premium', name: 'Premium Room', icon: '💎' }
  ];

  const pgSharingOptions = [
    { id: 'single', name: 'Single Occupancy', icon: '👤', desc: 'Private room for one person' },
    { id: 'double', name: 'Double Sharing', icon: '👥', desc: 'Room shared by 2 people' },
    { id: 'triple', name: 'Triple Sharing', icon: '👨‍👩‍👦', desc: 'Room shared by 3 people' },
    { id: 'quad', name: 'Quad Sharing', icon: '👨‍👩‍👧‍👦', desc: 'Room shared by 4+ people' }
  ];

  const homestayPropertyTypes = [
    { id: 'entire_place', name: 'Entire Place', icon: '🏠', desc: 'Guests have the whole place to themselves' },
    { id: 'private_room', name: 'Private Room', icon: '🚪', desc: 'Guests have their own private room' },
    { id: 'shared_room', name: 'Shared Room', icon: '🛏️', desc: 'Guests share a room with others' }
  ];

  const commonAmenities = {
    'Hotel Room': [
      { label: 'WiFi', value: 'wifi' },
      { label: 'TV', value: 'tv' },
      { label: 'AC', value: 'ac' },
      { label: 'Parking', value: 'parking' },
      { label: 'Laundry', value: 'laundry' },
      { label: 'Security', value: 'security' },
      { label: 'Gym', value: 'gym' }
    ],
    'PG': [
      { label: 'WiFi', value: 'wifi' },
      { label: 'Meals', value: 'meals' },
      { label: 'Laundry', value: 'laundry' },
      { label: 'AC', value: 'ac' },
      { label: 'Parking', value: 'parking' },
      { label: 'Security', value: 'security' },
      { label: 'CCTV', value: 'cctv' }
    ],
    'Home Stay': [
      { label: 'WiFi', value: 'wifi' },
      { label: 'Kitchen', value: 'kitchen' },
      { label: 'Parking', value: 'parking' },
      { label: 'Balcony', value: 'balcony' },
      { label: 'TV', value: 'tv' },
      { label: 'Washing Machine', value: 'washing-machine' },
      { label: 'AC', value: 'ac' }
    ],
    'Independent Home': [
      { label: 'WiFi', value: 'wifi' },
      { label: 'Kitchen', value: 'kitchen' },
      { label: 'Parking', value: 'parking' },
      { label: 'Security', value: 'security' },
      { label: 'AC', value: 'ac' },
      { label: 'Refrigerator', value: 'refrigerator' },
      { label: 'Microwave', value: 'microwave' }
    ]
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1 && !formData.category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    if (currentStep === 2) {
      if (!formData.title || formData.title.length < 5) {
        toast({ title: "Title must be at least 5 characters", variant: "destructive" });
        return;
      }
      if (!formData.description || formData.description.length < 20) {
        toast({ title: "Description must be at least 20 characters", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 3 && (!formData.address || !formData.city)) {
      toast({ title: "Please fill in location details", variant: "destructive" });
      return;
    }
    if (currentStep === 4) {
      if (formData.category === 'Hotel Room' && !formData.dailyRate) {
        toast({ title: "Please enter daily rate", variant: "destructive" });
        return;
      }
      if (formData.category === 'PG' && !formData.monthlyRate) {
        toast({ title: "Please enter monthly rent", variant: "destructive" });
        return;
      }
      if ((formData.category === 'Home Stay' || formData.category === 'Independent Home')) {
        if (!formData.propertyType) {
          toast({ title: "Please select property type", variant: "destructive" });
          return;
        }
        if (formData.category === 'Home Stay' && !formData.dailyRate) {
          toast({ title: "Please enter daily rate", variant: "destructive" });
          return;
        }
        if (formData.category === 'Independent Home' && !formData.monthlyRate) {
          toast({ title: "Please enter monthly rate", variant: "destructive" });
          return;
        }
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCategorySelect = (categoryId) => {
    setFormData(prev => ({ ...prev, category: categoryId }));
  };

  const toggleSelection = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + imageFiles.length > 10) {
      toast({
        title: "Too Many Images",
        description: "You can upload maximum 10 images",
        variant: "destructive"
      });
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke URL to prevent memory leaks
      if (prev[index]) {
        URL.revokeObjectURL(prev[index].preview);
      }
      return newPreviews;
    });
  };

  const handleSubmit = async () => {
    // Convert images to base64 format for storage
    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    };

    let imageObjects = [];
    
    if (imagePreviews.length > 0) {
      // Convert all image files to base64
      try {
        const base64Images = await Promise.all(
          imagePreviews.map(preview => convertToBase64(preview.file))
        );
        imageObjects = base64Images.map((base64, index) => ({
          url: base64,
          isPrimary: index === 0
        }));
      } catch (error) {
        console.error('Error converting images:', error);
        toast({
          title: "Image Upload Error",
          description: "Failed to process images. Please try again.",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Use default placeholder image
      imageObjects = [{
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        isPrimary: true
      }];
    }
    
    // Build the final property object based on category
    const baseProperty = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      location: {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        landmark: formData.landmark
      },
      maxGuests: parseInt(formData.maxGuests),
      amenities: formData.amenities,
      rules: formData.rules,
      images: imageObjects
    };

    let propertyData = { ...baseProperty };

    // Add category-specific data
    if (formData.category === 'Hotel Room') {
      propertyData = {
        ...propertyData,
        roomType: 'Hotel Room',
        price: parseFloat(formData.dailyRate),
        pricingType: 'daily',
        hotelRoomTypes: formData.hotelRoomTypes
      };
    } else if (formData.category === 'PG') {
      propertyData = {
        ...propertyData,
        roomType: 'PG',
        price: parseFloat(formData.monthlyRate),
        pricingType: 'monthly',
        pgOptions: {
          sharingTypes: formData.pgSharingOptions,
          securityDeposit: parseFloat(formData.securityDeposit) || 0,
          noticePeriod: parseInt(formData.noticePeriod),
          foodIncluded: formData.foodIncluded
        }
      };
    } else if (formData.category === 'Home Stay' || formData.category === 'Independent Home') {
      propertyData = {
        ...propertyData,
        roomType: formData.propertyType,
        price: parseFloat(formData.dailyRate),
        pricingType: 'daily', // Both Home Stay and Independent Home use daily pricing
        propertyDetails: {
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          propertyType: formData.propertyType
        }
      };
    }

    onSubmit(propertyData);
    onClose();
  };

  const steps = [
    { number: 1, title: 'Category', icon: <Building className="w-5 h-5" /> },
    { number: 2, title: 'Basic Info', icon: <Home className="w-5 h-5" /> },
    { number: 3, title: 'Location', icon: <MapPin className="w-5 h-5" /> },
    { number: 4, title: 'Details', icon: <Bed className="w-5 h-5" /> },
    { number: 5, title: 'Amenities', icon: <CheckCircle className="w-5 h-5" /> },
    { number: 6, title: 'Photos', icon: <Camera className="w-5 h-5" /> }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">List Your Property</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    currentStep >= step.number 
                      ? 'bg-white text-purple-600' 
                      : 'bg-white/30 text-white'
                  }`}>
                    {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.icon}
                  </div>
                  <span className="text-xs hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.number ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-250px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Category Selection */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold text-center mb-8">What type of property are you listing?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                        formData.category === category.id
                          ? 'border-purple-600 bg-purple-50 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${category.gradient} text-white mb-4`}>
                        {category.icon}
                      </div>
                      <h4 className="text-xl font-bold mb-2">{category.name}</h4>
                      <p className="text-gray-600">{category.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Information */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold mb-6">Tell us about your property</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Cozy 2BHK near IT Park"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your property in detail..."
                      rows="6"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Minimum 20 characters</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold mb-6">Where is your property located?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Complete Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g., Bangalore"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g., Karnataka"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="560001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      value={formData.landmark}
                      onChange={(e) => setFormData(prev => ({ ...prev, landmark: e.target.value }))}
                      placeholder="e.g., Near Metro Station"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Category-Specific Details */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold mb-6">Property Details</h3>

                {/* Hotel Room Options */}
                {formData.category === 'Hotel Room' && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg mb-3 block">Room Types Available</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {hotelRoomTypeOptions.map(type => (
                          <button
                            key={type.id}
                            onClick={() => toggleSelection('hotelRoomTypes', type.id)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              formData.hotelRoomTypes.includes(type.id)
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="text-3xl mb-2">{type.icon}</div>
                            <p className="font-semibold">{type.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="dailyRate">Daily Rate (₹) *</Label>
                      <Input
                        id="dailyRate"
                        type="number"
                        value={formData.dailyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxGuests">Maximum Guests</Label>
                      <Input
                        id="maxGuests"
                        type="number"
                        value={formData.maxGuests}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                        min="1"
                      />
                    </div>
                  </div>
                )}

                {/* PG Options */}
                {formData.category === 'PG' && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg mb-3 block">Sharing Options</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pgSharingOptions.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleSelection('pgSharingOptions', option.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              formData.pgSharingOptions.includes(option.id)
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{option.icon}</span>
                              <p className="font-semibold">{option.name}</p>
                            </div>
                            <p className="text-sm text-gray-600">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="monthlyRate">Monthly Rent (₹) *</Label>
                        <Input
                          id="monthlyRate"
                          type="number"
                          value={formData.monthlyRate}
                          onChange={(e) => setFormData(prev => ({ ...prev, monthlyRate: e.target.value }))}
                          placeholder="8000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                        <Input
                          id="securityDeposit"
                          type="number"
                          value={formData.securityDeposit}
                          onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                          placeholder="10000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="noticePeriod">Notice Period (days)</Label>
                        <Input
                          id="noticePeriod"
                          type="number"
                          value={formData.noticePeriod}
                          onChange={(e) => setFormData(prev => ({ ...prev, noticePeriod: e.target.value }))}
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="foodIncluded"
                        checked={formData.foodIncluded}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, foodIncluded: checked }))}
                      />
                      <Label htmlFor="foodIncluded" className="cursor-pointer">Food Included</Label>
                    </div>
                  </div>
                )}

                {/* Homestay & Independent Home Options */}
                {(formData.category === 'Home Stay' || formData.category === 'Independent Home') && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg mb-3 block">Property Type</Label>
                      <div className="grid grid-cols-1 gap-4">
                        {homestayPropertyTypes.map(type => (
                          <button
                            key={type.id}
                            onClick={() => setFormData(prev => ({ ...prev, propertyType: type.id }))}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              formData.propertyType === type.id
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{type.icon}</span>
                              <p className="font-semibold">{type.name}</p>
                            </div>
                            <p className="text-sm text-gray-600">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                          id="bedrooms"
                          type="number"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                          id="bathrooms"
                          type="number"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxGuests">Maximum Guests</Label>
                        <Input
                          id="maxGuests"
                          type="number"
                          value={formData.maxGuests}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                          min="1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pricing">Daily Rate (₹) *</Label>
                      <Input
                        id="pricing"
                        type="number"
                        value={formData.dailyRate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          dailyRate: e.target.value 
                        }))}
                        placeholder="3000"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Amenities */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold mb-6">What amenities do you offer?</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(commonAmenities[formData.category] || []).map(amenity => (
                    <label
                      key={amenity.value}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.amenities.includes(amenity.value)
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <Checkbox
                        checked={formData.amenities.includes(amenity.value)}
                        onCheckedChange={() => toggleSelection('amenities', amenity.value)}
                        className="mb-2"
                      />
                      <p className="font-medium">{amenity.label}</p>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 6: Photos */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold mb-6">Add Photos</h3>
                
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Upload high-quality photos of your property</p>
                  <p className="text-sm text-gray-500 mb-4">Maximum 10 images, up to 5MB each</p>
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
                    onClick={() => document.getElementById('imageUpload').click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div>
                    <p className="font-semibold mb-3">{imagePreviews.length} image(s) selected</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">{preview.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">You can also add photos later from your dashboard</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              List Property
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyListingWizard;

