import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Star, Phone, ArrowRight, CheckCircle,
  Building2, BedDouble, Home, Shield, Wifi, Utensils, Car,
  Users, TrendingUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import SmartSearchBar from '@/components/SmartSearchBar';
import { getImageUrl } from '@/utils/imageUtils';
import propertyService from '@/services/propertyService';
import apiService from '@/services/api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

// ─── Quick filter definitions ────────────────────────────────
const QUICK_FILTERS = [
  { label: 'Boys PG', icon: '👨', params: { gender: 'male' } },
  { label: 'Girls PG', icon: '👩', params: { gender: 'female' } },
  { label: 'With Food', icon: '🍽️', params: { amenities: 'meals' } },
  { label: 'With WiFi', icon: '📶', params: { amenities: 'wifi' } },
  { label: 'Under ₹8,000', icon: '💰', params: { maxPrice: 8000 } },
  { label: 'AC Rooms', icon: '❄️', params: { amenities: 'ac' } },
];

// ─── Amenity icons ───────────────────────────────────────────
const amenityIcons = { wifi: Wifi, meals: Utensils, parking: Car, security: Shield };

// ─── Small helper: price display ─────────────────────────────
function getPrice(p) {
  if (p.metadata?.pgOptions?.sharingPrices) {
    const vals = Object.values(p.metadata.pgOptions.sharingPrices).filter(v => v > 0);
    if (vals.length) return Math.min(...vals);
  }
  if (p.metadata?.pgOptions?.basePrice) return p.metadata.pgOptions.basePrice;
  if (p.price && Number(p.price) > 0) return Number(p.price);
  return null;
}

function getLocation(p) {
  if (!p.location || typeof p.location !== 'object') return '';
  return [p.location.area, p.location.city].filter(Boolean).join(', ');
}

function getGender(p) {
  const g = p.metadata?.genderPreference;
  if (g === 'male') return 'Boys';
  if (g === 'female') return 'Girls';
  return 'Co-ed';
}

function getImg(p) {
  if (p.images?.length) {
    const first = p.images[0];
    return getImageUrl ? getImageUrl(first) || (typeof first === 'string' ? first : first?.url) || FALLBACK_IMG : FALLBACK_IMG;
  }
  return FALLBACK_IMG;
}

