import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, Clock, Star, Building, Crosshair, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

const FloatingSearchBar = ({ isVisible, onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchType, setSearchType] = useState('all'); // 'all' or 'hotel'
  
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Popular search terms based on categories and locations
  const allPopularTerms = [
    { term: 'Whitefield', category: 'PG', icon: MapPin, type: 'location' },
    { term: 'Koramangala', category: 'PG', icon: MapPin, type: 'location' },
    { term: 'Luxury Hotel', category: 'Hotel Room', icon: Star, type: 'category' },
    { term: 'Independent Home', category: 'Independent Home', icon: Users, type: 'category' },
    { term: 'HSR Layout', category: 'PG', icon: MapPin, type: 'location' },
    { term: 'Indiranagar', category: 'Home Stay', icon: MapPin, type: 'location' },
    { term: 'PG for Girls', category: 'PG', icon: Users, type: 'specific' },
    { term: 'Budget Hotel', category: 'Hotel Room', icon: Star, type: 'category' },
    { term: 'Electronic City', category: 'PG', icon: MapPin, type: 'location' },
    { term: 'Homestay', category: 'Home Stay', icon: Users, type: 'category' }
  ];

  const hotelPopularTerms = [
    { term: 'Luxury Hotel', category: 'Hotel Room', icon: Star, type: 'category' },
    { term: 'Budget Hotel', category: 'Hotel Room', icon: Star, type: 'category' },
    { term: 'Business Hotel', category: 'Hotel Room', icon: Star, type: 'category' },
    { term: 'Hotel Near Airport', category: 'Hotel Room', icon: MapPin, type: 'specific' },
    { term: 'Whitefield Hotels', category: 'Hotel Room', icon: MapPin, type: 'location' },
    { term: 'Koramangala Hotels', category: 'Hotel Room', icon: MapPin, type: 'location' },
    { term: 'Hotel with Pool', category: 'Hotel Room', icon: Star, type: 'specific' },
    { term: 'Hotel with Gym', category: 'Hotel Room', icon: Star, type: 'specific' },
    { term: 'Hotel with Spa', category: 'Hotel Room', icon: Star, type: 'specific' },
    { term: 'Hotel with Restaurant', category: 'Hotel Room', icon: Star, type: 'specific' }
  ];

  const popularTerms = searchType === 'hotel' ? hotelPopularTerms : allPopularTerms;

  // Load popular and recent searches
  useEffect(() => {
    const savedRecentSearches = localStorage.getItem('recentSearches');
    if (savedRecentSearches) {
      setRecentSearches(JSON.parse(savedRecentSearches));
    }
    setPopularSearches(popularTerms.slice(0, 6));
  }, [searchType]);

  const handleSearch = useCallback((searchTerm, suggestionType = 'all') => {
    if (!searchTerm.trim()) return;

    // Save to recent searches
    const newRecentSearches = [
      searchTerm,
      ...recentSearches.filter(term => term !== searchTerm)
    ].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    // Navigate based on current search type and suggestion type
    if (suggestionType === 'category') {
      navigate(`/category/${encodeURIComponent(searchTerm)}`);
    } else if (suggestionType === 'location') {
      if (searchType === 'hotel') {
        navigate(`/search?q=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(searchTerm)}&category=Hotel Room`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(searchTerm)}`);
      }
    } else {
      if (searchType === 'hotel') {
        navigate(`/search?q=${encodeURIComponent(searchTerm)}&category=Hotel Room`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      }
    }

    setShowSuggestions(false);
    onClose(); // Close floating search bar after search
  }, [navigate, recentSearches, searchType, onClose]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputFocus = () => {
    setShowSuggestions(searchQuery.length > 0 || recentSearches.length > 0);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleQuickSearch = (term, type = 'all') => {
    setSearchQuery(term);
    handleSearch(term, type);
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'location': return MapPin;
      case 'category': return Building;
      case 'specific': return Star;
      default: return Search;
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl mx-auto px-4"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Close button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Options Toggle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="bg-gray-100 rounded-full p-1 border border-gray-200">
            <button
              onClick={() => setSearchType('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                searchType === 'all' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setSearchType('hotel')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                searchType === 'hotel' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Hotel Rooms Only
            </button>
          </div>
        </div>

        {/* Main Search Container */}
        <div className="flex gap-2 p-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                ref={searchRef}
                type="text"
                placeholder={searchType === 'hotel' 
                  ? "Search hotels by city or name" 
                  : "Search by city, hotel, or neighborhood"}
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="pl-12 pr-28 py-4 text-lg border-0 bg-transparent focus:ring-0 placeholder:text-gray-400 text-gray-900"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
              />
              {/* Near Me Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700"
                onClick={() => handleQuickSearch('Near me', 'location')}
              >
                <Crosshair className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">Near me</span>
              </Button>
            </div>
          </div>

          {/* Search Button */}
          <div>
            <Button
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-4"
              onClick={() => handleSearch(searchQuery)}
            >
              <Search className="w-5 h-5 mr-2" />
              {searchType === 'hotel' ? 'Find Hotels' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200 bg-white"
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && searchQuery === '' && (
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Recent Searches</span>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(term)}
                        className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {searchType === 'hotel' ? 'Popular Hotels' : 'Popular Searches'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {popularSearches.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(item.term, item.type)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <Icon className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{item.term}</span>
                          <span className="text-xs text-gray-500 ml-2">{item.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Search Tags */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-gray-600 text-sm">
              {searchType === 'hotel' ? 'Popular Hotels:' : 'Popular:'}
            </span>
            {(searchType === 'hotel' 
              ? ['Luxury Hotel', 'Budget Hotel', 'Hotel Near Airport', 'Hotel with Pool']
              : ['Whitefield', 'Koramangala', 'Luxury Hotel', 'PG for Girls']
            ).map((term, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-full transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FloatingSearchBar;
