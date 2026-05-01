import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import internalUserService from '../../services/internalUserService';
import auditService from '../../services/auditService';
import ResetPasswordDialog from './ResetPasswordDialog';
import type { InternalUser, PerformanceMetrics } from '../../services/internalUserService';
import type { AuditLog } from '../../services/auditService';

interface UserDetailViewProps {
  userId: string;
  onEdit?: () => void;
  onDeactivate?: (userId: string) => void;
}

export default function UserDetailView({ userId, onEdit, onDeactivate }: UserDetailViewProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<InternalUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activityDateRange, setActivityDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');
  const [auditDateRange, setAuditDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);

  // Use permission hooks
  const { 
    canEditUser, 
    canDeactivateUser, 
    canResetPasswords,
    canViewAuditLogs,
    canViewFullAuditLogs
  } = usePermissions();
  
  // Check permissions for this specific user
  const canEditThisUser = user ? canEditUser(userId, user.internalRole) : false;
  const canDeactivateThisUser = user ? canDeactivateUser(userId, user.internalRole) : false;
  const canResetThisUserPassword = canResetPasswords();
  const canViewAudit = canViewAuditLogs();
  const canViewFullAudit = canViewFullAuditLogs();

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await internalUserService.getUserById(userId);
      setUser(userData);
      
      // Load additional data in parallel
      loadPerformanceMetrics();
      loadActivityTimeline();
      loadAuditLogs();
    } catch (err: any) {
      console.error('Error loading user details:', err);
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      setLoadingPerformance(true);
      const metrics = await internalUserService.getUserPerformance(userId);
      setPerformanceMetrics(metrics);
    } catch (err) {
      console.error('Error loading performance metrics:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const loadActivityTimeline = async (dateRange?: { startDate?: string; endDate?: string }) => {
    try {
      setLoadingActivity(true);
      const filters = {
        limit: 10,
        ...dateRange
      };
      const response = await auditService.getUserActivity(userId, filters);
      setActivityLogs(response.logs || []);
    } catch (err) {
      console.error('Error loading activity timeline:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleActivityDateRangeChange = (startDate?: string, endDate?: string) => {
    const newRange = { startDate, endDate };
    setActivityDateRange(newRange);
    loadActivityTimeline(newRange);
  };

  const loadAuditLogs = async (filters?: { action?: string; startDate?: string; endDate?: string }) => {
    try {
      setLoadingAudit(true);
      const queryFilters = {
        limit: 20,
        ...filters
      };
      const response = await auditService.getResourceHistory('user', userId, queryFilters);
      setAuditLogs(response.logs || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAuditFilterChange = (action?: string, startDate?: string, endDate?: string) => {
    setAuditActionFilter(action || '');
    setAuditDateRange({ startDate, endDate });
    loadAuditLogs({ action, startDate, endDate });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/internal-users/${userId}/edit`);
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderPerformanceMetrics = () => {
    // Only show performance metrics for roles that have them
    const rolesWithMetrics = ['agent', 'regional_manager', 'operations_manager'];
    if (!rolesWithMetrics.includes(user!.internalRole)) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        
        {loadingPerformance ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : performanceMetrics ? (
          <div>
            {/* Agent Metrics */}
            {user!.internalRole === 'agent' && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Properties Onboarded</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {performanceMetrics.propertiesOnboarded || 0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">Commission Earned</p>
                  <p className="text-2xl font-bold text-green-900">
                    ₹{performanceMetrics.commissionEarned?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium mb-1">Active Leads</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {performanceMetrics.leadsInPipeline || 0}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {performanceMetrics.conversionRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-600 font-medium mb-1">Avg. Time to Close</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {performanceMetrics.averageTimeToClose || 0} days
                  </p>
                </div>
              </div>
            )}

            {/* Regional Manager Metrics */}
            {user!.internalRole === 'regional_manager' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Team Size</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(performanceMetrics as any).teamSize || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Active agents</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">Regional Performance</p>
                  <p className="text-2xl font-bold text-green-900">
                    {(performanceMetrics as any).regionalPerformance || 0}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">Target achievement</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium mb-1">Pending Approvals</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(performanceMetrics as any).pendingApprovals || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Onboarding requests</p>
                </div>
              </div>
            )}

            {/* Operations Manager Metrics */}
            {user!.internalRole === 'operations_manager' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Tickets Handled</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(performanceMetrics as any).ticketsHandled || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">This month</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">Properties Accessed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {(performanceMetrics as any).propertiesAccessed || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Unique properties</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium mb-1">Announcements Sent</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(performanceMetrics as any).announcementsSent || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">This month</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No performance data available</p>
          </div>
        )}
      </div>
    );
  };

  const renderActivityTimeline = () => {
    const formatTimeAgo = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    };

    const getActionIcon = (action: string) => {
      if (action.includes('login') || action.includes('LOGIN')) {
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        );
      }
      if (action.includes('create') || action.includes('CREATE')) {
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      }
      if (action.includes('update') || action.includes('UPDATE')) {
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      }
      if (action.includes('delete') || action.includes('DELETE')) {
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={activityDateRange.startDate || ''}
              onChange={(e) => handleActivityDateRangeChange(e.target.value, activityDateRange.endDate)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Start date"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={activityDateRange.endDate || ''}
              onChange={(e) => handleActivityDateRangeChange(activityDateRange.startDate, e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="End date"
            />
            {(activityDateRange.startDate || activityDateRange.endDate) && (
              <button
                onClick={() => handleActivityDateRangeChange(undefined, undefined)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loadingActivity ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activityLogs.length > 0 ? (
          <div className="space-y-4">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex space-x-3">
                {getActionIcon(log.action)}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {log.resourceType && log.resourceId && (
                          <span>
                            {log.resourceType} #{log.resourceId}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>
                  {log.ipAddress && (
                    <p className="text-xs text-gray-500 mt-1">
                      IP: {log.ipAddress}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    );
  };

  const renderAuditLog = () => {
    // Only show audit logs to users with permission
    if (!canViewAudit) {
      return null;
    }

    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString();
    };

    const renderChangeDetails = (changes: any) => {
      if (!changes || (!changes.before && !changes.after)) {
        return null;
      }

      return (
        <div className="mt-2 text-xs bg-gray-50 rounded p-2">
          {changes.before && (
            <div className="mb-1">
              <span className="font-medium text-red-600">Before:</span>
              <pre className="mt-1 text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(changes.before, null, 2)}
              </pre>
            </div>
          )}
          {changes.after && (
            <div>
              <span className="font-medium text-green-600">After:</span>
              <pre className="mt-1 text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(changes.after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      );
    };

    const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h3>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Action Type Filter */}
            <select
              value={auditActionFilter}
              onChange={(e) => handleAuditFilterChange(
                e.target.value,
                auditDateRange.startDate,
                auditDateRange.endDate
              )}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <input
              type="date"
              value={auditDateRange.startDate || ''}
              onChange={(e) => handleAuditFilterChange(
                auditActionFilter,
                e.target.value,
                auditDateRange.endDate
              )}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Start date"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={auditDateRange.endDate || ''}
              onChange={(e) => handleAuditFilterChange(
                auditActionFilter,
                auditDateRange.startDate,
                e.target.value
              )}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="End date"
            />
            
            {/* Clear Filters */}
            {(auditActionFilter || auditDateRange.startDate || auditDateRange.endDate) && (
              <button
                onClick={() => handleAuditFilterChange(undefined, undefined, undefined)}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {loadingAudit ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border-l-4 border-gray-200 pl-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : auditLogs.length > 0 ? (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className={`border-l-4 pl-4 py-3 ${
                  log.isCritical
                    ? 'border-red-500 bg-red-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.isCritical && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Critical
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-700 space-y-1">
                      {log.userName && (
                        <p>
                          <span className="font-medium">Performed by:</span> {log.userName}
                          {log.userEmail && ` (${log.userEmail})`}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">When:</span> {formatDateTime(log.createdAt)}
                      </p>
                      {log.ipAddress && (
                        <p>
                          <span className="font-medium">IP Address:</span> {log.ipAddress}
                        </p>
                      )}
                    </div>

                    {/* Show before/after changes */}
                    {renderChangeDetails(log.changes)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit log entries found</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/internal-users')}
            className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Button and Edit Button */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/internal-users"
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Users
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          </div>
          <div className="flex items-center space-x-3">
            {canResetThisUserPassword && user.isActive && (
              <button
                onClick={() => setShowResetPasswordDialog(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Reset Password</span>
              </button>
            )}
            {canDeactivateThisUser && onDeactivate && (
              <button
                onClick={() => onDeactivate(userId)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  user.isActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {user.isActive ? 'Deactivate User' : 'Reactivate User'}
              </button>
            )}
            {canEditThisUser && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Edit User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-4">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{user.email}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{formatRole(user.internalRole)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium text-gray-900">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>

            {/* Additional role-specific info */}
            {(user.territoryId || user.commissionRate || user.managerId) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {user.territoryId && (
                    <div>
                      <p className="text-sm text-gray-500">Territory</p>
                      <p className="font-medium text-gray-900">{user.territoryId}</p>
                    </div>
                  )}
                  {user.commissionRate !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Commission Rate</p>
                      <p className="font-medium text-gray-900">{user.commissionRate}%</p>
                    </div>
                  )}
                  {user.managerId && (
                    <div>
                      <p className="text-sm text-gray-500">Manager</p>
                      <p className="font-medium text-gray-900">{user.managerId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Placeholder sections - will be implemented in subsequent subtasks */}
      <div className="space-y-6">
        {/* Performance Metrics Section - Subtask 7.2 */}
        {renderPerformanceMetrics()}

        {/* Activity Timeline Section - Subtask 7.3 */}
        {renderActivityTimeline()}

        {/* Audit Log Section - Subtask 7.4 */}
        {renderAuditLog()}
      </div>

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        isOpen={showResetPasswordDialog}
        onClose={() => setShowResetPasswordDialog(false)}
        userId={userId}
        userName={user.name}
        userEmail={user.email}
        onSuccess={() => {
          // Optionally reload user details or show a success message
          loadUserDetails();
        }}
      />
    </div>
  );
}
