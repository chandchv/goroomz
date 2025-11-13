import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Clock,
  TrendingUp,
  Star,
  Users
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const HeaderSearchBar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Popular search terms
  const popularTerms = [
    { term: 'Whitefield', type: 'location', icon: MapPin },
    { term: 'Koramangala', type: 'location', icon: MapPin },
    { term: 'PG for Girls', type: 'specific', icon: Users },
    { term: 'Luxury Hotel', type: 'category', icon: Star },
    { term: 'Independent Home', type: 'category', icon: Users },
    { term: 'HSR Layout', type: 'location', icon: MapPin },
    { term: 'Budget Hotel', type: 'category', icon: Star },
    { term: 'Homestay', type: 'category', icon: Users }
  ];

  // Load recent searches on mount
  useEffect(() => {
    const savedRecentSearches = localStorage.getItem('recentSearches');
    if (savedRecentSearches) {
      setRecentSearches(JSON.parse(savedRecentSearches));
    }
  }, []);

  // Generate suggestions based on search query
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length > 1) {
      generateSuggestions(debouncedSearch);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  const generateSuggestions = useCallback((query) => {
    const filteredSuggestions = popularTerms.filter(item => 
      item.term.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6);
    setSuggestions(filteredSuggestions);
  }, []);

  const handleSearch = useCallback((searchTerm, searchType = 'all') => {
    if (!searchTerm.trim()) return;

    // Save to recent searches
    const newRecentSearches = [
      searchTerm,
      ...recentSearches.filter(term => term !== searchTerm)
    ].slice(0, 4);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    // Navigate based on search type
    if (searchType === 'category') {
      navigate(`/category/${encodeURIComponent(searchTerm)}`);
    } else if (searchType === 'location') {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }

    setShowSuggestions(false);
    setSearchQuery('');
    setIsFocused(false);
  }, [navigate, recentSearches]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setIsFocused(false);
    }, 200);
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

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search by city, hotel, or neighborhood..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`w-full pl-10 pr-4 py-2 text-sm rounded-full border transition-all duration-200 ${
            isFocused 
              ? 'border-purple-500 bg-white shadow-lg' 
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch(searchQuery);
            }
          }}
        />
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (searchQuery || recentSearches.length > 0) && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && !searchQuery && (
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                  <Clock className="w-3 h-3 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(term)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center"
                    >
                      <Clock className="w-3 h-3 mr-2 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {searchQuery && suggestions.length > 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                  <Search className="w-3 h-3 mr-2" />
                  Suggestions
                </h3>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => {
                    const Icon = getSuggestionIcon(suggestion.type);
                    const colorClass = getSuggestionColor(suggestion.type);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSearch(suggestion.term, suggestion.type)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center group"
                      >
                        <Icon className={`w-4 h-4 mr-3 ${colorClass}`} />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                          {suggestion.term}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {!searchQuery && recentSearches.length === 0 && (
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-2" />
                  Popular Searches
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {popularTerms.slice(0, 6).map((item, index) => {
                    const Icon = item.icon;
                    const colorClass = getSuggestionColor(item.type);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSearch(item.term, item.type)}
                        className="text-left p-2 hover:bg-gray-50 rounded-lg flex items-center group"
                      >
                        <Icon className={`w-3 h-3 mr-2 ${colorClass}`} />
                        <span className="text-xs font-medium text-gray-900 group-hover:text-purple-600">
                          {item.term}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeaderSearchBar;
