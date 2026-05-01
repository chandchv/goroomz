import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  Search, MapPin, Filter, Star, Users, Wifi, Car, 
  Utensils, Shield, X, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import Pagination from '@/components/Pagination';
import propertyService from '@/services/propertyService';

const AMENITY_ICONS = {
  wifi: Wifi, parking: Car, meals: Utensils, security: Shield
};

const PGListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState([]);
  const [areas, setAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    area: searchParams.get('area') || '',
    gender: searchParams.get('gender') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    amenities: searchParams.get('amenities') || ''
  });

  const loadProperties = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await propertyService.getProperties({
        ...filters, page, limit: 12, type: 'pg'
      });
      if (response.success) {
        setProperties(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load properties", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);


  useEffect(() => {
    loadProperties();
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const response = await propertyService.getAreas();
      if (response.success) setAreas(response.data);
    } catch (error) {
      console.error('Failed to load areas:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
    loadProperties(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', area: '', gender: '', minPrice: '', maxPrice: '', amenities: '' });
    setSearchParams({});
    loadProperties(1);
  };

  const PropertyCard = ({ property }) => {
    const basePrice = property.metadata?.pgOptions?.basePrice || 8000;
    const genderLabel = property.metadata?.genderPreference === 'female' ? '👩 Ladies' : 
                        property.metadata?.genderPreference === 'male' ? '👨 Gents' : '👥 Co-ed';
    
    return (
      <motion.div
        whileHover={{ y: -5 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer"
        onClick={() => navigate(`/pg/${property.slug || property.id}`)}
      >
        <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100">
          {property.images?.[0] ? (
            <img src={property.images[0].url || property.images[0]} alt={property.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><span className="text-5xl">🏠</span></div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded-full text-xs font-medium">{genderLabel}</div>
          {property.isFeatured && (
            <div className="absolute top-3 right-3 bg-yellow-400 px-2 py-1 rounded-full text-xs font-bold">⭐ Featured</div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">{property.name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{property.location?.area || property.location?.city}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{property.rating?.average || 4.0}</span>
            </div>
            <span className="text-xs text-muted-foreground">({property.rating?.count || 0} reviews)</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {property.amenities?.slice(0, 4).map(amenity => (
              <span key={amenity} className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">{amenity}</span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-purple-600">₹{basePrice.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">View Details</Button>
          </div>
        </div>
      </motion.div>
    );
  };


  return (
    <>
      <Helmet>
        <title>PG Accommodations in Bangalore - GoRoomz</title>
        <meta name="description" content="Find the best PG accommodations in Bangalore. Browse verified PGs with amenities, photos, and reviews." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect PG in Bangalore</h1>
            <p className="text-lg opacity-90 mb-6">Browse {pagination.total}+ verified PG accommodations</p>
            
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, area, or landmark..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-10 h-12 bg-white text-gray-900"
                />
              </div>
              <select
                value={filters.area}
                onChange={(e) => setFilters(f => ({ ...f, area: e.target.value }))}
                className="h-12 px-4 rounded-lg bg-white text-gray-900 border-0"
              >
                <option value="">All Areas</option>
                {areas.map(a => <option key={a.area} value={a.area}>{a.area} ({a.count})</option>)}
              </select>
              <Button type="submit" className="h-12 px-8 bg-white text-purple-600 hover:bg-gray-100">
                Search
              </Button>
              <Button type="button" variant="outline" className="h-12 border-white text-white hover:bg-white/10" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" /> Filters
              </Button>
            </form>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border-b py-4">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap gap-4 items-center">
                <select value={filters.gender} onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))} className="px-4 py-2 border rounded-lg">
                  <option value="">Any Gender</option>
                  <option value="female">Ladies Only</option>
                  <option value="male">Gents Only</option>
                </select>
                <Input type="number" placeholder="Min Price" value={filters.minPrice} onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))} className="w-32" />
                <Input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))} className="w-32" />
                <Button variant="ghost" onClick={clearFilters}><X className="w-4 h-4 mr-1" /> Clear</Button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">🔍</span>
              <h3 className="text-xl font-bold mb-2">No PGs Found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {properties.map(property => <PropertyCard key={property.id} property={property} />)}
              </div>
              
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => {
                  loadProperties(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PGListingPage;
