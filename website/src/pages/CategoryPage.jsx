import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2, MapPin, Star, ChevronLeft, ChevronRight, Phone, BadgeCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Pagination from '@/components/Pagination';
import categoryService from '@/services/categoryService';
import propertyService from '@/services/propertyService';

const ITEMS_PER_PAGE = 24;

// Map category URL param to property type
const getCategoryType = (name) => {
  const map = { 'pg': 'pg', 'hotel room': 'hotel', 'home stay': 'apartment', 'independent home': 'apartment', 'hostel': 'hostel' };
  return map[name.toLowerCase()] || null;
};

import { getImageUrl as getImgUrl, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

// Property Card Component
const PropertyCard = ({ property, onClick }) => {
  const [imgIndex, setImgIndex] = useState(0);
  const images = (property.images || []).filter(img => getImgUrl(img));
  const name = property.name || property.title || 'Unnamed Property';
  const area = property.location?.area || '';
  const city = property.location?.city || '';
  const location = [area, city].filter(Boolean).join(', ');
  const price = property.metadata?.pgOptions?.basePrice || property.price || 0;
  const rating = property.rating?.average || null;
  const ratingCount = property.rating?.count || 0;

  const nextImg = (e) => { e.stopPropagation(); setImgIndex(i => (i + 1) % Math.max(images.length, 1)); };
  const prevImg = (e) => { e.stopPropagation(); setImgIndex(i => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1)); };
  const isVerified = property.metadata?.isClaimed;

  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* Image */}
      <div className="relative h-52 bg-gray-100 overflow-hidden">
        {images.length > 0 ? (
          <img
            src={getImgUrl(images[imgIndex])}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
            <span className="text-5xl">🏠</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
        {rating && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {rating}
          </div>
        )}
        {isVerified && (
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold shadow">
            <BadgeCheck className="w-3 h-3" /> Verified
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{name}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{location || 'Bangalore'}</span>
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-purple-600">₹{price > 0 ? price.toLocaleString() : '—'}</span>
            <span className="text-xs text-gray-400"> / month</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArea, setSelectedArea] = useState(null);

  // Extract unique areas from areas API response
  const [availableAreas, setAvailableAreas] = useState([]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const decodedCategory = decodeURIComponent(categoryName);
        const categoryType = getCategoryType(decodedCategory);

        // Load category info
        const catRes = await categoryService.getCategoryByName(decodedCategory);
        if (catRes.success) setCategoryInfo(catRes.data);

        // Fetch properties
        const params = { page: currentPage, limit: ITEMS_PER_PAGE };
        if (categoryType) params.type = categoryType;
        if (selectedArea) params.area = selectedArea;

        const res = await propertyService.getProperties(params);
        if (res.success) {
          setProperties(res.data || []);
          setPagination(res.pagination || { page: 1, totalPages: 1, total: (res.data || []).length });
        }

        // Fetch areas separately (only on first load without area filter)
        if (!selectedArea && currentPage === 1) {
          try {
            const areasRes = await propertyService.getAreas(categoryType);
            if (areasRes.success && areasRes.data) {
              setAvailableAreas(areasRes.data.slice(0, 25));
            }
          } catch (e) {
            console.warn('Failed to load areas:', e);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast({ title: "Error", description: "Failed to load properties.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [categoryName, currentPage, selectedArea]);

  const handleAreaClick = (area) => {
    if (selectedArea === area) {
      setSelectedArea(null);
    } else {
      setSelectedArea(area);
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePropertyClick = (property) => {
    const isPG = (property.type || '').toLowerCase() === 'pg';
    if (isPG && property.slug) {
      navigate(`/pg/${property.slug}`);
    } else {
      navigate(`/property/${property.id}`);
    }
  };

  const displayName = categoryInfo?.displayInfo?.title || categoryName;

  return (
    <>
      <Helmet>
        <title>{displayName} in {selectedArea || 'Bangalore'} - {pagination.total}+ Verified Properties | GoRoomz</title>
        <meta name="description" content={`Find ${pagination.total}+ verified ${displayName.toLowerCase()} accommodations${selectedArea ? ` in ${selectedArea}` : ''} in Bangalore. Browse with photos, prices, amenities & reviews. Zero brokerage, direct owner contact on GoRoomz.`} />
        <meta name="keywords" content={`${displayName} in ${selectedArea || 'Bangalore'}, ${displayName.toLowerCase()} accommodation, ${displayName.toLowerCase()} near me, verified ${displayName.toLowerCase()}, GoRoomz`} />
        <link rel="canonical" href={`https://goroomz.in/category/${encodeURIComponent(categoryName)}`} />
        <meta property="og:title" content={`${pagination.total}+ ${displayName} in ${selectedArea || 'Bangalore'} | GoRoomz`} />
        <meta property="og:description" content={`Browse verified ${displayName.toLowerCase()} in Bangalore. Zero brokerage.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://goroomz.in/category/${encodeURIComponent(categoryName)}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `${displayName} in ${selectedArea || 'Bangalore'}`,
          "description": `Find ${pagination.total}+ verified ${displayName.toLowerCase()} accommodations in Bangalore`,
          "url": `https://goroomz.in/category/${encodeURIComponent(categoryName)}`,
          "numberOfItems": pagination.total,
          "isPartOf": { "@type": "WebSite", "name": "GoRoomz", "url": "https://goroomz.in" }
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {displayName} in Bangalore
            </h1>
            <p className="text-gray-500 mt-1">
              {isLoading ? 'Loading...' : `${pagination.total} properties available`}
              {selectedArea && <span className="text-purple-600 font-medium"> in {selectedArea}</span>}
            </p>
          </div>
        </div>

        {/* Area Pills */}
        {availableAreas.length > 0 && (
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="container mx-auto px-4">
              <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
                {availableAreas.map(({ area }) => (
                  <button
                    key={area}
                    onClick={() => handleAreaClick(area)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                      selectedArea === area
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Property Grid */}
        <div className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-gray-500">Loading properties...</p>
              </div>
            </div>
          ) : properties.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => handlePropertyClick(property)}
                  />
                ))}
              </div>

              {/* Pagination */}
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
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No {displayName} Found {selectedArea && `in ${selectedArea}`}
              </h3>
              <p className="text-gray-500 mb-4">
                {selectedArea
                  ? 'Try selecting a different area or clear the filter.'
                  : `We don't have any ${displayName.toLowerCase()} available at the moment.`}
              </p>
              {selectedArea && (
                <button
                  onClick={() => { setSelectedArea(null); setCurrentPage(1); }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryPage;
