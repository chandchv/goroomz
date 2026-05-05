import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Star, Wifi, Utensils, Car, Building2, Home, BedDouble, Shield } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUtils';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

const amenityIcons = {
  wifi: Wifi,
  meals: Utensils,
  parking: Car,
};

const typeConfig = {
  pg: { label: 'PG', color: 'blue', icon: Building2 },
  hostel: { label: 'Hostel', color: 'indigo', icon: Building2 },
  hotel: { label: 'Hotel', color: 'green', icon: BedDouble },
  apartment: { label: 'Apartment', color: 'purple', icon: Home },
};

/**
 * PropertyCard — displays a Property (from the properties table).
 * Works with both Property model data and Room model data for backward compat.
 */
const PropertyCard = ({ property, onClick, index = 0, viewMode = 'grid' }) => {
  const title = property.title || property.name || 'Untitled Property';
  const type = property.type || '';
  const config = typeConfig[type] || { label: property.category || type, color: 'gray', icon: Building2 };

  // --- location ---
  const getLocationText = () => {
    if (typeof property.location === 'object' && property.location) {
      const parts = [property.location.area, property.location.city, property.location.state].filter(Boolean);
      return parts.join(', ') || 'Location not specified';
    }
    return typeof property.location === 'string' ? property.location : 'Location not specified';
  };

  // --- image ---
  const getImage = () => {
    if (property.images && property.images.length > 0) {
      const first = property.images[0];
      const url = typeof first === 'string' ? first : first?.url;
      return getImageUrl ? getImageUrl(first) || url || FALLBACK_IMAGE : url || FALLBACK_IMAGE;
    }
    return property.image || FALLBACK_IMAGE;
  };

  // --- price ---
  const getPriceDisplay = () => {
    const isPG = type === 'pg' || type === 'hostel' || (property.category || '').toLowerCase().includes('pg');
    const unit = isPG ? '/month' : '/night';

    // PG sharing prices from metadata
    if (property.metadata?.pgOptions?.sharingPrices) {
      const prices = Object.values(property.metadata.pgOptions.sharingPrices).filter(p => p > 0);
      if (prices.length > 0) return { price: Math.min(...prices), unit, prefix: 'From ' };
    }
    // PG options on room-format data
    if (property.pgOptions?.sharingPrices) {
      const prices = Object.values(property.pgOptions.sharingPrices).filter(p => p > 0);
      if (prices.length > 0) return { price: Math.min(...prices), unit, prefix: 'From ' };
    }
    // Hotel prices
    if (property.hotelPrices) {
      const prices = Object.values(property.hotelPrices).filter(p => p > 0);
      if (prices.length > 0) return { price: Math.min(...prices), unit, prefix: 'From ' };
    }
    // Base price from metadata
    if (property.metadata?.pgOptions?.basePrice) {
      return { price: property.metadata.pgOptions.basePrice, unit, prefix: '' };
    }
    // Direct price field
    if (property.price && Number(property.price) > 0) {
      return { price: Number(property.price), unit, prefix: '' };
    }
    return { price: null, unit, prefix: '' };
  };

  // --- rating ---
  const getRating = () => {
    if (typeof property.rating === 'number') return property.rating;
    if (property.rating?.average) return property.rating.average;
    return null;
  };

  const priceInfo = getPriceDisplay();
  const rating = getRating();
  const amenities = property.amenities || [];
  const locationText = getLocationText();
  const imageSrc = getImage();
  const TypeIcon = config.icon;

  // ==================== LIST VIEW ====================
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="bg-white rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300 flex"
      >
        {/* Image */}
        <div className="relative w-72 h-48 overflow-hidden flex-shrink-0">
          <img src={imageSrc} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          {rating && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold">{rating}</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-${config.color}-100 text-${config.color}-700`}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold line-clamp-1">{title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{locationText}</span>
            </div>
            {amenities.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {amenities.slice(0, 4).map(a => {
                  const Icon = amenityIcons[a] || Shield;
                  return (
                    <span key={a} className="px-2 py-0.5 bg-purple-50 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1">
                      <Icon className="w-3 h-3" /> {a}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t mt-3">
            {priceInfo.price ? (
              <div>
                {priceInfo.prefix && <span className="text-xs text-gray-500">{priceInfo.prefix}</span>}
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ₹{Number(priceInfo.price).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-gray-500">{priceInfo.unit}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Price on request</span>
            )}
            <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold shadow-md group-hover:shadow-lg transition-shadow">
              View Details
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ==================== GRID VIEW (default) ====================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img src={imageSrc} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        {rating && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{rating}</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm shadow-sm text-${config.color}-700`}>
            <TypeIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>
        {property.isFeatured && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 shadow-sm">
              ⭐ Featured
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center gap-1.5 text-white">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm font-medium line-clamp-1">{locationText}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-bold line-clamp-1 text-gray-900">{title}</h3>

        {property.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{property.description}</p>
        )}

        {amenities.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {amenities.slice(0, 3).map(a => {
              const Icon = amenityIcons[a] || Shield;
              return (
                <span key={a} className="px-2.5 py-1 bg-purple-50 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {a}
                </span>
              );
            })}
            {amenities.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500">
                +{amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {priceInfo.price ? (
            <div>
              {priceInfo.prefix && <span className="text-xs text-gray-500 block">{priceInfo.prefix}</span>}
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ₹{Number(priceInfo.price).toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-gray-500">{priceInfo.unit}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">Price on request</span>
          )}
          <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold shadow-md group-hover:shadow-lg transition-shadow">
            View Details
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
