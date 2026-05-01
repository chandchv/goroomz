import { motion } from 'framer-motion';
import { MapPin, Star, DollarSign, Wifi, Car, Coffee, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertySourceBadge from './PropertySourceBadge';
import propertyService from '@/services/propertyService';

/**
 * EnhancedPropertyCard Component
 * 
 * Displays property information with enhanced UI for both local and Amadeus properties.
 * Shows relevant metadata, amenities, and booking options.
 */
const EnhancedPropertyCard = ({ property, onClick, viewMode = 'grid' }) => {
  const isAmadeus = propertyService.isAmadeusProperty(property);
  const price = propertyService.getPropertyPrice(property);
  const rating = propertyService.getPropertyRating(property);
  const amenities = propertyService.getPropertyAmenities(property);

  // Determine pricing unit based on property category
  const getPricingUnit = () => {
    if (isAmadeus) return '/night';
    
    const category = property.category || property.type || '';
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('pg') || categoryLower.includes('paying guest')) {
      return '/month';
    }
    
    // Hotels, Homestays, Apartments default to per night
    return '/night';
  };
  
  const pricingUnit = getPricingUnit();

  // Get property image
  const getImage = () => {
    if (property.images && property.images.length > 0) {
      return property.images[0];
    }
    if (property.image) {
      return property.image;
    }
    return '/placeholder-property.jpg';
  };

  // Get property title
  const getTitle = () => {
    return property.title || property.name || 'Untitled Property';
  };

  // Get location string
  const getLocation = () => {
    if (property.address?.city) {
      return `${property.address.city}${property.address.countryCode ? `, ${property.address.countryCode}` : ''}`;
    }
    if (property.location?.city) {
      return property.location.city;
    }
    return 'Location not specified';
  };

  // Get distance if available
  const getDistance = () => {
    const distance = property.metadata?.distance?.value || property.distance?.value;
    const unit = property.metadata?.distance?.unit || property.distance?.unit || 'km';
    
    if (distance) {
      return `${distance.toFixed(1)} ${unit.toLowerCase()}`;
    }
    return null;
  };

  // Get amenity icons
  const getAmenityIcon = (amenity) => {
    const iconMap = {
      wifi: Wifi,
      parking: Car,
      restaurant: Coffee,
      coffee_maker: Coffee
    };
    return iconMap[amenity.toLowerCase()] || null;
  };

  // Render amenity badges
  const renderAmenities = () => {
    const displayAmenities = amenities.slice(0, 3);
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {displayAmenities.map((amenity, index) => {
          const Icon = getAmenityIcon(amenity);
          return (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600"
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span className="capitalize">{amenity.replace('_', ' ')}</span>
            </div>
          );
        })}
        {amenities.length > 3 && (
          <div className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
            +{amenities.length - 3} more
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
        onClick={() => onClick && onClick(property)}
      >
        <div className="flex">
          {/* Image */}
          <div className="relative w-64 h-48 flex-shrink-0">
            <img
              src={getImage()}
              alt={getTitle()}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <PropertySourceBadge property={property} size="sm" />
            </div>
            {rating && (
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                  {getTitle()}
                </h3>
                {price && (
                  <div className="flex items-center gap-1 text-purple-600 font-bold text-lg">
                    <DollarSign className="w-5 h-5" />
                    <span>{price}</span>
                    <span className="text-sm text-gray-500">{pricingUnit}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocation()}</span>
                </div>
                {getDistance() && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">•</span>
                    <span>{getDistance()} away</span>
                  </div>
                )}
              </div>

              {amenities.length > 0 && (
                <div className="mb-3">
                  {renderAmenities()}
                </div>
              )}

              {property.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {property.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                {isAmadeus && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Globe className="w-3 h-3" />
                    <span>Global Hotel</span>
                  </div>
                )}
              </div>
              <Button size="sm" className="px-6">
                View Details
                {isAmadeus && <ExternalLink className="w-3 h-3 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => onClick && onClick(property)}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={getImage()}
          alt={getTitle()}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
        <div className="absolute top-3 left-3">
          <PropertySourceBadge property={property} size="sm" />
        </div>
        {rating && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
          </div>
        )}
        {price && (
          <div className="absolute bottom-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-lg font-bold">
            ${price}{pricingUnit}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {getTitle()}
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{getLocation()}</span>
        </div>

        {getDistance() && (
          <div className="text-sm text-gray-500 mb-3">
            {getDistance()} away
          </div>
        )}

        {amenities.length > 0 && (
          <div className="mb-4">
            {renderAmenities()}
          </div>
        )}

        <Button className="w-full" size="sm">
          View Details
          {isAmadeus && <ExternalLink className="w-3 h-3 ml-2" />}
        </Button>
      </div>
    </motion.div>
  );
};

export default EnhancedPropertyCard;
