import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Star, Phone, Mail, X,
  Wifi, Car, Utensils, Shield, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Building, Calendar,
  Zap, Sparkles, BadgeCheck, Users, Home, Tv,
  Droplets, Flame, Lock, Eye, Wind, Coffee,
  Refrigerator, Dumbbell, Camera, BatteryCharging
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import propertyService from '@/services/propertyService';
import BookingModal from '@/components/BookingModal';
import bookingService from '@/services/bookingService';

// Amenity icon mapping
const amenityConfig = {
  wifi: { icon: Wifi, label: 'Wi-Fi' },
  parking: { icon: Car, label: 'Parking' },
  meals: { icon: Coffee, label: 'Meals' },
  ac: { icon: Wind, label: 'Air Conditioning' },
  tv: { icon: Tv, label: 'TV' },
  laundry: { icon: Droplets, label: 'Laundry' },
  'washing-machine': { icon: Droplets, label: 'Washing Machine' },
  kitchen: { icon: Utensils, label: 'Kitchen' },
  security: { icon: Lock, label: '24x7 Security' },
  cctv: { icon: Camera, label: 'CCTV' },
  gym: { icon: Dumbbell, label: 'Gym' },
  'power-backup': { icon: BatteryCharging, label: 'Power Backup' },
  'power backup': { icon: BatteryCharging, label: 'Power Backup' },
  geyser: { icon: Flame, label: 'Geyser' },
  'hot water': { icon: Flame, label: 'Hot Water' },
  'hot-water': { icon: Flame, label: 'Hot Water' },
  refrigerator: { icon: Refrigerator, label: 'Refrigerator' },
  housekeeping: { icon: Sparkles, label: 'Housekeeping' },
  'water supply': { icon: Zap, label: 'Water Supply' },
  'water-supply': { icon: Zap, label: 'Water Supply' },
  lift: { icon: Building, label: 'Lift' },
  terrace: { icon: Eye, label: 'Terrace' },
  balcony: { icon: Eye, label: 'Balcony' },
};

// Sharing type config
const sharingConfig = {
  single: { label: 'Private Room', desc: 'Entire room for yourself with all amenities', icon: '🛏️', guests: 1 },
  double: { label: 'Double Sharing', desc: 'Shared room for 2 with all amenities', icon: '🛏️🛏️', guests: 2 },
  triple: { label: 'Triple Sharing', desc: 'Shared room for 3 with all amenities', icon: '👥', guests: 3 },
  quad: { label: 'Quad Sharing', desc: 'Shared room for 4+ with all amenities', icon: '👨‍👩‍👧‍👦', guests: 4 },
};

