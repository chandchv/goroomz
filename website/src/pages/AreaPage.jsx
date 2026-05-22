import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Star, Phone, Search, ChevronRight, CheckCircle,
  Building2, Users, Wifi, Car, Utensils, Shield, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getImageUrl } from '@/utils/imageUtils';
import Pagination from '@/components/Pagination';
import propertyService from '@/services/propertyService';
import SEOHead, { generateListingSchema, generateFAQSchema } from '@/components/SEOHead';

// Popular areas in Bangalore for internal linking
const POPULAR_AREAS = [
  'Koramangala', 'HSR Layout', 'BTM Layout', 'Whitefield', 'Electronic City',
  'Marathahalli', 'Indiranagar', 'Jayanagar', 'JP Nagar', 'Banashankari',
  'Hebbal', 'Yelahanka', 'Rajajinagar', 'Malleshwaram', 'Basavanagudi',
  'Bellandur', 'Sarjapur Road', 'Kengeri', 'Bannerghatta Road', 'Majestic',
  'MG Road', 'Brigade Road', 'Vijayanagar', 'Nagarbhavi', 'RT Nagar',
  'Hennur', 'Thanisandra', 'Kundanahalli', 'Brookefield', 'Domlur',
];

// Area-specific content for better SEO
const AREA_CONTENT = {
  'koramangala': {
    description: 'Koramangala is one of Bangalore\'s most sought-after neighborhoods for PG accommodation. Known for its vibrant startup culture, excellent restaurants, and proximity to major IT parks, it\'s ideal for working professionals and students.',
    nearbyLandmarks: ['Forum Mall', 'Sony World Signal', 'Jyoti Nivas College', 'BDA Complex', 'National Games Village'],
    connectivity: 'Well connected via Outer Ring Road, close to HSR Layout, BTM Layout, and Indiranagar. Metro connectivity via upcoming Koramangala station.',
  },
  'hsr layout': {
    description: 'HSR Layout is a premium residential area popular among IT professionals. With excellent infrastructure, parks, and proximity to Outer Ring Road tech parks, it offers a perfect blend of work-life balance.',
    nearbyLandmarks: ['Agara Lake', 'BDA Complex HSR', 'Sector 1-7 Parks', 'HSR BDA Complex'],
    connectivity: 'Direct access to Outer Ring Road, close to Koramangala, BTM Layout, and Bellandur. Well-served by BMTC buses.',
  },
  'jayanagar': {
    description: 'Jayanagar is one of Bangalore\'s oldest and most well-planned residential areas. Known for its tree-lined streets, excellent schools, shopping complexes, and cultural heritage, it\'s perfect for students and families.',
    nearbyLandmarks: ['Jayanagar Shopping Complex', 'Jayanagar 4th Block', 'Raghu Dayal Park', 'National College', 'Ashoka Pillar'],
    connectivity: 'Excellent metro connectivity (Green Line), close to JP Nagar, Basavanagudi, and BTM Layout. Well-connected by BMTC buses.',
  },
  'whitefield': {
    description: 'Whitefield is Bangalore\'s IT hub with major tech parks including ITPL, Prestige Tech Park, and numerous MNC offices. It\'s the top choice for IT professionals looking for PG accommodation near their workplace.',
    nearbyLandmarks: ['ITPL', 'Phoenix Marketcity', 'Prestige Tech Park', 'VR Bengaluru', 'Whitefield Railway Station'],
    connectivity: 'Connected via Whitefield Road and Old Airport Road. Purple Line Metro extension reaching Whitefield. Close to Marathahalli and Brookefield.',
  },
  'electronic city': {
    description: 'Electronic City is Bangalore\'s largest IT park area, home to Infosys, Wipro, TCS, and hundreds of other tech companies. PGs here are popular among freshers and IT professionals.',
    nearbyLandmarks: ['Infosys Campus', 'Wipro Campus', 'TCS', 'Electronic City Phase 1 & 2', 'Nandi Hills View'],
    connectivity: 'Connected via NICE Road and Hosur Road. Elevated Expressway to Silk Board. Close to Bommanahalli and Bannerghatta Road.',
  },
  'btm layout': {
    description: 'BTM Layout is a bustling residential area known for affordable PG accommodations, street food, and proximity to major IT corridors. Popular among students and young professionals.',
    nearbyLandmarks: ['Udupi Garden', 'BTM Lake', 'Silk Board Junction', 'Madiwala Market'],
    connectivity: 'Close to Silk Board, HSR Layout, and Koramangala. Well-connected via Outer Ring Road. Metro access via upcoming stations.',
  },
  'marathahalli': {
    description: 'Marathahalli is centrally located on the Outer Ring Road with easy access to major IT parks in Whitefield, Bellandur, and Sarjapur. It\'s a popular PG hub for IT professionals.',
    nearbyLandmarks: ['Marathahalli Bridge', 'Innovative Multiplex', 'Outer Ring Road', 'Kalamandir'],
    connectivity: 'On Outer Ring Road with direct access to Whitefield, Bellandur, and Sarjapur Road. Close to HAL Airport Road.',
  },
  'indiranagar': {
    description: 'Indiranagar is Bangalore\'s upscale neighborhood known for its vibrant nightlife, boutique shops, and excellent dining options. PGs here offer a premium living experience.',
    nearbyLandmarks: ['100 Feet Road', 'Indiranagar Metro Station', 'Defence Colony', 'CMH Road', 'Domlur'],
    connectivity: 'Purple Line Metro station (Indiranagar). Close to MG Road, Koramangala, and Domlur. Well-connected by BMTC.',
  },
};

