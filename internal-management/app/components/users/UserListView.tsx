import React, { useState, useEffect, useMemo } from 'react';
import type { InternalUser, GetUsersFilters } from '../../services/internalUserService';
import internalUserService from '../../services/internalUserService';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import UserListSkeleton from './UserListSkeleton';

interface UserListViewProps {
  users: InternalUser[];
  loading: boolean;
  onEdit: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onView: (userId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  filters: GetUsersFilters;
  onFiltersChange: (filters: GetUsersFilters) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

type SortField = 'name' | 'email' | 'role' | 'status' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

const UserListView: React.FC<UserListViewProps> = ({
  users,
  loading,
  onEdit,
  onDeactivate,
  onView,
  canEdit,
  canDelete,
  filters,
  onFiltersChange,
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const { showToast } = useToast();
  const { canEditUser, canDeactivateUser } = usePermissions();

  // Debounced search
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchQuery, page: 1 });
    }, 300);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery]);

  // Helper function to check if user is online
  const isUserOnline = (lastLoginAt?: string) => {
    if (!lastLoginAt) return false;
    const diffMs = new Date().getTime() - new Date(lastLoginAt).getTime();
    return diffMs < 300000; // Online if logged in within last 5 minutes
  };

  // Filter and sort users locally
  const sortedUsers = useMemo(() => {
    let filtered = [...users];

    // Apply online filter if enabled
    if (showOnlineOnly) {
      filtered = filtered.filter((user) => isUserOnline(user.lastLoginAt));
    }

    // Sort the filtered users
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.internalRole;
          bValue = b.internalRole;
          break;
        case 'status':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case 'lastLogin':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, sortField, sortDirection, showOnlineOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRoleFilterChange = (role: string) => {
    onFiltersChange({ ...filters, role: role || undefined, page: 1 });
  };

  const handleStatusFilterChange = (status: string) => {
    let isActive: boolean | undefined;
    if (status === 'active') isActive = true;
    else if (status === 'inactive') isActive = false;
    else isActive = undefined;

    onFiltersChange({ ...filters, isActive, page: 1 });
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

  const formatRoleName = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };



  if (loading) {
    return <UserListSkeleton rows={pagination.limit || 20} />;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters Section */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Role and Status Filters - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={filters.role || ''}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
              >
                <option value="">All Roles</option>
                <option value="agent">Agent</option>
                <option value="regional_manager">Regional Manager</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="platform_admin">Platform Admin</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={
                  filters.isActive === true
                    ? 'active'
                    : filters.isActive === false
                    ? 'inactive'
                    : ''
                }
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Online Filter Toggle */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Show online users only
              </span>
              <span className="ml-2 inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </span>
            </label>
            {showOnlineOnly && (
              <span className="ml-4 text-xs text-gray-500">
                ({sortedUsers.length} online user{sortedUsers.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('email')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Email
                  <SortIcon field="email" />
                </div>
              </th>
              <th
                onClick={() => handleSort('role')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Role
                  <SortIcon field="role" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th
                onClick={() => handleSort('lastLogin')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Last Login
                  <SortIcon field="lastLogin" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
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
                      onClick={() => onView(user.id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </button>
                    {canEdit && canEditUser(user.id, user.internalRole) && (
                      <button
                        onClick={() => onEdit(user.id)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && canDeactivateUser(user.id, user.internalRole) && (
                      user.isActive ? (
                        <button
                          onClick={() => onDeactivate(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => onDeactivate(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Reactivate
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="md:hidden">
        {sortedUsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No users found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                {/* User Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <OnlineStatusIndicator user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full flex-shrink-0 ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* User Details */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Role:</span>
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        user.internalRole
                      )}`}
                    >
                      {formatRoleName(user.internalRole)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{user.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Last Login:</span>
                    <span className="text-gray-900">{formatLastLogin(user.lastLoginAt)}</span>
                  </div>
                </div>

                {/* Action Buttons - Touch optimized */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => onView(user.id)}
                    className="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors"
                  >
                    View
                  </button>
                  {canEdit && canEditUser(user.id, user.internalRole) && (
                    <button
                      onClick={() => onEdit(user.id)}
                      className="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && canDeactivateUser(user.id, user.internalRole) && (
                    user.isActive ? (
                      <button
                        onClick={() => onDeactivate(user.id)}
                        className="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => onDeactivate(user.id)}
                        className="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 active:bg-green-200 transition-colors"
                      >
                        Reactivate
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="px-4 md:px-6 py-4 border-t border-gray-200">
        {/* Mobile Pagination */}
        <div className="md:hidden space-y-3">
          {/* Results count and per page selector */}
          <div className="flex items-center justify-between text-xs">
            <div className="text-gray-700">
              <span className="font-medium">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </span>
              {' - '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>
              {' of '}
              <span className="font-medium">{pagination.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-700">Per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 border rounded text-sm ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserListView;
