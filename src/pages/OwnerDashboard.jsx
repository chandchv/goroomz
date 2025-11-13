import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Star,
  MapPin,
  Filter,
  Search as SearchIcon,
  Download,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import PropertyListingWizard from '@/components/PropertyListingWizard';
import EditRoomModal from '@/components/EditRoomModal';
import roomService from '@/services/roomService';
import bookingService from '@/services/bookingService';
import apiService from '@/services/api';

const OwnerDashboard = () => {
  // State management
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  // Load owner data
  useEffect(() => {
    loadOwnerData();
  }, []);

  const loadOwnerData = async () => {
    try {
      setIsLoading(true);
      
      const [propertiesRes, bookingsRes, statsRes] = await Promise.all([
        apiService.get('/rooms/owner/my-rooms'),
        apiService.get('/bookings/owner/my-bookings'),
        apiService.get('/rooms/owner/stats')
      ]);

      if (propertiesRes.success) {
        setProperties(propertiesRes.data || []);
      }

      if (bookingsRes.success) {
        setBookings(bookingsRes.data || []);
      }

      if (statsRes.success) {
        setStats(statsRes.data || {});
      }
    } catch (error) {
      console.error('Error loading owner data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Property CRUD operations
  const handleAddProperty = async (propertyData) => {
    try {
      const response = await roomService.createRoom(propertyData);
      if (response.success) {
        setProperties([response.data, ...properties]);
        setIsAddModalOpen(false);
        toast({ 
          title: "Property Added! 🎉", 
          description: "Your property has been listed successfully." 
        });
        loadOwnerData(); // Reload to get updated stats
      }
    } catch (error) {
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add property.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProperty = async (propertyId, updates) => {
    try {
      const response = await roomService.updateRoom(propertyId, updates);
      if (response.success) {
        setProperties(properties.map(p => p.id === propertyId ? response.data : p));
        setIsEditModalOpen(false);
        toast({ title: "Property Updated! ✨" });
        loadOwnerData();
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update property.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        const response = await roomService.deleteRoom(propertyId);
        if (response.success) {
          setProperties(properties.filter(p => p.id !== propertyId));
          toast({ title: "Property Deleted! 🗑️" });
          loadOwnerData();
        }
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: "Failed to delete property.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTogglePropertyStatus = async (propertyId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await roomService.updateRoom(propertyId, { isActive: newStatus });
      if (response.success) {
        setProperties(properties.map(p => 
          p.id === propertyId ? { ...p, isActive: newStatus } : p
        ));
        toast({ 
          title: newStatus ? "Property Activated! ✅" : "Property Deactivated! ⏸️",
          description: `Property is now ${newStatus ? 'visible' : 'hidden'} to guests.`
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update property status.",
        variant: "destructive"
      });
    }
  };

  // Booking management
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const response = await bookingService.updateBookingStatus(bookingId, newStatus);
      if (response.success) {
        setBookings(bookings.map(b => 
          b.id === bookingId ? { ...b, status: newStatus } : b
        ));
        toast({ 
          title: "Booking Updated! ✅",
          description: `Booking status changed to ${newStatus}`
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update booking status.",
        variant: "destructive"
      });
    }
  };

  // Filtered data
  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.location?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && property.isActive) ||
                         (statusFilter === 'inactive' && !property.isActive);
    return matchesSearch && matchesStatus;
  });

  const filteredBookings = bookings.filter(booking => {
    return bookingStatusFilter === 'all' || booking.status === bookingStatusFilter;
  });

  // Calculate earnings
  const totalEarnings = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Property Owner Dashboard - GoRoomz</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Property Owner Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your properties and bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <Home className="h-8 w-8" />
              <TrendingUp className="h-5 w-5 opacity-80" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{properties.length}</h3>
            <p className="text-purple-100">Total Properties</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <Calendar className="h-8 w-8" />
              <Users className="h-5 w-5 opacity-80" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{bookings.length}</h3>
            <p className="text-blue-100">Total Bookings</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8" />
              <BarChart3 className="h-5 w-5 opacity-80" />
            </div>
            <h3 className="text-3xl font-bold mb-1">₹{totalEarnings.toLocaleString()}</h3>
            <p className="text-green-100">Total Earnings</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-8 w-8" />
              <CheckCircle className="h-5 w-5 opacity-80" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{pendingBookings}</h3>
            <p className="text-orange-100">Pending Bookings</p>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-fit py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 min-w-fit py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'properties' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            🏠 My Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 min-w-fit py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bookings' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            📅 Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 min-w-fit py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            📈 Analytics
          </button>
        </div>

        {/* Tab Content */}
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Recent Bookings
                </h3>
                <div className="space-y-3">
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{booking.room?.title || 'Room'}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.user?.name} - {booking.user?.email}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        📅 {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-purple-600 mt-2">
                        ₹{booking.totalAmount?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {bookings.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No bookings yet</p>
                  )}
                </div>
              </div>

              {/* Active Properties */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-purple-600" />
                  Active Properties
                </h3>
                <div className="space-y-3">
                  {properties.filter(p => p.isActive).slice(0, 5).map(property => (
                    <div key={property.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {property.images && property.images[0] && (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{property.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.location?.city}
                          </p>
                          <p className="text-sm font-semibold text-purple-600 mt-1">
                            ₹{property.price}/night
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">{property.rating?.average || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {properties.filter(p => p.isActive).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No active properties</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Property
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('bookings')}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View All Bookings
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('analytics')}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">My Properties</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Properties</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredProperties.map(property => (
                <div key={property.id} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Property Image */}
                    {property.images && property.images[0] && (
                      <img 
                        src={property.images[0]} 
                        alt={property.title}
                        className="w-full md:w-32 h-32 rounded-lg object-cover"
                      />
                    )}
                    
                    {/* Property Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{property.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.location?.city}, {property.location?.state}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {property.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold text-purple-600">₹{property.price}/night</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Category</p>
                          <p className="font-semibold">{property.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Guests</p>
                          <p className="font-semibold">{property.maxGuests} max</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rating</p>
                          <p className="font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {property.rating?.average || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProperty(property);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePropertyStatus(property.id, property.isActive)}
                        >
                          {property.isActive ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {property.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredProperties.length === 0 && (
                <div className="text-center py-12">
                  <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No properties found matching your criteria.' 
                      : 'You haven\'t listed any properties yet.'}
                  </p>
                  <Button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Property
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Bookings Management</h2>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Bookings</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredBookings.map(booking => (
                <div key={booking.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold">{booking.room?.title || 'Property'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Guest: {booking.user?.name} ({booking.user?.email})
                          </p>
                          {booking.user?.phone && (
                            <p className="text-sm text-muted-foreground">
                              📞 {booking.user.phone}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Check-in</p>
                          <p className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Check-out</p>
                          <p className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Guests</p>
                          <p className="font-semibold">{booking.guests}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-semibold text-green-600">₹{booking.totalAmount?.toLocaleString()}</p>
                        </div>
                      </div>

                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredBookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {bookingStatusFilter !== 'all' 
                      ? `No ${bookingStatusFilter} bookings found.` 
                      : 'No bookings yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-2xl font-bold mb-6">Performance Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-600">₹{totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">↑ All time earnings</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-muted-foreground mb-1">Booking Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {properties.length > 0 ? Math.round((bookings.length / properties.length) * 100) / 10 : 0}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">Bookings per property</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-muted-foreground mb-1">Avg Booking Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{bookings.length > 0 ? Math.round(totalEarnings / bookings.length).toLocaleString() : 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Per booking average</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Property Performance</h3>
                <div className="space-y-3">
                  {properties.slice(0, 5).map(property => {
                    const propertyBookings = bookings.filter(b => b.room?.id === property.id);
                    const propertyRevenue = propertyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                    
                    return (
                      <div key={property.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{property.title}</p>
                            <p className="text-sm text-muted-foreground">{property.location?.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">₹{propertyRevenue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{propertyBookings.length} bookings</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${bookings.length > 0 ? (propertyBookings.length / bookings.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PropertyListingWizard
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddProperty}
      />

      {selectedProperty && (
        <EditRoomModal
          room={selectedProperty}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProperty(null);
          }}
          onUpdate={handleUpdateProperty}
        />
      )}
    </>
  );
};

export default OwnerDashboard;