// ═════════════════════════════════════════════════════════════
// HomePage Component
// ═════════════════════════════════════════════════════════════
const HomePage = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [nearbyProperties, setNearbyProperties] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [stats, setStats] = useState({ total: 0, topAreas: [] });
  const [activeFilter, setActiveFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState('');

  // Request user location and load nearby properties
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          // Fetch nearby properties
          propertyService.getNearbyProperties(latitude, longitude, { limit: 12, radius: 15 })
            .then(res => {
              if (res.success && res.data?.length > 0) {
                setNearbyProperties(res.data);
                // Use the area of the first result as location label
                const firstArea = res.data[0]?.location?.area;
                setLocationLabel(firstArea || 'your area');
              }
            })
            .catch(() => {});
        },
        () => { /* Permission denied or error — just show featured */ },
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  // Load featured data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [featuredRes, statsRes, areasRes] = await Promise.all([
          propertyService.getFeaturedProperties().catch(() => ({ success: false, data: [] })),
          apiService.get('/properties/stats', { includeAuth: false }).catch(() => ({ success: false, data: { total: 3000, topAreas: [] } })),
          propertyService.getAreas().catch(() => ({ success: false, data: [] })),
        ]);

        let propertyList = featuredRes.success ? (featuredRes.data || []) : [];

        // If featured properties are too few, load more regular properties
        if (propertyList.length < 8) {
          try {
            const moreRes = await propertyService.getProperties({ limit: 12, page: 1 });
            if (moreRes.success && moreRes.data) {
              // Merge: keep featured first, then add non-duplicates
              const existingIds = new Set(propertyList.map(p => p.id));
              const additional = moreRes.data.filter(p => !existingIds.has(p.id));
              propertyList = [...propertyList, ...additional].slice(0, 12);
            }
          } catch (_) {}
        }

        setProperties(propertyList);
        if (statsRes.success) setStats(statsRes.data);
        if (areasRes.success && areasRes.data) {
          // Store areas in stats for the area section
          setStats(prev => ({ ...prev, areas: areasRes.data }));
        }
      } catch (e) {
        console.error('Home load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Quick filter handler
  const handleQuickFilter = async (filter, index) => {
    if (activeFilter === index) {
      // Deselect — reload featured
      setActiveFilter(null);
      setIsLoading(true);
      try {
        const res = await propertyService.getFeaturedProperties();
        if (res.success) setProperties(res.data || []);
      } catch (_) {}
      setIsLoading(false);
      return;
    }
    setActiveFilter(index);
    setIsLoading(true);
    try {
      const res = await propertyService.getProperties({ ...filter.params, limit: 8 });
      if (res.success) setProperties(res.data || []);
    } catch (_) {}
    setIsLoading(false);
  };

  const handlePropertyClick = (p) => {
    const isPG = (p.type || '').toLowerCase() === 'pg' || (p.type || '').toLowerCase() === 'hostel';
    navigate(isPG && p.slug ? `/pg/${p.slug}` : `/property/${p.slug || p.id}`);
  };

  const handleCall = (e, p) => {
    e.stopPropagation();
    const phone = p.contactInfo?.phone || p.contactInfo?.phones?.[0];
    if (phone) window.open(`tel:${phone}`, '_self');
    else toast({ title: 'No phone available', description: 'Try the enquiry form on the property page.' });
  };

  const handleEnquire = (e, p) => {
    e.stopPropagation();
    handlePropertyClick(p);
  };

  const totalCount = stats.total || properties.length || 0;

  return (
    <>
      <Helmet>
        <title>GoRoomz — Find Verified PGs & Rooms in Bangalore | Zero Brokerage</title>
        <meta name="description" content={`Browse ${totalCount}+ verified PGs, hostels, and rooms in Bangalore. Direct owner contact, zero brokerage. Boys & Girls PG with WiFi, food, AC in Koramangala, HSR Layout, Whitefield & more.`} />
        <meta name="keywords" content="PG in Bangalore, paying guest near me, PG accommodation Bangalore, boys PG, girls PG, PG with food, hostel Bangalore, rooms for rent, zero brokerage PG, GoRoomz" />
        <link rel="canonical" href="https://goroomz.in/" />
        <meta property="og:title" content="GoRoomz — Find Verified PGs & Rooms in Bangalore | Zero Brokerage" />
        <meta property="og:description" content={`Browse ${totalCount}+ verified PGs in Bangalore. Zero brokerage, direct owner contact.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://goroomz.in/" />
        <meta property="og:image" content="https://goroomz.in/logo-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "GoRoomz - Find Verified PGs & Rooms in Bangalore",
          "description": `Browse ${totalCount}+ verified PGs, hostels, and rooms in Bangalore with zero brokerage.`,
          "url": "https://goroomz.in/",
          "isPartOf": { "@type": "WebSite", "name": "GoRoomz", "url": "https://goroomz.in" }
        })}</script>
      </Helmet>

      {/* ═══════ SECTION 1 — HERO ═══════ */}
      <section className="bg-gradient-to-b from-purple-700 via-purple-600 to-purple-500 text-white">
        <div className="container mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-3xl md:text-5xl font-bold leading-tight"
            >
              Find Verified PGs &amp; Rooms
              <span className="block text-yellow-300">Near You</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-purple-100 text-lg md:text-xl"
            >
              Book directly with owners. Zero brokerage. Real listings.
            </motion.p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <SmartSearchBar placeholder="Search by area (e.g. Whitefield, Koramangala)" />
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-4 text-sm"
            >
              {['Verified Listings', 'Direct Owner Contact', 'No Middlemen'].map(t => (
                <span key={t} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-green-300" /> {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 2 — QUICK FILTERS ═══════ */}
      <section className="bg-white border-b sticky top-[72px] z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {QUICK_FILTERS.map((f, i) => (
              <button
                key={f.label}
                onClick={() => handleQuickFilter(f, i)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all
                  ${activeFilter === i
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
              >
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 3 — LISTINGS ═══════ */}
      <section className="bg-gray-50 py-10 md:py-14">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {activeFilter !== null ? QUICK_FILTERS[activeFilter].label : 'Verified PGs Near You'}
              </h2>
              {totalCount > 0 && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-600">{totalCount.toLocaleString()}+</span> PGs available in Bangalore
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pgs')}
              className="hidden sm:flex items-center gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Nearby Properties Section */}
          {nearbyProperties.length > 0 && !activeFilter && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    📍 PGs Near {locationLabel || 'You'}
                  </h2>
                  <p className="text-sm text-gray-500">Based on your current location</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {nearbyProperties.slice(0, 8).map((p, i) => {
                  const price = p.price || p.metadata?.pgOptions?.basePrice || 0;
                  const loc = p.location?.area || p.location?.city || '';
                  const img = p.images?.[0];
                  const imgUrl = img ? (typeof img === 'string' ? img : img.url) : null;
                  const finalImgUrl = imgUrl && imgUrl.includes('maps.googleapis.com') && !imgUrl.includes('key=')
                    ? imgUrl + '&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8' : imgUrl;
                  return (
                    <div key={p.id} onClick={() => navigate(p.type === 'pg' && p.slug ? `/pg/${p.slug}` : `/property/${p.id}`)}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group">
                      <div className="relative h-44 bg-gray-100 overflow-hidden">
                        {finalImgUrl ? (
                          <img src={finalImgUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=60'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50"><span className="text-4xl">🏠</span></div>
                        )}
                        {p.distance && (
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-700">
                            📍 {p.distance} km away
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{loc}</p>
                        {price > 0 && (
                          <span className="text-purple-600 font-bold text-sm">₹{price.toLocaleString()}<span className="text-gray-400 font-normal text-xs"> /month</span></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {properties.map((p, i) => {
                const price = getPrice(p);
                const loc = getLocation(p);
                const gender = getGender(p);
                const img = getImg(p);
                const amenities = (p.amenities || []).slice(0, 3);
                const hasPhone = !!(p.contactInfo?.phone || p.contactInfo?.phones?.length);

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handlePropertyClick(p)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img src={img} alt={p.name || p.title} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {/* Badges */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                        <span className="px-2 py-0.5 bg-green-500 text-white text-[11px] font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-[11px] font-semibold rounded-full">
                          {gender}
                        </span>
                      </div>
                      {/* Rating */}
                      {p.rating?.average > 0 && (
                        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{p.rating.average}</span>
                        </div>
                      )}
                      {/* Location overlay */}
                      {loc && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                          <span className="text-white text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {loc}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">{p.name || p.title}</h3>

                      {/* Price */}
                      <div className="mb-2">
                        {price ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-purple-600">₹{price.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-gray-400">/month</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Price on request</span>
                        )}
                      </div>

                      {/* Amenities */}
                      {amenities.length > 0 && (
                        <div className="flex gap-1.5 mb-3">
                          {amenities.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-600 capitalize">{a}</span>
                          ))}
                        </div>
                      )}

                      {/* CTA Buttons */}
                      <div className="flex gap-2">
                        {hasPhone && (
                          <button
                            onClick={(e) => handleCall(e, p)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition border border-green-200"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </button>
                        )}
                        <button
                          onClick={(e) => handleEnquire(e, p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition border border-purple-200"
                        >
                          <Search className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No properties found</h3>
              <p className="text-gray-500 text-sm mb-4">Try a different filter or search above</p>
              <Button onClick={() => { setActiveFilter(null); navigate('/pgs'); }}>Browse All PGs</Button>
            </div>
          )}

          {/* Mobile View All */}
          {properties.length > 0 && (
            <div className="sm:hidden text-center mt-6">
              <Button variant="outline" onClick={() => navigate('/pgs')} className="text-purple-600 border-purple-200">
                View All {totalCount}+ PGs <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ SECTION 4 — HOW IT WORKS ═══════ */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Search', desc: 'Find PGs in your area by location, budget, or amenities.', emoji: '🔍' },
              { step: '2', title: 'Compare', desc: 'Check verified details, photos, pricing, and reviews.', emoji: '📋' },
              { step: '3', title: 'Contact', desc: 'Talk directly to the owner. No brokers, no middlemen.', emoji: '📞' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                  {item.emoji}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 5 — TRUST / WHY GOROOMZ ═══════ */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Why Choose GoRoomz?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Building2, value: `${totalCount.toLocaleString()}+`, label: 'PGs Listed', color: 'text-purple-600 bg-purple-50' },
              { icon: CheckCircle, value: 'Verified', label: 'Owner Details', color: 'text-green-600 bg-green-50' },
              { icon: Zap, value: '₹0', label: 'Brokerage', color: 'text-yellow-600 bg-yellow-50' },
              { icon: Phone, value: 'Direct', label: 'Owner Contact', color: 'text-blue-600 bg-blue-50' },
            ].map(({ icon: Icon, value, label, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </motion.div>
            ))}
          </div>

          {/* Top areas */}
          {(stats.areas?.length > 0 || stats.topAreas?.length > 0) && (
            <div className="mt-10 text-center">
              <p className="text-sm text-gray-500 mb-3">Popular areas</p>
              <div className="flex flex-wrap justify-center gap-2">
                {(stats.areas || stats.topAreas || []).slice(0, 12).map(a => (
                  <Link
                    key={a.area}
                    to={`/pgs-in/${a.area.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-purple-300 hover:text-purple-600 transition"
                  >
                    {a.area} <span className="text-gray-400">({a.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ SECTION 6 — AREA LINKS (SEO) ═══════ */}
      <section className="bg-white py-12 md:py-16 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3">
            Find PGs by Area in Bangalore
          </h2>
          <p className="text-gray-500 text-center mb-8 max-w-2xl mx-auto">
            Browse verified PG accommodations across popular neighborhoods in Bangalore
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {[
              { name: 'Koramangala', slug: 'koramangala', count: '200+' },
              { name: 'HSR Layout', slug: 'hsr-layout', count: '150+' },
              { name: 'BTM Layout', slug: 'btm-layout', count: '180+' },
              { name: 'Whitefield', slug: 'whitefield', count: '250+' },
              { name: 'Electronic City', slug: 'electronic-city', count: '300+' },
              { name: 'Marathahalli', slug: 'marathahalli', count: '120+' },
              { name: 'Indiranagar', slug: 'indiranagar', count: '80+' },
              { name: 'Jayanagar', slug: 'jayanagar', count: '100+' },
              { name: 'JP Nagar', slug: 'jp-nagar', count: '90+' },
              { name: 'Banashankari', slug: 'banashankari', count: '70+' },
              { name: 'Hebbal', slug: 'hebbal', count: '60+' },
              { name: 'Bellandur', slug: 'bellandur', count: '140+' },
              { name: 'Sarjapur Road', slug: 'sarjapur-road', count: '110+' },
              { name: 'Malleshwaram', slug: 'malleshwaram', count: '50+' },
              { name: 'Rajajinagar', slug: 'rajajinagar', count: '45+' },
            ].map(area => (
              <Link
                key={area.slug}
                to={`/pgs-in/${area.slug}`}
                className="flex flex-col items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition group"
              >
                <span className="text-sm font-semibold text-gray-800 group-hover:text-purple-700 text-center">
                  PGs in {area.name}
                </span>
                <span className="text-xs text-gray-400 mt-1">{area.count} PGs</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/pgs" className="text-purple-600 text-sm font-medium hover:underline">
              View all areas →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 7 — OWNER CTA ═══════ */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-8 md:p-12 text-white max-w-4xl mx-auto">
            <div className="md:flex md:items-center md:justify-between md:gap-8">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Are You a PG Owner?</h2>
                <p className="text-purple-200 mb-4">Get more tenants and manage your property easily.</p>
                <ul className="space-y-2 text-sm">
                  {['Free listing — no charges', 'Direct tenant enquiries', 'Booking management dashboard'].map(t => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                <Button
                  size="lg"
                  className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-8"
                  onClick={() => navigate('/signup')}
                >
                  List Your PG Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-medium"
                  onClick={() => navigate('/about')}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
