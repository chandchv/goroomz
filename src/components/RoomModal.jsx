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
                  src={room.image} 
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
                  <span className="font-bold text-lg">{room.rating}</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{room.title}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span className="text-lg">{room.location}, {room.city}</span>
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

                <div className="flex items-center justify-between pt-6 border-t">
                  <div>
                    <span className="text-4xl font-bold gradient-text">₹{room.price}</span>
                    <span className="text-lg text-muted-foreground">/month</span>
                  </div>
                  <Button
                    onClick={handleBook}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl"
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
          onUpdate={(updatedRoom) => {
            onUpdate(updatedRoom);
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