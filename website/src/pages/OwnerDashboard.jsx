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
  BarChart3,
  FileText,
  Activity,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  Mail,
  Building
} from 'lucide-react';
import { motion } from 'framer-motion';
import PropertyListingWizard from '@/components/PropertyListingWizard';
import EditRoomModal from '@/components/EditRoomModal';
import bookingService from '@/services/bookingService';
import leadService from '@/services/leadService';
import apiService from '@/services/api';

const OwnerDashboard = () => {
  // State management
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [trackingReference, setTrackingReference] = useState('');

  // Load owner data
  useEffect(() => {
    loadOwnerData();
  }, []);

  const loadOwnerData = async () => {
    try {
      setIsLoading(true);
      
      const userEmail = localStorage.getItem('userEmail') || apiService.getCurrentUser()?.email;
      
      const [propertiesRes, bookingsRes, leadsRes] = await Promise.all([
        apiService.get('/internal/properties'), // Get owner's properties from properties table
        apiService.get('/bookings/owner/my-bookings'),
        userEmail ? leadService.getPropertyOwnerLeads(userEmail).catch(() => ({ success: false, data: { leads: [] } })) : Promise.resolve({ success: false, data: { leads: [] } })
      ]);

      if (propertiesRes.success) {
        // Normalize property data for the dashboard
        const normalizedProperties = (propertiesRes.data || []).map(p => ({
          ...p,
          title: p.name || p.title || 'Unnamed Property',
          isActive: p.status === 'active' || p.isActive !== false,
          location: p.address ? {
            address: p.address.street,
            city: p.address.city,
            state: p.address.state,
            country: p.address.country
          } : p.location || {},
          category: p.type || 'Property',
          maxGuests: p.totalRooms || 0,
          price: p.revenue?.currentMonth || 0,
          pricingType: 'monthly',
          rating: p.rating || { average: 0 },
          images: p.images || []
        }));
        setProperties(normalizedProperties);
        
        // Compute stats from properties
        setStats({
          totalProperties: normalizedProperties.length,
          activeProperties: normalizedProperties.filter(p => p.isActive).length,
          totalRooms: normalizedProperties.reduce((sum, p) => sum + (p.totalRooms || 0), 0),
          occupiedRooms: normalizedProperties.reduce((sum, p) => sum + (p.occupiedRooms || 0), 0)
        });
      }

      if (bookingsRes.success) {
        setBookings(bookingsRes.data || []);
      }

      if (leadsRes.success) {
        setLeads(leadsRes.data.leads || []);
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
      const response = await apiService.post('/rooms', propertyData);
      if (response.success) {
        setIsAddModalOpen(false);
        toast({ 
          title: "Property Added! 🎉", 
          description: "Your property has been listed successfully." 
        });
        loadOwnerData();
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
      const response = await apiService.put(`/rooms/${propertyId}`, updates);
      if (response.success) {
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
        const response = await apiService.delete(`/rooms/${propertyId}`);
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
      const response = await apiService.put(`/rooms/${propertyId}`, { isActive: newStatus });
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.propertyOwnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Lead tracking functions
  const searchByTrackingReference = async () => {
    if (!trackingReference.trim()) {
      toast({
        title: "Tracking Reference Required",
        description: "Please enter a tracking reference to search.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await leadService.getLeadStatus(trackingReference.trim());
      
      if (response.success && response.data.leads.length > 0) {
        setLeads(response.data.leads);
        setActiveTab('leads');
        toast({
          title: "Lead Found",
          description: "Successfully found your property submission.",
        });
      } else {
        toast({
          title: "Lead Not Found",
          description: "No property submission found with this tracking reference.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching lead:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for your property submission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get status info for leads
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: Clock,
          label: 'Under Review'
        };
      case 'assigned':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: User,
          label: 'Assigned to Agent'
        };
      case 'approved':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle,
          label: 'Approved'
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircle,
          label: 'Rejected'
        };
      case 'in_review':
        return { 
          color: 'bg-purple-100 text-purple-800 border-purple-200', 
          icon: Eye,
          label: 'In Review'
        };
      case 'requires_info':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: AlertCircle,
          label: 'Info Required'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Clock,
          label: status || 'Unknown'
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            onClick={() => setActiveTab('leads')}
            className={`flex-1 min-w-fit py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'leads' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            📋 Lead Tracking ({leads.length})
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
                          <p className="font-semibold">{booking.room?.title || 'Property'}</p>
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
                            src={typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.url} 
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
                            ₹{property.price}{property.pricingType === 'monthly' ? '/month' : '/night'}
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
                        src={typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.url} 
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
                          <p className="font-semibold text-purple-600">₹{property.price}{property.pricingType === 'monthly' ? '/month' : '/night'}</p>
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

        {/* Lead Tracking Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Track Your Property Submissions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search by Tracking Reference</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter tracking reference (e.g., ABC12345)"
                      value={trackingReference}
                      onChange={(e) => setTrackingReference(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={searchByTrackingReference}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Filter by Status</label>
                  <select
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Under Review</option>
                    <option value="assigned">Assigned to Agent</option>
                    <option value="in_review">In Review</option>
                    <option value="requires_info">Info Required</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>💡 <strong>Tip:</strong> Use your tracking reference for quick access to specific submissions.</p>
              </div>
            </div>

            {/* Leads List */}
            <div className="space-y-4">
              {filteredLeads.map((lead, index) => {
                const statusInfo = getStatusInfo(lead.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Lead Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold mb-1">
                              {lead.propertyDetails?.title || `${lead.propertyType} Property`}
                            </h3>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {lead.address}, {lead.city}, {lead.state}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color} flex items-center gap-1`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusInfo.label}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tracking Reference</p>
                            <p className="font-mono font-semibold">{lead.id.substring(0, 8).toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Submitted</p>
                            <p className="font-semibold">{formatDate(lead.submissionDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Property Type</p>
                            <p className="font-semibold capitalize">{lead.propertyType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Estimated Rooms</p>
                            <p className="font-semibold">{lead.estimatedRooms}</p>
                          </div>
                          {lead.territory && (
                            <div>
                              <p className="text-sm text-muted-foreground">Territory</p>
                              <p className="font-semibold">{lead.territory.name}</p>
                            </div>
                          )}
                          {lead.agent && (
                            <div>
                              <p className="text-sm text-muted-foreground">Assigned Agent</p>
                              <p className="font-semibold">{lead.agent.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Contact Information */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Contact Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>{lead.propertyOwnerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{lead.phone}</span>
                            </div>
                          </div>
                          {lead.businessName && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Building className="w-3 h-3 text-muted-foreground" />
                              <span>{lead.businessName}</span>
                            </div>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Status Timeline
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-muted-foreground">Submitted:</span>
                              <span>{formatDate(lead.submissionDate)}</span>
                            </div>
                            {lead.lastContactDate && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-muted-foreground">Last Contact:</span>
                                <span>{formatDate(lead.lastContactDate)}</span>
                              </div>
                            )}
                            {lead.approvalDate && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-muted-foreground">
                                  {lead.status === 'approved' ? 'Approved:' : 'Decision:'}
                                </span>
                                <span>{formatDate(lead.approvalDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Additional Notes */}
                        {lead.notes && (
                          <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Additional Information
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {lead.status === 'rejected' && lead.rejectionReason && (
                          <div className="border-t pt-4 mt-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Rejection Reason
                              </h4>
                              <p className="text-sm text-red-700">{lead.rejectionReason}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="lg:w-64">
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <h4 className="font-semibold mb-3 text-purple-800">Next Steps</h4>
                          
                          {lead.status === 'pending' && (
                            <div className="space-y-2 text-sm text-purple-700">
                              <p>• Your submission is under review</p>
                              <p>• Expected response: 3-5 business days</p>
                              <p>• You'll be contacted if more info is needed</p>
                            </div>
                          )}
                          
                          {lead.status === 'assigned' && (
                            <div className="space-y-2 text-sm text-purple-700">
                              <p>• An agent has been assigned to your property</p>
                              <p>• They will contact you within 24 hours</p>
                              <p>• Prepare any additional documents they might need</p>
                            </div>
                          )}
                          
                          {lead.status === 'requires_info' && (
                            <div className="space-y-2 text-sm text-purple-700">
                              <p>• Additional information is required</p>
                              <p>• Check your email for specific requirements</p>
                              <p>• Contact our support team if you need help</p>
                            </div>
                          )}
                          
                          {lead.status === 'approved' && (
                            <div className="space-y-2 text-sm text-green-700">
                              <p>• Congratulations! Your property is approved</p>
                              <p>• You'll receive onboarding instructions soon</p>
                              <p>• Your property will be live within 24 hours</p>
                            </div>
                          )}
                          
                          {lead.status === 'rejected' && (
                            <div className="space-y-2 text-sm text-red-700">
                              <p>• Your submission was not approved</p>
                              <p>• Review the rejection reason above</p>
                              <p>• You can submit a new application</p>
                            </div>
                          )}

                          <div className="mt-4 pt-3 border-t border-purple-200">
                            <p className="text-xs text-purple-600 mb-2">Need help?</p>
                            <div className="space-y-1">
                              <a href="mailto:support@goroomz.com" className="text-xs text-purple-600 hover:underline block">
                                📧 support@goroomz.com
                              </a>
                              <a href="tel:+911234567890" className="text-xs text-purple-600 hover:underline block">
                                📞 +91 123 456 7890
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty State */}
              {!isLoading && filteredLeads.length === 0 && leads.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Submissions Found</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't submitted any properties for review yet.
                  </p>
                  <Button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Submit New Property
                  </Button>
                </div>
              )}

              {/* No Results After Filter */}
              {!isLoading && filteredLeads.length === 0 && leads.length > 0 && (
                <div className="text-center py-12">
                  <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                  <p className="text-muted-foreground mb-6">
                    No submissions match your current search criteria. Try adjusting your filters.
                  </p>
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setLeadStatusFilter('all');
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
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

