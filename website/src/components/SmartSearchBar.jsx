import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Globe, Building2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import propertyService from '@/services/propertyService';

/**
 * SmartSearchBar Component
 * 
 * Enhanced search bar with city code detection, property name search,
 * autocomplete suggestions, and smart routing to unified or local search.
 */
const SmartSearchBar = ({ onSearch, placeholder = "Search by city code, location, or property name..." }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Popular city codes for quick suggestions
  const popularCities = [
    { code: 'DEL', name: 'Delhi', country: 'India', type: 'city' },
    { code: 'BOM', name: 'Mumbai', country: 'India', type: 'city' },
    { code: 'BLR', name: 'Bangalore', country: 'India', type: 'city' },
    { code: 'HYD', name: 'Hyderabad', country: 'India', type: 'city' },
    { code: 'MAA', name: 'Chennai', country: 'India', type: 'city' },
    { code: 'CCU', name: 'Kolkata', country: 'India', type: 'city' },
    { code: 'PNQ', name: 'Pune', country: 'India', type: 'city' },
    { code: 'AMD', name: 'Ahmedabad', country: 'India', type: 'city' },
    { code: 'LON', name: 'London', country: 'UK', type: 'city' },
    { code: 'NYC', name: 'New York', country: 'USA', type: 'city' },
    { code: 'PAR', name: 'Paris', country: 'France', type: 'city' },
    { code: 'DXB', name: 'Dubai', country: 'UAE', type: 'city' },
    { code: 'SIN', name: 'Singapore', country: 'Singapore', type: 'city' },
    { code: 'TYO', name: 'Tokyo', country: 'Japan', type: 'city' }
  ];

  // Popular categories
  const popularCategories = [
    { name: 'PGs', query: 'PG', type: 'category' },
    { name: 'Hotels', query: 'Hotel', type: 'category' },
    { name: 'Homestays', query: 'Homestay', type: 'category' },
    { name: 'Apartments', query: 'Apartment', type: 'category' }
  ];

  // Detect if query is a city code (3 uppercase letters)
  const isCityCode = (text) => /^[A-Z]{3}$/i.test(text.trim());

  // Generate suggestions based on query
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      
      const lowerQuery = query.toLowerCase();
      const allSuggestions = [];

      // 1. City suggestions
      const citySuggestions = popularCities
        .filter(city => 
          city.name.toLowerCase().includes(lowerQuery) ||
          city.code.toLowerCase().includes(lowerQuery) ||
          city.country.toLowerCase().includes(lowerQuery)
        )
        .map(city => ({
          ...city,
          displayText: city.name,
          subText: `${city.country} • ${city.code}`,
          icon: 'globe'
        }));

      allSuggestions.push(...citySuggestions);

      // 2. Category suggestions
      const categorySuggestions = popularCategories
        .filter(cat => 
          cat.name.toLowerCase().includes(lowerQuery) ||
          cat.query.toLowerCase().includes(lowerQuery)
        )
        .map(cat => ({
          ...cat,
          displayText: cat.name,
          subText: 'Browse category',
          icon: 'building'
        }));

      allSuggestions.push(...categorySuggestions);

      // 3. Property name suggestions (search local properties)
      try {
        const response = await propertyService.getProperties({
          search: query,
          limit: 5
        });
        
        if (response.success && response.data) {
          const propertySuggestions = response.data.map(property => ({
            type: 'property',
            name: property.name || property.title,
            id: property.id,
            location: property.location?.city || property.location?.address || '',
            displayText: property.name || property.title,
            subText: property.location?.city || 'Property',
            icon: 'building'
          }));
          
          allSuggestions.push(...propertySuggestions);
        }
      } catch (error) {
        console.error('Error fetching property suggestions:', error);
      }

      setSuggestions(allSuggestions.slice(0, 8));
      setIsLoading(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle search execution
  const handleSearch = () => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    
    // Check if it's a city code for unified search
    if (isCityCode(trimmedQuery)) {
      navigate(`/search?cityCode=${trimmedQuery.toUpperCase()}`);
    } else {
      // Regular text search (property names, locations, etc.)
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }

    setShowSuggestions(false);
    if (onSearch) onSearch(trimmedQuery);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'city') {
      // City code search
      setQuery(suggestion.name);
      setShowSuggestions(false);
      navigate(`/search?cityCode=${suggestion.code}`);
    } else if (suggestion.type === 'category') {
      // Category search
      setQuery(suggestion.name);
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(suggestion.query)}`);
    } else if (suggestion.type === 'property') {
      // Direct property navigation
      setQuery(suggestion.name);
      setShowSuggestions(false);
      navigate(`/property/${suggestion.id}`);
    } else {
      // Fallback to text search
      setQuery(suggestion.displayText || suggestion.name);
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(suggestion.displayText || suggestion.name)}`);
    }
    
    if (onSearch) onSearch(suggestion.displayText || suggestion.name);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-4 rounded-2xl border-2 border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-lg"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Search Type Indicator */}
      {query && isCityCode(query.trim()) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-4 -bottom-6 flex items-center gap-2 text-sm text-purple-600"
        >
          <Globe className="w-4 h-4" />
          <span>Searching global hotels via Amadeus</span>
        </motion.div>
      )}

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto"
          >
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  <div className="text-xs font-semibold text-gray-500 px-3 py-2">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion, index) => {
                    const isCity = suggestion.type === 'city';
                    const isCategory = suggestion.type === 'category';
                    const isProperty = suggestion.type === 'property';
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                          ${selectedIndex === index
                            ? 'bg-purple-50 text-purple-700'
                            : 'hover:bg-gray-50 text-gray-700'
                          }
                        `}
                      >
                        {isCity && (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {suggestion.code}
                          </div>
                        )}
                        {isCategory && (
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {isProperty && (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{suggestion.displayText}</div>
                          <div className="text-xs text-gray-500">{suggestion.subText}</div>
                        </div>
                        {isCity && <Globe className="w-4 h-4 text-blue-500" />}
                        {isCategory && <Search className="w-4 h-4 text-green-500" />}
                        {isProperty && <MapPin className="w-4 h-4 text-purple-500" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartSearchBar;
