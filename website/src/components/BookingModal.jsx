import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import countryCodes from '../../CountryCodes.json';

const BookingModal = ({ room, isOpen, onClose, onBook }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    moveInDate: '',
    duration: '1'
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Sort countries: India first, then alphabetical
  const sortedCountries = useMemo(() => {
    const india = countryCodes.find(c => c.code === 'IN');
    const rest = countryCodes.filter(c => c.code !== 'IN').sort((a, b) => a.name.localeCompare(b.name));
    return india ? [india, ...rest] : rest;
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return sortedCountries;
    const s = countrySearch.toLowerCase();
    return sortedCountries.filter(c =>
      c.name.toLowerCase().includes(s) || c.dial_code.includes(s) || c.code.toLowerCase().includes(s)
    );
  }, [countrySearch, sortedCountries]);

  const selectedCountry = countryCodes.find(c => c.dial_code === formData.countryCode) || { code: 'IN', name: 'India', dial_code: '+91' };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.moveInDate) {
      toast({
        title: "Missing information ⚠️",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate move-in date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const moveIn = new Date(formData.moveInDate);
    if (moveIn < today) {
      toast({
        title: "Invalid date ⚠️",
        description: "Move-in date cannot be in the past. Please select today or a future date.",
        variant: "destructive"
      });
      return;
    }

    const bookingDataWithSource = {
      ...formData,
      phone: `${formData.countryCode}${formData.phone}`,
      bookingSource: 'online'
    };

    onBook(bookingDataWithSource);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            onClick={(e) => { e.stopPropagation(); setShowCountryDropdown(false); }}
            className="glass-effect rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold gradient-text">Book Your Stay</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl">
                <h3 className="font-bold text-lg mb-1">{room.displayTitle || room.title}</h3>
                {room.roomTypeLabel && (
                  <p className="text-xs font-semibold text-purple-700 mb-1">
                    {room.roomTypeLabel}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {typeof room.location === 'object' 
                    ? `${room.location?.city || ''}, ${room.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                    : room.location}
                </p>
                <p className="text-2xl font-bold gradient-text mt-2">
                  ₹{room.price}/{room.pricingType === 'daily' ? 'night' : 'month'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone *
                </Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-28 px-2 py-2 border rounded-lg text-sm bg-white flex items-center justify-between gap-1 hover:bg-gray-50"
                    >
                      <span className="truncate">{selectedCountry.code} {selectedCountry.dial_code}</span>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            placeholder="Search country..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, countryCode: country.dial_code });
                                setShowCountryDropdown(false);
                                setCountrySearch('');
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                                formData.countryCode === country.dial_code ? 'bg-blue-50 font-medium' : ''
                              }`}
                            >
                              <span className="truncate">{country.name}</span>
                              <span className="text-gray-500 ml-2 flex-shrink-0">{country.dial_code}</span>
                            </button>
                          ))}
                          {filteredCountries.length === 0 && (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">No countries found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="9876543210"
                    className="flex-1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moveInDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Move-in Date *
                </Label>
                <Input
                  id="moveInDate"
                  type="date"
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg rounded-2xl shadow-xl"
              >
                Confirm Booking
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingModal;