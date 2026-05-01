import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Users, Star, Calendar, Shield, 
  Wifi, Car, Utensils, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import BookingModal from '@/components/BookingModal';
import roomService from '@/services/roomService';
import propertyService from '@/services/propertyService';
import bookingService from '@/services/bookingService';

const PropertyDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAmadeusProperty, setIsAmadeusProperty] = useState(false);

  useEffect(() => {
    loadPropertyDetails();
  }, [roomId]);

  const loadPropertyDetails = async () => {
    try {
      setIsLoading(true);
      
      // Check if this is an Amadeus property
      const isAmadeus = propertyService.isAmadeusProperty(roomId);
      setIsAmadeusProperty(isAmadeus);
      
      let response;
      if (isAmadeus) {
        // Use unified search endpoint for Amadeus properties
        response = await propertyService.getHotelDetails(roomId);
      } else {
        // Try regular room service first, then fall back to properties API
        try {
          response = await roomService.getRoom(roomId);
        } catch (roomError) {
          // Room not found in rooms table — expected for properties
          console.log('Room not found, trying properties API...');
        }
        
        if (!response || !response.success) {
          // Try properties table
          try {
            response = await propertyService.getProperty(roomId);
          } catch (propError) {
            console.error('Property also not found:', propError);
          }
        }
      }
      
      if (response.success) {
        setProperty(response.data);
      } else {
        toast({
          title: "Error",
          description: "Property not found",
          variant: "destructive"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomTypeVariants = () => {
    if (!property) return [];

    const variants = [];

    if (property.category === 'Hotel Room' && property.hotelPrices) {
      const roomTypeLabels = {
        standard: { name: 'Standard Room', icon: '🛏️', description: 'Comfortable accommodation with essential amenities' },
        deluxe: { name: 'Deluxe Room', icon: '✨', description: 'Enhanced comfort with premium amenities' },
        suite: { name: 'Suite', icon: '👑', description: 'Spacious luxury suite with living area' },
        premium: { name: 'Premium Room', icon: '💎', description: 'Top-tier accommodation with exclusive features' }
      };

      Object.entries(property.hotelPrices).forEach(([type, price]) => {
        if (price && price > 0) {
          variants.push({
            type,
            name: roomTypeLabels[type].name,
            icon: roomTypeLabels[type].icon,
            description: roomTypeLabels[type].description,
            price,
            maxGuests: property.maxGuests
          });
        }
      });
    } else if (property.category === 'PG' && property.pgOptions?.sharingPrices) {
      const sharingLabels = {
        single: { name: 'Single Occupancy', icon: '👤', description: 'Private room for one person' },
        double: { name: 'Double Sharing', icon: '👥', description: 'Room shared by 2 people' },
        triple: { name: 'Triple Sharing', icon: '👨‍👩‍👦', description: 'Room shared by 3 people' },
        quad: { name: 'Quad Sharing', icon: '👨‍👩‍👧‍👦', description: 'Room shared by 4+ people' }
      };

      Object.entries(property.pgOptions.sharingPrices).forEach(([type, price]) => {
        if (price && price > 0) {
          variants.push({
            type,
            name: sharingLabels[type]?.name || type,
            icon: sharingLabels[type]?.icon || '🛏️',
            description: sharingLabels[type]?.description || '',
            price,
            dailyRate: property.pgOptions.sharingDailyPrices?.[type] || 0,
            monthlyRate: price,
            maxGuests: type === 'single' ? 1 : type === 'double' ? 2 : type === 'triple' ? 3 : 4
          });
        }
      });
    }

    return variants;
  };

  const handleBookRoom = async (bookingData) => {
    try {
      const roomToBook = selectedRoomType || {
        ...property,
        price: property.price
      };

      // Validate move-in date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(bookingData.moveInDate);
      if (checkInDate < today) {
        toast({
          title: "Invalid date ⚠️",
          description: "Check-in date cannot be in the past. Please select today or a future date.",
          variant: "destructive"
        });
        return;
      }

      const duration = parseInt(bookingData.duration || 1);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + (duration * 30));

      const response = await bookingService.createGuestBooking({
        room: property.id,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        checkIn: bookingData.moveInDate,
        checkOut: checkOutDate.toISOString().split('T')[0],
        guests: roomToBook.maxGuests || 1,
        totalAmount: roomToBook.price * duration,
        sharingType: roomToBook.type || null,
        specialRequests: bookingData.specialRequests || '',
        bookingSource: 'online',
        status: 'pending'
      });

      if (response.success) {
        if (response.data.credentials) {
          const { email, password, message } = response.data.credentials;
          toast({
            title: "🎉 Booking Created & Account Created!",
            description: (
              <div className="space-y-2">
                <p>{message}</p>
                <div className="bg-white/10 p-3 rounded-lg mt-2">
                  <p className="font-mono text-sm"><strong>Email:</strong> {email}</p>
                  <p className="font-mono text-sm"><strong>Password:</strong> {password}</p>
                </div>
                <p className="text-xs">⚠️ Please save these credentials securely!</p>
              </div>
            ),
            duration: 10000
          });
        } else {
          toast({
            title: "Booking Created! ✅",
            description: "Your booking has been created successfully!",
          });
        }
        setIsBookingModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking.",
        variant: "destructive"
      });
    }
  };

  const nextImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const previousImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const roomVariants = getRoomTypeVariants();
  
  // Determine pricing unit based on property category
  // Hotels and Amadeus properties: per night
  // PGs: per month
  // Others: default to per night
  const getPricingUnit = () => {
    if (isAmadeusProperty) return '/night';
    
    const category = property.category || property.type || '';
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('pg') || categoryLower.includes('paying guest')) {
      return '/month';
    }
    
    // Hotels, Homestays, Apartments default to per night
    return '/night';
  };
  
  const pricingUnit = getPricingUnit();

  return (
    <>
      <Helmet>
        <title>{property.title} - GoRoomz</title>
        <meta name="description" content={property.description} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Listings
            </Button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative h-96 bg-gray-900">
          {property.images && property.images.length > 0 ? (
            <>
              <img
                src={property.images[currentImageIndex]?.url || property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={previousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {property.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
              <span className="text-6xl">🏠</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold">{property.title || property.name}</h1>
                      {isAmadeusProperty && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Global Hotel
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>
                        {typeof property.location === 'object'
                          ? `${property.location?.address || ''}, ${property.location?.city || ''}, ${property.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
                          : property.address?.city 
                            ? `${property.address.city}${property.address.countryCode ? `, ${property.address.countryCode}` : ''}`
                            : typeof property.location === 'string' ? property.location : 'Location not available'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{property.rating?.average || (typeof property.rating === 'number' ? property.rating : 4.5)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{property.maxGuests} guests max</span>
                  </div>
                  <span>•</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {property.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">About this property</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>

              {/* Amenities */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        {amenity === 'wifi' && <Wifi className="w-4 h-4 text-purple-600" />}
                        {amenity === 'parking' && <Car className="w-4 h-4 text-purple-600" />}
                        {amenity === 'meals' && <Utensils className="w-4 h-4 text-purple-600" />}
                        {!['wifi', 'parking', 'meals'].includes(amenity) && <Shield className="w-4 h-4 text-purple-600" />}
                      </div>
                      <span className="capitalize">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* House Rules */}
              {property.rules && property.rules.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">House Rules</h2>
                  <ul className="space-y-2">
                    {property.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar - Room Types & Booking */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">
                    {roomVariants.length > 0 ? 'Select Room Type' : 'Pricing'}
                  </h2>

                  {/* Room Type Variants */}
                  {roomVariants.length > 0 ? (
                    <div className="space-y-3">
                      {roomVariants.map((variant) => (
                        <motion.button
                          key={variant.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedRoomType({ ...property, ...variant });
                            setIsBookingModalOpen(true);
                          }}
                          className="w-full p-4 border-2 border-gray-200 hover:border-purple-600 rounded-xl text-left transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{variant.icon}</span>
                                <span className="font-bold">{variant.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{variant.description}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{variant.maxGuests} guest{variant.maxGuests > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="text-right min-w-[90px]">
                              {variant.monthlyRate > 0 && (
                                <div>
                                  <div className="text-xl font-bold gradient-text">₹{variant.monthlyRate.toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">/month</div>
                                </div>
                              )}
                              {variant.dailyRate > 0 && (
                                <div className="mt-1">
                                  <div className="text-sm font-semibold text-gray-600">₹{variant.dailyRate.toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">/day</div>
                                </div>
                              )}
                              {!variant.monthlyRate && !variant.dailyRate && variant.price > 0 && (
                                <div>
                                  <div className="text-xl font-bold gradient-text">₹{variant.price.toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">{pricingUnit}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    // Single Price Display
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold gradient-text">₹{property.price}</div>
                      <div className="text-muted-foreground">{pricingUnit}</div>
                      <Button
                        onClick={() => {
                          setSelectedRoomType(property);
                          setIsBookingModalOpen(true);
                        }}
                        className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg rounded-xl"
                      >
                        <Calendar className="w-5 h-5 mr-2" />
                        Book Now
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6">
                  <h3 className="font-bold mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Have questions about this property? We're here to help!
                  </p>
                  {property.contactInfo?.phone ? (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`tel:${property.contactInfo.phone}`, '_self')}
                      >
                        📞 Call Host
                      </Button>
                      {property.contactInfo?.email && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(`mailto:${property.contactInfo.email}?subject=Inquiry about ${property.title || property.name}`, '_self')}
                        >
                          ✉️ Email Host
                        </Button>
                      )}
                    </div>
                  ) : property.owner?.name ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Property Owner",
                          description: `This property is managed by ${property.owner.name}. Please book online or contact support at support@goroomz.com for assistance.`,
                        });
                      }}
                    >
                      Contact Host
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('mailto:support@goroomz.com?subject=Inquiry about ' + encodeURIComponent(property.title || property.name || 'a property'), '_self')}
                    >
                      Contact Support
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && selectedRoomType && (
        <BookingModal
          room={selectedRoomType}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onBook={handleBookRoom}
        />
      )}
    </>
  );
};

export default PropertyDetailPage;