// Generate FAQs for an area
function getAreaFAQs(area, count) {
  return [
    {
      question: `How many PGs are available in ${area}, Bangalore?`,
      answer: `GoRoomz lists ${count}+ verified PG accommodations in ${area}, Bangalore. Our listings include both boys and girls PGs with various amenities and price ranges.`,
    },
    {
      question: `What is the average rent for a PG in ${area}?`,
      answer: `PG rents in ${area} typically range from ₹5,000 to ₹15,000 per month depending on sharing type, amenities, and room quality. Single occupancy rooms are priced higher while triple/quad sharing options are more affordable.`,
    },
    {
      question: `Are there PGs for girls/ladies in ${area}?`,
      answer: `Yes, GoRoomz has multiple verified ladies PG accommodations in ${area} with features like 24x7 security, CCTV surveillance, and women-only floors.`,
    },
    {
      question: `Do PGs in ${area} provide food/meals?`,
      answer: `Many PGs in ${area} offer meal plans including breakfast, lunch, and dinner. You can filter PGs with food facility on GoRoomz to find the right one.`,
    },
    {
      question: `Is there any brokerage to pay on GoRoomz?`,
      answer: `No, GoRoomz is a zero-brokerage platform. You can directly contact PG owners and book without paying any middleman fees.`,
    },
    {
      question: `How do I book a PG in ${area} through GoRoomz?`,
      answer: `Simply search for PGs in ${area} on GoRoomz, compare options based on price, amenities, and reviews, then contact the owner directly or submit an enquiry. You can also schedule a visit before finalizing.`,
    },
  ];
}

