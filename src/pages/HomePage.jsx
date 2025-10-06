import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Users, Wifi, Car, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import HeroImage from '@/components/HeroImage';
import SearchBar from '@/components/SearchBar';
import RoomGrid from '@/components/RoomGrid';
import CallToAction from '@/components/CallToAction';
import WelcomeMessage from '@/components/WelcomeMessage';
import roomService from '@/services/roomService';
import categoryService from '@/services/categoryService';

const HomePage = () => {
  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setIsLoading(true);
        
        // Load featured rooms and categories in parallel
        const [featuredResponse, categoriesResponse] = await Promise.all([
          roomService.getFeaturedRooms(),
          categoryService.getCategories()
        ]);

        if (featuredResponse.success) {
          setFeaturedRooms(featuredResponse.data);
        }

        if (categoriesResponse.success) {
          const formattedCategories = categoryService.formatCategoriesForDisplay(categoriesResponse.data);
          setCategories(formattedCategories);
        }
      } catch (error) {
        console.error('Error loading home data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load featured rooms and categories.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Redirect to search results or filter rooms
  };

  const getAmenityIcon = (amenity) => {
    const icons = {
      wifi: <Wifi className="w-4 h-4" />,
      parking: <Car className="w-4 h-4" />,
      meals: <Utensils className="w-4 h-4" />,
    };
    return icons[amenity] || <Star className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading amazing rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>GoRoomz - Find Your Perfect Room</title>
        <meta name="description" content="Discover and book the perfect room for your stay. Browse through thousands of verified accommodations across India." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroImage />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Find Your Perfect Room
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Discover amazing accommodations across India. From cozy PGs to luxury apartments, 
              find your ideal stay with GoRoomz.
            </p>
            <SearchBar onSearch={handleSearch} />
          </motion.div>
        </div>
      </section>

      {/* Welcome Message */}
      <WelcomeMessage />

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Choose Your Perfect Stay
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore different types of accommodations tailored to your needs and preferences.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/category/${encodeURIComponent(category.name)}`}
                  className="block group"
                >
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2">
                    <div className={`w-16 h-16 rounded-2xl bg-${category.displayInfo.color}-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Star className={`w-8 h-8 text-${category.displayInfo.color}-600`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">
                      {category.displayInfo.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {category.displayInfo.description}
                    </p>
                    <div className="flex items-center text-primary font-semibold group-hover:text-purple-600 transition-colors">
                      Explore Rooms
                      <Search className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Rooms Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Featured Rooms
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Handpicked accommodations that our users love. These rooms offer exceptional 
              value and comfort.
            </p>
          </motion.div>

          {featuredRooms.length > 0 ? (
            <RoomGrid rooms={featuredRooms} />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Featured Rooms Yet</h3>
              <p className="text-muted-foreground mb-6">
                We're working on adding amazing featured rooms for you.
              </p>
              <Button asChild>
                <Link to="/category/PG">Explore All Rooms</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="text-5xl font-bold mb-2">1000+</div>
              <div className="text-xl opacity-90">Rooms Available</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-5xl font-bold mb-2">50+</div>
              <div className="text-xl opacity-90">Cities Covered</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-xl opacity-90">Happy Customers</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <CallToAction />
    </>
  );
};

export default HomePage;
