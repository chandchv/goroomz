import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Crosshair,
  ChevronDown,
  Clock,
  TrendingUp,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import roomService from '@/services/roomService';
import categoryService from '@/services/categoryService';

const HomeSearchBar = ({ onSearch, compact = false }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchType, setSearchType] = useState('all'); // 'all' or 'hotel'
  const [searchParams, setSearchParams] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    rooms: 1
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  
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

  // Load popular searches on mount
  useEffect(() => {
    setPopularSearches(popularTerms);
    const savedRecentSearches = localStorage.getItem('recentSearches');
    if (savedRecentSearches) {
      setRecentSearches(JSON.parse(savedRecentSearches));
    }
  }, []);

  // Generate intelligent suggestions based on search query
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length > 1) {
      generateSuggestions(debouncedSearch);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  const generateSuggestions = useCallback(async (query) => {
    setIsLoading(true);
    try {
      // Get suggestions from multiple sources
      const [locationSuggestions, categorySuggestions, roomSuggestions] = await Promise.all([
        getLocationSuggestions(query),
        getCategorySuggestions(query),
        getRoomSuggestions(query)
      ]);

      const allSuggestions = [
        ...locationSuggestions,
        ...categorySuggestions,
        ...roomSuggestions
      ];

      // Remove duplicates and limit results
      const uniqueSuggestions = allSuggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.term === suggestion.term)
        )
        .slice(0, 8);

      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLocationSuggestions = async (query) => {
    // Mock location suggestions - in real app, this would come from API
    const locations = [
      'Whitefield', 'Koramangala', 'HSR Layout', 'Indiranagar', 'Electronic City',
      'JP Nagar', 'Malleshwaram', 'Basavanagudi', 'Jayanagar', 'Majestic'
    ];
    
    return locations
      .filter(location => location.toLowerCase().includes(query.toLowerCase()))
      .map(location => ({
        term: location,
        category: 'PG',
        icon: MapPin,
        type: 'location',
        description: `Find rooms in ${location}`
      }));
  };

  const getCategorySuggestions = async (query) => {
    const categories = [
      { name: 'PG', aliases: ['paying guest', 'pg', 'hostel'] },
      { name: 'Hotel Room', aliases: ['hotel', 'hotel room', 'luxury'] },
      { name: 'Independent Home', aliases: ['independent', 'home', 'apartment'] },
      { name: 'Home Stay', aliases: ['homestay', 'home stay', 'guest house'] }
    ];

    return categories
      .filter(cat => 
        cat.name.toLowerCase().includes(query.toLowerCase()) ||
        cat.aliases.some(alias => alias.includes(query.toLowerCase()))
      )
      .map(cat => ({
        term: cat.name,
        category: cat.name,
        icon: Users,
        type: 'category',
        description: `Browse ${cat.name} accommodations`
      }));
  };

  const getRoomSuggestions = async (query) => {
    // Get room suggestions based on popular searches
    return popularTerms
      .filter(item => 
        item.term.toLowerCase().includes(query.toLowerCase()) &&
        item.type === 'specific'
      )
      .map(item => ({
        term: item.term,
        category: item.category,
        icon: item.icon,
        type: item.type,
        description: `Popular ${item.category} option`
      }));
  };

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
    if (onSearch) onSearch(searchTerm);
  }, [navigate, onSearch, recentSearches, searchType]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleQuickSearch = (searchTerm, searchType) => {
    setSearchQuery(searchTerm);
    handleSearch(searchTerm, searchType);
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'location': return MapPin;
      case 'category': return Users;
      case 'specific': return Star;
      default: return Search;
    }
  };

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'location': return 'text-blue-600';
      case 'category': return 'text-purple-600';
      case 'specific': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // Compact version for header
  if (compact) {
    return (
      <div className="w-full relative">
        <div className="flex gap-2">
          {/* Search Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSearchType('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                searchType === 'all' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSearchType('hotel')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                searchType === 'hotel' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Hotels
            </button>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchRef}
                type="text"
                placeholder={searchType === 'hotel' 
                  ? "Search hotels..." 
                  : "Search rooms..."}
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="pl-10 pr-4 py-2 text-sm border-gray-200 focus:ring-purple-500 focus:border-purple-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
              />
            </div>
          </div>

          {/* Search Button */}
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4"
            onClick={() => handleSearch(searchQuery)}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Compact Suggestions */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              ref={suggestionsRef}
            >
              {suggestions.slice(0, 5).map((suggestion, index) => {
                const IconComponent = getSuggestionIcon(suggestion.type);
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(suggestion.term, suggestion.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <IconComponent className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{suggestion.term}</p>
                      {suggestion.description && (
                        <p className="text-xs text-gray-500">{suggestion.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full version for home page
  return (
    <div className="w-full max-w-6xl mx-auto relative">
      {/* Search Options Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
          <button
            onClick={() => setSearchType('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchType === 'all' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-gray-800/80 hover:text-gray-800'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setSearchType('hotel')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchType === 'hotel' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-gray-800/80 hover:text-gray-800'
            }`}
          >
            Hotel Rooms Only
          </button>
        </div>
      </div>

      {/* Main Search Container */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 p-2">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
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
                className="pl-12 pr-4 py-4 text-lg border-0 bg-transparent focus:ring-0 placeholder:text-gray-400 text-gray-900"
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

          {/* Date Picker */}
          <div className="lg:col-span-3 relative">
            <Button
              variant="ghost"
              className="w-full h-full p-4 justify-start text-left hover:bg-gray-50"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="w-5 h-5 mr-3 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {searchParams.checkIn ? formatDate(searchParams.checkIn) : 'Check-in'}
                </span>
                <span className="text-xs text-gray-500">Date</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
            </Button>
          </div>

          {/* Guest Picker */}
          <div className="lg:col-span-2 relative">
            <Button
              variant="ghost"
              className="w-full h-full p-4 justify-start text-left hover:bg-gray-50"
              onClick={() => setShowGuestPicker(!showGuestPicker)}
            >
              <Users className="w-5 h-5 mr-3 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {searchParams.guests} Guest{searchParams.guests !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-500">Guests</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
            </Button>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-2">
            <Button
              className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-lg py-4"
              onClick={() => handleSearch(searchQuery)}
            >
              <Search className="w-5 h-5 mr-2" />
              {searchType === 'hotel' ? 'Find Hotels' : 'Search'}
            </Button>
          </div>
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
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && !searchQuery && (
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSearch(term)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center"
                    >
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {searchQuery && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Suggestions
                </h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => {
                      const Icon = getSuggestionIcon(suggestion.type);
                      const colorClass = getSuggestionColor(suggestion.type);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleQuickSearch(suggestion.term, suggestion.type)}
                          className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-lg flex items-center group"
                        >
                          <Icon className={`w-5 h-5 mr-3 ${colorClass}`} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 group-hover:text-purple-600">
                              {suggestion.term}
                            </div>
                            <div className="text-xs text-gray-500">
                              {suggestion.description}
                            </div>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {suggestion.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Popular Searches */}
            {!searchQuery && (
              <div className="p-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Popular Searches
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {popularSearches.slice(0, 8).map((item, index) => {
                    const Icon = item.icon;
                    const colorClass = getSuggestionColor(item.type);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(item.term, item.type)}
                        className="text-left p-3 hover:bg-gray-50 rounded-lg flex items-center group"
                      >
                        <Icon className={`w-4 h-4 mr-2 ${colorClass}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                            {item.term}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Search Tags */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <span className="text-white text-sm font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
          {searchType === 'hotel' ? 'Popular Hotels:' : 'Popular:'}
        </span>
        {(searchType === 'hotel' 
          ? ['Luxury Hotel', 'Budget Hotel', 'Hotel Near Airport', 'Hotel with Pool']
          : ['Whitefield', 'Koramangala', 'Luxury Hotel', 'PG for Girls']
        ).map((term, index) => (
          <button
            key={index}
            onClick={() => handleQuickSearch(term)}
            className="px-3 py-1 bg-black/40 hover:bg-black/50 text-white text-sm rounded-full transition-colors backdrop-blur-sm border border-white/20"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeSearchBar;