const AreaPage = () => {
  const { areaSlug } = useParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState('');

  // Convert slug to area name
  const areaName = areaSlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const areaKey = areaName.toLowerCase();
  const areaContent = AREA_CONTENT[areaKey] || {
    description: `${areaName} is a popular residential area in Bangalore with numerous PG accommodations available for students and working professionals.`,
    nearbyLandmarks: [],
    connectivity: `Well connected to major areas in Bangalore via public transport.`,
  };

  const faqs = getAreaFAQs(areaName, pagination.total || 20);

  useEffect(() => {
    loadProperties();
  }, [areaSlug, currentPage, genderFilter]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const params = {
        area: areaName,
        page: currentPage,
        limit: 12,
        type: 'pg',
      };
      if (genderFilter) params.gender = genderFilter;

      const response = await propertyService.getProperties(params);
      if (response.success) {
        setProperties(response.data || []);
        setPagination(response.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({ title: "Error", description: "Failed to load properties", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCount = pagination.total || properties.length;
  const pageTitle = `${totalCount}+ PGs in ${areaName}, Bangalore - Verified PG Near ${areaName}`;
  const pageDescription = `Find ${totalCount}+ verified PGs near ${areaName}, Bangalore. Boys & Girls PG with WiFi, food, AC. Zero brokerage. Starting ₹5,000/month. Direct owner contact on GoRoomz.`;

  // Nearby areas for internal linking (exclude current area)
  const nearbyAreas = POPULAR_AREAS.filter(a => a.toLowerCase() !== areaKey).slice(0, 12);

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={`/pgs-in/${areaSlug}`}
        keywords={`PG in ${areaName}, PG near ${areaName}, paying guest ${areaName} Bangalore, boys PG ${areaName}, girls PG ${areaName}, PG accommodation ${areaName}, rooms near ${areaName}, hostel ${areaName} Bangalore`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'PGs in Bangalore', url: '/pgs' },
          { name: `PGs in ${areaName}`, url: `/pgs-in/${areaSlug}` },
        ]}
        structuredData={properties.length > 0 ? generateListingSchema(properties, `PGs in ${areaName}, Bangalore`, `/pgs-in/${areaSlug}`) : undefined}
        location={{ city: 'Bangalore', area: areaName }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white">
          <div className="container mx-auto px-4 py-10 md:py-14">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-purple-200 mb-4" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white transition">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/pgs" className="hover:text-white transition">PGs in Bangalore</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white font-medium">PGs in {areaName}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {totalCount}+ PGs in {areaName}, Bangalore
            </h1>
            <p className="text-purple-100 text-lg mb-6 max-w-2xl">
              Find verified PG accommodations near {areaName}. Boys & Girls PG with food, WiFi, AC and more. Zero brokerage, direct owner contact.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <Building2 className="w-4 h-4" />
                <span>{totalCount}+ PGs Available</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <CheckCircle className="w-4 h-4 text-green-300" />
                <span>Verified Listings</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <Shield className="w-4 h-4" />
                <span>Zero Brokerage</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white border-b sticky top-[72px] z-30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setGenderFilter('')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${
                  !genderFilter ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                All PGs
              </button>
              <button
                onClick={() => setGenderFilter('male')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${
                  genderFilter === 'male' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                👨 Boys PG
              </button>
              <button
                onClick={() => setGenderFilter('female')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${
                  genderFilter === 'female' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                👩 Girls PG
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/search?q=${encodeURIComponent(areaName)}`)}
                className="flex-shrink-0 text-purple-600 border-purple-200"
              >
                <Filter className="w-4 h-4 mr-1" /> More Filters
              </Button>
            </div>
          </div>
        </section>

        {/* Property Grid */}
        <section className="container mx-auto px-4 py-8">
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
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {genderFilter === 'male' ? 'Boys' : genderFilter === 'female' ? 'Girls' : 'All'} PGs in {areaName}
                <span className="text-sm font-normal text-gray-500 ml-2">({totalCount} results)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {properties.map((property, i) => {
                  const price = property.metadata?.pgOptions?.basePrice || property.price || 0;
                  const gender = property.metadata?.genderPreference;
                  const genderLabel = gender === 'female' ? 'Girls' : gender === 'male' ? 'Boys' : 'Co-ed';
                  const img = property.images?.[0];
                  const imgUrl = img ? getImageUrl(img) : null;
                  const isVerified = property.metadata?.isClaimed;

                  return (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(property.slug ? `/pg/${property.slug}` : `/property/${property.id}`)}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        {imgUrl ? (
                          <img src={imgUrl} alt={`${property.name} - PG in ${areaName}`} loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                            <span className="text-4xl">🏠</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {isVerified && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[11px] font-semibold rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-[11px] font-semibold rounded-full">
                            {genderLabel}
                          </span>
                        </div>
                        {property.rating?.average > 0 && (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold">{property.rating.average}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">{property.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                          <MapPin className="w-3 h-3" />
                          {property.location?.area || areaName}, {property.location?.city || 'Bangalore'}
                        </p>
                        {property.amenities?.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {property.amenities.slice(0, 3).map(a => (
                              <span key={a} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 capitalize">{a}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {price > 0 ? (
                            <div>
                              <span className="text-lg font-bold text-purple-600">₹{price.toLocaleString()}</span>
                              <span className="text-xs text-gray-400">/month</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Price on request</span>
                          )}
                          <button className="px-3 py-1.5 bg-purple-50 text-purple-600 text-xs font-semibold rounded-lg hover:bg-purple-100 transition">
                            View
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No PGs found in {areaName}</h3>
              <p className="text-gray-500 text-sm mb-4">Try searching in nearby areas</p>
              <Button onClick={() => navigate('/pgs')}>Browse All PGs</Button>
            </div>
          )}
        </section>

        {/* Area Description - SEO Content */}
        <section className="bg-white py-10 border-t">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                About PG Accommodation in {areaName}, Bangalore
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {areaContent.description}
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                GoRoomz lists {totalCount}+ verified PG accommodations in {areaName} with options for both boys and girls. 
                Whether you're looking for a single room, double sharing, or triple sharing PG near {areaName}, 
                you'll find affordable options starting from ₹5,000/month with amenities like WiFi, food, AC, and more.
              </p>

              {areaContent.connectivity && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Connectivity</h3>
                  <p className="text-gray-600">{areaContent.connectivity}</p>
                </div>
              )}

              {areaContent.nearbyLandmarks?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nearby Landmarks</h3>
                  <div className="flex flex-wrap gap-2">
                    {areaContent.nearbyLandmarks.map(landmark => (
                      <span key={landmark} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                        📍 {landmark}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-gray-50 py-10 border-t">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Frequently Asked Questions - PGs in {areaName}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <details key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                    <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 transition list-none flex items-center justify-between">
                      {faq.question}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
              {/* FAQ Schema */}
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />
            </div>
          </div>
        </section>

        {/* Nearby Areas - Internal Linking */}
        <section className="bg-white py-10 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              PGs in Other Areas Near {areaName}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Explore PG accommodations in nearby areas of Bangalore
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {nearbyAreas.map(area => (
                <Link
                  key={area}
                  to={`/pgs-in/${area.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition text-center font-medium"
                >
                  PGs in {area}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-10">
          <div className="container mx-auto px-4 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Can't find what you're looking for?</h2>
            <p className="text-purple-100 mb-6">Search across all areas in Bangalore or contact us for help</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-purple-50"
                onClick={() => navigate('/search?q=')}
              >
                <Search className="w-4 h-4 mr-2" /> Search All PGs
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate('/pgs')}
              >
                Browse All Areas
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AreaPage;
