import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, type PlatformMetrics } from '../services/analyticsService';
import { ticketService, type SupportTicket } from '../services/ticketService';
import SupportTicketList from '../components/tickets/SupportTicketList';
import TicketDetailView from '../components/tickets/TicketDetailView';
import PropertySearchBar, { type PropertySearchResult } from '../components/properties/PropertySearchBar';
import PlatformAnalytics from '../components/analytics/PlatformAnalytics';
import AlertsPanel from '../components/analytics/AlertsPanel';
import AnnouncementCreationForm from '../components/announcements/AnnouncementCreationForm';
import { useSwipe } from '../hooks/useSwipe';
import internalUserService, { type InternalUser, type GetUsersFilters } from '../services/internalUserService';
import UserDetailView from '../components/users/UserDetailView';
import OnlineStatusIndicator from '../components/users/OnlineStatusIndicator';

type ViewMode = 'overview' | 'tickets' | 'analytics' | 'alerts' | 'announcements' | 'team';

export default function OperationsManagerDashboardPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Overview data
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageOccupancy: 0,
    activePropertyOwners: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
  });
  
  // Tickets data
  const [ticketStats, setTicketStats] = useState({
    new: 0,
    inProgress: 0,
    urgent: 0,
  });
  
  // Modals
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  
  // Team/Users data
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilters, setUserFilters] = useState<GetUsersFilters>({
    page: 1,
    limit: 20,
  });
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (viewMode === 'team') {
      loadUsers();
    }
  }, [viewMode, userFilters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load platform metrics
      const metricsData = await analyticsService.getRealTimeMetrics();
      setMetrics(metricsData);

      // Load ticket statistics
      const ticketsResponse = await ticketService.getTickets({ limit: 100 });
      const tickets = ticketsResponse.data;
      
      setTicketStats({
        new: tickets.filter(t => t.status === 'new').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await internalUserService.getUsers(userFilters);
      setUsers(response.data);
      setUsersPagination({
        page: response.page,
        limit: userFilters.limit || 20,
        total: response.count,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handlePropertySelect = (property: PropertySearchResult) => {
    // Navigate to property management interface
    console.log('Selected property:', property);
    // TODO: Implement navigation to property detail page
    alert(`Accessing property: ${property.name}`);
  };

  const handlePropertySelectById = (propertyId: string) => {
    // Navigate to property management interface by ID
    console.log('Selected property ID:', propertyId);
    // TODO: Implement navigation to property detail page
    alert(`Accessing property ID: ${propertyId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    setUserFilters({ ...userFilters, search: query, page: 1 });
  };

  const handleUserRoleFilter = (role: string) => {
    setUserFilters({ ...userFilters, role: role || undefined, page: 1 });
  };

  const formatRoleName = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      agent: 'bg-blue-100 text-blue-800',
      regional_manager: 'bg-purple-100 text-purple-800',
      operations_manager: 'bg-green-100 text-green-800',
      platform_admin: 'bg-orange-100 text-orange-800',
      superuser: 'bg-red-100 text-red-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never';
    
    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // Swipe gesture support for tab navigation
  const viewModes: ViewMode[] = ['overview', 'tickets', 'analytics', 'alerts', 'announcements', 'team'];
  const currentIndex = viewModes.indexOf(viewMode);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (currentIndex < viewModes.length - 1) {
        setViewMode(viewModes[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        setViewMode(viewModes[currentIndex - 1]);
      }
    },
    threshold: 50,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Operations Manager Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">Welcome back, {user?.name}</p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
              <button
                onClick={() => setShowPropertySearch(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center min-h-touch text-sm sm:text-base"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="whitespace-nowrap">Access Property</span>
              </button>
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-h-touch text-sm sm:text-base"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="whitespace-nowrap">New Announcement</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-sm sm:text-base text-red-800">{error}</p>
          </div>
        )}

        {/* Platform Health Overview - Always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Properties</div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalProperties)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Bookings</div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalBookings)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Platform Occupancy</div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatPercentage(metrics.averageOccupancy)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Revenue</div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</div>
          </div>
        </div>

        {/* Support Tickets Alert */}
        {(ticketStats.new > 0 || ticketStats.urgent > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-800 font-medium">
                {ticketStats.new} new ticket{ticketStats.new !== 1 ? 's' : ''}
                {ticketStats.urgent > 0 && ` • ${ticketStats.urgent} urgent ticket${ticketStats.urgent !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  viewMode === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Platform Overview
              </button>
              <button
                onClick={() => setViewMode('tickets')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors relative ${
                  viewMode === 'tickets'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Support Tickets
                {ticketStats.new > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                    {ticketStats.new}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  viewMode === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Platform Analytics
              </button>
              <button
                onClick={() => setViewMode('alerts')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  viewMode === 'alerts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Property Health Alerts
              </button>
              <button
                onClick={() => setViewMode('announcements')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  viewMode === 'announcements'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Announcements
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  viewMode === 'team'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                View Team
              </button>
            </div>
          </div>

          <div className="p-6" {...swipeHandlers}>
            {/* Swipe indicator for mobile */}
            <div className="md:hidden text-center text-xs text-gray-400 mb-3">
              ← Swipe to navigate →
            </div>

            {viewMode === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-2">Active Property Owners</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.activePropertyOwners)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Rooms</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalRooms)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-2">Occupied / Vacant</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(metrics.occupiedRooms)} / {formatNumber(metrics.vacantRooms)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setViewMode('tickets')}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Manage Support Tickets</h4>
                          <p className="text-sm text-gray-600">View and respond to property owner issues</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setViewMode('alerts')}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Property Health Alerts</h4>
                          <p className="text-sm text-gray-600">Review properties with issues</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowPropertySearch(true)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Access Property</h4>
                          <p className="text-sm text-gray-600">Search and manage any property</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowAnnouncementForm(true)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Broadcast Announcement</h4>
                          <p className="text-sm text-gray-600">Send updates to property owners</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setViewMode('team')}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">View Team</h4>
                          <p className="text-sm text-gray-600">Browse all internal team members</p>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'tickets' && (
              <SupportTicketList onTicketSelect={setSelectedTicket} />
            )}

            {viewMode === 'analytics' && (
              <PlatformAnalytics />
            )}

            {viewMode === 'alerts' && (
              <AlertsPanel onPropertySelect={handlePropertySelectById} />
            )}

            {viewMode === 'announcements' && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <p className="mb-4">Announcement history will be displayed here</p>
                <button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Announcement
                </button>
              </div>
            )}

            {viewMode === 'team' && (
              <div className="space-y-6">
                {/* Search and Filter Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Team Members
                    </label>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      placeholder="Search by name, email, or role..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Role
                    </label>
                    <select
                      value={userFilters.role || ''}
                      onChange={(e) => handleUserRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Roles</option>
                      <option value="agent">Agent</option>
                      <option value="regional_manager">Regional Manager</option>
                      <option value="operations_manager">Operations Manager</option>
                      <option value="platform_admin">Platform Admin</option>
                      <option value="superuser">Superuser</option>
                    </select>
                  </div>
                </div>

                {/* User List - Read-only */}
                {usersLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Login
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No team members found
                              </td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <OnlineStatusIndicator user={user} />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                      <div className="text-sm text-gray-500">{user.phone}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                                      user.internalRole
                                    )}`}
                                  >
                                    {formatRoleName(user.internalRole)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      user.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {user.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatLastLogin(user.lastLoginAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => setSelectedUserId(user.id)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {usersPagination.totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">
                            {usersPagination.total === 0 ? 0 : (usersPagination.page - 1) * usersPagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{usersPagination.total}</span> results
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setUserFilters({ ...userFilters, page: usersPagination.page - 1 })}
                            disabled={usersPagination.page === 1}
                            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          <span className="text-sm text-gray-700">
                            Page {usersPagination.page} of {usersPagination.totalPages}
                          </span>

                          <button
                            onClick={() => setUserFilters({ ...userFilters, page: usersPagination.page + 1 })}
                            disabled={usersPagination.page === usersPagination.totalPages}
                            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Read-Only Access</p>
                      <p>As an Operations Manager, you can view team member information but cannot edit or manage users. Contact a Platform Administrator or Superuser for user management tasks.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <TicketDetailView
                ticketId={selectedTicket.id}
                onClose={() => setSelectedTicket(null)}
                onUpdate={loadDashboardData}
              />
            </div>
          </div>
        </div>
      )}

      {/* Property Search Modal */}
      {showPropertySearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Search Properties</h2>
              <button
                onClick={() => setShowPropertySearch(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PropertySearchBar
              onPropertySelect={(property) => {
                handlePropertySelect(property);
                setShowPropertySearch(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Announcement Form Modal */}
      {showAnnouncementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Create Announcement</h2>
              <button
                onClick={() => setShowAnnouncementForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AnnouncementCreationForm
                onSuccess={() => {
                  setShowAnnouncementForm(false);
                  loadDashboardData();
                }}
                onCancel={() => setShowAnnouncementForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal (Read-only) */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <UserDetailView userId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
