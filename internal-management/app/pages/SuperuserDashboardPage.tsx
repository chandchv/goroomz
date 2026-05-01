import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import RoleManagement from '../components/roles/RoleManagement';
import AuditLogViewer from '../components/audit/AuditLogViewer';
import FinancialSummary from '../components/financial/FinancialSummary';
import UserCreationModal from '../components/users/UserCreationModal';
import { analyticsService } from '../services/analyticsService';
import auditService from '../services/auditService';
import internalUserService from '../services/internalUserService';
import { useToast } from '../hooks/useToast';

interface PlatformOverview {
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  activeAgents: number;
  pendingApprovals: number;
  criticalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface InternalUserCounts {
  agents: number;
  regionalManagers: number;
  operationsManagers: number;
  platformAdmins: number;
  superusers: number;
  total: number;
}

const SuperuserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<PlatformOverview>({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    activeAgents: 0,
    pendingApprovals: 0,
    criticalAlerts: 0,
    systemHealth: 'healthy',
  });
  const [recentCriticalActions, setRecentCriticalActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'audit' | 'financial'>(
    'overview'
  );
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [internalUserCounts, setInternalUserCounts] = useState<InternalUserCounts>({
    agents: 0,
    regionalManagers: 0,
    operationsManagers: 0,
    platformAdmins: 0,
    superusers: 0,
    total: 0,
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load platform analytics
      const analytics = await analyticsService.getPlatformAnalytics({});
      
      // Load critical audit logs
      const criticalLogs = await auditService.getCriticalActions({ limit: 5 });

      // Load internal user counts by role
      await loadInternalUserCounts();

      setOverview({
        totalProperties: analytics.metrics?.totalProperties || 0,
        totalBookings: analytics.metrics?.totalBookings || 0,
        totalRevenue: analytics.metrics?.totalRevenue || 0,
        totalUsers: analytics.metrics?.activePropertyOwners || 0,
        activeAgents: 0, // TODO: Get from internal users endpoint
        pendingApprovals: 0, // TODO: Get from leads endpoint
        criticalAlerts: 0, // TODO: Get from alerts endpoint
        systemHealth: 'healthy', // TODO: Get from health endpoint
      });

      setRecentCriticalActions(criticalLogs.logs || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast({ title: 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadInternalUserCounts = async () => {
    try {
      // Fetch counts for each role
      const [agentsRes, regionalManagersRes, operationsManagersRes, platformAdminsRes, superusersRes] = await Promise.all([
        internalUserService.getUsers({ role: 'agent', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'regional_manager', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'operations_manager', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'platform_admin', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'superuser', isActive: true, limit: 1 }),
      ]);

      const counts = {
        agents: agentsRes.count || 0,
        regionalManagers: regionalManagersRes.count || 0,
        operationsManagers: operationsManagersRes.count || 0,
        platformAdmins: platformAdminsRes.count || 0,
        superusers: superusersRes.count || 0,
        total: 0,
      };

      counts.total = counts.agents + counts.regionalManagers + counts.operationsManagers + counts.platformAdmins + counts.superusers;

      setInternalUserCounts(counts);
    } catch (error) {
      console.error('Error loading internal user counts:', error);
      // Don't show error toast for this, it's not critical
    }
  };

  const handleUserCreated = () => {
    // Reload dashboard data to update counts
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Superuser Dashboard</h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                    Welcome back, {user?.name || 'Superuser'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shadow-sm ${getHealthColor(
                  overview.systemHealth
                )}`}
              >
                <span className="hidden sm:inline">System: </span>{overview.systemHealth.charAt(0).toUpperCase() + overview.systemHealth.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap min-h-touch flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Platform Overview
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap min-h-touch flex items-center gap-2 ${
                  activeTab === 'roles'
                    ? 'border-purple-500 text-purple-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Role Management
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap min-h-touch flex items-center gap-2 ${
                  activeTab === 'audit'
                    ? 'border-purple-500 text-purple-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Audit Logs
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap min-h-touch flex items-center gap-2 ${
                  activeTab === 'financial'
                    ? 'border-purple-500 text-purple-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Financial Summary
              </button>
            </nav>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
            {/* Platform Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button 
                      onClick={() => setShowCreateUserModal(true)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Create User</span>
                    </button>
                    <button 
                      onClick={() => navigate('/internal-users')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Manage Users</span>
                    </button>
                    <button 
                      onClick={() => navigate('/property-owners')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Add Property</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('roles')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Manage Roles</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('audit')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">View Logs</span>
                    </button>
                    <button 
                      onClick={() => navigate('/analytics')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Alerts</span>
                    </button>
                    <button 
                      onClick={() => navigate('/settings')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center">Settings</span>
                    </button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {/* Total Properties */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Properties</h3>
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1">{overview.totalProperties}</p>
                    <p className="text-xs opacity-75">Active properties</p>
                  </div>

                  {/* Total Bookings */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Bookings</h3>
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1">{overview.totalBookings}</p>
                    <p className="text-xs opacity-75">All time bookings</p>
                  </div>

                  {/* Total Revenue */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Revenue</h3>
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1">{formatCurrency(overview.totalRevenue)}</p>
                    <p className="text-xs opacity-75">Platform revenue</p>
                  </div>

                  {/* Total Internal Users */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold opacity-90">Internal Users</h3>
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1">{internalUserCounts.total}</p>
                    <p className="text-xs opacity-75">Active team members</p>
                  </div>
                </div>

                {/* Internal Users Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Internal Team Overview</h3>
                    <button
                      onClick={() => navigate('/internal-users')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500 rounded">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-blue-900">Agents</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{internalUserCounts.agents}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500 rounded">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-green-900">Regional Mgrs</p>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{internalUserCounts.regionalManagers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-purple-900">Operations Mgrs</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">{internalUserCounts.operationsManagers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-yellow-500 rounded">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-yellow-900">Platform Admins</p>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">{internalUserCounts.platformAdmins}</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-red-500 rounded">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-red-900">Superusers</p>
                      </div>
                      <p className="text-2xl font-bold text-red-900">{internalUserCounts.superusers}</p>
                    </div>
                  </div>
                </div>

                {/* Alerts and Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Critical Alerts */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Critical Alerts
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {overview.criticalAlerts > 0 ? (
                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                          <div className="p-2 bg-red-100 rounded-full">
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {overview.criticalAlerts} Critical Issues
                            </p>
                            <p className="text-xs text-gray-600">Require immediate attention</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <svg
                            className="mx-auto h-12 w-12 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">No critical alerts</p>
                        </div>
                      )}
                      {overview.pendingApprovals > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                          <div className="p-2 bg-yellow-100 rounded-full">
                            <svg
                              className="w-5 h-5 text-yellow-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {overview.pendingApprovals} Pending Approvals
                            </p>
                            <p className="text-xs text-gray-600">Property onboardings awaiting review</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Critical Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Recent Critical Actions
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {recentCriticalActions.length > 0 ? (
                        recentCriticalActions.map((action) => (
                          <div
                            key={action.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="p-2 bg-red-100 rounded-full">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {action.action}
                              </p>
                              <p className="text-xs text-gray-600">
                                {action.userName} • {formatDate(action.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-600">No recent critical actions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Management Tab */}
            {activeTab === 'roles' && <RoleManagement />}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && <AuditLogViewer />}

            {/* Financial Summary Tab */}
            {activeTab === 'financial' && <FinancialSummary />}
          </div>
        </div>
      </div>

      {/* User Creation Modal */}
      <UserCreationModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
      />
    </div>
  );
};

export default SuperuserDashboardPage;
