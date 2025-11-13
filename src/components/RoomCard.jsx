import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Star, Wifi, Utensils, Car } from 'lucide-react';

const RoomCard = ({ room, onClick, index, viewMode = 'grid' }) => {
  const amenityIcons = {
    wifi: Wifi,
    meals: Utensils,
    parking: Car
  };

  // Get display price based on category and pricing type
  const getPriceDisplay = () => {
    const pricingUnit = room.pricingType === 'daily' ? '/night' : '/month';
    
    if (room.category === 'PG' && room.pgOptions?.sharingPrices) {
      // Show starting from lowest PG price
      const prices = Object.values(room.pgOptions.sharingPrices).filter(p => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        return { price: minPrice, unit: pricingUnit, prefix: 'From ' };
      }
    } else if (room.category === 'Hotel Room' && room.hotelPrices) {
      // Show starting from lowest hotel price
      const prices = Object.values(room.hotelPrices).filter(p => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        return { price: minPrice, unit: pricingUnit, prefix: 'From ' };
      }
    }
    
    // Default to base price
    return { price: room.price, unit: pricingUnit, prefix: '' };
  };

  const priceInfo = getPriceDisplay();

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="glass-effect rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300 flex"
      >
        <div className="relative w-80 h-48 overflow-hidden flex-shrink-0">
          <img 
            src={room.images?.[0]?.url || room.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3 glass-effect px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{room.rating?.average || 4.5}</span>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xl font-bold line-clamp-1">{room.title}</h3>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                {typeof room.location === 'object' 
                  ? `${room.location?.city || ''}, ${room.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                  : room.location}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{room.maxGuests} guests</span>
              </div>
              <span>•</span>
              <span>{room.roomType}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {room.amenities.slice(0, 4).map((amenity) => {
                const Icon = amenityIcons[amenity] || Wifi;
                return (
                  <div key={amenity} className="px-2 py-1 bg-purple-100 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {amenity}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {priceInfo.prefix && <span className="text-xs text-muted-foreground block">{priceInfo.prefix}</span>}
              <span className="text-2xl font-bold gradient-text">₹{priceInfo.price}</span>
              <span className="text-sm text-muted-foreground">{priceInfo.unit}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg"
            >
              View Details
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onClick}
      className="glass-effect rounded-3xl overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      <div className="relative h-56 overflow-hidden">
        <img 
          src={room.images?.[0]?.url || room.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
          alt={room.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 glass-effect px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{room.rating?.average || 4.5}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">
              {typeof room.location === 'object' 
                ? `${room.location?.city || ''}, ${room.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                : room.location}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="text-xl font-bold line-clamp-1">{room.title}</h3>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{room.maxGuests} guests</span>
          </div>
          <span>•</span>
          <span>{room.roomType}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {room.amenities.slice(0, 3).map((amenity) => {
            const Icon = amenityIcons[amenity] || Wifi;
            return (
              <div key={amenity} className="px-3 py-1 bg-purple-100 rounded-full text-xs font-medium text-purple-700 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {amenity}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            {priceInfo.prefix && <span className="text-xs text-muted-foreground block">{priceInfo.prefix}</span>}
            <span className="text-2xl font-bold gradient-text">₹{priceInfo.price}</span>
            <span className="text-sm text-muted-foreground">{priceInfo.unit}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg"
          >
            View Details
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;