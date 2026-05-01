import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Star, Users, Phone, Mail, 
  Wifi, Car, Utensils, Shield, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Building, X, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import propertyService from '@/services/propertyService';
import BookingModal from '@/components/BookingModal';
import bookingService from '@/services/bookingService';

const PGDetailPage = () => {
  const { identifier } = useParams(); // Can be UUID or slug
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    name: '', email: '', phone: '', businessName: '', proofOfOwnership: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSharingType, setSelectedSharingType] = useState(null);

  useEffect(() => { loadProperty(); }, [identifier]);

  const loadProperty = async () => {
    try {
      setIsLoading(true);
      const response = await propertyService.getProperty(identifier);
      if (response.success) setProperty(response.data);
      else { toast({ title: "Error", description: "Property not found", variant: "destructive" }); navigate('/pgs'); }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load property", variant: "destructive" });
      navigate('/pgs');
    } finally { setIsLoading(false); }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await propertyService.claimProperty(identifier, claimForm);
      if (response.success) {
        toast({ title: "Claim Submitted! ✅", description: response.message });
        setShowClaimModal(false);
        setClaimForm({ name: '', email: '', phone: '', businessName: '', proofOfOwnership: '' });
      }
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to submit claim", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleBookNow = (sharingType = null) => {
    setSelectedSharingType(sharingType);
    setIsBookingModalOpen(true);
  };

  const handleBookRoom = async (bookingData) => {
    try {
      const response = await bookingService.createGuestBooking({
        room: property.id,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        checkIn: bookingData.moveInDate,
        guests: 1,
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
    if (property?.images?.length > 0) setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };
  const prevImage = () => {
    if (property?.images?.length > 0) setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
    </div>
  );

  if (!property) return null;

  const sharingPrices = property.pgOptions?.sharingPrices || property.metadata?.pgOptions?.sharingPrices || {};
  const genderLabel = property.metadata?.genderPreference === 'female' ? '👩 Ladies Only' : 
                      property.metadata?.genderPreference === 'male' ? '👨 Gents Only' : '👥 Co-ed';
  const isClaimed = property.metadata?.isClaimed;

  return (
    <>
      <Helmet>
        <title>{property.name} - PG in {property.location?.area || 'Bangalore'} | GoRoomz</title>
        <meta name="description" content={property.description} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative h-80 md:h-96 bg-gray-900">
          {property.images?.length > 0 ? (
            <>
              <img src={property.images[currentImageIndex]?.url || property.images[currentImageIndex]} alt={property.name} className="w-full h-full object-cover" />
              {property.images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
                  <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full"><ChevronRight className="w-6 h-6" /></button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
              <span className="text-8xl">🏠</span>
            </div>
          )}
          {!isClaimed && (
            <div className="absolute bottom-4 right-4">
              <Button onClick={() => setShowClaimModal(true)} className="bg-orange-500 hover:bg-orange-600">
                <Building className="w-4 h-4 mr-2" /> Own this PG? Claim it
              </Button>
            </div>
          )}
        </div>


        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">{genderLabel}</span>
                      {isClaimed && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{property.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>{property.location?.address}, {property.location?.area}, {property.location?.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{property.rating?.average || 4.0}</span>
                    <span className="text-sm text-muted-foreground">({property.rating?.count || 0})</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">About this PG</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.amenities?.map((amenity) => (
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

              {property.rules?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">House Rules</h2>
                  <ul className="space-y-2">
                    {property.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-purple-600 mt-1">•</span><span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>


            {/* Sidebar - Pricing & Contact */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">Pricing</h2>
                  <div className="space-y-3">
                    {sharingPrices.single && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBookNow('single')}
                        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-300 rounded-lg transition-all"
                      >
                        <div><span className="font-medium">Single Occupancy</span><p className="text-xs text-muted-foreground">Private room</p></div>
                        <div className="text-right"><span className="text-xl font-bold text-purple-600">₹{sharingPrices.single.toLocaleString()}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                      </motion.button>
                    )}
                    {sharingPrices.double && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBookNow('double')}
                        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-300 rounded-lg transition-all"
                      >
                        <div><span className="font-medium">Double Sharing</span><p className="text-xs text-muted-foreground">2 per room</p></div>
                        <div className="text-right"><span className="text-xl font-bold text-purple-600">₹{sharingPrices.double.toLocaleString()}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                      </motion.button>
                    )}
                    {sharingPrices.triple && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBookNow('triple')}
                        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-300 rounded-lg transition-all"
                      >
                        <div><span className="font-medium">Triple Sharing</span><p className="text-xs text-muted-foreground">3 per room</p></div>
                        <div className="text-right"><span className="text-xl font-bold text-purple-600">₹{sharingPrices.triple.toLocaleString()}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                      </motion.button>
                    )}
                    {sharingPrices.quad && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBookNow('quad')}
                        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-300 rounded-lg transition-all"
                      >
                        <div><span className="font-medium">Quad Sharing</span><p className="text-xs text-muted-foreground">4+ per room</p></div>
                        <div className="text-right"><span className="text-xl font-bold text-purple-600">₹{sharingPrices.quad.toLocaleString()}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                      </motion.button>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleBookNow(null)}
                    className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg rounded-xl"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Now
                  </Button>
                </div>

                {property.contactInfo?.phone && (
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">Contact</h3>
                    <div className="space-y-3">
                      <a href={`tel:${property.contactInfo.phone}`} className="flex items-center gap-3 text-purple-700 hover:text-purple-900">
                        <Phone className="w-5 h-5" /><span>{property.contactInfo.phone}</span>
                      </a>
                      {property.contactInfo.email && (
                        <a href={`mailto:${property.contactInfo.email}`} className="flex items-center gap-3 text-purple-700 hover:text-purple-900">
                          <Mail className="w-5 h-5" /><span>{property.contactInfo.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Booking Modal */}
        {isBookingModalOpen && (
          <BookingModal
            room={{
              ...property,
              title: property.name,
              price: selectedSharingType && sharingPrices[selectedSharingType] 
                ? sharingPrices[selectedSharingType] 
                : Object.values(sharingPrices)[0] || 0,
              sharingType: selectedSharingType
            }}
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            onBook={handleBookRoom}
          />
        )}

        {/* Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Claim This Property</h2>
                <button onClick={() => setShowClaimModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Verification Required</p>
                    <p className="text-orange-700">Our team will verify your ownership before transferring control of this listing.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Your Name *</label>
                  <Input
                    value={claimForm.name}
                    onChange={(e) => setClaimForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={claimForm.email}
                    onChange={(e) => setClaimForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input
                    value={claimForm.phone}
                    onChange={(e) => setClaimForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="10-digit phone number"
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Name (Optional)</label>
                  <Input
                    value={claimForm.businessName}
                    onChange={(e) => setClaimForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder="Your PG/Business name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proof of Ownership *</label>
                  <textarea
                    value={claimForm.proofOfOwnership}
                    onChange={(e) => setClaimForm(f => ({ ...f, proofOfOwnership: e.target.value }))}
                    placeholder="Describe how you can prove ownership (e.g., property documents, utility bills, registration certificate)"
                    className="w-full px-3 py-2 border rounded-lg resize-none h-24"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowClaimModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};

export default PGDetailPage;