const PGDetailPage = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({ name: '', email: '', phone: '', businessName: '', proofOfOwnership: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSharingType, setSelectedSharingType] = useState(null);
  const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', email: '' });

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
        room: property.id, name: bookingData.name, email: bookingData.email,
        phone: bookingData.phone, checkIn: bookingData.moveInDate, guests: 1,
        specialRequests: bookingData.specialRequests || '', bookingSource: 'online', status: 'pending'
      });
      if (response.success) {
        if (response.data.credentials) {
          toast({ title: "🎉 Booking Created & Account Created!", description: `Email: ${response.data.credentials.email}`, duration: 10000 });
        } else {
          toast({ title: "Booking Created! ✅", description: "Your booking has been created successfully!" });
        }
        setIsBookingModalOpen(false);
      }
    } catch (error) {
      toast({ title: "Booking Failed", description: error.message || "Failed to create booking.", variant: "destructive" });
    }
  };

  const handleEnquiry = (e) => {
    e.preventDefault();
    handleBookNow(null);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading property...</p>
      </div>
    </div>
  );

  if (!property) return null;

  const sharingPrices = property.pgOptions?.sharingPrices || property.metadata?.pgOptions?.sharingPrices || {};
  const sharingDailyPrices = property.pgOptions?.sharingDailyPrices || property.metadata?.pgOptions?.sharingDailyPrices || {};
  const lowestPrice = Math.min(...Object.values(sharingPrices).filter(p => p > 0), property.price || Infinity);
  const genderPref = property.metadata?.genderPreference;
  const genderLabel = genderPref === 'female' ? 'Ladies Only' : genderPref === 'male' ? 'Gents Only' : 'Co-ed';
  const isClaimed = property.metadata?.isClaimed;
  const images = property.images || [];
  const getImgUrl = (img) => typeof img === 'string' ? img : img?.url || '';

  return (
    <>
      <Helmet>
        <title>{property.name} - PG in {property.location?.area || property.location?.city || 'Bangalore'} | GoRoomz</title>
        <meta name="description" content={property.description} />
      </Helmet>

      <div className="min-h-screen bg-white">

        {/* ── Image Gallery ── */}
        <div className="relative bg-gray-100">
          {images.length > 0 ? (
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-1 md:h-[420px]">
                {/* Main large image */}
                <div className="md:col-span-2 md:row-span-2 relative overflow-hidden cursor-pointer group"
                  onClick={() => setShowAllPhotos(true)}>
                  <img src={getImgUrl(images[0])} alt={property.name}
                    className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                {/* Smaller images */}
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className="hidden md:block relative overflow-hidden cursor-pointer group"
                    onClick={() => { setCurrentImageIndex(i + 1); setShowAllPhotos(true); }}>
                    <img src={getImgUrl(img)} alt={`${property.name} ${i + 2}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {i === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">+{images.length - 5} Photos</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* View All Photos button */}
              <button onClick={() => setShowAllPhotos(true)}
                className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2">
                <Eye className="w-4 h-4" /> View All Photos
              </button>
              {/* Back button */}
              <button onClick={() => navigate(-1)}
                className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="h-64 md:h-96 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-center">
                <Home className="w-16 h-16 text-purple-300 mx-auto mb-2" />
                <p className="text-gray-400">No photos available</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Property Header ── */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    {[property.location?.address, property.location?.area, property.location?.city, property.location?.state]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">{genderLabel}</span>
                  {property.type && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase">{property.type}</span>}
                  {isClaimed && (
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {property.rating?.average > 0 && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {property.rating.average} ({property.rating.count || 0})
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Starting from</div>
                <div className="text-3xl font-bold text-purple-600">₹{lowestPrice === Infinity ? '—' : lowestPrice.toLocaleString()}</div>
                <div className="text-sm text-gray-500">/ month *</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">

              {/* Pricing Plans */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing Plans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(sharingPrices).filter(([, price]) => price > 0).map(([type, price]) => {
                    const config = sharingConfig[type] || { label: type, desc: 'Room with amenities', icon: '🛏️', guests: 1 };
                    const dailyPrice = sharingDailyPrices[type];
                    return (
                      <motion.div key={type} whileHover={{ y: -4 }}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-center">
                          <span className="text-4xl">{config.icon}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 mb-1">{config.label}</h3>
                          <p className="text-xs text-gray-500 mb-3">{config.desc}</p>
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-2xl font-bold text-purple-600">₹{price.toLocaleString()}</span>
                            <span className="text-sm text-gray-400">/ month *</span>
                          </div>
                          {dailyPrice > 0 && (
                            <p className="text-xs text-gray-400 mb-3">₹{dailyPrice.toLocaleString()} / day</p>
                          )}
                          <button onClick={() => handleBookNow(type)}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition">
                            Enquire Now
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  *Prices mentioned are starting prices and may vary as per availability & services. GST as applicable.
                </p>
              </section>

              {/* Trust Badges */}
              <section className="grid grid-cols-3 gap-4">
                {[
                  { icon: BadgeCheck, label: 'Zero Brokerage', color: 'text-green-600 bg-green-50' },
                  { icon: Sparkles, label: 'Fully Furnished', color: 'text-blue-600 bg-blue-50' },
                  { icon: Shield, label: 'Trusted Space', color: 'text-purple-600 bg-purple-50' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-100">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                  </div>
                ))}
              </section>

              {/* Location Map */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Where you'll stay</h2>
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {[property.location?.address, property.location?.area, property.location?.city, property.location?.state]
                    .filter(Boolean).join(', ')}
                </p>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={(() => {
                      const lat = property.location?.coordinates?.latitude;
                      const lng = property.location?.coordinates?.longitude;
                      const placeId = property.metadata?.googlePlaceId;
                      const key = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';
                      
                      if (placeId) {
                        return `https://www.google.com/maps/embed/v1/place?key=${key}&q=place_id:${placeId}`;
                      }
                      if (lat && lng) {
                        return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${lat},${lng}&zoom=16`;
                      }
                      const address = [property.location?.address, property.location?.area, property.location?.city, property.location?.state]
                        .filter(Boolean).join(', ');
                      return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(address)}`;
                    })()}
                    allowFullScreen
                  />
                </div>
              </section>

              {/* Amenities */}
              {property.amenities?.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {property.amenities.map((amenity) => {
                      const key = amenity.toLowerCase().replace(/\s+/g, '-');
                      const cfg = amenityConfig[key] || amenityConfig[amenity.toLowerCase()] || { icon: Shield, label: amenity };
                      const Icon = cfg.icon;
                      return (
                        <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 transition">
                          <Icon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 capitalize">{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* About */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">About this property</h2>
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              </section>

              {/* House Rules */}
              {property.rules?.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">House Rules</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {property.rules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{rule}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column — Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">

                {/* Enquiry Form */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Interested in this property?</h3>
                  <p className="text-sm text-gray-500 mb-4">Fill in your details and we'll get back to you</p>
                  <form onSubmit={handleEnquiry} className="space-y-3">
                    <input type="text" placeholder="Your Name" required
                      value={enquiryForm.name} onChange={(e) => setEnquiryForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    <input type="tel" placeholder="Phone Number" required
                      value={enquiryForm.phone} onChange={(e) => setEnquiryForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    <input type="email" placeholder="Email Address"
                      value={enquiryForm.email} onChange={(e) => setEnquiryForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    <button type="submit"
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition text-sm">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Schedule a Visit
                    </button>
                  </form>
                </div>

                {/* Contact Card */}
                {property.contactInfo?.phone && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Contact</h3>
                    <div className="space-y-3">
                      <a href={`tel:${property.contactInfo.phone}`}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition">
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">{property.contactInfo.phone}</span>
                      </a>
                      {property.contactInfo.email && (
                        <a href={`mailto:${property.contactInfo.email}`}
                          className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition">
                          <Mail className="w-5 h-5" />
                          <span className="font-medium text-sm">{property.contactInfo.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Claim CTA */}
                {!isClaimed && (
                  <button onClick={() => setShowClaimModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition text-sm font-medium">
                    <Building className="w-4 h-4" /> Own this PG? Claim it
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Full-screen Photo Gallery Modal ── */}
        <AnimatePresence>
          {showAllPhotos && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex flex-col">
              <div className="flex items-center justify-between p-4">
                <span className="text-white text-sm">{currentImageIndex + 1} / {images.length}</span>
                <button onClick={() => setShowAllPhotos(false)} className="text-white p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center relative px-4">
                <img src={getImgUrl(images[currentImageIndex])} alt="" className="max-h-[80vh] max-w-full object-contain" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length)}
                      className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={() => setCurrentImageIndex((p) => (p + 1) % images.length)}
                      className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnail strip */}
              <div className="p-4 flex gap-2 overflow-x-auto justify-center">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)}
                    className={`w-16 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition ${i === currentImageIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={getImgUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Booking Modal ── */}
        {isBookingModalOpen && (
          <BookingModal
            room={{ ...property, title: property.name,
              price: selectedSharingType && sharingPrices[selectedSharingType] ? sharingPrices[selectedSharingType] : Object.values(sharingPrices)[0] || 0,
              sharingType: selectedSharingType }}
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            onBook={handleBookRoom}
          />
        )}

        {/* ── Claim Modal ── */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Claim This Property</h2>
                <button onClick={() => setShowClaimModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Verification Required</p>
                    <p className="text-orange-700">Our team will verify your ownership before transferring control.</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Your Name *</label>
                  <Input value={claimForm.name} onChange={(e) => setClaimForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required /></div>
                <div><label className="block text-sm font-medium mb-1">Email *</label>
                  <Input type="email" value={claimForm.email} onChange={(e) => setClaimForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" required /></div>
                <div><label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input value={claimForm.phone} onChange={(e) => setClaimForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit number" pattern="[0-9]{10}" required /></div>
                <div><label className="block text-sm font-medium mb-1">Business Name</label>
                  <Input value={claimForm.businessName} onChange={(e) => setClaimForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Optional" /></div>
                <div><label className="block text-sm font-medium mb-1">Proof of Ownership *</label>
                  <textarea value={claimForm.proofOfOwnership} onChange={(e) => setClaimForm(f => ({ ...f, proofOfOwnership: e.target.value }))}
                    placeholder="Property documents, utility bills, etc." className="w-full px-3 py-2 border rounded-lg resize-none h-24 text-sm" required /></div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowClaimModal(false)}>Cancel</Button>
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
