import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Star, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import EditRoomModal from '@/components/EditRoomModal';

const RoomModal = ({ room, isOpen, onClose, onUpdate, onDelete, onBook }) => {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      onDelete(room.id);
      toast({
        title: "Room deleted successfully! 🗑️",
        description: "The room has been removed from listings.",
      });
      onClose();
    }
  };

  const handleBook = () => {
    onBook();
    toast({
      title: "Opening booking form! 📅",
      description: "Fill in your details to complete the booking.",
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && !isEditMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-effect rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="relative h-80">
                <img 
                  src={room.images?.[0]?.url || room.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
                  alt={room.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full glass-effect flex items-center justify-center hover:bg-white/90 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute top-4 left-4 glass-effect px-4 py-2 rounded-full flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{room.rating?.average || 4.5}</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{room.title}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span className="text-lg">
                        {typeof room.location === 'object' 
                          ? `${room.location?.city || ''}, ${room.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                          : room.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-full"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDelete}
                      className="rounded-full text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span>{room.maxGuests} guests max</span>
                  </div>
                  <span>•</span>
                  <span className="font-semibold">{room.roomType}</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">{room.description}</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map((amenity) => (
                      <div key={amenity} className="px-4 py-2 bg-purple-100 rounded-full text-sm font-medium text-purple-700">
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">House Rules</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    {room.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pricing Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-xl font-bold mb-4">Pricing</h3>
                  
                  {/* PG Pricing */}
                  {room.category === 'PG' && room.pgOptions?.sharingPrices && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {room.pgOptions.sharingPrices.single > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Single Occupancy</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.pgOptions.sharingPrices.single}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'day' : 'month'}</div>
                        </div>
                      )}
                      {room.pgOptions.sharingPrices.double > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Double Sharing</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.pgOptions.sharingPrices.double}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'day' : 'month'}</div>
                        </div>
                      )}
                      {room.pgOptions.sharingPrices.triple > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Triple Sharing</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.pgOptions.sharingPrices.triple}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'day' : 'month'}</div>
                        </div>
                      )}
                      {room.pgOptions.sharingPrices.quad > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Quad Sharing</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.pgOptions.sharingPrices.quad}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'day' : 'month'}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hotel Pricing */}
                  {room.category === 'Hotel Room' && room.hotelPrices && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {room.hotelPrices.standard > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Standard Room</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.hotelPrices.standard}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'night' : 'month'}</div>
                        </div>
                      )}
                      {room.hotelPrices.deluxe > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Deluxe Room</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.hotelPrices.deluxe}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'night' : 'month'}</div>
                        </div>
                      )}
                      {room.hotelPrices.suite > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Suite</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.hotelPrices.suite}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'night' : 'month'}</div>
                        </div>
                      )}
                      {room.hotelPrices.premium > 0 && (
                        <div className="p-3 border-2 border-purple-200 rounded-xl bg-purple-50/30">
                          <div className="text-sm text-muted-foreground">Premium Room</div>
                          <div className="text-2xl font-bold gradient-text">₹{room.hotelPrices.premium}</div>
                          <div className="text-xs text-muted-foreground">/{room.pricingType === 'daily' ? 'night' : 'month'}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Base Price for other categories */}
                  {(room.category === 'Home Stay' || room.category === 'Independent Home' || 
                    (!room.pgOptions?.sharingPrices && !room.hotelPrices)) && (
                    <div className="mb-6">
                      <span className="text-4xl font-bold gradient-text">₹{room.price}</span>
                      <span className="text-lg text-muted-foreground">/{room.pricingType === 'daily' ? 'night' : 'month'}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleBook}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Now
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isEditMode && (
        <EditRoomModal
          room={room}
          isOpen={isEditMode}
          onClose={() => setIsEditMode(false)}
          onUpdate={(roomId, updatedRoom) => {
            onUpdate(roomId, updatedRoom);
            setIsEditMode(false);
            toast({
              title: "Room updated successfully! ✨",
              description: "Your changes have been saved.",
            });
          }}
        />
      )}
    </>
  );
};

export default RoomModal;