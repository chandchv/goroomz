import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import InternalUserList from '../components/users/InternalUserList';
import InternalUserForm from '../components/users/InternalUserForm';
import UserCreationModal from '../components/users/UserCreationModal';
import type { InternalUser } from '../services/internalUserService';
import internalUserService from '../services/internalUserService';
import subscriptionService from '../services/subscriptionService';
import configService from '../services/configService';
import { useToast } from '../hooks/useToast';

interface DashboardStats {
  totalInternalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalApiKeys: number;
  activeApiKeys: number;
}

interface InternalUserCounts {
  agents: number;
  regionalManagers: number;
  operationsManagers: number;
  platformAdmins: number;
  total: number;
}

const PlatformAdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalInternalUsers: 0,
    activeUsers: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalApiKeys: 0,
    activeApiKeys: 0,
  });
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'subscriptions' | 'api'>(
    'users'
  );
  const [internalUserCounts, setInternalUserCounts] = useState<InternalUserCounts>({
    agents: 0,
    regionalManagers: 0,
    operationsManagers: 0,
    platformAdmins: 0,
    total: 0,
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Load internal users stats
      const users = await internalUserService.getInternalUsers({});
      const activeUsers = users.filter((u: InternalUser) => u.isActive);

      // Load subscriptions stats
      const subscriptions = await subscriptionService.getSubscriptions({});
      const activeSubscriptions = subscriptions.filter(
        (s: any) => s.status === 'active'
      );

      // Load internal user counts by role
      await loadInternalUserCounts();

      setStats({
        totalInternalUsers: users.length,
        activeUsers: activeUsers.length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        totalApiKeys: 0, // TODO: Implement when API keys endpoint is ready
        activeApiKeys: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      showToast({ title: 'Failed to load dashboard statistics', type: 'error' });
    }
  };

  const loadInternalUserCounts = async () => {
    try {
      // Fetch counts for each role (excluding Superuser for Platform Admin)
      const [agentsRes, regionalManagersRes, operationsManagersRes, platformAdminsRes] = await Promise.all([
        internalUserService.getUsers({ role: 'agent', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'regional_manager', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'operations_manager', isActive: true, limit: 1 }),
        internalUserService.getUsers({ role: 'platform_admin', isActive: true, limit: 1 }),
      ]);

      const counts = {
        agents: agentsRes.count || 0,
        regionalManagers: regionalManagersRes.count || 0,
        operationsManagers: operationsManagersRes.count || 0,
        platformAdmins: platformAdminsRes.count || 0,
        total: 0,
      };

      counts.total = counts.agents + counts.regionalManagers + counts.operationsManagers + counts.platformAdmins;

      setInternalUserCounts(counts);
    } catch (error) {
      console.error('Error loading internal user counts:', error);
      // Don't show error toast for this, it's not critical
    }
  };

  const handleUserCreated = () => {
    // Reload dashboard data to update counts
    loadDashboardStats();
    setShowCreateUserModal(false);
  };

  const handleEditUser = (user: InternalUser) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleUserFormClose = () => {
    setShowUserForm(false);
    setSelectedUser(null);
  };

  const handleUserFormSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    loadDashboardStats();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Platform Administrator</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">
                Welcome back, {user?.name || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button 
              onClick={() => setShowCreateUserModal(true)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Create Internal User</span>
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
              <span className="text-xs font-medium text-gray-700 text-center">Manage Internal Users</span>
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
              <span className="text-xs font-medium text-gray-700 text-center">Manage Properties</span>
            </button>
            <button 
              onClick={() => setActiveTab('subscriptions')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Subscriptions</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Internal Users Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Internal Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {internalUserCounts.total}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.activeUsers} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
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
            {/* Role Breakdown */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Agents</span>
                <span className="font-semibold text-gray-900">{internalUserCounts.agents}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Regional Managers</span>
                <span className="font-semibold text-gray-900">{internalUserCounts.regionalManagers}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Operations Managers</span>
                <span className="font-semibold text-gray-900">{internalUserCounts.operationsManagers}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Platform Admins</span>
                <span className="font-semibold text-gray-900">{internalUserCounts.platformAdmins}</span>
              </div>
            </div>
          </div>

          {/* Subscriptions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalSubscriptions}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.activeSubscriptions} active
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* API Keys Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Keys</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalApiKeys}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.activeApiKeys} active
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Configuration
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'api'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                API Usage
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <InternalUserList
                onEditUser={handleEditUser}
                onCreateUser={handleCreateUser}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'config' && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  System Configuration
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configuration components will be implemented in subtask 26.3
                </p>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Subscription Management
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Subscription components will be implemented in subtask 26.4
                </p>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">API Usage</h3>
                <p className="mt-1 text-sm text-gray-500">
                  API usage statistics will be displayed here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <InternalUserForm
          user={selectedUser}
          onClose={handleUserFormClose}
          onSuccess={handleUserFormSuccess}
        />
      )}

      {/* User Creation Modal */}
      {showCreateUserModal && (
        <UserCreationModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={handleUserCreated}
        />
      )}
    </div>
  );
};

export default PlatformAdminDashboardPage;
