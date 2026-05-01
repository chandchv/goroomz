import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import territoryService, { type Territory, type TerritoryStatistics, type TerritoryAgent } from '../services/territoryService';
import targetService, { type TargetProgress } from '../services/targetService';
import { leadService } from '../services/leadService';
import { useSwipe } from '../hooks/useSwipe';
import { PerformanceChart, PieChart, PIE_COLORS } from '../components/charts';
import TeamMemberDetailView from '../components/users/TeamMemberDetailView';

type ViewMode = 'overview' | 'myteam' | 'approvals' | 'performance' | 'territory';

interface PendingApproval {
  id: string;
  businessName: string;
  propertyOwnerName: string;
  agentName: string;
  submittedAt: string;
  propertyType: string;
}

export default function RegionalManagerDashboardPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Overview data
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [stats, setStats] = useState<TerritoryStatistics>({
    totalProperties: 0,
    totalAgents: 0,
    totalLeads: 0,
    averageOccupancy: 0,
    totalRevenue: 0,
  });
  
  // Team data
  const [agents, setAgents] = useState<TerritoryAgent[]>([]);
  const [targetProgress, setTargetProgress] = useState<TargetProgress[]>([]);
  
  // Pending approvals
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  
  // Team member detail modal
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.territoryId) {
      setError('No territory assigned to this regional manager');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if user has a territory assigned
      if (!user.territoryId) {
        setError('No territory assigned to this regional manager');
        setLoading(false);
        return;
      }

      // Load territory information
      const territoryData = await territoryService.getTerritory(user.territoryId);
      setTerritory(territoryData);

      // Load territory statistics
      const statsData = await territoryService.getTerritoryStatistics(user.territoryId);
      setStats(statsData);

      // Load agents in territory
      const agentsData = await territoryService.getTerritoryAgents(user.territoryId);
      setAgents(agentsData);

      // Load target progress
      const progressData = await targetService.getTeamTargetProgress(user.territoryId);
      setTargetProgress(progressData);

      // Load pending approvals
      const leadsResponse = await leadService.getLeads({
        territoryId: user.territoryId,
        status: 'pending_approval',
      });
      
      const approvals = leadsResponse.data.map((lead: any) => ({
        id: lead.id,
        businessName: lead.businessName,
        propertyOwnerName: lead.propertyOwnerName,
        agentName: lead.agent?.name || 'Unknown',
        submittedAt: lead.updatedAt,
        propertyType: lead.propertyType,
      }));
      
      setPendingApprovals(approvals);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Swipe gesture support for tab navigation
  const viewModes: ViewMode[] = ['overview', 'myteam', 'approvals', 'performance', 'territory'];
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Regional Manager Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">
                {territory?.name || 'Territory'} - Welcome back, {user?.name}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
              <button
                onClick={() => {/* TODO: Open territory management */}}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-touch text-sm sm:text-base"
              >
                Manage Territory
              </button>
              <button
                onClick={() => {/* TODO: Open set targets */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-touch text-sm sm:text-base"
              >
                Set Targets
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

        {/* Regional Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Properties</div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalProperties}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Team Size</div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalAgents}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Active Leads</div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg Occupancy</div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatPercentage(stats.averageOccupancy)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Revenue</div>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>

        {/* Pending Approvals Alert */}
        {pendingApprovals.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-800 font-medium">
                {pendingApprovals.length} onboarding{pendingApprovals.length > 1 ? 's' : ''} awaiting your approval
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
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode('myteam')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'myteam'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Team
              </button>
              <button
                onClick={() => setViewMode('approvals')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors relative whitespace-nowrap ${
                  viewMode === 'approvals'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('performance')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'performance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setViewMode('territory')}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  viewMode === 'territory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Territory
              </button>
            </div>
          </div>

          <div className="p-6">
            {viewMode === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-900">Team Members</h4>
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{agents.length}</p>
                    <button
                      onClick={() => setViewMode('myteam')}
                      className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium"
                    >
                      View Team →
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-green-900">Total Properties</h4>
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      {agents.reduce((sum, agent) => sum + agent.approvedLeads, 0)}
                    </p>
                    <p className="text-sm text-green-700 mt-1">Onboarded by team</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-purple-900">Team Commission</h4>
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {formatCurrency(agents.reduce((sum, agent) => sum + agent.totalCommission, 0))}
                    </p>
                    <p className="text-sm text-purple-700 mt-1">Total earned</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => setViewMode('myteam')}
                      className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      View My Team
                    </button>
                    <button
                      onClick={() => setViewMode('approvals')}
                      className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Review Approvals
                      {pendingApprovals.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          {pendingApprovals.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setViewMode('performance')}
                      className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      View Performance
                    </button>
                    <button
                      onClick={() => setViewMode('territory')}
                      className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Manage Territory
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* My Team Section - Requirements: 9.1, 9.2, 9.3 */}
            {viewMode === 'myteam' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">My Team</h3>
                  <div className="text-sm text-gray-600">
                    {agents.length} team member{agents.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {agents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No agents assigned to this territory</p>
                    <p className="text-sm text-gray-400 mt-1">Contact a Platform Administrator to assign agents to your territory</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(agent => (
                      <div 
                        key={agent.id} 
                        className="bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedTeamMemberId(agent.id)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">
                                {agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{agent.name}</h4>
                              <p className="text-sm text-gray-600 truncate">{agent.email}</p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Phone</span>
                            <span className="font-medium text-gray-900">{agent.phone || 'Not provided'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Commission Rate</span>
                            <span className="font-medium text-gray-900">{agent.commissionRate}%</span>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-600 mb-1">Total Leads</div>
                                <div className="font-semibold text-gray-900 text-lg">{agent.totalLeads}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 mb-1">Approved</div>
                                <div className="font-semibold text-green-600 text-lg">{agent.approvedLeads}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <div className="text-gray-600 text-sm mb-1">Commission Earned</div>
                            <div className="font-bold text-blue-600 text-xl">{formatCurrency(agent.totalCommission)}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTeamMemberId(agent.id);
                            }}
                            className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'approvals' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Onboarding Approvals</h3>
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending approvals
                  </div>
                ) : (
                  pendingApprovals.map(approval => (
                    <div key={approval.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-200">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{approval.businessName}</h4>
                        <p className="text-sm text-gray-600">Owner: {approval.propertyOwnerName}</p>
                        <p className="text-sm text-gray-600">Agent: {approval.agentName}</p>
                        <p className="text-xs text-gray-500 mt-1">Submitted: {formatDate(approval.submittedAt)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                          {approval.propertyType}
                        </span>
                        <button
                          onClick={() => {/* TODO: Open approval modal */}}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {viewMode === 'performance' && (
              <div className="space-y-6">
                {/* Team Performance Chart */}
                {agents.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <PerformanceChart
                      data={agents.map(agent => ({
                        name: agent.name.split(' ')[0], // First name only for chart
                        value: agent.approvedLeads,
                      }))}
                      title="Team Performance - Properties Onboarded"
                      valueLabel="Approved"
                      height={300}
                    />
                  </div>
                )}

                {/* Commission Distribution Chart */}
                {agents.length > 0 && agents.some(a => a.totalCommission > 0) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <PieChart
                      data={agents
                        .filter(a => a.totalCommission > 0)
                        .map(agent => ({
                          name: agent.name,
                          value: agent.totalCommission,
                        }))}
                      title="Commission Distribution by Agent"
                      height={300}
                      formatValue={(value) => formatCurrency(value)}
                      colors={PIE_COLORS}
                    />
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Progress</h3>
                {targetProgress.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No targets set for this period
                  </div>
                ) : (
                  <div className="space-y-4">
                    {targetProgress.map((progress, index) => (
                      <div key={progress.targetId || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{progress.agentName || 'Agent'}</h4>
                          <span className="text-sm text-gray-600">
                            {formatPercentage(progress.propertiesProgress)} Complete
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Properties</span>
                              <span className="font-medium text-gray-900">
                                {progress.actualProperties} / {progress.targetProperties}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progress.propertiesProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Revenue</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(progress.actualRevenue)} / {formatCurrency(progress.targetRevenue)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progress.revenueProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'territory' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Territory Information</h3>
                  <button
                    onClick={() => {/* TODO: Edit territory */}}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Edit Territory
                  </button>
                </div>
                {territory && (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Territory Name</h4>
                        <p className="text-gray-900">{territory.name}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Status</h4>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          territory.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {territory.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Description</h4>
                        <p className="text-gray-900">{territory.description || 'No description'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Cities</h4>
                        <div className="flex flex-wrap gap-2">
                          {territory.cities && territory.cities.length > 0 ? (
                            territory.cities.map((city, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                {city}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">No cities defined</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">States</h4>
                        <div className="flex flex-wrap gap-2">
                          {territory.states && territory.states.length > 0 ? (
                            territory.states.map((state, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">
                                {state}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">No states defined</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Territory Map</h4>
                  <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center border border-gray-200">
                    <p className="text-gray-500">Map view will be implemented with territory boundaries</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Member Detail Modal - Requirements: 9.4, 9.5 */}
      {selectedTeamMemberId && (
        <TeamMemberDetailView
          userId={selectedTeamMemberId}
          onClose={() => setSelectedTeamMemberId(null)}
        />
      )}
    </div>
  );
}
