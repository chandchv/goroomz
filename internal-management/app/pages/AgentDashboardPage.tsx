import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { leadService } from '../services/leadService';
import type { Lead } from '../services/leadService';
import { commissionService } from '../services/commissionService';
import type { CommissionSummary } from '../services/commissionService';
import LeadPipelineView from '../components/leads/LeadPipelineView';
import LeadCreationForm from '../components/leads/LeadCreationForm';
import CommissionDashboard from '../components/commissions/CommissionDashboard';
import { useSwipe } from '../hooks/useSwipe';
import { TrendChart, TREND_COLORS } from '../components/charts';

type ViewMode = 'pipeline' | 'commissions' | 'activities';

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    pendingLeads: 0,
    approvedLeads: 0,
    totalCommission: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Lead[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [commissionTrendData, setCommissionTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load leads statistics
      const leadsResponse = await leadService.getLeads({
        agentId: user.id,
        limit: 100,
      });

      const leads = leadsResponse.data;
      const pendingLeads = leads.filter(l => l.status === 'contacted' || l.status === 'in_progress').length;
      const approvedLeads = leads.filter(l => l.status === 'approved').length;

      // Load commission summary
      const commissionData = await commissionService.getAgentCommissionSummary(user.id);

      // Get recent activities (last 5 updated leads)
      const recentLeads = [...leads]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      setStats({
        totalLeads: leads.length,
        pendingLeads,
        approvedLeads,
        totalCommission: commissionData.totalEarned,
      });

      setRecentActivities(recentLeads);
      setCommissionSummary(commissionData);

      // Commission trend data would require monthly breakdown from backend
      setCommissionTrendData([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'lost':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Swipe gesture support for tab navigation
  const viewModes: ViewMode[] = ['pipeline', 'commissions', 'activities'];
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Agent Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">Welcome back, {user?.name}</p>
            </div>
            <button
              onClick={() => setShowCreateLead(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-h-touch"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="whitespace-nowrap">New Lead</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-sm sm:text-base text-red-800">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Total Leads</div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Pending Leads</div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pendingLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Properties Onboarded</div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.approvedLeads}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Commission Earned</div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalCommission)}</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-touch ${
                  viewMode === 'pipeline'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Lead Pipeline
              </button>
              <button
                onClick={() => setViewMode('commissions')}
                className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-touch ${
                  viewMode === 'commissions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Commissions
              </button>
              <button
                onClick={() => setViewMode('activities')}
                className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-touch ${
                  viewMode === 'activities'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Activities
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6" {...swipeHandlers}>
            {/* Swipe indicator for mobile */}
            <div className="md:hidden text-center text-xs text-gray-400 mb-3">
              ← Swipe to navigate →
            </div>

            {viewMode === 'pipeline' && (
              <LeadPipelineView agentId={user?.id} onLeadUpdate={loadDashboardData} />
            )}

            {viewMode === 'commissions' && (
              <div className="space-y-6">
                {/* Commission Trend Chart */}
                {commissionTrendData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <TrendChart
                      data={commissionTrendData}
                      lines={[
                        { dataKey: 'earned', name: 'Earned', color: TREND_COLORS.blue },
                        { dataKey: 'paid', name: 'Paid', color: TREND_COLORS.green },
                      ]}
                      title="Commission Trends (Last 6 Months)"
                      height={250}
                      formatValue={(value) => formatCurrency(value)}
                    />
                  </div>
                )}
                <CommissionDashboard agentId={user?.id} />
              </div>
            )}

            {viewMode === 'activities' && (
              <div className="space-y-3 sm:space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-sm sm:text-base text-gray-500">
                    No recent activities
                  </div>
                ) : (
                  recentActivities.map(lead => (
                    <div key={lead.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{lead.businessName}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{lead.propertyOwnerName}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(lead.updatedAt)}</p>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Create New Lead</h2>
              <button
                onClick={() => setShowCreateLead(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors min-h-touch min-w-touch flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <LeadCreationForm
                onSuccess={() => {
                  setShowCreateLead(false);
                  loadDashboardData();
                }}
                onCancel={() => setShowCreateLead(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
