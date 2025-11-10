import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Edit, Trash2, Plus, Loader2, Users, CheckCircle, XCircle, Eye, Shield, Building, UserCheck, UserX, Search, Filter, Upload, Download, Star } from 'lucide-react';
import PropertyListingWizard from '@/components/PropertyListingWizard';
import EditRoomModal from '@/components/EditRoomModal';
import roomService from '@/services/roomService';
import bookingService from '@/services/bookingService';
import userService from '@/services/userService';
import apiService from '@/services/api';

const AdminPage = () => {
  const [rooms, setRooms] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingRooms, setPendingRooms] = useState([]);
  const [categoryOwners, setCategoryOwners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [adminStats, setAdminStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');
  const [propertyCategoryFilter, setPropertyCategoryFilter] = useState('all');
  const [propertyCityFilter, setPropertyCityFilter] = useState('all');
  const [propertyStateFilter, setPropertyStateFilter] = useState('all');
  const [propertyAreaFilter, setPropertyAreaFilter] = useState('all');
  const [propertyCountryFilter, setPropertyCountryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('properties');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [csvFile, setCsvFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const loadAdminData = async () => {
      try {
        setIsLoading(true);
        
        // Load all admin data in parallel
        const [
          roomsResponse, 
          allPropertiesResponse,
          bookingsResponse, 
          pendingRoomsResponse,
          categoryOwnersResponse,
          usersResponse,
          userStatsResponse,
          statsResponse
        ] = await Promise.all([
          roomService.getMyRooms(),
          apiService.get('/admin/rooms'), // Get all properties via admin endpoint
          bookingService.getOwnerBookings(),
          apiService.get('/rooms/pending'),
          apiService.get('/users?role=category_owner'),
          userService.getUsers(),
          userService.getUserStats(),
          apiService.get('/rooms/admin/stats')
        ]);

        if (roomsResponse.success) {
          setRooms(roomsResponse.data.rooms || roomsResponse.data);
        }

        if (allPropertiesResponse.success) {
          setAllProperties(allPropertiesResponse.data);
        }

        if (bookingsResponse && bookingsResponse.success) {
          setBookings(bookingsResponse.data.bookings || bookingsResponse.data || []);
        } else {
          setBookings([]);
        }

        if (pendingRoomsResponse.success) {
          setPendingRooms(pendingRoomsResponse.data.rooms || pendingRoomsResponse.data);
        }

        if (categoryOwnersResponse.success) {
          setCategoryOwners(categoryOwnersResponse.data.users || categoryOwnersResponse.data);
        }

        if (usersResponse.success) {
          setAllUsers(usersResponse.data.users || usersResponse.data);
        }

        if (userStatsResponse.success) {
          setUserStats(userStatsResponse.data);
        }

        if (statsResponse.success) {
          setAdminStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load admin data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCsvFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setImportResults(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive"
      });
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await apiService.postFormData('/admin/import-csv', formData);

      if (response.success) {
        setImportResults(response.data);
        toast({
          title: "CSV Import Successful",
          description: `Imported ${response.data.imported} rooms successfully.`,
        });
        // Refresh rooms data
        loadAdminData();
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadCsvTemplate = () => {
    const template = [
      'Title,Description,Category,Price,Address,City,State,Area,Amenities,Contact,MaxGuests',
      'Sample PG Name,Sample description,PG,8000,Sample address,Bangalore,Karnataka,Sample Area,"wifi,ac,meals",9876543210,2'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pg_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleAddRoom = async (newRoom) => {
    try {
      const response = await roomService.createRoom(newRoom);
      if (response.success) {
        setRooms([...rooms, response.data]);
        toast({ title: "Room added successfully! ✨" });
      }
    } catch (error) {
      toast({
        title: "Add Room Failed",
        description: "Failed to add new room.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRoom = async (roomId, updatedRoom) => {
    try {
      const response = await roomService.updateRoom(roomId, updatedRoom);
      if (response.success) {
        const updatedRooms = rooms.map(room => 
          room.id === roomId ? response.data : room
        );
        setRooms(updatedRooms);
        setSelectedRoom(null);
        setIsEditModalOpen(false);
        toast({ title: "Room updated successfully! ✨" });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update room information.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const response = await roomService.deleteRoom(roomId);
        if (response.success) {
          // Update local state immediately
          const updatedRooms = rooms.filter(room => room.id !== roomId);
          setRooms(updatedRooms);
          
          // Update allProperties state
          const updatedAllProperties = allProperties.filter(property => property.id !== roomId);
          setAllProperties(updatedAllProperties);
          
          toast({ 
            title: "Room deleted successfully! 🗑️",
            description: "The property has been removed from the system."
          });
          
          // Refresh all admin data to ensure consistency
          await loadAdminData();
        }
      } catch (error) {
        console.error('Error deleting room:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete room. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleBulkApprove = async (roomIds) => {
    try {
      const promises = roomIds.map(roomId => 
        apiService.put(`/rooms/${roomId}/approve`, { status: 'approved' })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Bulk Approval Complete",
        description: `${roomIds.length} properties have been approved.`,
      });
      
      loadAdminData();
    } catch (error) {
      console.error('Error bulk approving rooms:', error);
      toast({
        title: "Error",
        description: "Failed to approve some properties.",
        variant: "destructive"
      });
    }
  };

  // Get unique values for location filters
  const getUniqueCities = () => {
    const cities = allProperties
      .map(property => property.location?.city)
      .filter(city => city && city.trim() !== '')
      .filter((city, index, arr) => arr.indexOf(city) === index)
      .sort();
    return cities;
  };

  const getUniqueStates = () => {
    const states = allProperties
      .map(property => property.location?.state)
      .filter(state => state && state.trim() !== '')
      .filter((state, index, arr) => arr.indexOf(state) === index)
      .sort();
    return states;
  };

  const getUniqueAreas = () => {
    const areas = allProperties
      .map(property => property.location?.area)
      .filter(area => area && area.trim() !== '')
      .filter((area, index, arr) => arr.indexOf(area) === index)
      .sort();
    return areas;
  };

  const getUniqueCountries = () => {
    const countries = allProperties
      .map(property => property.location?.country)
      .filter(country => country && country.trim() !== '')
      .filter((country, index, arr) => arr.indexOf(country) === index)
      .sort();
    return countries;
  };

  const handleEditClick = (room) => {
    setSelectedRoom(room);
    setIsEditModalOpen(true);
  };

  const handleApproveRoom = async (roomId) => {
    try {
      const response = await apiService.put(`/rooms/${roomId}/approve`);
      if (response.success) {
        setPendingRooms(pendingRooms.filter(room => room.id !== roomId));
        toast({ title: "Room approved successfully! ✅" });
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve room.",
        variant: "destructive"
      });
    }
  };

  const handleRejectRoom = async (roomId, reason = '') => {
    try {
      const response = await apiService.put(`/rooms/${roomId}/reject`, {
        rejectionReason: reason || 'Room does not meet our standards'
      });
      if (response.success) {
        setPendingRooms(pendingRooms.filter(room => room.id !== roomId));
        toast({ title: "Room rejected successfully! ❌" });
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject room.",
        variant: "destructive"
      });
    }
  };

  // User Management Functions
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const response = await userService.updateUserRole(userId, newRole);
      if (response.success) {
        setAllUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
        toast({ 
          title: "Role Updated! 👑", 
          description: `User role changed to ${userService.getRoleDisplayName(newRole)}`
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update user role.",
        variant: "destructive"
      });
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    try {
      const response = isActive 
        ? await userService.activateUser(userId)
        : await userService.deactivateUser(userId);
      
      if (response.success) {
        setAllUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, isActive: isActive } : user
          )
        );
        toast({ 
          title: isActive ? "User Activated! ✅" : "User Deactivated! ⏸️",
          description: `User has been ${isActive ? 'activated' : 'deactivated'}`
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update user status.",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - GoRoomz</title>
        <meta name="description" content="Manage rooms and bookings on GoRoomz." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Admin Panel</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Room
          </Button>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-effect p-4 rounded-xl text-center">
            <Building className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="text-2xl font-bold">{adminStats.totalRooms || 0}</h3>
            <p className="text-sm text-muted-foreground">Total Rooms</p>
          </div>
          <div className="glass-effect p-4 rounded-xl text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="text-2xl font-bold">{adminStats.approvedRooms || 0}</h3>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
          <div className="glass-effect p-4 rounded-xl text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <h3 className="text-2xl font-bold">{adminStats.pendingRooms || 0}</h3>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="glass-effect p-4 rounded-xl text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="text-2xl font-bold">{categoryOwners.length}</h3>
            <p className="text-sm text-muted-foreground">Category Owners</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'properties' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rooms' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            My Rooms
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pending' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Pending Approval ({pendingRooms.length})
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'owners' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Category Owners
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bookings' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            User Management ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('csv-import')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'csv-import' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'properties' && (
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">All Properties Management</h2>
                <p className="text-gray-600 mt-1">
                  Total: {allProperties.length} properties | 
                  Approved: {allProperties.filter(p => p.approvalStatus === 'approved').length} | 
                  Pending: {allProperties.filter(p => p.approvalStatus === 'pending').length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const selectedProperties = allProperties.filter(p => p.approvalStatus === 'pending');
                    if (selectedProperties.length > 0) {
                      handleBulkApprove(selectedProperties.map(p => p.id));
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve All Pending
                </Button>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Property
                </Button>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search properties by title or address..."
                    value={propertySearchQuery}
                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filter Row 1: Status and Category */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={propertyStatusFilter}
                  onChange={(e) => setPropertyStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={propertyCategoryFilter}
                  onChange={(e) => setPropertyCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All Categories</option>
                  <option value="PG">PG</option>
                  <option value="Hotel Room">Hotel Room</option>
                  <option value="Home Stay">Home Stay</option>
                  <option value="Independent Home">Independent Home</option>
                </select>
              </div>

              {/* Filter Row 2: Location Filters */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={propertyCountryFilter}
                  onChange={(e) => setPropertyCountryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All Countries</option>
                  {getUniqueCountries().map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <select
                  value={propertyStateFilter}
                  onChange={(e) => setPropertyStateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All States</option>
                  {getUniqueStates().map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <select
                  value={propertyCityFilter}
                  onChange={(e) => setPropertyCityFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All Cities</option>
                  {getUniqueCities().map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <select
                  value={propertyAreaFilter}
                  onChange={(e) => setPropertyAreaFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                >
                  <option value="all">All Areas</option>
                  {getUniqueAreas().map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPropertySearchQuery('');
                    setPropertyStatusFilter('all');
                    setPropertyCategoryFilter('all');
                    setPropertyCountryFilter('all');
                    setPropertyStateFilter('all');
                    setPropertyCityFilter('all');
                    setPropertyAreaFilter('all');
                  }}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(() => {
              const activeFilters = [];
              if (propertySearchQuery) activeFilters.push(`Search: "${propertySearchQuery}"`);
              if (propertyStatusFilter !== 'all') activeFilters.push(`Status: ${propertyStatusFilter}`);
              if (propertyCategoryFilter !== 'all') activeFilters.push(`Category: ${propertyCategoryFilter}`);
              if (propertyCountryFilter !== 'all') activeFilters.push(`Country: ${propertyCountryFilter}`);
              if (propertyStateFilter !== 'all') activeFilters.push(`State: ${propertyStateFilter}`);
              if (propertyCityFilter !== 'all') activeFilters.push(`City: ${propertyCityFilter}`);
              if (propertyAreaFilter !== 'all') activeFilters.push(`Area: ${propertyAreaFilter}`);

              const filteredCount = allProperties.filter(property => {
                const matchesSearch = property.title.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
                  property.location?.address?.toLowerCase().includes(propertySearchQuery.toLowerCase());
                const matchesStatus = propertyStatusFilter === 'all' || property.approvalStatus === propertyStatusFilter;
                const matchesCategory = propertyCategoryFilter === 'all' || property.category === propertyCategoryFilter;
                const matchesCountry = propertyCountryFilter === 'all' || property.location?.country === propertyCountryFilter;
                const matchesState = propertyStateFilter === 'all' || property.location?.state === propertyStateFilter;
                const matchesCity = propertyCityFilter === 'all' || property.location?.city === propertyCityFilter;
                const matchesArea = propertyAreaFilter === 'all' || property.location?.area === propertyAreaFilter;
                return matchesSearch && matchesStatus && matchesCategory && matchesCountry && matchesState && matchesCity && matchesArea;
              }).length;

              return activeFilters.length > 0 ? (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeFilters.map((filter, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {filter}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-blue-600 font-medium">
                      {filteredCount} of {allProperties.length} properties
                    </span>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
              {allProperties
                .filter(property => {
                  const matchesSearch = property.title.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
                    property.location?.address?.toLowerCase().includes(propertySearchQuery.toLowerCase());
                  const matchesStatus = propertyStatusFilter === 'all' || property.approvalStatus === propertyStatusFilter;
                  const matchesCategory = propertyCategoryFilter === 'all' || property.category === propertyCategoryFilter;
                  const matchesCountry = propertyCountryFilter === 'all' || property.location?.country === propertyCountryFilter;
                  const matchesState = propertyStateFilter === 'all' || property.location?.state === propertyStateFilter;
                  const matchesCity = propertyCityFilter === 'all' || property.location?.city === propertyCityFilter;
                  const matchesArea = propertyAreaFilter === 'all' || property.location?.area === propertyAreaFilter;
                  return matchesSearch && matchesStatus && matchesCategory && matchesCountry && matchesState && matchesCity && matchesArea;
                })
                .map(property => (
                  <div key={property.id} className="bg-white/50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{property.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {property.location?.address}, {property.location?.city}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            property.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            property.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {property.approvalStatus}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {property.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-lg font-bold text-purple-600">₹{property.price}</p>
                        <p className="text-xs text-gray-500">
                          {property.pricingType === 'monthly' ? '/month' : '/night'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Max {property.maxGuests} guests</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-sm">{property.rating?.average || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditClick(property)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`/property/${property.id}`, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteRoom(property.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {allProperties.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Properties Found</h3>
                <p className="text-gray-500">Start by adding your first property.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">My Rooms</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{room.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.location?.address}, {room.location?.city} - ₹{room.price}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className={`font-semibold ${
                        room.approvalStatus === 'approved' ? 'text-green-600' :
                        room.approvalStatus === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>{room.approvalStatus}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(room)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Pending Room Approvals</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {pendingRooms.length > 0 ? pendingRooms.map(room => (
                <div key={room.id} className="p-4 bg-white/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{room.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {room.location?.address}, {room.location?.city} - ₹{room.price}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Category Owner: {room.categoryOwner?.name} ({room.categoryOwner?.email})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveRoom(room.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRejectRoom(room.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                </div>
              )) : (
                <p className="text-muted-foreground">No pending room approvals.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'owners' && (
          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Category Owners</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {categoryOwners.length > 0 ? categoryOwners.map(owner => (
                <div key={owner.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{owner.name}</p>
                    <p className="text-sm text-muted-foreground">{owner.email}</p>
                    <p className="text-sm text-muted-foreground">{owner.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(owner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Category Owner</span>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground">No category owners registered.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="glass-effect p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Recent Bookings</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking.id} className="p-4 bg-white/50 rounded-lg">
                  <p className="font-semibold">{booking.room?.title || 'Room'}</p>
                  <p className="text-sm">Booked by: {booking.user?.name} ({booking.user?.email})</p>
                  <p className="text-sm text-muted-foreground">
                    Check-in: {new Date(booking.checkIn).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className={`font-semibold ${
                      booking.status === 'confirmed' ? 'text-green-600' :
                      booking.status === 'pending' ? 'text-yellow-600' :
                      booking.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                    }`}>{booking.status}</span>
                  </p>
                </div>
              )) : (
                <p className="text-muted-foreground">No bookings yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Regular Users</option>
                  <option value="owner">Property Owners</option>
                  <option value="category_owner">Category Owners</option>
                  <option value="admin">Administrators</option>
                </select>
        </div>
      </div>

            {/* User Stats */}
            {userStats && Object.keys(userStats).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/50 p-4 rounded-lg text-center">
                  <h3 className="text-2xl font-bold text-blue-600">{userStats.totalUsers || 0}</h3>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="bg-white/50 p-4 rounded-lg text-center">
                  <h3 className="text-2xl font-bold text-green-600">{userStats.activeUsers || 0}</h3>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="bg-white/50 p-4 rounded-lg text-center">
                  <h3 className="text-2xl font-bold text-purple-600">{userStats.recentUsers || 0}</h3>
                  <p className="text-sm text-muted-foreground">New This Month</p>
                </div>
                <div className="bg-white/50 p-4 rounded-lg text-center">
                  <h3 className="text-2xl font-bold text-orange-600">{userStats.verifiedUsers || 0}</h3>
                  <p className="text-sm text-muted-foreground">Verified Users</p>
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <div key={user.id} className="p-4 bg-white/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${userService.getRoleColor(user.role)}`}>
                          {userService.getRoleDisplayName(user.role)}
                        </span>
                        {!user.isActive && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-muted-foreground mb-2">📞 {user.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at || user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {/* Role Change Dropdown */}
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        className="px-3 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        disabled={user.role === 'admin'}
                      >
                        <option value="user">Regular User</option>
                        <option value="owner">Property Owner</option>
                        <option value="category_owner">Category Owner</option>
                        <option value="admin" disabled>Administrator</option>
                      </select>

                      {/* Toggle User Status */}
                      <Button
                        size="sm"
                        variant={user.isActive ? "destructive" : "default"}
                        onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                        className="text-xs"
                        disabled={user.role === 'admin'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-8">
                  {userSearchQuery || userRoleFilter !== 'all' 
                    ? 'No users found matching your criteria.' 
                    : 'No users found.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* CSV Import Tab */}
        {activeTab === 'csv-import' && (
          <div className="glass-effect p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">CSV Import</h2>
              <div className="flex gap-2">
                <Button
                  onClick={downloadCsvTemplate}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-white/50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                  <p className="text-gray-600 mb-4">
                    Select a CSV file containing PG data to import into the system.
                  </p>
                  
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </label>
                  
                  {csvFile && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        <strong>Selected:</strong> {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Button */}
              {csvFile && (
                <div className="text-center">
                  <Button
                    onClick={handleCsvImport}
                    disabled={isImporting}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV Data
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">Import Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                      <div className="text-sm text-green-700">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                      <div className="text-sm text-yellow-700">Skipped</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                      <div className="text-sm text-red-700">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                      <div className="text-sm text-blue-700">Total</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">CSV Format Instructions</h3>
                <div className="text-blue-700 space-y-2">
                  <p><strong>Required columns:</strong> Title, Description, Category, Price, Address, City, State, Area</p>
                  <p><strong>Optional columns:</strong> Amenities, Contact, MaxGuests</p>
                  <p><strong>Category:</strong> Must be one of: PG, Hotel Room, Home Stay, Independent Home</p>
                  <p><strong>Amenities:</strong> Comma-separated list (e.g., "wifi,ac,meals")</p>
                  <p><strong>Contact:</strong> 10-digit phone number</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PropertyListingWizard
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddRoom}
      />

      {selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateRoom}
        />
      )}
    </>
  );
};

export default AdminPage;