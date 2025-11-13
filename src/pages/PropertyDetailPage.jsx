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
import bookingService from '@/services/bookingService';

const PropertyDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadPropertyDetails();
  }, [roomId]);

  const loadPropertyDetails = async () => {
    try {
      setIsLoading(true);
      const response = await roomService.getRoom(roomId);
      
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
            name: sharingLabels[type].name,
            icon: sharingLabels[type].icon,
            description: sharingLabels[type].description,
            price,
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

      const response = await bookingService.createGuestBooking({
        room: property.id,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        checkIn: bookingData.moveInDate,
        guests: 1,
        specialRequests: bookingData.specialRequests || ''
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
  const pricingUnit = property.pricingType === 'daily' ? '/night' : '/month';

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
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>
                        {typeof property.location === 'object'
                          ? `${property.location?.address || ''}, ${property.location?.city || ''}, ${property.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                          : property.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{property.rating?.average || 4.5}</span>
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
                                <span>{variant.maxGuests} guests</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold gradient-text">₹{variant.price}</div>
                              <div className="text-xs text-muted-foreground">{pricingUnit}</div>
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
                  <Button variant="outline" className="w-full">
                    Contact Host
                  </Button>
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

